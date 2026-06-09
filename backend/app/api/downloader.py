from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Optional, List
import subprocess
import os
import asyncio
from pathlib import Path
import re

# 从我们刚搬过来的引擎中导入
import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

from application.app import XHS
from module.settings import Settings
from module.model import ExtractParams, ExtractData

router = APIRouter(prefix="/fast-downloader", tags=["Fast Downloader"])


class CopyExtractRequest(BaseModel):
    urls: list[str] = Field(default_factory=list)
    url: str | None = None
    account_id: int | None = None
    cookie: str | None = None
    include_raw: bool = False


class CopyExtractItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    url: str
    status: str
    title: str = ""
    note_copy: str = Field(default="", alias="copy")
    video_copy: str = ""
    note_id: str = ""
    note_type: str = ""
    author_name: str = ""
    author_id: str = ""
    cover_url: str = ""
    likes: int = 0
    collects: int = 0
    comments: int = 0
    shares: int = 0
    tags: list[str] = Field(default_factory=list)
    source: str = ""
    message: str = ""
    raw: dict[str, Any] | None = None


class CopyExtractResponse(BaseModel):
    total: int
    success_count: int
    failed_count: int
    items: list[CopyExtractItem]

# 全局引擎实例
_xhs_instance: Optional[XHS] = None

async def get_xhs():
    global _xhs_instance
    if _xhs_instance is None:
        settings = Settings(BASE_DIR / "data" / "downloader_volume").run()
        _xhs_instance = XHS(**settings)
        await _xhs_instance.__aenter__()
    return _xhs_instance

from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models import User
from backend.app.api.platforms.xhs.pc import _get_owned_pc_account_cookies
from backend.app.api.platforms.xhs.pc import _proxy_image_url, _proxy_image_urls

def _proxy_downloader_data(data: dict | None) -> dict | None:
    """Rewrite CDN URLs in downloader extract data to use local proxy."""
    if not data:
        return data
    for key in ("封面地址", "cover_url"):
        if data.get(key):
            data[key] = _proxy_image_url(str(data[key]))
    downloads = data.get("下载地址", [])
    if isinstance(downloads, list):
        data["下载地址"] = _proxy_image_urls(downloads)
    elif isinstance(downloads, str):
        data["下载地址"] = _proxy_image_url(downloads)
    local_dir = data.get("本地下载目录")
    if isinstance(local_dir, str) and local_dir:
        from pathlib import Path
        local_path = Path(local_dir)
        files = sorted(str(item) for item in local_path.glob("*") if item.is_file()) if local_path.exists() else []
        data["本地下载目录"] = str(local_path)
        data["本地文件列表"] = files
        data["本地文件数量"] = len(files)
        data["下载成功"] = len(files) > 0
    return data


def _extract_fallback_image_urls(note_card: dict) -> list[str]:
    urls: list[str] = []

    def walk(value):
        if isinstance(value, dict):
            for key, item in value.items():
                lower = str(key).lower()
                if lower in {"url", "urldefault", "url_default", "originimageurl", "origin_image_url"} and isinstance(item, str):
                    if any(host in item for host in ("xhscdn.com", "xiaohongshu.com")) and item not in urls:
                        urls.append(item)
                else:
                    walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(note_card)
    filtered = [item for item in urls if not item.endswith(".mp4") and "sns-video" not in item]
    return filtered


_VIDEO_COPY_KEYS = {
    "subtitle",
    "subtitles",
    "caption",
    "captions",
    "transcript",
    "transcripts",
    "asr",
    "asr_text",
    "speech_text",
    "voice_text",
    "video_text",
    "video_copy",
    "ocr_text",
    "text_extra",
}


def _metric_int(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return 0
    multiplier = 1
    if text.endswith("万") or text.lower().endswith("w"):
        multiplier = 10000
        text = text[:-1]
    match = re.search(r"\d+(?:\.\d+)?", text)
    return int(float(match.group(0)) * multiplier) if match else 0


def _clean_copy_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return "\n".join(line.strip() for line in value.replace("\r", "\n").split("\n") if line.strip())
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return "\n".join(item for item in (_clean_copy_text(entry) for entry in value) if item)
    if isinstance(value, dict):
        chunks: list[str] = []
        for key in ("text", "content", "desc", "caption", "subtitle", "asr_text"):
            if key in value:
                text = _clean_copy_text(value.get(key))
                if text:
                    chunks.append(text)
        return "\n".join(chunks)
    return str(value).strip()


def _dedupe_lines(text: str) -> str:
    seen: set[str] = set()
    lines: list[str] = []
    for line in text.splitlines():
        clean = line.strip()
        if clean and clean not in seen:
            seen.add(clean)
            lines.append(clean)
    return "\n".join(lines)


def _extract_video_copy(raw: Any) -> str:
    candidates: list[str] = []

    def walk(value: Any, key_hint: str = "") -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                lower = str(key).lower()
                if lower in _VIDEO_COPY_KEYS or "subtitle" in lower or "transcript" in lower:
                    text = _clean_copy_text(item)
                    if text:
                        candidates.append(text)
                walk(item, lower)
        elif isinstance(value, list):
            for item in value:
                walk(item, key_hint)
        elif key_hint in _VIDEO_COPY_KEYS and isinstance(value, str):
            text = _clean_copy_text(value)
            if text:
                candidates.append(text)

    walk(raw)
    return _dedupe_lines("\n".join(candidates))


def _tags_from_value(value: Any) -> list[str]:
    if isinstance(value, str):
        return [item.lstrip("#") for item in value.split() if item.strip()]
    if not isinstance(value, list):
        return []
    tags: list[str] = []
    for item in value:
        if isinstance(item, str):
            tags.append(item.lstrip("#"))
        elif isinstance(item, dict):
            tag = item.get("name") or item.get("tag_name") or item.get("title")
            if tag:
                tags.append(str(tag).lstrip("#"))
    return [tag for index, tag in enumerate(tags) if tag and tag not in tags[:index]]


def _normalize_copy_item(
    url: str,
    data: dict[str, Any] | None,
    raw_source: dict[str, Any] | None = None,
    *,
    source: str,
    message: str,
    include_raw: bool,
) -> CopyExtractItem:
    data = data or {}
    raw_source = raw_source or {}
    user = raw_source.get("user") if isinstance(raw_source.get("user"), dict) else {}
    interact = raw_source.get("interact_info") or raw_source.get("interactInfo") or {}
    note_type = str(data.get("作品类型") or raw_source.get("type") or raw_source.get("model_type") or "")
    copy = _clean_copy_text(data.get("作品描述") or raw_source.get("desc") or raw_source.get("content"))
    video_copy = _extract_video_copy(raw_source)
    if not video_copy and ("视频" in note_type or str(raw_source.get("type")) == "video"):
        video_copy = copy

    item = CopyExtractItem(
        url=str(data.get("作品链接") or url),
        status="success" if data else "failed",
        title=str(data.get("作品标题") or raw_source.get("title") or raw_source.get("display_title") or ""),
        note_copy=copy,
        video_copy=video_copy,
        note_id=str(data.get("作品ID") or raw_source.get("noteId") or raw_source.get("note_id") or raw_source.get("id") or ""),
        note_type=note_type,
        author_name=str(data.get("作者昵称") or user.get("nickname") or user.get("nickName") or ""),
        author_id=str(data.get("作者ID") or user.get("user_id") or user.get("userId") or ""),
        cover_url=str(data.get("封面地址") or ""),
        likes=_metric_int(data.get("点赞数量") or interact.get("liked_count") or interact.get("likedCount")),
        collects=_metric_int(data.get("收藏数量") or interact.get("collected_count") or interact.get("collectedCount")),
        comments=_metric_int(data.get("评论数量") or interact.get("comment_count") or interact.get("commentCount")),
        shares=_metric_int(data.get("分享数量") or interact.get("share_count") or interact.get("shareCount")),
        tags=_tags_from_value(data.get("作品标签") or raw_source.get("tag_list") or raw_source.get("tagList") or raw_source.get("tags")),
        source=source,
        message=message,
        raw=raw_source if include_raw else None,
    )
    if item.cover_url:
        item.cover_url = _proxy_image_url(item.cover_url)
    return item

from loguru import logger


def _extract_note_card(raw_payload: dict[str, Any]) -> dict[str, Any] | None:
    items = raw_payload.get("data", {}).get("items", []) if isinstance(raw_payload, dict) else []
    if not items:
        return None
    item = items[0] if isinstance(items[0], dict) else {}
    note_card = item.get("note_card") or item.get("note") or item
    return note_card if isinstance(note_card, dict) else None


async def _get_copy_detail(
    *,
    xhs: XHS,
    url: str,
    cookie: str | None,
    include_raw: bool,
) -> CopyExtractItem:
    from backend.app.adapters.xhs.pc_api_adapter import XhsPcApiAdapter

    if cookie:
        try:
            success, message, raw_payload = XhsPcApiAdapter(cookie).get_note_info(url)
            note_card = _extract_note_card(raw_payload)
            if success and note_card:
                if not note_card.get("imageList") and not note_card.get("image_list"):
                    fallback_images = _extract_fallback_image_urls(note_card)
                    if fallback_images:
                        note_card["imageList"] = [{"urlDefault": image_url} for image_url in fallback_images]
                data = xhs.explore.run(xhs.json_to_namespace(note_card))
                if data:
                    data["作品链接"] = url
                    return _normalize_copy_item(
                        url,
                        data,
                        note_card,
                        source="api",
                        message=message or "成功提取文案",
                        include_raw=include_raw,
                    )
        except Exception as exc:
            logger.warning(f"API copy extraction failed, fallback to HTML mode: {exc}")

    data = await xhs._deal_extract(url, False, None, True, cookie, None, None)
    if data:
        return _normalize_copy_item(
            url,
            _proxy_downloader_data(data),
            data,
            source="html",
            message="成功提取文案",
            include_raw=include_raw,
        )
    return CopyExtractItem(url=url, status="failed", message="未能从链接提取标题或文案")


@router.post("/copy/extract", response_model=CopyExtractResponse)
async def extract_copy_from_links(
    payload: CopyExtractRequest,
    xhs: XHS = Depends(get_xhs),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw_inputs = [item.strip() for item in ([payload.url] if payload.url else []) + payload.urls if item and item.strip()]
    if not raw_inputs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请至少输入一个小红书链接")

    cookie = payload.cookie
    if not cookie and payload.account_id:
        cookie = _get_owned_pc_account_cookies(db, current_user, payload.account_id)

    items: list[CopyExtractItem] = []
    async with xhs.semaphore:
        for raw_url in raw_inputs[:50]:
            try:
                extracted_urls = await xhs.extract_links(raw_url, cookie=cookie)
            except Exception as exc:
                logger.warning(f"Failed to parse URL for copy extraction: {exc}")
                extracted_urls = []
            for url in (extracted_urls or [raw_url])[:10]:
                try:
                    items.append(await _get_copy_detail(xhs=xhs, url=url, cookie=cookie, include_raw=payload.include_raw))
                except Exception as exc:
                    logger.exception(f"Copy extraction failed for URL: {url}")
                    items.append(CopyExtractItem(url=url, status="failed", message=str(exc)))

    success_count = sum(1 for item in items if item.status == "success")
    return CopyExtractResponse(
        total=len(items),
        success_count=success_count,
        failed_count=len(items) - success_count,
        items=items,
    )


@router.post("/detail", response_model=ExtractData)
async def handle_detail(
    extract: ExtractParams, 
    xhs: XHS = Depends(get_xhs),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 直接复用之前在 app.py 里写的 handle 逻辑
        async with xhs.semaphore:
            cookie = extract.cookie
            if not cookie and extract.account_id:
                try:
                    cookie = _get_owned_pc_account_cookies(db, current_user, extract.account_id)
                except Exception as e:
                    logger.warning(f"Failed to get cookies for account {extract.account_id}: {e}")

            url_list = await xhs.extract_links(extract.url, cookie=cookie)
            if not url_list:
                msg = "提取链接失败"
                data = None
            else:
                url = url_list[0]
                try:
                    # 尝试优先使用带签名的 API 获取数据 (更稳定)
                    from backend.app.adapters.xhs.pc_api_adapter import XhsPcApiAdapter
                    from types import SimpleNamespace
                    
                    api_success = False
                    if cookie:
                        adapter = XhsPcApiAdapter(cookie)
                        # 注意：adapter 里的方法是同步的，为了不阻塞可以使用 run_in_executor，
                        # 但这里我们简单处理，直接调用
                        success, message, raw_payload = adapter.get_note_info(url)
                        if success:
                            items = raw_payload.get("data", {}).get("items", [])
                            if items:
                                note_card = items[0].get("note_card") or items[0].get("note")
                                if note_card:
                                    if not note_card.get("imageList") and not note_card.get("image_list"):
                                        fallback_images = _extract_fallback_image_urls(note_card)
                                        if fallback_images:
                                            note_card["imageList"] = [{"urlDefault": url} for url in fallback_images]
                                    # 使用 downloader_engine 的处理逻辑进行下载
                                    count = SimpleNamespace(all=1, success=0, fail=0, skip=0)
                                    data = await xhs.deal_script_tasks(note_card, extract.index, count=count)
                                    if data:
                                        data["作品链接"] = url
                                        msg = "成功 (API模式)"
                                        api_success = True
                    
                    if not api_success:
                        # 如果 API 模式失败或无 Cookie，回退到 HTML 解析模式
                        data = await xhs._deal_extract(
                            url,
                            extract.download,
                            extract.index,
                            not extract.skip,
                            cookie,
                            extract.proxy,
                            extract.work_path,
                            task_id=extract.task_id
                        )
                        msg = "成功 (HTML模式)"
                except Exception as e:
                    logger.exception(f"Error in handle_detail for URL: {extract.url}")
                    msg = f"发生错误: {str(e)}"
                    data = None
            data = _proxy_downloader_data(data)
            return ExtractData(message=msg, params=extract, data=data)
    except Exception as e:
        import traceback
        with open("/tmp/downloader_error.log", "w") as f:
            f.write(traceback.format_exc())
        raise e

@router.get("/tasks")
async def get_tasks(xhs: XHS = Depends(get_xhs)):
    return xhs.progress_tasks

@router.get("/user/notes")
async def get_user_notes(url: str, xhs: XHS = Depends(get_xhs)):
    # 模拟外部调用
    from backend.app.api.platforms.xhs.crawl import CrawlUserNotesRequest
    payload = CrawlUserNotesRequest(account_id=1, user_url=url, save_to_library=False)
    # 我们直接内部转换
    from backend.app.api.platforms.xhs.crawl import crawl_user_notes
    from backend.app.core.database import SessionLocal
    # 模拟 FastAPI 调用上下文比较复杂，我们还是走 HTTP 代理简化逻辑
    return await xhs._proxy_all_in_one("/api/xhs/crawl/user-notes", payload.dict())

@router.post("/search")
async def search_notes(params: dict, xhs: XHS = Depends(get_xhs)):
    payload = {
        "account_id": 1,
        "keyword": params.get("keyword"),
        "page": params.get("page", 1),
        "save_to_library": False
    }
    return await xhs._proxy_all_in_one("/api/xhs/crawl/search-notes", payload)

@router.post("/ext/sync_cookie")
async def sync_cookie_to_ext(payload: dict, xhs: XHS = Depends(get_xhs)):
    cookie = payload.get("cookie")
    aio_payload = {
        "platform": "xhs",
        "sub_type": "pc",
        "cookie_string": cookie,
        "sync_creator": True
    }
    return await xhs._proxy_all_in_one("/api/accounts/import-cookie", aio_payload)

@router.post("/ext/save")
async def ext_save_note(note_data: dict, xhs: XHS = Depends(get_xhs)):
    payload = {
        "account_id": 1, 
        "fetch_comments": False,
        "notes": [{
            "note_id": note_data.get("作品ID"),
            "note_url": note_data.get("作品链接"),
            "title": note_data.get("作品标题"),
            "content": note_data.get("作品描述"),
            "author_name": note_data.get("作者昵称"),
            "cover_url": note_data.get("封面地址"),
            "video_url": note_data.get("下载地址")[0] if note_data.get("作品类型") == "视频" else "",
            "image_urls": note_data.get("下载地址") if note_data.get("作品类型") != "视频" else [],
            "raw": note_data
        }]
    }
    return await xhs._proxy_all_in_one("/api/notes/batch-save", payload)

@router.get("/login/browser")
async def browser_cookie_login(xhs: XHS = Depends(get_xhs)):
    import browser_cookie3
    import requests
    print("正在尝试从本地浏览器提取小红书 Cookie...")
    try:
        # 尝试从 Chrome 提取
        cj = browser_cookie3.chrome(domain_name='.xiaohongshu.com')
        cookies = requests.utils.dict_from_cookiejar(cj)
        if not cookies:
            # 尝试从 Edge 提取
            cj = browser_cookie3.edge(domain_name='.xiaohongshu.com')
            cookies = requests.utils.dict_from_cookiejar(cj)
        
        if not cookies:
            return {"success": False, "error": "未在 Chrome 或 Edge 中检测到有效的小红书登录状态。"}
        
        cookie_str = "; ".join([f"{k}={v}" for k, v in cookies.items()])
        return {"success": True, "cookie": cookie_str}
    except Exception as e:
        return {"success": False, "error": f"提取失败: {str(e)}"}

@router.get("/login")
async def browser_login(xhs: XHS = Depends(get_xhs)):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto("https://www.xiaohongshu.com")
        try:
            await page.wait_for_selector(".user-info", timeout=300000)
            cookies = await context.cookies()
            cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
            await browser.close()
            return {"success": True, "cookie": cookie_str}
        except:
            await browser.close()
            return {"success": False, "error": "登录超时"}

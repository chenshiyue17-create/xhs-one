from __future__ import annotations

import json
from typing import Any, Optional, Tuple
from scrapling.fetchers import StealthyFetcher
from loguru import logger

class XhsScraplingAdapter:
    """
    基于 Scrapling 的强化抓取适配器
    用于绕过 TLS 指纹检测并作为 XhsPcApiAdapter 的高稳定性替代
    """
    
    def __init__(self, cookies: str):
        self.cookies_str = cookies
        self.cookies_dict = self._parse_cookies(cookies)
        self.fetcher = StealthyFetcher()

    def _parse_cookies(self, cookie_string: str) -> dict:
        if not cookie_string:
            return {}
        if cookie_string.startswith('{'):
            try:
                return json.loads(cookie_string)
            except:
                return {}
        return {c.split('=')[0].strip(): c.split('=')[1].strip() 
                for c in cookie_string.split(';') if '=' in c}

    def _fetch_page(self, url: str) -> Tuple[bool, str, Any]:
        try:
            response = self.fetcher.fetch(
                url=url,
                cookies=self.cookies_dict,
                headless=True,
                timeout=30000
            )
            if response.status_code == 200:
                return True, "Success", response
            return False, f"HTTP {response.status_code}", None
        except Exception as e:
            logger.error(f"Scrapling fetch failed: {str(e)}")
            return False, str(e), None

    def get_note_info(self, url: str) -> Tuple[bool, str, Any]:
        """
        抓取笔记详情页并尝试解析内容
        返回 (success, message, payload)
        """
        success, msg, response = self._fetch_page(url)
        if not success:
            return False, msg, None
            
        try:
            # 尝试通过 Scrapling 的适配器提取关键数据
            page = response.adaptor
            # 小红书详情页通常包含 __INITIAL_STATE__
            scripts = page.css('script::text').all()
            for script in scripts:
                if 'window.__INITIAL_STATE__=' in script:
                    json_str = script.split('window.__INITIAL_STATE__=', 1)[1]
                    # 处理可能存在的尾部分号
                    if json_str.endswith(';'):
                        json_str = json_str[:-1]
                    data = json.loads(json_str)
                    return True, "Success", data
            
            # 如果没有 INITIAL_STATE，尝试自适应提取基本信息
            title = page.css('h1::text', adaptive=True).get()
            content = page.css('.desc::text', adaptive=True).get()
            author = page.css('.name::text', adaptive=True).get()
            
            if title or content:
                # 构造一个简化的 payload 兼容前端
                mock_payload = {
                    "data": [{
                        "note_card": {
                            "title": title or "",
                            "desc": content or "",
                            "user": {"nickname": author or "Unknown"},
                            "interact_info": {"liked_count": "0", "collected_count": "0", "comment_count": "0", "share_count": "0"}
                        }
                    }]
                }
                return True, "Success", mock_payload
                
            return False, "Could not extract data", None
        except Exception as e:
            logger.error(f"Parsing failed: {str(e)}")
            return False, f"Parse error: {str(e)}", None

    def search_note(self, keyword: str, page: int = 1, **kwargs) -> Tuple[bool, str, Any]:
        """
        搜索笔记（目前 Scrapling 建议用于详情页抓取，搜索仍建议优先使用原有 API，
        此处作为占位符，若有需要可实现模拟搜索页抓取）
        """
        # 搜索页通常由于加密较深，建议暂时透传给原有 API，或实现具体的 Scrapling 模拟请求
        return False, "Scrapling search not implemented yet, please use PC API", None

    def get_note_comments(self, url: str) -> Tuple[bool, str, Any]:
        # 实现类似 get_note_info 的逻辑
        return False, "Scrapling comments not implemented yet", None

    def get_user_notes(self, user_url: str) -> Tuple[bool, str, Any]:
        return False, "Scrapling user notes not implemented yet", None

import sys
from pathlib import Path

ENGINE_PATH = Path(__file__).resolve().parents[2] / "backend" / "downloader_engine"
if str(ENGINE_PATH) not in sys.path:
    sys.path.insert(0, str(ENGINE_PATH))

from backend.app.api.downloader import _extract_video_copy, _normalize_copy_item


def test_extract_video_copy_collects_nested_subtitles_and_dedupes_lines():
    raw = {
        "type": "video",
        "video": {
            "subtitle": [
                {"text": "第一句口播"},
                {"content": "第二句口播"},
                {"text": "第一句口播"},
            ]
        },
    }

    assert _extract_video_copy(raw) == "第一句口播\n第二句口播"


def test_normalize_copy_item_maps_title_copy_video_copy_and_metrics():
    item = _normalize_copy_item(
        "https://www.xiaohongshu.com/explore/note1",
        {
            "作品链接": "https://www.xiaohongshu.com/explore/note1",
            "作品ID": "note1",
            "作品标题": "爆款标题",
            "作品描述": "正文第一行\n正文第二行",
            "作品类型": "视频",
            "作者昵称": "作者A",
            "作者ID": "user1",
            "点赞数量": "1.2万",
            "收藏数量": "88",
            "评论数量": "9",
            "分享数量": "3",
            "作品标签": "#门窗 #避坑",
        },
        {"type": "video", "subtitle": [{"text": "视频口播"}]},
        source="api",
        message="ok",
        include_raw=False,
    )

    assert item.status == "success"
    assert item.title == "爆款标题"
    assert item.note_copy == "正文第一行\n正文第二行"
    assert item.model_dump(by_alias=True)["copy"] == "正文第一行\n正文第二行"
    assert item.video_copy == "视频口播"
    assert item.likes == 12000
    assert item.tags == ["门窗", "避坑"]

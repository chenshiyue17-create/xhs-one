import sys
import os
from pathlib import Path
import json
import requests

# 1. 强制添加路径，确保能导入后端模块
PROJECT_ROOT = Path("/Users/cc/XHS_ALL_IN_ONE")
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

# 2. 设置环境变量（如果有的话）
os.environ["DATABASE_SQLITE_PATH"] = str(PROJECT_ROOT / "data" / "spider_xhs.db")

from backend.app.core.database import SessionLocal
from backend.app.models import User, ModelConfig
from backend.app.services.ai_service import OpenAICompatibleTextClient
from backend.app.core.security import decrypt_text

def test_expert_ai_logic():
    print("=== 开始后端逻辑自检 ===")
    
    # 模拟 RAG 检索到的 Context
    mock_context = "测试资料：系统窗采用 1.8mm 壁厚型材，配有 5 根加强筋。"
    query = "门窗选题"
    
    with SessionLocal() as db:
        # 获取 admin 用户 (ID=2)
        user = db.get(User, 2)
        if not user:
            print("错误: 未找到 admin 用户")
            return
        
        # 获取默认模型配置 (DeepSeek)
        config = db.query(ModelConfig).filter_by(user_id=user.id, is_default=True).first()
        if not config:
            print("错误: 未找到默认模型配置")
            return
            
        print(f"检测到默认模型: {config.name} ({config.model_name})")
        api_key = decrypt_text(config.encrypted_api_key)
        
        if "PASTE_DEEPSEEK_API_KEY_HERE" in api_key:
            print("⚠️ 警告: DeepSeek API Key 尚未配置，目前是占位符。")
            return

        print("正在尝试调用 DeepSeek 接口...")
        client = OpenAICompatibleTextClient()
        try:
            answer = client.expert_chat(
                model_config=config,
                api_key=api_key,
                query=query,
                context=mock_context
            )
            print(f"AI 回复成功: {answer[:100]}...")
        except Exception as e:
            print(f"调用失败: {e}")

if __name__ == "__main__":
    test_expert_ai_logic()

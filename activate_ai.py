import sys
import os
from pathlib import Path

# Add project root to sys.path to import backend modules
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from backend.app.core.security import encrypt_text
from backend.app.core.database import SessionLocal
from backend.app.models import ModelConfig

def update_api_key():
    real_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not real_key:
        raise RuntimeError("请通过环境变量 DEEPSEEK_API_KEY 传入密钥，不要写入代码或提交到仓库。")
    encrypted_key = encrypt_text(real_key)
    
    # User ID 2 is 'admin'
    user_id = 2
    
    with SessionLocal() as db:
        # Update both DeepSeek models for the admin user
        models = db.query(ModelConfig).filter(
            ModelConfig.user_id == user_id, 
            ModelConfig.model_name.like("deepseek%")
        ).all()
        
        if not models:
            print("未找到 DeepSeek 模型配置，请先确保模型已创建。")
            return
            
        for m in models:
            m.encrypted_api_key = encrypted_key
            print(f"已更新模型 {m.name} 的 API Key。")
            
        db.commit()
    print("API Key 激活成功！")

if __name__ == "__main__":
    update_api_key()

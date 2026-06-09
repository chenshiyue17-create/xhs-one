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

def insert_deepseek_models():
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    encrypted_key = encrypt_text(api_key)
    
    # User ID 2 is 'admin'
    user_id = 2
    
    models = [
        {
            "name": "DeepSeek V4 Chat",
            "model_type": "text",
            "provider": "openai-compatible",
            "model_name": "deepseek-chat",
            "base_url": "https://api.deepseek.com/v1",
            "is_default": True
        },
        {
            "name": "DeepSeek V4 Reasoner",
            "model_type": "text",
            "provider": "openai-compatible",
            "model_name": "deepseek-reasoner",
            "base_url": "https://api.deepseek.com/v1",
            "is_default": False
        }
    ]
    
    with SessionLocal() as db:
        # Check if already exists to avoid duplicates
        for m in models:
            existing = db.query(ModelConfig).filter_by(user_id=user_id, model_name=m["model_name"]).first()
            if existing:
                print(f"Model {m['name']} already exists, updating...")
                existing.name = m["name"]
                existing.base_url = m["base_url"]
                existing.encrypted_api_key = encrypted_key
                existing.is_default = m["is_default"]
            else:
                print(f"Creating model {m['name']}...")
                new_model = ModelConfig(
                    user_id=user_id,
                    name=m["name"],
                    model_type=m["model_type"],
                    provider=m["provider"],
                    model_name=m["model_name"],
                    base_url=m["base_url"],
                    encrypted_api_key=encrypted_key,
                    is_default=m["is_default"]
                )
                db.add(new_model)
        db.commit()
    print("Done.")

if __name__ == "__main__":
    insert_deepseek_models()

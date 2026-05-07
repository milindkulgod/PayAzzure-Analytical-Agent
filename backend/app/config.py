import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
DATA_DIR = Path(os.getenv("DATA_DIR", "./data")).resolve()
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")

UPLOAD_DIR = DATA_DIR / "uploads"
SESSION_DIR = DATA_DIR / "sessions"

for d in (DATA_DIR, UPLOAD_DIR, SESSION_DIR):
    d.mkdir(parents=True, exist_ok=True)

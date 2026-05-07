import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
ANTHROPIC_FALLBACK_MODEL = os.getenv("ANTHROPIC_FALLBACK_MODEL", "claude-sonnet-4-6")
DATA_DIR = Path(os.getenv("DATA_DIR", "./data")).resolve()
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")

UPLOAD_DIR = DATA_DIR / "uploads"
SESSION_DIR = DATA_DIR / "sessions"

for d in (DATA_DIR, UPLOAD_DIR, SESSION_DIR):
    d.mkdir(parents=True, exist_ok=True)


def available_models() -> list[dict]:
    """Models exposed in the chat switcher. Order matters — first is default."""
    return [
        {
            "id": ANTHROPIC_MODEL,
            "label": "Haiku 4.5",
            "hint": "Fast, low-cost. Good for descriptive Q&A.",
            "default": True,
        },
        {
            "id": ANTHROPIC_FALLBACK_MODEL,
            "label": "Sonnet 4.6",
            "hint": "Deeper reasoning. Better numerics & multi-doc.",
            "default": False,
        },
    ]


def is_allowed_model(model_id: str) -> bool:
    return any(m["id"] == model_id for m in available_models())

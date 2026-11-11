import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR.parent / "db"
load_dotenv(BASE_DIR / ".env")

DB_SSL_CA = os.getenv("DB_SSL_CA") or None

CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

cookie_secure_value = os.getenv("AUTH_COOKIE_SECURE", "true").lower()
if cookie_secure_value not in {"true", "false"}:
    raise ValueError("AUTH_COOKIE_SECURE는 true 또는 false로 설정해 주세요.")

AUTH_COOKIE_SECURE = cookie_secure_value == "true"
AUTH_COOKIE_NAME = "presentai_session"
SESSION_TTL_SECONDS = 60 * 60 * 24

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "").strip()
S3_REGION = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION") or ""

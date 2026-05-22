import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

# backend/app/core/config.py → repo root is three levels above this file
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = _BACKEND_ROOT.parent

# Support .env at repo root (docker-compose) and/or under backend/ (local uvicorn)
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_BACKEND_ROOT / ".env", override=True)

_wallet_at_root = _REPO_ROOT / "wallet"
_cfg = (os.environ.get("ORACLE_CONFIG_DIR") or "").strip()
_wlt = (os.environ.get("ORACLE_WALLET_DIR") or "").strip()
if not _cfg and not _wlt and _wallet_at_root.is_dir():
    _path = str(_wallet_at_root.resolve())
    os.environ.setdefault("ORACLE_CONFIG_DIR", _path)
    os.environ.setdefault("ORACLE_WALLET_DIR", _path)


class Settings(BaseModel):
    APP_NAME: str = "Sistema Espina Bífida API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-in-production")
    ALLOW_FALLBACK_USERS: bool = os.getenv("ALLOW_FALLBACK_USERS", "false").lower() in ("true", "1", "yes")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # 2 hours
    CORS_ORIGINS: list[str] = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",") if origin.strip()]
    ALLOWED_HOSTS: list[str] = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,backend").split(",") if host.strip()]
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", str(5 * 1024 * 1024)))  # 5 MB
    ALLOWED_UPLOAD_EXTENSIONS: list[str] = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]

    # Oracle DB
    ORACLE_USER: str = os.getenv("ORACLE_USER", "")
    ORACLE_PASSWORD: str = os.getenv("ORACLE_PASSWORD", "")
    ORACLE_DSN: str = os.getenv("ORACLE_DSN", "")
    ORACLE_CLIENT_DIR: str = os.getenv("ORACLE_CLIENT_DIR", "")
    ORACLE_CONFIG_DIR: str = os.getenv("ORACLE_CONFIG_DIR", "")
    ORACLE_WALLET_DIR: str = os.getenv("ORACLE_WALLET_DIR", "")
    ORACLE_WALLET_PASSWORD: str = os.getenv("ORACLE_WALLET_PASSWORD", "")

    # Cifrado de datos personales (AES-256-GCM) - LFPDPPP
    DATA_ENCRYPTION_KEY: str = os.getenv("DATA_ENCRYPTION_KEY", "")

    # SMTP — recuperación de contraseña por correo (Opción C)
    # Configurar estas variables en .env para activar el flujo de "olvidé mi contraseña"
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30"))


settings = Settings()

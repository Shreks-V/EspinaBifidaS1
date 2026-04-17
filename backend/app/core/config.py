import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


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


settings = Settings()

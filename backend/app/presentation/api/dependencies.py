from functools import lru_cache

from app.application.auth.use_cases import AuthService
from app.core.config import settings
from app.domain.auth.ports import AccessTokenIssuer
from app.infrastructure.auth.fallback_users import build_fallback_users
from app.infrastructure.auth.oracle_user_repository import OracleUserRepository
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher


@lru_cache(maxsize=1)
def get_token_decoder() -> AccessTokenIssuer:
    return JwtAccessTokenIssuer()


@lru_cache(maxsize=1)
def get_auth_service() -> AuthService:
    password_hasher = SecurityPasswordHasher()
    user_repository = OracleUserRepository(password_hasher=password_hasher)
    token_issuer = JwtAccessTokenIssuer()
    fallback_users = build_fallback_users(password_hasher) if settings.ALLOW_FALLBACK_USERS else []
    return AuthService(
        user_repository=user_repository,
        password_hasher=password_hasher,
        token_issuer=token_issuer,
        fallback_users=fallback_users,
    )

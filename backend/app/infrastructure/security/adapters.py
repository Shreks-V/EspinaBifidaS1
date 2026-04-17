from datetime import timedelta

from app.domain.auth.ports import AccessTokenIssuer, PasswordHasher
from app.infrastructure.security.auth import create_access_token, get_password_hash, verify_password


class SecurityPasswordHasher(PasswordHasher):
    def verify(self, plain_password: str, hashed_password: str) -> bool:
        return verify_password(plain_password, hashed_password)

    def hash(self, password: str) -> str:
        return get_password_hash(password)


class JwtAccessTokenIssuer(AccessTokenIssuer):
    def issue(self, data: dict, expires_delta: timedelta | None = None) -> str:
        return create_access_token(data=data, expires_delta=expires_delta)

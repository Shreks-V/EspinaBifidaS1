from __future__ import annotations

from datetime import timedelta
from typing import Protocol

from app.domain.auth.entities import SeedUser, User


class UserRepository(Protocol):
    def find_by_email(self, correo: str) -> User | None:
        ...

    def has_users(self) -> bool:
        ...

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        ...

    def log_login_attempt(
        self, id_usuario: int | None, success: bool, ip: str | None = None
    ) -> None:
        ...


class PasswordHasher(Protocol):
    def verify(self, plain_password: str, hashed_password: str) -> bool:
        ...

    def hash(self, password: str) -> str:
        ...


class AccessTokenIssuer(Protocol):
    def issue(self, data: dict, expires_delta: timedelta | None = None) -> str:
        ...

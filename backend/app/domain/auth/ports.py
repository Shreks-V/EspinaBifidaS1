from __future__ import annotations

from datetime import timedelta
from typing import Protocol

from app.domain.auth.entities import NewUser, SeedUser, UpdateUser, User


class UserRepository(Protocol):
    def find_by_email(self, correo: str) -> User | None:
        ...

    def find_by_id(self, id_usuario: int) -> User | None:
        ...

    def list_all(self) -> list[User]:
        ...

    def has_users(self) -> bool:
        ...

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        ...

    def create_user(self, user: NewUser, hashed_password: str) -> User:
        ...

    def update_user(self, id_usuario: int, data: UpdateUser) -> User:
        ...

    def update_password(self, id_usuario: int, new_hash: str) -> None:
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

    def decode(self, token: str) -> dict:
        """Decode and verify a token. Raises TokenDecodeError if invalid."""
        ...

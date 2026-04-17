from __future__ import annotations

from app.domain.auth.entities import SeedUser, User
from app.infrastructure.security.adapters import SecurityPasswordHasher


class InMemoryUserRepository:
    """Repositorio mínimo para pruebas (sin Oracle)."""

    def __init__(self, users_by_email_lower: dict[str, User], has_users: bool) -> None:
        self._users = dict(users_by_email_lower)
        self._has_users = has_users

    def find_by_email(self, correo: str) -> User | None:
        if correo is None:
            return None
        key = str(correo).strip().lower()
        return self._users.get(key)

    def has_users(self) -> bool:
        return self._has_users

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        return []

    def log_login_attempt(
        self, id_usuario: int | None, success: bool, ip: str | None = None
    ) -> None:
        return None


def build_user(
    *,
    correo: str,
    password_plain: str,
    password_hasher: SecurityPasswordHasher,
    id_usuario: int = 1,
    nombre: str = "Test",
    estatus: str = "ACTIVO",
    rol: str = "RECEPCIONISTA",
) -> User:
    return User(
        id_usuario=id_usuario,
        nombre=nombre,
        apellido_paterno="P",
        apellido_materno=None,
        correo=correo.strip(),
        hashed_password=password_hasher.hash(password_plain),
        rol=rol,
        estatus=estatus,
    )

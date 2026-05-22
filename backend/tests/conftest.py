"""
Shared fixtures for the test suite.

The app normally connects to Oracle on startup. In tests we patch those
infrastructure calls so the suite runs offline without any DB.
"""
import os
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Set minimal env vars before the app module is imported so config loads cleanly.
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-32ch")
os.environ.setdefault("ALLOW_FALLBACK_USERS", "false")
os.environ.setdefault("ALLOWED_HOSTS", "*")

from app.application.auth.use_cases import AuthService
from app.domain.auth.entities import NewUser, SeedUser, UpdateUser, User
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher
from app.presentation.api.dependencies import get_auth_service, get_token_decoder


# ── Stub implementations ───────────────────────────────────────────────────────

class StubUserRepository:
    """In-memory user store used by all tests."""

    def __init__(self):
        hasher = SecurityPasswordHasher()
        self._users: list[User] = [
            User(
                id_usuario=1,
                nombre="Admin",
                apellido_paterno="Test",
                apellido_materno=None,
                correo="admin@test.com",
                hashed_password=hasher.hash("admin1234"),
                rol="ADMINISTRADOR",
                estatus="ACTIVO",
                fecha_creacion=datetime(2025, 1, 1),
            ),
            User(
                id_usuario=2,
                nombre="Operativo",
                apellido_paterno="Test",
                apellido_materno=None,
                correo="op@test.com",
                hashed_password=hasher.hash("op123456"),
                rol="RECEPCIONISTA",
                estatus="ACTIVO",
                fecha_creacion=datetime(2025, 1, 1),
            ),
            User(
                id_usuario=3,
                nombre="Inactivo",
                apellido_paterno="Test",
                apellido_materno=None,
                correo="inactivo@test.com",
                hashed_password=hasher.hash("inactive1"),
                rol="RECEPCIONISTA",
                estatus="INACTIVO",
                fecha_creacion=datetime(2025, 1, 1),
            ),
        ]
        self._next_id = 10

    def find_by_email(self, correo: str) -> User | None:
        return next((u for u in self._users if u.correo == correo), None)

    def find_by_id(self, id_usuario: int) -> User | None:
        return next((u for u in self._users if u.id_usuario == id_usuario), None)

    def list_all(self) -> list[User]:
        return list(self._users)

    def has_users(self) -> bool:
        return bool(self._users)

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        return []

    def create_user(self, user: NewUser, hashed_password: str) -> User:
        new = User(
            id_usuario=self._next_id,
            nombre=user.nombre,
            apellido_paterno=user.apellido_paterno,
            apellido_materno=user.apellido_materno,
            correo=user.correo,
            hashed_password=hashed_password,
            rol=user.rol,
            estatus=user.estatus,
        )
        self._users.append(new)
        self._next_id += 1
        return new

    def update_user(self, id_usuario: int, data: UpdateUser) -> User:
        old = self.find_by_id(id_usuario)
        updated = User(
            id_usuario=old.id_usuario,
            nombre=data.nombre,
            apellido_paterno=data.apellido_paterno,
            apellido_materno=data.apellido_materno,
            correo=old.correo,
            hashed_password=old.hashed_password,
            rol=data.rol,
            estatus=data.estatus,
        )
        self._users = [updated if u.id_usuario == id_usuario else u for u in self._users]
        return updated

    def update_password(self, id_usuario: int, new_hash: str) -> None:
        self._users = [
            User(**{**u.__dict__, "hashed_password": new_hash})
            if u.id_usuario == id_usuario
            else u
            for u in self._users
        ]

    def log_login_attempt(self, id_usuario, success, ip=None) -> None:
        pass


def _make_auth_service():
    return AuthService(
        user_repository=StubUserRepository(),
        password_hasher=SecurityPasswordHasher(),
        token_issuer=JwtAccessTokenIssuer(),
    )


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient with Oracle startup patched out."""
    with (
        patch("app.infrastructure.persistence.oracle.init_pool"),
        patch("app.infrastructure.persistence.oracle.close_pool"),
        patch("app.infrastructure.startup.migrations.run_startup_migrations"),
        patch("app.infrastructure.scheduler.membresias.start_expiry_scheduler"),
    ):
        from app.main import app

        app.dependency_overrides[get_auth_service] = _make_auth_service
        app.dependency_overrides[get_token_decoder] = JwtAccessTokenIssuer

        with TestClient(app, raise_server_exceptions=True) as c:
            yield c

        app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def admin_token(client):
    """JWT for the stub admin user."""
    res = client.post("/api/auth/login", json={"correo": "admin@test.com", "password": "admin1234"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="session")
def op_token(client):
    """JWT for the stub recepcionista user."""
    res = client.post("/api/auth/login", json={"correo": "op@test.com", "password": "op123456"})
    assert res.status_code == 200
    return res.json()["access_token"]

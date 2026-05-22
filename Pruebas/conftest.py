from __future__ import annotations

from collections.abc import Callable

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.application.auth.use_cases import AuthService
from app.core.config import settings
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.routers import auth as auth_router
from app.presentation.api.routers import beneficiarios as beneficiarios_router
from app.presentation.api.routers import citas as citas_router
from app.presentation.api.routers import preregistro as preregistro_router
from app.presentation.api.routers import recibos as recibos_router

from Pruebas.support_auth import InMemoryUserRepository, build_user
from Pruebas.support_beneficiarios import (
    InMemoryBeneficiariosRepository,
    default_seed_patients,
)
from Pruebas.support_citas import InMemoryCitasRepository
from Pruebas.support_preregistro import InMemoryPreregistroRepository
from Pruebas.support_recibos import InMemoryRecibosRepository


def build_minimal_auth_app(auth_service: AuthService) -> FastAPI:
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


def build_minimal_app_with_beneficiarios(auth_service: AuthService) -> FastAPI:
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.include_router(
        beneficiarios_router.router, prefix="/api/beneficiarios", tags=["Beneficiarios"]
    )
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


def build_minimal_app_with_citas(auth_service: AuthService) -> FastAPI:
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.include_router(citas_router.router, prefix="/api/citas", tags=["Citas"])
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


def build_minimal_app_with_preregistro(auth_service: AuthService) -> FastAPI:
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.include_router(
        preregistro_router.router, prefix="/api/preregistro", tags=["Pre-Registro"]
    )
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


def build_minimal_app_with_recibos(auth_service: AuthService) -> FastAPI:
    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.include_router(recibos_router.router, prefix="/api/recibos", tags=["Recibos"])
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


@pytest.fixture(autouse=True)
def stable_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "SECRET_KEY", "pytest-jwt-secret-key-exactly-32bytes!")


@pytest.fixture
def password_hasher() -> SecurityPasswordHasher:
    return SecurityPasswordHasher()


@pytest.fixture
def auth_client_factory(
    password_hasher: SecurityPasswordHasher,
) -> Callable[[InMemoryUserRepository], TestClient]:
    def _make(repo: InMemoryUserRepository) -> TestClient:
        auth_service = AuthService(
            user_repository=repo,
            password_hasher=password_hasher,
            token_issuer=JwtAccessTokenIssuer(),
            fallback_users=[],
        )
        app = build_minimal_auth_app(auth_service)
        return TestClient(app)

    return _make


def _default_beneficiarios_user_repo(
    password_hasher: SecurityPasswordHasher,
) -> InMemoryUserRepository:
    admin = build_user(
        correo="admin-ben@test.local",
        password_plain="adm123",
        password_hasher=password_hasher,
        id_usuario=1,
        nombre="Admin",
        rol="ADMINISTRADOR",
        estatus="ACTIVO",
    )
    recep = build_user(
        correo="recep-ben@test.local",
        password_plain="rec123",
        password_hasher=password_hasher,
        id_usuario=2,
        nombre="Recepción",
        rol="RECEPCIONISTA",
        estatus="ACTIVO",
    )
    return InMemoryUserRepository(
        {admin.correo.lower(): admin, recep.correo.lower(): recep},
        has_users=True,
    )


@pytest.fixture
def beneficiarios_client_factory(
    password_hasher: SecurityPasswordHasher,
) -> Callable[[InMemoryBeneficiariosRepository | None, InMemoryUserRepository | None], TestClient]:
    """App con /api/auth + /api/beneficiarios y repo en memoria (semilla por defecto)."""

    def _make(
        repo: InMemoryBeneficiariosRepository | None = None,
        user_repo: InMemoryUserRepository | None = None,
    ) -> TestClient:
        from app.application.beneficiarios.use_cases import BeneficiariosService, configure_service as configure_beneficiarios

        ben_repo = repo or InMemoryBeneficiariosRepository(default_seed_patients())
        configure_beneficiarios(BeneficiariosService(ben_repo))
        urepo = user_repo or _default_beneficiarios_user_repo(password_hasher)
        auth_service = AuthService(
            user_repository=urepo,
            password_hasher=password_hasher,
            token_issuer=JwtAccessTokenIssuer(),
            fallback_users=[],
        )
        app = build_minimal_app_with_beneficiarios(auth_service)
        return TestClient(app)

    return _make


@pytest.fixture
def preregistro_client_factory(
    password_hasher: SecurityPasswordHasher,
) -> Callable[[InMemoryPreregistroRepository | None, InMemoryUserRepository | None], TestClient]:
    """App con /api/auth + /api/preregistro y repo en memoria."""

    def _make(
        repo: InMemoryPreregistroRepository | None = None,
        user_repo: InMemoryUserRepository | None = None,
    ) -> TestClient:
        from app.application.preregistro.use_cases import PreregistroService, configure_service as configure_preregistro

        pre_repo = repo or InMemoryPreregistroRepository()
        configure_preregistro(PreregistroService(pre_repo))
        urepo = user_repo or _default_beneficiarios_user_repo(password_hasher)
        auth_service = AuthService(
            user_repository=urepo,
            password_hasher=password_hasher,
            token_issuer=JwtAccessTokenIssuer(),
            fallback_users=[],
        )
        app = build_minimal_app_with_preregistro(auth_service)
        return TestClient(app)

    return _make


@pytest.fixture
def citas_client_factory(
    password_hasher: SecurityPasswordHasher,
) -> Callable[[InMemoryCitasRepository | None, InMemoryUserRepository | None], TestClient]:
    """App con /api/auth + /api/citas y repo en memoria."""

    def _make(
        repo: InMemoryCitasRepository | None = None,
        user_repo: InMemoryUserRepository | None = None,
    ) -> TestClient:
        from app.application.citas.use_cases import CitasService, configure_service as configure_citas

        c_repo = repo or InMemoryCitasRepository()
        configure_citas(CitasService(c_repo))
        urepo = user_repo or _default_beneficiarios_user_repo(password_hasher)
        auth_service = AuthService(
            user_repository=urepo,
            password_hasher=password_hasher,
            token_issuer=JwtAccessTokenIssuer(),
            fallback_users=[],
        )
        app = build_minimal_app_with_citas(auth_service)
        return TestClient(app)

    return _make


@pytest.fixture
def recibos_client_factory(
    password_hasher: SecurityPasswordHasher,
) -> Callable[[InMemoryRecibosRepository | None, InMemoryUserRepository | None], TestClient]:
    """App con /api/auth + /api/recibos y repo en memoria (semilla por defecto)."""

    def _make(
        repo: InMemoryRecibosRepository | None = None,
        user_repo: InMemoryUserRepository | None = None,
    ) -> TestClient:
        from app.application.recibos.use_cases import RecibosService, configure_service as configure_recibos

        r_repo = repo or InMemoryRecibosRepository()
        configure_recibos(RecibosService(r_repo))
        urepo = user_repo or _default_beneficiarios_user_repo(password_hasher)
        auth_service = AuthService(
            user_repository=urepo,
            password_hasher=password_hasher,
            token_issuer=JwtAccessTokenIssuer(),
            fallback_users=[],
        )
        app = build_minimal_app_with_recibos(auth_service)
        return TestClient(app)

    return _make

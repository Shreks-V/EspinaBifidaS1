"""Fixtures Sprint 2: app en memoria (sin Oracle) u opcional integración Oracle."""

from __future__ import annotations

import os
import subprocess
import sys
import types
from collections.abc import Callable, Generator
from pathlib import Path

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.application.almacen.use_cases import AlmacenService, configure_service as configure_almacen
from app.application.auth.use_cases import AuthService
from app.application.beneficiarios.use_cases import BeneficiariosService, configure_service as configure_beneficiarios
from app.application.citas.use_cases import CitasService, configure_service as configure_citas
from app.application.exportaciones.use_cases import ExportacionesService, configure_service as configure_exportaciones
from app.application.recibos.use_cases import RecibosService, configure_service as configure_recibos
from app.application.reportes.use_cases import ReportesService, configure_service as configure_reportes
from app.core.config import settings
from app.domain.exceptions import ConflictError, InternalError, NotFoundError, ValidationError
from app.infrastructure.security.adapters import JwtAccessTokenIssuer, SecurityPasswordHasher
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.routers import almacen as almacen_router
from app.presentation.api.routers import auth as auth_router
from app.presentation.api.routers import beneficiarios as beneficiarios_router
from app.presentation.api.routers import citas as citas_router
from app.presentation.api.routers import config as config_router
from app.presentation.api.routers import exportaciones as exportaciones_router
from app.presentation.api.routers import notificaciones as notificaciones_router
from app.presentation.api.routers import recibos as recibos_router
from app.presentation.api.routers import reportes as reportes_router

from Pruebas.support_auth import InMemoryUserRepository, build_user
from Pruebas.support_beneficiarios import InMemoryBeneficiariosRepository, default_seed_patients
from Pruebas.support_citas import InMemoryCitasRepository, seed_cita_hoy
from Pruebas.support_recibos import InMemoryRecibosRepository

from support_s2_memory import (
    InMemoryAlmacenRepository,
    InMemoryExportacionesRepository,
    InMemoryReportesRepository,
)


def pytest_sessionstart(session: pytest.Session) -> None:
    if os.environ.get("QASE_SYNC_S2") != "1":
        return
    if not os.environ.get("QASE_TESTOPS_API_TOKEN"):
        return
    root = Path(__file__).resolve().parents[1]
    script = root / "scripts" / "qase_sync_sprint2.py"
    if script.is_file():
        subprocess.run([sys.executable, str(script)], cwd=str(root), check=False)


@pytest.fixture(autouse=True)
def stable_jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "SECRET_KEY", "pytest-jwt-secret-key-exactly-32bytes!")


@pytest.fixture(autouse=True)
def _reset_auth_login_rate_limits() -> Generator[None, None, None]:
    """El limiter de login vive en el módulo auth; reiniciarlo evita 429 entre tests."""
    from app.presentation.api.routers import auth as auth_router

    auth_router.limiter.reset()
    yield


def _register_domain_errors(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _nf(_: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @app.exception_handler(ValidationError)
    async def _val(_: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    @app.exception_handler(ConflictError)
    async def _cf(_: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(InternalError)
    async def _ie(_: Request, exc: InternalError):
        return JSONResponse(status_code=500, content={"detail": exc.detail})


def _default_s2_user_repo(password_hasher: SecurityPasswordHasher) -> InMemoryUserRepository:
    admin = build_user(
        correo="admin-s2@test.local",
        password_plain="adm123",
        password_hasher=password_hasher,
        id_usuario=1,
        nombre="Admin S2",
        rol="ADMINISTRADOR",
        estatus="ACTIVO",
    )
    encargado = build_user(
        correo="almacen-s2@test.local",
        password_plain="alm123",
        password_hasher=password_hasher,
        id_usuario=2,
        nombre="Encargado",
        rol="ENCARGADO_ALMACEN",
        estatus="ACTIVO",
    )
    return InMemoryUserRepository(
        {admin.correo.lower(): admin, encargado.correo.lower(): encargado},
        has_users=True,
    )


def build_s2_memory_app(
    password_hasher: SecurityPasswordHasher,
    *,
    almacen_repo: InMemoryAlmacenRepository | None = None,
    cita_seed: list | None = None,
) -> FastAPI:
    ben_repo = InMemoryBeneficiariosRepository(default_seed_patients())
    configure_beneficiarios(BeneficiariosService(ben_repo))

    seed = cita_seed or [
        seed_cita_hoy(id_cita=1, id_paciente=1, hora="10:00:00", estatus="PROGRAMADA"),
    ]
    c_repo = InMemoryCitasRepository(seed_citas=seed)
    configure_citas(CitasService(c_repo))

    configure_recibos(RecibosService(InMemoryRecibosRepository()))

    alm = almacen_repo or InMemoryAlmacenRepository()
    configure_almacen(AlmacenService(alm))

    configure_reportes(ReportesService(InMemoryReportesRepository()))

    valid_citas = frozenset({int(c["id_cita"]) for c in seed})
    configure_exportaciones(ExportacionesService(InMemoryExportacionesRepository(valid_citas)))

    urepo = _default_s2_user_repo(password_hasher)
    auth_service = AuthService(
        user_repository=urepo,
        password_hasher=password_hasher,
        token_issuer=JwtAccessTokenIssuer(),
        fallback_users=[],
    )

    app = FastAPI()
    app.state.limiter = auth_router.limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    _register_domain_errors(app)

    app.include_router(config_router.router, prefix="/api/config", tags=["Configuración"])
    app.include_router(auth_router.router, prefix="/api/auth", tags=["Autenticación"])
    app.include_router(beneficiarios_router.router, prefix="/api/beneficiarios", tags=["Beneficiarios"])
    app.include_router(citas_router.router, prefix="/api/citas", tags=["Citas"])
    app.include_router(almacen_router.router, prefix="/api/almacen", tags=["Almacén"])
    app.include_router(recibos_router.router, prefix="/api/recibos", tags=["Recibos"])
    app.include_router(reportes_router.router, prefix="/api/reportes", tags=["Reportes"])
    app.include_router(exportaciones_router.router, prefix="/api/exportaciones", tags=["Exportaciones"])
    app.include_router(notificaciones_router.router, prefix="/api/notificaciones", tags=["Notificaciones"])
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    return app


@pytest.fixture
def password_hasher() -> SecurityPasswordHasher:
    return SecurityPasswordHasher()


@pytest.fixture
def s2_client(password_hasher: SecurityPasswordHasher) -> TestClient:
    """Cliente API Sprint 2 con servicios en memoria."""
    app = build_s2_memory_app(password_hasher)
    return TestClient(app)


@pytest.fixture
def s2_admin_token(password_hasher: SecurityPasswordHasher) -> str:
    app = build_s2_memory_app(password_hasher)
    client = TestClient(app)
    r = client.post(
        "/api/auth/login",
        json={"correo": "admin-s2@test.local", "password": "adm123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def s2_encargado_token(password_hasher: SecurityPasswordHasher) -> str:
    app = build_s2_memory_app(password_hasher)
    client = TestClient(app)
    r = client.post(
        "/api/auth/login",
        json={"correo": "almacen-s2@test.local", "password": "alm123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def s2_auth(s2_admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {s2_admin_token}"}


@pytest.fixture
def s2_auth_encargado(s2_encargado_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {s2_encargado_token}"}


@pytest.fixture
def s2_client_notificaciones_rich(
    password_hasher: SecurityPasswordHasher,
) -> TestClient:
    """Almacén con alertas y citas hoy para validar payload de notificaciones."""
    alm = InMemoryAlmacenRepository()

    def _rich_stats(_self, current_user=None):
        del _self, current_user
        return {"total_productos": 5, "alertas_stock_bajo": 2, "alertas_caducidad": 1}

    alm.almacen_stats = types.MethodType(_rich_stats, alm)  # type: ignore[method-assign]

    hoy = seed_cita_hoy(id_cita=10, id_paciente=1, hora="09:00:00", estatus="PROGRAMADA")
    app = build_s2_memory_app(password_hasher, almacen_repo=alm, cita_seed=[hoy])
    return TestClient(app)


def s2_use_oracle() -> bool:
    return os.environ.get("EBIF_S2_USE_ORACLE", "0").strip().lower() in ("1", "true", "yes")


@pytest.fixture
def s2_oracle_client():
    """App completa contra Oracle; solo si ``EBIF_S2_USE_ORACLE=1``."""
    if not s2_use_oracle():
        pytest.skip("Defina EBIF_S2_USE_ORACLE=1 y ORACLE_* para pruebas de integración S2")
    from app.presentation.api.app_factory import create_app

    return TestClient(create_app(), base_url="http://localhost")

from fastapi import APIRouter

from app.presentation.api.routers import (
    almacen,
    auth,
    beneficiarios,
    citas,
    config,
    doctores,
    exportaciones,
    notificaciones,
    preregistro,
    recibos,
    reportes,
)


def build_api_router() -> APIRouter:
    router = APIRouter()
    router.include_router(config.router, prefix="/api/config", tags=["Configuración"])
    router.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
    router.include_router(beneficiarios.router, prefix="/api/beneficiarios", tags=["Beneficiarios"])
    router.include_router(citas.router, prefix="/api/citas", tags=["Citas"])
    router.include_router(almacen.router, prefix="/api/almacen", tags=["Almacén"])
    router.include_router(recibos.router, prefix="/api/recibos", tags=["Recibos"])
    router.include_router(reportes.router, prefix="/api/reportes", tags=["Reportes"])
    router.include_router(preregistro.router, prefix="/api/preregistro", tags=["Pre-Registro"])
    router.include_router(doctores.router, prefix="/api/doctores", tags=["Doctores"])
    router.include_router(exportaciones.router, prefix="/api/exportaciones", tags=["Exportaciones"])
    router.include_router(notificaciones.router, prefix="/api/notificaciones", tags=["Notificaciones"])
    return router

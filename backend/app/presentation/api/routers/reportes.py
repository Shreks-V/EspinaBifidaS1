from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.application.reportes import use_cases as service
from app.presentation.api.security import get_current_user

router = APIRouter()

# Sprint 1: sólo se usa el consolidado mensual para el panel de tendencia semanal
# del dashboard (HU-05). Los demás reportes corresponden a sprints posteriores.

@router.get('/consolidado-mensual')
def reporte_consolidado_mensual(
    mes: Optional[int] = Query(None, description='Mes (1-12)'),
    anio: Optional[int] = Query(None, description='Año'),
    current_user: dict = Depends(get_current_user),
):
    return service.reporte_consolidado_mensual(mes, anio, current_user)

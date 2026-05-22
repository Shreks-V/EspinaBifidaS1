from fastapi import APIRouter, Query, Depends
from typing import Optional, List
from app.presentation.api.schemas import ReporteResponse
from app.application.reportes import use_cases as service
from app.presentation.api.security import get_current_user
router = APIRouter()

@router.get('/por-genero')
def reporte_por_genero(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), tipo_espina: Optional[int]=Query(None), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-etapa-vida')
def reporte_por_etapa_vida(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), tipo_espina: Optional[int]=Query(None), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-tipo-espina')
def reporte_por_tipo_espina(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), tipo_espina: Optional[int]=Query(None), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/por-estado')
def reporte_por_estado(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), tipo_espina: Optional[int]=Query(None), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/resumen')
def reporte_resumen(genero: Optional[str]=Query(None), estado: Optional[str]=Query(None), tipo_espina: Optional[int]=Query(None), fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

@router.get('/servicios-por-tipo')
def reporte_servicios_por_tipo(fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

@router.get('/estudios-por-tipo')
def reporte_estudios_por_tipo(fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

@router.get('/pagos-exentos')
def reporte_pagos_exentos(fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

@router.get('/consolidado-mensual')
def reporte_consolidado_mensual(mes: Optional[int]=Query(None, description='Mes (1-12)'), anio: Optional[int]=Query(None, description='Año'), current_user: dict=Depends(get_current_user)):
    return service.reporte_consolidado_mensual(mes, anio, current_user)

@router.get('/por-ciudad')
def reporte_por_ciudad(current_user: dict=Depends(get_current_user)):
    return service.reporte_por_ciudad(current_user)

@router.get('/indicadores-desempeno')
def indicadores_desempeno(fecha_inicio: Optional[str]=Query(None), fecha_fin: Optional[str]=Query(None), current_user: dict=Depends(get_current_user)):
    return service.indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

@router.get('/historial', response_model=List[ReporteResponse])
def historial_reportes(
    tipo_reporte: Optional[str]=Query(None, max_length=60),
    fecha_inicio: Optional[str]=Query(None),
    fecha_fin: Optional[str]=Query(None),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

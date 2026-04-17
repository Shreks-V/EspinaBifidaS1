from typing import Optional
from app.domain.reportes.ports import ReportesRepository
_repository: ReportesRepository | None = None

def configure_repository(repository: ReportesRepository):
    global _repository
    _repository = repository

def _get_repository() -> ReportesRepository:
    if _repository is None:
        raise RuntimeError('reportes repository is not configured')
    return _repository

def reporte_por_genero(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_etapa_vida(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_tipo_espina(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_estado(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_resumen(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_servicios_por_tipo(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

def reporte_estudios_por_tipo(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

def reporte_pagos_exentos(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

def reporte_consolidado_mensual(mes: Optional[int]=None, anio: Optional[int]=None, current_user: dict=None):
    return _get_repository().reporte_consolidado_mensual(mes, anio, current_user)

def historial_reportes(tipo_reporte: Optional[str]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

from typing import Optional
from app.domain.reportes.ports import ReportesRepository
from app.domain.shared.current_user import CurrentUser

_service: "ReportesService | None" = None


class ReportesService:
    def __init__(self, repository: ReportesRepository) -> None:
        self._repository = repository

    def reporte_por_genero(self, genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_etapa_vida(self, genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_tipo_espina(self, genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_estado(self, genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_resumen(self, genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_servicios_por_tipo(self, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

    def reporte_estudios_por_tipo(self, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

    def reporte_pagos_exentos(self, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

    def reporte_consolidado_mensual(self, mes: Optional[int] = None, anio: Optional[int] = None, current_user: CurrentUser | None = None):
        return self._repository.reporte_consolidado_mensual(mes, anio, current_user)

    def historial_reportes(self, tipo_reporte: Optional[str] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

    def reporte_por_ciudad(self, current_user: CurrentUser | None = None):
        return self._repository.reporte_por_ciudad(current_user)

    def indicadores_desempeno(self, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.indicadores_desempeno(fecha_inicio, fecha_fin, current_user)


def configure_service(service: ReportesService) -> None:
    global _service
    _service = service


def _svc() -> ReportesService:
    if _service is None:
        raise RuntimeError("reportes service is not configured")
    return _service


def reporte_por_genero(genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_etapa_vida(genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_tipo_espina(genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_por_estado(genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_resumen(genero: Optional[str] = None, estado: Optional[str] = None, tipo_espina: Optional[int] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def reporte_servicios_por_tipo(fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

def reporte_estudios_por_tipo(fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

def reporte_pagos_exentos(fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

def reporte_consolidado_mensual(mes: Optional[int] = None, anio: Optional[int] = None, current_user: CurrentUser | None = None):
    return _svc().reporte_consolidado_mensual(mes, anio, current_user)

def historial_reportes(tipo_reporte: Optional[str] = None, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

def reporte_por_ciudad(current_user: CurrentUser | None = None):
    return _svc().reporte_por_ciudad(current_user)

def indicadores_desempeno(fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

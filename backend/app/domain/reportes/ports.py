from typing import Optional, Protocol

from app.domain.reportes.entities import HistorialReporte
from app.domain.shared.current_user import CurrentUser


class ReportesRepository(Protocol):
    def reporte_por_genero(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_por_etapa_vida(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_por_tipo_espina(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_por_estado(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_resumen(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_servicios_por_tipo(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_estudios_por_tipo(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_pagos_exentos(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def reporte_consolidado_mensual(
        self,
        mes: Optional[int] = None,
        anio: Optional[int] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    def historial_reportes(
        self,
        tipo_reporte: Optional[str] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[HistorialReporte]: ...

    def reporte_por_ciudad(self, current_user: CurrentUser | None = None) -> dict: ...

    def indicadores_desempeno(
        self,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

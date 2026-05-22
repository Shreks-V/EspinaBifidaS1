from typing import Optional, Protocol

from app.domain.exportaciones.entities import FilePayload
from app.domain.shared.current_user import CurrentUser


class ExportacionesRepository(Protocol):
    def exportar_reporte_pdf(
        self,
        tipo: str = "resumen",
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        tipo_espina: Optional[int] = None,
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload: ...

    def exportar_beneficiario_pdf(self, folio: str, current_user: dict | None = None) -> FilePayload: ...

    def exportar_credencial_pdf(self, folio: str, current_user: dict | None = None) -> FilePayload: ...

    def exportar_comprobante_cita(self, id_cita: int, current_user: dict | None = None) -> FilePayload: ...

    def exportar_contrato_comodato(self, id_comodato: int, current_user: dict | None = None) -> FilePayload: ...

    def exportar_beneficiarios_excel(
        self,
        genero: Optional[str] = None,
        estado: Optional[str] = None,
        membresia_estatus: Optional[str] = None,
        busqueda: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload: ...

    def exportar_reporte_excel(
        self,
        tipo: str = "resumen",
        fecha_inicio: Optional[str] = None,
        fecha_fin: Optional[str] = None,
        mes: Optional[int] = None,
        anio: Optional[int] = None,
        current_user: CurrentUser | None = None,
    ) -> FilePayload: ...

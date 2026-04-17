from typing import Optional
from app.domain.exportaciones.ports import ExportacionesRepository
_repository: ExportacionesRepository | None = None

def configure_repository(repository: ExportacionesRepository):
    global _repository
    _repository = repository

def _get_repository() -> ExportacionesRepository:
    if _repository is None:
        raise RuntimeError('exportaciones repository is not configured')
    return _repository

def exportar_reporte_pdf(tipo: str='resumen', genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    return _get_repository().exportar_reporte_pdf(tipo, genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

def exportar_beneficiario_pdf(folio: str, current_user: dict=None):
    return _get_repository().exportar_beneficiario_pdf(folio, current_user)

def exportar_credencial_pdf(folio: str, current_user: dict=None):
    return _get_repository().exportar_credencial_pdf(folio, current_user)

def exportar_comprobante_cita(id_cita: int, current_user: dict=None):
    return _get_repository().exportar_comprobante_cita(id_cita, current_user)

def exportar_contrato_comodato(id_comodato: int, current_user: dict=None):
    return _get_repository().exportar_contrato_comodato(id_comodato, current_user)

def exportar_beneficiarios_excel(genero: Optional[str]=None, estado: Optional[str]=None, membresia_estatus: Optional[str]=None, busqueda: Optional[str]=None, current_user: dict=None):
    return _get_repository().exportar_beneficiarios_excel(genero, estado, membresia_estatus, busqueda, current_user)

def exportar_reporte_excel(tipo: str='resumen', fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, mes: Optional[int]=None, anio: Optional[int]=None, current_user: dict=None):
    return _get_repository().exportar_reporte_excel(tipo, fecha_inicio, fecha_fin, mes, anio, current_user)

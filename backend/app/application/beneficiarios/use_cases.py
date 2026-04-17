from typing import Optional
from app.schemas.schemas import BeneficiarioCreate
from app.domain.beneficiarios.ports import BeneficiariosRepository
_repository: BeneficiariosRepository | None = None

def configure_repository(repository: BeneficiariosRepository):
    global _repository
    _repository = repository

def _get_repository() -> BeneficiariosRepository:
    if _repository is None:
        raise RuntimeError('beneficiarios repository is not configured')
    return _repository

def listar_tipos_espina(current_user: dict=None):
    return _get_repository().listar_tipos_espina(current_user)

def stats_beneficiarios(current_user: dict=None):
    return _get_repository().stats_beneficiarios(current_user)

def dashboard_stats(current_user: dict=None):
    return _get_repository().dashboard_stats(current_user)

def listar_beneficiarios(nombre: Optional[str]=None, estado: Optional[str]=None, genero: Optional[str]=None, busqueda: Optional[str]=None, membresia_estatus: Optional[str]=None, tipo_cuota: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, current_user, limit, offset)

def obtener_beneficiario(folio: str, current_user: dict=None):
    return _get_repository().obtener_beneficiario(folio, current_user)

def crear_beneficiario(data: BeneficiarioCreate, current_user: dict=None):
    return _get_repository().crear_beneficiario(data, current_user)

def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: dict=None):
    return _get_repository().actualizar_beneficiario(folio, data, current_user)

def eliminar_beneficiario(folio: str, current_user: dict=None):
    return _get_repository().eliminar_beneficiario(folio, current_user)

def historial_beneficiario(
    folio: str,
    current_user: dict=None,
    limit_citas: int=100,
    offset_citas: int=0,
    limit_pagos: int=100,
    offset_pagos: int=0,
    limit_comodatos: int=100,
    offset_comodatos: int=0,
):
    return _get_repository().historial_beneficiario(
        folio,
        current_user,
        limit_citas,
        offset_citas,
        limit_pagos,
        offset_pagos,
        limit_comodatos,
        offset_comodatos,
    )

def listar_membresias_proximas_a_vencer(dias: int=30, current_user: dict=None, limit: int=500, offset: int=0):
    return _get_repository().listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

def renovar_membresia(folio: str, data: dict, current_user: dict=None):
    return _get_repository().renovar_membresia(folio, data, current_user)

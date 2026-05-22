from typing import Optional
from app.application.beneficiarios.dtos import BeneficiarioCreate, RenovarMembresiaCreate
from app.domain.beneficiarios.ports import BeneficiariosRepository
from app.domain.shared.current_user import CurrentUser

_service: "BeneficiariosService | None" = None


class BeneficiariosService:
    def __init__(self, repository: BeneficiariosRepository) -> None:
        self._repository = repository

    def listar_tipos_espina(self, current_user: CurrentUser | None = None):
        return self._repository.listar_tipos_espina(current_user)

    def stats_beneficiarios(self, current_user: CurrentUser | None = None):
        return self._repository.stats_beneficiarios(current_user)

    def dashboard_stats(self, current_user: CurrentUser | None = None):
        return self._repository.dashboard_stats(current_user)

    def listar_beneficiarios(self, nombre: Optional[str] = None, estado: Optional[str] = None, genero: Optional[str] = None, busqueda: Optional[str] = None, membresia_estatus: Optional[str] = None, tipo_cuota: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, current_user, limit, offset)

    def obtener_beneficiario(self, folio: str, current_user: CurrentUser | None = None):
        return self._repository.obtener_beneficiario(folio, current_user)

    def crear_beneficiario(self, data: BeneficiarioCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_beneficiario(data, current_user)

    def actualizar_beneficiario(self, folio: str, data: BeneficiarioCreate, current_user: CurrentUser | None = None):
        return self._repository.actualizar_beneficiario(folio, data, current_user)

    def eliminar_beneficiario(self, folio: str, current_user: CurrentUser | None = None):
        return self._repository.eliminar_beneficiario(folio, current_user)

    def historial_beneficiario(self, folio: str, current_user: CurrentUser | None = None, limit_citas: int = 100, offset_citas: int = 0, limit_pagos: int = 100, offset_pagos: int = 0, limit_comodatos: int = 100, offset_comodatos: int = 0):
        return self._repository.historial_beneficiario(folio, current_user, limit_citas, offset_citas, limit_pagos, offset_pagos, limit_comodatos, offset_comodatos)

    def listar_membresias_proximas_a_vencer(self, dias: int = 30, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
        return self._repository.listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

    def renovar_membresia(self, folio: str, data: RenovarMembresiaCreate, current_user: CurrentUser | None = None):
        return self._repository.renovar_membresia(folio, data.model_dump(), current_user)


def configure_service(service: BeneficiariosService) -> None:
    global _service
    _service = service


def _svc() -> BeneficiariosService:
    if _service is None:
        raise RuntimeError("beneficiarios service is not configured")
    return _service


def listar_tipos_espina(current_user: CurrentUser | None = None):
    return _svc().listar_tipos_espina(current_user)

def stats_beneficiarios(current_user: CurrentUser | None = None):
    return _svc().stats_beneficiarios(current_user)

def dashboard_stats(current_user: CurrentUser | None = None):
    return _svc().dashboard_stats(current_user)

def listar_beneficiarios(nombre: Optional[str] = None, estado: Optional[str] = None, genero: Optional[str] = None, busqueda: Optional[str] = None, membresia_estatus: Optional[str] = None, tipo_cuota: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, current_user, limit, offset)

def obtener_beneficiario(folio: str, current_user: CurrentUser | None = None):
    return _svc().obtener_beneficiario(folio, current_user)

def crear_beneficiario(data: BeneficiarioCreate, current_user: CurrentUser | None = None):
    return _svc().crear_beneficiario(data, current_user)

def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_beneficiario(folio, data, current_user)

def eliminar_beneficiario(folio: str, current_user: CurrentUser | None = None):
    return _svc().eliminar_beneficiario(folio, current_user)

def historial_beneficiario(folio: str, current_user: CurrentUser | None = None, limit_citas: int = 100, offset_citas: int = 0, limit_pagos: int = 100, offset_pagos: int = 0, limit_comodatos: int = 100, offset_comodatos: int = 0):
    return _svc().historial_beneficiario(folio, current_user, limit_citas, offset_citas, limit_pagos, offset_pagos, limit_comodatos, offset_comodatos)

def listar_membresias_proximas_a_vencer(dias: int = 30, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
    return _svc().listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

def renovar_membresia(folio: str, data: RenovarMembresiaCreate, current_user: CurrentUser | None = None):
    return _svc().renovar_membresia(folio, data, current_user)

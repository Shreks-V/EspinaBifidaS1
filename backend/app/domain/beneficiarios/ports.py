from typing import Any, Optional, Protocol

from app.domain.beneficiarios.entities import Beneficiario, TipoEspina
from app.domain.shared.current_user import CurrentUser


class BeneficiariosRepository(Protocol):
    def listar_tipos_espina(self, current_user: CurrentUser | None = None) -> list[TipoEspina]: ...

    def stats_beneficiarios(self, current_user: CurrentUser | None = None) -> dict: ...

    def dashboard_stats(self, current_user: CurrentUser | None = None) -> dict: ...

    def listar_beneficiarios(
        self,
        nombre: Optional[str] = None,
        estado: Optional[str] = None,
        genero: Optional[str] = None,
        busqueda: Optional[str] = None,
        membresia_estatus: Optional[str] = None,
        tipo_cuota: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Beneficiario]: ...

    def obtener_beneficiario(self, folio: str, current_user: CurrentUser | None = None) -> Beneficiario: ...

    def crear_beneficiario(self, data: Any, current_user: CurrentUser | None = None) -> Beneficiario: ...

    def actualizar_beneficiario(self, folio: str, data: Any, current_user: CurrentUser | None = None) -> Beneficiario: ...

    def eliminar_beneficiario(self, folio: str, current_user: CurrentUser | None = None) -> None: ...

    def historial_beneficiario(
        self,
        folio: str,
        current_user: CurrentUser | None = None,
        limit_citas: int = 100,
        offset_citas: int = 0,
        limit_pagos: int = 100,
        offset_pagos: int = 0,
        limit_comodatos: int = 100,
        offset_comodatos: int = 0,
    ) -> dict: ...

    def listar_membresias_proximas_a_vencer(
        self,
        dias: int = 30,
        current_user: CurrentUser | None = None,
        limit: int = 500,
        offset: int = 0,
    ) -> list[Beneficiario]: ...

    def renovar_membresia(self, folio: str, data: dict, current_user: CurrentUser | None = None) -> dict: ...

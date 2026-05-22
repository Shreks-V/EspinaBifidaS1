from typing import Any, Optional, Protocol

from app.domain.almacen.entities import Comodato, MovimientoStock, Producto, Servicio
from app.domain.shared.current_user import CurrentUser


class AlmacenRepository(Protocol):
    def listar_productos(
        self,
        tipo_producto: Optional[str] = None,
        busqueda: Optional[str] = None,
        activo: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Producto]: ...

    def obtener_producto(self, id_producto: int, current_user: CurrentUser | None = None) -> Producto: ...

    def crear_producto(self, data: Any, current_user: CurrentUser | None = None) -> Producto: ...

    def actualizar_producto(self, id_producto: int, data: Any, current_user: CurrentUser | None = None) -> Producto: ...

    def desactivar_producto(self, id_producto: int, current_user: CurrentUser | None = None) -> None: ...

    def listar_servicios(
        self,
        busqueda: Optional[str] = None,
        activo: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Servicio]: ...

    def obtener_servicio(self, id_servicio: int, current_user: CurrentUser | None = None) -> Servicio: ...

    def crear_servicio(self, data: Any, current_user: CurrentUser | None = None) -> Servicio: ...

    def actualizar_servicio(self, id_servicio: int, data: Any, current_user: CurrentUser | None = None) -> Servicio: ...

    def desactivar_servicio(self, id_servicio: int, current_user: CurrentUser | None = None) -> None: ...

    def listar_comodatos(
        self,
        estatus: Optional[str] = None,
        busqueda: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Comodato]: ...

    def obtener_comodato(self, id_comodato: int, current_user: CurrentUser | None = None) -> Comodato: ...

    def crear_comodato(self, data: Any, current_user: CurrentUser | None = None) -> Comodato: ...

    def actualizar_comodato(self, id_comodato: int, data: Any, current_user: CurrentUser | None = None) -> Comodato: ...

    def listar_movimientos(
        self,
        id_producto: Optional[int] = None,
        tipo_movimiento: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[MovimientoStock]: ...

    def almacen_stats(self, current_user: CurrentUser | None = None) -> dict: ...

    def ajustar_existencia(
        self,
        id_producto: int,
        stock_nuevo: int,
        motivo: str,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

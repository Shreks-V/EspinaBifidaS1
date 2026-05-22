from typing import Optional
from app.application.almacen.dtos import ProductoCreate, ServicioCreate, ComodatoCreate
from app.domain.almacen.ports import AlmacenRepository
from app.domain.shared.current_user import CurrentUser

_service: "AlmacenService | None" = None


class AlmacenService:
    def __init__(self, repository: AlmacenRepository) -> None:
        self._repository = repository

    def listar_productos(self, tipo_producto: Optional[str] = None, busqueda: Optional[str] = None, activo: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_productos(tipo_producto, busqueda, activo, current_user, limit, offset)

    def obtener_producto(self, id_producto: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_producto(id_producto, current_user)

    def crear_producto(self, data: ProductoCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_producto(data, current_user)

    def actualizar_producto(self, id_producto: int, data: ProductoCreate, current_user: CurrentUser | None = None):
        return self._repository.actualizar_producto(id_producto, data, current_user)

    def desactivar_producto(self, id_producto: int, current_user: CurrentUser | None = None):
        return self._repository.desactivar_producto(id_producto, current_user)

    def listar_servicios(self, busqueda: Optional[str] = None, activo: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_servicios(busqueda, activo, current_user, limit, offset)

    def obtener_servicio(self, id_servicio: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_servicio(id_servicio, current_user)

    def crear_servicio(self, data: ServicioCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_servicio(data, current_user)

    def actualizar_servicio(self, id_servicio: int, data: ServicioCreate, current_user: CurrentUser | None = None):
        return self._repository.actualizar_servicio(id_servicio, data, current_user)

    def desactivar_servicio(self, id_servicio: int, current_user: CurrentUser | None = None):
        return self._repository.desactivar_servicio(id_servicio, current_user)

    def listar_comodatos(self, estatus: Optional[str] = None, busqueda: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_comodatos(estatus, busqueda, current_user, limit, offset)

    def obtener_comodato(self, id_comodato: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_comodato(id_comodato, current_user)

    def crear_comodato(self, data: ComodatoCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_comodato(data, current_user)

    def actualizar_comodato(self, id_comodato: int, data: ComodatoCreate, current_user: CurrentUser | None = None):
        return self._repository.actualizar_comodato(id_comodato, data, current_user)

    def listar_movimientos(self, id_producto: Optional[int] = None, tipo_movimiento: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_movimientos(id_producto, tipo_movimiento, current_user, limit, offset)

    def almacen_stats(self, current_user: CurrentUser | None = None):
        return self._repository.almacen_stats(current_user)

    def ajustar_existencia(self, id_producto: int, stock_nuevo: int, motivo: str, current_user: CurrentUser | None = None):
        return self._repository.ajustar_existencia(id_producto, stock_nuevo, motivo, current_user)


def configure_service(service: AlmacenService) -> None:
    global _service
    _service = service


def _svc() -> AlmacenService:
    if _service is None:
        raise RuntimeError("almacen service is not configured")
    return _service


def listar_productos(tipo_producto: Optional[str] = None, busqueda: Optional[str] = None, activo: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_productos(tipo_producto, busqueda, activo, current_user, limit, offset)

def obtener_producto(id_producto: int, current_user: CurrentUser | None = None):
    return _svc().obtener_producto(id_producto, current_user)

def crear_producto(data: ProductoCreate, current_user: CurrentUser | None = None):
    return _svc().crear_producto(data, current_user)

def actualizar_producto(id_producto: int, data: ProductoCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_producto(id_producto, data, current_user)

def desactivar_producto(id_producto: int, current_user: CurrentUser | None = None):
    return _svc().desactivar_producto(id_producto, current_user)

def listar_servicios(busqueda: Optional[str] = None, activo: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_servicios(busqueda, activo, current_user, limit, offset)

def obtener_servicio(id_servicio: int, current_user: CurrentUser | None = None):
    return _svc().obtener_servicio(id_servicio, current_user)

def crear_servicio(data: ServicioCreate, current_user: CurrentUser | None = None):
    return _svc().crear_servicio(data, current_user)

def actualizar_servicio(id_servicio: int, data: ServicioCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_servicio(id_servicio, data, current_user)

def desactivar_servicio(id_servicio: int, current_user: CurrentUser | None = None):
    return _svc().desactivar_servicio(id_servicio, current_user)

def listar_comodatos(estatus: Optional[str] = None, busqueda: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_comodatos(estatus, busqueda, current_user, limit, offset)

def obtener_comodato(id_comodato: int, current_user: CurrentUser | None = None):
    return _svc().obtener_comodato(id_comodato, current_user)

def crear_comodato(data: ComodatoCreate, current_user: CurrentUser | None = None):
    return _svc().crear_comodato(data, current_user)

def actualizar_comodato(id_comodato: int, data: ComodatoCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_comodato(id_comodato, data, current_user)

def listar_movimientos(id_producto: Optional[int] = None, tipo_movimiento: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_movimientos(id_producto, tipo_movimiento, current_user, limit, offset)

def almacen_stats(current_user: CurrentUser | None = None):
    return _svc().almacen_stats(current_user)

def ajustar_existencia(id_producto: int, stock_nuevo: int, motivo: str, current_user: CurrentUser | None = None):
    return _svc().ajustar_existencia(id_producto, stock_nuevo, motivo, current_user)

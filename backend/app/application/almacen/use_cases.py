from typing import Optional
from app.schemas.schemas import ProductoCreate, ServicioCreate, ComodatoCreate
from app.domain.almacen.ports import AlmacenRepository
_repository: AlmacenRepository | None = None

def configure_repository(repository: AlmacenRepository):
    global _repository
    _repository = repository

def _get_repository() -> AlmacenRepository:
    if _repository is None:
        raise RuntimeError('almacen repository is not configured')
    return _repository

def listar_productos(tipo_producto: Optional[str]=None, busqueda: Optional[str]=None, activo: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_productos(tipo_producto, busqueda, activo, current_user, limit, offset)

def obtener_producto(id_producto: int, current_user: dict=None):
    return _get_repository().obtener_producto(id_producto, current_user)

def crear_producto(data: ProductoCreate, current_user: dict=None):
    return _get_repository().crear_producto(data, current_user)

def actualizar_producto(id_producto: int, data: ProductoCreate, current_user: dict=None):
    return _get_repository().actualizar_producto(id_producto, data, current_user)

def desactivar_producto(id_producto: int, current_user: dict=None):
    return _get_repository().desactivar_producto(id_producto, current_user)

def listar_servicios(busqueda: Optional[str]=None, activo: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_servicios(busqueda, activo, current_user, limit, offset)

def obtener_servicio(id_servicio: int, current_user: dict=None):
    return _get_repository().obtener_servicio(id_servicio, current_user)

def crear_servicio(data: ServicioCreate, current_user: dict=None):
    return _get_repository().crear_servicio(data, current_user)

def actualizar_servicio(id_servicio: int, data: ServicioCreate, current_user: dict=None):
    return _get_repository().actualizar_servicio(id_servicio, data, current_user)

def desactivar_servicio(id_servicio: int, current_user: dict=None):
    return _get_repository().desactivar_servicio(id_servicio, current_user)

def listar_comodatos(estatus: Optional[str]=None, busqueda: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_comodatos(estatus, busqueda, current_user, limit, offset)

def obtener_comodato(id_comodato: int, current_user: dict=None):
    return _get_repository().obtener_comodato(id_comodato, current_user)

def crear_comodato(data: ComodatoCreate, current_user: dict=None):
    return _get_repository().crear_comodato(data, current_user)

def actualizar_comodato(id_comodato: int, data: ComodatoCreate, current_user: dict=None):
    return _get_repository().actualizar_comodato(id_comodato, data, current_user)

def listar_movimientos(id_producto: Optional[int]=None, tipo_movimiento: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_movimientos(id_producto, tipo_movimiento, current_user, limit, offset)

def almacen_stats(current_user: dict=None):
    return _get_repository().almacen_stats(current_user)

def ajustar_existencia(id_producto: int, stock_nuevo: int, motivo: str, current_user: dict=None):
    return _get_repository().ajustar_existencia(id_producto, stock_nuevo, motivo, current_user)

from typing import Optional
from app.schemas.schemas import VentaCreate
from app.domain.recibos.ports import RecibosRepository
_repository: RecibosRepository | None = None

def configure_repository(repository: RecibosRepository):
    global _repository
    _repository = repository

def _get_repository() -> RecibosRepository:
    if _repository is None:
        raise RuntimeError('recibos repository is not configured')
    return _repository

def stats_ventas(current_user: dict=None):
    return _get_repository().stats_ventas(current_user)

def listar_metodos_pago(current_user: dict=None):
    return _get_repository().listar_metodos_pago(current_user)

def listar_ventas(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, id_paciente: Optional[int]=None, search: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset)

def crear_venta(data: VentaCreate, current_user: dict=None):
    return _get_repository().crear_venta(data, current_user)

def obtener_venta(id_venta: int, current_user: dict=None):
    return _get_repository().obtener_venta(id_venta, current_user)

def cancelar_venta(id_venta: int, motivo: Optional[str]=None, current_user: dict=None):
    return _get_repository().cancelar_venta(id_venta, motivo, current_user)

def registrar_pago(id_venta: int, id_metodo_pago: int, monto: float, current_user: dict=None):
    return _get_repository().registrar_pago(id_venta, id_metodo_pago, monto, current_user)

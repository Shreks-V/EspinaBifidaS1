from typing import Optional
from app.application.recibos.dtos import VentaCreate
from app.domain.recibos.ports import RecibosRepository
from app.domain.shared.current_user import CurrentUser

_service: "RecibosService | None" = None


class RecibosService:
    def __init__(self, repository: RecibosRepository) -> None:
        self._repository = repository

    def stats_ventas(self, current_user: CurrentUser | None = None):
        return self._repository.stats_ventas(current_user)

    def listar_metodos_pago(self, current_user: CurrentUser | None = None):
        return self._repository.listar_metodos_pago(current_user)

    def listar_ventas(self, fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, id_paciente: Optional[int] = None, search: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset)

    def crear_venta(self, data: VentaCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_venta(data, current_user)

    def obtener_venta(self, id_venta: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_venta(id_venta, current_user)

    def cancelar_venta(self, id_venta: int, motivo: Optional[str] = None, current_user: CurrentUser | None = None):
        return self._repository.cancelar_venta(id_venta, motivo, current_user)

    def registrar_pago(self, id_venta: int, id_metodo_pago: int, monto: float, current_user: CurrentUser | None = None):
        return self._repository.registrar_pago(id_venta, id_metodo_pago, monto, current_user)

    def listar_items_venta(self, id_venta: int, current_user: CurrentUser | None = None):
        return self._repository.listar_items_venta(id_venta, current_user)


def configure_service(service: RecibosService) -> None:
    global _service
    _service = service


def _svc() -> RecibosService:
    if _service is None:
        raise RuntimeError("recibos service is not configured")
    return _service


def stats_ventas(current_user: CurrentUser | None = None):
    return _svc().stats_ventas(current_user)

def listar_metodos_pago(current_user: CurrentUser | None = None):
    return _svc().listar_metodos_pago(current_user)

def listar_ventas(fecha_inicio: Optional[str] = None, fecha_fin: Optional[str] = None, id_paciente: Optional[int] = None, search: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset)

def crear_venta(data: VentaCreate, current_user: CurrentUser | None = None):
    return _svc().crear_venta(data, current_user)

def obtener_venta(id_venta: int, current_user: CurrentUser | None = None):
    return _svc().obtener_venta(id_venta, current_user)

def cancelar_venta(id_venta: int, motivo: Optional[str] = None, current_user: CurrentUser | None = None):
    return _svc().cancelar_venta(id_venta, motivo, current_user)

def registrar_pago(id_venta: int, id_metodo_pago: int, monto: float, current_user: CurrentUser | None = None):
    return _svc().registrar_pago(id_venta, id_metodo_pago, monto, current_user)

def listar_items_venta(id_venta: int, current_user: CurrentUser | None = None):
    return _svc().listar_items_venta(id_venta, current_user)

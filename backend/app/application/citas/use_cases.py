from typing import Optional
from app.schemas.schemas import CitaCreate
from app.domain.citas.ports import CitasRepository
_repository: CitasRepository | None = None

def configure_repository(repository: CitasRepository):
    global _repository
    _repository = repository

def _get_repository() -> CitasRepository:
    if _repository is None:
        raise RuntimeError('citas repository is not configured')
    return _repository

def citas_stats(current_user: dict=None):
    return _get_repository().citas_stats(current_user)

def citas_hoy(current_user: dict=None):
    return _get_repository().citas_hoy(current_user)

def listar_citas(fecha: Optional[str]=None, estatus: Optional[str]=None, id_paciente: Optional[int]=None, busqueda: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_citas(fecha, estatus, id_paciente, busqueda, current_user, limit, offset)

def obtener_cita(id_cita: int, current_user: dict=None):
    return _get_repository().obtener_cita(id_cita, current_user)

def crear_cita(data: CitaCreate, current_user: dict=None):
    return _get_repository().crear_cita(data, current_user)

def actualizar_cita(id_cita: int, data: CitaCreate, current_user: dict=None):
    return _get_repository().actualizar_cita(id_cita, data, current_user)

def completar_cita(id_cita: int, current_user: dict=None):
    return _get_repository().completar_cita(id_cita, current_user)

def cancelar_cita(id_cita: int, current_user: dict=None):
    return _get_repository().cancelar_cita(id_cita, current_user)

def eliminar_cita(id_cita: int, current_user: dict=None):
    return _get_repository().eliminar_cita(id_cita, current_user)

def citas_proximas(dias: int = 7, current_user: dict = None):
    return _get_repository().citas_proximas(dias, current_user)

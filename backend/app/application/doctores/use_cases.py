from app.schemas.schemas import DoctorCreate, DisponibilidadCreate
from app.domain.doctores.ports import DoctoresRepository
_repository: DoctoresRepository | None = None

def configure_repository(repository: DoctoresRepository):
    global _repository
    _repository = repository

def _get_repository() -> DoctoresRepository:
    if _repository is None:
        raise RuntimeError('doctores repository is not configured')
    return _repository

def doctor_del_dia(current_user: dict=None):
    return _get_repository().doctor_del_dia(current_user)

def listar_doctores(current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_doctores(current_user, limit, offset)

def obtener_disponibilidad_semana(current_user: dict=None, limit: int=500, offset: int=0):
    return _get_repository().obtener_disponibilidad_semana(current_user, limit, offset)

def obtener_doctor(id_doctor: int, current_user: dict=None):
    return _get_repository().obtener_doctor(id_doctor, current_user)

def crear_doctor(data: DoctorCreate, current_user: dict=None):
    return _get_repository().crear_doctor(data, current_user)

def actualizar_doctor(id_doctor: int, data: DoctorCreate, current_user: dict=None):
    return _get_repository().actualizar_doctor(id_doctor, data, current_user)

def desactivar_doctor(id_doctor: int, current_user: dict=None):
    return _get_repository().desactivar_doctor(id_doctor, current_user)

def obtener_disponibilidad(id_doctor: int, current_user: dict=None, limit: int=500, offset: int=0):
    return _get_repository().obtener_disponibilidad(id_doctor, current_user, limit, offset)

def crear_disponibilidad(id_doctor: int, data: DisponibilidadCreate, current_user: dict=None):
    return _get_repository().crear_disponibilidad(id_doctor, data, current_user)

def eliminar_disponibilidad(id_doctor: int, id_disponibilidad: int, current_user: dict=None):
    return _get_repository().eliminar_disponibilidad(id_doctor, id_disponibilidad, current_user)

def obtener_servicios_doctor(id_doctor: int, current_user: dict=None):
    return _get_repository().obtener_servicios_doctor(id_doctor, current_user)

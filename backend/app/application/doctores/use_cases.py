from app.application.doctores.dtos import DoctorCreate, DisponibilidadCreate, DisponibilidadEspecialCreate
from app.domain.doctores.ports import DoctoresRepository
from app.domain.shared.current_user import CurrentUser

_service: "DoctoresService | None" = None


class DoctoresService:
    def __init__(self, repository: DoctoresRepository) -> None:
        self._repository = repository

    def doctor_del_dia(self, current_user: CurrentUser | None = None):
        return self._repository.doctor_del_dia(current_user)

    def listar_doctores(self, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_doctores(current_user, limit, offset)

    def obtener_disponibilidad_semana(self, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
        return self._repository.obtener_disponibilidad_semana(current_user, limit, offset)

    def obtener_doctor(self, id_doctor: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_doctor(id_doctor, current_user)

    def crear_doctor(self, data: DoctorCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_doctor(data, current_user)

    def actualizar_doctor(self, id_doctor: int, data: DoctorCreate, current_user: CurrentUser | None = None):
        return self._repository.actualizar_doctor(id_doctor, data, current_user)

    def desactivar_doctor(self, id_doctor: int, current_user: CurrentUser | None = None):
        return self._repository.desactivar_doctor(id_doctor, current_user)

    def obtener_disponibilidad(self, id_doctor: int, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
        return self._repository.obtener_disponibilidad(id_doctor, current_user, limit, offset)

    def crear_disponibilidad(self, id_doctor: int, data: DisponibilidadCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_disponibilidad(id_doctor, data, current_user)

    def eliminar_disponibilidad(self, id_doctor: int, id_disponibilidad: int, current_user: CurrentUser | None = None):
        return self._repository.eliminar_disponibilidad(id_doctor, id_disponibilidad, current_user)

    def obtener_servicios_doctor(self, id_doctor: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_servicios_doctor(id_doctor, current_user)

    def listar_disponibilidad_especial(self, id_doctor: int, current_user: CurrentUser | None = None):
        return self._repository.listar_disponibilidad_especial(id_doctor, current_user)

    def crear_disponibilidad_especial(self, id_doctor: int, data: DisponibilidadEspecialCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_disponibilidad_especial(id_doctor, data, current_user)

    def eliminar_disponibilidad_especial(self, id_doctor: int, id_disp_especial: int, current_user: CurrentUser | None = None):
        return self._repository.eliminar_disponibilidad_especial(id_doctor, id_disp_especial, current_user)


def configure_service(service: DoctoresService) -> None:
    global _service
    _service = service


def _svc() -> DoctoresService:
    if _service is None:
        raise RuntimeError("doctores service is not configured")
    return _service


def doctor_del_dia(current_user: CurrentUser | None = None):
    return _svc().doctor_del_dia(current_user)

def listar_doctores(current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_doctores(current_user, limit, offset)

def obtener_disponibilidad_semana(current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
    return _svc().obtener_disponibilidad_semana(current_user, limit, offset)

def obtener_doctor(id_doctor: int, current_user: CurrentUser | None = None):
    return _svc().obtener_doctor(id_doctor, current_user)

def crear_doctor(data: DoctorCreate, current_user: CurrentUser | None = None):
    return _svc().crear_doctor(data, current_user)

def actualizar_doctor(id_doctor: int, data: DoctorCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_doctor(id_doctor, data, current_user)

def desactivar_doctor(id_doctor: int, current_user: CurrentUser | None = None):
    return _svc().desactivar_doctor(id_doctor, current_user)

def obtener_disponibilidad(id_doctor: int, current_user: CurrentUser | None = None, limit: int = 500, offset: int = 0):
    return _svc().obtener_disponibilidad(id_doctor, current_user, limit, offset)

def crear_disponibilidad(id_doctor: int, data: DisponibilidadCreate, current_user: CurrentUser | None = None):
    return _svc().crear_disponibilidad(id_doctor, data, current_user)

def eliminar_disponibilidad(id_doctor: int, id_disponibilidad: int, current_user: CurrentUser | None = None):
    return _svc().eliminar_disponibilidad(id_doctor, id_disponibilidad, current_user)

def obtener_servicios_doctor(id_doctor: int, current_user: CurrentUser | None = None):
    return _svc().obtener_servicios_doctor(id_doctor, current_user)

def listar_disponibilidad_especial(id_doctor: int, current_user: CurrentUser | None = None):
    return _svc().listar_disponibilidad_especial(id_doctor, current_user)

def crear_disponibilidad_especial(id_doctor: int, data: DisponibilidadEspecialCreate, current_user: CurrentUser | None = None):
    return _svc().crear_disponibilidad_especial(id_doctor, data, current_user)

def eliminar_disponibilidad_especial(id_doctor: int, id_disp_especial: int, current_user: CurrentUser | None = None):
    return _svc().eliminar_disponibilidad_especial(id_doctor, id_disp_especial, current_user)

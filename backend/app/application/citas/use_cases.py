from typing import Optional
from app.application.citas.dtos import CitaCreate
from app.domain.citas.ports import CitasRepository
from app.domain.shared.current_user import CurrentUser

_service: "CitasService | None" = None


class CitasService:
    def __init__(self, repository: CitasRepository) -> None:
        self._repository = repository

    def citas_stats(self, current_user: CurrentUser | None = None):
        return self._repository.citas_stats(current_user)

    def citas_hoy(self, current_user: CurrentUser | None = None):
        return self._repository.citas_hoy(current_user)

    def listar_citas(self, fecha: Optional[str] = None, estatus: Optional[str] = None, id_paciente: Optional[int] = None, busqueda: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_citas(fecha, estatus, id_paciente, busqueda, current_user, limit, offset)

    def obtener_cita(self, id_cita: int, current_user: CurrentUser | None = None):
        return self._repository.obtener_cita(id_cita, current_user)

    def crear_cita(self, data: CitaCreate, current_user: CurrentUser | None = None):
        return self._repository.crear_cita(data, current_user)

    def actualizar_cita(self, id_cita: int, data: CitaCreate, current_user: CurrentUser | None = None):
        return self._repository.actualizar_cita(id_cita, data, current_user)

    def iniciar_cita(self, id_cita: int, current_user: CurrentUser | None = None):
        return self._repository.iniciar_cita(id_cita, current_user)

    def completar_cita(self, id_cita: int, current_user: CurrentUser | None = None):
        return self._repository.completar_cita(id_cita, current_user)

    def cancelar_cita(self, id_cita: int, current_user: CurrentUser | None = None):
        return self._repository.cancelar_cita(id_cita, current_user)

    def eliminar_cita(self, id_cita: int, current_user: CurrentUser | None = None):
        return self._repository.eliminar_cita(id_cita, current_user)

    def citas_proximas(self, dias: int = 7, current_user: CurrentUser | None = None):
        return self._repository.citas_proximas(dias, current_user)


def configure_service(service: CitasService) -> None:
    global _service
    _service = service


def _svc() -> CitasService:
    if _service is None:
        raise RuntimeError("citas service is not configured")
    return _service


def citas_stats(current_user: CurrentUser | None = None):
    return _svc().citas_stats(current_user)

def citas_hoy(current_user: CurrentUser | None = None):
    return _svc().citas_hoy(current_user)

def listar_citas(fecha: Optional[str] = None, estatus: Optional[str] = None, id_paciente: Optional[int] = None, busqueda: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_citas(fecha, estatus, id_paciente, busqueda, current_user, limit, offset)

def obtener_cita(id_cita: int, current_user: CurrentUser | None = None):
    return _svc().obtener_cita(id_cita, current_user)

def crear_cita(data: CitaCreate, current_user: CurrentUser | None = None):
    return _svc().crear_cita(data, current_user)

def actualizar_cita(id_cita: int, data: CitaCreate, current_user: CurrentUser | None = None):
    return _svc().actualizar_cita(id_cita, data, current_user)

def iniciar_cita(id_cita: int, current_user: CurrentUser | None = None):
    return _svc().iniciar_cita(id_cita, current_user)

def completar_cita(id_cita: int, current_user: CurrentUser | None = None):
    return _svc().completar_cita(id_cita, current_user)

def cancelar_cita(id_cita: int, current_user: CurrentUser | None = None):
    return _svc().cancelar_cita(id_cita, current_user)

def eliminar_cita(id_cita: int, current_user: CurrentUser | None = None):
    return _svc().eliminar_cita(id_cita, current_user)

def citas_proximas(dias: int = 7, current_user: CurrentUser | None = None):
    return _svc().citas_proximas(dias, current_user)

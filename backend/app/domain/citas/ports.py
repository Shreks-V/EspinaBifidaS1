from typing import Any, Optional, Protocol

from app.domain.citas.entities import Cita
from app.domain.shared.current_user import CurrentUser


class CitasRepository(Protocol):
    def citas_stats(self, current_user: CurrentUser | None = None) -> dict: ...

    def citas_hoy(self, current_user: CurrentUser | None = None) -> list[Cita]: ...

    def listar_citas(
        self,
        fecha: Optional[str] = None,
        estatus: Optional[str] = None,
        id_paciente: Optional[int] = None,
        busqueda: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Cita]: ...

    def obtener_cita(self, id_cita: int, current_user: CurrentUser | None = None) -> Cita: ...

    def crear_cita(self, data: Any, current_user: CurrentUser | None = None) -> Cita: ...

    def actualizar_cita(self, id_cita: int, data: Any, current_user: CurrentUser | None = None) -> Cita: ...

    def iniciar_cita(self, id_cita: int, current_user: CurrentUser | None = None) -> Cita: ...

    def completar_cita(self, id_cita: int, current_user: CurrentUser | None = None) -> Cita: ...

    def cancelar_cita(self, id_cita: int, current_user: CurrentUser | None = None) -> Cita: ...

    def eliminar_cita(self, id_cita: int, current_user: CurrentUser | None = None) -> None: ...

    def citas_proximas(self, dias: int = 7, current_user: CurrentUser | None = None) -> list[Cita]: ...

from typing import Any, Optional, Protocol

from app.domain.preregistro.entities import DocumentoPaciente, Preregistro, UploadedFile
from app.domain.shared.current_user import CurrentUser


class PreregistroRepository(Protocol):
    def listar_preregistros(
        self,
        estatus: Optional[str] = None,
        current_user: CurrentUser | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Preregistro]: ...

    def crear_preregistro(self, data: Any) -> Preregistro: ...

    def listar_tipos_espina_publico(self) -> list[dict]: ...

    def listar_tipos_documento_publico(self) -> list[dict]: ...

    def obtener_preregistro(self, id_paciente: int) -> Preregistro: ...

    def actualizar_preregistro(self, id_paciente: int, data: Any) -> Preregistro: ...

    def aprobar_preregistro(
        self,
        id_paciente: int,
        tipo_cuota: Optional[str] = None,
        current_user: CurrentUser | None = None,
    ) -> dict: ...

    async def subir_documento(
        self,
        id_paciente: int,
        id_tipo_documento: int,
        archivo: UploadedFile,
        current_user: CurrentUser | None = None,
    ) -> DocumentoPaciente: ...

    def listar_documentos(self, id_paciente: int, limit: int = 100, offset: int = 0) -> list[DocumentoPaciente]: ...

    def obtener_documento_archivo(self, id_paciente: int, id_documento: int) -> dict: ...

    def eliminar_documento(self, id_paciente: int, id_documento: int) -> None: ...

    def rechazar_preregistro(self, id_paciente: int, current_user: CurrentUser | None = None) -> dict: ...

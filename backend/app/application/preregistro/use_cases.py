from typing import Optional
from app.application.preregistro.dtos import PreRegistroCreate
from app.domain.preregistro.entities import UploadedFile
from app.domain.preregistro.ports import PreregistroRepository
from app.domain.shared.current_user import CurrentUser

_service: "PreregistroService | None" = None


class PreregistroService:
    def __init__(self, repository: PreregistroRepository) -> None:
        self._repository = repository

    def listar_preregistros(self, estatus: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
        return self._repository.listar_preregistros(estatus, current_user, limit, offset)

    def crear_preregistro(self, data: PreRegistroCreate):
        return self._repository.crear_preregistro(data)

    def listar_tipos_espina_publico(self):
        return self._repository.listar_tipos_espina_publico()

    def listar_tipos_documento_publico(self):
        return self._repository.listar_tipos_documento_publico()

    def obtener_preregistro(self, id_paciente: int):
        return self._repository.obtener_preregistro(id_paciente)

    def actualizar_preregistro(self, id_paciente: int, data: PreRegistroCreate):
        return self._repository.actualizar_preregistro(id_paciente, data)

    def aprobar_preregistro(self, id_paciente: int, tipo_cuota: str = None, current_user: CurrentUser | None = None):
        return self._repository.aprobar_preregistro(id_paciente, tipo_cuota, current_user)

    async def subir_documento(self, id_paciente: int, id_tipo_documento: int, filename: str, content: bytes, content_type: str, current_user: CurrentUser | None = None):
        archivo = UploadedFile(filename=filename, content=content, content_type=content_type)
        return await self._repository.subir_documento(id_paciente, id_tipo_documento, archivo, current_user)

    def listar_documentos(self, id_paciente: int, limit: int = 100, offset: int = 0):
        return self._repository.listar_documentos(id_paciente, limit, offset)

    def obtener_documento_archivo(self, id_paciente: int, id_documento: int):
        return self._repository.obtener_documento_archivo(id_paciente, id_documento)

    def eliminar_documento(self, id_paciente: int, id_documento: int):
        return self._repository.eliminar_documento(id_paciente, id_documento)

    def rechazar_preregistro(self, id_paciente: int, current_user: CurrentUser | None = None):
        return self._repository.rechazar_preregistro(id_paciente, current_user)


def configure_service(service: PreregistroService) -> None:
    global _service
    _service = service


def _svc() -> PreregistroService:
    if _service is None:
        raise RuntimeError("preregistro service is not configured")
    return _service


def listar_preregistros(estatus: Optional[str] = None, current_user: CurrentUser | None = None, limit: int = 100, offset: int = 0):
    return _svc().listar_preregistros(estatus, current_user, limit, offset)

def crear_preregistro(data: PreRegistroCreate):
    return _svc().crear_preregistro(data)

def listar_tipos_espina_publico():
    return _svc().listar_tipos_espina_publico()

def listar_tipos_documento_publico():
    return _svc().listar_tipos_documento_publico()

def obtener_preregistro(id_paciente: int):
    return _svc().obtener_preregistro(id_paciente)

def actualizar_preregistro(id_paciente: int, data: PreRegistroCreate):
    return _svc().actualizar_preregistro(id_paciente, data)

def aprobar_preregistro(id_paciente: int, tipo_cuota: str = None, current_user: CurrentUser | None = None):
    return _svc().aprobar_preregistro(id_paciente, tipo_cuota, current_user)

async def subir_documento(id_paciente: int, id_tipo_documento: int, filename: str, content: bytes, content_type: str, current_user: CurrentUser | None = None):
    return await _svc().subir_documento(id_paciente, id_tipo_documento, filename, content, content_type, current_user)

def listar_documentos(id_paciente: int, limit: int = 100, offset: int = 0):
    return _svc().listar_documentos(id_paciente, limit, offset)

def obtener_documento_archivo(id_paciente: int, id_documento: int):
    return _svc().obtener_documento_archivo(id_paciente, id_documento)

def eliminar_documento(id_paciente: int, id_documento: int):
    return _svc().eliminar_documento(id_paciente, id_documento)

def rechazar_preregistro(id_paciente: int, current_user: CurrentUser | None = None):
    return _svc().rechazar_preregistro(id_paciente, current_user)

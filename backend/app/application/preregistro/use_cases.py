from fastapi import UploadFile
from typing import Optional
from app.schemas.schemas import PreRegistroCreate
from app.domain.preregistro.ports import PreregistroRepository
_repository: PreregistroRepository | None = None

def configure_repository(repository: PreregistroRepository):
    global _repository
    _repository = repository

def _get_repository() -> PreregistroRepository:
    if _repository is None:
        raise RuntimeError('preregistro repository is not configured')
    return _repository

def listar_preregistros(estatus: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    return _get_repository().listar_preregistros(estatus, current_user, limit, offset)

def crear_preregistro(data: PreRegistroCreate):
    return _get_repository().crear_preregistro(data)

def listar_tipos_espina_publico():
    return _get_repository().listar_tipos_espina_publico()

def listar_tipos_documento_publico():
    return _get_repository().listar_tipos_documento_publico()

def obtener_preregistro(id_paciente: int):
    return _get_repository().obtener_preregistro(id_paciente)

def actualizar_preregistro(id_paciente: int, data: PreRegistroCreate):
    return _get_repository().actualizar_preregistro(id_paciente, data)

def aprobar_preregistro(id_paciente: int, tipo_cuota: str = None, current_user: dict = None):
    return _get_repository().aprobar_preregistro(id_paciente, tipo_cuota, current_user)

async def subir_documento(
    id_paciente: int,
    id_tipo_documento: int = ...,
    archivo: UploadFile = ...,
    current_user: dict | None = None,
):
    return await _get_repository().subir_documento(
        id_paciente,
        id_tipo_documento,
        archivo,
        current_user,
    )

def listar_documentos(id_paciente: int, limit: int=100, offset: int=0):
    return _get_repository().listar_documentos(id_paciente, limit, offset)

def obtener_documento_archivo(id_paciente: int, id_documento: int):
    return _get_repository().obtener_documento_archivo(id_paciente, id_documento)

def eliminar_documento(id_paciente: int, id_documento: int):
    return _get_repository().eliminar_documento(id_paciente, id_documento)

def rechazar_preregistro(id_paciente: int, current_user: dict=None):
    return _get_repository().rechazar_preregistro(id_paciente, current_user)

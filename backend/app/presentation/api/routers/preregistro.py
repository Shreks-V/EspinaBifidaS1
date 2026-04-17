from fastapi import APIRouter, Query, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
from app.schemas.schemas import PreRegistroCreate, AprobarPreRegistroData
from app.application.preregistro import use_cases as service
from app.presentation.api.security import (
    ensure_preregistro_access,
    get_current_user,
    get_optional_current_user,
    issue_preregistro_token,
)
router = APIRouter()

@router.get('')
def listar_preregistros(
    estatus: Optional[str]=Query(None, max_length=40),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.listar_preregistros(estatus, current_user, limit, offset)

@router.post('', status_code=201)
def crear_preregistro(data: PreRegistroCreate):
    preregistro = service.crear_preregistro(data)
    id_paciente = preregistro.get('id_paciente')
    if id_paciente is not None:
        preregistro['preregistro_token'] = issue_preregistro_token(int(id_paciente))
    return preregistro

@router.get('/tipos-espina')
def listar_tipos_espina_publico():
    return service.listar_tipos_espina_publico()

@router.get('/tipos-documento')
def listar_tipos_documento_publico():
    return service.listar_tipos_documento_publico()

@router.get('/{id_paciente}')
def obtener_preregistro(id_paciente: int, _access=Depends(ensure_preregistro_access)):
    return service.obtener_preregistro(id_paciente)

@router.put('/{id_paciente}')
def actualizar_preregistro(id_paciente: int, data: PreRegistroCreate, _access=Depends(ensure_preregistro_access)):
    return service.actualizar_preregistro(id_paciente, data)

@router.post('/{id_paciente}/aprobar')
def aprobar_preregistro(id_paciente: int, body: AprobarPreRegistroData = None, current_user: dict=Depends(get_current_user)):
    tipo_cuota = body.tipo_cuota if body else None
    return service.aprobar_preregistro(id_paciente, tipo_cuota, current_user)

@router.post('/{id_paciente}/documentos')
async def subir_documento(
    id_paciente: int,
    id_tipo_documento: int = Form(...),
    archivo: UploadFile = File(...),
    _access=Depends(ensure_preregistro_access),
    current_user: dict | None = Depends(get_optional_current_user),
):
    return await service.subir_documento(id_paciente, id_tipo_documento, archivo, current_user)

@router.get('/{id_paciente}/documentos')
def listar_documentos(
    id_paciente: int,
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    _access=Depends(ensure_preregistro_access),
):
    return service.listar_documentos(id_paciente, limit, offset)

@router.get('/{id_paciente}/documentos/{id_documento}/archivo')
def obtener_documento_archivo(id_paciente: int, id_documento: int, _access=Depends(ensure_preregistro_access)):
    archivo = service.obtener_documento_archivo(id_paciente, id_documento)
    return FileResponse(path=archivo['file_path'], media_type=archivo['content_type'])

@router.delete('/{id_paciente}/documentos/{id_documento}')
def eliminar_documento(id_paciente: int, id_documento: int, _access=Depends(ensure_preregistro_access)):
    return service.eliminar_documento(id_paciente, id_documento)

@router.post('/{id_paciente}/rechazar')
def rechazar_preregistro(id_paciente: int, current_user: dict=Depends(get_current_user)):
    return service.rechazar_preregistro(id_paciente, current_user)

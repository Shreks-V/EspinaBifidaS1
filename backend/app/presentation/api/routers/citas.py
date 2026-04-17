from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.schemas.schemas import CitaCreate
from app.application.citas import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/stats')
def citas_stats(current_user: dict=Depends(get_current_user)):
    return service.citas_stats(current_user)

@router.get('/hoy')
def citas_hoy(current_user: dict=Depends(get_current_user)):
    return service.citas_hoy(current_user)

@router.get('')
def listar_citas(
    fecha: Optional[str]=Query(None),
    estatus: Optional[str]=Query(None),
    id_paciente: Optional[int]=Query(None, ge=1),
    busqueda: Optional[str]=Query(None, max_length=120),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.listar_citas(fecha, estatus, id_paciente, busqueda, current_user, limit, offset)

@router.get('/{id_cita}')
def obtener_cita(id_cita: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_cita(id_cita, current_user)

@router.post('', status_code=201)
def crear_cita(data: CitaCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.crear_cita(data, current_user)

@router.put('/{id_cita}')
def actualizar_cita(id_cita: int, data: CitaCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.actualizar_cita(id_cita, data, current_user)

@router.put('/{id_cita}/completar')
def completar_cita(id_cita: int, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.completar_cita(id_cita, current_user)

@router.put('/{id_cita}/cancelar')
def cancelar_cita(id_cita: int, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.cancelar_cita(id_cita, current_user)

@router.delete('/{id_cita}')
def eliminar_cita(id_cita: int, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.eliminar_cita(id_cita, current_user)

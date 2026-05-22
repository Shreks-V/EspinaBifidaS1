from fastapi import APIRouter, Depends, Query
from app.application.doctores.dtos import DoctorCreate, DisponibilidadCreate, DisponibilidadEspecialCreate
from app.application.doctores import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/hoy')
def doctor_del_dia(current_user: dict=Depends(get_current_user)):
    return service.doctor_del_dia(current_user)

@router.get('')
def listar_doctores(
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.listar_doctores(current_user, limit, offset)

@router.get('/disponibilidad/semana')
def obtener_disponibilidad_semana(
    limit: int=Query(500, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.obtener_disponibilidad_semana(current_user, limit, offset)

@router.get('/{id_doctor}')
def obtener_doctor(id_doctor: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_doctor(id_doctor, current_user)

@router.post('', status_code=201)
def crear_doctor(data: DoctorCreate, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.crear_doctor(data, current_user)

@router.put('/{id_doctor}')
def actualizar_doctor(id_doctor: int, data: DoctorCreate, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.actualizar_doctor(id_doctor, data, current_user)

@router.delete('/{id_doctor}')
def desactivar_doctor(id_doctor: int, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.desactivar_doctor(id_doctor, current_user)

@router.get('/{id_doctor}/disponibilidad')
def obtener_disponibilidad(
    id_doctor: int,
    limit: int=Query(500, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.obtener_disponibilidad(id_doctor, current_user, limit, offset)

@router.post('/{id_doctor}/disponibilidad', status_code=201)
def crear_disponibilidad(id_doctor: int, data: DisponibilidadCreate, current_user: dict=Depends(get_current_user)):
    return service.crear_disponibilidad(id_doctor, data, current_user)

@router.delete('/{id_doctor}/disponibilidad/{id_disponibilidad}')
def eliminar_disponibilidad(id_doctor: int, id_disponibilidad: int, current_user: dict=Depends(get_current_user)):
    return service.eliminar_disponibilidad(id_doctor, id_disponibilidad, current_user)

@router.get('/{id_doctor}/servicios')
def obtener_servicios_doctor(id_doctor: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_servicios_doctor(id_doctor, current_user)

@router.get('/{id_doctor}/disponibilidad-especial')
def listar_disponibilidad_especial(id_doctor: int, current_user: dict=Depends(get_current_user)):
    return service.listar_disponibilidad_especial(id_doctor, current_user)

@router.post('/{id_doctor}/disponibilidad-especial', status_code=201)
def crear_disponibilidad_especial(id_doctor: int, data: DisponibilidadEspecialCreate, current_user: dict=Depends(get_current_user)):
    return service.crear_disponibilidad_especial(id_doctor, data, current_user)

@router.delete('/{id_doctor}/disponibilidad-especial/{id_disp_especial}')
def eliminar_disponibilidad_especial(id_doctor: int, id_disp_especial: int, current_user: dict=Depends(get_current_user)):
    return service.eliminar_disponibilidad_especial(id_doctor, id_disp_especial, current_user)

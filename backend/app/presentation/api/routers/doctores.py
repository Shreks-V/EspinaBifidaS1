from fastapi import APIRouter, Depends, Query
from app.application.doctores import use_cases as service
from app.presentation.api.security import get_current_user

router = APIRouter()

# Sprint 1: lectura de doctores para el dashboard (hoy), la vista de citas
# (lista, disponibilidad semanal, servicios por doctor).
# CRUD de doctores y gestión de disponibilidad corresponden a sprints posteriores.

@router.get('/hoy')
def doctor_del_dia(current_user: dict = Depends(get_current_user)):
    return service.doctor_del_dia(current_user)

@router.get('/disponibilidad/semana')
def obtener_disponibilidad_semana(
    limit: int = Query(500, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    return service.obtener_disponibilidad_semana(current_user, limit, offset)

@router.get('')
def listar_doctores(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    return service.listar_doctores(current_user, limit, offset)

@router.get('/{id_doctor}')
def obtener_doctor(id_doctor: int, current_user: dict = Depends(get_current_user)):
    return service.obtener_doctor(id_doctor, current_user)

@router.get('/{id_doctor}/disponibilidad')
def obtener_disponibilidad(
    id_doctor: int,
    limit: int = Query(500, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    return service.obtener_disponibilidad(id_doctor, current_user, limit, offset)

@router.get('/{id_doctor}/servicios')
def obtener_servicios_doctor(id_doctor: int, current_user: dict = Depends(get_current_user)):
    return service.obtener_servicios_doctor(id_doctor, current_user)

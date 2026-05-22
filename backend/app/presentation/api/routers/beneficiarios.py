from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.application.beneficiarios.dtos import BeneficiarioCreate, RenovarMembresiaCreate
from app.presentation.api.schemas import BeneficiarioResponse
from app.application.beneficiarios import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/tipos-espina')
def listar_tipos_espina(current_user: dict=Depends(get_current_user)):
    return service.listar_tipos_espina(current_user)

@router.get('/stats')
def stats_beneficiarios(current_user: dict=Depends(get_current_user)):
    return service.stats_beneficiarios(current_user)

@router.get('/stats/dashboard')
def dashboard_stats(current_user: dict=Depends(get_current_user)):
    return service.dashboard_stats(current_user)

@router.get('', response_model=list[BeneficiarioResponse])
def listar_beneficiarios(
    nombre: Optional[str]=Query(None, max_length=120),
    estado: Optional[str]=Query(None, max_length=40),
    genero: Optional[str]=Query(None, max_length=40),
    busqueda: Optional[str]=Query(None, max_length=120),
    membresia_estatus: Optional[str]=Query(None, max_length=40),
    tipo_cuota: Optional[str]=Query(None, max_length=10),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.listar_beneficiarios(nombre, estado, genero, busqueda, membresia_estatus, tipo_cuota, current_user, limit, offset)

@router.get('/{folio}', response_model=BeneficiarioResponse)
def obtener_beneficiario(folio: str, current_user: dict=Depends(get_current_user)):
    return service.obtener_beneficiario(folio, current_user)

@router.post('', status_code=201, response_model=BeneficiarioResponse)
def crear_beneficiario(data: BeneficiarioCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.crear_beneficiario(data, current_user)

@router.put('/{folio}', response_model=BeneficiarioResponse)
def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.actualizar_beneficiario(folio, data, current_user)

@router.delete('/{folio}', status_code=200)
def eliminar_beneficiario(folio: str, current_user: dict=Depends(require_role('ADMINISTRADOR'))):
    return service.eliminar_beneficiario(folio, current_user)

@router.get('/{folio}/historial')
def historial_beneficiario(
    folio: str,
    limit_citas: int=Query(100, ge=1, le=500),
    offset_citas: int=Query(0, ge=0),
    limit_pagos: int=Query(100, ge=1, le=500),
    offset_pagos: int=Query(0, ge=0),
    limit_comodatos: int=Query(100, ge=1, le=500),
    offset_comodatos: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.historial_beneficiario(
        folio,
        current_user,
        limit_citas,
        offset_citas,
        limit_pagos,
        offset_pagos,
        limit_comodatos,
        offset_comodatos,
    )

@router.get('/membresias/proximas-a-vencer')
def membresias_proximas_a_vencer(
    dias: int=Query(30, ge=1, le=365),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.listar_membresias_proximas_a_vencer(dias, current_user, limit, offset)

@router.post('/{folio}/renovar-membresia', status_code=200)
def renovar_membresia(folio: str, data: RenovarMembresiaCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.renovar_membresia(folio, data, current_user)

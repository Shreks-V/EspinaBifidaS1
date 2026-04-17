from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.schemas.schemas import VentaCreate, PagoParcialCreate
from app.application.recibos import use_cases as service
from app.presentation.api.security import get_current_user, require_role
router = APIRouter()

@router.get('/stats')
def stats_ventas(current_user: dict=Depends(get_current_user)):
    return service.stats_ventas(current_user)

@router.get('/metodos-pago')
def listar_metodos_pago(current_user: dict=Depends(get_current_user)):
    return service.listar_metodos_pago(current_user)

@router.get('')
def listar_ventas(
    fecha_inicio: Optional[str]=Query(None),
    fecha_fin: Optional[str]=Query(None),
    id_paciente: Optional[int]=Query(None, ge=1),
    search: Optional[str]=Query(None, max_length=120),
    limit: int=Query(100, ge=1, le=500),
    offset: int=Query(0, ge=0),
    current_user: dict=Depends(get_current_user),
):
    return service.listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset)

@router.post('', status_code=201)
def crear_venta(data: VentaCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.crear_venta(data, current_user)

@router.get('/{id_venta}')
def obtener_venta(id_venta: int, current_user: dict=Depends(get_current_user)):
    return service.obtener_venta(id_venta, current_user)

@router.put('/{id_venta}/cancelar')
def cancelar_venta(id_venta: int, motivo: Optional[str]=Query(None), current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.cancelar_venta(id_venta, motivo, current_user)

@router.post('/{id_venta}/pagos', status_code=201)
def registrar_pago(id_venta: int, data: PagoParcialCreate, current_user: dict=Depends(require_role('ADMINISTRADOR', 'RECEPCIONISTA'))):
    return service.registrar_pago(id_venta, data.id_metodo_pago, data.monto, current_user)

from fastapi import APIRouter, Query, Depends
from typing import Optional, List, Literal
from app.schemas.schemas import ServicioResponse
from app.application.almacen import use_cases as service
from app.presentation.api.security import get_current_user

router = APIRouter()

# Sprint 1: sólo se necesita consultar servicios (citas y atención sin cita).
# Productos, comodatos, movimientos e inventario corresponden a sprints posteriores.

@router.get('/servicios', response_model=List[ServicioResponse])
def listar_servicios(
    busqueda: Optional[str] = Query(None, max_length=120),
    activo: Optional[Literal['S', 'N']] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    return service.listar_servicios(busqueda, activo, current_user, limit, offset)

@router.get('/servicios/{id_servicio}', response_model=ServicioResponse)
def obtener_servicio(id_servicio: int, current_user: dict = Depends(get_current_user)):
    return service.obtener_servicio(id_servicio, current_user)

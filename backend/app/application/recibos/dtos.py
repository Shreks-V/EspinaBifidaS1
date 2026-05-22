from pydantic import BaseModel, field_validator
from typing import Optional, List


class VentaBase(BaseModel):
    id_paciente: int
    monto_total: float
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    exento_pago: str = "N"


class VentaLineaCreate(BaseModel):
    tipo: str                  # 'PRODUCTO' | 'SERVICIO'
    id_referencia: int
    descripcion: str
    precio_unitario: float
    cantidad: int = 1

    @field_validator('tipo')
    @classmethod
    def tipo_valido(cls, v: str) -> str:
        if v not in ('PRODUCTO', 'SERVICIO'):
            raise ValueError("tipo debe ser 'PRODUCTO' o 'SERVICIO'")
        return v

    @field_validator('cantidad')
    @classmethod
    def cantidad_positiva(cls, v: int) -> int:
        if v < 1:
            raise ValueError("cantidad debe ser al menos 1")
        return v


class VentaCreate(VentaBase):
    metodos_pago: Optional[List[dict]] = None
    items: Optional[List[VentaLineaCreate]] = None


class PagoParcialCreate(BaseModel):
    id_metodo_pago: int
    monto: float

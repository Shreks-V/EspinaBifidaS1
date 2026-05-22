from pydantic import BaseModel, Field
from typing import Optional, Literal


class ServicioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    cuota_recuperacion: float = Field(default=0.0, ge=0)
    precio_cuota_a: Optional[float] = Field(default=None, ge=0)
    precio_cuota_b: Optional[float] = Field(default=None, ge=0)
    activo: Literal["S", "N"] = "S"


class ServicioCreate(ServicioBase):
    pass


class ProductoBase(BaseModel):
    clave_interna: str = Field(min_length=1)
    nombre: str
    descripcion: Optional[str] = None
    tipo_producto: Literal["MEDICAMENTO", "EQUIPO", "EQUIPO_MEDICO"]
    precio_cuota_a: Optional[float] = Field(default=None, ge=0)
    precio_cuota_b: Optional[float] = Field(default=None, ge=0)
    activo: Literal["S", "N"] = "S"


class ProductoCreate(ProductoBase):
    presentacion: Optional[str] = None
    dosis: Optional[str] = None
    requiere_caducidad: Optional[Literal["S", "N"]] = "N"
    numero_serie: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    estatus_equipo: Optional[str] = "DISPONIBLE"
    observaciones: Optional[str] = None
    cantidad_disponible: int = Field(default=0, ge=0)
    nivel_minimo: int = Field(default=5, ge=0)
    unidad_medida: Optional[str] = None
    fecha_caducidad: Optional[str] = None


class ComodatoBase(BaseModel):
    id_equipo: int
    id_paciente: int
    fecha_prestamo: str
    fecha_devolucion: Optional[str] = None
    estatus: str = "PRESTADO"
    monto_total: float = 0.0
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    exento_pago: str = "N"
    notas: Optional[str] = None


class ComodatoCreate(ComodatoBase):
    pass


class AjusteExistenciaRequest(BaseModel):
    stock_nuevo: int = Field(ge=0)
    motivo: str = Field(min_length=1, max_length=300)

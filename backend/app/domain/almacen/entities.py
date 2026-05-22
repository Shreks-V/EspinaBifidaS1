from typing import Optional, Literal
from typing_extensions import TypedDict


class Producto(TypedDict, total=False):
    id_producto: int
    clave_interna: str
    nombre: str
    descripcion: Optional[str]
    tipo_producto: str
    precio_cuota_a: Optional[float]
    precio_cuota_b: Optional[float]
    activo: str
    fecha_registro: Optional[str]
    presentacion: Optional[str]
    dosis: Optional[str]
    requiere_caducidad: Optional[str]
    numero_serie: Optional[str]
    marca: Optional[str]
    modelo: Optional[str]
    estatus_equipo: Optional[str]
    observaciones: Optional[str]
    cantidad_disponible: Optional[int]
    nivel_minimo: Optional[int]
    unidad_medida: Optional[str]
    fecha_caducidad: Optional[str]


class Servicio(TypedDict, total=False):
    id_servicio: int
    nombre: str
    descripcion: Optional[str]
    cuota_recuperacion: float
    precio_cuota_a: Optional[float]
    precio_cuota_b: Optional[float]
    activo: str
    fecha_registro: Optional[str]


class Comodato(TypedDict, total=False):
    id_comodato: int
    folio_comodato: str
    id_equipo: int
    id_paciente: int
    fecha_prestamo: str
    fecha_devolucion: Optional[str]
    estatus: str
    monto_total: float
    monto_pagado: float
    saldo_pendiente: float
    exento_pago: str
    notas: Optional[str]
    id_usuario_registro: Optional[int]
    nombre_paciente: Optional[str]
    folio_paciente: Optional[str]
    nombre_equipo: Optional[str]


class MovimientoStock(TypedDict, total=False):
    id_movimiento: int
    id_producto: int
    id_usuario_registro: Optional[int]
    id_venta: Optional[int]
    id_comodato: Optional[int]
    fecha_movimiento: Optional[str]
    tipo_movimiento: str
    cantidad: int
    observaciones: Optional[str]

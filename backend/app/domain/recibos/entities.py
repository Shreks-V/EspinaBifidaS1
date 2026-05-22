from typing import Optional, List
from typing_extensions import TypedDict


class Venta(TypedDict, total=False):
    id_venta: int
    folio_venta: str
    id_paciente: int
    monto_total: float
    monto_pagado: float
    saldo_pendiente: float
    exento_pago: str
    id_usuario_registro: Optional[int]
    fecha_venta: Optional[str]
    cancelada: str
    motivo_cancelacion: Optional[str]
    nombre_paciente: Optional[str]
    folio_paciente: Optional[str]
    metodos_pago: Optional[List[dict]]
    items: Optional[List[dict]]


class VentaLinea(TypedDict, total=False):
    id_linea: int
    id_venta: int
    tipo: str
    id_referencia: int
    descripcion: str
    precio_unitario: float
    cantidad: int
    subtotal: float


class MetodoPago(TypedDict, total=False):
    id_metodo_pago: int
    nombre: str
    descripcion: Optional[str]
    activo: str

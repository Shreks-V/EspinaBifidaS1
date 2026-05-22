from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime

from app.application.beneficiarios.dtos import BeneficiarioBase, BeneficiarioCreate, RenovarMembresiaCreate
from app.application.citas.dtos import CitaBase, CitaCreate
from app.application.almacen.dtos import (
    ServicioBase, ServicioCreate,
    ProductoBase, ProductoCreate,
    ComodatoBase, ComodatoCreate,
    AjusteExistenciaRequest,
)
from app.application.doctores.dtos import DoctorBase, DoctorCreate, DisponibilidadCreate
from app.application.preregistro.dtos import PreRegistroCreate, AprobarPreRegistroData
from app.application.recibos.dtos import VentaBase, VentaCreate, PagoParcialCreate
from app.domain.reportes.entities import ReporteFilter

__all__ = [
    # re-exported input DTOs (kept for backward compat with any direct schemas import)
    "BeneficiarioBase", "BeneficiarioCreate", "RenovarMembresiaCreate",
    "CitaBase", "CitaCreate",
    "ServicioBase", "ServicioCreate",
    "ProductoBase", "ProductoCreate",
    "ComodatoBase", "ComodatoCreate",
    "AjusteExistenciaRequest",
    "DoctorBase", "DoctorCreate", "DisponibilidadCreate",
    "PreRegistroCreate", "AprobarPreRegistroData",
    "VentaBase", "VentaCreate", "PagoParcialCreate",
    "ReporteFilter",
]


# ──────────────────────────── AUTH / USUARIO_SISTEMA ────────────────────────────

class UserLogin(BaseModel):
    correo: str
    password: str


class CambiarContrasenaRequest(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


class AdminResetContrasenaRequest(BaseModel):
    contrasena_nueva: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id_usuario: int
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    correo: str
    rol: str
    estatus: str


class UsuarioBase(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    correo: str
    rol: str
    estatus: str = "ACTIVO"


class UsuarioCreate(UsuarioBase):
    contrasena: str


class UsuarioUpdate(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    rol: str
    estatus: str = "ACTIVO"


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    fecha_creacion: Optional[str] = None


# ──────────────────────────── BENEFICIARIOS / PACIENTE ────────────────────────────

class BeneficiarioResponse(BeneficiarioBase):
    id_paciente: int
    folio: str
    fecha_alta: Optional[str] = None
    fecha_registro: Optional[str] = None
    tutor: Optional[int] = None
    relacion_parentezco: Optional[str] = None
    tipos_espina: Optional[List[dict]] = None
    fecha_inicio_membresia: Optional[str] = None
    fecha_vencimiento_membresia: Optional[str] = None


# ──────────────────────────── TIPO ESPINA BIFIDA ────────────────────────────

class TipoEspinaBifida(BaseModel):
    id_tipo_espina: int
    nombre: str
    descripcion: Optional[str] = None
    activo: str = "S"


# ──────────────────────────── METODO DE PAGO ────────────────────────────

class MetodoPago(BaseModel):
    id_metodo_pago: int
    nombre: str
    descripcion: Optional[str] = None
    activo: str = "S"


# ──────────────────────────── DOCTORES / DOCTOR ────────────────────────────

class DoctorResponse(DoctorBase):
    id_doctor: int
    fecha_registro: Optional[str] = None
    servicios: Optional[List[dict]] = None


# ──────────────────────────── DISPONIBILIDAD DOCTOR ────────────────────────────

class DisponibilidadResponse(BaseModel):
    id_disponibilidad: int
    id_doctor: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    disponible: str = "S"
    fecha_registro: Optional[str] = None


# ──────────────────────────── SERVICIOS / SERVICIO ────────────────────────────

class ServicioResponse(ServicioBase):
    id_servicio: int
    fecha_registro: Optional[str] = None


# ──────────────────────────── PRODUCTOS / PRODUCTO ────────────────────────────

class ProductoResponse(ProductoBase):
    id_producto: int
    fecha_registro: Optional[str] = None
    presentacion: Optional[str] = None
    dosis: Optional[str] = None
    requiere_caducidad: Optional[str] = None
    numero_serie: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    estatus_equipo: Optional[str] = None
    observaciones: Optional[str] = None
    cantidad_disponible: Optional[int] = 0
    nivel_minimo: Optional[int] = 5
    unidad_medida: Optional[str] = None
    fecha_caducidad: Optional[str] = None


# ──────────────────────────── EXISTENCIA PRODUCTO ────────────────────────────

class ExistenciaProducto(BaseModel):
    id_existencia: int
    id_producto: int
    cantidad_disponible: int
    nivel_minimo: int
    unidad_medida: Optional[str] = None
    activo: str = "S"


# ──────────────────────────── CITAS / CITA ────────────────────────────

class CitaResponse(CitaBase):
    id_cita: int
    fecha_registro: Optional[str] = None
    nombre_paciente: Optional[str] = None
    folio_paciente: Optional[str] = None
    servicios: Optional[List[dict]] = None


# ──────────────────────────── DETALLE CITA SERVICIO ────────────────────────────

class DetalleCitaServicio(BaseModel):
    id_detalle: int
    id_cita: int
    id_servicio: int
    id_venta: Optional[int] = None
    cantidad: int
    monto_pagado: float
    cancelado: str = "N"
    motivo_cancelacion: Optional[str] = None
    fecha_registro: Optional[str] = None


# ──────────────────────────── COMODATOS / COMODATO ────────────────────────────

class ComodatoResponse(ComodatoBase):
    id_comodato: int
    folio_comodato: str
    id_usuario_registro: Optional[int] = None
    nombre_paciente: Optional[str] = None
    folio_paciente: Optional[str] = None
    nombre_equipo: Optional[str] = None


# ──────────────────────────── VENTAS / VENTA (RECIBOS) ────────────────────────────

class VentaResponse(VentaBase):
    id_venta: int
    folio_venta: str
    id_usuario_registro: Optional[int] = None
    fecha_venta: Optional[str] = None
    cancelada: str = "N"
    motivo_cancelacion: Optional[str] = None
    nombre_paciente: Optional[str] = None
    folio_paciente: Optional[str] = None
    metodos_pago: Optional[List[dict]] = None


# ──────────────────────────── MOVIMIENTO INVENTARIO ────────────────────────────

class MovimientoInventario(BaseModel):
    id_movimiento: int
    id_producto: int
    id_usuario_registro: Optional[int] = None
    id_venta: Optional[int] = None
    id_comodato: Optional[int] = None
    fecha_movimiento: Optional[str] = None
    tipo_movimiento: Literal[
        "ENTRADA", "SALIDA_VENTA", "SALIDA_COMODATO",
        "DEVOLUCION_COMODATO", "SALIDA_MERMA", "AJUSTE_POS", "AJUSTE_NEG",
        "SALIDA", "AJUSTE",
    ]
    cantidad: int
    observaciones: Optional[str] = None


# ──────────────────────────── DOCUMENTO PACIENTE ────────────────────────────

class DocumentoPacienteBase(BaseModel):
    id_paciente: int
    id_tipo_documento: int
    nombre_archivo: str
    ruta_archivo: str
    formato_archivo: Optional[str] = None
    activo: str = "S"


class DocumentoPacienteResponse(DocumentoPacienteBase):
    id_documento: int
    fecha_carga: Optional[str] = None


# ──────────────────────────── TIPO DOCUMENTO ────────────────────────────

class TipoDocumento(BaseModel):
    id_tipo_documento: int
    nombre: str
    descripcion: Optional[str] = None
    activo: str = "S"


# ──────────────────────────── REPORTES ────────────────────────────

class ReporteResponse(BaseModel):
    id_reporte: int
    id_usuario: int
    tipo_reporte: str
    fecha_generacion: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    formato: Optional[str] = None


# ──────────────────────────── BITACORA ────────────────────────────

class BitacoraCambios(BaseModel):
    id_bitacora: int
    tabla_afectada: str
    id_registro_afectado: int
    campo_modificado: Optional[str] = None
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    tipo_operacion: str
    id_usuario: int
    fecha_cambio: Optional[str] = None
    observaciones: Optional[str] = None

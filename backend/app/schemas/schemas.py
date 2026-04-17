from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import date, datetime


# ──────────────────────────── AUTH / USUARIO_SISTEMA ────────────────────────────

class UserLogin(BaseModel):
    correo: str
    password: str


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
    rol: str  # ADMIN / OPERATIVO / DOCTOR
    estatus: str = "ACTIVO"


class UsuarioCreate(UsuarioBase):
    contrasena: str


class UsuarioResponse(UsuarioBase):
    id_usuario: int
    fecha_creacion: Optional[str] = None


# ──────────────────────────── BENEFICIARIOS / PACIENTE ────────────────────────────

class BeneficiarioBase(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    genero: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    curp: str
    nombre_padre_madre: Optional[str] = None
    direccion: Optional[str] = None
    colonia: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono_casa: Optional[str] = None
    telefono_celular: Optional[str] = None
    correo_electronico: Optional[str] = None
    en_emergencia_avisar_a: Optional[str] = None
    telefono_emergencia: Optional[str] = None
    municipio_nacimiento: Optional[str] = None
    estado_nacimiento: Optional[str] = None
    hospital_nacimiento: Optional[str] = None
    tipo_sangre: Optional[str] = None
    usa_valvula: str = "N"  # S / N
    notas_adicionales: Optional[str] = None
    membresia_estatus: str = "ACTIVO"  # ACTIVO / VENCIDO / SUSPENDIDO
    tipo_cuota: Optional[str] = None  # A / B
    activo: str = "S"  # S / N

    @field_validator("correo_electronico", mode="before")
    @classmethod
    def _correo_vacio_a_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("correo_electronico")
    @classmethod
    def _correo_formato_simple(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        if "@" not in s or "." not in s.rsplit("@", 1)[-1]:
            raise ValueError("correo_electronico no tiene un formato válido")
        return s

    @field_validator("fecha_nacimiento", mode="before")
    @classmethod
    def _fecha_nacimiento_iso(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            s = v.strip()
            if len(s) < 10:
                raise ValueError("fecha_nacimiento debe ser YYYY-MM-DD")
            head = s[:10]
            try:
                date.fromisoformat(head)
            except ValueError as exc:
                raise ValueError("fecha_nacimiento debe ser YYYY-MM-DD") from exc
            return head
        return v


class BeneficiarioCreate(BeneficiarioBase):
    tipos_espina: Optional[List[int]] = None  # IDs de TIPO_ESPINA_BIFIDA


class BeneficiarioResponse(BeneficiarioBase):
    id_paciente: int
    folio: str
    fecha_alta: Optional[str] = None
    fecha_registro: Optional[str] = None
    tutor: Optional[int] = None
    relacion_parentezco: Optional[str] = None
    tipos_espina: Optional[List[dict]] = None  # [{id_tipo_espina, nombre}]
    fecha_inicio_membresia: Optional[str] = None
    fecha_vencimiento_membresia: Optional[str] = None


class RenovarMembresiaCreate(BaseModel):
    monto_total: float
    exento_pago: str = 'N'
    metodos_pago: List[dict] = []  # [{id_metodo_pago, monto}]


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

class DoctorBase(BaseModel):
    nombre: str
    apellido_paterno: Optional[str] = None
    apellido_materno: Optional[str] = None
    especialidad: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    activo: str = "S"  # S / N


class DoctorCreate(DoctorBase):
    servicios: Optional[List[int]] = None  # IDs de SERVICIO


class DoctorResponse(DoctorBase):
    id_doctor: int
    fecha_registro: Optional[str] = None
    servicios: Optional[List[dict]] = None  # [{id_servicio, nombre}]


# ──────────────────────────── DISPONIBILIDAD DOCTOR ────────────────────────────

class DisponibilidadCreate(BaseModel):
    dia_semana: int  # 1=Lunes .. 7=Domingo
    hora_inicio: str  # "HH:MM"
    hora_fin: str     # "HH:MM"


class DisponibilidadResponse(BaseModel):
    id_disponibilidad: int
    id_doctor: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    disponible: str = "S"
    fecha_registro: Optional[str] = None


# ──────────────────────────── SERVICIOS / SERVICIO ────────────────────────────

class ServicioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    cuota_recuperacion: float = Field(default=0.0, ge=0)
    precio_cuota_a: Optional[float] = Field(default=None, ge=0)
    precio_cuota_b: Optional[float] = Field(default=None, ge=0)
    activo: Literal["S", "N"] = "S"


class ServicioCreate(ServicioBase):
    pass


class ServicioResponse(ServicioBase):
    id_servicio: int
    fecha_registro: Optional[str] = None


# ──────────────────────────── PRODUCTOS / PRODUCTO ────────────────────────────

class ProductoBase(BaseModel):
    clave_interna: str = Field(min_length=1)
    nombre: str
    descripcion: Optional[str] = None
    tipo_producto: Literal["MEDICAMENTO", "EQUIPO", "EQUIPO_MEDICO"]
    precio_cuota_a: Optional[float] = Field(default=None, ge=0)
    precio_cuota_b: Optional[float] = Field(default=None, ge=0)
    activo: Literal["S", "N"] = "S"


class ProductoCreate(ProductoBase):
    # Campos de MEDICAMENTO (si tipo_producto == MEDICAMENTO)
    presentacion: Optional[str] = None
    dosis: Optional[str] = None
    requiere_caducidad: Optional[Literal["S", "N"]] = "N"
    # Campos de EQUIPO_MEDICO (si tipo_producto == EQUIPO)
    numero_serie: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    estatus_equipo: Optional[str] = "DISPONIBLE"
    observaciones: Optional[str] = None
    # Existencia
    cantidad_disponible: int = Field(default=0, ge=0)
    nivel_minimo: int = Field(default=5, ge=0)
    unidad_medida: Optional[str] = None
    fecha_caducidad: Optional[str] = None


class ProductoResponse(ProductoBase):
    id_producto: int
    fecha_registro: Optional[str] = None
    # Datos de subtipo
    presentacion: Optional[str] = None
    dosis: Optional[str] = None
    requiere_caducidad: Optional[str] = None
    numero_serie: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    estatus_equipo: Optional[str] = None
    observaciones: Optional[str] = None
    # Existencia
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

class CitaBase(BaseModel):
    id_paciente: int
    id_usuario_registro: Optional[int] = None
    fecha_hora: str
    estatus: str = "PROGRAMADA"  # PROGRAMADA / EN_CURSO / COMPLETADA / CANCELADA
    notas: Optional[str] = None


class CitaCreate(CitaBase):
    servicios: Optional[List[dict]] = None  # [{id_servicio, cantidad}]


class CitaResponse(CitaBase):
    id_cita: int
    fecha_registro: Optional[str] = None
    # Datos desnormalizados para la UI
    nombre_paciente: Optional[str] = None
    folio_paciente: Optional[str] = None
    servicios: Optional[List[dict]] = None  # [{id_servicio, nombre, cantidad, monto_pagado}]


# ──────────────────────────── DETALLE CITA SERVICIO ────────────────────────────

class DetalleCitaServicio(BaseModel):
    id_detalle: int
    id_cita: int
    id_servicio: int
    id_venta: Optional[int] = None
    cantidad: int
    monto_pagado: float
    cancelado: str = "N"  # S / N
    motivo_cancelacion: Optional[str] = None
    fecha_registro: Optional[str] = None


# ──────────────────────────── COMODATOS / COMODATO ────────────────────────────

class ComodatoBase(BaseModel):
    id_equipo: int
    id_paciente: int
    fecha_prestamo: str
    fecha_devolucion: Optional[str] = None
    estatus: str = "PRESTADO"  # PRESTADO / DEVUELTO / CANCELADO
    monto_total: float = 0.0
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    exento_pago: str = "N"  # S / N
    notas: Optional[str] = None


class ComodatoCreate(ComodatoBase):
    pass


class ComodatoResponse(ComodatoBase):
    id_comodato: int
    folio_comodato: str
    id_usuario_registro: Optional[int] = None
    # Datos desnormalizados para la UI
    nombre_paciente: Optional[str] = None
    folio_paciente: Optional[str] = None
    nombre_equipo: Optional[str] = None


# ──────────────────────────── VENTAS / VENTA (RECIBOS) ────────────────────────────

class VentaBase(BaseModel):
    id_paciente: int
    monto_total: float
    monto_pagado: float = 0.0
    saldo_pendiente: float = 0.0
    exento_pago: str = "N"  # S / N


class VentaCreate(VentaBase):
    metodos_pago: Optional[List[dict]] = None  # [{id_metodo_pago, monto}]


class PagoParcialCreate(BaseModel):
    id_metodo_pago: int
    monto: float


class AjusteExistenciaRequest(BaseModel):
    stock_nuevo: int = Field(ge=0)
    motivo: str = Field(min_length=1, max_length=300)


class VentaResponse(VentaBase):
    id_venta: int
    folio_venta: str
    id_usuario_registro: Optional[int] = None
    fecha_venta: Optional[str] = None
    cancelada: str = "N"
    motivo_cancelacion: Optional[str] = None
    # Datos desnormalizados para la UI
    nombre_paciente: Optional[str] = None
    folio_paciente: Optional[str] = None
    metodos_pago: Optional[List[dict]] = None  # [{id_metodo_pago, nombre, monto}]


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
        # valores legacy del schema original
        "SALIDA", "AJUSTE",
    ]
    cantidad: int = Field(ge=0)
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

class ReporteFilter(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    genero: Optional[str] = None
    estado: Optional[str] = None
    tipo_espina: Optional[int] = None


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
    tipo_operacion: str  # INSERT / UPDATE / DELETE
    id_usuario: int
    fecha_cambio: Optional[str] = None
    observaciones: Optional[str] = None


# ──────────────────────────── PRE-REGISTRO ────────────────────────────
# Pre-registro now writes directly to PACIENTE with ESTATUS_REGISTRO='PENDIENTE'

class PreRegistroCreate(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    curp: str
    estado_nacimiento: Optional[str] = None
    hospital_nacimiento: Optional[str] = None
    nombre_padre_madre: Optional[str] = None
    direccion: Optional[str] = None
    colonia: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono_casa: Optional[str] = None
    telefono_celular: Optional[str] = None
    correo_electronico: Optional[str] = None
    en_emergencia_avisar_a: Optional[str] = None
    telefono_emergencia: Optional[str] = None
    tipo_sangre: Optional[str] = None
    usa_valvula: Optional[str] = "N"
    tipo_cuota: Optional[str] = None
    notas_adicionales: Optional[str] = None
    paso_actual: int = 1
    tipos_espina: Optional[List[int]] = None  # IDs de TIPO_ESPINA_BIFIDA


class AprobarPreRegistroData(BaseModel):
    tipo_cuota: Optional[str] = None

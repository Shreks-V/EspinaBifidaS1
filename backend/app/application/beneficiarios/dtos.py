from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import date


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
    usa_valvula: str = "N"
    notas_adicionales: Optional[str] = None
    membresia_estatus: str = "ACTIVO"
    tipo_cuota: Optional[str] = None
    activo: str = "S"

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
    tipos_espina: Optional[List[int]] = None


class RenovarMembresiaCreate(BaseModel):
    monto_total: float
    exento_pago: str = "N"
    metodos_pago: List[dict] = []

import re
from pydantic import BaseModel, field_validator
from typing import Optional, List

__all__ = ["PreRegistroCreate", "AprobarPreRegistroData"]

_CURP_RE = re.compile(
    r'^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])'
    r'[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|'
    r'OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$'
)


class PreRegistroCreate(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    curp: str

    @field_validator('curp')
    @classmethod
    def curp_formato_valido(cls, v: str) -> str:
        v = v.strip().upper()
        if not _CURP_RE.match(v):
            raise ValueError('El CURP no tiene el formato oficial mexicano (18 caracteres).')
        return v
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
    tipos_espina: Optional[List[int]] = None

    @field_validator('tipo_cuota')
    @classmethod
    def tipo_cuota_valida(cls, v: Optional[str]) -> Optional[str]:
        return normalize_tipo_cuota(v)


class AprobarPreRegistroData(BaseModel):
    tipo_cuota: Optional[str] = None

    @field_validator('tipo_cuota')
    @classmethod
    def tipo_cuota_valida(cls, v: Optional[str]) -> Optional[str]:
        return normalize_tipo_cuota(v)


def normalize_tipo_cuota(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    value = v.strip().upper()
    aliases = {
        'A': 'CUOTA A',
        'B': 'CUOTA B',
        'CUOTA A': 'CUOTA A',
        'CUOTA B': 'CUOTA B',
    }
    if value not in aliases:
        raise ValueError('tipo_cuota debe ser CUOTA A o CUOTA B.')
    return aliases[value]

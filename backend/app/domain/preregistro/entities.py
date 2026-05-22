from dataclasses import dataclass
from typing import Optional, List
from typing_extensions import TypedDict


@dataclass(frozen=True)
class UploadedFile:
    filename: str
    content: bytes
    content_type: str


class Preregistro(TypedDict, total=False):
    id_paciente: int
    folio: Optional[str]
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str]
    fecha_nacimiento: Optional[str]
    genero: Optional[str]
    curp: str
    estado_nacimiento: Optional[str]
    hospital_nacimiento: Optional[str]
    nombre_padre_madre: Optional[str]
    direccion: Optional[str]
    colonia: Optional[str]
    ciudad: Optional[str]
    estado: Optional[str]
    codigo_postal: Optional[str]
    telefono_casa: Optional[str]
    telefono_celular: Optional[str]
    correo_electronico: Optional[str]
    en_emergencia_avisar_a: Optional[str]
    telefono_emergencia: Optional[str]
    tipo_sangre: Optional[str]
    usa_valvula: Optional[str]
    tipo_cuota: Optional[str]
    notas_adicionales: Optional[str]
    paso_actual: int
    estatus_registro: str
    tipos_espina: Optional[List[int]]


class DocumentoPaciente(TypedDict, total=False):
    id_documento: int
    id_paciente: int
    id_tipo_documento: int
    nombre_archivo: str
    ruta_archivo: str
    formato_archivo: Optional[str]
    activo: str
    fecha_carga: Optional[str]

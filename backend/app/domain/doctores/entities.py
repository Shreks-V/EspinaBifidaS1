from typing import Optional, List
from typing_extensions import TypedDict


class Doctor(TypedDict, total=False):
    id_doctor: int
    nombre: str
    apellido_paterno: Optional[str]
    apellido_materno: Optional[str]
    especialidad: Optional[str]
    telefono: Optional[str]
    correo: Optional[str]
    activo: str
    fecha_registro: Optional[str]
    servicios: Optional[List[dict]]


class Disponibilidad(TypedDict, total=False):
    id_disponibilidad: int
    id_doctor: int
    dia_semana: int
    hora_inicio: str
    hora_fin: str
    disponible: str
    fecha_registro: Optional[str]


class DisponibilidadEspecial(TypedDict, total=False):
    id_disp_especial: int
    id_doctor: int
    fecha_inicio: str
    hora_inicio: str
    hora_fin: str
    tipo_recurrencia: str
    descripcion: Optional[str]
    activo: str
    fecha_registro: Optional[str]

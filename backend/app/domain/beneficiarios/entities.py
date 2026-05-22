from typing import Optional, List
from typing_extensions import TypedDict


class Beneficiario(TypedDict, total=False):
    id_paciente: int
    folio: str
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str]
    genero: Optional[str]
    fecha_nacimiento: Optional[str]
    curp: str
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
    municipio_nacimiento: Optional[str]
    estado_nacimiento: Optional[str]
    hospital_nacimiento: Optional[str]
    tipo_sangre: Optional[str]
    usa_valvula: str
    notas_adicionales: Optional[str]
    membresia_estatus: str
    tipo_cuota: Optional[str]
    activo: str
    fecha_alta: Optional[str]
    fecha_registro: Optional[str]
    tutor: Optional[int]
    relacion_parentezco: Optional[str]
    tipos_espina: Optional[List[dict]]
    fecha_inicio_membresia: Optional[str]
    fecha_vencimiento_membresia: Optional[str]
    estatus_registro: Optional[str]


class TipoEspina(TypedDict, total=False):
    id_tipo_espina: int
    nombre: str
    descripcion: Optional[str]
    activo: str

from typing import Optional, List
from typing_extensions import TypedDict


class Cita(TypedDict, total=False):
    id_cita: int
    id_paciente: int
    id_usuario_registro: Optional[int]
    fecha_hora: str
    estatus: str
    notas: Optional[str]
    fecha_registro: Optional[str]
    nombre_paciente: Optional[str]
    folio_paciente: Optional[str]
    servicios: Optional[List[dict]]

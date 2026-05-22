from pydantic import BaseModel
from typing import Optional, List


class CitaBase(BaseModel):
    id_paciente: int
    id_usuario_registro: Optional[int] = None
    fecha_hora: str
    estatus: str = "PROGRAMADA"
    notas: Optional[str] = None


class CitaCreate(CitaBase):
    servicios: Optional[List[dict]] = None

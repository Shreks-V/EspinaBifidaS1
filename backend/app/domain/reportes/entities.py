from dataclasses import dataclass, field
from typing import Optional
from typing_extensions import TypedDict


class HistorialReporte(TypedDict, total=False):
    id_reporte: int
    id_usuario: int
    tipo_reporte: str
    fecha_generacion: Optional[str]
    fecha_inicio: Optional[str]
    fecha_fin: Optional[str]
    formato: Optional[str]


@dataclass
class ReporteFilter:
    genero: Optional[str] = field(default=None)
    estado: Optional[str] = field(default=None)
    tipo_espina: Optional[int] = field(default=None)
    fecha_inicio: Optional[str] = field(default=None)
    fecha_fin: Optional[str] = field(default=None)

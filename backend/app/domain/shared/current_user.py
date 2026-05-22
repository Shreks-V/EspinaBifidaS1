from typing import Optional
from typing_extensions import TypedDict


class CurrentUser(TypedDict, total=False):
    correo: str
    rol: str
    rol_original: str
    id_usuario: int
    nombre: str

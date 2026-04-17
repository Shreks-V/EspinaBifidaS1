from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class User:
    id_usuario: int
    nombre: str
    apellido_paterno: str | None
    apellido_materno: str | None
    correo: str
    hashed_password: str
    rol: str
    estatus: str
    fecha_creacion: datetime | None = None


@dataclass(frozen=True)
class AuthenticatedUser:
    access_token: str
    token_type: str = "bearer"


@dataclass(frozen=True)
class SeedUser:
    nombre: str
    apellido_paterno: str | None
    apellido_materno: str | None
    correo: str
    contrasena: str
    rol: str

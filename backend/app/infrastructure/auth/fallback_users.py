from app.domain.auth.entities import User
from app.domain.auth.ports import PasswordHasher


def build_fallback_users(hasher: PasswordHasher) -> list[User]:
    return [
        User(
            id_usuario=1,
            nombre="Administrador",
            apellido_paterno="General",
            apellido_materno=None,
            correo="admin@espinabifida.org",
            hashed_password=hasher.hash("admin123"),
            rol="ADMINISTRADOR",
            estatus="ACTIVO",
        ),
        User(
            id_usuario=2,
            nombre="Usuario",
            apellido_paterno="Operativo",
            apellido_materno=None,
            correo="operativo@espinabifida.org",
            hashed_password=hasher.hash("op123"),
            rol="RECEPCIONISTA",
            estatus="ACTIVO",
        ),
    ]

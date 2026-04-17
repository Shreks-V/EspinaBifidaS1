from app.domain.auth.entities import User
from app.infrastructure.security.auth import get_password_hash


def build_fallback_users() -> list[User]:
    return [
        User(
            id_usuario=1,
            nombre="Administrador",
            apellido_paterno="General",
            apellido_materno=None,
            correo="admin@espinabifida.org",
            hashed_password=get_password_hash("admin123"),
            rol="ADMINISTRADOR",
            estatus="ACTIVO",
        ),
        User(
            id_usuario=2,
            nombre="Usuario",
            apellido_paterno="Operativo",
            apellido_materno=None,
            correo="operativo@espinabifida.org",
            hashed_password=get_password_hash("op123"),
            rol="RECEPCIONISTA",
            estatus="ACTIVO",
        ),
    ]

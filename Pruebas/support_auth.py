from __future__ import annotations

from app.domain.auth.entities import NewUser, SeedUser, UpdateUser, User
from app.domain.auth.exceptions import UserAlreadyExistsError, UserNotFoundError
from app.infrastructure.security.adapters import SecurityPasswordHasher


class InMemoryUserRepository:
    """Repositorio mínimo para pruebas (sin Oracle)."""

    def __init__(self, users_by_email_lower: dict[str, User], has_users: bool) -> None:
        self._users = dict(users_by_email_lower)
        self._has_users = has_users
        self._next_id = max((u.id_usuario for u in self._users.values()), default=0) + 1

    def find_by_email(self, correo: str) -> User | None:
        if correo is None:
            return None
        key = str(correo).strip().lower()
        return self._users.get(key)

    def find_by_id(self, id_usuario: int) -> User | None:
        for u in self._users.values():
            if u.id_usuario == id_usuario:
                return u
        return None

    def list_all(self) -> list[User]:
        return sorted(self._users.values(), key=lambda u: u.id_usuario)

    def has_users(self) -> bool:
        return self._has_users

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        return []

    def create_user(self, user: NewUser, hashed_password: str) -> User:
        key = user.correo.strip().lower()
        if key in self._users:
            raise UserAlreadyExistsError(user.correo)
        uid = self._next_id
        self._next_id += 1
        created = User(
            id_usuario=uid,
            nombre=user.nombre,
            apellido_paterno=user.apellido_paterno,
            apellido_materno=user.apellido_materno,
            correo=user.correo.strip(),
            hashed_password=hashed_password,
            rol=user.rol,
            estatus=user.estatus,
        )
        self._users[key] = created
        self._has_users = True
        return created

    def update_user(self, id_usuario: int, data: UpdateUser) -> User:
        current = self.find_by_id(id_usuario)
        if current is None:
            raise UserNotFoundError()
        updated = User(
            id_usuario=current.id_usuario,
            nombre=data.nombre,
            apellido_paterno=data.apellido_paterno,
            apellido_materno=data.apellido_materno,
            correo=current.correo,
            hashed_password=current.hashed_password,
            rol=data.rol,
            estatus=data.estatus,
            fecha_creacion=current.fecha_creacion,
        )
        key = current.correo.strip().lower()
        self._users[key] = updated
        return updated

    def update_password(self, id_usuario: int, new_hash: str) -> None:
        current = self.find_by_id(id_usuario)
        if current is None:
            raise UserNotFoundError()
        updated = User(
            id_usuario=current.id_usuario,
            nombre=current.nombre,
            apellido_paterno=current.apellido_paterno,
            apellido_materno=current.apellido_materno,
            correo=current.correo,
            hashed_password=new_hash,
            rol=current.rol,
            estatus=current.estatus,
            fecha_creacion=current.fecha_creacion,
        )
        self._users[current.correo.strip().lower()] = updated

    def log_login_attempt(
        self, id_usuario: int | None, success: bool, ip: str | None = None
    ) -> None:
        return None


def build_user(
    *,
    correo: str,
    password_plain: str,
    password_hasher: SecurityPasswordHasher,
    id_usuario: int = 1,
    nombre: str = "Test",
    estatus: str = "ACTIVO",
    rol: str = "RECEPCIONISTA",
) -> User:
    return User(
        id_usuario=id_usuario,
        nombre=nombre,
        apellido_paterno="P",
        apellido_materno=None,
        correo=correo.strip(),
        hashed_password=password_hasher.hash(password_plain),
        rol=rol,
        estatus=estatus,
    )

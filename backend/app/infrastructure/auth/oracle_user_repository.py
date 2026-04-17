from __future__ import annotations

import logging

import oracledb

from app.domain.auth.entities import SeedUser, User
from app.domain.auth.ports import PasswordHasher, UserRepository
from app.infrastructure.persistence.oracle import get_db, row_to_dict
from app.infrastructure.persistence.sp_helpers import parse_ora_error

logger = logging.getLogger(__name__)


class OracleUserRepository(UserRepository):
    def __init__(self, password_hasher: PasswordHasher) -> None:
        self._password_hasher = password_hasher

    def find_by_email(self, correo: str) -> User | None:
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT ID_USUARIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, "
                    "CORREO, CONTRASENA_HASH, ROL, ESTATUS, FECHA_CREACION "
                    "FROM USUARIO_SISTEMA WHERE CORREO = :1",
                    [correo],
                )
                row = row_to_dict(cursor)
                return self._to_user(row) if row is not None else None
        except Exception:
            return None

    def has_users(self) -> bool:
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) AS cnt FROM USUARIO_SISTEMA")
                row = row_to_dict(cursor)
                return row is not None and row.get("cnt", 0) > 0
        except Exception:
            return False

    def seed_users(self, users: list[SeedUser]) -> list[str]:
        inserted: list[str] = []
        with get_db() as conn:
            cursor = conn.cursor()
            for user in users:
                cursor.execute(
                    "SELECT ID_USUARIO FROM USUARIO_SISTEMA WHERE CORREO = :1",
                    [user.correo],
                )
                if cursor.fetchone() is not None:
                    continue

                try:
                    id_out = cursor.var(int)
                    cursor.callproc(
                        "SP_CREAR_USUARIO_SISTEMA",
                        [
                            user.nombre,
                            user.apellido_paterno,
                            user.apellido_materno,
                            user.correo,
                            self._password_hasher.hash(user.contrasena),
                            user.rol,
                            id_out,
                        ],
                    )
                except oracledb.DatabaseError as exc:
                    code, message = parse_ora_error(exc)
                    logger.warning(
                        "SP_CREAR_USUARIO_SISTEMA fallo para %s: ORA-%s %s",
                        user.correo, code, message,
                    )
                    continue
                inserted.append(user.correo)
            conn.commit()
        return inserted

    def log_login_attempt(
        self, id_usuario: int | None, success: bool, ip: str | None = None
    ) -> None:
        if id_usuario is None:
            return
        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.callproc(
                    "SP_REGISTRAR_LOGIN_USUARIO",
                    [id_usuario, "S" if success else "N", ip],
                )
                conn.commit()
        except Exception:
            logger.exception("No se pudo registrar intento de login")

    @staticmethod
    def _to_user(row: dict) -> User:
        return User(
            id_usuario=row["id_usuario"],
            nombre=(row.get("nombre") or "").strip(),
            apellido_paterno=(row.get("apellido_paterno") or "").strip() or None,
            apellido_materno=(row.get("apellido_materno") or "").strip() or None,
            correo=(row.get("correo") or "").strip(),
            hashed_password=row["contrasena_hash"],
            rol=(row.get("rol") or "").strip(),
            estatus=(row.get("estatus") or "").strip(),
            fecha_creacion=row.get("fecha_creacion"),
        )

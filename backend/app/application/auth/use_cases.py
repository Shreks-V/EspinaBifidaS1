from app.application.auth.exceptions import ForbiddenError, LoginError, PasswordTooShortError
from app.domain.auth.entities import AuthenticatedUser, NewUser, SeedUser, UpdateUser, User
from app.domain.auth.exceptions import AuthError, ForbiddenActionError, UserNotFoundError
from app.domain.auth.ports import AccessTokenIssuer, PasswordHasher, UserRepository
from app.domain.auth.roles import normalize_role

_MIN_PASSWORD_LENGTH = 8


DEFAULT_SEED_USERS = [
    SeedUser(
        nombre="Administrador",
        apellido_paterno="General",
        apellido_materno=None,
        correo="admin@espinabifida.org",
        contrasena="admin123",
        rol="ADMINISTRADOR",
    ),
    SeedUser(
        nombre="Usuario",
        apellido_paterno="Operativo",
        apellido_materno=None,
        correo="operativo@espinabifida.org",
        contrasena="op123",
        rol="RECEPCIONISTA",
    ),
]


class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        password_hasher: PasswordHasher,
        token_issuer: AccessTokenIssuer,
        fallback_users: list[User] | None = None,
    ) -> None:
        self._user_repository = user_repository
        self._password_hasher = password_hasher
        self._token_issuer = token_issuer
        self._fallback_users = fallback_users or []

    def login(self, correo: str, password: str) -> AuthenticatedUser:
        db_user = self._user_repository.find_by_email(correo)
        if db_user is not None:
            try:
                return self._authenticate_user(db_user, password)
            except AuthError:
                self._user_repository.log_login_attempt(db_user.id_usuario, success=False)
                raise LoginError()

        if self._user_repository.has_users():
            raise LoginError()

        fallback_user = self._find_fallback_user(correo)
        if fallback_user is None:
            raise LoginError()
        try:
            return self._authenticate_user(fallback_user, password)
        except AuthError:
            raise LoginError()

    def get_me(self, correo: str) -> dict:
        user = self._user_repository.find_by_email(correo) or self._find_fallback_user(correo)
        if user is None:
            raise UserNotFoundError()
        return self._to_user_response(user)

    def change_password(self, current_user: dict, contrasena_actual: str, contrasena_nueva: str) -> None:
        if len(contrasena_nueva) < _MIN_PASSWORD_LENGTH:
            raise PasswordTooShortError(f"La contraseña debe tener al menos {_MIN_PASSWORD_LENGTH} caracteres")
        user = self._user_repository.find_by_email(current_user["correo"])
        if user is None:
            raise UserNotFoundError()
        if not self._password_hasher.verify(contrasena_actual, user.hashed_password):
            raise AuthError()
        self._user_repository.update_password(user.id_usuario, self._password_hasher.hash(contrasena_nueva))

    def admin_reset_password(self, current_user: dict, id_usuario: int, contrasena_nueva: str) -> None:
        if normalize_role(current_user.get("rol")) != "ADMINISTRADOR":
            raise ForbiddenError()
        if len(contrasena_nueva) < _MIN_PASSWORD_LENGTH:
            raise PasswordTooShortError(f"La contraseña debe tener al menos {_MIN_PASSWORD_LENGTH} caracteres")
        user = self._user_repository.find_by_id(id_usuario)
        if user is None:
            raise UserNotFoundError()
        self._user_repository.update_password(id_usuario, self._password_hasher.hash(contrasena_nueva))

    def list_users(self, current_user: dict) -> list[dict]:
        if normalize_role(current_user.get("rol")) != "ADMINISTRADOR":
            raise ForbiddenError()
        return [self._to_user_response(u) for u in self._user_repository.list_all()]

    def create_user(self, current_user: dict, data: dict) -> dict:
        if normalize_role(current_user.get("rol")) != "ADMINISTRADOR":
            raise ForbiddenError()
        contrasena = data.get("contrasena", "")
        if len(contrasena) < _MIN_PASSWORD_LENGTH:
            raise PasswordTooShortError(f"La contraseña debe tener al menos {_MIN_PASSWORD_LENGTH} caracteres")
        rol = normalize_role(data.get("rol", ""))
        new_user = NewUser(
            nombre=(data.get("nombre") or "").strip(),
            apellido_paterno=(data.get("apellido_paterno") or "").strip() or None,
            apellido_materno=(data.get("apellido_materno") or "").strip() or None,
            correo=(data.get("correo") or "").strip(),
            contrasena=contrasena,
            rol=rol,
            estatus=data.get("estatus", "ACTIVO"),
        )
        created = self._user_repository.create_user(new_user, self._password_hasher.hash(contrasena))
        return self._to_user_response(created)

    def update_user(self, current_user: dict, id_usuario: int, data: dict) -> dict:
        if normalize_role(current_user.get("rol")) != "ADMINISTRADOR":
            raise ForbiddenError()
        user = self._user_repository.find_by_id(id_usuario)
        if user is None:
            raise UserNotFoundError()
        update_data = UpdateUser(
            nombre=(data.get("nombre") or "").strip(),
            apellido_paterno=(data.get("apellido_paterno") or "").strip() or None,
            apellido_materno=(data.get("apellido_materno") or "").strip() or None,
            rol=normalize_role(data.get("rol", user.rol)),
            estatus=data.get("estatus", user.estatus),
        )
        updated = self._user_repository.update_user(id_usuario, update_data)
        return self._to_user_response(updated)

    # ── Stubs para Opción C: recuperación por correo ───────────────────────────
    # Para activarlos, configurar SMTP_HOST/SMTP_USER/SMTP_PASSWORD en .env y
    # descomentar los endpoints correspondientes en routers/auth.py.
    #
    # def request_password_reset(self, correo: str) -> None:
    #     """Genera token seguro (secrets.token_urlsafe), guarda en tabla
    #     PASSWORD_RESET_TOKEN con expiración, y envía email con el link."""
    #     raise NotImplementedError("Configurar SMTP primero")
    #
    # def confirm_password_reset(self, token: str, contrasena_nueva: str) -> None:
    #     """Valida el token, verifica que no haya expirado, actualiza la
    #     contraseña e invalida el token."""
    #     raise NotImplementedError("Configurar SMTP primero")
    # ──────────────────────────────────────────────────────────────────────────

    def seed_default_users(self, current_user: dict) -> dict:
        if normalize_role(current_user.get("rol")) != "ADMINISTRADOR":
            raise ForbiddenError()

        inserted = self._user_repository.seed_users(DEFAULT_SEED_USERS)
        if not inserted:
            return {"message": "Los usuarios por defecto ya existen en la BD."}
        return {"message": f"Usuarios insertados: {', '.join(inserted)}"}

    def _find_fallback_user(self, correo: str) -> User | None:
        return next((user for user in self._fallback_users if user.correo == correo), None)

    def _authenticate_user(self, user: User, password: str) -> AuthenticatedUser:
        estatus = (user.estatus or "").strip().upper()
        if estatus != "ACTIVO":
            raise AuthError()

        if not self._password_hasher.verify(password, user.hashed_password):
            raise AuthError()

        rol = normalize_role(user.rol)

        access_token = self._token_issuer.issue(
            data={
                "sub": (user.correo or "").strip(),
                "rol": rol,
                "nombre": (user.nombre or "").strip(),
                "id_usuario": user.id_usuario,
            }
        )
        self._user_repository.log_login_attempt(user.id_usuario, success=True)
        return AuthenticatedUser(access_token=access_token)

    @staticmethod
    def _to_user_response(user: User) -> dict:
        return {
            "id_usuario": user.id_usuario,
            "nombre": (user.nombre or "").strip(),
            "apellido_paterno": (user.apellido_paterno or "").strip() or None,
            "apellido_materno": (user.apellido_materno or "").strip() or None,
            "correo": (user.correo or "").strip(),
            "rol": normalize_role(user.rol),
            "estatus": (user.estatus or "").strip(),
        }

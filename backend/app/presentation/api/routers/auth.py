import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.application.auth.exceptions import ForbiddenError, LoginError, PasswordTooShortError
from app.domain.auth.exceptions import AuthError, UserAlreadyExistsError, UserNotFoundError

logger = logging.getLogger(__name__)
from app.application.auth.use_cases import AuthService
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.security import get_current_user
from app.presentation.api.schemas import (
    AdminResetContrasenaRequest, CambiarContrasenaRequest,
    Token, UserLogin, UserResponse, UsuarioCreate, UsuarioUpdate,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Correo o contraseña incorrectos",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/seed")
def seed_users(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        return auth_service.seed_default_users(current_user)
    except ForbiddenError:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ejecutar el seed")
    except Exception as exc:
        logger.exception("Error en seed_users: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al insertar usuarios en la BD",
        )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    del request
    try:
        token = auth_service.login(correo=form_data.correo, password=form_data.password)
        return {
            "access_token": token.access_token,
            "token_type": token.token_type,
        }
    except LoginError:
        raise _auth_error()


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        return auth_service.get_me(current_user["correo"])
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")


@router.post("/cambiar-contrasena", status_code=200)
def cambiar_contrasena(
    body: CambiarContrasenaRequest,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        auth_service.change_password(current_user, body.contrasena_actual, body.contrasena_nueva)
        return {"message": "Contraseña actualizada correctamente"}
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La contraseña actual es incorrecta")
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    except PasswordTooShortError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.get("/usuarios", response_model=list[UserResponse])
def listar_usuarios(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        return auth_service.list_users(current_user)
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")


@router.post("/usuarios", response_model=UserResponse, status_code=201)
def crear_usuario(
    body: UsuarioCreate,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        return auth_service.create_user(current_user, body.model_dump())
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    except PasswordTooShortError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except UserAlreadyExistsError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un usuario con ese correo")
    except Exception as exc:
        logger.exception("Error al crear usuario: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear el usuario")


@router.put("/usuarios/{id_usuario}", response_model=UserResponse, status_code=200)
def actualizar_usuario(
    id_usuario: int,
    body: UsuarioUpdate,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        return auth_service.update_user(current_user, id_usuario, body.model_dump())
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    except Exception as exc:
        logger.exception("Error al actualizar usuario: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al actualizar el usuario")


@router.post("/usuarios/{id_usuario}/reset-contrasena", status_code=200)
def reset_contrasena_admin(
    id_usuario: int,
    body: AdminResetContrasenaRequest,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        auth_service.admin_reset_password(current_user, id_usuario, body.contrasena_nueva)
        return {"message": "Contraseña restablecida correctamente"}
    except ForbiddenError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    except UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    except PasswordTooShortError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


# ── Endpoints para Opción C: recuperación por correo (descomentar al configurar SMTP) ─
# @router.post("/recuperar-contrasena", status_code=202)
# def solicitar_recuperacion(correo: str, auth_service: AuthService = Depends(get_auth_service)):
#     auth_service.request_password_reset(correo)
#     return {"message": "Si el correo existe, recibirás un enlace de recuperación"}
#
# @router.post("/confirmar-reset", status_code=200)
# def confirmar_reset(token: str, nueva: str, auth_service: AuthService = Depends(get_auth_service)):
#     auth_service.confirm_password_reset(token, nueva)
#     return {"message": "Contraseña restablecida correctamente"}
# ────────────────────────────────────────────────────────────────────────────

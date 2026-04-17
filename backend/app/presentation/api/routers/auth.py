from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.application.auth.use_cases import AuthService
from app.domain.auth.exceptions import AuthError, ForbiddenActionError, UserNotFoundError
from app.presentation.api.dependencies import get_auth_service
from app.presentation.api.security import get_current_user
from app.schemas.schemas import Token, UserLogin, UserResponse

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
    except ForbiddenActionError:
        raise HTTPException(status_code=403, detail="Solo administradores pueden ejecutar el seed")
    except Exception:
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
    except AuthError:
        raise _auth_error()


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        return auth_service.get_me(current_user["correo"])
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

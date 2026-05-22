from datetime import timedelta

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.session_context import clear_current_user_id, set_current_user_id
from app.domain.auth.exceptions import TokenDecodeError
from app.domain.auth.ports import AccessTokenIssuer
from app.domain.auth.roles import normalize_role
from app.domain.shared.current_user import CurrentUser
from app.presentation.api.dependencies import get_token_decoder

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login", auto_error=False
)


def _build_user_from_token(token: str, token_decoder: AccessTokenIssuer) -> CurrentUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = token_decoder.decode(token)
        correo = payload.get("sub")
        if correo is None:
            raise credentials_exception
        rol_normalizado = normalize_role(payload.get("rol", "OPERATIVO"))
        return {
            "correo": str(correo).strip(),
            "rol": rol_normalizado,
            "rol_original": payload.get("rol", "OPERATIVO"),
            "id_usuario": payload.get("id_usuario"),
            "nombre": str(payload.get("nombre") or "").strip(),
        }
    except TokenDecodeError:
        raise credentials_exception


def _prereg_token_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de pre-registro inválido o ausente",
    )


def _build_preregistro_from_token(token: str, token_decoder: AccessTokenIssuer) -> dict:
    credentials_exception = _prereg_token_error()
    try:
        payload = token_decoder.decode(token)
        if payload.get("scope") != "PREREGISTRO":
            raise credentials_exception
        id_paciente = payload.get("id_paciente")
        if id_paciente is None:
            raise credentials_exception
        return {
            "scope": "PREREGISTRO",
            "id_paciente": int(id_paciente),
        }
    except (TokenDecodeError, ValueError, TypeError):
        raise credentials_exception


def issue_preregistro_token(
    id_paciente: int,
    token_issuer: AccessTokenIssuer,
    hours: int = 12,
) -> str:
    return token_issuer.issue(
        {"scope": "PREREGISTRO", "id_paciente": int(id_paciente)},
        expires_delta=timedelta(hours=hours),
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    token_decoder: AccessTokenIssuer = Depends(get_token_decoder),
):
    user = _build_user_from_token(token, token_decoder)
    set_current_user_id(user.get("id_usuario"))
    try:
        yield user
    finally:
        clear_current_user_id()


async def get_optional_current_user(
    token: str | None = Depends(optional_oauth2_scheme),
    token_decoder: AccessTokenIssuer = Depends(get_token_decoder),
):
    if not token:
        clear_current_user_id()
        yield None
        return

    user = _build_user_from_token(token, token_decoder)
    set_current_user_id(user.get("id_usuario"))
    try:
        yield user
    finally:
        clear_current_user_id()


async def ensure_preregistro_access(
    id_paciente: int,
    current_user: dict | None = Depends(get_optional_current_user),
    x_preregistro_token: str | None = Header(default=None, alias="X-Preregistro-Token"),
    token_decoder: AccessTokenIssuer = Depends(get_token_decoder),
):
    if current_user is not None:
        return current_user

    if not x_preregistro_token:
        raise _prereg_token_error()

    prereg_claims = _build_preregistro_from_token(x_preregistro_token, token_decoder)
    if prereg_claims["id_paciente"] != int(id_paciente):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El token de pre-registro no corresponde al recurso solicitado",
        )
    return prereg_claims


def require_role(*allowed_roles: str):
    def _check(current_user: CurrentUser = Depends(get_current_user)):
        current_role = normalize_role(current_user.get("rol"))
        allowed_normalized = {normalize_role(r) for r in allowed_roles}
        if current_role not in allowed_normalized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción",
            )
        current_user["rol"] = current_role
        return current_user

    return _check

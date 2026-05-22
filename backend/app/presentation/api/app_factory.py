from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.domain.exceptions import ConflictError, InternalError, NotFoundError, ValidationError
from app.infrastructure.persistence.oracle import close_pool, init_pool
from app.infrastructure.scheduler.membresias import start_expiry_scheduler
from app.infrastructure.startup.migrations import run_startup_migrations
from app.presentation.api.bootstrap import wire_application
from app.presentation.api.router import build_api_router

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

MAX_BODY_SIZE = settings.MAX_UPLOAD_SIZE


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_pool()
    run_startup_migrations()
    start_expiry_scheduler()
    yield
    close_pool()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if settings.DEBUG:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net; "
                "img-src 'self' data:; "
                "font-src 'self' fonts.gstatic.com; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > MAX_BODY_SIZE:
                    return Response(
                        content='{"detail":"Carga útil demasiado grande"}',
                        status_code=413,
                        media_type="application/json",
                    )
            except ValueError:
                return Response(
                    content='{"detail":"Encabezado content-length inválido"}',
                    status_code=400,
                    media_type="application/json",
                )
        return await call_next(request)


def create_app() -> FastAPI:
    if not settings.DEBUG and (not settings.SECRET_KEY or settings.SECRET_KEY == "change-in-production"):
        raise RuntimeError("SECRET_KEY insegura o no configurada. Defina una clave robusta en entorno.")
    if not settings.DEBUG and '*' in settings.CORS_ORIGINS:
        raise RuntimeError("CORS_ORIGINS no puede usar '*' en entornos no debug.")

    wire_application()
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/api/docs" if settings.DEBUG else None,
        redoc_url="/api/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.exception_handler(NotFoundError)
    async def _not_found(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @app.exception_handler(ValidationError)
    async def _validation(request: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    @app.exception_handler(ConflictError)
    async def _conflict(request: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(InternalError)
    async def _internal(request: Request, exc: InternalError):
        return JSONResponse(status_code=500, content={"detail": exc.detail})
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        max_age=600,
    )
    app.add_middleware(RequestSizeLimitMiddleware)
    app.include_router(build_api_router())

    @app.get("/api/health")
    def health_check():
        return {"status": "ok"}

    return app

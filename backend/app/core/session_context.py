"""Request-scoped context for the authenticated user.

Used by the Oracle connection helper to call DBMS_SESSION.SET_IDENTIFIER
so audit triggers (e.g. TRG_BITACORA_USUARIO_AIUD) can capture which user
is responsible for a change without threading the ID through every repo
call site.
"""
from __future__ import annotations

from contextvars import ContextVar

_current_user_id: ContextVar[int | None] = ContextVar(
    "current_user_id", default=None
)


def set_current_user_id(user_id: int | None) -> object:
    """Set the current user id for the active request.

    Returns a token that can be passed to ``reset_current_user_id`` to
    restore the previous value.
    """
    return _current_user_id.set(user_id)


def get_current_user_id() -> int | None:
    return _current_user_id.get()


def reset_current_user_id(token: object) -> None:
    try:
        _current_user_id.reset(token)  # type: ignore[arg-type]
    except ValueError:
        # FastAPI may finalize sync generator dependencies in a different
        # context/thread than the one that created the token.
        _current_user_id.set(None)


def clear_current_user_id() -> None:
    _current_user_id.set(None)

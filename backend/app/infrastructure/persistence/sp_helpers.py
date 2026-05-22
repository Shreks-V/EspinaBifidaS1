"""Helpers para invocar Stored Procedures de Oracle desde Python.

Centraliza:
  - La construcción de tipos colección SYS.ODCINUMBERLIST / ODCIVARCHAR2LIST.
  - El mapeo de errores RAISE_APPLICATION_ERROR(-20xxx) a excepciones de dominio
    con el mensaje limpio (sin el prefijo ORA-20xxx: ...).
"""
from __future__ import annotations

import re

import oracledb

from app.domain.exceptions import ConflictError, DomainError, InternalError, NotFoundError, ValidationError


_ORA_CODE_RE = re.compile(r"ORA-(\d{5}):\s*(.+?)(?:\nORA-|\Z)", re.DOTALL)


def make_number_list(conn, values):
    """Build a SYS.ODCINUMBERLIST bound to the given connection."""
    ty = conn.gettype("SYS.ODCINUMBERLIST")
    obj = ty.newobject()
    if values:
        obj.extend([int(v) if v is not None else None for v in values])
    return obj


def make_varchar_list(conn, values):
    """Build a SYS.ODCIVARCHAR2LIST bound to the given connection."""
    ty = conn.gettype("SYS.ODCIVARCHAR2LIST")
    obj = ty.newobject()
    if values:
        obj.extend([str(v) if v is not None else None for v in values])
    return obj


def make_decimal_list(conn, values):
    """Build a SYS.ODCINUMBERLIST for float/decimal values (prices, amounts)."""
    ty = conn.gettype("SYS.ODCINUMBERLIST")
    obj = ty.newobject()
    if values:
        obj.extend([round(float(v), 2) if v is not None else None for v in values])
    return obj


def parse_ora_error(exc: oracledb.DatabaseError) -> tuple[int | None, str]:
    """Extract (code, message) from an oracledb error.

    Returns (None, raw_text) if it can't identify an ORA-xxxxx code.
    """
    error_obj = exc.args[0] if exc.args else None
    code = getattr(error_obj, "code", None)
    msg = getattr(error_obj, "message", None) or str(exc)
    if isinstance(msg, str):
        match = _ORA_CODE_RE.search(msg)
        if match:
            clean = match.group(2).strip()
            return code, clean
    return code, msg


def _http_status_to_domain(status: int, detail: str) -> DomainError:
    """Map an HTTP-like status code to the corresponding domain exception."""
    if status == 404:
        return NotFoundError(detail)
    if status in (400, 422):
        return ValidationError(detail)
    if status == 409:
        return ConflictError(detail)
    return InternalError(detail)


def sp_error_to_http(
    exc: oracledb.DatabaseError,
    code_map: dict[int, tuple[int, str | None]],
    default_status: int = 500,
    default_detail: str = "Error interno del servidor",
) -> DomainError:
    """Map an oracledb error to a domain exception.

    ``code_map`` maps ORA-20xxx codes to ``(http_status, override_detail)``.
    ``override_detail`` can be None to use a safe generic message.
    Callers should ``raise sp_error_to_http(...)`` as before.
    """
    code, _ = parse_ora_error(exc)
    if code is not None and code in code_map:
        status, detail = code_map[code]
        return _http_status_to_domain(status, detail or "No se pudo completar la operación solicitada")
    return _http_status_to_domain(default_status, default_detail)

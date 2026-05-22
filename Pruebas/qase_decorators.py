"""Metadatos Qase TestOps para pytest (qase-pytest).

Cada caso manual en Qase muestra un código visible tipo ``FJ26SV-N``; el reporter
usa un **ID entero interno** del caso. Si defines ``QASE_ID_FJ26SV_N`` (solo el
número, como en la URL del caso en Qase), se añade ``@qase.id`` y los resultados
se adjuntan a ese caso existente. Sin la variable, solo se envían título y suite.
"""

from __future__ import annotations

import os
from collections.abc import Callable
from typing import TypeVar

from qase.pytest import qase

F = TypeVar("F", bound=Callable[..., object])

# Qase TestOps solo acepta: unknown | e2e | api | unit (minúsculas).
_LAYER_ALIASES: dict[str, str] = {
    "api": "api",
    "API": "api",
    "e2e": "e2e",
    "E2E": "e2e",
    "unit": "unit",
    "unknown": "unknown",
    "Contrato frontend": "api",
}


def _qase_layer(layer: str) -> str:
    return _LAYER_ALIASES.get(layer, "api")


def qase_case(
    suite: str, fj_code: str, title_es: str, *, layer: str = "api"
) -> Callable[[F], F]:
    """Suite + título con ``FJ26SV-*``; ID numérico opcional vía entorno."""

    env_key = "QASE_ID_" + fj_code.replace("-", "_").upper()

    def _wrap(fn: F) -> F:
        decorated: Callable[..., object] = qase.suite(suite)(fn)
        decorated = qase.title(f"{fj_code} — {title_es}")(decorated)
        decorated = qase.fields(("layer", _qase_layer(layer)))(decorated)
        raw = os.environ.get(env_key, "").strip()
        if raw.isdigit():
            decorated = qase.id(int(raw))(decorated)
        return decorated  # type: ignore[return-value]

    return _wrap

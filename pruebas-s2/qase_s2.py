"""Decoradores Qase para Sprint 2: lee IDs generados por ``qase_sync_sprint2.py``."""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any, TypeVar

from qase.pytest import qase

F = TypeVar("F", bound=Callable[..., object])

_IDS_PATH = Path(__file__).resolve().parent / "pruebas_s2_qase_ids.json"
_ids_cache: dict[str, int] | None = None


def _load_qase_ids() -> dict[str, int]:
    global _ids_cache
    if _ids_cache is not None:
        return _ids_cache
    if not _IDS_PATH.is_file():
        _ids_cache = {}
        return _ids_cache
    raw = json.loads(_IDS_PATH.read_text(encoding="utf-8"))
    out: dict[str, int] = {}
    if isinstance(raw, dict):
        for k, v in raw.items():
            if isinstance(v, int):
                out[str(k)] = v
            elif isinstance(v, str) and v.isdigit():
                out[str(k)] = int(v)
    _ids_cache = out
    return _ids_cache


def qase_s2_case(suite_title: str, automation_id: str, title_es: str) -> Callable[[F], F]:
    """Suite HU + título; enlaza ``@qase.id`` si existe en ``pruebas_s2_qase_ids.json``."""

    def _wrap(fn: F) -> F:
        decorated: Any = qase.suite(suite_title)(fn)
        decorated = qase.title(f"[S2:{automation_id}] {title_es}")(decorated)
        decorated = qase.fields(("layer", "api"), ("description", f"automation_id={automation_id}"))(decorated)
        nid = _load_qase_ids().get(automation_id)
        if nid is not None:
            decorated = qase.id(nid)(decorated)
        return decorated  # type: ignore[return-value]

    return _wrap

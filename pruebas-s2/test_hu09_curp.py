"""HU-09 — Verificación y validación de CURP (formato; duplicado en BD pendiente de API)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.application.preregistro.dtos import PreRegistroCreate

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-09 — CURP",
    "hu09_curp_formato_valido",
    "CURP con formato oficial mexicano aceptado en DTO",
)
def test_hu09_curp_formato_oficial_valido():
    m = PreRegistroCreate(
        nombre="Juan",
        apellido_paterno="Pérez",
        curp="GODE561231HDFRRN09",
        tipos_espina=[1],
    )
    assert m.curp == "GODE561231HDFRRN09"


@qase_s2_case(
    "[S2] HU-09 — CURP",
    "hu09_curp_formato_invalido",
    "CURP con formato inválido rechazado en DTO",
)
def test_hu09_curp_formato_invalido_rechazado():
    with pytest.raises(ValidationError) as ei:
        PreRegistroCreate(
            nombre="Juan",
            apellido_paterno="Pérez",
            curp="INVALIDO",
            tipos_espina=[1],
        )
    assert "CURP" in str(ei.value).upper() or "curp" in str(ei.value).lower()


@qase_s2_case(
    "[S2] HU-09 — CURP",
    "hu09_curp_duplicado_api",
    "Verificación CURP ya existente vía API dedicada",
)
def test_hu09_verificacion_curp_duplicado_endpoint_pendiente():
    pytest.skip(
        "HU-09: no hay endpoint público documentado para 'CURP ya registrado'; "
        "añadir prueba cuando exista ruta (p. ej. GET/POST /api/beneficiarios/validar-curp)."
    )

"""HU-17 — Generación PDF de cita (comprobante de servicio)."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-17 — PDF cita",
    "hu17_comprobante_pdf_valido",
    "Generar comprobante PDF para cita existente",
)
def test_hu17_comprobante_cita_pdf(s2_client, s2_auth):
    r = s2_client.get("/api/exportaciones/cita/1/comprobante", headers=s2_auth)
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"
    assert "pdf" in (r.headers.get("content-type") or "").lower()


@qase_s2_case(
    "[S2] HU-17 — PDF cita",
    "hu17_comprobante_cita_inexistente",
    "Cita inexistente: error controlado",
)
def test_hu17_comprobante_cita_inexistente(s2_client, s2_auth):
    r = s2_client.get("/api/exportaciones/cita/99999/comprobante", headers=s2_auth)
    assert r.status_code == 404

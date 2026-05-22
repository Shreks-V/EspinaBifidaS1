"""HU-11 — Generación de reportes (JSON y exportación PDF)."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-11 — Reportes",
    "hu11_resumen_json",
    "Reporte resumen JSON",
)
def test_hu11_reporte_resumen(s2_client, s2_auth):
    r = s2_client.get("/api/reportes/resumen", headers=s2_auth)
    assert r.status_code == 200
    body = r.json()
    assert "total_beneficiarios" in body


@qase_s2_case(
    "[S2] HU-11 — Reportes",
    "hu11_pdf_resumen",
    "Exportar reporte PDF (resumen)",
)
def test_hu11_exportar_reporte_pdf(s2_client, s2_auth):
    r = s2_client.get("/api/exportaciones/reportes/pdf?tipo=resumen", headers=s2_auth)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("application/pdf") or "pdf" in (
        r.headers.get("content-type") or ""
    ).lower()
    assert r.content[:4] == b"%PDF"

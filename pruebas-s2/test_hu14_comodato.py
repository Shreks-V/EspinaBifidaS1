"""HU-14 — Gestión de comodato."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-14 — Comodato",
    "hu14_listar_comodatos",
    "Listar comodatos",
)
def test_hu14_listar_comodatos(s2_client, s2_auth):
    r = s2_client.get("/api/almacen/comodatos", headers=s2_auth)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@qase_s2_case(
    "[S2] HU-14 — Comodato",
    "hu14_crear_comodato",
    "Alta de comodato con datos mínimos",
)
def test_hu14_crear_comodato(s2_client, s2_auth_encargado):
    payload = {
        "id_equipo": 1,
        "id_paciente": 1,
        "fecha_prestamo": "2026-05-01",
        "estatus": "PRESTADO",
        "monto_total": 500.0,
        "monto_pagado": 0.0,
        "saldo_pendiente": 500.0,
        "exento_pago": "N",
    }
    r = s2_client.post("/api/almacen/comodatos", json=payload, headers=s2_auth_encargado)
    assert r.status_code == 201, r.text
    row = r.json()
    assert row.get("id_comodato")
    assert str(row.get("folio_comodato", "")).startswith("COM-")


@qase_s2_case(
    "[S2] HU-14 — Comodato",
    "hu14_contrato_pdf",
    "Descargar contrato PDF de comodato",
)
def test_hu14_contrato_comodato_pdf(s2_client, s2_auth_encargado):
    cre = s2_client.post(
        "/api/almacen/comodatos",
        json={
            "id_equipo": 2,
            "id_paciente": 1,
            "fecha_prestamo": "2026-05-02",
            "estatus": "PRESTADO",
            "monto_total": 100.0,
            "monto_pagado": 0.0,
            "saldo_pendiente": 100.0,
            "exento_pago": "N",
        },
        headers=s2_auth_encargado,
    )
    assert cre.status_code == 201
    cid = cre.json()["id_comodato"]
    r = s2_client.get(f"/api/exportaciones/comodato/{cid}/contrato", headers=s2_auth_encargado)
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"

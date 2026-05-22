"""HU-15 — Cálculo automático de saldo pendiente y actualización."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-15 — Saldo pendiente",
    "hu15_cobro_parcial_saldo",
    "Cobro parcial: saldo pendiente y monto pagado coherentes",
)
def test_hu15_cobro_parcial_saldo_pendiente(s2_client, s2_auth):
    payload = {
        "id_paciente": 1,
        "monto_total": 400.0,
        "monto_pagado": 150.0,
        "saldo_pendiente": 250.0,
        "exento_pago": "N",
        "metodos_pago": [{"id_metodo_pago": 1, "monto": 150.0}],
    }
    r = s2_client.post("/api/recibos", json=payload, headers=s2_auth)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["monto_total"] == 400.0
    assert body["monto_pagado"] == 150.0
    assert body["saldo_pendiente"] == 250.0


@qase_s2_case(
    "[S2] HU-15 — Saldo pendiente",
    "hu15_cobro_completo_saldo_cero",
    "Cobro total: saldo pendiente en cero",
)
def test_hu15_cobro_completo_saldo_cero(s2_client, s2_auth):
    payload = {
        "id_paciente": 2,
        "monto_total": 300.0,
        "exento_pago": "N",
        "metodos_pago": [{"id_metodo_pago": 1, "monto": 300.0}],
    }
    r = s2_client.post("/api/recibos", json=payload, headers=s2_auth)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["monto_pagado"] == 300.0
    assert body["saldo_pendiente"] == 0.0

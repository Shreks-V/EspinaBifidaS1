"""Pruebas SV-44 a SV-50 — módulo Recibos y cobros (API + comprobación mínima UI SV-50)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.security.adapters import JwtAccessTokenIssuer

BASE = "/api/recibos"
_RECIBOS_COMPONENT = (
    Path(__file__).resolve().parents[1]
    / "frontend"
    / "src"
    / "app"
    / "pages"
    / "recibos"
    / "recibos.component.ts"
)


def _jwt_recepcionista() -> str:
    return JwtAccessTokenIssuer().issue(
        {
            "sub": "recep-ben@test.local",
            "rol": "RECEPCIONISTA",
            "nombre": "Recepción",
            "id_usuario": 2,
        }
    )


def _jwt_administrador() -> str:
    return JwtAccessTokenIssuer().issue(
        {
            "sub": "admin-ben@test.local",
            "rol": "ADMINISTRADOR",
            "nombre": "Admin",
            "id_usuario": 1,
        }
    )


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _h_recep() -> dict[str, str]:
    return _auth(_jwt_recepcionista())


def _h_adm() -> dict[str, str]:
    return _auth(_jwt_administrador())


@pytest.fixture
def recibos_client(recibos_client_factory) -> TestClient:
    return recibos_client_factory()


def test_sv44_listar_recibos(recibos_client: TestClient):
    r = recibos_client.get(BASE, headers=_h_recep())
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    row = data[0]
    for key in (
        "id_venta",
        "folio_venta",
        "id_paciente",
        "monto_total",
        "monto_pagado",
        "saldo_pendiente",
        "exento_pago",
        "cancelada",
        "nombre_paciente",
        "folio_paciente",
    ):
        assert key in row


def test_sv45_filtrar_folio_beneficiario_fechas(recibos_client: TestClient):
    """Filtros vía query en la API (la pantalla Recibos aplica filtros adicionales solo en cliente)."""
    h = _h_recep()

    r_folio = recibos_client.get(BASE, headers=h, params={"search": "2025-200"})
    assert r_folio.status_code == 200
    assert len(r_folio.json()) == 1
    assert r_folio.json()[0]["folio_venta"] == "VTA-2025-200"

    r_nom = recibos_client.get(BASE, headers=h, params={"search": "María"})
    assert r_nom.status_code == 200
    assert len(r_nom.json()) == 1
    assert r_nom.json()[0]["id_paciente"] == 2

    r_pac = recibos_client.get(BASE, headers=h, params={"id_paciente": 3})
    assert r_pac.status_code == 200
    assert len(r_pac.json()) == 1
    assert r_pac.json()[0]["folio_venta"] == "VTA-2025-300"

    r_fecha = recibos_client.get(
        BASE,
        headers=h,
        params={"fecha_inicio": "2025-01-01", "fecha_fin": "2025-01-31"},
    )
    assert r_fecha.status_code == 200
    folios = {x["folio_venta"] for x in r_fecha.json()}
    assert folios == {"VTA-2025-100"}


def test_sv46_nuevo_cobro_un_metodo_total_y_saldo(recibos_client: TestClient):
    payload = {
        "id_paciente": 1,
        "monto_total": 350.0,
        "monto_pagado": 0,
        "saldo_pendiente": 0,
        "exento_pago": "N",
        "metodos_pago": [{"id_metodo_pago": 1, "monto": 350.0}],
    }
    r = recibos_client.post(BASE, json=payload, headers=_h_recep())
    assert r.status_code == 201
    body = r.json()
    assert body["monto_total"] == 350.0
    assert body["monto_pagado"] == 350.0
    assert body["saldo_pendiente"] == 0.0
    assert len(body.get("metodos_pago") or []) == 1
    assert body["metodos_pago"][0]["nombre"] == "EFECTIVO"


def test_sv47_nuevo_cobro_varios_metodos_pago(recibos_client: TestClient):
    payload = {
        "id_paciente": 2,
        "monto_total": 400.0,
        "exento_pago": "N",
        "metodos_pago": [
            {"id_metodo_pago": 1, "monto": 100.0},
            {"id_metodo_pago": 2, "monto": 300.0},
        ],
    }
    r = recibos_client.post(BASE, json=payload, headers=_h_adm())
    assert r.status_code == 201
    body = r.json()
    assert body["monto_pagado"] == 400.0
    assert body["saldo_pendiente"] == 0.0
    nombres = {m["nombre"] for m in body["metodos_pago"]}
    assert nombres == {"EFECTIVO", "TARJETA"}


def test_sv48_caso_exento_pago(recibos_client: TestClient):
    payload = {
        "id_paciente": 3,
        "monto_total": 120.0,
        "exento_pago": "S",
        "metodos_pago": [{"id_metodo_pago": 4, "monto": 120.0}],
    }
    r = recibos_client.post(BASE, json=payload, headers=_h_recep())
    assert r.status_code == 201
    body = r.json()
    assert body["exento_pago"] == "S"
    assert body["saldo_pendiente"] == 0.0
    assert body["monto_pagado"] == 120.0
    assert body["metodos_pago"][0]["nombre"] == "EXENTO"


def test_sv49_cancelar_recibo_motivo_y_listado(recibos_client: TestClient):
    h = _h_recep()
    cre = recibos_client.post(
        BASE,
        headers=h,
        json={
            "id_paciente": 1,
            "monto_total": 50.0,
            "exento_pago": "N",
            "metodos_pago": [{"id_metodo_pago": 1, "monto": 50.0}],
        },
    )
    assert cre.status_code == 201
    id_venta = cre.json()["id_venta"]
    motivo = "Error de captura en cita"
    can = recibos_client.put(
        f"{BASE}/{id_venta}/cancelar",
        headers=h,
        params={"motivo": motivo},
    )
    assert can.status_code == 200
    assert can.json()["cancelada"] == "S"
    assert can.json()["motivo_cancelacion"] == motivo

    lst = recibos_client.get(BASE, headers=h)
    assert lst.status_code == 200
    row = next(x for x in lst.json() if x["id_venta"] == id_venta)
    assert row["cancelada"] == "S"
    assert row["motivo_cancelacion"] == motivo


def test_sv50_validacion_api_sin_beneficiario_sin_monto_sin_metodos(recibos_client: TestClient):
    h = _h_recep()

    r0 = recibos_client.post(
        BASE,
        headers=h,
        json={
            "id_paciente": 0,
            "monto_total": 100.0,
            "exento_pago": "N",
            "metodos_pago": [{"id_metodo_pago": 1, "monto": 100.0}],
        },
    )
    assert r0.status_code == 400

    r_monto = recibos_client.post(
        BASE,
        headers=h,
        json={
            "id_paciente": 1,
            "monto_total": 0,
            "exento_pago": "N",
            "metodos_pago": [{"id_metodo_pago": 1, "monto": 10.0}],
        },
    )
    assert r_monto.status_code == 400

    r_met = recibos_client.post(
        BASE,
        headers=h,
        json={
            "id_paciente": 1,
            "monto_total": 200.0,
            "exento_pago": "N",
            "metodos_pago": [],
        },
    )
    assert r_met.status_code == 400


def test_sv50_ui_guardarCobro_validaciones_en_fuente():
    """La UI no confirma cobro sin paciente, sin monto válido o sin métodos (exento N)."""
    src = _RECIBOS_COMPONENT.read_text(encoding="utf-8")
    assert "if (!this.nuevoCobro.id_paciente)" in src
    assert "Selecciona un paciente." in src
    assert "this.nuevoCobro.monto_total <= 0" in src
    assert "El monto total debe ser mayor a 0." in src
    assert "metodosValidos.length === 0" in src
    assert "Agrega al menos un metodo de pago con monto." in src


def test_stats_y_metodos_pago_disponibles(recibos_client: TestClient):
    r_stats = recibos_client.get(f"{BASE}/stats", headers=_h_recep())
    assert r_stats.status_code == 200
    s = r_stats.json()
    assert "monto_total_sum" in s
    assert "pendientes" in s

    r_mp = recibos_client.get(f"{BASE}/metodos-pago", headers=_h_recep())
    assert r_mp.status_code == 200
    nombres = {m["nombre"] for m in r_mp.json()}
    assert "EFECTIVO" in nombres and "EXENTO" in nombres

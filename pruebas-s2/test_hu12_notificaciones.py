"""HU-12 — Notificaciones agregadas."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-12 — Notificaciones",
    "hu12_lista_vacia_o_json",
    "GET notificaciones devuelve lista JSON",
)
def test_hu12_notificaciones_lista(s2_client, s2_auth):
    r = s2_client.get("/api/notificaciones", headers=s2_auth)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


@qase_s2_case(
    "[S2] HU-12 — Notificaciones",
    "hu12_alertas_almacen_y_citas",
    "Notificaciones incluyen citas hoy y alertas de almacén cuando aplican",
)
def test_hu12_notificaciones_con_alertas(s2_client_notificaciones_rich):
    client = s2_client_notificaciones_rich
    login = client.post(
        "/api/auth/login",
        json={"correo": "admin-s2@test.local", "password": "adm123"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    r = client.get(
        "/api/notificaciones",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    ids = {x.get("id") for x in items}
    assert "citas_hoy" in ids
    assert "stock_bajo" in ids
    assert "caducidad" in ids

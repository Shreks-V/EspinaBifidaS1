"""HU-10 — Gestión de almacén y servicios."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-10 — Almacén",
    "hu10_listar_productos",
    "Listar productos autenticado",
)
def test_hu10_listar_productos(s2_client, s2_auth):
    r = s2_client.get("/api/almacen/productos", headers=s2_auth)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@qase_s2_case(
    "[S2] HU-10 — Almacén",
    "hu10_stats",
    "Estadísticas de almacén",
)
def test_hu10_stats(s2_client, s2_auth):
    r = s2_client.get("/api/almacen/stats", headers=s2_auth)
    assert r.status_code == 200
    body = r.json()
    assert "total_productos" in body


@qase_s2_case(
    "[S2] HU-10 — Almacén",
    "hu10_crear_producto_encargado",
    "Crear producto con rol encargado de almacén",
)
def test_hu10_crear_producto_encargado(s2_client, s2_auth_encargado):
    payload = {
        "clave_interna": "S2-PRUEBA-001",
        "nombre": "Producto prueba S2",
        "tipo_producto": "MEDICAMENTO",
        "activo": "S",
        "cantidad_disponible": 10,
        "nivel_minimo": 2,
    }
    r = s2_client.post("/api/almacen/productos", json=payload, headers=s2_auth_encargado)
    assert r.status_code == 201, r.text
    row = r.json()
    assert row.get("clave_interna") == "S2-PRUEBA-001"
    assert row.get("id_producto")


@qase_s2_case(
    "[S2] HU-10 — Almacén",
    "hu10_listar_servicios",
    "Listar servicios",
)
def test_hu10_listar_servicios(s2_client, s2_auth):
    r = s2_client.get("/api/almacen/servicios", headers=s2_auth)
    assert r.status_code == 200
    assert isinstance(r.json(), list)

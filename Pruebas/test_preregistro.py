"""Pruebas SV-24 a SV-30 — módulo Pre-Registro (API; UI donde aplica vía contrato)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.security.adapters import JwtAccessTokenIssuer

BASE = "/api/preregistro"


def _jwt_admin() -> str:
    return JwtAccessTokenIssuer().issue(
        {
            "sub": "admin-ben@test.local",
            "rol": "ADMINISTRADOR",
            "nombre": "Admin",
            "id_usuario": 1,
        }
    )


def _h_admin() -> dict[str, str]:
    return {"Authorization": f"Bearer {_jwt_admin()}"}


def _payload_paso1() -> dict:
    return {
        "nombre": "Público",
        "apellido_paterno": "Feliz",
        "curp": "PUFE100101HDFXXX01",
        "tipos_espina": [1],
        "paso_actual": 1,
    }


@pytest.fixture
def pre_client(preregistro_client_factory) -> TestClient:
    return preregistro_client_factory()


def test_sv24_preregistro_publico_flujo_feliz_sin_login(pre_client: TestClient):
    r = pre_client.post(BASE, json=_payload_paso1())
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("estatus_registro") == "PENDIENTE"
    assert body.get("folio", "").startswith("PRE-")
    assert isinstance(body.get("id_paciente"), int)


def test_sv25_avance_pasos_indicador_paso_actual_coherente(pre_client: TestClient):
    c = pre_client.post(BASE, json=_payload_paso1())
    assert c.status_code == 201
    pid = c.json()["id_paciente"]

    p2 = {
        **_payload_paso1(),
        "nombre": "Público",
        "paso_actual": 2,
        "fecha_nacimiento": "2015-03-20",
        "genero": "Masculino",
    }
    u2 = pre_client.put(f"{BASE}/{pid}", json=p2)
    assert u2.status_code == 200, u2.text
    assert u2.json().get("paso_actual") == 2

    g = pre_client.get(f"{BASE}/{pid}")
    assert g.status_code == 200
    assert g.json().get("paso_actual") == 2


def test_sv26_no_avanzar_paso_con_datos_incompletos(pre_client: TestClient):
    c = pre_client.post(BASE, json=_payload_paso1())
    pid = c.json()["id_paciente"]

    bad_paso3 = {
        **_payload_paso1(),
        "paso_actual": 3,
        "fecha_nacimiento": "2015-03-20",
        "ciudad": "",
        "correo_electronico": "",
    }
    r = pre_client.put(f"{BASE}/{pid}", json=bad_paso3)
    assert r.status_code == 400
    assert "correo" in (r.json().get("detail") or "").lower()

    sin_tipos = {k: v for k, v in _payload_paso1().items() if k != "tipos_espina"}
    sin_tipos["tipos_espina"] = []
    r2 = pre_client.post(BASE, json=sin_tipos)
    assert r2.status_code == 400
    assert "espina" in (r2.json().get("detail") or "").lower()


def test_sv27_respuesta_confirmacion_tras_envio_exitoso(pre_client: TestClient):
    r = pre_client.post(BASE, json=_payload_paso1())
    assert r.status_code == 201
    data = r.json()
    assert data.get("estatus_registro") == "PENDIENTE"
    assert data.get("nombre") == "Público"
    assert data.get("id_paciente") is not None


def test_sv28_catalogos_publicos_accesibles_tras_flujo(pre_client: TestClient):
    t0 = pre_client.get(f"{BASE}/tipos-espina")
    assert t0.status_code == 200
    assert len(t0.json()) >= 1

    pre_client.post(BASE, json=_payload_paso1())

    t1 = pre_client.get(f"{BASE}/tipos-espina")
    d1 = pre_client.get(f"{BASE}/tipos-documento")
    assert t1.status_code == 200 and d1.status_code == 200


def test_sv29_listar_solicitudes_panel_interno(pre_client: TestClient):
    pre_client.post(BASE, json=_payload_paso1())
    r = pre_client.get(BASE, headers=_h_admin())
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    assert items[0].get("estatus_registro") in ("PENDIENTE", "RECHAZADO")

    filtro = pre_client.get(
        f"{BASE}", headers=_h_admin(), params={"estatus": "PENDIENTE"}
    )
    assert filtro.status_code == 200
    assert all(x.get("estatus_registro") == "PENDIENTE" for x in filtro.json())


def test_sv30_aprobar_rechazar_reflejo_estado(pre_client: TestClient):
    a = pre_client.post(BASE, json=_payload_paso1())
    b = pre_client.post(
        BASE,
        json={
            **_payload_paso1(),
            "nombre": "Otro",
            "curp": "OTRO100102HDFYYY02",
        },
    )
    assert a.status_code == 201 and b.status_code == 201
    id_a = a.json()["id_paciente"]
    id_b = b.json()["id_paciente"]

    ra = pre_client.post(
        f"{BASE}/{id_a}/aprobar",
        headers=_h_admin(),
        json={"tipo_cuota": "A"},
    )
    assert ra.status_code == 200, ra.text
    assert ra.json().get("message")
    assert ra.json()["preregistro"].get("estatus_registro") == "APROBADO"
    assert str(ra.json()["preregistro"].get("folio", "")).startswith("BEN-")

    rb = pre_client.post(f"{BASE}/{id_b}/rechazar", headers=_h_admin())
    assert rb.status_code == 200
    assert rb.json()["preregistro"].get("estatus_registro") == "RECHAZADO"

    ga = pre_client.get(f"{BASE}/{id_a}")
    gb = pre_client.get(f"{BASE}/{id_b}")
    assert ga.json().get("estatus_registro") == "APROBADO"
    assert gb.json().get("estatus_registro") == "RECHAZADO"

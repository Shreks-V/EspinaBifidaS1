"""Pruebas SV-31, SV-32, SV-33, SV-34, SV-35, SV-37 — Citas y agenda (API)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.security.adapters import JwtAccessTokenIssuer

from Pruebas.qase_decorators import qase_case
from Pruebas.support_citas import InMemoryCitasRepository, seed_cita_hoy

BASE = "/api/citas"


def _h_recep() -> dict[str, str]:
    tok = JwtAccessTokenIssuer().issue(
        {
            "sub": "recep-ben@test.local",
            "rol": "RECEPCIONISTA",
            "nombre": "Recepción",
            "id_usuario": 2,
        }
    )
    return {"Authorization": f"Bearer {tok}"}


def _hoy_iso_t(hour: int = 11, minute: int = 0) -> str:
    return f"{date.today().isoformat()}T{hour:02d}:{minute:02d}:00"


@pytest.fixture
def cita_client(citas_client_factory) -> TestClient:
    return citas_client_factory()


@qase_case("Citas y agenda", "FJ26SV-37", "Citas del día vacías: sin error de sistema")
def test_sv37_citas_hoy_vacias_sin_error(citas_client_factory):
    client = citas_client_factory(InMemoryCitasRepository())
    r = client.get(f"{BASE}/hoy", headers=_h_recep())
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 0
    assert data["citas"] == []
    assert data["fecha"] == date.today().isoformat()


@qase_case("Citas y agenda", "FJ26SV-31", "Visualizar citas del día")
def test_sv31_visualizar_citas_del_dia(citas_client_factory):
    seed = [seed_cita_hoy(id_cita=1, hora="09:00:00"), seed_cita_hoy(id_cita=2, hora="15:30:00")]
    client = citas_client_factory(InMemoryCitasRepository(seed_citas=seed))
    r = client.get(f"{BASE}/hoy", headers=_h_recep())
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert len(body["citas"]) == 2
    assert body["programadas"] == 2


@qase_case("Citas y agenda", "FJ26SV-32", "Crear cita para el día actual con datos válidos")
def test_sv32_crear_cita_dia_actual_datos_validos(cita_client: TestClient):
    body = {
        "id_paciente": 1,
        "fecha_hora": _hoy_iso_t(14, 30),
        "estatus": "PROGRAMADA",
        "notas": "Primera visita",
        "servicios": [{"id_servicio": 1, "cantidad": 1}],
    }
    r = cita_client.post(BASE, json=body, headers=_h_recep())
    assert r.status_code == 201, r.text
    row = r.json()
    assert row.get("estatus") == "PROGRAMADA"
    assert row.get("id_cita")
    assert _hoy_iso_t(14, 30)[:10] in str(row.get("fecha_hora", ""))


@qase_case("Citas y agenda", "FJ26SV-33", "Marcar cita como completada y ver estado actualizado")
def test_sv33_completar_cita_estado_actualizado(cita_client: TestClient):
    body = {
        "id_paciente": 1,
        "fecha_hora": _hoy_iso_t(16, 0),
        "estatus": "PROGRAMADA",
        "servicios": [{"id_servicio": 1, "cantidad": 1}],
    }
    cid = cita_client.post(BASE, json=body, headers=_h_recep()).json()["id_cita"]
    ok = cita_client.put(f"{BASE}/{cid}/completar", headers=_h_recep())
    assert ok.status_code == 200
    assert ok.json().get("estatus") == "COMPLETADA"
    g = cita_client.get(f"{BASE}/{cid}", headers=_h_recep())
    assert g.status_code == 200
    assert g.json().get("estatus") == "COMPLETADA"


@qase_case("Citas y agenda", "FJ26SV-34", "Cancelar cita y ver motivo o estado")
def test_sv34_cancelar_cita_motivo_o_estado(cita_client: TestClient):
    body = {
        "id_paciente": 1,
        "fecha_hora": _hoy_iso_t(17, 0),
        "estatus": "PROGRAMADA",
        "servicios": [{"id_servicio": 2, "cantidad": 1}],
    }
    cid = cita_client.post(BASE, json=body, headers=_h_recep()).json()["id_cita"]
    r = cita_client.put(f"{BASE}/{cid}/cancelar", headers=_h_recep())
    assert r.status_code == 200
    data = r.json()
    assert data.get("estatus") == "CANCELADA"
    assert "cancel" in (data.get("notas") or "").lower()
    assert cita_client.get(f"{BASE}/{cid}", headers=_h_recep()).json().get("estatus") == "CANCELADA"


@qase_case("Citas y agenda", "FJ26SV-35", "Filtros de citas (fecha, estatus, paciente, búsqueda)")
def test_sv35_filtros_listado_citas(citas_client_factory):
    manana = (date.today() + timedelta(days=1)).isoformat()
    seed = [
        seed_cita_hoy(
            id_cita=1,
            id_paciente=1,
            hora="10:00:00",
            estatus="PROGRAMADA",
            notas="Dr. López revisión",
        ),
        {
            **seed_cita_hoy(
                id_cita=2,
                id_paciente=2,
                hora="11:00:00",
                estatus="COMPLETADA",
            ),
            "fecha_hora": f"{manana}T11:00:00",
        },
    ]
    client = citas_client_factory(InMemoryCitasRepository(seed_citas=seed))
    h = _h_recep()
    hoy = date.today().isoformat()

    r_fecha = client.get(BASE, headers=h, params={"fecha": hoy})
    assert r_fecha.status_code == 200
    assert len(r_fecha.json()) == 1
    assert r_fecha.json()[0]["id_cita"] == 1

    r_est = client.get(BASE, headers=h, params={"estatus": "COMPLETADA"})
    assert len(r_est.json()) == 1
    assert r_est.json()[0]["id_cita"] == 2

    r_pac = client.get(BASE, headers=h, params={"id_paciente": 2})
    assert len(r_pac.json()) == 1
    assert r_pac.json()[0]["id_paciente"] == 2

    r_bus = client.get(BASE, headers=h, params={"busqueda": "López"})
    assert len(r_bus.json()) == 1
    assert r_bus.json()[0]["id_cita"] == 1

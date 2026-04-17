"""Pruebas SV-7 a SV-17 — módulo Beneficiarios (API)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.security.adapters import JwtAccessTokenIssuer

BASE = "/api/beneficiarios"


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
def ben_client(beneficiarios_client_factory) -> TestClient:
    return beneficiarios_client_factory()


def test_sv7_listar_sin_filtros(ben_client: TestClient):
    r = ben_client.get(BASE, headers=_h_recep())
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 3
    folios = {row["folio"] for row in data}
    assert folios == {"BEN-000001", "BEN-000002", "BEN-000003"}


def test_sv8_filtrar_por_criterios(ben_client: TestClient):
    h = _h_recep()

    r_gen = ben_client.get(BASE, headers=h, params={"genero": "Femenino"})
    assert r_gen.status_code == 200
    assert len(r_gen.json()) == 2

    r_mem = ben_client.get(BASE, headers=h, params={"membresia_estatus": "VENCIDO"})
    assert r_mem.status_code == 200
    assert len(r_mem.json()) == 1
    assert r_mem.json()[0]["folio"] == "BEN-000002"

    r_bus = ben_client.get(BASE, headers=h, params={"busqueda": "Monterrey"})
    assert r_bus.status_code == 200
    assert len(r_bus.json()) == 2
    assert {x["folio"] for x in r_bus.json()} == {"BEN-000001", "BEN-000003"}

    r_nom = ben_client.get(BASE, headers=h, params={"nombre": "mar"})
    assert r_nom.status_code == 200
    assert len(r_nom.json()) == 1
    assert r_nom.json()[0]["folio"] == "BEN-000002"


def test_sv9_alta_datos_minimos(ben_client: TestClient):
    body = {
        "nombre": "Pedro",
        "apellido_paterno": "Nuevo",
        "curp": "NUOP100101HDFXXX01",
    }
    r = ben_client.post(BASE, json=body, headers=_h_recep())
    assert r.status_code == 201
    row = r.json()
    assert row["nombre"] == "Pedro"
    assert row["apellido_paterno"] == "Nuevo"
    assert row["curp"] == "NUOP100101HDFXXX01"
    assert row["folio"].startswith("BEN-")
    assert isinstance(row["id_paciente"], int)


def test_sv10_alta_datos_completos(ben_client: TestClient):
    body = {
        "nombre": "Luisa",
        "apellido_paterno": "Completa",
        "apellido_materno": "Campos",
        "genero": "Femenino",
        "fecha_nacimiento": "2019-07-15",
        "curp": "CACL190715MDFLRS09",
        "nombre_padre_madre": "Tutor Uno",
        "direccion": "Av. Siempre Viva 742",
        "colonia": "Centro",
        "ciudad": "Monterrey",
        "estado": "Nuevo León",
        "codigo_postal": "64000",
        "telefono_casa": None,
        "telefono_celular": "8112223344",
        "correo_electronico": "luisa.completa@example.com",
        "en_emergencia_avisar_a": "Padre",
        "telefono_emergencia": "8112223355",
        "municipio_nacimiento": "Monterrey",
        "estado_nacimiento": "NL",
        "hospital_nacimiento": "Hosp X",
        "tipo_sangre": "A+",
        "usa_valvula": "S",
        "notas_adicionales": "Prueba SV-10",
        "membresia_estatus": "ACTIVO",
        "tipo_cuota": "B",
        "activo": "S",
        "tipos_espina": [1, 2],
    }
    r = ben_client.post(BASE, json=body, headers=_h_recep())
    assert r.status_code == 201, r.text
    row = r.json()
    assert row["ciudad"] == "Monterrey"
    assert row["correo_electronico"] == "luisa.completa@example.com"
    assert row["tipo_cuota"] == "B"
    assert len(row.get("tipos_espina") or []) == 2
    ids = {t["id_tipo_espina"] for t in row["tipos_espina"]}
    assert ids == {1, 2}


def test_sv11_edicion_y_persistencia(ben_client: TestClient):
    h = _h_recep()
    folio = "BEN-000001"
    get0 = ben_client.get(f"{BASE}/{folio}", headers=h)
    assert get0.status_code == 200
    curp = get0.json()["curp"]
    body = get0.json()
    body.pop("id_paciente", None)
    body.pop("folio", None)
    body.pop("fecha_alta", None)
    body.pop("fecha_registro", None)
    body.pop("tipos_espina", None)
    body.pop("fecha_inicio_membresia", None)
    body.pop("fecha_vencimiento_membresia", None)
    body.pop("tutor", None)
    body.pop("relacion_parentezco", None)
    body["nombre"] = "Juan Carlos"
    body["notas_adicionales"] = "Editado en prueba"
    r_put = ben_client.put(f"{BASE}/{folio}", json=body, headers=h)
    assert r_put.status_code == 200, r_put.text
    assert r_put.json()["nombre"] == "Juan Carlos"
    r_get = ben_client.get(f"{BASE}/{folio}", headers=h)
    assert r_get.status_code == 200
    assert r_get.json()["nombre"] == "Juan Carlos"
    assert r_get.json()["notas_adicionales"] == "Editado en prueba"
    assert r_get.json()["curp"] == curp


def test_sv12_validacion_campos_obligatorios_vacios(ben_client: TestClient):
    r = ben_client.post(BASE, json={"nombre": "X"}, headers=_h_recep())
    assert r.status_code == 422


def test_sv13_validacion_formatos_invalidos(ben_client: TestClient):
    h = _h_recep()

    r_type = ben_client.post(
        BASE,
        json={"nombre": 123, "apellido_paterno": "Z", "curp": "CURP12345678901234"},
        headers=h,
    )
    assert r_type.status_code == 422

    r_mail = ben_client.post(
        BASE,
        json={
            "nombre": "Bad",
            "apellido_paterno": "Mail",
            "curp": "MAIL010101HDFXXX01",
            "correo_electronico": "no-es-correo",
        },
        headers=h,
    )
    assert r_mail.status_code == 422

    r_date = ben_client.post(
        BASE,
        json={
            "nombre": "Bad",
            "apellido_paterno": "Date",
            "curp": "DATE010101HDFXXX01",
            "fecha_nacimiento": "32-13-2099",
        },
        headers=h,
    )
    assert r_date.status_code == 422


def test_sv14_detalle_por_folio(ben_client: TestClient):
    h = _h_recep()
    ok = ben_client.get(f"{BASE}/BEN-000003", headers=h)
    assert ok.status_code == 200
    assert ok.json()["folio"] == "BEN-000003"

    missing = ben_client.get(f"{BASE}/BEN-999999", headers=h)
    assert missing.status_code == 404
    assert missing.json().get("detail") == "Beneficiario no encontrado"


def test_sv15_historial_beneficiario(ben_client: TestClient):
    h = _h_recep()
    r = ben_client.get(f"{BASE}/BEN-000001/historial", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert data["folio"] == "BEN-000001"
    assert "nombre" in data
    assert isinstance(data["citas"], list)
    assert isinstance(data["pagos"], list)
    assert isinstance(data["comodatos"], list)
    assert len(data["citas"]) >= 1


def test_sv16_eliminacion_baja_logica(ben_client: TestClient):
    folio = "BEN-000002"
    r_del = ben_client.delete(f"{BASE}/{folio}", headers=_h_adm())
    assert r_del.status_code == 200
    assert r_del.json().get("detail") == "Beneficiario eliminado correctamente"

    listed = ben_client.get(BASE, headers=_h_recep())
    assert listed.status_code == 200
    folios = {x["folio"] for x in listed.json()}
    assert folio not in folios

    detail = ben_client.get(f"{BASE}/{folio}", headers=_h_recep())
    assert detail.status_code == 200
    assert detail.json().get("activo") == "N"


def test_sv17_estadisticas_coherentes(ben_client: TestClient):
    h = _h_recep()
    stats = ben_client.get(f"{BASE}/stats", headers=h)
    assert stats.status_code == 200
    s = stats.json()
    assert s["total"] == 3
    assert s["activos"] == 3
    assert s["inactivos"] == 0

    dash = ben_client.get(f"{BASE}/stats/dashboard", headers=h)
    assert dash.status_code == 200
    d = dash.json()
    assert d["total"] == 3
    assert d["por_genero"]["Masculino"] + d["por_genero"]["Femenino"] == 3

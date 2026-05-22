"""HU-13 — Configuración para usuarios (gestión de usuarios del sistema)."""

from __future__ import annotations

import pytest

from qase_s2 import qase_s2_case

pytestmark = pytest.mark.s2


@qase_s2_case(
    "[S2] HU-13 — Usuarios",
    "hu13_listar_usuarios_admin",
    "Administrador puede listar usuarios",
)
def test_hu13_listar_usuarios(s2_client, s2_auth):
    r = s2_client.get("/api/auth/usuarios", headers=s2_auth)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 2


@qase_s2_case(
    "[S2] HU-13 — Usuarios",
    "hu13_crear_usuario",
    "Administrador crea usuario con correo único",
)
def test_hu13_crear_usuario(s2_client, s2_auth):
    r = s2_client.post(
        "/api/auth/usuarios",
        headers=s2_auth,
        json={
            "correo": "nuevo-s2@test.local",
            "nombre": "Usuario S2",
            "rol": "RECEPCIONISTA",
            "estatus": "ACTIVO",
            "contrasena": "pass12345",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body.get("correo") == "nuevo-s2@test.local"
    assert body.get("rol") == "RECEPCIONISTA"


@qase_s2_case(
    "[S2] HU-13 — Usuarios",
    "hu13_config_publica",
    "Endpoint de configuración pública accesible",
)
def test_hu13_config_publica(s2_client):
    r = s2_client.get("/api/config")
    assert r.status_code == 200
    assert "debug" in r.json()

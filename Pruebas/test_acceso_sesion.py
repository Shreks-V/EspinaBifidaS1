"""Pruebas SV-1 a SV-6 — módulo Acceso y sesión (API)."""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.infrastructure.security.adapters import JwtAccessTokenIssuer

from Pruebas.support_auth import InMemoryUserRepository, build_user

LOGIN_PATH = "/api/auth/login"
ME_PATH = "/api/auth/me"

EXPECTED_LOGIN_FAILURE_DETAIL = "Correo o contraseña incorrectos"
EXPECTED_INVALID_CREDENTIALS_DETAIL = "Credenciales inválidas"


@pytest.fixture
def active_user(password_hasher):
    return build_user(
        correo="activo@test.local",
        password_plain="secret123",
        password_hasher=password_hasher,
        id_usuario=10,
        rol="RECEPCIONISTA",
        estatus="ACTIVO",
    )


def test_sv1_login_correcto(auth_client_factory, active_user, password_hasher):
    repo = InMemoryUserRepository(
        {active_user.correo.lower(): active_user},
        has_users=True,
    )
    client = auth_client_factory(repo)
    r = client.post(LOGIN_PATH, json={"correo": active_user.correo, "password": "secret123"})
    assert r.status_code == 200
    body = r.json()
    assert body.get("token_type") == "bearer"
    assert isinstance(body.get("access_token"), str) and len(body["access_token"]) > 20


def test_sv2_login_password_incorrecta(auth_client_factory, active_user):
    repo = InMemoryUserRepository(
        {active_user.correo.lower(): active_user},
        has_users=True,
    )
    client = auth_client_factory(repo)
    r = client.post(LOGIN_PATH, json={"correo": active_user.correo, "password": "mala"})
    assert r.status_code == 401
    assert r.json().get("detail") == EXPECTED_LOGIN_FAILURE_DETAIL


def test_sv2_login_correo_inexistente(auth_client_factory, active_user):
    repo = InMemoryUserRepository(
        {active_user.correo.lower(): active_user},
        has_users=True,
    )
    client = auth_client_factory(repo)
    r = client.post(LOGIN_PATH, json={"correo": "noexiste@test.local", "password": "x"})
    assert r.status_code == 401
    assert r.json().get("detail") == EXPECTED_LOGIN_FAILURE_DETAIL


def test_sv3_usuario_inactivo(auth_client_factory, password_hasher):
    user = build_user(
        correo="inactivo@test.local",
        password_plain="okpass",
        password_hasher=password_hasher,
        id_usuario=2,
        estatus="INACTIVO",
    )
    repo = InMemoryUserRepository({user.correo.lower(): user}, has_users=True)
    client = auth_client_factory(repo)
    r = client.post(LOGIN_PATH, json={"correo": user.correo, "password": "okpass"})
    assert r.status_code == 401
    assert r.json().get("detail") == EXPECTED_LOGIN_FAILURE_DETAIL


def test_sv4_jwt_expirado_no_accede_me(auth_client_factory, active_user):
    repo = InMemoryUserRepository(
        {active_user.correo.lower(): active_user},
        has_users=True,
    )
    client = auth_client_factory(repo)
    issuer = JwtAccessTokenIssuer()
    expired = issuer.issue(
        {
            "sub": active_user.correo,
            "rol": active_user.rol,
            "nombre": active_user.nombre,
            "id_usuario": active_user.id_usuario,
        },
        expires_delta=timedelta(minutes=-30),
    )
    r = client.get(ME_PATH, headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401
    assert r.json().get("detail") == EXPECTED_INVALID_CREDENTIALS_DETAIL


def test_sv4_jwt_manipulado_no_accede_me(auth_client_factory, active_user):
    repo = InMemoryUserRepository(
        {active_user.correo.lower(): active_user},
        has_users=True,
    )
    client = auth_client_factory(repo)
    issuer = JwtAccessTokenIssuer()
    valid = issuer.issue(
        {
            "sub": active_user.correo,
            "rol": active_user.rol,
            "nombre": active_user.nombre,
            "id_usuario": active_user.id_usuario,
        },
    )
    parts = valid.split(".")
    assert len(parts) == 3
    tampered = f"{parts[0]}.{parts[1]}." + ("X" if parts[2][0] != "X" else "Y") + parts[2][1:]
    r = client.get(ME_PATH, headers={"Authorization": f"Bearer {tampered}"})
    assert r.status_code == 401
    assert r.json().get("detail") == EXPECTED_INVALID_CREDENTIALS_DETAIL


def test_sv5_sin_token_no_accede_ruta_protegida(auth_client_factory, active_user):
    repo = InMemoryUserRepository(
        {active_user.correo.lower(): active_user},
        has_users=True,
    )
    client = auth_client_factory(repo)
    r = client.get(ME_PATH)
    assert r.status_code == 401

    login = client.post(
        LOGIN_PATH, json={"correo": active_user.correo, "password": "secret123"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    ok = client.get(ME_PATH, headers={"Authorization": f"Bearer {token}"})
    assert ok.status_code == 200

    after_logout = client.get(ME_PATH)
    assert after_logout.status_code == 401


def test_sv6_mensajes_iguales_sin_enumeracion(
    auth_client_factory, active_user, password_hasher
):
    inactive = build_user(
        correo="otro@test.local",
        password_plain="same",
        password_hasher=password_hasher,
        id_usuario=3,
        estatus="INACTIVO",
    )
    repo = InMemoryUserRepository(
        {
            active_user.correo.lower(): active_user,
            inactive.correo.lower(): inactive,
        },
        has_users=True,
    )
    client: TestClient = auth_client_factory(repo)

    wrong_pw = client.post(
        LOGIN_PATH, json={"correo": active_user.correo, "password": "no-es-la-buena"}
    )
    unknown = client.post(
        LOGIN_PATH, json={"correo": "desconocido@test.local", "password": "cualquiera"}
    )
    inactive_try = client.post(LOGIN_PATH, json={"correo": inactive.correo, "password": "same"})

    assert wrong_pw.status_code == unknown.status_code == inactive_try.status_code == 401
    d1 = wrong_pw.json().get("detail")
    d2 = unknown.json().get("detail")
    d3 = inactive_try.json().get("detail")
    assert d1 == d2 == d3 == EXPECTED_LOGIN_FAILURE_DETAIL

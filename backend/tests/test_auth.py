"""
Tests for /api/auth endpoints.
Covers login, /me, user management, and password flows.
"""
import pytest


class TestLogin:
    def test_login_valid_credentials_returns_token(self, client):
        res = client.post("/api/auth/login", json={"correo": "admin@test.com", "password": "admin1234"})
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client):
        res = client.post("/api/auth/login", json={"correo": "admin@test.com", "password": "incorrect"})
        assert res.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        res = client.post("/api/auth/login", json={"correo": "noexiste@test.com", "password": "cualquiera"})
        assert res.status_code == 401

    def test_login_inactive_user_returns_401(self, client):
        res = client.post("/api/auth/login", json={"correo": "inactivo@test.com", "password": "inactive1"})
        assert res.status_code == 401


class TestGetMe:
    def test_me_with_valid_token_returns_user(self, client, admin_token):
        res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["correo"] == "admin@test.com"
        assert body["rol"] == "ADMINISTRADOR"

    def test_me_without_token_returns_401(self, client):
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_me_with_invalid_token_returns_401(self, client):
        res = client.get("/api/auth/me", headers={"Authorization": "Bearer token.invalido.aqui"})
        assert res.status_code == 401


class TestListarUsuarios:
    def test_admin_can_list_users(self, client, admin_token):
        res = client.get("/api/auth/usuarios", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        users = res.json()
        assert isinstance(users, list)
        assert len(users) >= 2
        correos = [u["correo"] for u in users]
        assert "admin@test.com" in correos

    def test_recepcionista_cannot_list_users(self, client, op_token):
        res = client.get("/api/auth/usuarios", headers={"Authorization": f"Bearer {op_token}"})
        assert res.status_code == 403


class TestCrearUsuario:
    def test_admin_can_create_user(self, client, admin_token):
        payload = {
            "nombre": "Nuevo",
            "apellido_paterno": "Usuario",
            "apellido_materno": None,
            "correo": "nuevo@test.com",
            "contrasena": "contrasena123",
            "rol": "RECEPCIONISTA",
            "estatus": "ACTIVO",
        }
        res = client.post("/api/auth/usuarios", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 201
        body = res.json()
        assert body["correo"] == "nuevo@test.com"
        assert body["rol"] == "RECEPCIONISTA"

    def test_short_password_returns_422(self, client, admin_token):
        payload = {
            "nombre": "Test",
            "apellido_paterno": "Short",
            "correo": "short@test.com",
            "contrasena": "123",
            "rol": "RECEPCIONISTA",
        }
        res = client.post("/api/auth/usuarios", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 422

    def test_recepcionista_cannot_create_user(self, client, op_token):
        payload = {
            "nombre": "X",
            "apellido_paterno": "Y",
            "correo": "x@test.com",
            "contrasena": "xpassword1",
            "rol": "RECEPCIONISTA",
        }
        res = client.post("/api/auth/usuarios", json=payload, headers={"Authorization": f"Bearer {op_token}"})
        assert res.status_code == 403


class TestCambiarContrasena:
    def test_correct_current_password_changes_successfully(self, client, op_token):
        payload = {"contrasena_actual": "op123456", "contrasena_nueva": "nuevaop1234"}
        res = client.post(
            "/api/auth/cambiar-contrasena",
            json=payload,
            headers={"Authorization": f"Bearer {op_token}"},
        )
        assert res.status_code == 200

    def test_wrong_current_password_returns_401(self, client, op_token):
        payload = {"contrasena_actual": "incorrecta", "contrasena_nueva": "otranueva1234"}
        res = client.post(
            "/api/auth/cambiar-contrasena",
            json=payload,
            headers={"Authorization": f"Bearer {op_token}"},
        )
        assert res.status_code == 401

    def test_new_password_too_short_returns_422(self, client, admin_token):
        payload = {"contrasena_actual": "admin1234", "contrasena_nueva": "corta"}
        res = client.post(
            "/api/auth/cambiar-contrasena",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 422


class TestHealth:
    def test_health_returns_ok(self, client):
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

    def test_config_endpoint_returns_debug_flag(self, client):
        res = client.get("/api/config")
        assert res.status_code == 200
        assert "debug" in res.json()

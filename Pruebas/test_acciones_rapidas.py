"""
SV-38 a SV-43 — Acciones rápidas (Dashboard).

SV-38/SV-39/SV-43: contrato en código Angular (rutas, queryParams, guards).
SV-40/SV-41/SV-42: ejecución E2E real con Playwright desde pytest.
"""

from __future__ import annotations

from pathlib import Path
import os
import shutil
import subprocess

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[1]
_DASHBOARD_TS = _REPO_ROOT / "frontend" / "src" / "app" / "pages" / "dashboard" / "dashboard.component.ts"
_APP_ROUTES_TS = _REPO_ROOT / "frontend" / "src" / "app" / "app.routes.ts"
_FRONTEND_DIR = _REPO_ROOT / "frontend"
_PLAYWRIGHT_SPEC = _REPO_ROOT / "Pruebas" / "e2e" / "acciones-rapidas.spec.ts"


@pytest.fixture(scope="module")
def dashboard_source() -> str:
    if not _DASHBOARD_TS.is_file():
        pytest.skip(f"No se encontró {_DASHBOARD_TS}")
    return _DASHBOARD_TS.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def routes_source() -> str:
    if not _APP_ROUTES_TS.is_file():
        pytest.skip(f"No se encontró {_APP_ROUTES_TS}")
    return _APP_ROUTES_TS.read_text(encoding="utf-8")


def test_sv38_cada_accion_rapida_navega_a_la_pantalla_correcta(dashboard_source: str):
    """Cada botón del bloque Acciones Rápidas llama navigateTo con la ruta esperada."""
    expected_snippets = [
        "navigateTo('/recibos', { action: 'nuevo' })",
        "navigateTo('/recibos', { filter: 'pendientes' })",
        "navigateTo('/citas', { action: 'nueva' })",
    ]
    for snip in expected_snippets:
        assert snip in dashboard_source, f"Falta en dashboard: {snip}"


def test_sv39_flujo_directo_nuevo_recibo_query_params(dashboard_source: str):
    """Nuevo recibo abre /recibos con action=nuevo (contexto para la pantalla)."""
    assert "navigateTo('/recibos', { action: 'nuevo' })" in dashboard_source
    assert "queryParams" in dashboard_source
    assert "this.router.navigate([route], { queryParams });" in dashboard_source


def _run_playwright_case(grep_text: str) -> None:
    if not _PLAYWRIGHT_SPEC.is_file():
        pytest.fail(
            f"No se encontró el spec E2E: {_PLAYWRIGHT_SPEC}. "
            "Verifica la configuración de Playwright en frontend."
        )
    npm = shutil.which("npm")
    if not npm:
        pytest.fail("npm no está disponible en PATH; no se pueden ejecutar pruebas E2E.")

    cmd = [npm, "run", "e2e", "--", "--grep", grep_text, "--reporter=line"]
    env = os.environ.copy()
    env["NODE_PATH"] = str(_FRONTEND_DIR / "node_modules")
    proc = subprocess.run(
        cmd,
        cwd=_FRONTEND_DIR,
        text=True,
        capture_output=True,
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        out = (proc.stdout or "").strip()
        err = (proc.stderr or "").strip()
        pytest.fail(
            "Falló la prueba E2E de Playwright.\n"
            f"Comando: {' '.join(cmd)}\n"
            f"Exit: {proc.returncode}\n"
            f"STDOUT:\n{out}\n\nSTDERR:\n{err}"
        )


def test_sv40_teclado_foco_visible():
    _run_playwright_case("SV-40")


def test_sv41_activacion_enter():
    _run_playwright_case("SV-41")


def test_sv42_contraste_legibilidad():
    _run_playwright_case("SV-42")


def test_sv43_rutas_destino_protegidas_por_auth_guard(routes_source: str):
    """
    Usuario sin sesión no entra a las pantallas destino: mismas rutas que acciones rápidas
    usan authGuard (comportamiento actual del proyecto).
    """
    for path in ("dashboard", "recibos", "citas"):
        line = next(
            (ln for ln in routes_source.splitlines() if f"path: '{path}'" in ln),
            "",
        )
        assert line, f"No hay ruta '{path}' en app.routes.ts"
        assert "canActivate: [authGuard]" in line

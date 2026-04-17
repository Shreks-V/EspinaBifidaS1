"""
SV-38 a SV-43 — Acciones rápidas (Dashboard).

SV-38/SV-39/SV-43: contrato en código Angular (rutas, queryParams, guards).
SV-40, SV-41, SV-42: requieren navegador (foco, Enter, contraste); ver skip.
"""

from __future__ import annotations

from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[1]
_DASHBOARD_TS = _REPO_ROOT / "frontend" / "src" / "app" / "pages" / "dashboard" / "dashboard.component.ts"
_APP_ROUTES_TS = _REPO_ROOT / "frontend" / "src" / "app" / "app.routes.ts"


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
        "navigateTo('/almacen', { tab: 'inventario', filter: 'alertas' })",
        "navigateTo('/almacen', { tab: 'comodatos', action: 'nuevo' })",
        "navigateTo('/reportes')",
    ]
    for snip in expected_snippets:
        assert snip in dashboard_source, f"Falta en dashboard: {snip}"


def test_sv39_flujo_directo_nuevo_recibo_query_params(dashboard_source: str):
    """Nuevo recibo abre /recibos con action=nuevo (contexto para la pantalla)."""
    assert "navigateTo('/recibos', { action: 'nuevo' })" in dashboard_source
    assert "queryParams" in dashboard_source
    assert "this.router.navigate([route], { queryParams });" in dashboard_source


def test_sv40_teclado_foco_visible():
    pytest.skip(
        "E2E/accesibilidad: validar foco visible con Playwright o Cypress en el DOM real."
    )


def test_sv41_activacion_enter():
    pytest.skip(
        "E2E/accesibilidad: validar activación con Enter en botón; requiere navegador."
    )


def test_sv42_contraste_legibilidad():
    pytest.skip(
        "Auditoría visual: contraste WCAG con axe-core, Lighthouse o revisión manual en UI."
    )


def test_sv43_rutas_destino_protegidas_por_auth_guard(routes_source: str):
    """
    Usuario sin sesión no entra a las pantallas destino: mismas rutas que acciones rápidas
    usan authGuard (comportamiento actual del proyecto).
    """
    for path in ("dashboard", "recibos", "citas", "almacen", "reportes"):
        line = next(
            (ln for ln in routes_source.splitlines() if f"path: '{path}'" in ln),
            "",
        )
        assert line, f"No hay ruta '{path}' en app.routes.ts"
        assert "canActivate: [authGuard]" in line

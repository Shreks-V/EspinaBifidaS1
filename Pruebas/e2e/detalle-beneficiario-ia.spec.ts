/**
 * M3 Calidad — Misma regresión SV-41 (TC-POS-01 / TC-NEG-01) con enfoque asistido por IA.
 * Marco Antonio Torres 
 *
 *
 * Modos: mock (default) o `E2E_BENEFICIARIOS_BACKEND=real|oracle` + mismo `global-setup` del proyecto.
 */

import { expect, Page, test } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de modo 
// ─────────────────────────────────────────────────────────────────────────────

function readBackendMode(): string {
  return (process.env['E2E_BENEFICIARIOS_BACKEND'] ?? 'mock').toLowerCase().trim();
}

function isOracleOrRealBackend(): boolean {
  const m = readBackendMode();
  return m === 'real' || m === 'oracle';
}

// Datos mock alineados con la Entrega 1 (no dependen de Oracle)
const MOCK_LISTA_BENEFICIARIOS = [
  {
    id_paciente: 1,
    folio: 'BEN-000001',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'García',
    genero: 'Masculino',
    fecha_nacimiento: '2015-05-10',
    curp: 'PEPJ150510HDFRRN01',
    ciudad: 'Monterrey',
    estado: 'Nuevo León',
    membresia_estatus: 'ACTIVO',
    tipo_cuota: 'A',
    activo: 'S',
    tipos_espina: [{ id_tipo_espina: 1, nombre: 'Lumbar' }],
    fecha_alta: '2025-01-01',
    tipo_sangre: null,
    usa_valvula: 'N',
    telefono_celular: null,
    correo_electronico: null,
    direccion: null,
    colonia: null,
    fecha_inicio_membresia: '2025-01-01',
    fecha_vencimiento_membresia: '2026-01-01',
  },
  {
    id_paciente: 3,
    folio: 'BEN-000003',
    nombre: 'Ana',
    apellido_paterno: 'Gómez',
    apellido_materno: 'Ruiz',
    genero: 'Femenino',
    fecha_nacimiento: '2012-11-11',
    curp: 'GOMA121111MDFNRN03',
    ciudad: 'Monterrey',
    estado: 'Nuevo León',
    codigo_postal: '64000',
    telefono_celular: '8110000000',
    correo_electronico: 'ana@example.com',
    en_emergencia_avisar_a: 'Madre',
    telefono_emergencia: '8110000001',
    tipo_sangre: 'O+',
    usa_valvula: 'S',
    notas_adicionales: 'Nota prueba',
    membresia_estatus: 'ACTIVO',
    tipo_cuota: 'A',
    activo: 'S',
    tipos_espina: [
      { id_tipo_espina: 1, nombre: 'Lumbar' },
      { id_tipo_espina: 2, nombre: 'Torácica' },
    ],
    fecha_alta: '2024-06-01',
    fecha_inicio_membresia: '2024-06-01',
    fecha_vencimiento_membresia: '2025-06-01',
    direccion: 'Calle Falsa 123',
    colonia: 'Centro',
  },
] as const;

/** Expectativas TC-POS en modo mock (Entrega 1) */
const CASO_POSITIVO_MOCK = {
  folio: 'BEN-000003',
  tituloModal: 'Ana Gómez Ruiz',
  curp: 'GOMA121111MDFNRN03',
  tipoSangre: 'O+',
  tiposEspina: ['Lumbar', 'Torácica'] as const,
  membresia: 'ACTIVO',
} as const;

type ExpectativasPositivo = {
  folio: string;
  nombreModal: string;
  curp?: string;
  tipoSangre?: string;
  tiposEspina?: string[];
  membresia?: string;
};

function expectativasDesdeVariablesEntorno(): ExpectativasPositivo | null {
  const folio = process.env['E2E_DETALLE_FOLIO']?.trim();
  const nombreModal = process.env['E2E_DETALLE_NOMBRE_MODAL']?.trim();
  if (!folio || !nombreModal) return null;
  const rawTipos = process.env['E2E_DETALLE_TIPOS_ESPINA']?.trim();
  return {
    folio,
    nombreModal,
    curp: process.env['E2E_DETALLE_CURP']?.trim() || undefined,
    tipoSangre: process.env['E2E_DETALLE_TIPO_SANGRE']?.trim() || undefined,
    tiposEspina: rawTipos ? rawTipos.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    membresia: process.env['E2E_DETALLE_MEMBRESIA']?.trim() || undefined,
  };
}

function crearJwtMockParaAuthGuard(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin@espinabifida.org',
      nombre: 'Administrador',
      rol: 'ADMINISTRADOR',
      id_usuario: 1,
      exp,
    })
  ).toString('base64');
  return `${header}.${payload}.firma-mock-ia`;
}

async function autenticarUsuarioReal(page: Page): Promise<void> {
  const correo = process.env['E2E_LOGIN_EMAIL']?.trim() || 'admin@espinabifida.org';
  const clave = process.env['E2E_LOGIN_PASSWORD'] ?? 'admin123';
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible({ timeout: 20_000 });
  await page.locator('#correo').fill(correo);
  await page.locator('#password').fill(clave);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

async function navegarARegistroBeneficiarios(page: Page): Promise<void> {
  await page.goto('/registro-usuarios');
  await expect(page.getByRole('heading', { name: 'Registro de Beneficiarios' })).toBeVisible({
    timeout: isOracleOrRealBackend() ? 45_000 : 15_000,
  });
}

/**
 * Copilot a veces sugiere `route` por path exacto; aquí dejé un solo handler con ramas
 * (lo ajusté yo porque la primera versión no matcheaba GET por folio).
 */
async function instalarInterceptoresApiMock(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === '/api/beneficiarios') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LISTA_BENEFICIARIOS),
      });
      return;
    }

    if (/\/api\/beneficiarios\/BEN-\d+$/.test(pathname)) {
      const folio = pathname.split('/').pop();
      const hit = MOCK_LISTA_BENEFICIARIOS.find((b) => b.folio === folio);
      if (hit) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hit) });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Beneficiario no encontrado' }),
        });
      }
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

function localizarPanelDetalle(page: Page, tituloModal: string) {
  return page
    .locator('div.fixed.inset-0.z-50')
    .filter({ has: page.getByRole('heading', { name: tituloModal }) })
    .locator('div.bg-white.rounded-3xl')
    .first();
}

test.describe('SV-41 detalle por folio — enfoque IA (mismos TC que Entrega manual)', () => {
  test.beforeEach(async ({ page }) => {
    if (isOracleOrRealBackend()) {
      await autenticarUsuarioReal(page);
      return;
    }
    const jwt = crearJwtMockParaAuthGuard();
    await page.addInitScript((token) => window.sessionStorage.setItem('token', token), jwt);
    await instalarInterceptoresApiMock(page);
  });

  test('TC-POS-01 (IA) detalle correcto para folio existente', async ({ page }) => {
    const desdeEnv = isOracleOrRealBackend() ? expectativasDesdeVariablesEntorno() : null;
    if (isOracleOrRealBackend() && !desdeEnv) {
      test.skip(
        true,
        'Oracle sin E2E_DETALLE_*: el global-setup debería llenarlos; si ves esto, revisa configuración.',
      );
    }

    const pos: ExpectativasPositivo =
      desdeEnv ??
      ({
        folio: CASO_POSITIVO_MOCK.folio,
        nombreModal: CASO_POSITIVO_MOCK.tituloModal,
        curp: CASO_POSITIVO_MOCK.curp,
        tipoSangre: CASO_POSITIVO_MOCK.tipoSangre,
        tiposEspina: [...CASO_POSITIVO_MOCK.tiposEspina],
        membresia: CASO_POSITIVO_MOCK.membresia,
      } satisfies ExpectativasPositivo);

    await navegarARegistroBeneficiarios(page);

    const t = isOracleOrRealBackend() ? 30_000 : 10_000;
    await expect(page.getByText('Beneficiarios Activos', { exact: false })).toBeVisible({ timeout: t });
    await expect(page.getByText(pos.folio, { exact: true }).first()).toBeVisible({ timeout: t });

    const fila = page.locator('tr').filter({ hasText: pos.folio });
    await expect(fila).toBeVisible();
    await fila.locator('button').last().click();

    // Copilot sugirió waitForResponse; en Angular el menú es @if + animación — dejé timeout corto fijo tras iterar.
    await page.waitForTimeout(400);

    await expect(page.getByText('Ver detalle')).toBeVisible();
    await page.getByText('Ver detalle').click();

    await expect(page.getByRole('heading', { name: pos.nombreModal })).toBeVisible({ timeout: 10_000 });

    const panel = localizarPanelDetalle(page, pos.nombreModal);
    await expect(panel.getByText(`Folio: ${pos.folio}`)).toBeVisible();

    if (pos.curp) await expect(panel.getByText(pos.curp)).toBeVisible();
    if (pos.tipoSangre) await expect(panel.getByText(pos.tipoSangre, { exact: true })).toBeVisible();
    if (pos.tiposEspina?.length) {
      for (const nombre of pos.tiposEspina) {
        await expect(panel.getByText(nombre, { exact: true })).toBeVisible();
      }
    }
    if (pos.membresia) {
      await expect(panel.locator('span').filter({ hasText: pos.membresia }).first()).toBeVisible();
    }
  });

  test('TC-NEG-01 (IA) buscar folio inexistente BEN-999999 no muestra resultados', async ({ page }) => {
    await navegarARegistroBeneficiarios(page);

    const waitMs = isOracleOrRealBackend() ? 30_000 : 10_000;
    await expect(page.getByText('Beneficiarios Activos', { exact: false })).toBeVisible({ timeout: waitMs });

    const primeraFila = page.locator('tbody tr').first();
    const hayDatos = await primeraFila
      .waitFor({ state: 'visible', timeout: waitMs })
      .then(() => true)
      .catch(() => false);
    if (!hayDatos) {
      test.skip(isOracleOrRealBackend(), 'Oracle: sin filas en tabla');
      await expect(primeraFila).toBeVisible();
    }

    const busqueda = page.getByPlaceholder(/Buscar por nombre, folio/i);
    await expect(busqueda).toBeVisible();
    await busqueda.fill('BEN-999999');
    await page.waitForTimeout(500);

    await expect(page.getByText(/de 0 beneficiarios/i)).toBeVisible();
    await expect(page.locator('tbody button')).toHaveCount(0);
  });
});

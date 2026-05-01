// M3 E2E — validación alta beneficiario — SV-43 (UI), sólo Playwright
// Casos TC-POS-01, TC-NEG-01 y TC-NEG-02 están en este archivo (no hay puente pytest).

import { test, expect } from '@playwright/test';

function buildSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'diego@test.local',
      nombre: 'Diego',
      rol: 'ADMINISTRADOR',
      id_usuario: 1,
      exp: now + 3600,
    })
  ).toString('base64');
  return `${header}.${payload}.firma-no-valida-backend`;
}

// poquitos campos porque el mapper del componente igual jala undefined en varios 
const LISTA_MIN = [
  {
    id_paciente: 1,
    folio: 'BEN-000001',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'García',
    genero: 'Masculino',
    fecha_nacimiento: '2015-05-10',
    curp: 'PEPJ150510HDFRRN01',
    membresia_estatus: 'ACTIVO',
    tipo_cuota: 'A',
    activo: 'S',
    tipos_espina: [],
    fecha_alta: '2025-01-01',
  },
];

type PostMode = 'ok' | '422';

async function instalarMocksBase(page: import('@playwright/test').Page, postModo: PostMode) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;

    if (method === 'GET' && path === '/api/beneficiarios') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LISTA_MIN) });
      return;
    }

    // catálogo de tipos espina para que el modal no espere spinner infinito
    if (method === 'GET' && path.includes('/tipos-espina')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id_tipo_espina: 1, nombre: 'Lumbar' }]),
      });
      return;
    }

    if (method === 'POST' && path === '/api/beneficiarios') {
      if (postModo === '422') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Formato incorrecto: revisar correo u otros campos (simulación 422).' }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id_paciente: 9001, folio: 'BEN-E2E-9001', detail: 'creado' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

async function irAlModalNuevo(page: import('@playwright/test').Page) {
  await page.goto('/registro-usuarios');
  await expect(page.getByRole('heading', { name: 'Registro de Beneficiarios' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: /Nuevo Beneficiario/i }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
}

/** Llena lo mínimo para pasar tanto HTML como el if() del TS submitNuevoBeneficiario */
async function llenarFormularioOk(page: import('@playwright/test').Page) {
  await page.locator('input[name="nombre"]').fill('PruebaDiego');
  await page.locator('input[name="apellido_paterno"]').fill('Validación');
  await page.locator('select[name="genero"]').selectOption('Masculino');
  await page.locator('input[name="fecha_nacimiento"]').fill('2008-03-15');
  await page.locator('input[name="curp"]').fill('VADS080315HDFMLR09');
  await page.locator('select[name="tipo_cuota"]').selectOption('CUOTA A');
  await page.locator('select[name="membresia_estatus"]').selectOption('ACTIVO');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((jwt) => {
    window.sessionStorage.setItem('token', jwt);
  }, buildSessionToken());
});

test('TC-POS-01 servidor acepta datos bien formados mock 200', async ({ page }) => {
  await instalarMocksBase(page, 'ok');
  await irAlModalNuevo(page);
  await llenarFormularioOk(page);

  await page.getByRole('button', { name: /Guardar Beneficiario/i }).click();

  await expect(page.getByRole('heading', { name: 'Nuevo Beneficiario' })).not.toBeVisible({ timeout: 10000 });
});

test('TC-NEG-01 HTML marca inválido si falta CURP antes de llegar al fetch', async ({ page }) => {
  await instalarMocksBase(page, 'ok');
  await irAlModalNuevo(page);
  await page.locator('input[name="nombre"]').fill('x');
  await page.locator('input[name="apellido_paterno"]').fill('y');
  await page.locator('select[name="genero"]').selectOption('Masculino');
  await page.locator('input[name="fecha_nacimiento"]').fill('2000-01-01');
  // curp sigue vacío desde el reset inicial del modal
  await page.locator('select[name="tipo_cuota"]').selectOption('CUOTA B');
  await page.locator('select[name="membresia_estatus"]').selectOption('ACTIVO');

  await page.getByRole('button', { name: /Guardar Beneficiario/i }).click();

  const faltaCurp = await page
    .locator('input[name="curp"]')
    .evaluate<boolean>((el) => (el as HTMLInputElement).validity.valueMissing);
  expect(faltaCurp).toBe(true);
  await expect(page.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
});

test('TC-NEG-02 respuesta API 422 se pinta como mensaje en el modal', async ({ page }) => {
  await instalarMocksBase(page, '422');
  await irAlModalNuevo(page);
  await llenarFormularioOk(page);

  await page.getByRole('button', { name: /Guardar Beneficiario/i }).click();

  await expect(
    page.getByText(/Formato incorrecto: revisar correo u otros campos/)
  ).toBeVisible({ timeout: 10000 });

  await expect(page.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
});

import { expect, test, type Page } from '@playwright/test';

const user = process.env.E2E_USER ?? 'admin@espinabifida.org';
const password = process.env.E2E_PASSWORD ?? 'admin123';

/** CURP de 18 caracteres única por ejecución (evita colisión en BD). */
function uniqueCurp(): string {
  const tail = String(Date.now()).padStart(16, '0').slice(-16);
  return `E2${tail}`;
}

function isPostCrearBeneficiario(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    return path.endsWith('/beneficiarios');
  } catch {
    return false;
  }
}

async function loginAndOpenBeneficiarios(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#correo').fill(user);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole('link', { name: 'Beneficiarios' }).first().click();
  await expect(page.getByRole('heading', { name: 'Registro de Beneficiarios' })).toBeVisible();
}

function nuevoBeneficiarioModal(page: Page) {
  return page.locator('div.fixed.inset-0').filter({
    has: page.getByRole('heading', { name: 'Nuevo Beneficiario' }),
  });
}

test.describe('SV-46 / alta datos complejos beneficiarios (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndOpenBeneficiarios(page);
  });

  test('positivo: alta con datos completos y tipos de espina', async ({ page }) => {
    const stamp = Date.now();
    const nombre = `LuisaE2E${stamp}`;
    const curp = uniqueCurp();
    const correo = `luisa.e2e.${stamp}@example.com`;

    await page.getByRole('button', { name: 'Nuevo Beneficiario' }).click();
    const modal = nuevoBeneficiarioModal(page);
    await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();

    await modal.locator('[name="nombre"]').fill(nombre);
    await modal.locator('[name="apellido_paterno"]').fill('Completa');
    await modal.locator('[name="apellido_materno"]').fill('Campos');
    await modal.locator('[name="genero"]').selectOption('Femenino');
    await modal.locator('[name="fecha_nacimiento"]').fill('2019-07-15');
    await modal.locator('[name="curp"]').fill(curp);
    await modal.locator('[name="nombre_padre_madre"]').fill('Tutor Uno');

    await modal.locator('[name="direccion"]').fill('Av. Siempre Viva 742');
    await modal.locator('[name="colonia"]').fill('Centro');
    await modal.locator('[name="ciudad"]').fill('Monterrey');
    await modal.locator('[name="estado"]').selectOption({ label: 'Nuevo Leon' });
    await modal.locator('[name="codigo_postal"]').fill('64000');

    await modal.locator('[name="telefono_celular"]').fill('8112223344');
    await modal.locator('[name="correo_electronico"]').fill(correo);
    await modal.locator('[name="en_emergencia_avisar_a"]').fill('Padre');
    await modal.locator('[name="telefono_emergencia"]').fill('8112223355');

    await modal.locator('[name="tipo_sangre"]').selectOption('A+');
    await modal.locator('#usa_valvula').check();

    const espinaBoxes = modal.locator('input[type="checkbox"]:not(#usa_valvula)');
    await expect(espinaBoxes.first()).toBeVisible({ timeout: 15000 });
    const espinaCount = await espinaBoxes.count();
    expect(espinaCount, 'catálogo tipos de espina debe tener al menos 2 ítems').toBeGreaterThanOrEqual(2);
    await espinaBoxes.nth(0).check();
    await espinaBoxes.nth(1).check();

    await modal.locator('[name="tipo_cuota"]').selectOption('CUOTA B');
    await modal.locator('[name="membresia_estatus"]').selectOption('ACTIVO');

    const createResp = page.waitForResponse(
      (r) => r.request().method() === 'POST' && isPostCrearBeneficiario(r.url()),
    );

    await modal.getByRole('button', { name: 'Guardar Beneficiario' }).click();
    const response = await createResp;
    expect(response.ok(), `POST beneficiarios debe ser 201, obtuvo ${response.status()}`).toBeTruthy();
    expect(response.status()).toBe(201);

    await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).not.toBeVisible();

    await page.getByPlaceholder('Buscar por nombre, folio, CURP o membresia...').fill(nombre);
    await expect(page.getByRole('cell', { name: new RegExp(nombre) })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Completa/ })).toBeVisible();
  });

  test('negativo: correo electrónico con formato inválido', async ({ page }) => {
    const curp = uniqueCurp();

    await page.getByRole('button', { name: 'Nuevo Beneficiario' }).click();
    const modal = nuevoBeneficiarioModal(page);

    await modal.locator('[name="nombre"]').fill('Bad');
    await modal.locator('[name="apellido_paterno"]').fill('Mail');
    await modal.locator('[name="genero"]').selectOption('Femenino');
    await modal.locator('[name="fecha_nacimiento"]').fill('2001-01-01');
    await modal.locator('[name="curp"]').fill(curp);
    await modal.locator('[name="correo_electronico"]').fill('no-es-correo');

    await modal.locator('[name="tipo_cuota"]').selectOption('CUOTA A');
    await modal.locator('[name="membresia_estatus"]').selectOption('ACTIVO');

    const createResp = page.waitForResponse(
      (r) => r.request().method() === 'POST' && isPostCrearBeneficiario(r.url()),
    );

    await modal.getByRole('button', { name: 'Guardar Beneficiario' }).click();
    const response = await createResp;
    expect(response.status()).toBe(422);

    await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
    await expect(modal.locator('.border-red-200.text-red-700')).toBeVisible();
  });
});

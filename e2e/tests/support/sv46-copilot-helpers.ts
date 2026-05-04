/**
 * @fileoverview Helpers para TC-SV46-POS / TC-SV46-NEG — refactor Entrega 2.
 * Estas funciones fueron consolidadas y documentadas con asistencia de GitHub Copilot
 * (estilo típico: nombres largos, secciones por dominio del formulario Angular).
 */

import { expect, type Locator, type Page, type Response } from '@playwright/test';

/** Marcador visible para informes y trazabilidad Entrega 2 (Copilot). */
export const ENTREGA_2_COPILOT_MARKER = 'SOY_IA_COPILOT_ENTREGA_2';

/** Credenciales E2E (misma semántica que el login demo del SPA). */
export const E2E_AUTH_USER = process.env.E2E_USER ?? 'admin@espinabifida.org';
export const E2E_AUTH_PASSWORD = process.env.E2E_PASSWORD ?? 'admin123';

/**
 * Genera una CURP sintética de exactamente 18 caracteres para evitar colisiones en PACIENTE.
 * Prefijo `E2` + relleno numérico derivado del reloj del sistema.
 */
export function generateUniqueEighteenCharCurpForTestRun(): string {
  const tail = String(Date.now()).padStart(16, '0').slice(-16);
  return `E2${tail}`;
}

/**
 * Determina si una respuesta HTTP corresponde al POST de alta en `/…/beneficiarios`
 * (creación), excluyendo subrecursos como historial o folio concreto.
 */
export function doesUrlRepresentBeneficiaryCreationPost(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    return path.endsWith('/beneficiarios');
  } catch {
    return false;
  }
}

/**
 * Localiza el overlay del modal "Nuevo Beneficiario" mediante el heading interno,
 * porque Angular no asigna `role="dialog"` al contenedor.
 */
export function locateNuevoBeneficiarioModalOverlay(page: Page): Locator {
  return page.locator('div.fixed.inset-0').filter({
    has: page.getByRole('heading', { name: 'Nuevo Beneficiario' }),
  });
}

/**
 * Flujo completo: landing → login → dashboard → enlace Beneficiarios → heading del módulo.
 */
export async function navigateThroughAuthenticationFlowToBeneficiariosRegistry(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#correo').fill(E2E_AUTH_USER);
  await page.locator('#password').fill(E2E_AUTH_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole('link', { name: 'Beneficiarios' }).first().click();
  await expect(page.getByRole('heading', { name: 'Registro de Beneficiarios' })).toBeVisible();
}

/**
 * Rellena la sección "Datos personales" del modal para el caso positivo (TC-SV46-POS).
 */
export async function fillPersonalDataSectionPositiveCase(
  modal: Locator,
  payload: {
    nombre: string;
    curp: string;
  },
): Promise<void> {
  await modal.locator('[name="nombre"]').fill(payload.nombre);
  await modal.locator('[name="apellido_paterno"]').fill('Completa');
  await modal.locator('[name="apellido_materno"]').fill('Campos');
  await modal.locator('[name="genero"]').selectOption('Femenino');
  await modal.locator('[name="fecha_nacimiento"]').fill('2019-07-15');
  await modal.locator('[name="curp"]').fill(payload.curp);
  await modal.locator('[name="nombre_padre_madre"]').fill('Tutor Uno');
}

/**
 * Rellena dirección; estado debe coincidir con `estadosMexicanos` del frontend ("Nuevo Leon").
 */
export async function fillAddressSectionPositiveCase(modal: Locator): Promise<void> {
  await modal.locator('[name="direccion"]').fill('Av. Siempre Viva 742');
  await modal.locator('[name="colonia"]').fill('Centro');
  await modal.locator('[name="ciudad"]').fill('Monterrey');
  await modal.locator('[name="estado"]').selectOption({ label: 'Nuevo Leon' });
  await modal.locator('[name="codigo_postal"]').fill('64000');
}

/**
 * Contacto y emergencia para caso positivo.
 */
export async function fillContactSectionPositiveCase(modal: Locator, correo: string): Promise<void> {
  await modal.locator('[name="telefono_celular"]').fill('8112223344');
  await modal.locator('[name="correo_electronico"]').fill(correo);
  await modal.locator('[name="en_emergencia_avisar_a"]').fill('Padre');
  await modal.locator('[name="telefono_emergencia"]').fill('8112223355');
}

/**
 * Sangre, válvula, dos tipos de espina (no el checkbox #usa_valvula del mismo bloque visual),
 * cuota B y membresía ACTIVO.
 */
export async function fillMedicalMembershipAndSpinaTypesPositiveCase(modal: Locator): Promise<void> {
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
}

/**
 * Datos mínimos + correo inválido para TC-SV46-NEG (validación Pydantic en API).
 */
export async function fillMinimalFieldsWithInvalidEmailForNegativeCase(
  modal: Locator,
  curp: string,
): Promise<void> {
  await modal.locator('[name="nombre"]').fill('Bad');
  await modal.locator('[name="apellido_paterno"]').fill('Mail');
  await modal.locator('[name="genero"]').selectOption('Femenino');
  await modal.locator('[name="fecha_nacimiento"]').fill('2001-01-01');
  await modal.locator('[name="curp"]').fill(curp);
  await modal.locator('[name="correo_electronico"]').fill('no-es-correo');
  await modal.locator('[name="tipo_cuota"]').selectOption('CUOTA A');
  await modal.locator('[name="membresia_estatus"]').selectOption('ACTIVO');
}

/**
 * Dispara Guardar y devuelve la respuesta del POST de creación (debe registrarse antes del click).
 */
export async function clickGuardarBeneficiarioAndReturnCreateResponse(
  page: Page,
  modal: Locator,
): Promise<Response> {
  const createResp = page.waitForResponse(
    (r) => r.request().method() === 'POST' && doesUrlRepresentBeneficiaryCreationPost(r.url()),
  );
  await modal.getByRole('button', { name: 'Guardar Beneficiario' }).click();
  return createResp;
}

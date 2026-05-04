// =============================================================================
// Generated with GitHub Copilot assistance — Entrega 2 (refactor documentado)
// Fecha referencia: 2026-05-01
// SOY_IA_COPILOT_ENTREGA_2 — ver constante ENTREGA_2_COPILOT_MARKER y anotaciones en tests
// =============================================================================

import { expect, test } from '@playwright/test';

import {
  ENTREGA_2_COPILOT_MARKER,
  clickGuardarBeneficiarioAndReturnCreateResponse,
  fillAddressSectionPositiveCase,
  fillContactSectionPositiveCase,
  fillMedicalMembershipAndSpinaTypesPositiveCase,
  fillMinimalFieldsWithInvalidEmailForNegativeCase,
  fillPersonalDataSectionPositiveCase,
  generateUniqueEighteenCharCurpForTestRun,
  locateNuevoBeneficiarioModalOverlay,
  navigateThroughAuthenticationFlowToBeneficiariosRegistry,
} from './support/sv46-copilot-helpers';

test.describe('SV-46 / alta datos complejos beneficiarios (UI) — Entrega 2 Copilot', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'copilot_marker',
      description: ENTREGA_2_COPILOT_MARKER,
    });
    await test.step('Autenticación y navegación a Registro de Beneficiarios', async () => {
      await navigateThroughAuthenticationFlowToBeneficiariosRegistry(page);
    });
  });

  test('positivo: alta con datos completos y tipos de espina', async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'test_case',
      description: 'TC-SV46-POS — Copilot refactor',
    });

    const stamp = Date.now();
    const nombre = `LuisaE2E${stamp}`;
    const curp = generateUniqueEighteenCharCurpForTestRun();
    const correo = `luisa.e2e.${stamp}@example.com`;

    await test.step('Abrir modal Nuevo Beneficiario', async () => {
      await page.getByRole('button', { name: 'Nuevo Beneficiario' }).click();
      const modal = locateNuevoBeneficiarioModalOverlay(page);
      await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
    });

    const modal = locateNuevoBeneficiarioModalOverlay(page);

    await test.step('Completar formulario (equivalente SV-10 / manual Entrega 1)', async () => {
      await fillPersonalDataSectionPositiveCase(modal, { nombre, curp });
      await fillAddressSectionPositiveCase(modal);
      await fillContactSectionPositiveCase(modal, correo);
      await fillMedicalMembershipAndSpinaTypesPositiveCase(modal);
    });

    await test.step('Guardar y validar POST 201', async () => {
      const response = await clickGuardarBeneficiarioAndReturnCreateResponse(page, modal);
      expect(response.ok(), `POST beneficiarios debe ser 201, obtuvo ${response.status()}`).toBeTruthy();
      expect(response.status()).toBe(201);
    });

    await test.step('Modal cerrado y fila visible en grid', async () => {
      await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).not.toBeVisible();
      await page.getByPlaceholder('Buscar por nombre, folio, CURP o membresia...').fill(nombre);
      await expect(page.getByRole('cell', { name: new RegExp(nombre) })).toBeVisible();
      await expect(page.getByRole('cell', { name: /Completa/ })).toBeVisible();
    });
  });

  test('negativo: correo electrónico con formato inválido', async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'test_case',
      description: 'TC-SV46-NEG — Copilot refactor',
    });

    const curp = generateUniqueEighteenCharCurpForTestRun();

    await test.step('Modal y datos inválidos (correo)', async () => {
      await page.getByRole('button', { name: 'Nuevo Beneficiario' }).click();
      const modal = locateNuevoBeneficiarioModalOverlay(page);
      await fillMinimalFieldsWithInvalidEmailForNegativeCase(modal, curp);
    });

    const modal = locateNuevoBeneficiarioModalOverlay(page);

    await test.step('POST 422 y UI de error', async () => {
      const response = await clickGuardarBeneficiarioAndReturnCreateResponse(page, modal);
      expect(response.status()).toBe(422);
      await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
      await expect(modal.locator('.border-red-200.text-red-700')).toBeVisible();
    });
  });
});

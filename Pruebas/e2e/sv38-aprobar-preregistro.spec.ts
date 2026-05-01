/// <reference types="node" />

import { expect, type Page, test } from '@playwright/test';

function toBase64Url(raw: string): string {
  return Buffer.from(raw, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: 'e2e@test.local',
      nombre: 'E2E',
      rol: 'ADMINISTRADOR',
      id_usuario: 999,
      exp: now + 60 * 60,
    })
  );
  return `${header}.${payload}.e2e-signature`;
}

type ApiPreregistro = {
  id_paciente: number;
  folio: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  fecha_nacimiento?: string;
  fecha_registro: string;
  estatus_registro: string;
  tipo_cuota?: string;
};

async function mockApiSv38(
  page: Page,
  options?: {
    failApproveIds?: number[];
  }
): Promise<void> {
  const failApproveIds = new Set(options?.failApproveIds || []);
  let preregistros: ApiPreregistro[] = [
    {
      id_paciente: 101,
      folio: 'PRE-000101',
      nombre: 'Juan',
      apellido_paterno: 'Perez',
      apellido_materno: 'Gomez',
      fecha_nacimiento: '1990-01-01',
      fecha_registro: '2026-04-17',
      estatus_registro: 'PENDIENTE',
    },
    {
      id_paciente: 202,
      folio: 'PRE-000202',
      nombre: 'Maria',
      apellido_paterno: 'Lopez',
      apellido_materno: 'Diaz',
      fecha_nacimiento: '1995-06-15',
      fecha_registro: '2026-04-18',
      estatus_registro: 'PENDIENTE',
    },
  ];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === 'GET' && path.endsWith('/beneficiarios')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (method === 'GET' && path.endsWith('/notificaciones')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (method === 'GET' && path.endsWith('/beneficiarios/membresias/proximas-a-vencer')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (method === 'GET' && path.endsWith('/preregistro/tipos-documento')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (method === 'GET' && path.endsWith('/preregistro')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(preregistros),
      });
    }

    if (method === 'POST' && /\/preregistro\/\d+\/aprobar$/.test(path)) {
      const id = Number(path.split('/').at(-2));
      if (failApproveIds.has(id)) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Error al aprobar preregistro (mock)' }),
        });
      }
      preregistros = preregistros.filter((item) => item.id_paciente !== id);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }

    if (method === 'POST' && /\/preregistro\/\d+\/rechazar$/.test(path)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApiSv38(page);
  const token = buildSessionToken();
  await page.addInitScript((jwt) => {
    window.sessionStorage.setItem('token', jwt);
  }, token);
});

test('SV-38 aprobar solicitud actualizando estados', async ({ page }) => {
  await page.goto('/registro-usuarios');

  await page.getByRole('button', { name: /Aprobacion de Preregistro/i }).click();

  const juanRow = page.locator('tbody tr', { hasText: /Juan\s+Perez\s+Gomez/i });
  const mariaRow = page.locator('tbody tr', { hasText: /Maria\s+Lopez\s+Diaz/i });

  await expect(juanRow).toHaveCount(1);
  await expect(mariaRow).toHaveCount(1);

  await juanRow.getByRole('button', { name: 'Aprobar' }).click();

  const confirmButton = page.getByRole('button', { name: /Confirmar Aprobacion/i });
  await expect(page.getByText(/Confirmar Aprobacion/i)).toBeVisible();
  await expect(confirmButton).toBeDisabled();

  await page.getByRole('button', { name: /CUOTA A/i }).click();
  await expect(confirmButton).toBeEnabled();

  await confirmButton.click();

  await expect(page.getByText(/Confirmar Aprobacion/i)).toBeHidden();
  await expect(juanRow).toHaveCount(0);
  await expect(mariaRow).toHaveCount(1);
});

test('SV-38 si falla aprobar, no elimina preregistro', async ({ page }) => {
  await page.unroute('**/api/**');
  await mockApiSv38(page, { failApproveIds: [101] });

  await page.goto('/registro-usuarios');

  await page.getByRole('button', { name: /Aprobacion de Preregistro/i }).click();

  const juanRow = page.locator('tbody tr', { hasText: /Juan\s+Perez\s+Gomez/i });
  await expect(juanRow).toHaveCount(1);

  await juanRow.getByRole('button', { name: 'Aprobar' }).click();

  const confirmButton = page.getByRole('button', { name: /Confirmar Aprobacion/i });
  await expect(page.getByText(/Confirmar Aprobacion/i)).toBeVisible();

  await page.getByRole('button', { name: /CUOTA A/i }).click();
  await expect(confirmButton).toBeEnabled();

  await confirmButton.click();

  await expect(page.getByText(/Confirmar Aprobacion/i)).toBeVisible();
  await expect(juanRow).toHaveCount(1);
});

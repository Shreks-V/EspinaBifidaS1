/// <reference types="node" />

import { expect, type Locator, type Page, test } from '@playwright/test';

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

async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    let payload: unknown = [];

    if (path.endsWith('/citas/hoy')) {
      payload = {
        total: 1,
        completadas: 0,
        citas: [
          {
            id_cita: 1,
            fecha_hora: '2026-04-17T10:00:00',
            estatus: 'PROGRAMADA',
            nombre_paciente: 'Paciente Demo',
            folio_paciente: 'BEN-000001',
            servicios: [{ nombre: 'Consulta' }],
          },
        ],
      };
    } else if (path.endsWith('/recibos/stats')) {
      payload = { total_hoy: 1, total_ayer: 0, pendientes: 0 };
    } else if (path.endsWith('/citas/stats')) {
      payload = { total_hoy: 1, total_ayer: 0 };
    } else if (path.endsWith('/doctores/hoy')) {
      payload = {
        doctor: {
          nombre: 'Ana',
          apellido_paterno: 'Lopez',
          especialidad: 'General',
        },
        hora_inicio: '2026-04-17T09:00:00',
        hora_fin: '2026-04-17T17:00:00',
      };
    } else if (path.endsWith('/beneficiarios/stats/dashboard')) {
      payload = { activos: 10, nuevos_esta_semana: 2, nuevos_semana_anterior: 1 };
    } else if (path.endsWith('/reportes/consolidado-mensual')) {
      payload = {
        pacientes_atendidos: 5,
        citas_por_estatus: { COMPLETADA: 3 },
        total_ventas: 4,
        monto_ventas: 800,
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

async function openDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Acciones Rápidas' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Nuevo Recibo/i })).toBeVisible();
}

async function focusByTab(page: Page, target: Locator): Promise<void> {
  await page.keyboard.press('Tab');
  for (let i = 0; i < 80; i += 1) {
    const focused = await target
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (focused) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('No se pudo enfocar el botón usando navegación por teclado');
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  const token = buildSessionToken();
  await page.addInitScript((jwt) => {
    window.sessionStorage.setItem('token', jwt);
  }, token);
});

test('SV-40 foco visible con teclado en acción rápida', async ({ page }) => {
  await openDashboard(page);

  const target = page.getByRole('button', { name: /Nuevo Recibo/i });
  await focusByTab(page, target);

  const visibleFocus = await target.evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    const outlineWidth = Number.parseFloat(style.outlineWidth || '0');
    const hasOutline = style.outlineStyle !== 'none' && outlineWidth > 0;
    const hasBoxShadow = Boolean(style.boxShadow && style.boxShadow !== 'none');
    const isFocusVisible = (el as HTMLElement).matches(':focus-visible');
    return isFocusVisible && (hasOutline || hasBoxShadow);
  });

  expect(visibleFocus).toBeTruthy();
});

test('SV-41 Enter activa navegación de acción rápida', async ({ page }) => {
  await openDashboard(page);

  const target = page.getByRole('button', { name: /Nuevo Recibo/i });
  await focusByTab(page, target);
  await page.keyboard.press('Enter');

  await expect.poll(() => new URL(page.url()).pathname).toBe('/recibos');
  await expect.poll(() => new URL(page.url()).searchParams.get('action')).toBe('nuevo');
});

test('SV-42 contraste mínimo legible en botones de acciones rápidas', async ({ page }) => {
  await openDashboard(page);

  const ratios = await page.evaluate(() => {
    const parseRgb = (color: string): [number, number, number] => {
      const m = color.match(/rgba?\(([^)]+)\)/i);
      if (!m) {
        return [255, 255, 255];
      }
      const parts = m[1].split(',').map((p) => Number.parseFloat(p.trim()));
      return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
    };

    const luminance = ([r, g, b]: [number, number, number]): number => {
      const srgb = [r, g, b].map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    };

    const contrast = (a: [number, number, number], b: [number, number, number]): number => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      const [maxL, minL] = l1 >= l2 ? [l1, l2] : [l2, l1];
      return (maxL + 0.05) / (minL + 0.05);
    };

    const labels = ['Nuevo Recibo', 'Adeudos', 'Agendar Cita'];
    const result: Record<string, number> = {};

    for (const label of labels) {
      const button = Array.from(document.querySelectorAll('button')).find((el) =>
        (el.textContent || '').includes(label)
      ) as HTMLElement | undefined;
      if (!button) {
        continue;
      }

      const title = (button.querySelector('p.font-bold') as HTMLElement | null) || button;
      const textColor = parseRgb(window.getComputedStyle(title).color);

      const bgImage = window.getComputedStyle(button).backgroundImage || '';
      const stops = Array.from(bgImage.matchAll(/rgba?\([^\)]+\)/g)).map((m) => parseRgb(m[0]));
      const backgrounds = stops.length
        ? stops
        : [parseRgb(window.getComputedStyle(button).backgroundColor)];

      const minContrast = Math.min(...backgrounds.map((bg) => contrast(textColor, bg)));
      result[label] = minContrast;
    }

    return result;
  });

  expect(Object.keys(ratios)).toHaveLength(3);
  for (const [label, ratio] of Object.entries(ratios)) {
    expect(
      ratio,
      `Contraste insuficiente para ${label}; ratio calculado: ${ratio.toFixed(2)}`
    ).toBeGreaterThanOrEqual(2.2);
  }
});

// M3 Calidad — E2E detalle beneficiario (SV-41 / test_sv41_detalle_por_folio_beneficiarios)
// Marco Antonio Torres
//
// Dos modos (variable E2E_BENEFICIARIOS_BACKEND):
// - mock (default): intercepta /api sin Oracle ni backend FastAPI.
// - real / oracle: login real contra http://localhost:8000 (según environment.ts), datos desde Oracle.

import { expect, Page, test } from '@playwright/test';

/** mock | real | oracle */
function beneficiariosBackendMode(): string {
  return (process.env['E2E_BENEFICIARIOS_BACKEND'] || 'mock').toLowerCase().trim();
}

function useRealBeneficiariosApi(): boolean {
  const m = beneficiariosBackendMode();
  return m === 'real' || m === 'oracle';
}

// ─── Mock payloads (solo modo mock; forma similar a support repos) ───

const BENEFICIARIOS_MOCK = [
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
];

const MOCK_POS = {
  folio: 'BEN-000003',
  nombreModal: 'Ana Gómez Ruiz',
  curp: 'GOMA121111MDFNRN03',
  tipoSangre: 'O+',
  tiposEspina: ['Lumbar', 'Torácica'] as string[],
  membresia: 'ACTIVO',
};

function realPosExpectations(): {
  folio: string;
  nombreModal: string;
  curp?: string;
  tipoSangre?: string;
  tiposEspina?: string[];
  membresia?: string;
} | null {
  const folio = process.env['E2E_DETALLE_FOLIO']?.trim();
  const nombreModal = process.env['E2E_DETALLE_NOMBRE_MODAL']?.trim();
  if (!folio || !nombreModal) {
    return null;
  }
  const tiposRaw = process.env['E2E_DETALLE_TIPOS_ESPINA']?.trim();
  return {
    folio,
    nombreModal,
    curp: process.env['E2E_DETALLE_CURP']?.trim() || undefined,
    tipoSangre: process.env['E2E_DETALLE_TIPO_SANGRE']?.trim() || undefined,
    tiposEspina: tiposRaw
      ? tiposRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    membresia: process.env['E2E_DETALLE_MEMBRESIA']?.trim() || undefined,
  };
}

/** Token para authGuard; el backend no lo valida en modo mock */
function buildSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin@espinabifida.org',
      nombre: 'Administrador',
      rol: 'ADMINISTRADOR',
      id_usuario: 1,
      exp: now + 3600,
    })
  ).toString('base64');
  return `${header}.${payload}.firma-mock-e2e`;
}

async function loginRealUser(page: Page): Promise<void> {
  const email = process.env['E2E_LOGIN_EMAIL']?.trim() || 'admin@espinabifida.org';
  const password = process.env['E2E_LOGIN_PASSWORD'] ?? 'admin123';

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible({ timeout: 20_000 });
  await page.locator('#correo').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
}

async function openRegistroUsuarios(page: Page): Promise<void> {
  await page.goto('/registro-usuarios');
  await expect(page.getByRole('heading', { name: 'Registro de Beneficiarios' })).toBeVisible({
    timeout: useRealBeneficiariosApi() ? 45_000 : 15_000,
  });
}

async function installMockRoutes(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/beneficiarios') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(BENEFICIARIOS_MOCK),
      });
      return;
    }

    if (/\/api\/beneficiarios\/BEN-\d+$/.test(path)) {
      const folio = path.split('/').pop();
      const found = BENEFICIARIOS_MOCK.find((b) => b.folio === folio);
      if (found) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(found),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Beneficiario no encontrado' }),
        });
      }
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test.beforeEach(async ({ page }) => {
  if (useRealBeneficiariosApi()) {
    await loginRealUser(page);
    return;
  }

  const token = buildSessionToken();
  await page.addInitScript((jwt) => {
    window.sessionStorage.setItem('token', jwt);
  }, token);
  await installMockRoutes(page);
});

test('TC-POS-01 detalle correcto para folio existente', async ({ page }) => {
  const realCfg = useRealBeneficiariosApi() ? realPosExpectations() : null;
  if (useRealBeneficiariosApi() && !realCfg) {
    test.skip(true, 'Modo Oracle: define E2E_DETALLE_FOLIO y E2E_DETALLE_NOMBRE_MODAL (texto exacto del h2 del modal)');
  }

  const pos = realCfg ?? {
    folio: MOCK_POS.folio,
    nombreModal: MOCK_POS.nombreModal,
    curp: MOCK_POS.curp,
    tipoSangre: MOCK_POS.tipoSangre,
    tiposEspina: MOCK_POS.tiposEspina,
    membresia: MOCK_POS.membresia,
  };

  await openRegistroUsuarios(page);

  await expect(page.getByText('Beneficiarios Activos', { exact: false })).toBeVisible({
    timeout: useRealBeneficiariosApi() ? 30_000 : 10_000,
  });

  await expect(page.getByText(pos.folio, { exact: true }).first()).toBeVisible({
    timeout: useRealBeneficiariosApi() ? 30_000 : 10_000,
  });

  const fila = page.locator('tr').filter({ hasText: pos.folio });
  await expect(fila).toBeVisible();

  const botonMenu = fila.locator('button').last();
  await botonMenu.click();

  await page.waitForTimeout(400);

  await expect(page.getByText('Ver detalle')).toBeVisible();
  await page.getByText('Ver detalle').click();

  await expect(page.getByRole('heading', { name: pos.nombreModal })).toBeVisible({ timeout: 10_000 });

  const panelModal = page
    .locator('div.fixed.inset-0.z-50')
    .filter({ has: page.getByRole('heading', { name: pos.nombreModal }) })
    .locator('div.bg-white.rounded-3xl')
    .first();

  await expect(panelModal.getByText(`Folio: ${pos.folio}`)).toBeVisible();

  if (pos.curp) {
    await expect(panelModal.getByText(pos.curp)).toBeVisible();
  }
  if (pos.tipoSangre) {
    await expect(panelModal.getByText(pos.tipoSangre, { exact: true })).toBeVisible();
  }
  if (pos.tiposEspina?.length) {
    for (const te of pos.tiposEspina) {
      await expect(panelModal.getByText(te, { exact: true })).toBeVisible();
    }
  }
  if (pos.membresia) {
    const badgeMembresia = panelModal.locator('span').filter({ hasText: pos.membresia }).first();
    await expect(badgeMembresia).toBeVisible();
  }
});

test('TC-NEG-01 buscar folio inexistente BEN-999999 no muestra resultados', async ({ page }) => {
  await openRegistroUsuarios(page);

  const waitTable = useRealBeneficiariosApi() ? 30_000 : 10_000;
  await expect(page.getByText('Beneficiarios Activos', { exact: false })).toBeVisible({
    timeout: waitTable,
  });

  // Con Oracle puede no existir BEN-000001/003; basta con que haya al menos una fila en activos
  const filasTabla = page.locator('tbody tr');
  const tablaConDatos = await filasTabla
    .first()
    .waitFor({ state: 'visible', timeout: waitTable })
    .then(() => true)
    .catch(() => false);
  if (!tablaConDatos) {
    test.skip(useRealBeneficiariosApi(), 'Oracle: tabla vacía; no hay nada que filtrar');
    await expect(filasTabla.first()).toBeVisible();
  }

  const campoBusqueda = page.getByPlaceholder(/Buscar por nombre, folio/i);
  await expect(campoBusqueda).toBeVisible();

  await campoBusqueda.fill('BEN-999999');

  await page.waitForTimeout(500);

  await expect(page.getByText(/de 0 beneficiarios/i)).toBeVisible();
  await expect(page.locator('tbody button')).toHaveCount(0);
});

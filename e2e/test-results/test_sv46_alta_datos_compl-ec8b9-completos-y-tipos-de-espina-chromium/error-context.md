# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_sv46_alta_datos_complejos_beneficiarios.spec.ts >> SV-46 / alta datos complejos beneficiarios (UI) >> positivo: alta con datos completos y tipos de espina
- Location: tests\test_sv46_alta_datos_complejos_beneficiarios.spec.ts:42:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard/
Received string:  "http://localhost:4200/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    9 × unexpected value "http://localhost:4200/"

```

# Page snapshot

```yaml
- generic [ref=e9]:
  - generic [ref=e10]:
    - generic [ref=e12]: EB
    - heading "Sistema Integral de Gestión" [level=1] [ref=e13]
    - paragraph [ref=e14]: Asociación de Espina Bífida
    - paragraph [ref=e15]: Plataforma completa para la gestión de beneficiarios, citas médicas, inventario y servicios especializados.
    - generic [ref=e16]:
      - img [ref=e18]
      - generic [ref=e20]:
        - heading "Gestión Integral" [level=3] [ref=e21]
        - paragraph [ref=e22]: Control completo de todas las áreas administrativas en un solo lugar
  - generic [ref=e26]:
    - generic [ref=e28]:
      - img [ref=e30]
      - generic [ref=e32]:
        - heading "Bienvenido" [level=2] [ref=e33]
        - paragraph [ref=e34]: Ingresa tus credenciales
    - generic [ref=e35]:
      - paragraph [ref=e37]: No se pudo conectar con el servidor.
      - generic [ref=e38]:
        - text: Correo electrónico
        - generic [ref=e39]:
          - img [ref=e41]
          - textbox "Correo electrónico" [ref=e44]:
            - /placeholder: admin@espinabifida.org
            - text: admin@espinabifida.org
      - generic [ref=e45]:
        - text: Contraseña
        - generic [ref=e46]:
          - img [ref=e48]
          - textbox "Contraseña" [ref=e51]:
            - /placeholder: admin123
            - text: admin123
      - button "Iniciar sesión" [ref=e52] [cursor=pointer]:
        - img [ref=e53]
        - text: Iniciar sesión
    - generic [ref=e56]:
      - generic [ref=e57]:
        - img [ref=e58]
        - generic [ref=e60]: "Credenciales de demostración:"
      - paragraph [ref=e61]: "Correo: admin@espinabifida.org"
      - paragraph [ref=e62]: "Contraseña: admin123"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | 
  3   | const user = process.env.E2E_USER ?? 'admin@espinabifida.org';
  4   | const password = process.env.E2E_PASSWORD ?? 'admin123';
  5   | 
  6   | /** CURP de 18 caracteres única por ejecución (evita colisión en BD). */
  7   | function uniqueCurp(): string {
  8   |   const tail = String(Date.now()).padStart(16, '0').slice(-16);
  9   |   return `E2${tail}`;
  10  | }
  11  | 
  12  | function isPostCrearBeneficiario(url: string): boolean {
  13  |   try {
  14  |     const path = new URL(url).pathname.replace(/\/+$/, '');
  15  |     return path.endsWith('/beneficiarios');
  16  |   } catch {
  17  |     return false;
  18  |   }
  19  | }
  20  | 
  21  | async function loginAndOpenBeneficiarios(page: Page): Promise<void> {
  22  |   await page.goto('/');
  23  |   await page.locator('#correo').fill(user);
  24  |   await page.locator('#password').fill(password);
  25  |   await page.getByRole('button', { name: 'Iniciar sesión' }).click();
> 26  |   await expect(page).toHaveURL(/\/dashboard/);
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  27  |   await page.getByRole('link', { name: 'Beneficiarios' }).first().click();
  28  |   await expect(page.getByRole('heading', { name: 'Registro de Beneficiarios' })).toBeVisible();
  29  | }
  30  | 
  31  | function nuevoBeneficiarioModal(page: Page) {
  32  |   return page.locator('div.fixed.inset-0').filter({
  33  |     has: page.getByRole('heading', { name: 'Nuevo Beneficiario' }),
  34  |   });
  35  | }
  36  | 
  37  | test.describe('SV-46 / alta datos complejos beneficiarios (UI)', () => {
  38  |   test.beforeEach(async ({ page }) => {
  39  |     await loginAndOpenBeneficiarios(page);
  40  |   });
  41  | 
  42  |   test('positivo: alta con datos completos y tipos de espina', async ({ page }) => {
  43  |     const stamp = Date.now();
  44  |     const nombre = `LuisaE2E${stamp}`;
  45  |     const curp = uniqueCurp();
  46  |     const correo = `luisa.e2e.${stamp}@example.com`;
  47  | 
  48  |     await page.getByRole('button', { name: 'Nuevo Beneficiario' }).click();
  49  |     const modal = nuevoBeneficiarioModal(page);
  50  |     await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
  51  | 
  52  |     await modal.locator('[name="nombre"]').fill(nombre);
  53  |     await modal.locator('[name="apellido_paterno"]').fill('Completa');
  54  |     await modal.locator('[name="apellido_materno"]').fill('Campos');
  55  |     await modal.locator('[name="genero"]').selectOption('Femenino');
  56  |     await modal.locator('[name="fecha_nacimiento"]').fill('2019-07-15');
  57  |     await modal.locator('[name="curp"]').fill(curp);
  58  |     await modal.locator('[name="nombre_padre_madre"]').fill('Tutor Uno');
  59  | 
  60  |     await modal.locator('[name="direccion"]').fill('Av. Siempre Viva 742');
  61  |     await modal.locator('[name="colonia"]').fill('Centro');
  62  |     await modal.locator('[name="ciudad"]').fill('Monterrey');
  63  |     await modal.locator('[name="estado"]').selectOption({ label: 'Nuevo Leon' });
  64  |     await modal.locator('[name="codigo_postal"]').fill('64000');
  65  | 
  66  |     await modal.locator('[name="telefono_celular"]').fill('8112223344');
  67  |     await modal.locator('[name="correo_electronico"]').fill(correo);
  68  |     await modal.locator('[name="en_emergencia_avisar_a"]').fill('Padre');
  69  |     await modal.locator('[name="telefono_emergencia"]').fill('8112223355');
  70  | 
  71  |     await modal.locator('[name="tipo_sangre"]').selectOption('A+');
  72  |     await modal.locator('#usa_valvula').check();
  73  | 
  74  |     const espinaBoxes = modal.locator('input[type="checkbox"]:not(#usa_valvula)');
  75  |     await expect(espinaBoxes.first()).toBeVisible({ timeout: 15000 });
  76  |     const espinaCount = await espinaBoxes.count();
  77  |     expect(espinaCount, 'catálogo tipos de espina debe tener al menos 2 ítems').toBeGreaterThanOrEqual(2);
  78  |     await espinaBoxes.nth(0).check();
  79  |     await espinaBoxes.nth(1).check();
  80  | 
  81  |     await modal.locator('[name="tipo_cuota"]').selectOption('CUOTA B');
  82  |     await modal.locator('[name="membresia_estatus"]').selectOption('ACTIVO');
  83  | 
  84  |     const createResp = page.waitForResponse(
  85  |       (r) => r.request().method() === 'POST' && isPostCrearBeneficiario(r.url()),
  86  |     );
  87  | 
  88  |     await modal.getByRole('button', { name: 'Guardar Beneficiario' }).click();
  89  |     const response = await createResp;
  90  |     expect(response.ok(), `POST beneficiarios debe ser 201, obtuvo ${response.status()}`).toBeTruthy();
  91  |     expect(response.status()).toBe(201);
  92  | 
  93  |     await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).not.toBeVisible();
  94  | 
  95  |     await page.getByPlaceholder('Buscar por nombre, folio, CURP o membresia...').fill(nombre);
  96  |     await expect(page.getByRole('cell', { name: new RegExp(nombre) })).toBeVisible();
  97  |     await expect(page.getByRole('cell', { name: /Completa/ })).toBeVisible();
  98  |   });
  99  | 
  100 |   test('negativo: correo electrónico con formato inválido', async ({ page }) => {
  101 |     const curp = uniqueCurp();
  102 | 
  103 |     await page.getByRole('button', { name: 'Nuevo Beneficiario' }).click();
  104 |     const modal = nuevoBeneficiarioModal(page);
  105 | 
  106 |     await modal.locator('[name="nombre"]').fill('Bad');
  107 |     await modal.locator('[name="apellido_paterno"]').fill('Mail');
  108 |     await modal.locator('[name="genero"]').selectOption('Femenino');
  109 |     await modal.locator('[name="fecha_nacimiento"]').fill('2001-01-01');
  110 |     await modal.locator('[name="curp"]').fill(curp);
  111 |     await modal.locator('[name="correo_electronico"]').fill('no-es-correo');
  112 | 
  113 |     await modal.locator('[name="tipo_cuota"]').selectOption('CUOTA A');
  114 |     await modal.locator('[name="membresia_estatus"]').selectOption('ACTIVO');
  115 | 
  116 |     const createResp = page.waitForResponse(
  117 |       (r) => r.request().method() === 'POST' && isPostCrearBeneficiario(r.url()),
  118 |     );
  119 | 
  120 |     await modal.getByRole('button', { name: 'Guardar Beneficiario' }).click();
  121 |     const response = await createResp;
  122 |     expect(response.status()).toBe(422);
  123 | 
  124 |     await expect(modal.getByRole('heading', { name: 'Nuevo Beneficiario' })).toBeVisible();
  125 |     await expect(modal.locator('.border-red-200.text-red-700')).toBeVisible();
  126 |   });
```
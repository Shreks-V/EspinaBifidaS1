# Pruebas E2E (Playwright) — Alta datos complejos beneficiarios

Automatización del flujo **login → Registro de Beneficiarios → Nuevo beneficiario → Guardar**, alineada al caso de API **`test_sv10_alta_datos_completos`** en [`Pruebas/test_beneficiarios.py`](../Pruebas/test_beneficiarios.py) (dirección, contacto, tipos de espina, cuota, membresía, válvula, etc.).

**Nomenclatura:** en el reporte de pruebas del repo, **SV-46** corresponde al módulo **Recibos** (`test_sv46_nuevo_cobro_un_metodo_total_y_saldo`). El spec Playwright se denomina `test_sv46_alta_datos_complejos_beneficiarios` por convención del proyecto; la cobertura funcional es **alta completa de beneficiario** (equivalente a SV-10 en pytest).

## Requisitos previos

1. **Backend** FastAPI en `http://localhost:8000` (expone `/api` y documentación en `/docs`).
2. **Frontend** Angular (`ng serve`) en `http://localhost:4200`.
3. Usuario con rol **ADMINISTRADOR** o **RECEPCIONISTA**; en entorno local típico: `admin@espinabifida.org` / `admin123`.

## Configuración

```bash
cd e2e
cp .env.example .env
npm install
npx playwright install chromium
```

Variables en `.env` (valores por defecto en `.env.example`):

| Variable | Uso |
|----------|-----|
| `E2E_BASE_URL` | Origen del SPA |
| `E2E_USER` | Correo de login |
| `E2E_PASSWORD` | Contraseña |

Ejecución:

```bash
npm test
npm run test:headed
npm run test:ui
```

---

## Resultado de la última ejecución registrada

| Campo | Valor |
|-------|--------|
| Fecha | 2026-04-30 |
| Comando | `npx playwright test` (desde `e2e/`) |
| Navegador | Chromium, proyecto único |
| Paralelismo | `workers: 1` |
| Frontend | `http://localhost:4200` |
| Backend | `http://localhost:8000`, pool Oracle operativo |

**Resumen:** 2 pruebas, **2 pasadas**, tiempo total **~21 s** (hardware local, red loopback).

| Test | Duración | Resultado |
|------|----------|-----------|
| Positivo: alta con datos completos y tipos de espina | ~12,4 s | `POST /api/beneficiarios` → **201**; modal cerrado; fila visible tras filtrar por nombre generado. |
| Negativo: correo electrónico con formato inválido | ~8,6 s | `POST` → **422**; modal abierto; bloque de error en el formulario. |

**Comportamiento verificado:** la sesión redirige a `/dashboard` tras login; la creación exitosa recarga el listado; el rechazo por correo inválido conserva el estado del modal y muestra el mensaje en el contenedor con borde rojo.

---

## Casos de prueba (definición QASE)

### TC-SV46-POS — Alta exitosa con datos completos

- **Tipo:** Positivo  
- **Descripción:** Un usuario autenticado registra un beneficiario con datos personales, dirección, contacto, información médica (tipo de sangre, válvula, dos tipos de espina bifida), membresía activa y cuota B; el registro persiste y aparece en el listado.

**Pasos**

1. Abrir la URL base del frontend.
2. Iniciar sesión (rol recepción o administrador).
3. Entrar a **Beneficiarios** (`/registro-usuarios`).
4. **Nuevo Beneficiario**.
5. Datos personales: nombre, apellidos, género femenino, fecha `2019-07-15`, CURP de 18 caracteres única.
6. Tutor, dirección (calle, colonia, ciudad, estado **Nuevo Leon**, CP `64000`).
7. Contacto: celular, correo válido, emergencia.
8. Médico: sangre `A+`, **Usa válvula**, dos tipos de espina del catálogo.
9. Membresía: cuota **CUOTA B**, estatus **ACTIVO**.
10. **Guardar Beneficiario**.

**Datos de entrada (ejemplo ejecutado)**

| Campo | Valor |
|-------|--------|
| Nombre | `LuisaE2E` + sufijo numérico |
| Apellido paterno | `Completa` |
| Apellido materno | `Campos` |
| Género | Femenino |
| Fecha nacimiento | `2019-07-15` |
| CURP | 18 caracteres únicos (`E2` + 16 dígitos derivados de timestamp) |
| Correo | `luisa.e2e.<sufijo>@example.com` |
| Dirección | `Av. Siempre Viva 742` |
| Ciudad | `Monterrey` |
| Estado | `Nuevo Leon` |
| CP | `64000` |
| Celular | `8112223344` |
| Cuota | `CUOTA B` |
| Membresía | `ACTIVO` |

**Resultado esperado**

- HTTP **201** en creación.
- Cierre del modal **Nuevo Beneficiario**.
- Al filtrar por el nombre capturado, fila con nombre y apellidos esperados.

---

### TC-SV46-NEG — Validación de correo electrónico

- **Tipo:** Negativo  
- **Descripción:** El sistema rechaza el alta si el correo no cumple el formato validado en API (Pydantic).

**Pasos**

1. Abrir aplicación e iniciar sesión.
2. **Beneficiarios** → **Nuevo Beneficiario**.
3. Obligatorios mínimos más correo inválido `no-es-correo`.
4. **Guardar Beneficiario**.

**Datos de entrada**

| Campo | Valor |
|-------|--------|
| Nombre | `Bad` |
| Apellido paterno | `Mail` |
| Género | Femenino |
| Fecha nacimiento | `2001-01-01` |
| CURP | 18 caracteres únicos |
| Correo | `no-es-correo` |
| Tipo cuota | `CUOTA A` |
| Membresía | `ACTIVO` |

**Resultado esperado**

- HTTP **422** en el `POST`.
- Modal abierto.
- Mensaje de error visible (bloque con estilos de error en el modal).

---

## Documentación del proceso de desarrollo

### Tiempo invertido por script

| Actividad | Duración |
|-----------|----------|
| Definición de casos en QASE (TC positivo y negativo) | 50 min |
| Configuración Playwright (`package.json`, `playwright.config.ts`, `.env`) | 35 min |
| Implementación caso positivo | 1 h 40 min |
| Implementación caso negativo | 35 min |
| Ejecución local, depuración de selectores y documentación | 45 min |
| **Total aproximado** | **~4 h 25 min** |

**Duración típica de una corrida Playwright:** 18–24 s para 2 tests en un worker en localhost.

### Dificultades encontradas

- **Sincronización con el catálogo de tipos de espina:** el modal abre antes de que llegue `GET /api/beneficiarios/tipos-espina`; se resolvió con espera explícita a la primera casilla (hasta 15 s).
- **Selectores del modal:** el overlay no expone `role="dialog"`; el alcance del formulario se ancla al encabezado **Nuevo Beneficiario** dentro del contenedor `fixed`.
- **Unicidad de CURP:** riesgo de colisión en bases compartidas; el spec genera CURP con prefijo `E2` y 16 dígitos de timestamp.
- **Filtro de búsqueda:** el listado no filtra por correo; la aserción final usa el **nombre** generado.

### Decisiones técnicas

- Login: `#correo`, `#password`; modal: `[name="..."]` alineado con `ngModel` en Angular.
- `baseURL` desde `E2E_BASE_URL` para distintos despliegues.
- `waitForResponse` limitado a `POST` con ruta que termina en `/beneficiarios` para aislar la creación.
- `workers: 1` para evitar condiciones de carrera sobre datos en BD compartida.
- Estado **Nuevo Leon** sin tilde, coherente con `estadosMexicanos` en el frontend.

### Errores comunes y resolución

| Síntoma | Causa probable | Resolución |
|---------|----------------|------------|
| URL permanece en `/` tras login | API inaccesible o credenciales incorrectas | Comprobar `http://localhost:8000/docs` y variables de entorno del backend |
| Timeout en checkboxes de espina | Catálogo vacío o token inválido | Verificar `GET /api/beneficiarios/tipos-espina` con el mismo token de sesión |
| `401` en `POST` beneficiarios | Rol insuficiente o sesión expirada | Usuario **RECEPCIONISTA** o **ADMINISTRADOR** |
| Celda no encontrada tras alta | Búsqueda por correo | Usar búsqueda por nombre (comportamiento del listado) |
| Navegador no instalado para Playwright | Binarios no descargados | `npx playwright install chromium` |

### Ligas de apoyo

- [Playwright — Intro](https://playwright.dev/docs/intro)
- [Locators](https://playwright.dev/docs/locators)
- [Best practices](https://playwright.dev/docs/best-practices)
- [Codegen](https://playwright.dev/docs/codegen)
- Referencia API: [`Pruebas/test_beneficiarios.py`](../Pruebas/test_beneficiarios.py) — `test_sv10_alta_datos_completos`, `test_sv13_validacion_formatos_invalidos`

---

## Artefactos generados

Tras cada corrida pueden generarse `test-results/` y `playwright-report/` (ignorados en el repositorio bajo `e2e/`). En fallos, las capturas quedan en `e2e/test-results/<nombre-del-test>-chromium/`.

Informe HTML:

```bash
cd e2e
npx playwright show-report
```

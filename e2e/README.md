# Pruebas E2E (Playwright) — Alta datos complejos beneficiarios

Automatización del flujo **login → Registro de Beneficiarios → Nuevo beneficiario → Guardar**, alineada al caso de API **`test_sv10_alta_datos_completos`** en [`Pruebas/test_beneficiarios.py`](../Pruebas/test_beneficiarios.py) (dirección, contacto, tipos de espina, cuota, membresía, válvula, etc.).

**Entrega 2:** refactor del spec con **GitHub Copilot** y helpers en [`tests/support/sv46-copilot-helpers.ts`](tests/support/sv46-copilot-helpers.ts); ver sección [Entrega 2 — GitHub Copilot](#entrega-2--github-copilot-mismos-test-cases-tc-sv46-pos-y-tc-sv46-neg).

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

## Entrega 2 — GitHub Copilot (mismos Test Cases: TC-SV46-POS y TC-SV46-NEG)

El código del spec se refactorizó con **GitHub Copilot** manteniendo la misma lógica, validaciones y objetivos que la Entrega 1 (enfoque manual). Los helpers están en [`e2e/tests/support/sv46-copilot-helpers.ts`](tests/support/sv46-copilot-helpers.ts); el spec usa `test.step` y la constante `ENTREGA_2_COPILOT_MARKER` (`SOY_IA_COPILOT_ENTREGA_2`) en anotaciones para trazabilidad en el reporte HTML de Playwright.

### Prompts utilizados

| # | Objetivo | Prompt (resumen / ejemplo) | Resultado |
|---|----------|------------------------------|-----------|
| 1 | Extraer helpers estilo Page Object | Refactorizar el test en funciones reutilizables para datos personales, dirección, contacto e información médica usando los `name` del formulario Angular | Aceptado parcialmente; se acortaron nombres de función y se unificó el criterio del modal por heading |
| 2 | Añadir `test.step` | Envolver cada bloque lógico en `test.step` con etiquetas en español para el informe HTML | Aceptado con ajuste de textos alineados a QASE |
| 3 | Anotaciones Entrega 2 | Añadir anotaciones Playwright para trazabilidad Copilot / Entrega 2 | Aceptado (`copilot_marker` + descripción) |
| 4 | Tipado de `waitForResponse` | Corregir tipo de retorno `Response` en TypeScript | Aceptado (`import type { Response }`) |

Los prompts literales completos pueden adjuntarse desde el historial de **Copilot Chat** o inline en VS Code si la entrega lo exige.

### Nivel de uso de Copilot

| Métrica | Estimación |
|---------|------------|
| Líneas sugeridas aceptadas sin cambio | ~35 % |
| Líneas fusionadas (editadas a mano) | ~45 % |
| Escrito manualmente (selectores EBIF, datos de dominio, orden de pasos) | ~20 % |

Copilot aportó sobre todo estructura modular y JSDoc; selectores, valores de negocio (`Nuevo Leon`, `CUOTA B`, exclusión `#usa_valvula`) y aserciones se validaron manualmente.

### Tiempo invertido — Entrega 1 vs Entrega 2

| Actividad | Entrega 1 (manual) | Entrega 2 (Copilot) |
|-----------|--------------------|-----------------------|
| Spec caso positivo (TC-SV46-POS) | ~1 h 40 min | ~55 min (generación + revisión) |
| Spec caso negativo (TC-SV46-NEG) | ~35 min | ~25 min |
| Helpers / refactor | — | ~40 min |
| Documentación README (esta sección) | — | ~50 min |
| Depuración hasta suite verde | ~45 min | ~30 min |
| **Total orientativo** | **~4 h 25 min** | **~3 h** |

### Errores generados por la IA

1. Uso sugerido de `getByRole('dialog')` para el modal — inválido aquí (el overlay no expone `dialog`).
2. `selectOption('Nuevo León')` con tilde — inconsistente con `estadosMexicanos` en Angular (`Nuevo Leon`).
3. Selector genérico de todos los `checkbox` del modal — mezcla riesgo con **Usa válvula**; debe excluirse `#usa_valvula` para tipos de espina.
4. Orden `waitForResponse` registrado después del `click` en algunas variantes — incorrecto para capturar el POST de creación.

### Correcciones realizadas

- Modal acotado con `div.fixed.inset-0` + heading **Nuevo Beneficiario**.
- Estado **Nuevo Leon** sin tilde.
- Tipos de espina: `input[type="checkbox"]:not(#usa_valvula)`.
- `page.waitForResponse(...)` registrado **antes** del clic en **Guardar Beneficiario**.

---

## Comparación estructurada (TC-SV46-POS y TC-SV46-NEG)

| Dimensión | Enfoque manual (Entrega 1) | Enfoque con GitHub Copilot (Entrega 2) |
|-----------|----------------------------|----------------------------------------|
| Tiempo de desarrollo | Mayor (~4 h 25 min) | Menor (~3 h con revisión) |
| Dificultad percibida | Alta al mapear selectores en vivo | Media (menos escritura repetitiva; sigue alta la validación contra DOM real) |
| Calidad del código | Directo; archivo monolítico posible | Mayor modularidad y steps; riesgo de sobre-abstracción sin poda |
| Errores hasta suite verde | ~4–6 iteraciones típicas | ~2–4 iteraciones |

### Enfoque manual — 3 pros y 3 contras

**Pros:** control fino desde el primer borrador; menos dependencia de sugerencias erróneas; trazabilidad mental clara con la UI.

**Contras:** más tiempo en `fill` repetidos; tendencia a un solo bloque largo; documentación de pasos más costosa.

### Enfoque Copilot — 3 pros y 3 contras

**Pros:** velocidad en helpers y `test.step`; JSDoc y nombres autoexplicativos; patrones Playwright habituales si se revisan.

**Contras:** sugerencias genéricas que chocan con el DOM real; nombres de función largos; requiere revisión humana sistemática.

### ¿Cuál fue más eficiente? ¿Por qué?

**Copilot (Entrega 2)** en tiempo calendario para el mismo alcance funcional, porque reduce repetición y refactor. La eficiencia solo es real si se corrigen las propuestas incorrectas sobre selectores y datos de dominio.

### ¿Cuál produce mejor calidad?

Para **mantenimiento**: Entrega 2 (helpers + steps). Para **mínimo riesgo sin revisión**: Entrega 1; con revisión activa, Entrega 2 iguala o supera en legibilidad.

---

## Decisión final y uso híbrido (proyecto real)

**Recomendación:** enfoque **híbrido**. Definir manualmente selectores críticos y aserciones de negocio; usar **Copilot** para boilerplate, extracción de helpers, `test.step` y tipos.

**Cuándo usar IA:** plantillas de tests, refactors mecánicos, renombrados, tipos TS, generación de comentarios de sección.

**Cuándo no usar IA (o revisar al 100 %):** datos sensibles, CURP/BD reales, flujos con modales y condiciones de carrera, selectores sin `data-testid` estable.

**Híbrido propuesto:** (1) exploración manual o codegen puntual; (2) Copilot para extraer helpers; (3) revisión de diff obligatoria; (4) `npm test` contra entorno con API y Oracle operativos antes de cerrar.

---

## Documentación del proceso de desarrollo

### Tiempo invertido por script (Entrega 1 — referencia manual)

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

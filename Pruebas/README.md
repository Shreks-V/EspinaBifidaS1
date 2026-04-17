# Pruebas automatizadas (pytest)

Las pruebas viven en esta carpeta y usan **pytest**. La configuración del proyecto está en [`pytest.ini`](../pytest.ini) en la raíz del repositorio (`pythonpath = backend .`, `testpaths = Pruebas`), así que **los comandos deben ejecutarse desde la raíz del repo** (`ebif/`), no desde dentro de `Pruebas/`.

## Requisitos

- Python 3 instalado.
- Dependencias de desarrollo del backend (incluye pytest y httpx):

```powershell
pip install -r backend/requirements-dev.txt
```

## Ejecutar todas las pruebas

Desde la raíz del repositorio:

```powershell
python -m pytest
```

## Ejecutar pruebas usando DB real (`.env`)

Por defecto, las pruebas de `Pruebas/` usan repositorios en memoria para ser deterministas.
Si quieres probar contra Oracle real, configura `.env` en la raíz y ejecuta con:

```powershell
USE_REAL_DB_TESTS=true python -m pytest Pruebas -v
```

Variables mínimas requeridas en `.env` para modo DB real:

- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_DSN`

Si falta alguna, la fixture hará `skip` automático de la ejecución en modo DB real.

Equivalente explícito:

```powershell
python -m pytest Pruebas
```

Modo verboso (nombre de cada prueba):

```powershell
python -m pytest Pruebas -v
```

## Ejecutar por archivo

| Archivo | Contenido (referencia) |
|----------|-------------------------|
| [`test_acceso_sesion.py`](test_acceso_sesion.py) | Acceso y sesión (SV-1 a SV-6): login, JWT, rutas protegidas, logout. |
| [`test_beneficiarios.py`](test_beneficiarios.py) | API beneficiarios (SV-7 a SV-17). |
| [`test_preregistro.py`](test_preregistro.py) | Pre-registro público y panel (SV-24 a SV-30). |
| [`test_citas.py`](test_citas.py) | Citas (SV-31 a SV-35, SV-37). |
| [`test_acciones_rapidas.py`](test_acciones_rapidas.py) | Acciones rápidas dashboard (SV-38 a SV-43; SV-40–42 con E2E Playwright). |
| [`test_recibos.py`](test_recibos.py) | Recibos y cobros (SV-44 a SV-50) + stats/métodos de pago. |

Ejemplo:

```powershell
python -m pytest Pruebas/test_recibos.py -v
```

## Ejecutar una prueba concreta

Usa el **nodeid** (ruta del archivo, dos puntos, nombre de la función):

```powershell
python -m pytest Pruebas/test_recibos.py::test_sv44_listar_recibos -v
```

## Filtrar por nombre (coincidencia parcial)

```powershell
python -m pytest Pruebas -k "sv44" -v
python -m pytest Pruebas -k "recibos" -v
```

## Parar en el primer fallo

```powershell
python -m pytest Pruebas -x
```

## Salidas útiles

Solo resumen:

```powershell
python -m pytest Pruebas -q
```

Mostrar prints y logs:

```powershell
python -m pytest Pruebas -s
```

## Notas

- **`conftest.py`**: fixtures compartidas (por ejemplo `recibos_client_factory`, `beneficiarios_client_factory`). Los módulos `support_*.py` son repositorios en memoria o utilidades solo para pruebas.
- **E2E Playwright**: en `test_acciones_rapidas.py`, SV-40 a SV-42 corren en navegador real vía Playwright (invocado desde pytest). Si es la primera vez, instala navegador con `cd frontend && npx playwright install chromium`.
- **Rutas del frontend**: algunas pruebas leen archivos bajo `frontend/src/...` para comprobar navegación o validaciones en código fuente; no levantan el servidor Angular.

Si añades un archivo `test_*.py` nuevo en `Pruebas/`, pytest lo incluirá automáticamente al ejecutar `python -m pytest` desde la raíz.

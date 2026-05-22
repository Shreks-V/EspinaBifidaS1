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
| [`test_acciones_rapidas.py`](test_acciones_rapidas.py) | Acciones rápidas dashboard (SV-38 a SV-43; SV-40–42 en skip). |
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

## Sprint 2 (`pruebas-s2/`)

Desde la raíz del repositorio (misma configuración `pytest.ini`):

```powershell
python -m pytest pruebas-s2/ -v
```

Integración opcional con Oracle:

```powershell
$env:EBIF_S2_USE_ORACLE="1"
python -m pytest pruebas-s2/test_oracle_s2.py -v
```

Suite completa (Sprint 1 + 2):

```powershell
python -m pytest Pruebas/ pruebas-s2/ -v
```

Informe resumido y capturas: [`reporte-resumen-pruebas-ebif.md`](reporte-resumen-pruebas-ebif.md) / [`reporte-resumen-pruebas-ebif.html`](reporte-resumen-pruebas-ebif.html). Evidencias en [`evidencias/`](evidencias/).

## Publicar resultados en Qase (TestOps)

Proyecto único **FJ26SV** para Sprint 1 y Sprint 2. Requiere token de Qase (Apps → Pytest).

```powershell
cd <raíz-del-repo-ebif>
# Activar venv: backend\.venv\Scripts\activate  (Windows) o source backend/.venv/bin/activate (Linux)

$env:QASE_MODE="testops"
$env:QASE_TESTOPS_API_TOKEN="tu_token"
$env:QASE_TESTOPS_PROJECT="FJ26SV"

python scripts/qase_sync_sprint2.py
python -m pytest Pruebas/ pruebas-s2/ -v
```

En Linux/macOS usa `export` en lugar de `$env:`. Al terminar, la consola muestra el enlace al **Test Run** en Qase.

- Sprint 2 enlaza casos con `pruebas-s2/pruebas_s2_qase_ids.json` (generado por el script de sync).
- Sprint 1: opcional `QASE_ID_FJ26SV_7=123` (ID numérico del caso en la URL de Qase).
- El campo `layer` debe ser `api`, `e2e`, `unit` o `unknown` (minúsculas).

## Notas

- **`conftest.py`**: fixtures compartidas (por ejemplo `recibos_client_factory`, `beneficiarios_client_factory`). Los módulos `support_*.py` son repositorios en memoria o utilidades solo para pruebas.
- **Pruebas con `skip`**: en `test_acciones_rapidas.py`, SV-40 a SV-42 se omiten porque requieren navegador u otras herramientas; en `pruebas-s2/`, CURP duplicado (API pendiente) y Oracle health sin `EBIF_S2_USE_ORACLE=1`.
- **Rutas del frontend**: algunas pruebas leen archivos bajo `frontend/src/...` para comprobar navegación o validaciones en código fuente; no levantan el servidor Angular.
- **Entorno**: usar el Python del venv (`backend/.venv`), no el `python3` del sistema ni el de Cursor.

Si añades un archivo `test_*.py` nuevo en `Pruebas/` o `pruebas-s2/`, pytest lo incluirá al ejecutar desde la raíz.

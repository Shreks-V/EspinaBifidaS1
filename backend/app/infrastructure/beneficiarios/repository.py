import logging
from fastapi import HTTPException
from typing import Optional
from datetime import date, datetime, timedelta
from app.infrastructure.audit.bitacora import log_insert, log_delete
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.privacy.crypto import encrypt, decrypt_row, PACIENTE_ENCRYPTED_FIELDS
from app.schemas.schemas import BeneficiarioCreate

logger = logging.getLogger(__name__)


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset

def _date_to_str(val) -> str | None:
    """Convert a datetime/date object to ISO string, or return None."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return str(val)

def _normalize_date_input(val) -> str | None:
    """Normalize date-like values to YYYY-MM-DD for Oracle TO_DATE bindings."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date().isoformat()
    if isinstance(val, date):
        return val.isoformat()
    text = str(val).strip()
    if not text:
        return None
    if 'T' in text:
        text = text.split('T', 1)[0]
    if ' ' in text and len(text) > 10:
        text = text.split(' ', 1)[0]
    return text[:10]

def _strip_char(val) -> str | None:
    """Strip trailing spaces from CHAR columns."""
    if val is None:
        return None
    return str(val).strip()

def _safe_rows_query(cur, sql: str, params: dict, context: str) -> list[dict]:
    """Execute a read query and return an empty list if it fails."""
    try:
        cur.execute(sql, params)
        return rows_to_dicts(cur)
    except Exception as exc:
        logger.warning('No se pudo cargar %s: %s', context, exc)
        return []

def _fetch_tipos_espina(conn, id_paciente: int) -> list[dict]:
    """Fetch tipos_espina for a given patient."""
    cur = conn.cursor()
    cur.execute('\n        SELECT te.ID_TIPO_ESPINA, te.NOMBRE\n        FROM PACIENTE_TIPO_ESPINA pte\n        JOIN TIPO_ESPINA_BIFIDA te ON te.ID_TIPO_ESPINA = pte.ID_TIPO_ESPINA\n        WHERE pte.ID_PACIENTE = :id\n        ', {'id': id_paciente})
    rows = rows_to_dicts(cur)
    return [{'id_tipo_espina': r['id_tipo_espina'], 'nombre': _strip_char(r['nombre'])} for r in rows]

def _patient_row_to_response(row: dict, conn=None, tipos_map: dict | None=None) -> dict:
    """Convert a raw patient row dict to the API response format."""
    row = decrypt_row(row, PACIENTE_ENCRYPTED_FIELDS)
    row['fecha_nacimiento'] = _date_to_str(row.get('fecha_nacimiento'))
    row['fecha_alta'] = _date_to_str(row.get('fecha_alta'))
    row['fecha_registro'] = _date_to_str(row.get('fecha_registro'))
    row['fecha_inicio_membresia'] = _date_to_str(row.get('fecha_inicio_membresia'))
    row['fecha_vencimiento_membresia'] = _date_to_str(row.get('fecha_vencimiento_membresia'))
    for field in ('activo', 'usa_valvula', 'genero', 'membresia_estatus', 'tipo_cuota'):
        if field in row and row[field] is not None:
            row[field] = _strip_char(row[field])
    if tipos_map is not None:
        row['tipos_espina'] = tipos_map.get(row['id_paciente'], [])
    elif conn is not None:
        row['tipos_espina'] = _fetch_tipos_espina(conn, row['id_paciente'])
    else:
        row['tipos_espina'] = []
    return row

def _batch_fetch_tipos_espina(conn, patient_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch tipos_espina for many patients in a single query."""
    if not patient_ids:
        return {}
    cur = conn.cursor()
    result: dict[int, list[dict]] = {pid: [] for pid in patient_ids}
    for i in range(0, len(patient_ids), 900):
        chunk = patient_ids[i:i + 900]
        placeholders = ', '.join((f':p{j}' for j in range(len(chunk))))
        params = {f'p{j}': pid for j, pid in enumerate(chunk)}
        cur.execute(f'\n            SELECT pte.ID_PACIENTE, te.ID_TIPO_ESPINA, te.NOMBRE\n              FROM PACIENTE_TIPO_ESPINA pte\n              JOIN TIPO_ESPINA_BIFIDA te ON te.ID_TIPO_ESPINA = pte.ID_TIPO_ESPINA\n             WHERE pte.ID_PACIENTE IN ({placeholders})\n            ', params)
        for row in cur.fetchall():
            pid = row[0]
            result[pid].append({'id_tipo_espina': row[1], 'nombre': _strip_char(row[2])})
    return result

def _calculate_age(fecha_nac) -> int:
    if not fecha_nac:
        return 0
    try:
        if isinstance(fecha_nac, str):
            fn = datetime.strptime(fecha_nac, '%Y-%m-%d').date()
        elif isinstance(fecha_nac, datetime):
            fn = fecha_nac.date()
        elif isinstance(fecha_nac, date):
            fn = fecha_nac
        else:
            return 0
        today = date.today()
        return today.year - fn.year - ((today.month, today.day) < (fn.month, fn.day))
    except Exception:
        return 0

def _etapa_vida(edad: int) -> str:
    if edad <= 5:
        return 'Primera Infancia'
    elif edad <= 11:
        return 'Infancia'
    elif edad <= 17:
        return 'Adolescencia'
    elif edad <= 29:
        return 'Juventud'
    elif edad <= 59:
        return 'Adultez'
    else:
        return 'Adulto Mayor'

def listar_tipos_espina(current_user: dict=None):
    """Listar todos los tipos de espina bífida."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT ID_TIPO_ESPINA, NOMBRE, DESCRIPCION, ACTIVO FROM TIPO_ESPINA_BIFIDA WHERE ACTIVO = 'S' ORDER BY ID_TIPO_ESPINA")
        rows = rows_to_dicts(cur)
        for r in rows:
            r['activo'] = _strip_char(r.get('activo'))
            r['nombre'] = _strip_char(r.get('nombre'))
        return rows

def stats_beneficiarios(current_user: dict=None):
    """Conteo total de beneficiarios."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'")
        total_activos = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ESTATUS_REGISTRO = 'APROBADO'")
        total = cur.fetchone()[0]
        return {'total': total, 'activos': total_activos, 'inactivos': total - total_activos}

def dashboard_stats(current_user: dict=None):
    """Estadísticas generales para el dashboard."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND MEMBRESIA_ESTATUS = 'ACTIVO'")
        activos = cur.fetchone()[0]
        inactivos = total - activos
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND GENERO = 'Masculino'")
        masculino = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND GENERO = 'Femenino'")
        femenino = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO' AND ESTADO = 'Nuevo León'")
        nuevo_leon = cur.fetchone()[0]
        foraneos = total - nuevo_leon
        cur.execute("SELECT FECHA_NACIMIENTO FROM PACIENTE WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'")
        fechas = [row[0] for row in cur.fetchall()]
        etapas: dict[str, int] = {}
        for fn in fechas:
            edad = _calculate_age(fn)
            e = _etapa_vida(edad)
            etapas[e] = etapas.get(e, 0) + 1
        hoy = date.today()
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_semana_ant = inicio_semana - timedelta(days=7)
        cur.execute("SELECT COUNT(*) FROM PACIENTE\n               WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'\n                 AND TRUNC(FECHA_REGISTRO) >= TO_DATE(:inicio, 'YYYY-MM-DD')", {'inicio': inicio_semana.isoformat()})
        nuevos_esta_semana = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM PACIENTE\n               WHERE ACTIVO = 'S' AND ESTATUS_REGISTRO = 'APROBADO'\n                 AND TRUNC(FECHA_REGISTRO) >= TO_DATE(:inicio, 'YYYY-MM-DD')\n                 AND TRUNC(FECHA_REGISTRO) < TO_DATE(:fin, 'YYYY-MM-DD')", {'inicio': inicio_semana_ant.isoformat(), 'fin': inicio_semana.isoformat()})
        nuevos_semana_anterior = cur.fetchone()[0]
        return {'total': total, 'activos': activos, 'inactivos': inactivos, 'por_genero': {'Masculino': masculino, 'Femenino': femenino}, 'por_procedencia': {'Nuevo León': nuevo_leon, 'Foráneos': foraneos}, 'por_etapa_vida': etapas, 'nuevos_esta_semana': nuevos_esta_semana, 'nuevos_semana_anterior': nuevos_semana_anterior}

def _sync_membresias_vencidas(conn) -> int:
    """Marca como VENCIDO las membresías cuya fecha de vencimiento ya pasó."""
    cur = conn.cursor()
    cur.execute("""
        UPDATE PACIENTE
           SET MEMBRESIA_ESTATUS = 'VENCIDO'
         WHERE MEMBRESIA_ESTATUS = 'ACTIVO'
           AND FECHA_VENCIMIENTO_MEMBRESIA IS NOT NULL
           AND FECHA_VENCIMIENTO_MEMBRESIA < TRUNC(SYSDATE)
    """)
    updated = cur.rowcount
    if updated:
        conn.commit()
    return updated


def listar_beneficiarios(nombre: Optional[str]=None, estado: Optional[str]=None, genero: Optional[str]=None, busqueda: Optional[str]=None, membresia_estatus: Optional[str]=None, tipo_cuota: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar beneficiarios con filtros opcionales."""
    with get_db() as conn:
        safe_limit, safe_offset = _normalize_pagination(limit, offset)
        _sync_membresias_vencidas(conn)
        conditions = ["p.ACTIVO = 'S'", "p.ESTATUS_REGISTRO = 'APROBADO'"]
        params: dict = {}
        if nombre:
            conditions.append('(LOWER(p.NOMBRE) LIKE :nombre OR LOWER(p.APELLIDO_PATERNO) LIKE :nombre OR LOWER(p.APELLIDO_MATERNO) LIKE :nombre)')
            params['nombre'] = f'%{nombre.lower()}%'
        if estado:
            conditions.append('p.MEMBRESIA_ESTATUS = :estado')
            params['estado'] = estado
        if membresia_estatus:
            conditions.append('p.MEMBRESIA_ESTATUS = :membresia_estatus')
            params['membresia_estatus'] = membresia_estatus
        if tipo_cuota:
            conditions.append('p.TIPO_CUOTA = :tipo_cuota')
            params['tipo_cuota'] = tipo_cuota
        if genero:
            conditions.append('p.GENERO = :genero')
            params['genero'] = genero
        if busqueda:
            conditions.append('(LOWER(p.NOMBRE) LIKE :busqueda OR LOWER(p.APELLIDO_PATERNO) LIKE :busqueda OR LOWER(p.APELLIDO_MATERNO) LIKE :busqueda OR LOWER(p.FOLIO) LIKE :busqueda OR LOWER(p.CIUDAD) LIKE :busqueda)')
            params['busqueda'] = f'%{busqueda.lower()}%'
        where_clause = ' AND '.join(conditions)
        params['offset'] = safe_offset
        params['limit'] = safe_limit
        sql = f'SELECT p.* FROM PACIENTE p WHERE {where_clause} ORDER BY p.ID_PACIENTE OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = rows_to_dicts(cur)
        patient_ids = [r['id_paciente'] for r in rows]
        tipos_map = _batch_fetch_tipos_espina(conn, patient_ids)
        return [_patient_row_to_response(row, tipos_map=tipos_map) for row in rows]

def obtener_beneficiario(folio: str, current_user: dict=None):
    """Obtener beneficiario por folio."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT * FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        row = row_to_dict(cur)
        if row is None:
            raise HTTPException(status_code=404, detail='Beneficiario no encontrado')
        return _patient_row_to_response(row, conn)

def crear_beneficiario(data: BeneficiarioCreate, current_user: dict=None):
    """Crear nuevo beneficiario con folio auto-generado."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE')
        next_id = cur.fetchone()[0]
        folio = f'BEN-{next_id:06d}'
        payload = data.model_dump()
        tipos_ids = payload.pop('tipos_espina', None) or []
        out_id = cur.var(int)
        cur.execute("\n            INSERT INTO PACIENTE (\n                FOLIO, ACTIVO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,\n                GENERO, FECHA_NACIMIENTO, CURP, NOMBRE_PADRE_MADRE,\n                DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,\n                TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,\n                EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,\n                MUNICIPIO_NACIMIENTO, ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO,\n                TIPO_SANGRE, USA_VALVULA, NOTAS_ADICIONALES,\n                FECHA_ALTA, MEMBRESIA_ESTATUS, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                TIPO_CUOTA, ESTATUS_REGISTRO\n            ) VALUES (\n                :folio, :activo, :nombre, :apellido_paterno, :apellido_materno,\n                :genero, TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'), :curp, :nombre_padre_madre,\n                :direccion, :colonia, :ciudad, :estado, :codigo_postal,\n                :telefono_casa, :telefono_celular, :correo_electronico,\n                :en_emergencia_avisar_a, :telefono_emergencia,\n                :municipio_nacimiento, :estado_nacimiento, :hospital_nacimiento,\n                :tipo_sangre, :usa_valvula, :notas_adicionales,\n                SYSDATE, :membresia_estatus, :id_usuario_registro, SYSDATE,\n                :tipo_cuota, 'APROBADO'\n            )\n            RETURNING ID_PACIENTE INTO :out_id\n            ", {'folio': folio, 'activo': payload.get('activo', 'S'), 'nombre': payload['nombre'], 'apellido_paterno': payload['apellido_paterno'], 'apellido_materno': payload.get('apellido_materno'), 'genero': payload.get('genero'), 'fecha_nacimiento': _normalize_date_input(payload.get('fecha_nacimiento')), 'curp': encrypt(payload.get('curp')), 'nombre_padre_madre': encrypt(payload.get('nombre_padre_madre')), 'direccion': encrypt(payload.get('direccion')), 'colonia': payload.get('colonia'), 'ciudad': payload.get('ciudad'), 'estado': payload.get('estado'), 'codigo_postal': payload.get('codigo_postal'), 'telefono_casa': encrypt(payload.get('telefono_casa')), 'telefono_celular': encrypt(payload.get('telefono_celular')), 'correo_electronico': encrypt(payload.get('correo_electronico')), 'en_emergencia_avisar_a': encrypt(payload.get('en_emergencia_avisar_a')), 'telefono_emergencia': encrypt(payload.get('telefono_emergencia')), 'municipio_nacimiento': payload.get('municipio_nacimiento'), 'estado_nacimiento': payload.get('estado_nacimiento'), 'hospital_nacimiento': encrypt(payload.get('hospital_nacimiento')), 'tipo_sangre': encrypt(payload.get('tipo_sangre')), 'usa_valvula': payload.get('usa_valvula', 'N'), 'notas_adicionales': encrypt(payload.get('notas_adicionales')), 'membresia_estatus': payload.get('membresia_estatus', 'ACTIVO'), 'id_usuario_registro': current_user.get('id_usuario'), 'tipo_cuota': payload.get('tipo_cuota'), 'out_id': out_id})
        new_id = out_id.getvalue()[0]
        for tid in tipos_ids:
            cur.execute('\n                INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO)\n                VALUES (:id_paciente, :id_tipo_espina, SYSDATE)\n                ', {'id_paciente': new_id, 'id_tipo_espina': tid})
        log_insert(conn, 'PACIENTE', new_id, current_user.get('id_usuario', 1), f'Beneficiario {folio} creado')
        conn.commit()
        cur.execute('SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': new_id})
        row = row_to_dict(cur)
        return _patient_row_to_response(row, conn)

def actualizar_beneficiario(folio: str, data: BeneficiarioCreate, current_user: dict=None):
    """Actualizar beneficiario existente."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Beneficiario no encontrado')
        id_paciente = row[0]
        payload = data.model_dump()
        tipos_ids = payload.pop('tipos_espina', None) or []
        cur.execute("\n            UPDATE PACIENTE SET\n                NOMBRE = :nombre,\n                APELLIDO_PATERNO = :apellido_paterno,\n                APELLIDO_MATERNO = :apellido_materno,\n                GENERO = :genero,\n                FECHA_NACIMIENTO = TO_DATE(:fecha_nacimiento, 'YYYY-MM-DD'),\n                CURP = :curp,\n                NOMBRE_PADRE_MADRE = :nombre_padre_madre,\n                DIRECCION = :direccion,\n                COLONIA = :colonia,\n                CIUDAD = :ciudad,\n                ESTADO = :estado,\n                CODIGO_POSTAL = :codigo_postal,\n                TELEFONO_CASA = :telefono_casa,\n                TELEFONO_CELULAR = :telefono_celular,\n                CORREO_ELECTRONICO = :correo_electronico,\n                EN_EMERGENCIA_AVISAR_A = :en_emergencia_avisar_a,\n                TELEFONO_EMERGENCIA = :telefono_emergencia,\n                MUNICIPIO_NACIMIENTO = :municipio_nacimiento,\n                ESTADO_NACIMIENTO = :estado_nacimiento,\n                HOSPITAL_NACIMIENTO = :hospital_nacimiento,\n                TIPO_SANGRE = :tipo_sangre,\n                USA_VALVULA = :usa_valvula,\n                NOTAS_ADICIONALES = :notas_adicionales,\n                MEMBRESIA_ESTATUS = :membresia_estatus,\n                ACTIVO = :activo,\n                TIPO_CUOTA = :tipo_cuota\n            WHERE ID_PACIENTE = :id_paciente\n            ", {'nombre': payload['nombre'], 'apellido_paterno': payload['apellido_paterno'], 'apellido_materno': payload.get('apellido_materno'), 'genero': payload.get('genero'), 'fecha_nacimiento': _normalize_date_input(payload.get('fecha_nacimiento')), 'curp': encrypt(payload.get('curp')), 'nombre_padre_madre': encrypt(payload.get('nombre_padre_madre')), 'direccion': encrypt(payload.get('direccion')), 'colonia': payload.get('colonia'), 'ciudad': payload.get('ciudad'), 'estado': payload.get('estado'), 'codigo_postal': payload.get('codigo_postal'), 'telefono_casa': encrypt(payload.get('telefono_casa')), 'telefono_celular': encrypt(payload.get('telefono_celular')), 'correo_electronico': encrypt(payload.get('correo_electronico')), 'en_emergencia_avisar_a': encrypt(payload.get('en_emergencia_avisar_a')), 'telefono_emergencia': encrypt(payload.get('telefono_emergencia')), 'municipio_nacimiento': payload.get('municipio_nacimiento'), 'estado_nacimiento': payload.get('estado_nacimiento'), 'hospital_nacimiento': encrypt(payload.get('hospital_nacimiento')), 'tipo_sangre': encrypt(payload.get('tipo_sangre')), 'usa_valvula': payload.get('usa_valvula', 'N'), 'notas_adicionales': encrypt(payload.get('notas_adicionales')), 'membresia_estatus': payload.get('membresia_estatus', 'ACTIVO'), 'activo': payload.get('activo', 'S'), 'tipo_cuota': payload.get('tipo_cuota'), 'id_paciente': id_paciente})
        # Si la membresía quedó ACTIVO y las fechas están vacías o vencidas,
        # iniciar un nuevo período desde hoy + 12 meses.
        cur.execute("""
            UPDATE PACIENTE
               SET FECHA_INICIO_MEMBRESIA      = TRUNC(SYSDATE),
                   FECHA_VENCIMIENTO_MEMBRESIA = ADD_MONTHS(TRUNC(SYSDATE), 12)
             WHERE ID_PACIENTE = :id_paciente
               AND MEMBRESIA_ESTATUS = 'ACTIVO'
               AND (FECHA_INICIO_MEMBRESIA IS NULL
                    OR FECHA_VENCIMIENTO_MEMBRESIA < TRUNC(SYSDATE))
        """, {'id_paciente': id_paciente})
        cur.execute('DELETE FROM PACIENTE_TIPO_ESPINA WHERE ID_PACIENTE = :id', {'id': id_paciente})
        for tid in tipos_ids:
            cur.execute('\n                INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO)\n                VALUES (:id_paciente, :id_tipo_espina, SYSDATE)\n                ', {'id_paciente': id_paciente, 'id_tipo_espina': tid})
        conn.commit()
        cur.execute('SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        row = row_to_dict(cur)
        return _patient_row_to_response(row, conn)

def eliminar_beneficiario(folio: str, current_user: dict=None):
    """Soft delete: marcar beneficiario como inactivo."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Beneficiario no encontrado')
        id_paciente = row[0]
        cur.execute("UPDATE PACIENTE SET ACTIVO = 'N' WHERE FOLIO = :folio", {'folio': folio})
        log_delete(conn, 'PACIENTE', id_paciente, current_user.get('id_usuario', 1), f'Beneficiario {folio} desactivado')
        conn.commit()
        return {'detail': 'Beneficiario eliminado correctamente'}

def historial_beneficiario(
    folio: str,
    current_user: dict=None,
    limit_citas: int=100,
    offset_citas: int=0,
    limit_pagos: int=100,
    offset_pagos: int=0,
    limit_comodatos: int=100,
    offset_comodatos: int=0,
):
    """Obtener historial de servicios, pagos y citas del beneficiario."""
    safe_limit_citas, safe_offset_citas = _normalize_pagination(limit_citas, offset_citas)
    safe_limit_pagos, safe_offset_pagos = _normalize_pagination(limit_pagos, offset_pagos)
    safe_limit_comodatos, safe_offset_comodatos = _normalize_pagination(limit_comodatos, offset_comodatos)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT * FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        paciente = row_to_dict(cur)
        if paciente is None:
            raise HTTPException(status_code=404, detail='Beneficiario no encontrado')
        paciente = decrypt_row(paciente, PACIENTE_ENCRYPTED_FIELDS)
        nombre_completo = ' '.join((
            _strip_char(paciente.get('nombre')) or '',
            _strip_char(paciente.get('apellido_paterno')) or '',
            _strip_char(paciente.get('apellido_materno')) or '',
        )).strip() or folio
        id_paciente = paciente['id_paciente']
        citas_raw = _safe_rows_query(
            cur,
            '\n            SELECT c.ID_CITA, c.FECHA_HORA, c.ESTATUS, c.NOTAS, c.FECHA_REGISTRO\n            FROM CITA c\n            WHERE c.ID_PACIENTE = :id\n            ORDER BY c.FECHA_HORA DESC\n            OFFSET :offset_citas ROWS FETCH NEXT :limit_citas ROWS ONLY\n            ',
            {'id': id_paciente, 'offset_citas': safe_offset_citas, 'limit_citas': safe_limit_citas},
            'citas del beneficiario',
        )
        citas = []
        for ci in citas_raw:
            ci['fecha_hora'] = _date_to_str(ci.get('fecha_hora'))
            ci['fecha_registro'] = _date_to_str(ci.get('fecha_registro'))
            ci['estatus'] = _strip_char(ci.get('estatus'))
            servicios = _safe_rows_query(
                cur,
                '\n                SELECT s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO, d.CANCELADO\n                FROM DETALLE_CITA_SERVICIO d\n                JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO\n                WHERE d.ID_CITA = :id_cita\n                ',
                {'id_cita': ci['id_cita']},
                f"servicios de cita {ci['id_cita']}",
            )
            for sv in servicios:
                sv['nombre'] = _strip_char(sv.get('nombre'))
                sv['cancelado'] = _strip_char(sv.get('cancelado'))
            ci['servicios'] = servicios
            doctores = _safe_rows_query(
                cur,
                "\n                SELECT d.NOMBRE || ' ' || d.APELLIDO_PATERNO AS nombre_doctor,\n                       d.ESPECIALIDAD, cd.ROL_DOCTOR\n                FROM CITA_DOCTOR cd\n                JOIN DOCTOR d ON d.ID_DOCTOR = cd.ID_DOCTOR\n                WHERE cd.ID_CITA = :id_cita\n                ",
                {'id_cita': ci['id_cita']},
                f"doctores de cita {ci['id_cita']}",
            )
            for doc in doctores:
                doc['nombre_doctor'] = _strip_char(doc.get('nombre_doctor'))
                doc['especialidad'] = _strip_char(doc.get('especialidad'))
                doc['rol_doctor'] = _strip_char(doc.get('rol_doctor'))
            ci['doctores'] = doctores
            citas.append(ci)
        pagos_raw = _safe_rows_query(
            cur,
            '\n            SELECT v.ID_VENTA, v.FOLIO_VENTA, v.FECHA_VENTA,\n                   v.MONTO_TOTAL, v.MONTO_PAGADO, v.SALDO_PENDIENTE,\n                   v.EXENTO_PAGO, v.CANCELADA, v.MOTIVO_CANCELACION\n            FROM VENTA v\n            WHERE v.ID_PACIENTE = :id\n            ORDER BY v.FECHA_VENTA DESC\n            OFFSET :offset_pagos ROWS FETCH NEXT :limit_pagos ROWS ONLY\n            ',
            {'id': id_paciente, 'offset_pagos': safe_offset_pagos, 'limit_pagos': safe_limit_pagos},
            'pagos del beneficiario',
        )
        pagos = []
        for pg in pagos_raw:
            pg['fecha_venta'] = _date_to_str(pg.get('fecha_venta'))
            pg['cancelada'] = _strip_char(pg.get('cancelada'))
            pg['exento_pago'] = _strip_char(pg.get('exento_pago'))
            pg['folio_venta'] = _strip_char(pg.get('folio_venta'))
            pagos.append(pg)
        comodatos_raw = _safe_rows_query(
            cur,
            '\n            SELECT c.ID_COMODATO, c.FOLIO_COMODATO, c.FECHA_PRESTAMO,\n                   c.FECHA_DEVOLUCION, c.ESTATUS, c.MONTO_TOTAL,\n                   c.MONTO_PAGADO, c.SALDO_PENDIENTE,\n                   pr.NOMBRE AS nombre_equipo\n            FROM COMODATO c\n            LEFT JOIN PRODUCTO pr ON pr.ID_PRODUCTO = c.ID_EQUIPO\n            WHERE c.ID_PACIENTE = :id\n            ORDER BY c.FECHA_PRESTAMO DESC\n            OFFSET :offset_comodatos ROWS FETCH NEXT :limit_comodatos ROWS ONLY\n            ',
            {'id': id_paciente, 'offset_comodatos': safe_offset_comodatos, 'limit_comodatos': safe_limit_comodatos},
            'comodatos del beneficiario',
        )
        comodatos = []
        for cm in comodatos_raw:
            cm['fecha_prestamo'] = _date_to_str(cm.get('fecha_prestamo'))
            cm['fecha_devolucion'] = _date_to_str(cm.get('fecha_devolucion'))
            cm['estatus'] = _strip_char(cm.get('estatus'))
            cm['folio_comodato'] = _strip_char(cm.get('folio_comodato'))
            cm['nombre_equipo'] = _strip_char(cm.get('nombre_equipo'))
            comodatos.append(cm)
        return {'folio': folio, 'nombre': nombre_completo, 'citas': citas, 'pagos': pagos, 'comodatos': comodatos}


def listar_membresias_proximas_a_vencer(dias: int = 30, current_user: dict = None, limit: int=500, offset: int=0):
    """Beneficiarios con membresía que vence en los próximos N días."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    with get_db() as conn:
        _sync_membresias_vencidas(conn)
        cur = conn.cursor()
        cur.execute("""
            SELECT p.*
              FROM PACIENTE p
             WHERE p.ACTIVO = 'S'
               AND p.ESTATUS_REGISTRO = 'APROBADO'
               AND p.MEMBRESIA_ESTATUS = 'ACTIVO'
               AND p.FECHA_VENCIMIENTO_MEMBRESIA IS NOT NULL
               AND p.FECHA_VENCIMIENTO_MEMBRESIA <= TRUNC(SYSDATE) + :dias
           ORDER BY p.FECHA_VENCIMIENTO_MEMBRESIA ASC
           OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
       """, {'dias': dias, 'offset': safe_offset, 'limit': safe_limit})
        rows = rows_to_dicts(cur)
        patient_ids = [r['id_paciente'] for r in rows]
        tipos_map = _batch_fetch_tipos_espina(conn, patient_ids)
        return [_patient_row_to_response(row, tipos_map=tipos_map) for row in rows]


def renovar_membresia(folio: str, data: dict, current_user: dict = None):
    """Renueva la membresía por 12 meses y crea el cobro correspondiente."""
    from app.infrastructure.persistence.sp_helpers import make_number_list, sp_error_to_http
    import oracledb

    monto_total = float(data.get('monto_total', 0))
    exento_pago = data.get('exento_pago', 'N')
    metodos_pago = data.get('metodos_pago', [])
    id_usuario = (current_user or {}).get('id_usuario', 1)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT ID_PACIENTE FROM PACIENTE WHERE FOLIO = :folio AND ACTIVO = 'S'",
            {'folio': folio}
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail='Beneficiario no encontrado')
        id_paciente = row[0]

        # 1. Actualizar fechas de membresía
        cur.execute("""
            UPDATE PACIENTE
               SET MEMBRESIA_ESTATUS           = 'ACTIVO',
                   FECHA_INICIO_MEMBRESIA      = TRUNC(SYSDATE),
                   FECHA_VENCIMIENTO_MEMBRESIA = ADD_MONTHS(TRUNC(SYSDATE), 12)
             WHERE ID_PACIENTE = :id
        """, {'id': id_paciente})

        # 2. Crear cobro vía SP (igual que cualquier venta normal)
        metodos_ids   = [int(mp['id_metodo_pago']) for mp in metodos_pago if mp.get('monto', 0) > 0]
        metodos_montos = [float(mp['monto']) for mp in metodos_pago if mp.get('monto', 0) > 0]

        productos_arr  = make_number_list(conn, [])
        cantidades_arr = make_number_list(conn, [])
        metodos_arr    = make_number_list(conn, metodos_ids)
        montos_arr     = make_number_list(conn, metodos_montos)

        id_venta_out = cur.var(int)
        folio_venta_out = cur.var(str)
        try:
            cur.callproc('SP_REGISTRAR_VENTA_COMPLETA', [
                id_paciente,
                id_usuario,
                monto_total,
                exento_pago,
                productos_arr,
                cantidades_arr,
                metodos_arr,
                montos_arr,
                id_venta_out,
                folio_venta_out,
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, {}, default_detail='No se pudo registrar el cobro de renovación')

        folio_venta = folio_venta_out.getvalue()
        conn.commit()

        # 3. Devolver paciente actualizado
        cur.execute('SELECT * FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        patient_row = row_to_dict(cur)
        return {
            'paciente': _patient_row_to_response(patient_row, conn),
            'folio_venta': folio_venta,
        }


class OracleBeneficiariosRepository:
    def listar_tipos_espina(self, *args, **kwargs):
        return listar_tipos_espina(*args, **kwargs)

    def stats_beneficiarios(self, *args, **kwargs):
        return stats_beneficiarios(*args, **kwargs)

    def dashboard_stats(self, *args, **kwargs):
        return dashboard_stats(*args, **kwargs)

    def listar_beneficiarios(self, *args, **kwargs):
        return listar_beneficiarios(*args, **kwargs)

    def obtener_beneficiario(self, *args, **kwargs):
        return obtener_beneficiario(*args, **kwargs)

    def crear_beneficiario(self, *args, **kwargs):
        return crear_beneficiario(*args, **kwargs)

    def actualizar_beneficiario(self, *args, **kwargs):
        return actualizar_beneficiario(*args, **kwargs)

    def eliminar_beneficiario(self, *args, **kwargs):
        return eliminar_beneficiario(*args, **kwargs)

    def historial_beneficiario(self, *args, **kwargs):
        return historial_beneficiario(*args, **kwargs)

    def listar_membresias_proximas_a_vencer(self, *args, **kwargs):
        return listar_membresias_proximas_a_vencer(*args, **kwargs)

    def renovar_membresia(self, *args, **kwargs):
        return renovar_membresia(*args, **kwargs)

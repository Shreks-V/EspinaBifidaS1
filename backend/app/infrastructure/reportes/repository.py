from __future__ import annotations

from datetime import date, datetime
import logging
from app.domain.exceptions import InternalError
from typing import Optional
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
logger = logging.getLogger(__name__)


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset

def _serialize(row: dict) -> dict:
    """Strip CHAR padding and convert datetimes to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, str):
            result[key] = value.strip()
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

def _build_patient_where(
    genero: Optional[str] = None,
    estado: Optional[str] = None,
    tipo_espina: Optional[int] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    *,
    solo_activos: bool = True,
) -> tuple[str, dict]:
    """Build WHERE clause fragments and bind params for patient reports."""
    clauses = []
    params: dict = {}
    if solo_activos:
        clauses.append("p.ACTIVO = 'S'")
    if genero:
        clauses.append('p.GENERO = :genero')
        params['genero'] = genero.upper()
    if estado:
        clauses.append('p.ESTADO = :estado')
        params['estado'] = estado
    if tipo_espina is not None:
        clauses.append('EXISTS (SELECT 1 FROM PACIENTE_TIPO_ESPINA pte WHERE pte.ID_PACIENTE = p.ID_PACIENTE AND pte.ID_TIPO_ESPINA = :tipo_espina)')
        params['tipo_espina'] = tipo_espina
    if fecha_inicio:
        clauses.append("p.FECHA_NACIMIENTO >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')")
        params['fecha_inicio'] = fecha_inicio
    if fecha_fin:
        clauses.append("p.FECHA_NACIMIENTO <= TO_DATE(:fecha_fin, 'YYYY-MM-DD')")
        params['fecha_fin'] = fecha_fin
    where = ' AND '.join(clauses) if clauses else '1=1'
    return (where, params)

def reporte_por_genero(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Distribucion de pacientes por genero (PACIENTE.GENERO)."""
    where, params = _build_patient_where(genero, estado, tipo_espina, fecha_inicio, fecha_fin)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f'SELECT p.GENERO AS label, COUNT(*) AS cnt FROM PACIENTE p WHERE {where} GROUP BY p.GENERO ORDER BY p.GENERO', params)
            rows = rows_to_dicts(cursor)
            labels = [r['label'].strip() if r['label'] else 'SIN DATO' for r in rows]
            values = [r['cnt'] for r in rows]
            return {'labels': labels, 'values': values, 'total': sum(values)}
    except Exception as e:
        logger.exception('Error en reporte por genero')
        raise InternalError('Error interno del servidor')

def reporte_por_etapa_vida(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Distribucion por grupo de edad calculado desde PACIENTE.FECHA_NACIMIENTO."""
    where, params = _build_patient_where(genero, estado, tipo_espina, fecha_inicio, fecha_fin)
    etapas_orden = ['Primera Infancia (0-5)', 'Infancia (6-11)', 'Adolescencia (12-17)', 'Juventud (18-29)', 'Adultez (30-59)', 'Adulto Mayor (60+)']
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT   CASE     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 5       THEN 'Primera Infancia (0-5)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 11       THEN 'Infancia (6-11)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 17       THEN 'Adolescencia (12-17)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 29       THEN 'Juventud (18-29)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 59       THEN 'Adultez (30-59)'     ELSE 'Adulto Mayor (60+)'   END AS etapa,   COUNT(*) AS cnt FROM PACIENTE p WHERE {where} GROUP BY   CASE     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 5       THEN 'Primera Infancia (0-5)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 11       THEN 'Infancia (6-11)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 17       THEN 'Adolescencia (12-17)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 29       THEN 'Juventud (18-29)'     WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12) <= 59       THEN 'Adultez (30-59)'     ELSE 'Adulto Mayor (60+)'   END", params)
            rows = rows_to_dicts(cursor)
            conteo = {r['etapa'].strip(): r['cnt'] for r in rows}
            values = [conteo.get(e, 0) for e in etapas_orden]
            return {'labels': etapas_orden, 'values': values, 'total': sum(values)}
    except Exception as e:
        logger.exception('Error en reporte por etapa de vida')
        raise InternalError('Error interno del servidor')

def reporte_por_tipo_espina(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Distribucion por tipo de espina bifida (TIPO_ESPINA_BIFIDA table)."""
    where, params = _build_patient_where(genero, estado, tipo_espina, fecha_inicio, fecha_fin)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f'SELECT t.NOMBRE AS label, COUNT(*) AS cnt FROM PACIENTE p JOIN PACIENTE_TIPO_ESPINA pte ON p.ID_PACIENTE = pte.ID_PACIENTE JOIN TIPO_ESPINA_BIFIDA t ON pte.ID_TIPO_ESPINA = t.ID_TIPO_ESPINA WHERE {where} GROUP BY t.NOMBRE ORDER BY cnt DESC', params)
            rows = rows_to_dicts(cursor)
            labels = [r['label'].strip() for r in rows]
            values = [r['cnt'] for r in rows]
            return {'labels': labels, 'values': values, 'total': sum(values)}
    except Exception as e:
        logger.exception('Error en reporte por tipo espina')
        raise InternalError('Error interno del servidor')

def reporte_por_estado(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Distribucion de pacientes por estado/region (PACIENTE.ESTADO)."""
    where, params = _build_patient_where(genero, estado, tipo_espina, fecha_inicio, fecha_fin)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f'SELECT p.ESTADO AS label, COUNT(*) AS cnt FROM PACIENTE p WHERE {where} GROUP BY p.ESTADO ORDER BY cnt DESC', params)
            rows = rows_to_dicts(cursor)
            labels = [r['label'].strip() if r['label'] else 'SIN DATO' for r in rows]
            values = [r['cnt'] for r in rows]
            return {'labels': labels, 'values': values, 'total': sum(values)}
    except Exception as e:
        logger.exception('Error en reporte por estado')
        raise InternalError('Error interno del servidor')

def reporte_resumen(genero: Optional[str]=None, estado: Optional[str]=None, tipo_espina: Optional[int]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Resumen general de estadisticas del sistema."""
    where, params = _build_patient_where(genero, estado, tipo_espina, fecha_inicio, fecha_fin, solo_activos=False)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"""
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN p.ACTIVO = 'S' THEN 1 ELSE 0 END) AS activos,
                    SUM(CASE WHEN p.ACTIVO = 'N' THEN 1 ELSE 0 END) AS inactivos,
                    ROUND(AVG(CASE
                        WHEN p.FECHA_NACIMIENTO IS NOT NULL
                        THEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12)
                    END), 1) AS edad_promedio,
                    MIN(CASE
                        WHEN p.FECHA_NACIMIENTO IS NOT NULL
                        THEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12)
                    END) AS edad_minima,
                    MAX(CASE
                        WHEN p.FECHA_NACIMIENTO IS NOT NULL
                        THEN FLOOR(MONTHS_BETWEEN(SYSDATE, p.FECHA_NACIMIENTO) / 12)
                    END) AS edad_maxima,
                    COUNT(DISTINCT p.ESTADO) AS estados_representados
                FROM PACIENTE p
                WHERE {where}
                """,
                params,
            )
            totals = row_to_dict(cursor) or {}
            cursor.execute(f'SELECT p.GENERO, COUNT(*) AS cnt FROM PACIENTE p WHERE {where} GROUP BY p.GENERO', params)
            genero_rows = rows_to_dicts(cursor)
            por_genero = {r['genero'].strip() if r['genero'] else 'SIN DATO': r['cnt'] for r in genero_rows}
            cursor.execute(f'SELECT t.NOMBRE, COUNT(*) AS cnt FROM PACIENTE p JOIN PACIENTE_TIPO_ESPINA pte ON p.ID_PACIENTE = pte.ID_PACIENTE JOIN TIPO_ESPINA_BIFIDA t ON pte.ID_TIPO_ESPINA = t.ID_TIPO_ESPINA WHERE {where} GROUP BY t.NOMBRE', params)
            tipo_rows = rows_to_dicts(cursor)
            por_tipo_espina = {r['nombre'].strip(): r['cnt'] for r in tipo_rows}
            return {'total_pacientes': totals.get('total') or 0, 'activos': totals.get('activos') or 0, 'inactivos': totals.get('inactivos') or 0, 'por_genero': por_genero, 'edad_promedio': float(totals.get('edad_promedio') or 0), 'edad_minima': int(totals.get('edad_minima') or 0), 'edad_maxima': int(totals.get('edad_maxima') or 0), 'por_tipo_espina': por_tipo_espina, 'estados_representados': totals.get('estados_representados') or 0, 'fecha_generacion': datetime.now().isoformat()}
    except Exception as e:
        logger.exception('Error en reporte resumen')
        raise InternalError('Error interno del servidor')

def reporte_servicios_por_tipo(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Total de servicios brindados por tipo de servicio (RF-ER-08)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            clauses = ["d.CANCELADO = 'N'"]
            params: dict = {}
            if fecha_inicio:
                clauses.append("c.FECHA_HORA >= TO_TIMESTAMP(:fi, 'YYYY-MM-DD')")
                params['fi'] = fecha_inicio
            if fecha_fin:
                clauses.append("c.FECHA_HORA < TO_TIMESTAMP(:ff, 'YYYY-MM-DD') + 1")
                params['ff'] = fecha_fin
            where = ' AND '.join(clauses)
            cursor.execute(f'SELECT s.NOMBRE AS label, SUM(d.CANTIDAD) AS cnt,\n                           SUM(d.MONTO_PAGADO) AS monto\n                    FROM DETALLE_CITA_SERVICIO d\n                    JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO\n                    JOIN CITA c ON c.ID_CITA = d.ID_CITA\n                    WHERE {where}\n                    GROUP BY s.NOMBRE ORDER BY cnt DESC', params)
            rows = rows_to_dicts(cursor)
            labels = [r['label'].strip() for r in rows]
            values = [int(r['cnt']) for r in rows]
            montos = [float(r['monto'] or 0) for r in rows]
            return {'labels': labels, 'values': values, 'montos': montos, 'total': sum(values)}
    except Exception:
        logger.exception('Error en reporte servicios por tipo')
        raise InternalError('Error interno del servidor')

def reporte_estudios_por_tipo(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Número de estudios (servicios de tipo estudio) realizados (RF-ER-09)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            clauses = ["d.CANCELADO = 'N'"]
            params: dict = {}
            if fecha_inicio:
                clauses.append("c.FECHA_HORA >= TO_TIMESTAMP(:fi, 'YYYY-MM-DD')")
                params['fi'] = fecha_inicio
            if fecha_fin:
                clauses.append("c.FECHA_HORA < TO_TIMESTAMP(:ff, 'YYYY-MM-DD') + 1")
                params['ff'] = fecha_fin
            where = ' AND '.join(clauses)
            cursor.execute(f'SELECT s.NOMBRE AS label, COUNT(*) AS cnt\n                    FROM DETALLE_CITA_SERVICIO d\n                    JOIN SERVICIO s ON s.ID_SERVICIO = d.ID_SERVICIO\n                    JOIN CITA c ON c.ID_CITA = d.ID_CITA\n                    WHERE {where}\n                    GROUP BY s.NOMBRE ORDER BY cnt DESC', params)
            rows = rows_to_dicts(cursor)
            labels = [r['label'].strip() for r in rows]
            values = [int(r['cnt']) for r in rows]
            return {'labels': labels, 'values': values, 'total': sum(values)}
    except Exception:
        logger.exception('Error en reporte estudios por tipo')
        raise InternalError('Error interno del servidor')

def reporte_pagos_exentos(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Total de pagos exentos y cuotas de recuperación (RF-ER-10)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            clauses = ["v.CANCELADA = 'N'"]
            params: dict = {}
            if fecha_inicio:
                clauses.append("v.FECHA_VENTA >= TO_TIMESTAMP(:fi, 'YYYY-MM-DD')")
                params['fi'] = fecha_inicio
            if fecha_fin:
                clauses.append("v.FECHA_VENTA < TO_TIMESTAMP(:ff, 'YYYY-MM-DD') + 1")
                params['ff'] = fecha_fin
            where = ' AND '.join(clauses)
            cursor.execute(f"SELECT\n                        COUNT(CASE WHEN v.EXENTO_PAGO = 'S' THEN 1 END) AS total_exentos,\n                        COUNT(CASE WHEN v.EXENTO_PAGO = 'N' THEN 1 END) AS total_cuotas,\n                        NVL(SUM(CASE WHEN v.EXENTO_PAGO = 'S' THEN v.MONTO_TOTAL ELSE 0 END), 0) AS monto_exentos,\n                        NVL(SUM(CASE WHEN v.EXENTO_PAGO = 'N' THEN v.MONTO_TOTAL ELSE 0 END), 0) AS monto_cuotas,\n                        NVL(SUM(v.MONTO_TOTAL), 0) AS monto_total\n                    FROM VENTA v\n                    WHERE {where}", params)
            row = row_to_dict(cursor)
            return {'total_exentos': int(row['total_exentos'] or 0), 'total_cuotas': int(row['total_cuotas'] or 0), 'monto_exentos': float(row['monto_exentos'] or 0), 'monto_cuotas': float(row['monto_cuotas'] or 0), 'monto_total': float(row['monto_total'] or 0)}
    except Exception:
        logger.exception('Error en reporte pagos exentos')
        raise InternalError('Error interno del servidor')

def reporte_consolidado_mensual(mes: Optional[int]=None, anio: Optional[int]=None, current_user: dict=None):
    """Reporte mensual consolidado con resumen de servicios y demografía (RF-ER-07)."""
    hoy = date.today()
    m = mes or hoy.month
    a = anio or hoy.year
    fecha_inicio = date(a, m, 1)
    fecha_fin = date(a + 1, 1, 1) if m == 12 else date(a, m + 1, 1)
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            params = {'fecha_inicio': fecha_inicio, 'fecha_fin': fecha_fin}
            cursor.execute("SELECT COUNT(DISTINCT c.ID_PACIENTE) AS pacientes_atendidos\n                   FROM CITA c\n                   WHERE c.ESTATUS = 'COMPLETADA'\n                     AND c.FECHA_HORA >= :fecha_inicio\n                     AND c.FECHA_HORA < :fecha_fin", params)
            r1 = row_to_dict(cursor)
            cursor.execute("SELECT COUNT(*) AS total_servicios,\n                          NVL(SUM(d.MONTO_PAGADO), 0) AS monto_servicios\n                   FROM DETALLE_CITA_SERVICIO d\n                   JOIN CITA c ON c.ID_CITA = d.ID_CITA\n                   WHERE d.CANCELADO = 'N'\n                     AND c.FECHA_HORA >= :fecha_inicio\n                     AND c.FECHA_HORA < :fecha_fin", params)
            r2 = row_to_dict(cursor)
            cursor.execute("SELECT COUNT(*) AS total_ventas,\n                          NVL(SUM(v.MONTO_TOTAL), 0) AS monto_ventas\n                   FROM VENTA v\n                   WHERE v.CANCELADA = 'N'\n                     AND v.FECHA_VENTA >= :fecha_inicio\n                     AND v.FECHA_VENTA < :fecha_fin", params)
            r3 = row_to_dict(cursor)
            cursor.execute('SELECT ESTATUS, COUNT(*) AS cnt\n                   FROM CITA\n                   WHERE FECHA_HORA >= :fecha_inicio\n                     AND FECHA_HORA < :fecha_fin\n                   GROUP BY ESTATUS', params)
            citas_status = {r['estatus'].strip(): int(r['cnt']) for r in rows_to_dicts(cursor)}
            cursor.execute("SELECT p.GENERO, COUNT(DISTINCT c.ID_PACIENTE) AS cnt\n                   FROM CITA c\n                   JOIN PACIENTE p ON p.ID_PACIENTE = c.ID_PACIENTE\n                   WHERE c.ESTATUS = 'COMPLETADA'\n                     AND c.FECHA_HORA >= :fecha_inicio\n                     AND c.FECHA_HORA < :fecha_fin\n                   GROUP BY p.GENERO", params)
            por_genero = {r['genero'].strip() if r['genero'] else 'SIN DATO': int(r['cnt']) for r in rows_to_dicts(cursor)}
            return {'mes': m, 'anio': a, 'pacientes_atendidos': int(r1['pacientes_atendidos'] or 0), 'total_servicios': int(r2['total_servicios'] or 0), 'monto_servicios': float(r2['monto_servicios'] or 0), 'total_ventas': int(r3['total_ventas'] or 0), 'monto_ventas': float(r3['monto_ventas'] or 0), 'citas_por_estatus': citas_status, 'por_genero': por_genero, 'fecha_generacion': datetime.now().isoformat()}
    except Exception:
        logger.exception('Error en reporte consolidado mensual')
        raise InternalError('Error interno del servidor')

def historial_reportes(tipo_reporte: Optional[str]=None, fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Historial de reportes generados (tabla REPORTE)."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            safe_limit, safe_offset = _normalize_pagination(limit, offset)
            clauses = ['1=1']
            params: dict = {}
            if tipo_reporte:
                clauses.append('TIPO_REPORTE = :tipo_reporte')
                params['tipo_reporte'] = tipo_reporte.upper()
            if fecha_inicio:
                clauses.append("FECHA_GENERACION >= TO_DATE(:fecha_inicio, 'YYYY-MM-DD')")
                params['fecha_inicio'] = fecha_inicio
            if fecha_fin:
                clauses.append("FECHA_GENERACION <= TO_DATE(:fecha_fin, 'YYYY-MM-DD') + 1")
                params['fecha_fin'] = fecha_fin
            params['offset'] = safe_offset
            params['limit'] = safe_limit
            where = ' AND '.join(clauses)
            cursor.execute(f'SELECT ID_REPORTE, ID_USUARIO, TIPO_REPORTE, FECHA_GENERACION, FECHA_INICIO, FECHA_FIN, FORMATO FROM REPORTE WHERE {where} ORDER BY FECHA_GENERACION DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY', params)
            rows = rows_to_dicts(cursor)
            return [_serialize(r) for r in rows]
    except Exception as e:
        logger.exception('Error al consultar historial de reportes')
        raise InternalError('Error interno del servidor')


def reporte_por_ciudad(current_user: dict=None):
    """Distribución por ciudad/municipio de residencia de pacientes activos."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT NVL(CIUDAD, 'Sin dato') AS label, NVL(ESTADO, 'Sin dato') AS estado, COUNT(*) AS cnt "
                "FROM PACIENTE WHERE ACTIVO='S' GROUP BY CIUDAD, ESTADO ORDER BY cnt DESC"
            )
            rows = rows_to_dicts(cursor)
            return {
                'labels': [(r.get('label') or 'Sin dato').strip() for r in rows],
                'estados': [(r.get('estado') or 'Sin dato').strip() for r in rows],
                'values': [int(r.get('cnt') or 0) for r in rows],
                'total': sum(int(r.get('cnt') or 0) for r in rows),
            }
    except Exception:
        logger.exception('Error en reporte por ciudad')
        raise InternalError('Error interno del servidor')


def indicadores_desempeno(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, current_user: dict=None):
    """Indicadores de desempeño cruzados por etapa de vida (RF-ER)."""
    ETAPAS = [
        'Primera Infancia (0-5)', 'Infancia (6-11)', 'Adolescencia (12-17)',
        'Juventud (18-29)', 'Adultez (30-59)', 'Adulto Mayor (60+)',
    ]
    ETAPA_EXPR = (
        "CASE "
        "WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, FECHA_NACIMIENTO)/12) <= 5 THEN 'Primera Infancia (0-5)' "
        "WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, FECHA_NACIMIENTO)/12) <= 11 THEN 'Infancia (6-11)' "
        "WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, FECHA_NACIMIENTO)/12) <= 17 THEN 'Adolescencia (12-17)' "
        "WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, FECHA_NACIMIENTO)/12) <= 29 THEN 'Juventud (18-29)' "
        "WHEN FLOOR(MONTHS_BETWEEN(SYSDATE, FECHA_NACIMIENTO)/12) <= 59 THEN 'Adultez (30-59)' "
        "ELSE 'Adulto Mayor (60+)' END"
    )

    periodo_params: dict = {}
    periodo_clause = '1=1'
    if fecha_inicio and fecha_fin:
        periodo_clause = "FECHA_REGISTRO >= TO_DATE(:fi,'YYYY-MM-DD') AND FECHA_REGISTRO <= TO_DATE(:ff,'YYYY-MM-DD') + 1"
        periodo_params = {'fi': fecha_inicio, 'ff': fecha_fin}
    elif fecha_inicio:
        periodo_clause = "FECHA_REGISTRO >= TO_DATE(:fi,'YYYY-MM-DD')"
        periodo_params = {'fi': fecha_inicio}
    elif fecha_fin:
        periodo_clause = "FECHA_REGISTRO <= TO_DATE(:ff,'YYYY-MM-DD') + 1"
        periodo_params = {'ff': fecha_fin}

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) AS cnt FROM PACIENTE WHERE ACTIVO='S'")
            activos = int((row_to_dict(cursor) or {}).get('cnt') or 0)

            cursor.execute(f"SELECT COUNT(*) AS cnt FROM PACIENTE WHERE ACTIVO='S' AND {periodo_clause}", periodo_params)
            nuevos = int((row_to_dict(cursor) or {}).get('cnt') or 0)

            cursor.execute("SELECT NVL(GENERO,'') AS genero, COUNT(*) AS cnt FROM PACIENTE WHERE ACTIVO='S' GROUP BY GENERO")
            gd = {(r.get('genero') or '').strip(): int(r.get('cnt') or 0) for r in rows_to_dicts(cursor)}
            hombres = gd.get('M', 0)
            mujeres = gd.get('F', 0)

            cursor.execute(
                "SELECT NVL(CIUDAD,'Sin dato') AS ciudad, COUNT(*) AS cnt FROM PACIENTE "
                "WHERE ACTIVO='S' AND UPPER(NVL(ESTADO,'')) LIKE '%NUEVO%LEON%' GROUP BY CIUDAD ORDER BY cnt DESC"
            )
            municipios = [{'label': (r.get('ciudad') or 'Sin dato').strip(), 'value': int(r.get('cnt') or 0)}
                          for r in rows_to_dicts(cursor)]
            nl_total = sum(m['value'] for m in municipios)
            foraneos_cnt = activos - nl_total
            if foraneos_cnt > 0:
                municipios.append({'label': 'Viven en otro estado', 'value': foraneos_cnt})

            def run_cross(extra_sql):
                cursor.execute(extra_sql)
                result: dict = {}
                for r in rows_to_dicts(cursor):
                    etapa = (r.get('etapa') or '').strip()
                    col_val = str(r.get('col_val') or 'Sin dato').strip()
                    result.setdefault(etapa, {})[col_val] = int(r.get('cnt') or 0)
                return result

            def build_rows(cross: dict, col_keys: list, col_labels: list | None = None) -> list:
                labels = col_labels or col_keys
                col_totals: dict = {k: 0 for k in col_keys}
                out = []
                for etapa in ETAPAS:
                    row: dict = {'etapa': etapa, 'total': 0}
                    row_total = 0
                    for key, label in zip(col_keys, labels):
                        v = cross.get(etapa, {}).get(key, 0)
                        row[label] = v
                        col_totals[key] = col_totals.get(key, 0) + v
                        row_total += v
                    row['total'] = row_total
                    out.append(row)
                totals_row: dict = {'etapa': 'Total', 'total': 0}
                grand = 0
                for key, label in zip(col_keys, labels):
                    totals_row[label] = col_totals[key]
                    grand += col_totals[key]
                totals_row['total'] = grand
                out.append(totals_row)
                return out

            t1_cross = run_cross(
                f"SELECT {ETAPA_EXPR} AS etapa, "
                "CASE WHEN UPPER(NVL(ESTADO_NACIMIENTO,'')) LIKE '%NUEVO%LEON%' THEN 'CURP N.L.' ELSE 'CURP Foráneo' END AS col_val, "
                f"COUNT(*) AS cnt FROM PACIENTE WHERE ACTIVO='S' GROUP BY {ETAPA_EXPR}, "
                "CASE WHEN UPPER(NVL(ESTADO_NACIMIENTO,'')) LIKE '%NUEVO%LEON%' THEN 'CURP N.L.' ELSE 'CURP Foráneo' END"
            )
            t1 = build_rows(t1_cross, ['CURP N.L.', 'CURP Foráneo'])

            t2_cross = run_cross(
                f"SELECT {ETAPA_EXPR} AS etapa, NVL(GENERO,'') AS col_val, COUNT(*) AS cnt FROM PACIENTE "
                f"WHERE ACTIVO='S' AND UPPER(NVL(ESTADO_NACIMIENTO,'')) LIKE '%NUEVO%LEON%' GROUP BY {ETAPA_EXPR}, GENERO"
            )
            t2 = build_rows(t2_cross, ['M', 'F'], ['Hombre', 'Mujer'])

            t3_cross = run_cross(
                f"SELECT {ETAPA_EXPR} AS etapa, NVL(GENERO,'') AS col_val, COUNT(*) AS cnt FROM PACIENTE "
                f"WHERE ACTIVO='S' AND UPPER(NVL(ESTADO_NACIMIENTO,'')) NOT LIKE '%NUEVO%LEON%' GROUP BY {ETAPA_EXPR}, GENERO"
            )
            t3 = build_rows(t3_cross, ['M', 'F'], ['Hombre', 'Mujer'])

            t4_cross = run_cross(
                f"SELECT {ETAPA_EXPR} AS etapa, "
                "CASE WHEN UPPER(NVL(ESTADO,'')) LIKE '%NUEVO%LEON%' THEN 'Viven en N.L.' ELSE 'Viven en otros estados' END AS col_val, "
                f"COUNT(*) AS cnt FROM PACIENTE WHERE ACTIVO='S' GROUP BY {ETAPA_EXPR}, "
                "CASE WHEN UPPER(NVL(ESTADO,'')) LIKE '%NUEVO%LEON%' THEN 'Viven en N.L.' ELSE 'Viven en otros estados' END"
            )
            t4 = build_rows(t4_cross, ['Viven en N.L.', 'Viven en otros estados'])

            t5_cross = run_cross(
                f"SELECT {ETAPA_EXPR} AS etapa, "
                "CASE WHEN UPPER(NVL(ESTADO_NACIMIENTO,'')) LIKE '%EXTRAN%' THEN 'Nac. extranjera' ELSE 'Mexicanos' END AS col_val, "
                f"COUNT(*) AS cnt FROM PACIENTE WHERE ACTIVO='S' GROUP BY {ETAPA_EXPR}, "
                "CASE WHEN UPPER(NVL(ESTADO_NACIMIENTO,'')) LIKE '%EXTRAN%' THEN 'Nac. extranjera' ELSE 'Mexicanos' END"
            )
            t5 = build_rows(t5_cross, ['Mexicanos', 'Nac. extranjera'])

            cursor.execute(
                f"SELECT {ETAPA_EXPR} AS etapa, NVL(GENERO,'') AS genero, COUNT(*) AS cnt "
                f"FROM PACIENTE WHERE ACTIVO='S' GROUP BY {ETAPA_EXPR}, GENERO"
            )
            genero_etapa: dict = {}
            for r in rows_to_dicts(cursor):
                et = (r.get('etapa') or '').strip()
                gn = (r.get('genero') or '').strip()
                genero_etapa.setdefault(et, {})[gn] = int(r.get('cnt') or 0)
            t6 = []
            t6_totals = {'total': 0, 'Mujer': 0, 'Hombre': 0}
            for etapa in ETAPAS:
                m = genero_etapa.get(etapa, {}).get('M', 0)
                f = genero_etapa.get(etapa, {}).get('F', 0)
                t6.append({'etapa': etapa, 'Hombre': m, 'Mujer': f, 'total': m + f})
                t6_totals['total'] += m + f
                t6_totals['Mujer'] += f
                t6_totals['Hombre'] += m
            t6.append({'etapa': 'Total', 'Hombre': t6_totals['Hombre'], 'Mujer': t6_totals['Mujer'], 'total': t6_totals['total']})

            return {
                'beneficiarios_activos': activos,
                'nuevos_en_periodo': nuevos,
                'hombres': hombres,
                'mujeres': mujeres,
                'municipios': municipios,
                'tablas': {
                    'por_curp': t1,
                    'curp_nl_genero': t2,
                    'curp_foraneo_genero': t3,
                    'residencia': t4,
                    'nacimiento': t5,
                    'etapa_vida_genero': t6,
                },
            }
    except Exception:
        logger.exception('Error en indicadores de desempeno')
        raise InternalError('Error interno del servidor')


class OracleReportesRepository:
    def reporte_por_genero(self, genero=None, estado=None, tipo_espina=None, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_por_genero(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_etapa_vida(self, genero=None, estado=None, tipo_espina=None, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_por_etapa_vida(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_tipo_espina(self, genero=None, estado=None, tipo_espina=None, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_por_tipo_espina(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_por_estado(self, genero=None, estado=None, tipo_espina=None, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_por_estado(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_resumen(self, genero=None, estado=None, tipo_espina=None, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_resumen(genero, estado, tipo_espina, fecha_inicio, fecha_fin, current_user)

    def reporte_servicios_por_tipo(self, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_servicios_por_tipo(fecha_inicio, fecha_fin, current_user)

    def reporte_estudios_por_tipo(self, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_estudios_por_tipo(fecha_inicio, fecha_fin, current_user)

    def reporte_pagos_exentos(self, fecha_inicio=None, fecha_fin=None, current_user=None):
        return reporte_pagos_exentos(fecha_inicio, fecha_fin, current_user)

    def reporte_consolidado_mensual(self, mes=None, anio=None, current_user=None):
        return reporte_consolidado_mensual(mes, anio, current_user)

    def historial_reportes(self, tipo_reporte=None, fecha_inicio=None, fecha_fin=None, current_user=None, limit=100, offset=0):
        return historial_reportes(tipo_reporte, fecha_inicio, fecha_fin, current_user, limit, offset)

    def reporte_por_ciudad(self, current_user=None):
        return reporte_por_ciudad(current_user)

    def indicadores_desempeno(self, fecha_inicio=None, fecha_fin=None, current_user=None):
        return indicadores_desempeno(fecha_inicio, fecha_fin, current_user)

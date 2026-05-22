from __future__ import annotations

from datetime import datetime, date, timedelta
from app.domain.exceptions import NotFoundError, ValidationError
from typing import Optional

import oracledb

from app.infrastructure.audit.bitacora import log_insert, log_cancelacion
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.persistence.sp_helpers import make_number_list, sp_error_to_http

_SP_CREAR_CITA_ERRORS = {
    20301: (400, None),
    20302: (400, None),
    20303: (409, None),
    20304: (400, None),
    20305: (400, None),
}

_SP_CANCELAR_CITA_ERRORS = {
    20306: (404, None),
    20307: (400, None),
}


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset


CITA_BASE_QUERY = "\n    SELECT c.ID_CITA, c.ID_PACIENTE, c.ID_USUARIO_REGISTRO,\n           c.FECHA_HORA, c.ESTATUS, c.NOTAS, c.FECHA_REGISTRO,\n           p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '') AS NOMBRE_PACIENTE,\n           p.FOLIO AS FOLIO_PACIENTE\n    FROM CITA c\n    JOIN PACIENTE p ON c.ID_PACIENTE = p.ID_PACIENTE\n"

def _serialize_row(row: dict) -> dict:
    """Convert datetime objects to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result

def _fetch_servicios(conn, id_cita: int) -> list[dict]:
    """Fetch servicios for a given cita."""
    cursor = conn.cursor()
    cursor.execute("\n        SELECT d.ID_SERVICIO, s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO\n        FROM DETALLE_CITA_SERVICIO d\n        JOIN SERVICIO s ON d.ID_SERVICIO = s.ID_SERVICIO\n        WHERE d.ID_CITA = :id_cita AND d.CANCELADO = 'N'\n        ", {'id_cita': id_cita})
    return rows_to_dicts(cursor)

def _enrich_cita(conn, cita: dict, svc_map: dict | None=None) -> dict:
    """Add servicios list and serialize datetimes."""
    cita = _serialize_row(cita)
    if svc_map is not None:
        cita['servicios'] = svc_map.get(cita['id_cita'], [])
    else:
        cita['servicios'] = _fetch_servicios(conn, cita['id_cita'])
    return cita

def _batch_fetch_servicios(conn, cita_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch servicios for many citas in one query."""
    if not cita_ids:
        return {}
    cur = conn.cursor()
    result: dict[int, list[dict]] = {cid: [] for cid in cita_ids}
    for i in range(0, len(cita_ids), 900):
        chunk = cita_ids[i:i + 900]
        placeholders = ', '.join((f':c{j}' for j in range(len(chunk))))
        params = {f'c{j}': cid for j, cid in enumerate(chunk)}
        cur.execute(f"\n            SELECT d.ID_CITA, d.ID_SERVICIO, s.NOMBRE, d.CANTIDAD, d.MONTO_PAGADO\n              FROM DETALLE_CITA_SERVICIO d\n              JOIN SERVICIO s ON d.ID_SERVICIO = s.ID_SERVICIO\n             WHERE d.CANCELADO = 'N' AND d.ID_CITA IN ({placeholders})\n            ", params)
        cols = [c[0].lower() for c in cur.description]
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            cid = d.pop('id_cita')
            result[cid].append(d)
    return result

def citas_stats(current_user: dict=None):
    """Obtener conteo de citas por estatus + total de hoy."""
    hoy = date.today()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('\n            SELECT ESTATUS, COUNT(*) AS TOTAL\n            FROM CITA\n            GROUP BY ESTATUS\n            ')
        rows = rows_to_dicts(cursor)
        cursor.execute("\n            SELECT COUNT(*) AS TOTAL_HOY\n            FROM CITA\n            WHERE FECHA_HORA >= TO_DATE(:fecha, 'YYYY-MM-DD')\n              AND FECHA_HORA < TO_DATE(:fecha, 'YYYY-MM-DD') + 1\n              AND ESTATUS = 'PROGRAMADA'\n            ", {'fecha': hoy.isoformat()})
        hoy_row = row_to_dict(cursor)
    stats = {r['estatus']: r['total'] for r in rows}
    stats['total_hoy'] = int(hoy_row['total_hoy']) if hoy_row else 0
    stats['total'] = sum((r['total'] for r in rows))
    with get_db() as conn:
        cursor = conn.cursor()
        ayer = (hoy - timedelta(days=1)).isoformat()
        cursor.execute("SELECT COUNT(*) AS TOTAL_AYER\n               FROM CITA\n               WHERE FECHA_HORA >= TO_DATE(:fecha, 'YYYY-MM-DD')\n                 AND FECHA_HORA < TO_DATE(:fecha, 'YYYY-MM-DD') + 1\n                 AND ESTATUS = 'PROGRAMADA'", {'fecha': ayer})
        ayer_row = row_to_dict(cursor)
        stats['total_ayer'] = int(ayer_row['total_ayer']) if ayer_row else 0
    return stats

def citas_hoy(current_user: dict=None):
    """Obtener las citas de hoy (hora local del servidor Python, no UTC de Oracle)."""
    hoy = date.today()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(CITA_BASE_QUERY + " WHERE c.FECHA_HORA >= TO_DATE(:fecha, 'YYYY-MM-DD') AND c.FECHA_HORA < TO_DATE(:fecha, 'YYYY-MM-DD') + 1 ORDER BY c.FECHA_HORA", {'fecha': hoy.isoformat()})
        citas = rows_to_dicts(cursor)
        svc_map = _batch_fetch_servicios(conn, [c['id_cita'] for c in citas])
        citas = [_enrich_cita(conn, c, svc_map=svc_map) for c in citas]
    programadas = sum((1 for c in citas if c['estatus'] == 'PROGRAMADA'))
    completadas = sum((1 for c in citas if c['estatus'] == 'COMPLETADA'))
    canceladas = sum((1 for c in citas if c['estatus'] == 'CANCELADA'))
    return {'fecha': hoy.isoformat(), 'total': len(citas), 'programadas': programadas, 'completadas': completadas, 'canceladas': canceladas, 'citas': citas}

def citas_proximas(dias: int = 7, current_user: dict = None):
    """Cuenta de citas PROGRAMADAS en los próximos N días (excluyendo hoy)."""
    hoy = date.today()
    desde = (hoy + timedelta(days=1)).isoformat()
    hasta = hoy + timedelta(days=dias)
    hasta_exclusivo = hasta + timedelta(days=1)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) AS TOTAL
              FROM CITA
             WHERE FECHA_HORA >= TO_DATE(:desde, 'YYYY-MM-DD')
               AND FECHA_HORA < TO_DATE(:hasta_exclusivo, 'YYYY-MM-DD')
               AND ESTATUS = 'PROGRAMADA'
            """,
            {'desde': desde, 'hasta_exclusivo': hasta_exclusivo.isoformat()},
        )
        row = cursor.fetchone()
    return {'count': int(row[0]) if row else 0, 'desde': desde, 'hasta': hasta.isoformat()}

def listar_citas(fecha: Optional[str]=None, estatus: Optional[str]=None, id_paciente: Optional[int]=None, busqueda: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar citas con filtros opcionales."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    conditions = []
    params: dict = {}
    if fecha:
        conditions.append("c.FECHA_HORA >= TO_DATE(:fecha, 'YYYY-MM-DD') AND c.FECHA_HORA < TO_DATE(:fecha, 'YYYY-MM-DD') + 1")
        params['fecha'] = fecha
    if estatus:
        conditions.append('c.ESTATUS = :estatus')
        params['estatus'] = estatus
    if id_paciente is not None:
        conditions.append('c.ID_PACIENTE = :id_paciente')
        params['id_paciente'] = id_paciente
    if busqueda:
        conditions.append("(UPPER(p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')) LIKE UPPER(:busqueda) OR UPPER(p.FOLIO) LIKE UPPER(:busqueda) OR UPPER(c.NOTAS) LIKE UPPER(:busqueda))")
        params['busqueda'] = f'%{busqueda}%'
    params['offset'] = safe_offset
    params['limit'] = safe_limit
    where_clause = ' WHERE ' + ' AND '.join(conditions) if conditions else ''
    sql = CITA_BASE_QUERY + where_clause + ' ORDER BY c.FECHA_HORA DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        citas = rows_to_dicts(cursor)
        svc_map = _batch_fetch_servicios(conn, [c['id_cita'] for c in citas])
        citas = [_enrich_cita(conn, c, svc_map=svc_map) for c in citas]
    return citas

def obtener_cita(id_cita: int, current_user: dict=None):
    """Obtener una cita por su ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(CITA_BASE_QUERY + ' WHERE c.ID_CITA = :id_cita', {'id_cita': id_cita})
        cita = row_to_dict(cursor)
        if cita is None:
            raise NotFoundError('Cita no encontrada')
        cita = _enrich_cita(conn, cita)
    return cita

def crear_cita(data, current_user: dict=None):
    """Crear nueva cita vía SP_CREAR_CITA_CON_SERVICIOS."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT MEMBRESIA_ESTATUS, ACTIVO FROM PACIENTE WHERE ID_PACIENTE = :id_paciente', {'id_paciente': data.id_paciente})
        paciente_row = cursor.fetchone()
        if paciente_row is None:
            raise NotFoundError('Paciente no encontrado')
        membresia_estatus = (paciente_row[0] or '').strip()
        activo = (paciente_row[1] or '').strip()
        if activo != 'S':
            raise ValidationError('El paciente no se encuentra activo en el sistema')
        if membresia_estatus != 'ACTIVO':
            raise ValidationError('El paciente no tiene membresía activa. Actualice su estatus antes de agendar una cita')

        id_usuario = data.id_usuario_registro or current_user.get('id_usuario', 1)
        servicios_list = list(data.servicios or [])
        if not servicios_list:
            raise ValidationError('La cita requiere al menos un servicio')

        servicios_ids = [int(s['id_servicio']) for s in servicios_list]
        doctores_ids = [int(s['id_doctor']) if s.get('id_doctor') is not None else None for s in servicios_list]
        cantidades = [int(s.get('cantidad', 1)) for s in servicios_list]

        servicios_arr = make_number_list(conn, servicios_ids)
        doctores_arr = make_number_list(conn, doctores_ids)
        cantidades_arr = make_number_list(conn, cantidades)

        fecha_ts = datetime.strptime(data.fecha_hora[:19], '%Y-%m-%dT%H:%M:%S') if isinstance(data.fecha_hora, str) else data.fecha_hora
        id_cita_out = cursor.var(int)
        try:
            cursor.callproc('SP_CREAR_CITA_CON_SERVICIOS', [
                data.id_paciente,
                id_usuario,
                fecha_ts,
                data.notas,
                servicios_arr,
                doctores_arr,
                cantidades_arr,
                id_cita_out,
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, _SP_CREAR_CITA_ERRORS,
                                   default_detail='No se pudo crear la cita')
        id_cita = id_cita_out.getvalue()
        log_insert(conn, 'CITA', id_cita, id_usuario, f'Cita creada para paciente {data.id_paciente}')
        conn.commit()
        cursor.execute(CITA_BASE_QUERY + ' WHERE c.ID_CITA = :id_cita', {'id_cita': id_cita})
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)
    return cita

def actualizar_cita(id_cita: int, data, current_user: dict=None):
    """Actualizar cita existente (estatus, notas, fecha, servicios)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_CITA FROM CITA WHERE ID_CITA = :id_cita', {'id_cita': id_cita})
        if cursor.fetchone() is None:
            raise NotFoundError('Cita no encontrada')
        fecha_ts = datetime.strptime(data.fecha_hora[:19], '%Y-%m-%dT%H:%M:%S') if isinstance(data.fecha_hora, str) else data.fecha_hora
        cursor.execute(
            'UPDATE CITA'
            ' SET ID_PACIENTE = :id_paciente,'
            '     FECHA_HORA  = :fecha_hora,'
            '     ESTATUS     = :estatus,'
            '     NOTAS       = :notas'
            ' WHERE ID_CITA  = :id_cita',
            {
                'id_paciente': data.id_paciente,
                'fecha_hora': fecha_ts,
                'estatus': data.estatus,
                'notas': data.notas,
                'id_cita': id_cita,
            },
        )
        if data.servicios is not None:
            cursor.execute("\n                UPDATE DETALLE_CITA_SERVICIO\n                SET CANCELADO = 'S', MOTIVO_CANCELACION = 'Actualización de cita'\n                WHERE ID_CITA = :id_cita AND CANCELADO = 'N'\n                ", {'id_cita': id_cita})
            for s in data.servicios:
                cursor.execute("\n                    INSERT INTO DETALLE_CITA_SERVICIO\n                        (ID_CITA, ID_SERVICIO, CANTIDAD, MONTO_PAGADO, CANCELADO)\n                    VALUES (:id_cita, :id_servicio, :cantidad, :monto_pagado, 'N')\n                    ", {'id_cita': id_cita, 'id_servicio': s['id_servicio'], 'cantidad': s.get('cantidad', 1), 'monto_pagado': s.get('monto_pagado', 0.0)})
        conn.commit()
        cursor.execute(CITA_BASE_QUERY + ' WHERE c.ID_CITA = :id_cita', {'id_cita': id_cita})
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)
    return cita

def iniciar_cita(id_cita: int, current_user: dict=None):
    """Marcar una cita como EN_CURSO."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ESTATUS FROM CITA WHERE ID_CITA = :id_cita', {'id_cita': id_cita})
        row = cursor.fetchone()
        if row is None:
            raise NotFoundError('Cita no encontrada')
        cursor.execute("UPDATE CITA SET ESTATUS = 'EN_CURSO' WHERE ID_CITA = :id_cita", {'id_cita': id_cita})
        conn.commit()
        cursor.execute(CITA_BASE_QUERY + ' WHERE c.ID_CITA = :id_cita', {'id_cita': id_cita})
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)
    return cita

def completar_cita(id_cita: int, current_user: dict=None):
    """Marcar una cita como COMPLETADA."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ESTATUS FROM CITA WHERE ID_CITA = :id_cita', {'id_cita': id_cita})
        row = cursor.fetchone()
        if row is None:
            raise NotFoundError('Cita no encontrada')
        cursor.execute("UPDATE CITA SET ESTATUS = 'COMPLETADA' WHERE ID_CITA = :id_cita", {'id_cita': id_cita})
        conn.commit()
        cursor.execute(CITA_BASE_QUERY + ' WHERE c.ID_CITA = :id_cita', {'id_cita': id_cita})
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)
    return cita

def cancelar_cita(id_cita: int, current_user: dict=None):
    """Cancelar una cita vía SP_CANCELAR_CITA."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        try:
            cursor.callproc('SP_CANCELAR_CITA', [
                id_cita,
                'Cita cancelada',
                id_usuario,
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, _SP_CANCELAR_CITA_ERRORS,
                                   default_detail='No se pudo cancelar la cita')
        log_cancelacion(conn, 'CITA', id_cita, id_usuario, 'Cita cancelada')
        conn.commit()
        cursor.execute(CITA_BASE_QUERY + ' WHERE c.ID_CITA = :id_cita', {'id_cita': id_cita})
        cita = row_to_dict(cursor)
        cita = _enrich_cita(conn, cita)
    return cita

def eliminar_cita(id_cita: int, current_user: dict=None):
    """Eliminar una cita y sus detalles de servicio."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_CITA FROM CITA WHERE ID_CITA = :id_cita', {'id_cita': id_cita})
        if cursor.fetchone() is None:
            raise NotFoundError('Cita no encontrada')
        cursor.execute('DELETE FROM DETALLE_CITA_SERVICIO WHERE ID_CITA = :id_cita', {'id_cita': id_cita})
        cursor.execute('DELETE FROM CITA WHERE ID_CITA = :id_cita', {'id_cita': id_cita})
        conn.commit()
    return {'detail': 'Cita eliminada'}


class OracleCitasRepository:
    def citas_stats(self, current_user=None):
        return citas_stats(current_user)

    def citas_hoy(self, current_user=None):
        return citas_hoy(current_user)

    def listar_citas(self, fecha=None, estatus=None, id_paciente=None, busqueda=None, current_user=None, limit=100, offset=0):
        return listar_citas(fecha, estatus, id_paciente, busqueda, current_user, limit, offset)

    def obtener_cita(self, id_cita, current_user=None):
        return obtener_cita(id_cita, current_user)

    def crear_cita(self, data, current_user=None):
        return crear_cita(data, current_user)

    def actualizar_cita(self, id_cita, data, current_user=None):
        return actualizar_cita(id_cita, data, current_user)

    def iniciar_cita(self, id_cita, current_user=None):
        return iniciar_cita(id_cita, current_user)

    def completar_cita(self, id_cita, current_user=None):
        return completar_cita(id_cita, current_user)

    def cancelar_cita(self, id_cita, current_user=None):
        return cancelar_cita(id_cita, current_user)

    def eliminar_cita(self, id_cita, current_user=None):
        return eliminar_cita(id_cita, current_user)

    def citas_proximas(self, dias=7, current_user=None):
        return citas_proximas(dias, current_user)

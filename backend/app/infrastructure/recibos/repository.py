from __future__ import annotations

import logging
from app.domain.exceptions import InternalError, NotFoundError, ValidationError
from typing import Optional
from datetime import date, datetime, timedelta

import oracledb

from app.infrastructure.audit.bitacora import log_insert, log_cancelacion
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.persistence.sp_helpers import make_number_list, make_varchar_list, make_decimal_list, sp_error_to_http

logger = logging.getLogger(__name__)

_SP_VENTA_ERRORS = {
    20401: (400, None),
    20402: (400, None),
    20403: (400, None),
    20404: (400, None),
    20405: (400, None),
}

_SP_PAGO_PARCIAL_ERRORS = {
    20406: (400, None),
    20407: (404, None),
    20408: (400, None),
    20409: (400, None),
    20410: (400, None),
}

_VENTA_FOLIO_SEQUENCE = 'SEQ_VENTA_FOLIO'
_VENTA_FOLIO_UNIQUE_HINT = 'UQ_VENTA_FOLIO'


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset

def _serialize(row: dict) -> dict:
    """Convert datetime values to ISO strings for JSON serialisation."""
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out

def _fetch_metodos_pago(conn, id_venta: int) -> list[dict]:
    """Return the payment-method breakdown for a single venta."""
    cur = conn.cursor()
    cur.execute('\n        SELECT vmp.ID_METODO_PAGO  AS id_metodo_pago,\n               mp.NOMBRE           AS nombre,\n               vmp.MONTO           AS monto\n          FROM VENTA_METODO_PAGO vmp\n          JOIN METODO_PAGO mp ON mp.ID_METODO_PAGO = vmp.ID_METODO_PAGO\n         WHERE vmp.ID_VENTA = :id_venta\n        ', {'id_venta': id_venta})
    return rows_to_dicts(cur)

def _fetch_items_venta(conn, id_venta: int) -> list[dict]:
    """Return itemized lines for a single venta."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT ID_LINEA, ID_VENTA, TIPO, ID_REFERENCIA,
               DESCRIPCION, PRECIO_UNITARIO, CANTIDAD, SUBTOTAL
          FROM VENTA_LINEA
         WHERE ID_VENTA = :id_venta
         ORDER BY ID_LINEA
        """,
        {'id_venta': id_venta},
    )
    return rows_to_dicts(cur)


def _enrich_venta(conn, venta: dict, mp_map: dict | None = None, include_items: bool = False) -> dict:
    """Add metodos_pago, optionally items, and serialise dates."""
    venta = _serialize(venta)
    if mp_map is not None:
        venta['metodos_pago'] = mp_map.get(venta['id_venta'], [])
    else:
        venta['metodos_pago'] = _fetch_metodos_pago(conn, venta['id_venta'])
    if include_items:
        venta['items'] = _fetch_items_venta(conn, venta['id_venta'])
    else:
        venta['items'] = []
    return venta

def _batch_fetch_metodos_pago(conn, venta_ids: list[int]) -> dict[int, list[dict]]:
    """Fetch payment methods for many ventas in one query."""
    if not venta_ids:
        return {}
    cur = conn.cursor()
    result: dict[int, list[dict]] = {vid: [] for vid in venta_ids}
    for i in range(0, len(venta_ids), 900):
        chunk = venta_ids[i:i + 900]
        placeholders = ', '.join((f':v{j}' for j in range(len(chunk))))
        params = {f'v{j}': vid for j, vid in enumerate(chunk)}
        cur.execute(f'\n            SELECT vmp.ID_VENTA,\n                   vmp.ID_METODO_PAGO  AS id_metodo_pago,\n                   mp.NOMBRE           AS nombre,\n                   vmp.MONTO           AS monto\n              FROM VENTA_METODO_PAGO vmp\n              JOIN METODO_PAGO mp ON mp.ID_METODO_PAGO = vmp.ID_METODO_PAGO\n             WHERE vmp.ID_VENTA IN ({placeholders})\n            ', params)
        cols = [c[0].lower() for c in cur.description]
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            vid = d.pop('id_venta')
            result[vid].append(d)
    return result

def _generate_folio(conn) -> str:
    """Generate the next folio in the format VTA-YYYY-XXX."""
    year = date.today().year
    cur = conn.cursor()
    pattern = f'^VTA-{year}-[0-9]+$'
    cur.execute(
        """
        SELECT NVL(MAX(
            CASE
                WHEN REGEXP_LIKE(FOLIO_VENTA, :pattern)
                THEN TO_NUMBER(REGEXP_SUBSTR(FOLIO_VENTA, '[0-9]+$'))
            END
        ), 0) AS max_seq
        FROM VENTA
        WHERE FOLIO_VENTA LIKE :prefix
        """,
        {'pattern': pattern, 'prefix': f'VTA-{year}-%'},
    )
    row = row_to_dict(cur) or {}
    seq = int(row.get('max_seq') or 0) + 1
    return f'VTA-{year}-{seq:03d}'


def _sync_venta_folio_sequence(conn) -> bool:
    """Advance the Oracle sequence when imported/existing folios are ahead of it."""
    year = date.today().year
    cur = conn.cursor()
    pattern = f'^VTA-{year}-[0-9]+$'
    cur.execute(
        """
        SELECT NVL(MAX(
            CASE
                WHEN REGEXP_LIKE(FOLIO_VENTA, :pattern)
                THEN TO_NUMBER(REGEXP_SUBSTR(FOLIO_VENTA, '[0-9]+$'))
            END
        ), 0) AS max_seq
        FROM VENTA
        WHERE FOLIO_VENTA LIKE :prefix
        """,
        {'pattern': pattern, 'prefix': f'VTA-{year}-%'},
    )
    row = row_to_dict(cur) or {}
    max_seq = int(row.get('max_seq') or 0)

    cur.execute(f'SELECT {_VENTA_FOLIO_SEQUENCE}.NEXTVAL AS next_seq FROM DUAL')
    seq_row = row_to_dict(cur) or {}
    current_seq = int(seq_row.get('next_seq') or 0)

    if current_seq >= max_seq:
        return False

    delta = max_seq - current_seq
    altered = False
    try:
        cur.execute(f'ALTER SEQUENCE {_VENTA_FOLIO_SEQUENCE} INCREMENT BY {delta}')
        altered = True
        cur.execute(f'SELECT {_VENTA_FOLIO_SEQUENCE}.NEXTVAL FROM DUAL')
    finally:
        if altered:
            cur.execute(f'ALTER SEQUENCE {_VENTA_FOLIO_SEQUENCE} INCREMENT BY 1')

    logger.warning(
        'Secuencia %s resincronizada de %s a %s por colision de folio en VENTA',
        _VENTA_FOLIO_SEQUENCE,
        current_seq,
        max_seq,
    )
    return True

def _is_unique_constraint_error(exc: Exception, hint: str='') -> bool:
    message = str(exc).upper()
    if 'ORA-00001' not in message:
        return False
    if not hint:
        return True
    return hint.upper() in message


def _call_registrar_venta_completa(
    cur,
    data,
    id_usuario: int,
    linea_tipos_arr,
    linea_ids_arr,
    linea_descs_arr,
    linea_precios_arr,
    linea_cantidades_arr,
    metodos_arr,
    montos_arr,
) -> tuple[int, str]:
    id_venta_out = cur.var(int)
    folio_out = cur.var(str)
    cur.callproc('SP_REGISTRAR_VENTA_COMPLETA', [
        data.id_paciente,
        id_usuario,
        float(data.monto_total),
        data.exento_pago or 'N',
        linea_tipos_arr,
        linea_ids_arr,
        linea_descs_arr,
        linea_precios_arr,
        linea_cantidades_arr,
        metodos_arr,
        montos_arr,
        id_venta_out,
        folio_out,
    ])
    return id_venta_out.getvalue(), folio_out.getvalue()

def stats_ventas(current_user: dict=None):
    """Totales agregados de ventas (no canceladas)."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("\n            SELECT NVL(SUM(v.MONTO_TOTAL), 0) AS monto_total_sum,\n                   COUNT(*)                     AS count\n              FROM VENTA v\n             WHERE v.CANCELADA = 'N'\n            ")
        totals = row_to_dict(cur)
        hoy_str = date.today().isoformat()
        cur.execute("\n            SELECT COUNT(*) AS total_hoy\n              FROM VENTA v\n             WHERE v.CANCELADA = 'N'\n               AND v.FECHA_VENTA >= TO_DATE(:fecha, 'YYYY-MM-DD')\n               AND v.FECHA_VENTA < TO_DATE(:fecha, 'YYYY-MM-DD') + 1\n            ", {'fecha': hoy_str})
        hoy = row_to_dict(cur)
        cur.execute("\n            SELECT COUNT(*) AS pendientes\n              FROM VENTA v\n             WHERE v.CANCELADA = 'N' AND v.SALDO_PENDIENTE > 0\n            ")
        pend = row_to_dict(cur)
        cur.execute("\n            SELECT NVL(SUM(CASE WHEN UPPER(mp.NOMBRE) = 'EFECTIVO'       THEN vmp.MONTO ELSE 0 END), 0) AS monto_efectivo,\n                   NVL(SUM(CASE WHEN UPPER(mp.NOMBRE) = 'TARJETA'        THEN vmp.MONTO ELSE 0 END), 0) AS monto_tarjeta,\n                   NVL(SUM(CASE WHEN UPPER(mp.NOMBRE) = 'TRANSFERENCIA'  THEN vmp.MONTO ELSE 0 END), 0) AS monto_transferencia\n              FROM VENTA_METODO_PAGO vmp\n              JOIN METODO_PAGO mp ON mp.ID_METODO_PAGO = vmp.ID_METODO_PAGO\n              JOIN VENTA v         ON v.ID_VENTA       = vmp.ID_VENTA\n             WHERE v.CANCELADA = 'N'\n            ")
        by_method = row_to_dict(cur)
        ayer_str = (date.today() - timedelta(days=1)).isoformat()
        cur.execute("\n            SELECT COUNT(*) AS total_ayer\n              FROM VENTA v\n             WHERE v.CANCELADA = 'N'\n               AND v.FECHA_VENTA >= TO_DATE(:fecha, 'YYYY-MM-DD')\n               AND v.FECHA_VENTA < TO_DATE(:fecha, 'YYYY-MM-DD') + 1\n            ", {'fecha': ayer_str})
        ayer = row_to_dict(cur)
    return {'monto_total_sum': float(totals['monto_total_sum']), 'monto_efectivo': float(by_method['monto_efectivo']), 'monto_tarjeta': float(by_method['monto_tarjeta']), 'monto_transferencia': float(by_method['monto_transferencia']), 'count': int(totals['count']), 'total_hoy': int(hoy['total_hoy']), 'total_ayer': int(ayer['total_ayer']) if ayer else 0, 'pendientes': int(pend['pendientes'])}

def listar_metodos_pago(current_user: dict=None):
    """Listar metodos de pago activos."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("\n            SELECT ID_METODO_PAGO AS id_metodo_pago,\n                   NOMBRE         AS nombre,\n                   DESCRIPCION    AS descripcion,\n                   ACTIVO         AS activo\n              FROM METODO_PAGO\n             WHERE ACTIVO = 'S'\n             ORDER BY ID_METODO_PAGO\n            ")
        return rows_to_dicts(cur)

def listar_ventas(fecha_inicio: Optional[str]=None, fecha_fin: Optional[str]=None, id_paciente: Optional[int]=None, search: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar ventas con filtros opcionales."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    with get_db() as conn:
        sql = "\n            SELECT v.ID_VENTA,\n                   v.FOLIO_VENTA,\n                   v.ID_PACIENTE,\n                   v.ID_USUARIO_REGISTRO,\n                   v.FECHA_VENTA,\n                   v.MONTO_TOTAL,\n                   v.MONTO_PAGADO,\n                   v.SALDO_PENDIENTE,\n                   v.EXENTO_PAGO,\n                   v.CANCELADA,\n                   v.MOTIVO_CANCELACION,\n                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')\n                       AS NOMBRE_PACIENTE,\n                   p.FOLIO AS FOLIO_PACIENTE\n              FROM VENTA v\n              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE\n             WHERE 1 = 1\n        "
        params: dict = {}
        if fecha_inicio:
            sql += " AND v.FECHA_VENTA >= TO_TIMESTAMP(:fecha_inicio, 'YYYY-MM-DD')"
            params['fecha_inicio'] = fecha_inicio
        if fecha_fin:
            sql += " AND v.FECHA_VENTA < TO_TIMESTAMP(:fecha_fin, 'YYYY-MM-DD') + 1"
            params['fecha_fin'] = fecha_fin
        if id_paciente is not None:
            sql += ' AND v.ID_PACIENTE = :id_paciente'
            params['id_paciente'] = id_paciente
        if search:
            sql += " AND (UPPER(v.FOLIO_VENTA) LIKE UPPER(:search) OR UPPER(p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')) LIKE UPPER(:search))"
            params['search'] = f'%{search}%'
        sql += ' ORDER BY v.FECHA_VENTA DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
        params['offset'] = safe_offset
        params['limit'] = safe_limit
        cur = conn.cursor()
        cur.execute(sql, params)
        ventas = rows_to_dicts(cur)
        venta_ids = [v['id_venta'] for v in ventas]
        mp_map = _batch_fetch_metodos_pago(conn, venta_ids)
        results = [_enrich_venta(conn, v, mp_map=mp_map) for v in ventas]
    return results

def crear_venta(data, current_user: dict=None):
    """Crear nueva venta vía SP_REGISTRAR_VENTA_COMPLETA."""
    try:
        with get_db() as conn:
            id_usuario = current_user.get('id_usuario', 1) if current_user else 1
            cur = conn.cursor()

            items = data.items or []
            metodos_ids = [int(mp['id_metodo_pago']) for mp in (data.metodos_pago or [])]
            metodos_montos = [float(mp['monto']) for mp in (data.metodos_pago or [])]

            linea_tipos_arr   = make_varchar_list(conn, [it.tipo for it in items])
            linea_ids_arr     = make_number_list(conn, [it.id_referencia for it in items])
            linea_descs_arr   = make_varchar_list(conn, [it.descripcion for it in items])
            linea_precios_arr = make_decimal_list(conn, [it.precio_unitario for it in items])
            linea_cant_arr    = make_number_list(conn, [it.cantidad for it in items])
            metodos_arr       = make_number_list(conn, metodos_ids)
            montos_arr        = make_decimal_list(conn, metodos_montos)

            try:
                new_id, folio = _call_registrar_venta_completa(
                    cur,
                    data,
                    id_usuario,
                    linea_tipos_arr,
                    linea_ids_arr,
                    linea_descs_arr,
                    linea_precios_arr,
                    linea_cant_arr,
                    metodos_arr,
                    montos_arr,
                )
            except oracledb.DatabaseError as exc:
                if not _is_unique_constraint_error(exc, _VENTA_FOLIO_UNIQUE_HINT):
                    raise sp_error_to_http(
                        exc,
                        _SP_VENTA_ERRORS,
                        default_detail='No se pudo registrar la venta',
                    )

                logger.warning(
                    'Colision detectada en %s al crear venta para paciente %s; intentando resincronizar secuencia',
                    _VENTA_FOLIO_UNIQUE_HINT,
                    data.id_paciente,
                )
                _sync_venta_folio_sequence(conn)
                try:
                    new_id, folio = _call_registrar_venta_completa(
                        cur,
                        data,
                        id_usuario,
                        linea_tipos_arr,
                        linea_ids_arr,
                        linea_descs_arr,
                        linea_precios_arr,
                        linea_cant_arr,
                        metodos_arr,
                        montos_arr,
                    )
                except oracledb.DatabaseError as retry_exc:
                    raise sp_error_to_http(
                        retry_exc,
                        _SP_VENTA_ERRORS,
                        default_detail='No se pudo registrar la venta',
                    )

            log_insert(conn, 'VENTA', new_id, id_usuario, f'Venta {folio} creada para paciente {data.id_paciente}')
            conn.commit()
            cur.execute("\n            SELECT v.ID_VENTA,\n                   v.FOLIO_VENTA,\n                   v.ID_PACIENTE,\n                   v.ID_USUARIO_REGISTRO,\n                   v.FECHA_VENTA,\n                   v.MONTO_TOTAL,\n                   v.MONTO_PAGADO,\n                   v.SALDO_PENDIENTE,\n                   v.EXENTO_PAGO,\n                   v.CANCELADA,\n                   v.MOTIVO_CANCELACION,\n                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')\n                       AS NOMBRE_PACIENTE,\n                   p.FOLIO AS FOLIO_PACIENTE\n              FROM VENTA v\n              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE\n             WHERE v.ID_VENTA = :id_venta\n            ", {'id_venta': new_id})
            venta = row_to_dict(cur)
            if venta is None:
                raise InternalError('Error al recuperar la venta creada')
            return _enrich_venta(conn, venta, include_items=True)
    except (NotFoundError, ValidationError, InternalError):
        raise
    except Exception as exc:
        logger.exception('Error al crear venta para paciente %s: %s', data.id_paciente, exc)
        raise InternalError('Error interno al crear la venta')

def obtener_venta(id_venta: int, current_user: dict=None):
    """Obtener detalle de una venta (incluye items)."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("\n            SELECT v.ID_VENTA,\n                   v.FOLIO_VENTA,\n                   v.ID_PACIENTE,\n                   v.ID_USUARIO_REGISTRO,\n                   v.FECHA_VENTA,\n                   v.MONTO_TOTAL,\n                   v.MONTO_PAGADO,\n                   v.SALDO_PENDIENTE,\n                   v.EXENTO_PAGO,\n                   v.CANCELADA,\n                   v.MOTIVO_CANCELACION,\n                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')\n                       AS NOMBRE_PACIENTE,\n                   p.FOLIO AS FOLIO_PACIENTE\n              FROM VENTA v\n              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE\n             WHERE v.ID_VENTA = :id_venta\n            ", {'id_venta': id_venta})
        venta = row_to_dict(cur)
        if venta is None:
            raise NotFoundError('Venta no encontrada')
        return _enrich_venta(conn, venta, include_items=True)


def listar_items_venta(id_venta: int, current_user: dict=None):
    """Listar ítems (líneas) de una venta."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT ID_VENTA FROM VENTA WHERE ID_VENTA = :id_venta', {'id_venta': id_venta})
        if row_to_dict(cur) is None:
            raise NotFoundError('Venta no encontrada')
        return _fetch_items_venta(conn, id_venta)

def registrar_pago(id_venta: int, id_metodo_pago: int, monto: float, current_user: dict=None):
    """Agregar un pago parcial a una venta vía SP_REGISTRAR_PAGO_PARCIAL."""
    with get_db() as conn:
        cur = conn.cursor()
        try:
            cur.callproc('SP_REGISTRAR_PAGO_PARCIAL', [
                id_venta,
                id_metodo_pago,
                float(monto),
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, _SP_PAGO_PARCIAL_ERRORS,
                                   default_detail='No se pudo registrar el pago')
        id_usuario = current_user.get('id_usuario', 1) if current_user else 1
        log_insert(conn, 'VENTA_METODO_PAGO', id_venta, id_usuario,
                   f'Pago parcial {monto} metodo {id_metodo_pago}')
        conn.commit()
    return obtener_venta(id_venta, current_user)


def cancelar_venta(id_venta: int, motivo: Optional[str]=None, current_user: dict=None):
    """Cancelar una venta."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute('SELECT CANCELADA FROM VENTA WHERE ID_VENTA = :id_venta', {'id_venta': id_venta})
        row = row_to_dict(cur)
        if row is None:
            raise NotFoundError('Venta no encontrada')
        if row['cancelada'] == 'S':
            raise ValidationError('La venta ya esta cancelada')
        motivo_final = motivo or 'Sin motivo especificado'
        cur.execute("\n            UPDATE VENTA\n               SET CANCELADA = 'S',\n                   MOTIVO_CANCELACION = :motivo\n             WHERE ID_VENTA = :id_venta\n            ", {'motivo': motivo_final, 'id_venta': id_venta})
        log_cancelacion(conn, 'VENTA', id_venta, current_user.get('id_usuario', 1), motivo_final)
        conn.commit()
        cur.execute("\n            SELECT v.ID_VENTA,\n                   v.FOLIO_VENTA,\n                   v.ID_PACIENTE,\n                   v.ID_USUARIO_REGISTRO,\n                   v.FECHA_VENTA,\n                   v.MONTO_TOTAL,\n                   v.MONTO_PAGADO,\n                   v.SALDO_PENDIENTE,\n                   v.EXENTO_PAGO,\n                   v.CANCELADA,\n                   v.MOTIVO_CANCELACION,\n                   p.NOMBRE || ' ' || p.APELLIDO_PATERNO || ' ' || NVL(p.APELLIDO_MATERNO, '')\n                       AS NOMBRE_PACIENTE,\n                   p.FOLIO AS FOLIO_PACIENTE\n              FROM VENTA v\n              JOIN PACIENTE p ON p.ID_PACIENTE = v.ID_PACIENTE\n             WHERE v.ID_VENTA = :id_venta\n            ", {'id_venta': id_venta})
        venta = row_to_dict(cur)
        return _enrich_venta(conn, venta)


class OracleRecibosRepository:
    def stats_ventas(self, current_user=None):
        return stats_ventas(current_user)

    def listar_metodos_pago(self, current_user=None):
        return listar_metodos_pago(current_user)

    def listar_ventas(self, fecha_inicio=None, fecha_fin=None, id_paciente=None, search=None, current_user=None, limit=100, offset=0):
        return listar_ventas(fecha_inicio, fecha_fin, id_paciente, search, current_user, limit, offset)

    def crear_venta(self, data, current_user=None):
        return crear_venta(data, current_user)

    def obtener_venta(self, id_venta, current_user=None):
        return obtener_venta(id_venta, current_user)

    def cancelar_venta(self, id_venta, motivo=None, current_user=None):
        return cancelar_venta(id_venta, motivo, current_user)

    def registrar_pago(self, id_venta, id_metodo_pago, monto, current_user=None):
        return registrar_pago(id_venta, id_metodo_pago, monto, current_user)

    def listar_items_venta(self, id_venta, current_user=None):
        return listar_items_venta(id_venta, current_user)

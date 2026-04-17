import logging
from fastapi import HTTPException
from typing import Optional
from datetime import date, datetime

import oracledb

from app.infrastructure.audit.bitacora import log_insert
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.persistence.sp_helpers import sp_error_to_http
from app.schemas.schemas import ProductoCreate, ServicioCreate, ComodatoCreate

logger = logging.getLogger(__name__)

_SP_CREAR_PRODUCTO_ERRORS = {
    20701: (400, 'Tipo de producto inválido'),
    20702: (400, 'Clave interna requerida'),
    20703: (409, 'La clave interna ya existe'),
}

_SP_MOVIMIENTO_STOCK_ERRORS = {
    20501: (400, 'Tipo de movimiento inválido'),
    20502: (400, 'Cantidad inválida para el movimiento'),
    20503: (400, 'Referencia de usuario inválida'),
    20504: (400, 'Producto no encontrado o inactivo'),
    20505: (409, 'Existencias insuficientes para realizar la operación'),
}

_SP_AJUSTAR_EXISTENCIA_ERRORS = {
    20504: (404, 'Producto no encontrado o inactivo'),
    20506: (400, 'Existencia objetivo inválida'),
}


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset


def _normalize_tipo_producto_for_db(value: Optional[str]) -> str:
    """Accept API aliases and return the DB/SP canonical value."""
    tipo = str(value or '').strip().upper()
    if tipo == 'EQUIPO':
        return 'EQUIPO_MEDICO'
    return tipo


def _normalize_tipo_producto_for_api(value: Optional[str]) -> Optional[str]:
    """Return API-friendly type names for frontend compatibility."""
    if value is None:
        return None
    tipo = str(value).strip().upper()
    if tipo == 'EQUIPO_MEDICO':
        return 'EQUIPO'
    return tipo

def _serialize(row: dict) -> dict:
    """Strip CHAR padding and convert dates to ISO strings."""
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, str):
            result[key] = value.strip()
        else:
            result[key] = value
    if 'tipo_producto' in result:
        result['tipo_producto'] = _normalize_tipo_producto_for_api(result['tipo_producto'])
    return result

_PRODUCTOS_BASE_SQL = "\n    SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE, p.DESCRIPCION,\n           p.TIPO_PRODUCTO, p.ACTIVO, p.ID_USUARIO_REGISTRO, p.FECHA_REGISTRO,\n           p.PRECIO_CUOTA_A, p.PRECIO_CUOTA_B,\n           m.PRESENTACION, m.DOSIS, m.REQUIERE_CADUCIDAD,\n           eq.NUMERO_SERIE, eq.MARCA, eq.MODELO, eq.ESTATUS_EQUIPO, eq.OBSERVACIONES,\n           ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO, ex.UNIDAD_MEDIDA, ex.FECHA_CADUCIDAD\n    FROM PRODUCTO p\n    LEFT JOIN MEDICAMENTO m        ON m.ID_PRODUCTO  = p.ID_PRODUCTO\n    LEFT JOIN EQUIPO_MEDICO eq     ON eq.ID_PRODUCTO = p.ID_PRODUCTO\n    LEFT JOIN EXISTENCIA_PRODUCTO ex ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n"

def _is_unique_key_error(exc: Exception, constraint_hint: str) -> bool:
    message = str(exc).upper()
    return 'ORA-00001' in message and constraint_hint.upper() in message

def _generate_internal_key(conn, tipo_producto: str) -> str:
    prefix = 'MED' if tipo_producto == 'MEDICAMENTO' else 'EQP'
    cur = conn.cursor()
    pattern = f'^{prefix}-[0-9]+$'
    cur.execute(
        """
        SELECT NVL(MAX(
            CASE
                WHEN REGEXP_LIKE(CLAVE_INTERNA, :pattern)
                THEN TO_NUMBER(REGEXP_SUBSTR(CLAVE_INTERNA, '[0-9]+$'))
            END
        ), 0) AS max_seq
        FROM PRODUCTO
        WHERE CLAVE_INTERNA LIKE :prefix
        """,
        {'pattern': pattern, 'prefix': f'{prefix}-%'},
    )
    row = row_to_dict(cur) or {}
    next_seq = int(row.get('max_seq') or 0) + 1
    return f'{prefix}-{next_seq:03d}'

def listar_productos(tipo_producto: Optional[str]=None, busqueda: Optional[str]=None, activo: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar productos del almacen con filtros opcionales."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    sql = _PRODUCTOS_BASE_SQL + ' WHERE 1=1'
    params: dict = {}
    if tipo_producto:
        sql += ' AND p.TIPO_PRODUCTO = :tipo_producto'
        params['tipo_producto'] = _normalize_tipo_producto_for_db(tipo_producto)
    if activo:
        sql += ' AND p.ACTIVO = :activo'
        params['activo'] = activo
    if busqueda:
        sql += ' AND (LOWER(p.NOMBRE) LIKE :busqueda OR LOWER(p.DESCRIPCION) LIKE :busqueda OR LOWER(p.CLAVE_INTERNA) LIKE :busqueda)'
        params['busqueda'] = f'%{busqueda.lower()}%'
    sql += ' ORDER BY p.ID_PRODUCTO OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    params['offset'] = safe_offset
    params['limit'] = safe_limit
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_producto(id_producto: int, current_user: dict=None):
    """Obtener un producto por ID."""
    sql = _PRODUCTOS_BASE_SQL + ' WHERE p.ID_PRODUCTO = :id_producto'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id_producto': id_producto})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return _serialize(row)

def crear_producto(data: ProductoCreate, current_user: dict=None):
    """Crear un nuevo producto vía SP_CREAR_PRODUCTO_CON_EXISTENCIA."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        id_producto = None
        clave_interna = None
        tipo_producto_db = _normalize_tipo_producto_for_db(data.tipo_producto)

        for _ in range(5):
            clave_interna = _generate_internal_key(conn, tipo_producto_db)
            id_out = cursor.var(int)
            try:
                cursor.callproc('SP_CREAR_PRODUCTO_CON_EXISTENCIA', [
                    clave_interna,
                    data.nombre,
                    data.descripcion,
                    tipo_producto_db,
                    data.precio_cuota_a,
                    data.precio_cuota_b,
                    id_usuario,
                    data.nivel_minimo or 0,
                    data.unidad_medida,
                    data.presentacion,
                    data.dosis,
                    data.requiere_caducidad or 'N',
                    data.numero_serie,
                    data.marca,
                    data.modelo,
                    data.observaciones,
                    id_out,
                ])
                id_producto = id_out.getvalue()
                break
            except oracledb.DatabaseError as exc:
                code = getattr(exc.args[0], 'code', None) if exc.args else None
                if code == 20703:
                    logger.warning('Colision de clave interna %s al crear producto; reintentando', clave_interna)
                    continue
                raise sp_error_to_http(exc, _SP_CREAR_PRODUCTO_ERRORS,
                                       default_detail='No se pudo crear el producto')

        if id_producto is None:
            raise HTTPException(status_code=409, detail='No se pudo generar una clave interna unica para el producto')

        # Stock inicial vía SP (si aplica)
        cantidad_inicial = data.cantidad_disponible or 0
        if cantidad_inicial > 0:
            try:
                cursor.callproc('SP_REGISTRAR_MOVIMIENTO_STOCK', [
                    id_producto,
                    'ENTRADA',
                    cantidad_inicial,
                    id_usuario,
                    None,
                    None,
                    f'Existencia inicial alta producto {clave_interna}',
                ])
            except oracledb.DatabaseError as exc:
                raise sp_error_to_http(exc, _SP_MOVIMIENTO_STOCK_ERRORS,
                                       default_detail='No se pudo registrar la existencia inicial')

        # FECHA_CADUCIDAD no la maneja el SP — update directo
        if data.fecha_caducidad:
            cursor.execute(
                "UPDATE EXISTENCIA_PRODUCTO SET FECHA_CADUCIDAD = TO_DATE(:fc, 'YYYY-MM-DD') "
                "WHERE ID_PRODUCTO = :id AND ACTIVO = 'S'",
                {'fc': data.fecha_caducidad, 'id': id_producto},
            )

        log_insert(conn, 'PRODUCTO', id_producto, id_usuario, f'Producto {clave_interna} creado')
        conn.commit()
    return _fetch_producto(id_producto)

def _fetch_producto(id_producto: int) -> dict:
    """Fetch a single product (internal helper, no auth)."""
    sql = _PRODUCTOS_BASE_SQL + ' WHERE p.ID_PRODUCTO = :id_producto'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id_producto': id_producto})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return _serialize(row)

def actualizar_producto(id_producto: int, data: ProductoCreate, current_user: dict=None):
    """Actualizar un producto existente."""
    with get_db() as conn:
        cursor = conn.cursor()
        tipo_producto_db = _normalize_tipo_producto_for_db(data.tipo_producto)
        cursor.execute('SELECT ID_PRODUCTO, TIPO_PRODUCTO FROM PRODUCTO WHERE ID_PRODUCTO = :id', {'id': id_producto})
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail='Producto no encontrado')
        cursor.execute('UPDATE PRODUCTO SET\n                NOMBRE = :nombre, DESCRIPCION = :descripcion,\n                TIPO_PRODUCTO = :tipo, ACTIVO = :activo,\n                PRECIO_CUOTA_A = :precio_a, PRECIO_CUOTA_B = :precio_b\n               WHERE ID_PRODUCTO = :id', {'nombre': data.nombre, 'descripcion': data.descripcion, 'tipo': tipo_producto_db, 'activo': data.activo, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id': id_producto})
        if tipo_producto_db == 'MEDICAMENTO':
            cursor.execute('MERGE INTO MEDICAMENTO m\n                   USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src\n                   ON (m.ID_PRODUCTO = src.ID_PRODUCTO)\n                   WHEN MATCHED THEN UPDATE SET\n                       PRESENTACION = :presentacion, DOSIS = :dosis,\n                       REQUIERE_CADUCIDAD = :requiere\n                   WHEN NOT MATCHED THEN INSERT\n                       (ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD)\n                       VALUES (:id, :presentacion, :dosis, :requiere)', {'id': id_producto, 'presentacion': data.presentacion, 'dosis': data.dosis, 'requiere': data.requiere_caducidad or 'N'})
        else:
            cursor.execute('MERGE INTO EQUIPO_MEDICO eq\n                   USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src\n                   ON (eq.ID_PRODUCTO = src.ID_PRODUCTO)\n                   WHEN MATCHED THEN UPDATE SET\n                       NUMERO_SERIE = :serie, MARCA = :marca, MODELO = :modelo,\n                       ESTATUS_EQUIPO = :estatus, OBSERVACIONES = :obs\n                   WHEN NOT MATCHED THEN INSERT\n                       (ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO, ESTATUS_EQUIPO, OBSERVACIONES)\n                       VALUES (:id, :serie, :marca, :modelo, :estatus, :obs)', {'id': id_producto, 'serie': data.numero_serie, 'marca': data.marca, 'modelo': data.modelo, 'estatus': data.estatus_equipo or 'DISPONIBLE', 'obs': data.observaciones})
        fecha_cad_val = (
            datetime.strptime(data.fecha_caducidad[:10], '%Y-%m-%d').date()
            if data.fecha_caducidad else None
        )
        cursor.execute(
            "MERGE INTO EXISTENCIA_PRODUCTO ex"
            " USING (SELECT :id AS ID_PRODUCTO FROM DUAL) src"
            " ON (ex.ID_PRODUCTO = src.ID_PRODUCTO AND ex.ACTIVO = 'S')"
            " WHEN MATCHED THEN UPDATE SET"
            "     CANTIDAD_DISPONIBLE = :cant, NIVEL_MINIMO = :nmin,"
            "     UNIDAD_MEDIDA = :unidad,"
            "     FECHA_CADUCIDAD = :fecha_cad"
            " WHEN NOT MATCHED THEN INSERT"
            "     (ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO, UNIDAD_MEDIDA, ACTIVO, FECHA_CADUCIDAD)"
            "     VALUES (:id, :cant, :nmin, :unidad, 'S', :fecha_cad)",
            {
                'id': id_producto,
                'cant': data.cantidad_disponible,
                'nmin': data.nivel_minimo,
                'unidad': data.unidad_medida,
                'fecha_cad': fecha_cad_val,
            },
        )
        conn.commit()
    return _fetch_producto(id_producto)

def desactivar_producto(id_producto: int, current_user: dict=None):
    """Desactivar un producto (soft delete)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE PRODUCTO SET ACTIVO = 'N' WHERE ID_PRODUCTO = :id", {'id': id_producto})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Producto no encontrado')
        conn.commit()
    return {'message': 'Producto desactivado correctamente'}

def listar_servicios(busqueda: Optional[str]=None, activo: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar servicios con filtros opcionales."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    sql = '\n        SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,\n               ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n               PRECIO_CUOTA_A, PRECIO_CUOTA_B\n        FROM SERVICIO WHERE 1=1\n    '
    params: dict = {}
    if activo:
        sql += ' AND ACTIVO = :activo'
        params['activo'] = activo
    if busqueda:
        sql += ' AND (LOWER(NOMBRE) LIKE :busqueda OR LOWER(DESCRIPCION) LIKE :busqueda)'
        params['busqueda'] = f'%{busqueda.lower()}%'
    sql += ' ORDER BY ID_SERVICIO OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    params['offset'] = safe_offset
    params['limit'] = safe_limit
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_servicio(id_servicio: int, current_user: dict=None):
    """Obtener un servicio por ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,\n                      ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                      PRECIO_CUOTA_A, PRECIO_CUOTA_B\n               FROM SERVICIO WHERE ID_SERVICIO = :id', {'id': id_servicio})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Servicio no encontrado')
    return _serialize(row)

def crear_servicio(data: ServicioCreate, current_user: dict=None):
    """Crear un nuevo servicio."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        id_var = cursor.var(int)
        cursor.execute('INSERT INTO SERVICIO\n               (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO,\n                ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                PRECIO_CUOTA_A, PRECIO_CUOTA_B)\n               VALUES (:nombre, :descripcion, :cuota, :activo,\n                       :id_usuario, SYSDATE, :precio_a, :precio_b)\n               RETURNING ID_SERVICIO INTO :id_out', {'nombre': data.nombre, 'descripcion': data.descripcion, 'cuota': data.cuota_recuperacion, 'activo': data.activo, 'id_usuario': id_usuario, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id_out': id_var})
        id_servicio = id_var.getvalue()[0]
        conn.commit()
    return _fetch_servicio(id_servicio)

def _fetch_servicio(id_servicio: int) -> dict:
    """Fetch a single service (internal helper)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_SERVICIO, NOMBRE, DESCRIPCION, CUOTA_RECUPERACION,\n                      ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO,\n                      PRECIO_CUOTA_A, PRECIO_CUOTA_B\n               FROM SERVICIO WHERE ID_SERVICIO = :id', {'id': id_servicio})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Servicio no encontrado')
    return _serialize(row)

def actualizar_servicio(id_servicio: int, data: ServicioCreate, current_user: dict=None):
    """Actualizar un servicio existente."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE SERVICIO SET\n                NOMBRE = :nombre, DESCRIPCION = :descripcion,\n                CUOTA_RECUPERACION = :cuota, ACTIVO = :activo,\n                PRECIO_CUOTA_A = :precio_a, PRECIO_CUOTA_B = :precio_b\n               WHERE ID_SERVICIO = :id', {'nombre': data.nombre, 'descripcion': data.descripcion, 'cuota': data.cuota_recuperacion, 'activo': data.activo, 'precio_a': data.precio_cuota_a, 'precio_b': data.precio_cuota_b, 'id': id_servicio})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Servicio no encontrado')
        conn.commit()
    return _fetch_servicio(id_servicio)

def desactivar_servicio(id_servicio: int, current_user: dict=None):
    """Desactivar un servicio (soft delete)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE SERVICIO SET ACTIVO = 'N' WHERE ID_SERVICIO = :id", {'id': id_servicio})
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail='Servicio no encontrado')
        conn.commit()
    return {'message': 'Servicio desactivado correctamente'}
_COMODATOS_BASE_SQL = "\n    SELECT c.ID_COMODATO, c.FOLIO_COMODATO, c.ID_EQUIPO, c.ID_PACIENTE,\n           c.ID_USUARIO_REGISTRO, c.FECHA_PRESTAMO, c.FECHA_DEVOLUCION,\n           c.ESTATUS, c.MONTO_TOTAL, c.MONTO_PAGADO, c.SALDO_PENDIENTE,\n           c.EXENTO_PAGO, c.NOTAS,\n           pa.NOMBRE || ' ' || pa.APELLIDO_PATERNO || ' ' || NVL(pa.APELLIDO_MATERNO, '') AS NOMBRE_PACIENTE,\n           pa.FOLIO AS FOLIO_PACIENTE,\n           pr.NOMBRE AS NOMBRE_EQUIPO\n    FROM COMODATO c\n    LEFT JOIN PACIENTE pa ON pa.ID_PACIENTE = c.ID_PACIENTE\n    LEFT JOIN PRODUCTO pr ON pr.ID_PRODUCTO = c.ID_EQUIPO\n"

def listar_comodatos(estatus: Optional[str]=None, busqueda: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar comodatos con filtros opcionales."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    sql = _COMODATOS_BASE_SQL + ' WHERE 1=1'
    params: dict = {}
    if estatus:
        sql += ' AND c.ESTATUS = :estatus'
        params['estatus'] = estatus
    if busqueda:
        sql += " AND (LOWER(pa.NOMBRE || ' ' || pa.APELLIDO_PATERNO) LIKE :busqueda OR LOWER(pr.NOMBRE) LIKE :busqueda OR LOWER(pa.FOLIO) LIKE :busqueda OR LOWER(c.FOLIO_COMODATO) LIKE :busqueda)"
        params['busqueda'] = f'%{busqueda.lower()}%'
    sql += ' ORDER BY c.ID_COMODATO DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    params['offset'] = safe_offset
    params['limit'] = safe_limit
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_comodato(id_comodato: int, current_user: dict=None):
    """Obtener un comodato por ID."""
    sql = _COMODATOS_BASE_SQL + ' WHERE c.ID_COMODATO = :id'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id': id_comodato})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Comodato no encontrado')
    return _serialize(row)

def crear_comodato(data: ComodatoCreate, current_user: dict=None):
    """Registrar un nuevo comodato (RF-PS-06). Stock vía SP_REGISTRAR_MOVIMIENTO_STOCK."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        cursor.execute('SELECT NVL(MAX(ID_COMODATO), 0) + 1 FROM COMODATO')
        next_num = cursor.fetchone()[0]
        folio = f'COM-{next_num:06d}'
        id_var = cursor.var(int)
        cursor.execute("INSERT INTO COMODATO\n               (FOLIO_COMODATO, ID_EQUIPO, ID_PACIENTE, ID_USUARIO_REGISTRO,\n                FECHA_PRESTAMO, FECHA_DEVOLUCION, ESTATUS,\n                MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE,\n                EXENTO_PAGO, NOTAS)\n               VALUES (:folio, :id_equipo, :id_paciente, :id_usuario,\n                       TO_DATE(:fecha_prest, 'YYYY-MM-DD'),\n                       CASE WHEN :fecha_dev IS NOT NULL\n                            THEN TO_DATE(:fecha_dev, 'YYYY-MM-DD')\n                            ELSE NULL END,\n                       :estatus, :monto_total, :monto_pagado, :saldo,\n                       :exento, :notas)\n               RETURNING ID_COMODATO INTO :id_out", {'folio': folio, 'id_equipo': data.id_equipo, 'id_paciente': data.id_paciente, 'id_usuario': id_usuario, 'fecha_prest': data.fecha_prestamo, 'fecha_dev': data.fecha_devolucion, 'estatus': data.estatus, 'monto_total': data.monto_total, 'monto_pagado': data.monto_pagado, 'saldo': data.saldo_pendiente, 'exento': data.exento_pago, 'notas': data.notas, 'id_out': id_var})
        id_comodato = id_var.getvalue()[0]
        try:
            cursor.callproc('SP_REGISTRAR_MOVIMIENTO_STOCK', [
                data.id_equipo,
                'SALIDA_COMODATO',
                1,
                id_usuario,
                None,
                id_comodato,
                f'Préstamo comodato {folio}',
            ])
        except oracledb.DatabaseError as exc:
            conn.rollback()
            raise sp_error_to_http(exc, _SP_MOVIMIENTO_STOCK_ERRORS,
                                   default_detail='No se pudo registrar el movimiento de existencias')
        log_insert(conn, 'COMODATO', id_comodato, id_usuario, f'Comodato {folio} creado para paciente {data.id_paciente}')
        conn.commit()
    return _fetch_comodato(id_comodato)

def _fetch_comodato(id_comodato: int) -> dict:
    """Fetch a single comodato (internal helper)."""
    sql = _COMODATOS_BASE_SQL + ' WHERE c.ID_COMODATO = :id'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id': id_comodato})
        row = row_to_dict(cursor)
    if not row:
        raise HTTPException(status_code=404, detail='Comodato no encontrado')
    return _serialize(row)

def actualizar_comodato(id_comodato: int, data: ComodatoCreate, current_user: dict=None):
    """Actualizar un comodato existente (RF-PS-07: auto-update stock on return)."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1)
        cursor.execute('SELECT ESTATUS, ID_EQUIPO FROM COMODATO WHERE ID_COMODATO = :id', {'id': id_comodato})
        prev = cursor.fetchone()
        if prev is None:
            raise HTTPException(status_code=404, detail='Comodato no encontrado')
        prev_estatus = prev[0].strip() if prev[0] else ''
        id_equipo_prev = prev[1]
        cursor.execute("UPDATE COMODATO SET\n                ID_EQUIPO = :id_equipo, ID_PACIENTE = :id_paciente,\n                FECHA_PRESTAMO = TO_DATE(:fecha_prest, 'YYYY-MM-DD'),\n                FECHA_DEVOLUCION = CASE WHEN :fecha_dev IS NOT NULL\n                                        THEN TO_DATE(:fecha_dev, 'YYYY-MM-DD')\n                                        ELSE NULL END,\n                ESTATUS = :estatus, MONTO_TOTAL = :monto_total,\n                MONTO_PAGADO = :monto_pagado, SALDO_PENDIENTE = :saldo,\n                EXENTO_PAGO = :exento, NOTAS = :notas\n               WHERE ID_COMODATO = :id", {'id_equipo': data.id_equipo, 'id_paciente': data.id_paciente, 'fecha_prest': data.fecha_prestamo, 'fecha_dev': data.fecha_devolucion, 'estatus': data.estatus, 'monto_total': data.monto_total, 'monto_pagado': data.monto_pagado, 'saldo': data.saldo_pendiente, 'exento': data.exento_pago, 'notas': data.notas, 'id': id_comodato})
        new_estatus = data.estatus.strip() if data.estatus else ''
        if prev_estatus == 'PRESTADO' and new_estatus == 'DEVUELTO':
            try:
                cursor.callproc('SP_REGISTRAR_MOVIMIENTO_STOCK', [
                    id_equipo_prev,
                    'DEVOLUCION_COMODATO',
                    1,
                    id_usuario,
                    None,
                    id_comodato,
                    'Devolución de comodato',
                ])
            except oracledb.DatabaseError as exc:
                conn.rollback()
                raise sp_error_to_http(exc, _SP_MOVIMIENTO_STOCK_ERRORS,
                                       default_detail='No se pudo registrar la devolución')
        conn.commit()
    return _fetch_comodato(id_comodato)

def ajustar_existencia(id_producto: int, stock_nuevo: int, motivo: str, current_user: dict=None):
    """Ajustar stock objetivo de un producto vía SP_AJUSTAR_EXISTENCIA_PRODUCTO."""
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = current_user.get('id_usuario', 1) if current_user else 1
        try:
            cursor.callproc('SP_AJUSTAR_EXISTENCIA_PRODUCTO', [
                id_producto,
                int(stock_nuevo),
                motivo,
                id_usuario,
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, _SP_AJUSTAR_EXISTENCIA_ERRORS,
                                   default_detail='No se pudo ajustar la existencia')
        conn.commit()
    return _fetch_producto(id_producto)


def listar_movimientos(id_producto: Optional[int]=None, tipo_movimiento: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar movimientos de inventario con filtros opcionales."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    sql = '\n        SELECT ID_MOVIMIENTO, ID_PRODUCTO, ID_USUARIO_REGISTRO,\n               ID_VENTA, ID_COMODATO, FECHA_MOVIMIENTO,\n               TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES\n        FROM MOVIMIENTO_INVENTARIO WHERE 1=1\n    '
    params: dict = {}
    if id_producto:
        sql += ' AND ID_PRODUCTO = :id_producto'
        params['id_producto'] = id_producto
    if tipo_movimiento:
        sql += ' AND TIPO_MOVIMIENTO = :tipo'
        params['tipo'] = tipo_movimiento
    sql += ' ORDER BY FECHA_MOVIMIENTO DESC, ID_MOVIMIENTO DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    params['offset'] = safe_offset
    params['limit'] = safe_limit
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def almacen_stats(current_user: dict=None):
    """Estadisticas del almacen para dashboard."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(p.ID_PRODUCTO),\n                      NVL(SUM(ex.CANTIDAD_DISPONIBLE), 0)\n               FROM PRODUCTO p\n               LEFT JOIN EXISTENCIA_PRODUCTO ex\n                   ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n               WHERE p.ACTIVO = 'S'")
        row = cursor.fetchone()
        total_productos = row[0]
        total_unidades = int(row[1])
        cursor.execute("SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE,\n                      ex.CANTIDAD_DISPONIBLE, ex.NIVEL_MINIMO\n               FROM PRODUCTO p\n               JOIN EXISTENCIA_PRODUCTO ex\n                   ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n               WHERE p.ACTIVO = 'S'\n                 AND ex.CANTIDAD_DISPONIBLE < ex.NIVEL_MINIMO")
        stock_bajo = rows_to_dicts(cursor)
        stock_bajo = [_serialize(r) for r in stock_bajo]
        cursor.execute("SELECT TIPO_PRODUCTO, COUNT(*)\n               FROM PRODUCTO WHERE ACTIVO = 'S'\n               GROUP BY TIPO_PRODUCTO")
        por_tipo = {r[0].strip(): r[1] for r in cursor.fetchall()}
        cursor.execute("SELECT COUNT(*) FROM COMODATO WHERE ESTATUS = 'PRESTADO'")
        comodatos_activos = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM SERVICIO WHERE ACTIVO = 'S'")
        servicios_activos = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM MOVIMIENTO_INVENTARIO')
        total_movimientos = cursor.fetchone()[0]
        try:
            cursor.execute("SELECT p.ID_PRODUCTO, p.CLAVE_INTERNA, p.NOMBRE,\n                          ex.FECHA_CADUCIDAD, ex.CANTIDAD_DISPONIBLE,\n                          CASE WHEN ex.FECHA_CADUCIDAD < TRUNC(SYSDATE)\n                               THEN 'VENCIDO' ELSE 'PROXIMO' END AS ESTATUS_CADUCIDAD\n                   FROM PRODUCTO p\n                   JOIN EXISTENCIA_PRODUCTO ex\n                       ON ex.ID_PRODUCTO = p.ID_PRODUCTO AND ex.ACTIVO = 'S'\n                   JOIN MEDICAMENTO m ON m.ID_PRODUCTO = p.ID_PRODUCTO\n                   WHERE p.ACTIVO = 'S'\n                     AND m.REQUIERE_CADUCIDAD = 'S'\n                     AND ex.FECHA_CADUCIDAD IS NOT NULL\n                     AND ex.FECHA_CADUCIDAD <= TRUNC(SYSDATE) + 30\n                   ORDER BY ex.FECHA_CADUCIDAD")
            proximos_vencer = [_serialize(r) for r in rows_to_dicts(cursor)]
        except Exception:
            proximos_vencer = []
    return {'total_productos': total_productos, 'total_unidades': total_unidades, 'stock_bajo': stock_bajo, 'alertas_stock_bajo': len(stock_bajo), 'por_tipo': por_tipo, 'comodatos_activos': comodatos_activos, 'servicios_activos': servicios_activos, 'total_movimientos': total_movimientos, 'proximos_vencer': proximos_vencer, 'alertas_caducidad': len(proximos_vencer)}


class OracleAlmacenRepository:
    def listar_productos(self, *args, **kwargs):
        return listar_productos(*args, **kwargs)

    def obtener_producto(self, *args, **kwargs):
        return obtener_producto(*args, **kwargs)

    def crear_producto(self, *args, **kwargs):
        return crear_producto(*args, **kwargs)

    def actualizar_producto(self, *args, **kwargs):
        return actualizar_producto(*args, **kwargs)

    def desactivar_producto(self, *args, **kwargs):
        return desactivar_producto(*args, **kwargs)

    def listar_servicios(self, *args, **kwargs):
        return listar_servicios(*args, **kwargs)

    def obtener_servicio(self, *args, **kwargs):
        return obtener_servicio(*args, **kwargs)

    def crear_servicio(self, *args, **kwargs):
        return crear_servicio(*args, **kwargs)

    def actualizar_servicio(self, *args, **kwargs):
        return actualizar_servicio(*args, **kwargs)

    def desactivar_servicio(self, *args, **kwargs):
        return desactivar_servicio(*args, **kwargs)

    def listar_comodatos(self, *args, **kwargs):
        return listar_comodatos(*args, **kwargs)

    def obtener_comodato(self, *args, **kwargs):
        return obtener_comodato(*args, **kwargs)

    def crear_comodato(self, *args, **kwargs):
        return crear_comodato(*args, **kwargs)

    def actualizar_comodato(self, *args, **kwargs):
        return actualizar_comodato(*args, **kwargs)

    def listar_movimientos(self, *args, **kwargs):
        return listar_movimientos(*args, **kwargs)

    def almacen_stats(self, *args, **kwargs):
        return almacen_stats(*args, **kwargs)

    def ajustar_existencia(self, *args, **kwargs):
        return ajustar_existencia(*args, **kwargs)

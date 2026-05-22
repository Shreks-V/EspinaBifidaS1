from __future__ import annotations

from datetime import datetime, date
import logging

import oracledb
from app.domain.exceptions import ConflictError, InternalError, NotFoundError, ValidationError
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.persistence.sp_helpers import (
    make_number_list,
    sp_error_to_http,
)
from app.infrastructure.privacy.crypto import encrypt, decrypt_row, DOCTOR_ENCRYPTED_FIELDS
logger = logging.getLogger(__name__)

_SP_ASIGNAR_SERVICIOS_DOCTOR_ERRORS = {
    20601: (404, None),  # Doctor no existe o inactivo
}


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

def _get_servicios_for_doctor(conn, id_doctor: int) -> list[dict]:
    """Fetch services linked to a doctor via DOCTOR_SERVICIO JOIN SERVICIO."""
    cursor = conn.cursor()
    cursor.execute('SELECT s.ID_SERVICIO, s.NOMBRE FROM DOCTOR_SERVICIO ds JOIN SERVICIO s ON ds.ID_SERVICIO = s.ID_SERVICIO WHERE ds.ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
    return [_serialize(r) for r in rows_to_dicts(cursor)]

def _doctor_with_servicios(conn, doctor_row: dict) -> dict:
    """Attach servicios list to a doctor dict, descifrar datos sensibles."""
    d = _serialize(decrypt_row(doctor_row, DOCTOR_ENCRYPTED_FIELDS))
    d['servicios'] = _get_servicios_for_doctor(conn, d['id_doctor'])
    return d

def _sync_doctor_servicios(conn, id_doctor: int, servicio_ids: list[int]):
    """Replace DOCTOR_SERVICIO rows for a doctor via SP_ASIGNAR_SERVICIOS_DOCTOR."""
    try:
        with conn.cursor() as cursor:
            servicios_arr = make_number_list(conn, servicio_ids or [])
            cursor.callproc(
                "SP_ASIGNAR_SERVICIOS_DOCTOR",
                [id_doctor, servicios_arr],
            )
    except oracledb.DatabaseError as exc:
        raise sp_error_to_http(exc, _SP_ASIGNAR_SERVICIOS_DOCTOR_ERRORS)

def _match_especial_hoy(fecha_inicio_date: date, tipo: str) -> bool:
    """Determina si una disponibilidad especial aplica para hoy."""
    hoy = date.today()
    if hoy < fecha_inicio_date:
        return False
    if tipo == 'UNICA':
        return hoy == fecha_inicio_date
    delta = (hoy - fecha_inicio_date).days
    if tipo == 'QUINCENAL':
        return delta % 14 == 0
    if tipo == 'CADA_3_SEMANAS':
        return delta % 21 == 0
    if tipo == 'MENSUAL':
        return hoy.day == fecha_inicio_date.day
    return False


def doctor_del_dia(current_user: dict=None):
    """Doctor asignado hoy: primero busca en disponibilidad especial, luego en semanal."""
    hoy = date.today()
    dia_semana = hoy.weekday() + 1
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Buscar en disponibilidades especiales activas
            cursor.execute(
                """
                SELECT de.ID_DISP_ESPECIAL, de.ID_DOCTOR, de.FECHA_INICIO,
                       de.HORA_INICIO, de.HORA_FIN, de.TIPO_RECURRENCIA,
                       d.NOMBRE, d.APELLIDO_PATERNO, d.APELLIDO_MATERNO,
                       d.ESPECIALIDAD, d.TELEFONO, d.CORREO, d.ACTIVO, d.FECHA_REGISTRO
                  FROM DISPONIBILIDAD_ESPECIAL_DOCTOR de
                  JOIN DOCTOR d ON d.ID_DOCTOR = de.ID_DOCTOR
                 WHERE de.ACTIVO = 'S' AND d.ACTIVO = 'S'
                   AND de.FECHA_INICIO <= :hoy
                 ORDER BY de.HORA_INICIO
                """,
                {'hoy': hoy},
            )
            rows_esp = rows_to_dicts(cursor)
            for r in rows_esp:
                fi = r.get('fecha_inicio')
                fi_date = fi.date() if isinstance(fi, datetime) else (fi if isinstance(fi, date) else None)
                if fi_date and _match_especial_hoy(fi_date, str(r.get('tipo_recurrencia', 'UNICA')).strip()):
                    hora_inicio = r.get('hora_inicio', '')
                    hora_fin = r.get('hora_fin', '')
                    doctor_row = {
                        'id_doctor': r['id_doctor'],
                        'nombre': r['nombre'],
                        'apellido_paterno': r['apellido_paterno'],
                        'apellido_materno': r['apellido_materno'],
                        'especialidad': r['especialidad'],
                        'telefono': r['telefono'],
                        'correo': r['correo'],
                        'activo': r['activo'],
                        'fecha_registro': r['fecha_registro'],
                    }
                    doctor = _doctor_with_servicios(conn, doctor_row)
                    doctor['hora_inicio'] = hora_inicio
                    doctor['hora_fin'] = hora_fin
                    doctor['fuente'] = 'especial'
                    return {'doctor': doctor, 'hora_inicio': hora_inicio, 'hora_fin': hora_fin}

            # 2. Fallback: disponibilidad semanal normal
            cursor.execute(
                "SELECT d.ID_DOCTOR, d.NOMBRE, d.APELLIDO_PATERNO, d.APELLIDO_MATERNO, d.ESPECIALIDAD, d.TELEFONO, d.CORREO, d.ACTIVO, d.FECHA_REGISTRO, dd.HORA_INICIO, dd.HORA_FIN FROM DISPONIBILIDAD_DOCTOR dd JOIN DOCTOR d ON d.ID_DOCTOR = dd.ID_DOCTOR WHERE dd.DIA_SEMANA = :dia AND dd.DISPONIBLE = 'S' AND d.ACTIVO = 'S' ORDER BY dd.HORA_INICIO FETCH FIRST 1 ROWS ONLY",
                {'dia': dia_semana},
            )
            row = row_to_dict(cursor)
            if row is None:
                return {'doctor': None, 'hora_inicio': None, 'hora_fin': None}
            hora_inicio = row.pop('hora_inicio', None)
            hora_fin = row.pop('hora_fin', None)
            doctor = _doctor_with_servicios(conn, row)
            doctor['hora_inicio'] = hora_inicio.isoformat() if isinstance(hora_inicio, datetime) else str(hora_inicio) if hora_inicio else None
            doctor['hora_fin'] = hora_fin.isoformat() if isinstance(hora_fin, datetime) else str(hora_fin) if hora_fin else None
            doctor['fuente'] = 'semanal'
            return {'doctor': doctor, 'hora_inicio': doctor['hora_inicio'], 'hora_fin': doctor['hora_fin']}
    except Exception:
        logger.exception('Error al consultar doctor del día')
        raise InternalError('Error interno del servidor')

def listar_doctores(current_user: dict=None, limit: int=100, offset: int=0):
    """Listar todos los doctores con sus servicios."""
    try:
        safe_limit, safe_offset = _normalize_pagination(limit, offset)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO FROM DOCTOR ORDER BY ID_DOCTOR OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY', {'offset': safe_offset, 'limit': safe_limit})
            rows = rows_to_dicts(cursor)
            return [_doctor_with_servicios(conn, r) for r in rows]
    except Exception as e:
        logger.exception('Error al consultar doctores')
        raise InternalError('Error interno del servidor')

def obtener_disponibilidad_semana(current_user: dict=None, limit: int=500, offset: int=0):
    """Obtener toda la disponibilidad de todos los doctores (para validar conflictos)."""
    try:
        safe_limit, safe_offset = _normalize_pagination(limit, offset)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT dd.ID_DISPONIBILIDAD, dd.ID_DOCTOR, dd.DIA_SEMANA, TO_CHAR(dd.HORA_INICIO, 'HH24:MI') AS HORA_INICIO, TO_CHAR(dd.HORA_FIN, 'HH24:MI') AS HORA_FIN, dd.DISPONIBLE, d.NOMBRE || ' ' || d.APELLIDO_PATERNO AS NOMBRE_DOCTOR FROM DISPONIBILIDAD_DOCTOR dd JOIN DOCTOR d ON d.ID_DOCTOR = dd.ID_DOCTOR WHERE d.ACTIVO = 'S' AND dd.DISPONIBLE = 'S' ORDER BY dd.DIA_SEMANA, dd.HORA_INICIO OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY", {'offset': safe_offset, 'limit': safe_limit})
            rows = rows_to_dicts(cursor)
            return [_serialize(r) for r in rows]
    except Exception as e:
        logger.exception('Error al consultar disponibilidad semanal')
        raise InternalError('Error interno del servidor')

def obtener_doctor(id_doctor: int, current_user: dict=None):
    """Obtener un doctor por ID."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            row = row_to_dict(cursor)
            if row is None:
                raise NotFoundError('Doctor no encontrado')
            return _doctor_with_servicios(conn, row)
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al consultar doctor')
        raise InternalError('Error interno del servidor')

def crear_doctor(data, current_user: dict=None):
    """Crear nuevo doctor con servicios asociados."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            id_var = cursor.var(int)
            cursor.execute('INSERT INTO DOCTOR (NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD, TELEFONO, CORREO, ACTIVO) VALUES (:nombre, :ap, :am, :esp, :tel, :correo, :activo) RETURNING ID_DOCTOR INTO :id_out', {'nombre': data.nombre, 'ap': data.apellido_paterno, 'am': data.apellido_materno, 'esp': data.especialidad, 'tel': encrypt(data.telefono), 'correo': encrypt(data.correo), 'activo': data.activo, 'id_out': id_var})
            new_id = id_var.getvalue()[0]
            if data.servicios:
                _sync_doctor_servicios(conn, new_id, data.servicios)
            conn.commit()
            cursor.execute('SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': new_id})
            row = row_to_dict(cursor)
            return _doctor_with_servicios(conn, row)
    except Exception as e:
        logger.exception('Error al crear doctor')
        raise InternalError('Error interno del servidor')

def actualizar_doctor(id_doctor: int, data, current_user: dict=None):
    """Actualizar doctor existente y sus servicios."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            cursor.execute('UPDATE DOCTOR SET NOMBRE = :nombre, APELLIDO_PATERNO = :ap, APELLIDO_MATERNO = :am, ESPECIALIDAD = :esp, TELEFONO = :tel, CORREO = :correo, ACTIVO = :activo WHERE ID_DOCTOR = :id_doctor', {'nombre': data.nombre, 'ap': data.apellido_paterno, 'am': data.apellido_materno, 'esp': data.especialidad, 'tel': encrypt(data.telefono), 'correo': encrypt(data.correo), 'activo': data.activo, 'id_doctor': id_doctor})
            if data.servicios is not None:
                _sync_doctor_servicios(conn, id_doctor, data.servicios)
            conn.commit()
            cursor.execute('SELECT ID_DOCTOR, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO, ESPECIALIDAD, TELEFONO, CORREO, ACTIVO, FECHA_REGISTRO FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            row = row_to_dict(cursor)
            return _doctor_with_servicios(conn, row)
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al actualizar doctor')
        raise InternalError('Error interno del servidor')

def desactivar_doctor(id_doctor: int, current_user: dict=None):
    """Desactivar doctor (soft delete, ACTIVO = 'N')."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            cursor.execute("UPDATE DOCTOR SET ACTIVO = 'N' WHERE ID_DOCTOR = :id_doctor", {'id_doctor': id_doctor})
            conn.commit()
            return {'message': 'Doctor desactivado', 'id_doctor': id_doctor}
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al desactivar doctor')
        raise InternalError('Error interno del servidor')

def obtener_disponibilidad(id_doctor: int, current_user: dict=None, limit: int=500, offset: int=0):
    """Obtener disponibilidad semanal de un doctor."""
    try:
        safe_limit, safe_offset = _normalize_pagination(limit, offset)
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            cursor.execute("SELECT ID_DISPONIBILIDAD, ID_DOCTOR, DIA_SEMANA, TO_CHAR(HORA_INICIO, 'HH24:MI') AS HORA_INICIO, TO_CHAR(HORA_FIN, 'HH24:MI') AS HORA_FIN, DISPONIBLE, FECHA_REGISTRO FROM DISPONIBILIDAD_DOCTOR WHERE ID_DOCTOR = :id_doctor ORDER BY DIA_SEMANA, HORA_INICIO OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY", {'id_doctor': id_doctor, 'offset': safe_offset, 'limit': safe_limit})
            rows = rows_to_dicts(cursor)
            return [_serialize(r) for r in rows]
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al consultar disponibilidad')
        raise InternalError('Error interno del servidor')

def crear_disponibilidad(id_doctor: int, data, current_user: dict=None):
    """Crear un slot de disponibilidad semanal para un doctor (por día de la semana)."""
    if data.dia_semana < 1 or data.dia_semana > 7:
        raise ValidationError('dia_semana debe ser entre 1 (Lunes) y 7 (Domingo)')
    if data.hora_inicio >= data.hora_fin:
        raise ValidationError('hora_inicio debe ser anterior a hora_fin')
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            cursor.execute("SELECT dd.ID_DOCTOR, d.NOMBRE || ' ' || d.APELLIDO_PATERNO AS NOMBRE_DOCTOR FROM DISPONIBILIDAD_DOCTOR dd JOIN DOCTOR d ON d.ID_DOCTOR = dd.ID_DOCTOR WHERE dd.DIA_SEMANA = :dia AND dd.DISPONIBLE = 'S' AND dd.ID_DOCTOR != :id_doctor AND TO_CHAR(dd.HORA_INICIO, 'HH24:MI') < :hora_fin AND TO_CHAR(dd.HORA_FIN, 'HH24:MI') > :hora_inicio", {'dia': data.dia_semana, 'id_doctor': id_doctor, 'hora_fin': data.hora_fin, 'hora_inicio': data.hora_inicio})
            conflicto = row_to_dict(cursor)
            if conflicto:
                nombre = conflicto['nombre_doctor']
                raise ConflictError(f'Conflicto de horario: Dr. {nombre} ya tiene asignado ese horario este dia')
            cursor.execute("SELECT COUNT(*) AS cnt FROM DISPONIBILIDAD_DOCTOR WHERE ID_DOCTOR = :id_doctor AND DIA_SEMANA = :dia AND TO_CHAR(HORA_INICIO, 'HH24:MI') = :hora_inicio AND TO_CHAR(HORA_FIN, 'HH24:MI') = :hora_fin", {'id_doctor': id_doctor, 'dia': data.dia_semana, 'hora_inicio': data.hora_inicio, 'hora_fin': data.hora_fin})
            dup = row_to_dict(cursor)
            if dup and dup['cnt'] > 0:
                raise ValidationError('Este horario ya esta registrado para este doctor')
            id_var = cursor.var(int)
            cursor.execute("INSERT INTO DISPONIBILIDAD_DOCTOR (ID_DOCTOR, DIA_SEMANA, FECHA, HORA_INICIO, HORA_FIN, DISPONIBLE) VALUES (:id_doctor, :dia, SYSDATE, TO_TIMESTAMP(:hora_inicio, 'HH24:MI'), TO_TIMESTAMP(:hora_fin, 'HH24:MI'), 'S') RETURNING ID_DISPONIBILIDAD INTO :id_out", {'id_doctor': id_doctor, 'dia': data.dia_semana, 'hora_inicio': data.hora_inicio, 'hora_fin': data.hora_fin, 'id_out': id_var})
            new_id = id_var.getvalue()[0]
            conn.commit()
            cursor.execute("SELECT ID_DISPONIBILIDAD, ID_DOCTOR, DIA_SEMANA, TO_CHAR(HORA_INICIO, 'HH24:MI') AS HORA_INICIO, TO_CHAR(HORA_FIN, 'HH24:MI') AS HORA_FIN, DISPONIBLE, FECHA_REGISTRO FROM DISPONIBILIDAD_DOCTOR WHERE ID_DISPONIBILIDAD = :id_disp", {'id_disp': new_id})
            row = row_to_dict(cursor)
            return _serialize(row)
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al crear disponibilidad')
        raise InternalError('Error interno del servidor')

def eliminar_disponibilidad(id_doctor: int, id_disponibilidad: int, current_user: dict=None):
    """Eliminar un slot de disponibilidad de un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM DISPONIBILIDAD_DOCTOR WHERE ID_DISPONIBILIDAD = :id_disp AND ID_DOCTOR = :id_doctor', {'id_disp': id_disponibilidad, 'id_doctor': id_doctor})
            if cursor.rowcount == 0:
                raise NotFoundError('Slot de disponibilidad no encontrado')
            conn.commit()
            return {'message': 'Disponibilidad eliminada correctamente'}
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al eliminar disponibilidad')
        raise InternalError('Error interno del servidor')

def obtener_servicios_doctor(id_doctor: int, current_user: dict=None):
    """Obtener los servicios asociados a un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            return _get_servicios_for_doctor(conn, id_doctor)
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception as e:
        logger.exception('Error al consultar servicios del doctor')
        raise InternalError('Error interno del servidor')


def listar_disponibilidad_especial(id_doctor: int, current_user: dict=None):
    """Listar todos los slots de disponibilidad especial de un doctor."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            cursor.execute(
                """
                SELECT ID_DISP_ESPECIAL, ID_DOCTOR,
                       TO_CHAR(FECHA_INICIO, 'YYYY-MM-DD') AS FECHA_INICIO,
                       HORA_INICIO, HORA_FIN, TIPO_RECURRENCIA, DESCRIPCION, ACTIVO,
                       TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD') AS FECHA_REGISTRO
                  FROM DISPONIBILIDAD_ESPECIAL_DOCTOR
                 WHERE ID_DOCTOR = :id_doctor AND ACTIVO = 'S'
                 ORDER BY FECHA_INICIO, HORA_INICIO
                """,
                {'id_doctor': id_doctor},
            )
            return [_serialize(r) for r in rows_to_dicts(cursor)]
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception:
        logger.exception('Error al listar disponibilidad especial')
        raise InternalError('Error interno del servidor')


def crear_disponibilidad_especial(id_doctor: int, data, current_user: dict=None):
    """Crear un slot de disponibilidad especial para un doctor."""
    tipos_validos = ('UNICA', 'QUINCENAL', 'CADA_3_SEMANAS', 'MENSUAL')
    if data.tipo_recurrencia not in tipos_validos:
        raise ValidationError(f"tipo_recurrencia debe ser uno de: {', '.join(tipos_validos)}")
    if data.hora_inicio >= data.hora_fin:
        raise ValidationError('hora_inicio debe ser anterior a hora_fin')
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT ID_DOCTOR FROM DOCTOR WHERE ID_DOCTOR = :id_doctor', {'id_doctor': id_doctor})
            if cursor.fetchone() is None:
                raise NotFoundError('Doctor no encontrado')
            id_var = cursor.var(int)
            cursor.execute(
                """
                INSERT INTO DISPONIBILIDAD_ESPECIAL_DOCTOR
                  (ID_DOCTOR, FECHA_INICIO, HORA_INICIO, HORA_FIN, TIPO_RECURRENCIA, DESCRIPCION, ACTIVO)
                VALUES
                  (:id_doctor, TO_DATE(:fecha_inicio, 'YYYY-MM-DD'), :hora_inicio, :hora_fin,
                   :tipo_recurrencia, :descripcion, 'S')
                RETURNING ID_DISP_ESPECIAL INTO :id_out
                """,
                {
                    'id_doctor': id_doctor,
                    'fecha_inicio': data.fecha_inicio,
                    'hora_inicio': data.hora_inicio,
                    'hora_fin': data.hora_fin,
                    'tipo_recurrencia': data.tipo_recurrencia,
                    'descripcion': data.descripcion,
                    'id_out': id_var,
                },
            )
            new_id = id_var.getvalue()[0]
            conn.commit()
            cursor.execute(
                """
                SELECT ID_DISP_ESPECIAL, ID_DOCTOR,
                       TO_CHAR(FECHA_INICIO, 'YYYY-MM-DD') AS FECHA_INICIO,
                       HORA_INICIO, HORA_FIN, TIPO_RECURRENCIA, DESCRIPCION, ACTIVO,
                       TO_CHAR(FECHA_REGISTRO, 'YYYY-MM-DD') AS FECHA_REGISTRO
                  FROM DISPONIBILIDAD_ESPECIAL_DOCTOR
                 WHERE ID_DISP_ESPECIAL = :id_disp
                """,
                {'id_disp': new_id},
            )
            return _serialize(row_to_dict(cursor))
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception:
        logger.exception('Error al crear disponibilidad especial')
        raise InternalError('Error interno del servidor')


def eliminar_disponibilidad_especial(id_doctor: int, id_disp_especial: int, current_user: dict=None):
    """Eliminar (soft-delete) un slot de disponibilidad especial."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE DISPONIBILIDAD_ESPECIAL_DOCTOR SET ACTIVO = 'N' WHERE ID_DISP_ESPECIAL = :id_disp AND ID_DOCTOR = :id_doctor",
                {'id_disp': id_disp_especial, 'id_doctor': id_doctor},
            )
            if cursor.rowcount == 0:
                raise NotFoundError('Disponibilidad especial no encontrada')
            conn.commit()
            return {'message': 'Disponibilidad especial eliminada'}
    except (NotFoundError, ValidationError, ConflictError, InternalError):
        raise
    except Exception:
        logger.exception('Error al eliminar disponibilidad especial')
        raise InternalError('Error interno del servidor')


class OracleDoctoresRepository:
    def doctor_del_dia(self, current_user=None):
        return doctor_del_dia(current_user)

    def listar_doctores(self, current_user=None, limit=100, offset=0):
        return listar_doctores(current_user, limit, offset)

    def obtener_disponibilidad_semana(self, current_user=None, limit=500, offset=0):
        return obtener_disponibilidad_semana(current_user, limit, offset)

    def obtener_doctor(self, id_doctor, current_user=None):
        return obtener_doctor(id_doctor, current_user)

    def crear_doctor(self, data, current_user=None):
        return crear_doctor(data, current_user)

    def actualizar_doctor(self, id_doctor, data, current_user=None):
        return actualizar_doctor(id_doctor, data, current_user)

    def desactivar_doctor(self, id_doctor, current_user=None):
        return desactivar_doctor(id_doctor, current_user)

    def obtener_disponibilidad(self, id_doctor, current_user=None, limit=500, offset=0):
        return obtener_disponibilidad(id_doctor, current_user, limit, offset)

    def crear_disponibilidad(self, id_doctor, data, current_user=None):
        return crear_disponibilidad(id_doctor, data, current_user)

    def eliminar_disponibilidad(self, id_doctor, id_disponibilidad, current_user=None):
        return eliminar_disponibilidad(id_doctor, id_disponibilidad, current_user)

    def obtener_servicios_doctor(self, id_doctor, current_user=None):
        return obtener_servicios_doctor(id_doctor, current_user)

    def listar_disponibilidad_especial(self, id_doctor, current_user=None):
        return listar_disponibilidad_especial(id_doctor, current_user)

    def crear_disponibilidad_especial(self, id_doctor, data, current_user=None):
        return crear_disponibilidad_especial(id_doctor, data, current_user)

    def eliminar_disponibilidad_especial(self, id_doctor, id_disp_especial, current_user=None):
        return eliminar_disponibilidad_especial(id_doctor, id_disp_especial, current_user)

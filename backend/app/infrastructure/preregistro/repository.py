from __future__ import annotations

from datetime import datetime, date
import logging
import mimetypes
import os
import uuid
from pathlib import Path
from app.domain.preregistro.entities import UploadedFile
from app.domain.exceptions import NotFoundError, ValidationError
from typing import Optional

import oracledb

from app.core.config import settings
from app.infrastructure.persistence.oracle import get_db, rows_to_dicts, row_to_dict
from app.infrastructure.persistence.sp_helpers import make_number_list, sp_error_to_http
from app.infrastructure.privacy.crypto import encrypt, decrypt_row, PACIENTE_ENCRYPTED_FIELDS, encrypt_bytes, decrypt_bytes

_SP_PACIENTE_ERRORS = {
    20201: (400, None),
    20202: (400, None),
    20203: (400, None),
    20204: (409, None),
}
logger = logging.getLogger(__name__)
UPLOAD_DIR = Path(__file__).resolve().parents[3] / 'uploads' / 'documentos'
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _normalize_pagination(limit: int, offset: int) -> tuple[int, int]:
    safe_limit = max(1, min(int(limit or 100), 500))
    safe_offset = max(0, int(offset or 0))
    return safe_limit, safe_offset

def _serialize(row: dict) -> dict:
    result = {}
    for key, value in row.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, str):
            result[key] = value.strip()
        else:
            result[key] = value
    return result


def _resolve_usuario_registro_id(conn, current_user: dict | None) -> int:
    """Resolver un ID_USUARIO_REGISTRO existente para cumplir FK de DOCUMENTO_PACIENTE."""
    cursor = conn.cursor()

    candidato = (current_user or {}).get('id_usuario')
    try:
        candidato = int(candidato) if candidato is not None else None
    except (TypeError, ValueError):
        candidato = None

    if candidato is not None:
        cursor.execute(
            'SELECT ID_USUARIO FROM USUARIO_SISTEMA WHERE ID_USUARIO = :id',
            {'id': candidato},
        )
        row = cursor.fetchone()
        if row is not None:
            return int(row[0])

    correo = (current_user or {}).get('correo')
    if correo:
        cursor.execute(
            'SELECT ID_USUARIO FROM USUARIO_SISTEMA WHERE LOWER(CORREO) = LOWER(:correo)',
            {'correo': str(correo).strip()},
        )
        row = cursor.fetchone()
        if row is not None:
            return int(row[0])

    cursor.execute('SELECT MIN(ID_USUARIO) FROM USUARIO_SISTEMA')
    row = cursor.fetchone()
    fallback_id = int(row[0]) if row and row[0] is not None else None
    if fallback_id is not None:
        return fallback_id

    from app.domain.exceptions import InternalError
    raise InternalError('No existe un usuario válido para registrar la carga del documento')

_BASE_SQL = '\n    SELECT ID_PACIENTE, FOLIO, NOMBRE, APELLIDO_PATERNO, APELLIDO_MATERNO,\n           FECHA_NACIMIENTO, GENERO, CURP,\n           ESTADO_NACIMIENTO, HOSPITAL_NACIMIENTO, NOMBRE_PADRE_MADRE,\n           DIRECCION, COLONIA, CIUDAD, ESTADO, CODIGO_POSTAL,\n           TELEFONO_CASA, TELEFONO_CELULAR, CORREO_ELECTRONICO,\n           TIPO_CUOTA, NOTAS_ADICIONALES, PASO_ACTUAL, ESTATUS_REGISTRO,\n           FECHA_REGISTRO, EN_EMERGENCIA_AVISAR_A, TELEFONO_EMERGENCIA,\n           TIPO_SANGRE, USA_VALVULA\n    FROM PACIENTE\n'

def listar_preregistros(estatus: Optional[str]=None, current_user: dict=None, limit: int=100, offset: int=0):
    """Listar todos los pre-registros (pacientes pendientes de aprobación)."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    sql = _BASE_SQL + " WHERE ESTATUS_REGISTRO IN ('PENDIENTE', 'RECHAZADO')"
    params: dict = {}
    if estatus:
        sql = _BASE_SQL + ' WHERE ESTATUS_REGISTRO = :estatus'
        params['estatus'] = estatus
    sql += ' ORDER BY FECHA_REGISTRO DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY'
    params['offset'] = safe_offset
    params['limit'] = safe_limit
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = rows_to_dicts(cursor)
    return [_serialize(decrypt_row(r, PACIENTE_ENCRYPTED_FIELDS)) for r in rows]

def crear_preregistro(data):
    """Enviar un nuevo pre-registro vía SP_REGISTRAR_PACIENTE_COMPLETO."""
    if not data.tipos_espina:
        raise ValidationError('Debe especificar al menos un tipo de espina bífida')
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT NVL(MAX(TO_NUMBER(REGEXP_SUBSTR(FOLIO, '[0-9]+$'))), 0) + 1 "
            "FROM PACIENTE WHERE REGEXP_LIKE(FOLIO, '^PRE-[0-9]+')"
        )
        next_num = int(cursor.fetchone()[0])
        folio = f'PRE-{next_num:06d}'
        # Ensure uniqueness in case of gap/collision
        cursor.execute('SELECT COUNT(*) FROM PACIENTE WHERE FOLIO = :folio', {'folio': folio})
        if cursor.fetchone()[0] > 0:
            cursor.execute('SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE')
            folio = f'PRE-{int(cursor.fetchone()[0]):06d}'
        fecha_nac = datetime.strptime(str(data.fecha_nacimiento)[:10], '%Y-%m-%d') if data.fecha_nacimiento else None
        tipos_arr = make_number_list(conn, [int(t) for t in data.tipos_espina])
        id_out = cursor.var(int)
        try:
            cursor.callproc('SP_REGISTRAR_PACIENTE_COMPLETO', [
                folio,
                data.nombre,
                data.apellido_paterno,
                data.apellido_materno,
                encrypt(data.curp),
                data.genero,
                fecha_nac,
                encrypt(data.nombre_padre_madre),
                encrypt(data.direccion),
                data.colonia,
                data.ciudad,
                data.estado,
                data.codigo_postal,
                encrypt(data.telefono_casa),
                encrypt(data.telefono_celular),
                encrypt(data.correo_electronico),
                encrypt(data.en_emergencia_avisar_a),
                encrypt(data.telefono_emergencia),
                None,  # municipio_nacimiento
                data.estado_nacimiento,
                encrypt(data.hospital_nacimiento),
                encrypt(data.tipo_sangre),
                data.usa_valvula or 'N',
                encrypt(data.notas_adicionales),
                None,  # fecha_alta — no aplica a preregistro
                data.tipo_cuota,
                'PENDIENTE',
                None,  # id_usuario_registro — endpoint público
                tipos_arr,
                id_out,
            ])
        except oracledb.DatabaseError as exc:
            raise sp_error_to_http(exc, _SP_PACIENTE_ERRORS,
                                   default_detail='No se pudo registrar el pre-registro')
        new_id = id_out.getvalue()
        # El SP fuerza MEMBRESIA_ESTATUS='ACTIVO'; un preregistro pendiente
        # debe quedar INACTIVO hasta la aprobación.
        cursor.execute(
            "UPDATE PACIENTE SET MEMBRESIA_ESTATUS = 'INACTIVO' WHERE ID_PACIENTE = :id",
            {'id': new_id},
        )
        # Ajustar PASO_ACTUAL que el SP fija a 1
        if data.paso_actual and data.paso_actual != 1:
            cursor.execute(
                "UPDATE PACIENTE SET PASO_ACTUAL = :paso WHERE ID_PACIENTE = :id",
                {'paso': data.paso_actual, 'id': new_id},
            )
        conn.commit()
    return _fetch_preregistro(new_id)

def _fetch_preregistro(id_paciente: int) -> dict:
    sql = _BASE_SQL + ' WHERE ID_PACIENTE = :id'
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, {'id': id_paciente})
        row = row_to_dict(cursor)
    if not row:
        raise NotFoundError('Pre-registro no encontrado')
    return _serialize(decrypt_row(row, PACIENTE_ENCRYPTED_FIELDS))

def listar_tipos_espina_publico():
    """Listar tipos de espina bífida (endpoint público para pre-registro)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TIPO_ESPINA, NOMBRE, DESCRIPCION FROM TIPO_ESPINA_BIFIDA WHERE ACTIVO = 'S' ORDER BY ID_TIPO_ESPINA")
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def listar_tipos_documento_publico():
    """Listar tipos de documento (endpoint público para pre-registro)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_TIPO_DOCUMENTO, NOMBRE, DESCRIPCION FROM TIPO_DOCUMENTO WHERE ACTIVO = 'S' ORDER BY ID_TIPO_DOCUMENTO")
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_preregistro(id_paciente: int):
    """Obtener detalle de un pre-registro."""
    return _fetch_preregistro(id_paciente)

def actualizar_preregistro(id_paciente: int, data):
    """Actualizar un pre-registro existente (formulario multi-paso)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT ID_PACIENTE FROM PACIENTE WHERE ID_PACIENTE = :id AND ESTATUS_REGISTRO = 'PENDIENTE'", {'id': id_paciente})
        if cursor.fetchone() is None:
            raise NotFoundError('Pre-registro no encontrado')
        cursor.execute("UPDATE PACIENTE SET\n                NOMBRE = :nombre, APELLIDO_PATERNO = :ap, APELLIDO_MATERNO = :am,\n                FECHA_NACIMIENTO = TO_DATE(:fecha_nac, 'YYYY-MM-DD'),\n                GENERO = :genero, CURP = :curp,\n                ESTADO_NACIMIENTO = :estado_nac, HOSPITAL_NACIMIENTO = :hospital,\n                NOMBRE_PADRE_MADRE = :padre_madre,\n                DIRECCION = :direccion, COLONIA = :colonia, CIUDAD = :ciudad,\n                ESTADO = :estado, CODIGO_POSTAL = :cp,\n                TELEFONO_CASA = :tel_casa, TELEFONO_CELULAR = :tel_cel,\n                CORREO_ELECTRONICO = :correo,\n                EN_EMERGENCIA_AVISAR_A = :emergencia_avisar,\n                TELEFONO_EMERGENCIA = :tel_emergencia,\n                TIPO_SANGRE = :tipo_sangre, USA_VALVULA = :usa_valvula,\n                TIPO_CUOTA = :tipo_cuota, NOTAS_ADICIONALES = :notas,\n                PASO_ACTUAL = :paso\n               WHERE ID_PACIENTE = :id", {'nombre': data.nombre, 'ap': data.apellido_paterno, 'am': data.apellido_materno, 'fecha_nac': data.fecha_nacimiento, 'genero': data.genero, 'curp': encrypt(data.curp), 'estado_nac': data.estado_nacimiento, 'hospital': encrypt(data.hospital_nacimiento), 'padre_madre': encrypt(data.nombre_padre_madre), 'direccion': encrypt(data.direccion), 'colonia': data.colonia, 'ciudad': data.ciudad, 'estado': data.estado, 'cp': data.codigo_postal, 'tel_casa': encrypt(data.telefono_casa), 'tel_cel': encrypt(data.telefono_celular), 'correo': encrypt(data.correo_electronico), 'emergencia_avisar': encrypt(data.en_emergencia_avisar_a), 'tel_emergencia': encrypt(data.telefono_emergencia), 'tipo_sangre': encrypt(data.tipo_sangre), 'usa_valvula': data.usa_valvula or 'N', 'tipo_cuota': data.tipo_cuota, 'notas': encrypt(data.notas_adicionales), 'paso': data.paso_actual or 1, 'id': id_paciente})
        if data.tipos_espina is not None:
            cursor.execute('DELETE FROM PACIENTE_TIPO_ESPINA WHERE ID_PACIENTE = :id', {'id': id_paciente})
            for tid in data.tipos_espina:
                cursor.execute('INSERT INTO PACIENTE_TIPO_ESPINA (ID_PACIENTE, ID_TIPO_ESPINA, FECHA_REGISTRO) VALUES (:id_pac, :id_tipo, SYSDATE)', {'id_pac': id_paciente, 'id_tipo': tid})
        conn.commit()
    return _fetch_preregistro(id_paciente)

def aprobar_preregistro(id_paciente: int, tipo_cuota: str = None, current_user: dict = None):
    """Aprobar un pre-registro y convertirlo en beneficiario aprobado."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ESTATUS_REGISTRO FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        row = cursor.fetchone()
        if row is None:
            raise NotFoundError('Pre-registro no encontrado')
        estatus = row[0].strip() if row[0] else None
        if estatus == 'APROBADO':
            raise ValidationError('Este pre-registro ya fue aprobado')
        if estatus != 'PENDIENTE':
            raise ValidationError('Solo se pueden aprobar pre-registros pendientes')
        cursor.execute('SELECT NVL(MAX(ID_PACIENTE), 0) + 1 FROM PACIENTE')
        folio_num = cursor.fetchone()[0]
        new_folio = f'BEN-{folio_num:06d}'
        base_sql = (
            "UPDATE PACIENTE SET"
            "  ESTATUS_REGISTRO = 'APROBADO',"
            "  FOLIO = :folio,"
            "  MEMBRESIA_ESTATUS = 'ACTIVO',"
            "  FECHA_ALTA = SYSDATE,"
            "  FECHA_INICIO_MEMBRESIA = TRUNC(SYSDATE),"
            "  FECHA_VENCIMIENTO_MEMBRESIA = ADD_MONTHS(TRUNC(SYSDATE), 12)"
        )
        params = {'folio': new_folio, 'id': id_paciente}
        if tipo_cuota:
            base_sql += ", TIPO_CUOTA = :tipo_cuota"
            params['tipo_cuota'] = tipo_cuota
        base_sql += " WHERE ID_PACIENTE = :id"
        cursor.execute(base_sql, params)
        conn.commit()
    preregistro = _fetch_preregistro(id_paciente)
    return {'message': 'Pre-registro aprobado exitosamente', 'preregistro': preregistro}

async def subir_documento(
    id_paciente: int,
    id_tipo_documento: int,
    archivo: UploadedFile,
    current_user: dict | None = None,
):
    """Subir un documento para un pre-registro."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ID_PACIENTE FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        if cursor.fetchone() is None:
            raise NotFoundError('Pre-registro no encontrado')
    original_name = archivo.filename or ''
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError(f"Tipo de archivo no permitido. Extensiones válidas: {', '.join(settings.ALLOWED_UPLOAD_EXTENSIONS)}")
    content = archivo.content
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise ValidationError(f'El archivo excede el tamaño máximo permitido ({settings.MAX_UPLOAD_SIZE // (1024 * 1024)} MB)')
    allowed_content_types = {'.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'], '.doc': ['application/msword'], '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
    if archivo.content_type and ext in allowed_content_types:
        if archivo.content_type not in allowed_content_types[ext]:
            raise ValidationError('El tipo de contenido del archivo no coincide con la extensión')
    unique_name = f'{id_paciente}_{uuid.uuid4().hex}{ext}'
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, 'wb') as f:
        f.write(encrypt_bytes(content))
    with get_db() as conn:
        cursor = conn.cursor()
        id_usuario = _resolve_usuario_registro_id(conn, current_user)
        id_var = cursor.var(int)
        cursor.execute(
            "INSERT INTO DOCUMENTO_PACIENTE\n"
            "       (ID_PACIENTE, ID_TIPO_DOCUMENTO, NOMBRE_ARCHIVO, RUTA_ARCHIVO, FORMATO_ARCHIVO,\n"
            "        ID_USUARIO_REGISTRO, ACTIVO, FECHA_CARGA)\n"
            "VALUES (:id_pac, :id_tipo, :nombre, :ruta, :formato, :id_usr, 'S', SYSDATE)\n"
            "RETURNING ID_DOCUMENTO INTO :id_out",
            {
                'id_pac': id_paciente,
                'id_tipo': id_tipo_documento,
                'nombre': archivo.filename,
                'ruta': unique_name,
                'formato': ext.lstrip('.').upper() if ext else 'OTRO',
                'id_usr': id_usuario,
                'id_out': id_var,
            },
        )
        new_id = id_var.getvalue()[0]
        conn.commit()
    return {'id_documento': new_id, 'nombre_archivo': archivo.filename, 'formato': ext.lstrip('.').upper() if ext else 'OTRO'}

def listar_documentos(id_paciente: int, limit: int=100, offset: int=0):
    """Listar documentos de un pre-registro."""
    safe_limit, safe_offset = _normalize_pagination(limit, offset)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT dp.ID_DOCUMENTO, dp.ID_TIPO_DOCUMENTO, td.NOMBRE AS TIPO_NOMBRE,\n"
            "       dp.NOMBRE_ARCHIVO, dp.FORMATO_ARCHIVO, dp.FECHA_CARGA\n"
            "  FROM DOCUMENTO_PACIENTE dp\n"
            "  LEFT JOIN TIPO_DOCUMENTO td ON td.ID_TIPO_DOCUMENTO = dp.ID_TIPO_DOCUMENTO\n"
            " WHERE dp.ID_PACIENTE = :id AND dp.ACTIVO = 'S'\n"
            " ORDER BY dp.FECHA_CARGA DESC\n"
            " OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY",
            {'id': id_paciente, 'offset': safe_offset, 'limit': safe_limit},
        )
        rows = rows_to_dicts(cursor)
    return [_serialize(r) for r in rows]

def obtener_documento_archivo(id_paciente: int, id_documento: int):
    """Leer y desencriptar el archivo físico de un documento activo."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT RUTA_ARCHIVO, NOMBRE_ARCHIVO "
            "FROM DOCUMENTO_PACIENTE "
            "WHERE ID_DOCUMENTO = :id_doc AND ID_PACIENTE = :id_pac AND ACTIVO = 'S'",
            {'id_doc': id_documento, 'id_pac': id_paciente},
        )
        row = row_to_dict(cursor)

    if not row:
        raise NotFoundError('Documento no encontrado')

    ruta_archivo = (row.get('ruta_archivo') or '').strip()
    if not ruta_archivo:
        raise NotFoundError('Documento sin archivo asociado')

    file_path = (UPLOAD_DIR / os.path.basename(ruta_archivo)).resolve()
    if not file_path.exists() or not file_path.is_file():
        raise NotFoundError('Archivo no encontrado en almacenamiento')

    with open(file_path, 'rb') as f:
        raw = f.read()
    content = decrypt_bytes(raw)

    filename = row.get('nombre_archivo') or file_path.name
    content_type, _ = mimetypes.guess_type(filename)
    return UploadedFile(
        filename=filename,
        content=content,
        content_type=content_type or 'application/octet-stream',
    )

def eliminar_documento(id_paciente: int, id_documento: int):
    """Eliminar (soft delete) un documento."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE DOCUMENTO_PACIENTE SET ACTIVO = 'N' WHERE ID_DOCUMENTO = :id_doc AND ID_PACIENTE = :id_pac", {'id_doc': id_documento, 'id_pac': id_paciente})
        if cursor.rowcount == 0:
            raise NotFoundError('Documento no encontrado')
        conn.commit()
    return {'message': 'Documento eliminado correctamente'}

def rechazar_preregistro(id_paciente: int, current_user: dict=None):
    """Rechazar un pre-registro."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT ESTATUS_REGISTRO FROM PACIENTE WHERE ID_PACIENTE = :id', {'id': id_paciente})
        row = cursor.fetchone()
        if row is None:
            raise NotFoundError('Pre-registro no encontrado')
        cursor.execute("UPDATE PACIENTE SET ESTATUS_REGISTRO = 'RECHAZADO' WHERE ID_PACIENTE = :id", {'id': id_paciente})
        conn.commit()
    preregistro = _fetch_preregistro(id_paciente)
    return {'message': 'Pre-registro rechazado', 'preregistro': preregistro}


class OraclePreregistroRepository:
    def listar_preregistros(self, estatus=None, current_user=None, limit=100, offset=0):
        return listar_preregistros(estatus, current_user, limit, offset)

    def crear_preregistro(self, data):
        return crear_preregistro(data)

    def listar_tipos_espina_publico(self):
        return listar_tipos_espina_publico()

    def listar_tipos_documento_publico(self):
        return listar_tipos_documento_publico()

    def obtener_preregistro(self, id_paciente):
        return obtener_preregistro(id_paciente)

    def actualizar_preregistro(self, id_paciente, data):
        return actualizar_preregistro(id_paciente, data)

    def aprobar_preregistro(self, id_paciente, tipo_cuota=None, current_user=None):
        return aprobar_preregistro(id_paciente, tipo_cuota, current_user)

    async def subir_documento(self, id_paciente, id_tipo_documento, archivo, current_user=None):
        return await subir_documento(id_paciente, id_tipo_documento, archivo, current_user)

    def listar_documentos(self, id_paciente, limit=100, offset=0):
        return listar_documentos(id_paciente, limit, offset)

    def obtener_documento_archivo(self, id_paciente, id_documento):
        return obtener_documento_archivo(id_paciente, id_documento)

    def eliminar_documento(self, id_paciente, id_documento):
        return eliminar_documento(id_paciente, id_documento)

    def rechazar_preregistro(self, id_paciente, current_user=None):
        return rechazar_preregistro(id_paciente, current_user)

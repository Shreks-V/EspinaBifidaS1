import logging

logger = logging.getLogger(__name__)


def registrar_bitacora(
    conn,
    tabla_afectada: str,
    id_registro: int,
    campo_modificado: str,
    valor_anterior: str | None,
    valor_nuevo: str | None,
    tipo_operacion: str,
    id_usuario: int,
    observaciones: str | None = None,
):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO BITACORA_CAMBIOS (
            TABLA_AFECTADA, ID_REGISTRO_AFECTADO, CAMPO_MODIFICADO,
            VALOR_ANTERIOR, VALOR_NUEVO, TIPO_OPERACION,
            ID_USUARIO, FECHA_CAMBIO, OBSERVACIONES
        ) VALUES (
            :tabla, :id_reg, :campo,
            :val_ant, :val_new, :tipo,
            :id_usr, SYSTIMESTAMP, :obs
        )
        """,
        {
            "tabla": tabla_afectada,
            "id_reg": id_registro,
            "campo": campo_modificado,
            "val_ant": str(valor_anterior)[:1000] if valor_anterior is not None else None,
            "val_new": str(valor_nuevo)[:1000] if valor_nuevo is not None else None,
            "tipo": tipo_operacion,
            "id_usr": id_usuario,
            "obs": observaciones,
        },
    )


def log_insert(conn, tabla: str, id_registro: int, id_usuario: int, obs: str | None = None):
    registrar_bitacora(conn, tabla, id_registro, "*", None, "NUEVO REGISTRO", "INSERT", id_usuario, obs)


def log_update(conn, tabla: str, id_registro: int, campo: str, val_ant, val_new, id_usuario: int, obs: str | None = None):
    if str(val_ant) != str(val_new):
        registrar_bitacora(conn, tabla, id_registro, campo, val_ant, val_new, "UPDATE", id_usuario, obs)


def log_delete(conn, tabla: str, id_registro: int, id_usuario: int, obs: str | None = None):
    registrar_bitacora(conn, tabla, id_registro, "ACTIVO", "S", "N", "DELETE", id_usuario, obs)


def log_cancelacion(conn, tabla: str, id_registro: int, id_usuario: int, motivo: str | None = None):
    registrar_bitacora(conn, tabla, id_registro, "CANCELADA/ESTATUS", None, "CANCELADO", "CANCELACION", id_usuario, motivo)

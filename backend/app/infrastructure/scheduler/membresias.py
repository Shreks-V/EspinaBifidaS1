import logging
import threading
import time

logger = logging.getLogger(__name__)

_INTERVAL_SECONDS = 86400  # 24 hours


def _expire_membresias() -> None:
    try:
        from app.infrastructure.persistence.oracle import get_db
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE PACIENTE "
                "SET MEMBRESIA_ESTATUS = 'INACTIVO' "
                "WHERE MEMBRESIA_ESTATUS = 'ACTIVO' "
                "AND FECHA_VENCIMIENTO_MEMBRESIA IS NOT NULL "
                "AND FECHA_VENCIMIENTO_MEMBRESIA < TRUNC(SYSDATE)"
            )
            rows = cursor.rowcount
            conn.commit()
            if rows:
                logger.info("Scheduler: %d membresías marcadas como INACTIVO por vencimiento", rows)
    except Exception:
        logger.exception("Scheduler: error al expirar membresías vencidas")


def _run() -> None:
    while True:
        _expire_membresias()
        time.sleep(_INTERVAL_SECONDS)


def start_expiry_scheduler() -> None:
    t = threading.Thread(target=_run, daemon=True, name="membresia-expiry")
    t.start()
    logger.info("Scheduler de expiración de membresías iniciado")

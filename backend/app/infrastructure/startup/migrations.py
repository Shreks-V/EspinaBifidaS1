import logging

from app.infrastructure.persistence.oracle import get_db

logger = logging.getLogger(__name__)


def run_startup_migrations() -> None:
    """Run lightweight DDL migrations on startup (idempotent)."""
    migrations = [
        "ALTER TABLE DISPONIBILIDAD_DOCTOR ADD (DIA_SEMANA NUMBER(1))",
        "ALTER TABLE EXISTENCIA_PRODUCTO ADD (FECHA_CADUCIDAD DATE)",
        """
        DECLARE
          v_year        VARCHAR2(4) := TO_CHAR(SYSDATE, 'YYYY');
          v_max_seq     NUMBER := 0;
          v_next_seq    NUMBER := 0;
          v_delta       NUMBER := 0;
        BEGIN
          SELECT NVL(MAX(
                   CASE
                     WHEN REGEXP_LIKE(FOLIO_VENTA, '^VTA-' || v_year || '-[0-9]+$')
                     THEN TO_NUMBER(REGEXP_SUBSTR(FOLIO_VENTA, '[0-9]+$'))
                   END
                 ), 0)
            INTO v_max_seq
            FROM VENTA
           WHERE FOLIO_VENTA LIKE 'VTA-' || v_year || '-%';

          SELECT SEQ_VENTA_FOLIO.NEXTVAL
            INTO v_next_seq
            FROM DUAL;

          IF v_next_seq < v_max_seq THEN
            v_delta := v_max_seq - v_next_seq;
            EXECUTE IMMEDIATE 'ALTER SEQUENCE SEQ_VENTA_FOLIO INCREMENT BY ' || v_delta;
            SELECT SEQ_VENTA_FOLIO.NEXTVAL
              INTO v_next_seq
              FROM DUAL;
            EXECUTE IMMEDIATE 'ALTER SEQUENCE SEQ_VENTA_FOLIO INCREMENT BY 1';
          END IF;
        END;
        """,
    ]
    with get_db() as conn:
        cur = conn.cursor()
        for ddl in migrations:
            try:
                cur.execute(ddl)
                conn.commit()
                logger.info("Migration OK: %s", ddl[:60])
            except Exception:
                continue

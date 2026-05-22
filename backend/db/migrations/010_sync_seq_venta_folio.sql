-- ============================================================================
-- Migration 010 — Resincroniza SEQ_VENTA_FOLIO con folios existentes
-- Fecha: 2026-04-14
--
-- Si existen ventas importadas o creadas manualmente con folios VTA-YYYY-NNN,
-- la secuencia puede quedarse atras y provocar ORA-00001 sobre UQ_VENTA_FOLIO.
-- Este bloque adelanta SEQ_VENTA_FOLIO para que el siguiente NEXTVAL quede por
-- encima del mayor sufijo existente del anio actual.
-- ============================================================================

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
/

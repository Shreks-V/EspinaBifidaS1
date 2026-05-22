-- ============================================================================
-- Migration 008 — TRG_VENTA_FOLIO_BI usa prefijo VTA-YYYY-NNN
-- Fecha: 2026-04-14
--
-- Los folios existentes en VENTA usan el formato 'VTA-YYYY-XXX' (3 dígitos),
-- ej. VTA-2026-022. Alineamos el trigger para continuar ese formato con
-- SEQ_VENTA_FOLIO.NEXTVAL en lugar del provisional 'REC-YYYY-NNNNNN'.
-- ============================================================================

CREATE OR REPLACE TRIGGER TRG_VENTA_FOLIO_BI
BEFORE INSERT ON VENTA
FOR EACH ROW
BEGIN
  IF :NEW.FOLIO_VENTA IS NULL THEN
    :NEW.FOLIO_VENTA := 'VTA-' || TO_CHAR(SYSDATE, 'YYYY') || '-' ||
                        LPAD(SEQ_VENTA_FOLIO.NEXTVAL, 3, '0');
  END IF;
END;
/

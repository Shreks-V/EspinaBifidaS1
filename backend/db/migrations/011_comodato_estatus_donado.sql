-- Add 'DONADO' to COMODATO.ESTATUS allowed values.
-- Idempotent: drops the constraint by its system name via a loop.

DECLARE
  v_count NUMBER;
BEGIN
  FOR c IN (
    SELECT constraint_name
      FROM user_constraints
     WHERE table_name = 'COMODATO'
       AND constraint_type = 'C'
       AND search_condition_vc LIKE '%PRESTADO%'
  ) LOOP
    EXECUTE IMMEDIATE 'ALTER TABLE COMODATO DROP CONSTRAINT ' || c.constraint_name;
  END LOOP;
END;
/

ALTER TABLE COMODATO
  ADD CONSTRAINT CHK_COMODATO_ESTATUS
  CHECK (ESTATUS IN ('PRESTADO','DEVUELTO','CANCELADO','DONADO'));

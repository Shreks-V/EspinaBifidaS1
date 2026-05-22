-- Add 'PENDIENTE' payment method for deferred/loan payments.
-- Idempotent: only inserts if not already present.

BEGIN
  INSERT INTO METODO_PAGO (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
  SELECT 5, 'PENDIENTE', 'Pago pendiente / prestamo', 'S'
    FROM DUAL
   WHERE NOT EXISTS (
     SELECT 1 FROM METODO_PAGO WHERE UPPER(NOMBRE) = 'PENDIENTE'
   );
  COMMIT;
END;
/

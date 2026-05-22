-- Migration 017: Add EN_CURSO to CHK_CITA_ESTATUS check constraint
-- The original constraint only allowed PROGRAMADA, COMPLETADA, CANCELADA.
-- EN_CURSO is needed for the "Atender Ahora" / "Iniciar" flow in the dashboard.

ALTER TABLE CITA DROP CONSTRAINT CHK_CITA_ESTATUS;

ALTER TABLE CITA ADD CONSTRAINT CHK_CITA_ESTATUS
    CHECK (ESTATUS IN ('PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'));

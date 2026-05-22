-- ============================================================================
-- Migration 007 — ampliar CHK_BITACORA_OPERACION
-- Fecha: 2026-04-14
--
-- SP_REGISTRAR_LOGIN_USUARIO y TRG_BITACORA_USUARIO_AIUD escriben entradas
-- con TIPO_OPERACION = 'LOGIN_OK' o 'LOGIN_FAIL', que el constraint original
-- no aceptaba. Agregamos esos dos valores al check.
-- ============================================================================

ALTER TABLE BITACORA_CAMBIOS DROP CONSTRAINT CHK_BITACORA_OPERACION;

ALTER TABLE BITACORA_CAMBIOS ADD CONSTRAINT CHK_BITACORA_OPERACION
  CHECK (TIPO_OPERACION IN (
    'INSERT','UPDATE','DELETE','CANCELACION','RESTORE','LOGIN_OK','LOGIN_FAIL'
  ));

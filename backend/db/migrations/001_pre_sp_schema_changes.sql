-- ============================================================================
-- Migration 001 — Pre-SP schema changes
-- Fecha: 2026-04-14
-- Objetivo: preparar el schema para los SPs/triggers del sprint de PL/SQL.
--   1. MOVIMIENTO_INVENTARIO.ID_VENTA → nullable (permite ajustes/entradas
--      manuales que no vienen de una venta).
--   2. USUARIO_SISTEMA.FECHA_ULTIMO_LOGIN → tracking de último login.
--   3. DETALLE_CITA_SERVICIO.ID_DOCTOR + FK → doctor asignado por servicio
--      dentro de una cita.
--   4. SEQ_VENTA_FOLIO → secuencia usada por TRG_VENTA_FOLIO_BI.
-- ============================================================================

-- 1. MOVIMIENTO_INVENTARIO.ID_VENTA → NULLABLE
ALTER TABLE MOVIMIENTO_INVENTARIO MODIFY (ID_VENTA NUMBER NULL);

-- 2. USUARIO_SISTEMA.FECHA_ULTIMO_LOGIN
ALTER TABLE USUARIO_SISTEMA ADD (FECHA_ULTIMO_LOGIN TIMESTAMP NULL);

-- 3. DETALLE_CITA_SERVICIO.ID_DOCTOR + FK
ALTER TABLE DETALLE_CITA_SERVICIO ADD (ID_DOCTOR NUMBER NULL);
ALTER TABLE DETALLE_CITA_SERVICIO
  ADD CONSTRAINT FK_DETCITA_DOCTOR
  FOREIGN KEY (ID_DOCTOR) REFERENCES DOCTOR(ID_DOCTOR);

-- 4. Secuencia para el folio de VENTA
CREATE SEQUENCE SEQ_VENTA_FOLIO
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;

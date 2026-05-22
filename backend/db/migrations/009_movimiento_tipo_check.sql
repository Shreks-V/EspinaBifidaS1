-- ============================================================================
-- Migration 009 — ampliar CHK_MOVIMIENTO_TIPO
-- Fecha: 2026-04-14
--
-- SP_REGISTRAR_MOVIMIENTO_STOCK usa tipos ENTRADA, SALIDA_VENTA, SALIDA_MERMA,
-- AJUSTE_POS, AJUSTE_NEG. La tabla original sólo aceptaba ENTRADA_COMPRA /
-- ENTRADA_DONACION / SALIDA_COMODATO / DEVOLUCION_COMODATO / MERMA / CADUCIDAD /
-- SALIDA_VENTA / AJUSTE. Unificamos el check para aceptar ambos vocabularios.
-- ============================================================================

ALTER TABLE MOVIMIENTO_INVENTARIO DROP CONSTRAINT CHK_MOVIMIENTO_TIPO;

ALTER TABLE MOVIMIENTO_INVENTARIO ADD CONSTRAINT CHK_MOVIMIENTO_TIPO
  CHECK (TIPO_MOVIMIENTO IN (
    'ENTRADA_COMPRA',
    'ENTRADA_DONACION',
    'SALIDA_VENTA',
    'SALIDA_COMODATO',
    'DEVOLUCION_COMODATO',
    'MERMA',
    'CADUCIDAD',
    'AJUSTE',
    'ENTRADA',
    'SALIDA_MERMA',
    'AJUSTE_POS',
    'AJUSTE_NEG'
  ));

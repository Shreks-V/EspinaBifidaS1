-- ============================================================================
-- Migration 014 — SP_REGISTRAR_MOVIMIENTO_STOCK: añadir SALIDA_COMODATO y
--                 DEVOLUCION_COMODATO como tipos válidos
-- Fecha: 2026-04-16
--
-- El constraint CHK_MOVIMIENTO_TIPO (migration 009) ya incluye SALIDA_COMODATO
-- y DEVOLUCION_COMODATO, pero el SP sólo aceptaba 5 tipos y usaba SALIDA_MERMA
-- como proxy para préstamos. Esto generaba historial de inventario incorrecto.
-- ============================================================================

CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MOVIMIENTO_STOCK (
  p_id_producto    IN NUMBER,
  p_tipo           IN VARCHAR2,  -- ENTRADA | SALIDA_VENTA | SALIDA_COMODATO |
                                 -- DEVOLUCION_COMODATO | SALIDA_MERMA |
                                 -- AJUSTE_POS | AJUSTE_NEG
  p_cantidad       IN NUMBER,    -- siempre positivo
  p_id_usuario     IN NUMBER,
  p_id_venta       IN NUMBER   DEFAULT NULL,
  p_id_comodato    IN NUMBER   DEFAULT NULL,
  p_observaciones  IN VARCHAR2 DEFAULT NULL
)
AS
  v_stock NUMBER;
  v_delta NUMBER;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE_APPLICATION_ERROR(-20501, 'La cantidad debe ser un entero positivo.');
  END IF;

  IF p_tipo NOT IN (
      'ENTRADA', 'SALIDA_VENTA', 'SALIDA_COMODATO',
      'DEVOLUCION_COMODATO', 'SALIDA_MERMA', 'AJUSTE_POS', 'AJUSTE_NEG'
  ) THEN
    RAISE_APPLICATION_ERROR(-20502,
      'Tipo de movimiento invalido. Usa ENTRADA, SALIDA_VENTA, SALIDA_COMODATO, '
      || 'DEVOLUCION_COMODATO, SALIDA_MERMA, AJUSTE_POS o AJUSTE_NEG.');
  END IF;

  IF p_tipo = 'SALIDA_VENTA' AND p_id_venta IS NULL THEN
    RAISE_APPLICATION_ERROR(-20503, 'SALIDA_VENTA requiere id_venta.');
  END IF;

  IF p_tipo = 'SALIDA_COMODATO' AND p_id_comodato IS NULL THEN
    RAISE_APPLICATION_ERROR(-20503, 'SALIDA_COMODATO requiere id_comodato.');
  END IF;

  IF p_tipo = 'DEVOLUCION_COMODATO' AND p_id_comodato IS NULL THEN
    RAISE_APPLICATION_ERROR(-20503, 'DEVOLUCION_COMODATO requiere id_comodato.');
  END IF;

  BEGIN
    SELECT CANTIDAD_DISPONIBLE INTO v_stock
    FROM EXISTENCIA_PRODUCTO
    WHERE ID_PRODUCTO = p_id_producto
    FOR UPDATE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20504,
        'El producto no tiene registro de existencia.');
  END;

  -- Salidas (decremento): SALIDA_VENTA, SALIDA_COMODATO, SALIDA_MERMA, AJUSTE_NEG
  -- Entradas (incremento): ENTRADA, DEVOLUCION_COMODATO, AJUSTE_POS
  IF p_tipo IN ('SALIDA_VENTA', 'SALIDA_COMODATO', 'SALIDA_MERMA', 'AJUSTE_NEG') THEN
    v_delta := -p_cantidad;
  ELSE
    v_delta := p_cantidad;
  END IF;

  IF v_stock + v_delta < 0 THEN
    RAISE_APPLICATION_ERROR(-20505,
      'Stock insuficiente. Disponible: ' || v_stock || ', solicitado: ' || p_cantidad || '.');
  END IF;

  UPDATE EXISTENCIA_PRODUCTO
     SET CANTIDAD_DISPONIBLE = CANTIDAD_DISPONIBLE + v_delta
   WHERE ID_PRODUCTO = p_id_producto;

  INSERT INTO MOVIMIENTO_INVENTARIO (
    ID_PRODUCTO, ID_USUARIO_REGISTRO, ID_VENTA, ID_COMODATO,
    TIPO_MOVIMIENTO, CANTIDAD, OBSERVACIONES
  ) VALUES (
    p_id_producto, p_id_usuario, p_id_venta, p_id_comodato,
    p_tipo, p_cantidad, p_observaciones
  );
END SP_REGISTRAR_MOVIMIENTO_STOCK;
/

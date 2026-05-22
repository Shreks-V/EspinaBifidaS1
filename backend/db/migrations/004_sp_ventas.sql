-- ============================================================================
-- Migration 004 — Stored Procedures: módulo VENTAS
-- Fecha: 2026-04-14
--
--   1. SP_REGISTRAR_VENTA_COMPLETA — inserta VENTA (el folio lo pone
--      TRG_VENTA_FOLIO_BI), los VENTA_METODO_PAGO y descuenta stock
--      llamando a SP_REGISTRAR_MOVIMIENTO_STOCK por cada producto.
--      Calcula MONTO_PAGADO y SALDO_PENDIENTE a partir de la suma de pagos.
--   2. SP_REGISTRAR_PAGO_PARCIAL — agrega un pago a una venta existente,
--      recalcula MONTO_PAGADO y SALDO_PENDIENTE.
--
-- NOTA: VENTA no tiene columna ESTATUS. El estado se infiere de
--       SALDO_PENDIENTE (0 = pagada, >0 = con saldo) y del flag CANCELADA.
--
-- Convención de errores: -20400..-20499.
-- ============================================================================

CREATE OR REPLACE PROCEDURE SP_REGISTRAR_VENTA_COMPLETA (
  p_id_paciente         IN  NUMBER,
  p_id_usuario_registro IN  NUMBER,
  p_monto_total         IN  NUMBER,
  p_exento_pago         IN  CHAR DEFAULT 'N',
  -- Líneas de productos (alineadas por índice). Entradas NULL en p_productos
  -- significan "línea de solo servicio" y no descuentan stock.
  p_productos           IN  SYS.ODCINUMBERLIST,
  p_cantidades          IN  SYS.ODCINUMBERLIST,
  -- Métodos de pago (alineados por índice)
  p_metodos_pago        IN  SYS.ODCINUMBERLIST,
  p_montos_pago         IN  SYS.ODCINUMBERLIST,
  p_id_venta_out        OUT NUMBER,
  p_folio_out           OUT VARCHAR2
)
AS
  v_total_pagado NUMBER := 0;
  v_saldo        NUMBER;
  v_id_prod      NUMBER;
  v_cant         NUMBER;
BEGIN
  IF p_monto_total IS NULL OR p_monto_total < 0 THEN
    RAISE_APPLICATION_ERROR(-20401, 'Monto total invalido.');
  END IF;

  IF p_productos.COUNT <> p_cantidades.COUNT THEN
    RAISE_APPLICATION_ERROR(-20402,
      'Arrays de productos y cantidades desalineados.');
  END IF;

  IF p_metodos_pago.COUNT <> p_montos_pago.COUNT THEN
    RAISE_APPLICATION_ERROR(-20403,
      'Arrays de metodos de pago y montos desalineados.');
  END IF;

  FOR i IN 1 .. p_montos_pago.COUNT LOOP
    IF p_montos_pago(i) IS NULL OR p_montos_pago(i) < 0 THEN
      RAISE_APPLICATION_ERROR(-20404, 'Monto de pago invalido en linea ' || i || '.');
    END IF;
    v_total_pagado := v_total_pagado + p_montos_pago(i);
  END LOOP;

  IF v_total_pagado > p_monto_total AND NVL(p_exento_pago, 'N') <> 'S' THEN
    RAISE_APPLICATION_ERROR(-20405, 'La suma de pagos excede el monto total.');
  END IF;

  v_saldo := p_monto_total - v_total_pagado;
  IF NVL(p_exento_pago, 'N') = 'S' THEN
    v_saldo := 0;
    v_total_pagado := p_monto_total;
  END IF;

  INSERT INTO VENTA (
    ID_PACIENTE, ID_USUARIO_REGISTRO, FOLIO_VENTA,
    MONTO_TOTAL, MONTO_PAGADO, SALDO_PENDIENTE,
    EXENTO_PAGO, CANCELADA
  ) VALUES (
    p_id_paciente, p_id_usuario_registro, NULL,
    p_monto_total, v_total_pagado, v_saldo,
    NVL(p_exento_pago, 'N'), 'N'
  )
  RETURNING ID_VENTA, FOLIO_VENTA INTO p_id_venta_out, p_folio_out;

  FOR i IN 1 .. p_metodos_pago.COUNT LOOP
    INSERT INTO VENTA_METODO_PAGO (
      ID_VENTA, ID_METODO_PAGO, MONTO
    ) VALUES (
      p_id_venta_out, p_metodos_pago(i), p_montos_pago(i)
    );
  END LOOP;

  FOR i IN 1 .. p_productos.COUNT LOOP
    v_id_prod := p_productos(i);
    v_cant    := p_cantidades(i);
    IF v_id_prod IS NOT NULL AND v_cant IS NOT NULL AND v_cant > 0 THEN
      SP_REGISTRAR_MOVIMIENTO_STOCK(
        p_id_producto   => v_id_prod,
        p_tipo          => 'SALIDA_VENTA',
        p_cantidad      => v_cant,
        p_id_usuario    => p_id_usuario_registro,
        p_id_venta      => p_id_venta_out,
        p_observaciones => 'Salida por venta ' || p_folio_out
      );
    END IF;
  END LOOP;
END SP_REGISTRAR_VENTA_COMPLETA;
/

CREATE OR REPLACE PROCEDURE SP_REGISTRAR_PAGO_PARCIAL (
  p_id_venta      IN NUMBER,
  p_id_metodo     IN NUMBER,
  p_monto         IN NUMBER
)
AS
  v_total         NUMBER;
  v_pagado_actual NUMBER;
  v_cancelada     CHAR(1);
  v_exento        CHAR(1);
BEGIN
  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE_APPLICATION_ERROR(-20406, 'El monto del pago debe ser positivo.');
  END IF;

  BEGIN
    SELECT MONTO_TOTAL, MONTO_PAGADO, CANCELADA, EXENTO_PAGO
      INTO v_total, v_pagado_actual, v_cancelada, v_exento
    FROM VENTA
    WHERE ID_VENTA = p_id_venta
    FOR UPDATE;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20407, 'La venta no existe.');
  END;

  IF v_cancelada = 'S' THEN
    RAISE_APPLICATION_ERROR(-20408, 'No se puede pagar una venta cancelada.');
  END IF;

  IF v_exento = 'S' THEN
    RAISE_APPLICATION_ERROR(-20409, 'La venta esta marcada como exenta de pago.');
  END IF;

  IF v_pagado_actual + p_monto > v_total THEN
    RAISE_APPLICATION_ERROR(-20410,
      'El pago excede el saldo pendiente. Saldo: ' || (v_total - v_pagado_actual) || '.');
  END IF;

  INSERT INTO VENTA_METODO_PAGO (
    ID_VENTA, ID_METODO_PAGO, MONTO
  ) VALUES (
    p_id_venta, p_id_metodo, p_monto
  );

  UPDATE VENTA
     SET MONTO_PAGADO     = MONTO_PAGADO + p_monto,
         SALDO_PENDIENTE  = SALDO_PENDIENTE - p_monto
   WHERE ID_VENTA = p_id_venta;
END SP_REGISTRAR_PAGO_PARCIAL;
/

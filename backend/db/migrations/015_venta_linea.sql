-- ============================================================================
-- Migration 015 — Tabla VENTA_LINEA + SP_REGISTRAR_VENTA_COMPLETA actualizado
-- Fecha: 2026-04-27
--
--   1. VENTA_LINEA — almacena los ítems de cada venta (productos y servicios)
--      con precio unitario, cantidad y subtotal.
--   2. SP_REGISTRAR_VENTA_COMPLETA — reemplazado para aceptar arrays de líneas
--      de venta en lugar de solo arrays de productos. Inserta en VENTA_LINEA
--      y sigue llamando SP_REGISTRAR_MOVIMIENTO_STOCK para productos.
--
-- Convención de errores: -20400..-20499.
-- ============================================================================

-- 1. Tabla de líneas de venta
CREATE TABLE VENTA_LINEA (
  ID_LINEA         NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ID_VENTA         NUMBER        NOT NULL,
  TIPO             VARCHAR2(10)  NOT NULL CHECK (TIPO IN ('PRODUCTO', 'SERVICIO')),
  ID_REFERENCIA    NUMBER        NOT NULL,
  DESCRIPCION      VARCHAR2(200) NOT NULL,
  PRECIO_UNITARIO  NUMBER(12,2)  NOT NULL,
  CANTIDAD         NUMBER(10)    DEFAULT 1 NOT NULL,
  SUBTOTAL         NUMBER(12,2)  NOT NULL,
  CONSTRAINT FK_VENTA_LINEA_VENTA FOREIGN KEY (ID_VENTA) REFERENCES VENTA(ID_VENTA)
);

CREATE INDEX IDX_VENTA_LINEA_VENTA ON VENTA_LINEA(ID_VENTA);

-- 2. SP_REGISTRAR_VENTA_COMPLETA actualizado (líneas de venta + stock)
CREATE OR REPLACE PROCEDURE SP_REGISTRAR_VENTA_COMPLETA (
  p_id_paciente         IN  NUMBER,
  p_id_usuario_registro IN  NUMBER,
  p_monto_total         IN  NUMBER,
  p_exento_pago         IN  CHAR DEFAULT 'N',
  -- Líneas de venta (arrays alineados por índice)
  p_linea_tipos         IN  SYS.ODCIVARCHAR2LIST,   -- 'PRODUCTO' | 'SERVICIO'
  p_linea_ids           IN  SYS.ODCINUMBERLIST,     -- id_producto / id_servicio
  p_linea_descs         IN  SYS.ODCIVARCHAR2LIST,   -- nombre capturado en el momento
  p_linea_precios       IN  SYS.ODCINUMBERLIST,     -- precio unitario
  p_linea_cantidades    IN  SYS.ODCINUMBERLIST,     -- cantidad
  -- Métodos de pago (arrays alineados por índice)
  p_metodos_pago        IN  SYS.ODCINUMBERLIST,
  p_montos_pago         IN  SYS.ODCINUMBERLIST,
  p_id_venta_out        OUT NUMBER,
  p_folio_out           OUT VARCHAR2
)
AS
  v_total_pagado NUMBER := 0;
  v_saldo        NUMBER;
  v_tipo         VARCHAR2(10);
  v_id_ref       NUMBER;
  v_precio       NUMBER;
  v_cant         NUMBER;
  v_subtotal     NUMBER;
BEGIN
  IF p_monto_total IS NULL OR p_monto_total < 0 THEN
    RAISE_APPLICATION_ERROR(-20401, 'Monto total invalido.');
  END IF;

  IF p_linea_tipos.COUNT <> p_linea_ids.COUNT
     OR p_linea_tipos.COUNT <> p_linea_descs.COUNT
     OR p_linea_tipos.COUNT <> p_linea_precios.COUNT
     OR p_linea_tipos.COUNT <> p_linea_cantidades.COUNT THEN
    RAISE_APPLICATION_ERROR(-20402, 'Arrays de lineas de venta desalineados.');
  END IF;

  IF p_metodos_pago.COUNT <> p_montos_pago.COUNT THEN
    RAISE_APPLICATION_ERROR(-20403, 'Arrays de metodos de pago y montos desalineados.');
  END IF;

  FOR i IN 1 .. p_montos_pago.COUNT LOOP
    IF p_montos_pago(i) IS NULL OR p_montos_pago(i) < 0 THEN
      RAISE_APPLICATION_ERROR(-20404, 'Monto de pago invalido en posicion ' || i || '.');
    END IF;
    v_total_pagado := v_total_pagado + p_montos_pago(i);
  END LOOP;

  IF v_total_pagado > p_monto_total AND NVL(p_exento_pago, 'N') <> 'S' THEN
    RAISE_APPLICATION_ERROR(-20405, 'La suma de pagos excede el monto total.');
  END IF;

  v_saldo := p_monto_total - v_total_pagado;
  IF NVL(p_exento_pago, 'N') = 'S' THEN
    v_saldo        := 0;
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
    INSERT INTO VENTA_METODO_PAGO (ID_VENTA, ID_METODO_PAGO, MONTO)
    VALUES (p_id_venta_out, p_metodos_pago(i), p_montos_pago(i));
  END LOOP;

  FOR i IN 1 .. p_linea_tipos.COUNT LOOP
    v_tipo     := p_linea_tipos(i);
    v_id_ref   := p_linea_ids(i);
    v_precio   := p_linea_precios(i);
    v_cant     := p_linea_cantidades(i);
    v_subtotal := v_precio * v_cant;

    INSERT INTO VENTA_LINEA (
      ID_VENTA, TIPO, ID_REFERENCIA, DESCRIPCION,
      PRECIO_UNITARIO, CANTIDAD, SUBTOTAL
    ) VALUES (
      p_id_venta_out, v_tipo, v_id_ref, p_linea_descs(i),
      v_precio, v_cant, v_subtotal
    );

    IF v_tipo = 'PRODUCTO' AND v_id_ref IS NOT NULL AND v_cant > 0 THEN
      SP_REGISTRAR_MOVIMIENTO_STOCK(
        p_id_producto   => v_id_ref,
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

-- ============================================================================
-- Migration 003 — Stored Procedures: módulo ALMACÉN + PRODUCTOS
-- Fecha: 2026-04-14
--
--   1. SP_CREAR_PRODUCTO_CON_EXISTENCIA — alta de producto en una transacción,
--      inserta PRODUCTO, la tabla hija (MEDICAMENTO|EQUIPO_MEDICO), y la fila
--      inicial en EXISTENCIA_PRODUCTO.
--   2. SP_REGISTRAR_MOVIMIENTO_STOCK — valida stock con SELECT FOR UPDATE,
--      aplica el delta y registra en MOVIMIENTO_INVENTARIO.
--   3. SP_AJUSTAR_EXISTENCIA_PRODUCTO — wrapper de SP #2 para ajustes manuales
--      cuando el usuario informa el stock objetivo en vez de un delta.
--
-- Convención de errores: -20500..-20599 para almacén, -20700..-20799 productos.
-- ============================================================================

-- Prerrequisito: secuencia para CLAVE_INTERNA si se necesita generar una
-- automáticamente. El SP acepta la clave ya calculada por el backend para
-- respetar los prefijos MED-xxx / EQP-xxx que ya existen.

CREATE OR REPLACE PROCEDURE SP_CREAR_PRODUCTO_CON_EXISTENCIA (
  p_clave_interna       IN  VARCHAR2,
  p_nombre              IN  VARCHAR2,
  p_descripcion         IN  VARCHAR2,
  p_tipo_producto       IN  VARCHAR2,   -- 'MEDICAMENTO' | 'EQUIPO_MEDICO'
  p_precio_cuota_a      IN  NUMBER,
  p_precio_cuota_b      IN  NUMBER,
  p_id_usuario_registro IN  NUMBER,
  p_nivel_minimo        IN  NUMBER DEFAULT 0,
  p_unidad_medida       IN  VARCHAR2 DEFAULT NULL,
  -- Campos específicos MEDICAMENTO (ignorados si p_tipo_producto <> 'MEDICAMENTO')
  p_med_presentacion    IN  VARCHAR2 DEFAULT NULL,
  p_med_dosis           IN  VARCHAR2 DEFAULT NULL,
  p_med_req_caducidad   IN  CHAR     DEFAULT 'S',
  -- Campos específicos EQUIPO_MEDICO (ignorados si p_tipo_producto <> 'EQUIPO_MEDICO')
  p_eq_numero_serie     IN  VARCHAR2 DEFAULT NULL,
  p_eq_marca            IN  VARCHAR2 DEFAULT NULL,
  p_eq_modelo           IN  VARCHAR2 DEFAULT NULL,
  p_eq_observaciones    IN  VARCHAR2 DEFAULT NULL,
  p_id_producto_out     OUT NUMBER
)
AS
BEGIN
  IF p_tipo_producto NOT IN ('MEDICAMENTO', 'EQUIPO_MEDICO') THEN
    RAISE_APPLICATION_ERROR(-20701,
      'Tipo de producto invalido. Usa MEDICAMENTO o EQUIPO_MEDICO.');
  END IF;

  IF p_clave_interna IS NULL OR LENGTH(TRIM(p_clave_interna)) = 0 THEN
    RAISE_APPLICATION_ERROR(-20702, 'Clave interna requerida.');
  END IF;

  BEGIN
    INSERT INTO PRODUCTO (
      CLAVE_INTERNA, NOMBRE, DESCRIPCION, TIPO_PRODUCTO,
      ACTIVO, ID_USUARIO_REGISTRO, PRECIO_CUOTA_A, PRECIO_CUOTA_B
    ) VALUES (
      p_clave_interna, p_nombre, p_descripcion, p_tipo_producto,
      'S', p_id_usuario_registro, p_precio_cuota_a, p_precio_cuota_b
    )
    RETURNING ID_PRODUCTO INTO p_id_producto_out;
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      RAISE_APPLICATION_ERROR(-20703,
        'Ya existe un producto con esa clave interna.');
  END;

  IF p_tipo_producto = 'MEDICAMENTO' THEN
    INSERT INTO MEDICAMENTO (
      ID_PRODUCTO, PRESENTACION, DOSIS, REQUIERE_CADUCIDAD
    ) VALUES (
      p_id_producto_out, p_med_presentacion, p_med_dosis,
      NVL(p_med_req_caducidad, 'S')
    );
  ELSE
    INSERT INTO EQUIPO_MEDICO (
      ID_PRODUCTO, NUMERO_SERIE, MARCA, MODELO,
      ESTATUS_EQUIPO, OBSERVACIONES
    ) VALUES (
      p_id_producto_out, p_eq_numero_serie, p_eq_marca, p_eq_modelo,
      'DISPONIBLE', p_eq_observaciones
    );
  END IF;

  INSERT INTO EXISTENCIA_PRODUCTO (
    ID_PRODUCTO, CANTIDAD_DISPONIBLE, NIVEL_MINIMO,
    UNIDAD_MEDIDA, ACTIVO
  ) VALUES (
    p_id_producto_out, 0, NVL(p_nivel_minimo, 0),
    p_unidad_medida, 'S'
  );
END SP_CREAR_PRODUCTO_CON_EXISTENCIA;
/

CREATE OR REPLACE PROCEDURE SP_REGISTRAR_MOVIMIENTO_STOCK (
  p_id_producto    IN NUMBER,
  p_tipo           IN VARCHAR2,  -- ENTRADA | SALIDA_VENTA | SALIDA_MERMA | AJUSTE_POS | AJUSTE_NEG
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

  IF p_tipo NOT IN ('ENTRADA','SALIDA_VENTA','SALIDA_MERMA','AJUSTE_POS','AJUSTE_NEG') THEN
    RAISE_APPLICATION_ERROR(-20502,
      'Tipo de movimiento invalido. Usa ENTRADA, SALIDA_VENTA, SALIDA_MERMA, AJUSTE_POS o AJUSTE_NEG.');
  END IF;

  IF p_tipo = 'SALIDA_VENTA' AND p_id_venta IS NULL THEN
    RAISE_APPLICATION_ERROR(-20503, 'SALIDA_VENTA requiere id_venta.');
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

  IF p_tipo IN ('SALIDA_VENTA','SALIDA_MERMA','AJUSTE_NEG') THEN
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

CREATE OR REPLACE PROCEDURE SP_AJUSTAR_EXISTENCIA_PRODUCTO (
  p_id_producto  IN NUMBER,
  p_stock_nuevo  IN NUMBER,
  p_motivo       IN VARCHAR2,
  p_id_usuario   IN NUMBER
)
AS
  v_stock_actual NUMBER;
  v_delta        NUMBER;
BEGIN
  IF p_stock_nuevo IS NULL OR p_stock_nuevo < 0 THEN
    RAISE_APPLICATION_ERROR(-20506, 'El stock nuevo no puede ser negativo.');
  END IF;

  BEGIN
    SELECT CANTIDAD_DISPONIBLE INTO v_stock_actual
    FROM EXISTENCIA_PRODUCTO
    WHERE ID_PRODUCTO = p_id_producto;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20504,
        'El producto no tiene registro de existencia.');
  END;

  v_delta := p_stock_nuevo - v_stock_actual;

  IF v_delta = 0 THEN
    RETURN;  -- nada que ajustar
  ELSIF v_delta > 0 THEN
    SP_REGISTRAR_MOVIMIENTO_STOCK(
      p_id_producto   => p_id_producto,
      p_tipo          => 'AJUSTE_POS',
      p_cantidad      => v_delta,
      p_id_usuario    => p_id_usuario,
      p_observaciones => p_motivo
    );
  ELSE
    SP_REGISTRAR_MOVIMIENTO_STOCK(
      p_id_producto   => p_id_producto,
      p_tipo          => 'AJUSTE_NEG',
      p_cantidad      => -v_delta,
      p_id_usuario    => p_id_usuario,
      p_observaciones => p_motivo
    );
  END IF;
END SP_AJUSTAR_EXISTENCIA_PRODUCTO;
/

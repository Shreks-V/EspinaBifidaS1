-- ============================================================================
-- Migration 018 — Seed data de catálogos
-- Fecha: 2026-04-30
-- Objetivo: insertar datos de catálogo requeridos para operar el sistema
--   en una BD nueva/limpia: métodos de pago, tipos de espina bífida,
--   tipos de documento y servicios básicos.
-- Todos los bloques son idempotentes (INSERT WHERE NOT EXISTS).
-- ============================================================================

-- 1. METODO_PAGO (IDs fijos que referencia el código y los tests)
BEGIN
  INSERT INTO METODO_PAGO (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 1, 'EFECTIVO', 'Pago en efectivo', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM METODO_PAGO WHERE ID_METODO_PAGO = 1);

  INSERT INTO METODO_PAGO (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 2, 'TARJETA', 'Tarjeta de crédito / débito', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM METODO_PAGO WHERE ID_METODO_PAGO = 2);

  INSERT INTO METODO_PAGO (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 3, 'TRANSFERENCIA', 'Transferencia bancaria / SPEI', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM METODO_PAGO WHERE ID_METODO_PAGO = 3);

  INSERT INTO METODO_PAGO (ID_METODO_PAGO, NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 4, 'EXENTO', 'Pago exento / donación', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM METODO_PAGO WHERE ID_METODO_PAGO = 4);

  -- ID 5 PENDIENTE ya insertado en migration 012; se omite.
  COMMIT;
END;
/

-- 2. TIPO_ESPINA_BIFIDA
BEGIN
  INSERT INTO TIPO_ESPINA_BIFIDA (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Mielomeningocele',
           'Tipo más severo; la médula espinal y sus cubiertas protruyen fuera de la columna.',
           'S'
      FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_ESPINA_BIFIDA WHERE UPPER(NOMBRE) = 'MIELOMENINGOCELE');

  INSERT INTO TIPO_ESPINA_BIFIDA (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Meningocele',
           'Las meninges protruyen pero la médula espinal no está dañada.',
           'S'
      FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_ESPINA_BIFIDA WHERE UPPER(NOMBRE) = 'MENINGOCELE');

  INSERT INTO TIPO_ESPINA_BIFIDA (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Espina Bífida Oculta',
           'Defecto leve; uno o más vértebras no se cierran completamente sin protrusión.',
           'S'
      FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_ESPINA_BIFIDA WHERE UPPER(NOMBRE) = 'ESPINA BÍFIDA OCULTA');

  INSERT INTO TIPO_ESPINA_BIFIDA (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Lipomeningocele',
           'Tejido graso se forma debajo de la piel y se conecta con la médula espinal.',
           'S'
      FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_ESPINA_BIFIDA WHERE UPPER(NOMBRE) = 'LIPOMENINGOCELE');

  INSERT INTO TIPO_ESPINA_BIFIDA (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Mielocele',
           'La médula espinal expuesta queda al descubierto sin cobertura meníngea.',
           'S'
      FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_ESPINA_BIFIDA WHERE UPPER(NOMBRE) = 'MIELOCELE');

  COMMIT;
END;
/

-- 3. TIPO_DOCUMENTO (para pre-registro y expediente de beneficiarios)
BEGIN
  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Acta de Nacimiento', 'Acta de nacimiento del beneficiario.', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'ACTA DE NACIMIENTO');

  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Comprobante de Domicilio', 'Recibo de luz, agua, teléfono o similar reciente.', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'COMPROBANTE DE DOMICILIO');

  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'CURP', 'Clave Única de Registro de Población.', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'CURP');

  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Identificación Oficial', 'INE, pasaporte o credencial vigente.', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'IDENTIFICACIÓN OFICIAL');

  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Historial Médico', 'Resumen o expediente clínico previo.', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'HISTORIAL MÉDICO');

  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Fotografía', 'Fotografía reciente del beneficiario (para credencial).', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'FOTOGRAFÍA');

  INSERT INTO TIPO_DOCUMENTO (NOMBRE, DESCRIPCION, ACTIVO)
    SELECT 'Constancia Médica', 'Diagnóstico o constancia emitida por médico.', 'S' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM TIPO_DOCUMENTO WHERE UPPER(NOMBRE) = 'CONSTANCIA MÉDICA');

  COMMIT;
END;
/

-- 4. SERVICIO (servicios ofrecidos por la asociación)
BEGIN
  INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    SELECT 'Consulta Médica', 'Consulta con médico general o especialista.', 0, 'S', 0, SYSDATE FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM SERVICIO WHERE UPPER(NOMBRE) = 'CONSULTA MÉDICA');

  INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    SELECT 'Terapia Física', 'Sesión de rehabilitación física y motriz.', 0, 'S', 0, SYSDATE FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM SERVICIO WHERE UPPER(NOMBRE) = 'TERAPIA FÍSICA');

  INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    SELECT 'Terapia Ocupacional', 'Sesión de terapia para desarrollo de habilidades funcionales.', 0, 'S', 0, SYSDATE FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM SERVICIO WHERE UPPER(NOMBRE) = 'TERAPIA OCUPACIONAL');

  INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    SELECT 'Orientación Psicológica', 'Sesión de apoyo psicológico para paciente o familia.', 0, 'S', 0, SYSDATE FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM SERVICIO WHERE UPPER(NOMBRE) = 'ORIENTACIÓN PSICOLÓGICA');

  INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    SELECT 'Evaluación Neurológica', 'Evaluación del sistema nervioso por especialista.', 0, 'S', 0, SYSDATE FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM SERVICIO WHERE UPPER(NOMBRE) = 'EVALUACIÓN NEUROLÓGICA');

  INSERT INTO SERVICIO (NOMBRE, DESCRIPCION, CUOTA_RECUPERACION, ACTIVO, ID_USUARIO_REGISTRO, FECHA_REGISTRO)
    SELECT 'Trabajo Social', 'Gestión de apoyos y orientación a familias.', 0, 'S', 0, SYSDATE FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM SERVICIO WHERE UPPER(NOMBRE) = 'TRABAJO SOCIAL');

  COMMIT;
END;
/

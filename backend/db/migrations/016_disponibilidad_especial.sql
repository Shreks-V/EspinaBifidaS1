-- ============================================================================
-- Migration 016 — Tabla DISPONIBILIDAD_ESPECIAL_DOCTOR
-- Fecha: 2026-04-27
--
--   Maneja casos especiales de asistencia médica que NO siguen un patrón
--   semanal fijo: visita única, quincenal, cada 3 semanas o mensual.
--   La lógica de "¿viene hoy?" se calcula en Python comparando FECHA_INICIO
--   + TIPO_RECURRENCIA con la fecha actual.
-- ============================================================================

CREATE TABLE DISPONIBILIDAD_ESPECIAL_DOCTOR (
  ID_DISP_ESPECIAL  NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ID_DOCTOR         NUMBER        NOT NULL,
  FECHA_INICIO      DATE          NOT NULL,
  HORA_INICIO       VARCHAR2(5)   NOT NULL,
  HORA_FIN          VARCHAR2(5)   NOT NULL,
  TIPO_RECURRENCIA  VARCHAR2(20)  DEFAULT 'UNICA' NOT NULL
    CHECK (TIPO_RECURRENCIA IN ('UNICA', 'QUINCENAL', 'CADA_3_SEMANAS', 'MENSUAL')),
  DESCRIPCION       VARCHAR2(200),
  ACTIVO            CHAR(1)       DEFAULT 'S' NOT NULL CHECK (ACTIVO IN ('S', 'N')),
  FECHA_REGISTRO    DATE          DEFAULT SYSDATE,
  CONSTRAINT FK_DISP_ESP_DOCTOR FOREIGN KEY (ID_DOCTOR) REFERENCES DOCTOR(ID_DOCTOR)
);

CREATE INDEX IDX_DISP_ESP_DOCTOR ON DISPONIBILIDAD_ESPECIAL_DOCTOR(ID_DOCTOR);

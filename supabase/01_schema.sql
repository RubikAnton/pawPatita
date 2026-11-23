-- =============================================================================
-- PAW PATITA CUSCO v5.0 — FASE 2: INFRAESTRUCTURA DE BASE DE DATOS (SUPABASE)
-- Archivo: supabase/01_schema.sql
-- Descripción: Esquema relacional completo de 23 tablas en 3FN estricta,
--              tipos ENUM, secuencias, claves foráneas, constraints CHECK
--              e índices de alto rendimiento para PostgreSQL 15+.
-- =============================================================================

-- Extensiones requeridas en Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TIPOS ENUMERADOS (DOMINIOS CANÓNICOS SIN INCONSISTENCIAS)
-- =============================================================================

DO $$ BEGIN
    CREATE TYPE rol_usuario_enum AS ENUM ('propietario', 'cuidador', 'veterinaria', 'administrador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_cuenta_enum AS ENUM ('activo', 'pendiente', 'rechazado', 'suspendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_documento_enum AS ENUM ('DNI', 'CE', 'Pasaporte');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_afiliacion_clinica_enum AS ENUM ('pendiente', 'activa', 'rechazada', 'suspendida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE horario_clinica_enum AS ENUM ('24 Horas', 'Diurno', 'Extendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tamano_mascota_enum AS ENUM ('Pequeño', 'Mediano', 'Grande');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sexo_mascota_enum AS ENUM ('Macho', 'Hembra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_validacion_vet_enum AS ENUM ('pendiente', 'validado', 'observado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_postulacion_cuidador_enum AS ENUM ('pendiente', 'aprobado', 'rechazado', 'suspendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE bloque_horario_enum AS ENUM ('todo_el_dia', 'manana_08_12', 'tarde_14_18', 'noche_18_22', 'personalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_bloque_enum AS ENUM ('disponible', 'parcial', 'lleno', 'bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_descuento_enum AS ENUM ('porcentaje', 'monto_fijo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE segmento_cupon_enum AS ENUM ('todos', 'local', 'turista');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_reserva_enum AS ENUM ('pendiente_confirmacion', 'confirmada', 'en_curso', 'finalizada', 'cancelada', 'en_disputa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago_enum AS ENUM ('Yape', 'Plin', 'Tarjeta', 'Transferencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_pago_enum AS ENUM ('aprobado', 'reembolsado_total', 'reembolsado_parcial', 'en_disputa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_liquidacion_enum AS ENUM ('en_garantia', 'disponible', 'solicitado', 'pagado', 'rechazado', 'anulado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_caso_cancelacion_enum AS ENUM ('cancelacion_propietario', 'rechazo_cuidador', 'disputa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_tramite_cancelacion_enum AS ENUM ('pendiente_revision', 'procesado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE nivel_severidad_sos_enum AS ENUM ('leve', 'moderada', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estado_sos_enum AS ENUM ('emitida', 'en_atencion', 'estabilizada', 'resuelta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 2. SECUENCIAS DE NEGOCIO PARA CÓDIGOS LEGIBLES
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS seq_paw_id START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_usuario START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_cuidador START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_clinica START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_hu_ecode START WITH 101 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_reserva START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_pago START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_liquidacion START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_sos START WITH 1001 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS seq_codigo_cancelacion START WITH 1001 INCREMENT BY 1;

-- =============================================================================
-- 3. DEFINICIÓN DE LAS 23 TABLAS RELACIONALES EN 3FN
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLA 01: configuracion_plataforma
-- Parámetros globales administrables en tiempo real (comisión 15%, TC USD, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracion_plataforma (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clave text NOT NULL UNIQUE,
    valor_numerico numeric(12,4),
    valor_texto text,
    valor_booleano boolean,
    descripcion text NOT NULL,
    editable_por_admin boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.configuracion_plataforma IS 'Parámetros vivos editables por el Administrador (comisión 15%, tipo de cambio USD, tarifa baño extra, Yape oficial).';

-- -----------------------------------------------------------------------------
-- TABLA 02: clinicas_veterinarias
-- Red de Clínicas Veterinarias Aliadas en Cusco (24h, Diurno, Extendido)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinicas_veterinarias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_clinica text NOT NULL UNIQUE DEFAULT ('VET-' || LPAD(nextval('seq_codigo_clinica')::text, 3, '0')),
    ruc text NOT NULL UNIQUE CHECK (ruc ~ '^[0-9]{11}$'),
    nombre text NOT NULL,
    email_institucional text NOT NULL UNIQUE,
    direccion text NOT NULL,
    distrito_cusco text NOT NULL,
    latitud numeric(9,6) NOT NULL DEFAULT -13.516700,
    longitud numeric(9,6) NOT NULL DEFAULT -71.978800,
    telefono_emergencia text NOT NULL,
    horario_atencion horario_clinica_enum NOT NULL DEFAULT '24 Horas',
    especialidades text[] NOT NULL DEFAULT ARRAY['Emergencias 24h', 'Medicina General'],
    tarifa_consulta_emergencia numeric(10,2) NOT NULL DEFAULT 60.00 CHECK (tarifa_consulta_emergencia > 0),
    foto_fachada_url text,
    constancia_url text,
    colegiatura_cmvp text NOT NULL,
    declaracion_jurada boolean NOT NULL DEFAULT true,
    estado_afiliacion estado_afiliacion_clinica_enum NOT NULL DEFAULT 'pendiente',
    motivo_estado text,
    activa boolean NOT NULL DEFAULT false,
    aprobado_por uuid,
    fecha_aprobacion timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.clinicas_veterinarias IS 'Clínicas veterinarias aliadas de Cusco para validación de PAW-ID y atención de alertas S.O.S.';

-- -----------------------------------------------------------------------------
-- TABLA 03: perfiles_usuarios
-- Perfil unificado 1:1 con auth.users (Propietario Local/Turista, Cuidador, Vet, Admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles_usuarios (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    codigo_usuario text NOT NULL UNIQUE DEFAULT ('USR-' || LPAD(nextval('seq_codigo_usuario')::text, 3, '0')),
    nombre text NOT NULL,
    apellido text NOT NULL DEFAULT '',
    email text NOT NULL UNIQUE,
    telefono text NOT NULL,
    rol rol_usuario_enum NOT NULL DEFAULT 'propietario',
    es_turista boolean NOT NULL DEFAULT false,
    tipo_documento tipo_documento_enum NOT NULL DEFAULT 'DNI',
    num_documento text NOT NULL UNIQUE,
    pais_origen text NOT NULL DEFAULT 'Perú',
    idioma_preferido text NOT NULL DEFAULT 'ES' CHECK (idioma_preferido IN ('ES', 'EN')),
    direccion text,
    distrito_cusco text NOT NULL DEFAULT 'Cusco Centro',
    hospedaje_hotel_cusco text,
    contacto_emergencia_nombre text,
    contacto_emergencia_tel text,
    id_clinica_asociada uuid REFERENCES public.clinicas_veterinarias(id) ON DELETE SET NULL,
    avatar_url text,
    tyc_version_aceptada text DEFAULT 'v5.0',
    estado_cuenta estado_cuenta_enum NOT NULL DEFAULT 'activo',
    motivo_estado_cuenta text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfiles_usuarios IS 'Perfil extendido de usuario sincronizado con auth.users. Unifica Propietario Local y Turista bajo un único rol propietario.';

-- FK diferida para aprobado_por en clinicas_veterinarias
ALTER TABLE public.clinicas_veterinarias
    DROP CONSTRAINT IF EXISTS fk_clinicas_aprobado_por,
    ADD CONSTRAINT fk_clinicas_aprobado_por FOREIGN KEY (aprobado_por)
    REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- TABLA 04: mascotas
-- Registro de mascotas y Carné Digital PAW-ID con cálculo dinámico de edad
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mascotas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    paw_id text NOT NULL UNIQUE DEFAULT ('PAW-' || LPAD(nextval('seq_paw_id')::text, 4, '0')),
    id_propietario uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    raza text NOT NULL DEFAULT 'Mestizo',
    fecha_nacimiento date NOT NULL CHECK (fecha_nacimiento <= CURRENT_DATE),
    tamano tamano_mascota_enum NOT NULL DEFAULT 'Mediano',
    sexo sexo_mascota_enum NOT NULL DEFAULT 'Macho',
    peso_kg numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (peso_kg > 0 AND peso_kg <= 120),
    esterilizado boolean NOT NULL DEFAULT false,
    vacunas_al_dia boolean NOT NULL DEFAULT false,
    fecha_venc_vacunas date,
    cartilla_vacunas_url text,
    alergias_restricciones text DEFAULT 'Ninguna reportada',
    medicacion_actual text DEFAULT 'Ninguna',
    dieta_alimentacion text DEFAULT 'Croquetas balanceadas 2 veces al día',
    conducta_observaciones text DEFAULT 'Sociable y tranquilo',
    foto_url text,
    estado_validacion_vet estado_validacion_vet_enum NOT NULL DEFAULT 'pendiente',
    id_clinica_validadora uuid REFERENCES public.clinicas_veterinarias(id) ON DELETE SET NULL,
    observacion_veterinaria text,
    fecha_ultima_validacion timestamptz,
    activa boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mascotas IS 'Fichas médicas y Carné Digital PAW-ID con fecha_nacimiento para cálculo dinámico de edad en años y meses.';

-- -----------------------------------------------------------------------------
-- TABLA 05: validaciones_veterinarias
-- Historial auditable de dictámenes médicos sobre carnés PAW-ID
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.validaciones_veterinarias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_mascota uuid NOT NULL REFERENCES public.mascotas(id) ON DELETE CASCADE,
    id_clinica uuid NOT NULL REFERENCES public.clinicas_veterinarias(id) ON DELETE RESTRICT,
    id_usuario_vet uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    resultado estado_validacion_vet_enum NOT NULL CHECK (resultado IN ('validado', 'observado')),
    vacunas_verificadas text NOT NULL,
    vigencia_hasta date,
    observaciones_medicas text NOT NULL,
    cartilla_evaluada_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.validaciones_veterinarias IS 'Dictámenes médicos oficiales emitidos por Clínicas Veterinarias Aliadas sobre fichas PAW-ID.';

-- -----------------------------------------------------------------------------
-- TABLA 06: perfiles_cuidadores
-- Perfil profesional, reputación, capacidad, coordenadas Cusco y datos de cobro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfiles_cuidadores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cuidador text NOT NULL UNIQUE DEFAULT ('CUID-' || LPAD(nextval('seq_codigo_cuidador')::text, 3, '0')),
    id_usuario uuid NOT NULL UNIQUE REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
    presentacion_corta text NOT NULL,
    descripcion_experiencia text NOT NULL,
    anios_experiencia integer NOT NULL DEFAULT 1 CHECK (anios_experiencia >= 0 AND anios_experiencia <= 50),
    especialidades text[] NOT NULL DEFAULT ARRAY['Paseos Seguros', 'Cuidado en Casa'],
    idiomas text[] NOT NULL DEFAULT ARRAY['Español'],
    tipo_vivienda text NOT NULL DEFAULT 'Casa con patio cercado',
    capacidad_max_mascotas integer NOT NULL DEFAULT 3 CHECK (capacidad_max_mascotas BETWEEN 1 AND 10),
    acepta_cachorros boolean NOT NULL DEFAULT true,
    acepta_medicacion_oral boolean NOT NULL DEFAULT true,
    latitud numeric(9,6) NOT NULL DEFAULT -13.520000,
    longitud numeric(9,6) NOT NULL DEFAULT -71.970000,
    reputacion_promedio numeric(3,2) NOT NULL DEFAULT 5.00 CHECK (reputacion_promedio BETWEEN 0 AND 5),
    total_resenas integer NOT NULL DEFAULT 0 CHECK (total_resenas >= 0),
    estado_postulacion estado_postulacion_cuidador_enum NOT NULL DEFAULT 'pendiente',
    motivo_estado text,
    foto_url text,
    foto_hogar_url text,
    disponibilidad_semanal text[] NOT NULL DEFAULT ARRAY['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
    cuenta_cobro_tipo text NOT NULL DEFAULT 'Yape' CHECK (cuenta_cobro_tipo IN ('Yape', 'Plin', 'CCI', 'BCP', 'Interbank', 'BBVA')),
    cuenta_cobro_numero text NOT NULL DEFAULT '',
    aprobado_por uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    fecha_aprobacion timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfiles_cuidadores IS 'Perfil profesional de cuidadores independientes en Cusco.';

-- -----------------------------------------------------------------------------
-- TABLA 07: antecedentes_cuidadores
-- Expediente documental legal y verificación de identidad/antecedentes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.antecedentes_cuidadores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cuidador uuid NOT NULL UNIQUE REFERENCES public.perfiles_cuidadores(id) ON DELETE CASCADE,
    doc_identidad_url text NOT NULL,
    doc_antecedentes_policiales_url text NOT NULL,
    doc_antecedentes_penales_url text NOT NULL,
    doc_domicilio_url text,
    declaracion_jurada boolean NOT NULL DEFAULT true CHECK (declaracion_jurada = true),
    estado_verificacion estado_postulacion_cuidador_enum NOT NULL DEFAULT 'pendiente',
    observaciones_admin text,
    revisado_por uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    fecha_revision timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.antecedentes_cuidadores IS 'Documentación de verificación legal (DNI, antecedentes policiales, penales y domicilio) del cuidador.';

-- -----------------------------------------------------------------------------
-- TABLA 08: servicios
-- Catálogo de ofertas publicadas por cada cuidador (HU-ECODE, tarifas, recojo)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.servicios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hu_ecode text NOT NULL UNIQUE DEFAULT ('HU-' || LPAD(nextval('seq_hu_ecode')::text, 3, '0')),
    id_cuidador uuid NOT NULL REFERENCES public.perfiles_cuidadores(id) ON DELETE CASCADE,
    categoria text NOT NULL CHECK (categoria IN ('Paseo', 'Hospedaje', 'Guardería', 'Domicilio Turístico')),
    tipo_servicio text NOT NULL,
    descripcion_servicio text NOT NULL,
    tarifa_diaria_por_perro numeric(10,2) NOT NULL CHECK (tarifa_diaria_por_perro > 0),
    incluye_recojo_hotel boolean NOT NULL DEFAULT false,
    tarifa_recojo_extra numeric(10,2) NOT NULL DEFAULT 15.00 CHECK (tarifa_recojo_extra >= 0),
    disponible boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.servicios IS 'Modalidades de servicio y tarifas ofertadas por los cuidadores aprobados.';

-- -----------------------------------------------------------------------------
-- TABLA 09: disponibilidad_cuidadores
-- Agenda evolucionada por fecha + bloque horario exacto + control de cupos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disponibilidad_cuidadores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cuidador uuid NOT NULL REFERENCES public.perfiles_cuidadores(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    bloque_horario bloque_horario_enum NOT NULL DEFAULT 'todo_el_dia',
    hora_inicio time NOT NULL DEFAULT '08:00:00',
    hora_fin time NOT NULL DEFAULT '20:00:00',
    estado_bloque estado_bloque_enum NOT NULL DEFAULT 'disponible',
    cupo_maximo integer NOT NULL DEFAULT 3 CHECK (cupo_maximo BETWEEN 1 AND 15),
    cupos_reservados integer NOT NULL DEFAULT 0 CHECK (cupos_reservados >= 0 AND cupos_reservados <= cupo_maximo),
    nota_agenda text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_disponibilidad_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT uq_disponibilidad_cuidador_bloque UNIQUE (id_cuidador, fecha, bloque_horario, hora_inicio, hora_fin)
);

COMMENT ON TABLE public.disponibilidad_cuidadores IS 'Calendario operativo de cuidadores por fecha y franja horaria con bloqueo anti-overbooking.';

-- -----------------------------------------------------------------------------
-- TABLA 10: temporadas_tarifas
-- Temporadas turísticas y climáticas de Cusco (Inti Raymi, Fiestas Patrias, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.temporadas_tarifas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL UNIQUE,
    descripcion text NOT NULL,
    mes_dia_inicio text NOT NULL CHECK (mes_dia_inicio ~ '^[0-1][0-9]-[0-3][0-9]$'),
    mes_dia_fin text NOT NULL CHECK (mes_dia_fin ~ '^[0-1][0-9]-[0-3][0-9]$'),
    factor_multiplicador numeric(4,2) NOT NULL DEFAULT 1.15 CHECK (factor_multiplicador >= 1.00 AND factor_multiplicador <= 3.00),
    recargo_porcentaje numeric(5,2) NOT NULL DEFAULT 15.00 CHECK (recargo_porcentaje BETWEEN 0 AND 100),
    activa boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.temporadas_tarifas IS 'Factores estacionales aplicables a reservas durante festividades y temporadas altas en Cusco.';

-- -----------------------------------------------------------------------------
-- TABLA 11: cupones_promocionales
-- Cupones de descuento por porcentaje o monto fijo
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cupones_promocionales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo text NOT NULL UNIQUE,
    descripcion text NOT NULL,
    tipo_descuento tipo_descuento_enum NOT NULL DEFAULT 'porcentaje',
    valor_descuento numeric(10,2) NOT NULL CHECK (valor_descuento > 0),
    segmento_objetivo segmento_cupon_enum NOT NULL DEFAULT 'todos',
    monto_minimo numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_minimo >= 0),
    fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '365 days'),
    usos_maximos integer NOT NULL DEFAULT 100 CHECK (usos_maximos > 0),
    usos_actuales integer NOT NULL DEFAULT 0 CHECK (usos_actuales >= 0 AND usos_actuales <= usos_maximos),
    activo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_cupon_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_cupon_porcentaje CHECK (tipo_descuento != 'porcentaje' OR (valor_descuento > 0 AND valor_descuento <= 100))
);

COMMENT ON TABLE public.cupones_promocionales IS 'Cupones promocionales para propietarios locales y turistas en Cusco.';

-- -----------------------------------------------------------------------------
-- TABLA 12: reservas
-- Transacción central de custodia con máquina de estados y desglose financiero
-- Claves foráneas con ON DELETE RESTRICT para integridad contable
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_reserva text NOT NULL UNIQUE DEFAULT ('RES-2026-' || LPAD(nextval('seq_codigo_reserva')::text, 4, '0')),
    id_propietario uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE RESTRICT,
    id_cuidador uuid NOT NULL REFERENCES public.perfiles_cuidadores(id) ON DELETE RESTRICT,
    id_oferta uuid NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
    id_mascota uuid NOT NULL REFERENCES public.mascotas(id) ON DELETE RESTRICT,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    bloque_horario bloque_horario_enum NOT NULL DEFAULT 'todo_el_dia',
    hora_inicio time NOT NULL DEFAULT '08:00:00',
    hora_fin time NOT NULL DEFAULT '20:00:00',
    dias_calculados integer NOT NULL DEFAULT 1 CHECK (dias_calculados >= 1),
    tarifa_unitaria numeric(10,2) NOT NULL CHECK (tarifa_unitaria > 0),
    subtotal_base numeric(10,2) NOT NULL CHECK (subtotal_base > 0),
    id_temporada uuid REFERENCES public.temporadas_tarifas(id) ON DELETE SET NULL,
    ajuste_temporada numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (ajuste_temporada >= 0),
    recargo_cachorro numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (recargo_cachorro >= 0),
    id_cupon uuid REFERENCES public.cupones_promocionales(id) ON DELETE SET NULL,
    descuento_cupon numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (descuento_cupon >= 0),
    extras_detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
    extras_monto numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (extras_monto >= 0),
    monto_total numeric(10,2) NOT NULL CHECK (monto_total > 0),
    moneda_referencial text NOT NULL DEFAULT 'PEN' CHECK (moneda_referencial IN ('PEN', 'USD')),
    estado_reserva estado_reserva_enum NOT NULL DEFAULT 'pendiente_confirmacion',
    motivo_rechazo text,
    notas_propietario text,
    checklist_checkin jsonb DEFAULT '{}'::jsonb,
    checklist_checkout jsonb DEFAULT '{}'::jsonb,
    fecha_checkin timestamptz,
    fecha_checkout timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_reserva_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_reserva_horas CHECK (hora_fin > hora_inicio)
);

COMMENT ON TABLE public.reservas IS 'Transacciones principales de custodia de mascotas en Cusco.';

-- -----------------------------------------------------------------------------
-- TABLA 13: pagos
-- Registro contable de cobros, comisión exacta del 15% y neto del 85%
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pagos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_pago text NOT NULL UNIQUE DEFAULT ('PAY-2026-' || LPAD(nextval('seq_codigo_pago')::text, 4, '0')),
    id_reserva uuid NOT NULL UNIQUE REFERENCES public.reservas(id) ON DELETE RESTRICT,
    metodo_pago metodo_pago_enum NOT NULL DEFAULT 'Yape',
    num_operacion text NOT NULL,
    ultimos_4_digitos text,
    monto_bruto numeric(10,2) NOT NULL CHECK (monto_bruto > 0),
    comision_porcentaje numeric(5,2) NOT NULL DEFAULT 15.00 CHECK (comision_porcentaje BETWEEN 0 AND 100),
    comision_plataforma numeric(10,2) NOT NULL CHECK (comision_plataforma >= 0),
    monto_neto_cuidador numeric(10,2) NOT NULL CHECK (monto_neto_cuidador >= 0),
    monto_reembolsado numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_reembolsado >= 0),
    penalidad_retenida numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (penalidad_retenida >= 0),
    estado_pago estado_pago_enum NOT NULL DEFAULT 'aprobado',
    tipo_comprobante text NOT NULL DEFAULT 'Boleta Electrónica' CHECK (tipo_comprobante IN ('Boleta Electrónica', 'Factura Electrónica')),
    num_comprobante text NOT NULL DEFAULT ('B001-' || LPAD(currval('seq_codigo_pago')::text, 6, '0')),
    comprobante_url text,
    fecha_pago timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pagos IS 'Conciliación financiera de pagos, comisión de plataforma (15%) y neto de cuidador (85%).';

-- -----------------------------------------------------------------------------
-- TABLA 14: liquidaciones_cuidadores
-- Billetera del cuidador: en_garantia -> disponible -> solicitado -> pagado
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.liquidaciones_cuidadores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_liquidacion text NOT NULL UNIQUE DEFAULT ('LIQ-2026-' || LPAD(nextval('seq_codigo_liquidacion')::text, 4, '0')),
    id_cuidador uuid NOT NULL REFERENCES public.perfiles_cuidadores(id) ON DELETE RESTRICT,
    id_reserva uuid UNIQUE REFERENCES public.reservas(id) ON DELETE RESTRICT,
    tipo_concepto text NOT NULL DEFAULT 'Servicio de Custodia (85%)' CHECK (tipo_concepto IN ('Servicio de Custodia (85%)', 'Compensación por Cancelación', 'Resolución de Arbitraje')),
    monto_liquidado numeric(10,2) NOT NULL CHECK (monto_liquidado > 0),
    estado_liquidacion estado_liquidacion_enum NOT NULL DEFAULT 'en_garantia',
    metodo_desembolso text DEFAULT 'Yape',
    cuenta_destino text,
    num_operacion_desembolso text,
    motivo_rechazo text,
    fecha_disponible timestamptz,
    fecha_solicitud_retiro timestamptz,
    fecha_liquidacion timestamptz,
    aprobado_por_admin uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.liquidaciones_cuidadores IS 'Movimientos de billetera del cuidador: Garantía, Disponible para Retiro, Solicitado y Pagado (Total Histórico Cobrado).';

-- -----------------------------------------------------------------------------
-- TABLA 15: cancelaciones_reembolsos
-- Cancelaciones escalonadas (>48h, 24-48h, <24h), rechazos y arbitraje de disputas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cancelaciones_reembolsos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cancelacion text NOT NULL UNIQUE DEFAULT ('CAN-2026-' || LPAD(nextval('seq_codigo_cancelacion')::text, 4, '0')),
    id_reserva uuid NOT NULL REFERENCES public.reservas(id) ON DELETE RESTRICT,
    solicitado_por uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE RESTRICT,
    tipo_caso tipo_caso_cancelacion_enum NOT NULL DEFAULT 'cancelacion_propietario',
    horas_anticipacion numeric(10,2) NOT NULL DEFAULT 0,
    regla_aplicada text NOT NULL,
    motivo text NOT NULL,
    porcentaje_reembolso numeric(5,2) NOT NULL CHECK (porcentaje_reembolso BETWEEN 0 AND 100),
    monto_reembolso numeric(10,2) NOT NULL CHECK (monto_reembolso >= 0),
    monto_penalidad_plataforma numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_penalidad_plataforma >= 0),
    monto_compensacion_cuidador numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (monto_compensacion_cuidador >= 0),
    estado_tramite estado_tramite_cancelacion_enum NOT NULL DEFAULT 'procesado',
    resolucion_admin text,
    num_operacion_reembolso text,
    procesado_por uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    fecha_resolucion timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cancelaciones_reembolsos IS 'Registro de cancelaciones con política escalonada y expedientes de arbitraje de disputas.';

-- -----------------------------------------------------------------------------
-- TABLA 16: reportes_seguimiento
-- Muro privado en vivo de bienestar durante el servicio de custodia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reportes_seguimiento (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reserva uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
    id_cuidador uuid NOT NULL REFERENCES public.perfiles_cuidadores(id) ON DELETE CASCADE,
    tipo_evento text NOT NULL DEFAULT 'Paseo y Recreación' CHECK (tipo_evento IN ('Check-In', 'Alimentación', 'Paseo y Recreación', 'Descanso', 'Medicación', 'Higiene', 'Reporte General', 'Check-Out')),
    estado_animo_mascota text NOT NULL DEFAULT 'Feliz y activo',
    ubicacion_referencial text NOT NULL DEFAULT 'Cusco',
    nota_estado text NOT NULL,
    visto_por_propietario boolean NOT NULL DEFAULT false,
    fecha_reporte timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reportes_seguimiento IS 'Publicaciones cronológicas del cuidador en el Muro de Fotos en Vivo de la reserva.';

-- -----------------------------------------------------------------------------
-- TABLA 17: fotos_reporte
-- Galería multimedia asociada a cada reporte (soporta PostImg y Supabase Storage)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fotos_reporte (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reporte uuid NOT NULL REFERENCES public.reportes_seguimiento(id) ON DELETE CASCADE,
    foto_url text NOT NULL,
    origen_almacenamiento text NOT NULL DEFAULT 'postimg' CHECK (origen_almacenamiento IN ('postimg', 'supabase_storage', 'externo')),
    descripcion_foto text,
    orden integer NOT NULL DEFAULT 1 CHECK (orden >= 1),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fotos_reporte IS 'Fotografías adjuntas a los reportes de seguimiento (compatibles con enlaces PostImg y buckets de Supabase Storage).';

-- -----------------------------------------------------------------------------
-- TABLA 18: incidencias_emergencias
-- Central de Alertas S.O.S. Veterinarias en tiempo real
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidencias_emergencias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_sos text NOT NULL UNIQUE DEFAULT ('SOS-2026-' || LPAD(nextval('seq_codigo_sos')::text, 4, '0')),
    id_reserva uuid REFERENCES public.reservas(id) ON DELETE RESTRICT,
    id_mascota uuid NOT NULL REFERENCES public.mascotas(id) ON DELETE RESTRICT,
    reportado_por uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE RESTRICT,
    id_clinica_derivada uuid NOT NULL REFERENCES public.clinicas_veterinarias(id) ON DELETE RESTRICT,
    atendido_por_vet uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    nivel_severidad nivel_severidad_sos_enum NOT NULL DEFAULT 'moderada',
    tipo_incidencia text NOT NULL DEFAULT 'Urgencia Médica General',
    descripcion text NOT NULL,
    ubicacion_emergencia text DEFAULT 'Cusco',
    estado_sos estado_sos_enum NOT NULL DEFAULT 'emitida',
    diagnostico_clinico text,
    tratamiento_aplicado text,
    informe_resolucion text,
    costo_atencion_ref numeric(10,2) DEFAULT 0.00 CHECK (costo_atencion_ref >= 0),
    fecha_incidencia timestamptz NOT NULL DEFAULT now(),
    fecha_atencion timestamptz,
    fecha_estabilizacion timestamptz,
    fecha_resolucion timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.incidencias_emergencias IS 'Protocolo de emergencias veterinarias S.O.S. con máquina de estados (emitida -> en_atencion -> estabilizada -> resuelta).';

-- -----------------------------------------------------------------------------
-- TABLA 19: resenas
-- Calificaciones verificadas (1 a 5 estrellas con desglose en 3 dimensiones)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resenas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_reserva uuid NOT NULL UNIQUE REFERENCES public.reservas(id) ON DELETE RESTRICT,
    id_propietario uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE RESTRICT,
    id_cuidador uuid NOT NULL REFERENCES public.perfiles_cuidadores(id) ON DELETE RESTRICT,
    calificacion_estrellas integer NOT NULL CHECK (calificacion_estrellas BETWEEN 1 AND 5),
    puntualidad_estrellas integer NOT NULL DEFAULT 5 CHECK (puntualidad_estrellas BETWEEN 1 AND 5),
    comunicacion_estrellas integer NOT NULL DEFAULT 5 CHECK (comunicacion_estrellas BETWEEN 1 AND 5),
    cuidado_estrellas integer NOT NULL DEFAULT 5 CHECK (cuidado_estrellas BETWEEN 1 AND 5),
    comentario text NOT NULL,
    respuesta_cuidador text,
    fecha_respuesta timestamptz,
    visible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.resenas IS 'Reseñas verificadas post-servicio que actualizan automáticamente la reputación del cuidador.';

-- -----------------------------------------------------------------------------
-- TABLA 20: terminos_condiciones
-- Versiones oficiales de contratos legales y políticas de la plataforma
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.terminos_condiciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_version text NOT NULL UNIQUE,
    ambito text NOT NULL CHECK (ambito IN ('General', 'Propietario', 'Cuidador', 'Veterinaria', 'Reserva')),
    titulo text NOT NULL,
    contenido_markdown text NOT NULL,
    vigente boolean NOT NULL DEFAULT true,
    fecha_publicacion timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.terminos_condiciones IS 'Catálogo versionado de Términos y Condiciones legales de Paw Patita Cusco.';

-- -----------------------------------------------------------------------------
-- TABLA 21: aceptaciones_tyc
-- Registro inmutable de consentimiento legal por usuario y versión
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aceptaciones_tyc (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
    id_tyc uuid REFERENCES public.terminos_condiciones(id) ON DELETE RESTRICT,
    codigo_version text NOT NULL DEFAULT 'v5.0',
    contexto_aceptacion text NOT NULL DEFAULT 'Registro de Cuenta',
    ip_referencial text DEFAULT '127.0.0.1',
    user_agent text,
    fecha_aceptacion timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.aceptaciones_tyc IS 'Evidencia auditable de aceptación de Términos y Condiciones y Declaraciones Juradas.';

-- -----------------------------------------------------------------------------
-- TABLA 22: auditoria_estados
-- Bitácora forense global poblada automáticamente por triggers (old/new jsonb)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria_estados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad text NOT NULL,
    id_registro text NOT NULL,
    accion text NOT NULL,
    estado_anterior text,
    estado_nuevo text,
    actor_id uuid REFERENCES public.perfiles_usuarios(id) ON DELETE SET NULL,
    actor_nombre text NOT NULL DEFAULT 'Sistema Automático',
    actor_rol text NOT NULL DEFAULT 'sistema',
    detalle text NOT NULL,
    old_record jsonb,
    new_record jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auditoria_estados IS 'Bitácora inmutable de cambios de estado y transacciones críticas con instantáneas JSONB (old_record y new_record).';

-- -----------------------------------------------------------------------------
-- TABLA 23: notificaciones
-- Centro de notificaciones In-App en tiempo real para los 4 roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario_destino uuid NOT NULL REFERENCES public.perfiles_usuarios(id) ON DELETE CASCADE,
    tipo text NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'reserva', 'pago', 'sos', 'validacion', 'sistema')),
    titulo text NOT NULL,
    mensaje text NOT NULL,
    referencia_entidad text,
    referencia_id text,
    leida boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notificaciones IS 'Alertas en tiempo real entregadas a la campana de notificaciones de cada usuario.';

-- =============================================================================
-- 4. ÍNDICES DE RENDIMIENTO EN COLUMNAS DE BÚSQUEDA Y FILTRADO
-- =============================================================================

-- Clínicas Veterinarias
CREATE INDEX IF NOT EXISTS idx_clinicas_estado_distrito ON public.clinicas_veterinarias(estado_afiliacion, activa, distrito_cusco);

-- Perfiles de Usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_estado ON public.perfiles_usuarios(rol, estado_cuenta);
CREATE INDEX IF NOT EXISTS idx_usuarios_distrito ON public.perfiles_usuarios(distrito_cusco);
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica ON public.perfiles_usuarios(id_clinica_asociada);

-- Mascotas y Validaciones
CREATE INDEX IF NOT EXISTS idx_mascotas_propietario ON public.mascotas(id_propietario, activa);
CREATE INDEX IF NOT EXISTS idx_mascotas_paw_id ON public.mascotas(paw_id);
CREATE INDEX IF NOT EXISTS idx_mascotas_estado_vet ON public.mascotas(estado_validacion_vet);
CREATE INDEX IF NOT EXISTS idx_validaciones_mascota ON public.validaciones_veterinarias(id_mascota, created_at DESC);

-- Cuidadores, Servicios y Disponibilidad Horaria
CREATE INDEX IF NOT EXISTS idx_cuidadores_estado ON public.perfiles_cuidadores(estado_postulacion, reputacion_promedio DESC);
CREATE INDEX IF NOT EXISTS idx_servicios_cuidador_cat ON public.servicios(id_cuidador, categoria, disponible);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fecha_bloque ON public.disponibilidad_cuidadores(id_cuidador, fecha, bloque_horario, estado_bloque);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_busqueda_fecha ON public.disponibilidad_cuidadores(fecha, estado_bloque);

-- Reservas, Pagos, Liquidaciones y Cancelaciones
CREATE INDEX IF NOT EXISTS idx_reservas_propietario ON public.reservas(id_propietario, estado_reserva, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_cuidador ON public.reservas(id_cuidador, estado_reserva, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_mascota ON public.reservas(id_mascota);
CREATE INDEX IF NOT EXISTS idx_reservas_fechas ON public.reservas(fecha_inicio, fecha_fin, estado_reserva);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON public.pagos(estado_pago, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_cuidador_estado ON public.liquidaciones_cuidadores(id_cuidador, estado_liquidacion, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cancelaciones_reserva_estado ON public.cancelaciones_reembolsos(id_reserva, estado_tramite);

-- Muro de Fotos, S.O.S., Reseñas, Auditoría y Notificaciones
CREATE INDEX IF NOT EXISTS idx_reportes_reserva_fecha ON public.reportes_seguimiento(id_reserva, fecha_reporte DESC);
CREATE INDEX IF NOT EXISTS idx_fotos_reporte ON public.fotos_reporte(id_reporte, orden);
CREATE INDEX IF NOT EXISTS idx_sos_clinica_estado ON public.incidencias_emergencias(id_clinica_derivada, estado_sos, fecha_incidencia DESC);
CREATE INDEX IF NOT EXISTS idx_sos_reserva ON public.incidencias_emergencias(id_reserva);
CREATE INDEX IF NOT EXISTS idx_resenas_cuidador ON public.resenas(id_cuidador, visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad_fecha ON public.auditoria_estados(entidad, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida ON public.notificaciones(id_usuario_destino, leida, created_at DESC);

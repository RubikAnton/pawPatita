-- =============================================================================
-- PAW PATITA CUSCO v5.0 — FASE 2: INFRAESTRUCTURA DE BASE DE DATOS (SUPABASE)
-- Archivo: supabase/02_functions_triggers.sql
-- Descripción: Triggers de sincronización Auth -> Perfiles, triggers automáticos
--              de auditoría forense (old_record / new_record en JSONB),
--              recálculo de reputación y vistas analíticas optimizadas.
-- =============================================================================

-- =============================================================================
-- 1. TRIGGER GENERAL DE UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'configuracion_plataforma',
        'clinicas_veterinarias',
        'perfiles_usuarios',
        'mascotas',
        'perfiles_cuidadores',
        'antecedentes_cuidadores',
        'servicios',
        'disponibilidad_cuidadores',
        'reservas',
        'pagos',
        'liquidaciones_cuidadores',
        'cancelaciones_reembolsos',
        'incidencias_emergencias'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();', t, t);
    END LOOP;
END;
$$;

-- =============================================================================
-- 2. SINCRONIZACIÓN AUTOMÁTICA AUTH.USERS -> PUBLIC.PERFILES_USUARIOS
-- Respeta estado_cuenta = 'pendiente' para postulantes a Cuidador y Clínica
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_rol public.rol_usuario_enum;
    v_estado public.estado_cuenta_enum;
    v_tipo_doc public.tipo_documento_enum;
    v_num_doc text;
    v_auto_create boolean := false;
    v_id_cuidador uuid;
    v_id_clinica uuid;
    v_ruc text;
    v_foto_url text;
    v_foto_hogar_url text;
    v_foto_fachada_url text;
    v_constancia_url text;
    v_doc_identidad_url text;
    v_doc_policial_url text;
    v_doc_penal_url text;
    v_doc_domicilio_url text;
    v_especialidades text[];
BEGIN
    -- 1. Determinar rol desde raw_user_meta_data (por defecto 'propietario')
    BEGIN
        v_rol := COALESCE((NEW.raw_user_meta_data->>'rol')::public.rol_usuario_enum, 'propietario');
    EXCEPTION WHEN OTHERS THEN
        v_rol := 'propietario';
    END;

    -- 2. Los postulantes a cuidador o clínica veterinaria inician en 'pendiente' hasta aprobación del Admin
    IF v_rol IN ('cuidador', 'veterinaria') THEN
        BEGIN
            v_estado := COALESCE((NEW.raw_user_meta_data->>'estado_cuenta')::public.estado_cuenta_enum, 'pendiente');
        EXCEPTION WHEN OTHERS THEN
            v_estado := 'pendiente';
        END;
    ELSE
        BEGIN
            v_estado := COALESCE((NEW.raw_user_meta_data->>'estado_cuenta')::public.estado_cuenta_enum, 'activo');
        EXCEPTION WHEN OTHERS THEN
            v_estado := 'activo';
        END;
    END IF;

    -- 3. Tipo y número de documento con protección contra colisión UNIQUE
    BEGIN
        v_tipo_doc := COALESCE((NEW.raw_user_meta_data->>'tipo_documento')::public.tipo_documento_enum, 'DNI');
    EXCEPTION WHEN OTHERS THEN
        v_tipo_doc := 'DNI';
    END;

    v_num_doc := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'num_documento'), ''), 'DOC-' || SUBSTRING(NEW.id::text, 1, 8));

    IF EXISTS (SELECT 1 FROM public.perfiles_usuarios WHERE num_documento = v_num_doc AND id != NEW.id) THEN
        v_num_doc := v_num_doc || '-' || SUBSTRING(NEW.id::text, 1, 4);
    END IF;

    v_auto_create := COALESCE((NEW.raw_user_meta_data->>'auto_create_perfil')::boolean, false);
    v_foto_url := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'foto_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'foto_perfil_url'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), '')
    );
    v_foto_hogar_url := NULLIF(TRIM(NEW.raw_user_meta_data->>'foto_hogar_url'), '');
    v_foto_fachada_url := NULLIF(TRIM(NEW.raw_user_meta_data->>'foto_fachada_url'), '');
    v_constancia_url := NULLIF(TRIM(NEW.raw_user_meta_data->>'constancia_url'), '');

    -- 4. Si es postulación de clínica veterinaria, crear o vincular clínica en clinicas_veterinarias
    IF v_rol = 'veterinaria' AND v_auto_create THEN
        v_ruc := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'ruc'), ''), '20' || LPAD((floor(random() * 899999999) + 100000000)::text, 9, '0'));

        IF jsonb_typeof(NEW.raw_user_meta_data->'especialidades') = 'array' THEN
            SELECT ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'especialidades'))
            INTO v_especialidades;
        END IF;
        IF v_especialidades IS NULL OR array_length(v_especialidades, 1) IS NULL THEN
            v_especialidades := ARRAY['Emergencias 24h', 'Medicina General'];
        END IF;

        BEGIN
            INSERT INTO public.clinicas_veterinarias (
                ruc, nombre, email_institucional, direccion, distrito_cusco,
                telefono_emergencia, horario_atencion, especialidades,
                tarifa_consulta_emergencia, foto_fachada_url, constancia_url,
                colegiatura_cmvp, estado_afiliacion, activa
            )
            VALUES (
                v_ruc,
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre_clinica'), ''), 'Clínica Veterinaria ' || COALESCE(NEW.raw_user_meta_data->>'nombre', 'Cusco')),
                NEW.email,
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'direccion'), ''), 'Cusco, Perú'),
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'distrito_cusco'), ''), 'Cusco Centro'),
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), ''), '984000000'),
                COALESCE((NEW.raw_user_meta_data->>'horario_atencion')::public.horario_clinica_enum, '24 Horas'),
                v_especialidades,
                GREATEST(COALESCE((NEW.raw_user_meta_data->>'tarifa_consulta_emergencia')::numeric, 60.00), 10.00),
                v_foto_fachada_url,
                v_constancia_url,
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'colegiatura_cmvp'), ''), 'CMVP-CUSCO'),
                'pendiente',
                false
            )
            ON CONFLICT (ruc) DO NOTHING
            RETURNING id INTO v_id_clinica;

            IF v_id_clinica IS NULL THEN
                SELECT id INTO v_id_clinica
                FROM public.clinicas_veterinarias
                WHERE ruc = v_ruc OR email_institucional = NEW.email
                LIMIT 1;

                IF v_id_clinica IS NOT NULL THEN
                    UPDATE public.clinicas_veterinarias
                    SET foto_fachada_url = COALESCE(v_foto_fachada_url, foto_fachada_url),
                        constancia_url = COALESCE(v_constancia_url, constancia_url)
                    WHERE id = v_id_clinica;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            SELECT id INTO v_id_clinica
            FROM public.clinicas_veterinarias
            WHERE ruc = v_ruc OR email_institucional = NEW.email
            LIMIT 1;
        END;
    END IF;

    -- 5. Insertar o sincronizar perfil en public.perfiles_usuarios
    INSERT INTO public.perfiles_usuarios (
        id,
        nombre,
        apellido,
        email,
        telefono,
        rol,
        es_turista,
        tipo_documento,
        num_documento,
        pais_origen,
        idioma_preferido,
        direccion,
        distrito_cusco,
        hospedaje_hotel_cusco,
        contacto_emergencia_nombre,
        contacto_emergencia_tel,
        id_clinica_asociada,
        avatar_url,
        tyc_version_aceptada,
        estado_cuenta
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre'), ''), split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), ''), '984000000'),
        v_rol,
        COALESCE((NEW.raw_user_meta_data->>'es_turista')::boolean, false),
        v_tipo_doc,
        v_num_doc,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'pais_origen'), ''), 'Perú'),
        CASE WHEN UPPER(COALESCE(NEW.raw_user_meta_data->>'idioma_preferido', 'ES')) = 'EN' THEN 'EN' ELSE 'ES' END,
        NEW.raw_user_meta_data->>'direccion',
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'distrito_cusco'), ''), 'Cusco Centro'),
        NEW.raw_user_meta_data->>'hospedaje_hotel_cusco',
        NEW.raw_user_meta_data->>'contacto_emergencia_nombre',
        NEW.raw_user_meta_data->>'contacto_emergencia_tel',
        v_id_clinica,
        v_foto_url,
        COALESCE(NEW.raw_user_meta_data->>'tyc_version_aceptada', 'v5.1'),
        v_estado
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.perfiles_usuarios.avatar_url),
        id_clinica_asociada = COALESCE(public.perfiles_usuarios.id_clinica_asociada, EXCLUDED.id_clinica_asociada);

    -- 6. Si es postulación de cuidador, crear expediente en perfiles_cuidadores y antecedentes_cuidadores
    IF v_rol = 'cuidador' AND v_auto_create THEN
        BEGIN
            INSERT INTO public.perfiles_cuidadores (
                id_usuario, presentacion_corta, descripcion_experiencia, anios_experiencia,
                tipo_vivienda, capacidad_max_mascotas, estado_postulacion,
                foto_url, foto_hogar_url, cuenta_cobro_tipo, cuenta_cobro_numero
            )
            VALUES (
                NEW.id,
                COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'presentacion_corta'), ''),
                    'Cuidador independiente postulante en ' || COALESCE(NEW.raw_user_meta_data->>'distrito_cusco', 'Cusco')
                ),
                COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'descripcion_experiencia'), ''),
                    'Experiencia reportada en postulación web Paw Patita Cusco.'
                ),
                GREATEST(COALESCE((NEW.raw_user_meta_data->>'anios_experiencia')::integer, 2), 0),
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'tipo_vivienda'), ''), 'Casa con patio cercado'),
                LEAST(GREATEST(COALESCE((NEW.raw_user_meta_data->>'capacidad_max_mascotas')::integer, 3), 1), 10),
                'pendiente',
                v_foto_url,
                v_foto_hogar_url,
                'Yape',
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), ''), '984000000')
            )
            ON CONFLICT (id_usuario) DO UPDATE SET
                foto_url = COALESCE(EXCLUDED.foto_url, public.perfiles_cuidadores.foto_url),
                foto_hogar_url = COALESCE(EXCLUDED.foto_hogar_url, public.perfiles_cuidadores.foto_hogar_url)
            RETURNING id INTO v_id_cuidador;

            IF v_id_cuidador IS NULL THEN
                SELECT id INTO v_id_cuidador FROM public.perfiles_cuidadores WHERE id_usuario = NEW.id LIMIT 1;
            END IF;

            IF v_id_cuidador IS NOT NULL THEN
                v_doc_identidad_url := COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_identidad_url'), ''),
                    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700'
                );
                v_doc_policial_url := COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_antecedentes_policiales_url'), ''),
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_policial_url'), ''),
                    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700'
                );
                v_doc_penal_url := COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_antecedentes_penales_url'), ''),
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_penal_url'), ''),
                    'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700'
                );
                v_doc_domicilio_url := COALESCE(
                    NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_domicilio_url'), ''),
                    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700'
                );

                INSERT INTO public.antecedentes_cuidadores (
                    id_cuidador, doc_identidad_url, doc_antecedentes_policiales_url,
                    doc_antecedentes_penales_url, doc_domicilio_url, declaracion_jurada, estado_verificacion
                )
                VALUES (
                    v_id_cuidador,
                    v_doc_identidad_url,
                    v_doc_policial_url,
                    v_doc_penal_url,
                    v_doc_domicilio_url,
                    true,
                    'pendiente'
                )
                ON CONFLICT (id_cuidador) DO UPDATE SET
                    doc_identidad_url = COALESCE(NULLIF(TRIM(EXCLUDED.doc_identidad_url), ''), public.antecedentes_cuidadores.doc_identidad_url),
                    doc_antecedentes_policiales_url = COALESCE(NULLIF(TRIM(EXCLUDED.doc_antecedentes_policiales_url), ''), public.antecedentes_cuidadores.doc_antecedentes_policiales_url),
                    doc_antecedentes_penales_url = COALESCE(NULLIF(TRIM(EXCLUDED.doc_antecedentes_penales_url), ''), public.antecedentes_cuidadores.doc_antecedentes_penales_url),
                    doc_domicilio_url = COALESCE(NULLIF(TRIM(EXCLUDED.doc_domicilio_url), ''), public.antecedentes_cuidadores.doc_domicilio_url);

                IF NOT EXISTS (SELECT 1 FROM public.servicios WHERE id_cuidador = v_id_cuidador) THEN
                    INSERT INTO public.servicios (
                        id_cuidador, categoria, tipo_servicio, descripcion_servicio, tarifa_diaria_por_perro, disponible
                    )
                    VALUES (
                        v_id_cuidador,
                        'Paseo',
                        'Paseo y Custodia Familiar en ' || COALESCE(NEW.raw_user_meta_data->>'distrito_cusco', 'Cusco'),
                        'Servicio personalizado con reportes fotográficos en el Muro en Vivo.',
                        GREATEST(COALESCE((NEW.raw_user_meta_data->>'tarifa_inicial')::numeric, 35.00), 15.00),
                        true
                    );
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================================================
-- 3. TRIGGER AUTOMÁTICO DE AUDITORÍA GLOBAL (auditoria_estados)
-- Captura old_record y new_record en JSONB y resuelve el actor autenticado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_auditar_cambio_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_actor_id uuid;
    v_actor_nombre text := 'Sistema Automático';
    v_actor_rol text := 'sistema';
    v_id_registro text;
    v_estado_anterior text := NULL;
    v_estado_nuevo text := NULL;
    v_accion text;
    v_detalle text;
    v_old_json jsonb := NULL;
    v_new_json jsonb := NULL;
    v_columna_estado text;
BEGIN
    v_columna_estado := TG_ARGV[0];
    v_actor_id := auth.uid();

    IF v_actor_id IS NOT NULL THEN
        SELECT TRIM(nombre || ' ' || COALESCE(apellido, '')), rol::text
        INTO v_actor_nombre, v_actor_rol
        FROM public.perfiles_usuarios
        WHERE id = v_actor_id;

        v_actor_nombre := COALESCE(v_actor_nombre, 'Usuario Autenticado');
        v_actor_rol := COALESCE(v_actor_rol, 'autenticado');
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new_json := to_jsonb(NEW);
        v_estado_nuevo := v_new_json->>v_columna_estado;
        v_accion := 'CREACION';
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_json := to_jsonb(OLD);
        v_new_json := to_jsonb(NEW);
        v_estado_anterior := v_old_json->>v_columna_estado;
        v_estado_nuevo := v_new_json->>v_columna_estado;

        -- Solo registrar en UPDATE si cambió la columna de estado auditada
        IF v_estado_anterior IS NOT DISTINCT FROM v_estado_nuevo THEN
            RETURN NEW;
        END IF;
        v_accion := 'TRANSICION_ESTADO';
    ELSE
        RETURN NULL;
    END IF;

    -- Obtener código legible o UUID como identificador del registro
    v_id_registro := COALESCE(
        v_new_json->>'codigo_reserva',
        v_new_json->>'codigo_pago',
        v_new_json->>'codigo_liquidacion',
        v_new_json->>'codigo_cancelacion',
        v_new_json->>'codigo_sos',
        v_new_json->>'paw_id',
        v_new_json->>'codigo_cuidador',
        v_new_json->>'codigo_clinica',
        v_new_json->>'id'
    );

    v_detalle := CASE
        WHEN TG_OP = 'INSERT' THEN format('Alta en %s (%s) con estado inicial [%s]', TG_TABLE_NAME, v_id_registro, COALESCE(v_estado_nuevo, 'N/A'))
        ELSE format('Cambio en %s (%s): [%s] -> [%s]', TG_TABLE_NAME, v_id_registro, COALESCE(v_estado_anterior, 'N/A'), COALESCE(v_estado_nuevo, 'N/A'))
    END;

    INSERT INTO public.auditoria_estados (
        entidad,
        id_registro,
        accion,
        estado_anterior,
        estado_nuevo,
        actor_id,
        actor_nombre,
        actor_rol,
        detalle,
        old_record,
        new_record,
        metadata
    )
    VALUES (
        TG_TABLE_NAME,
        v_id_registro,
        v_accion,
        v_estado_anterior,
        v_estado_nuevo,
        v_actor_id,
        v_actor_nombre,
        v_actor_rol,
        v_detalle,
        v_old_json,
        v_new_json,
        jsonb_build_object('operacion_sql', TG_OP, 'columna_auditada', v_columna_estado, 'timestamp_utc', now())
    );

    RETURN NEW;
END;
$$;

-- Asociación de triggers de auditoría a las 8 entidades críticas
DROP TRIGGER IF EXISTS trg_audit_reservas ON public.reservas;
CREATE TRIGGER trg_audit_reservas
    AFTER INSERT OR UPDATE ON public.reservas
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_reserva');

DROP TRIGGER IF EXISTS trg_audit_pagos ON public.pagos;
CREATE TRIGGER trg_audit_pagos
    AFTER INSERT OR UPDATE ON public.pagos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_pago');

DROP TRIGGER IF EXISTS trg_audit_liquidaciones ON public.liquidaciones_cuidadores;
CREATE TRIGGER trg_audit_liquidaciones
    AFTER INSERT OR UPDATE ON public.liquidaciones_cuidadores
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_liquidacion');

DROP TRIGGER IF EXISTS trg_audit_cuidadores ON public.perfiles_cuidadores;
CREATE TRIGGER trg_audit_cuidadores
    AFTER INSERT OR UPDATE ON public.perfiles_cuidadores
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_postulacion');

DROP TRIGGER IF EXISTS trg_audit_clinicas ON public.clinicas_veterinarias;
CREATE TRIGGER trg_audit_clinicas
    AFTER INSERT OR UPDATE ON public.clinicas_veterinarias
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_afiliacion');

DROP TRIGGER IF EXISTS trg_audit_mascotas ON public.mascotas;
CREATE TRIGGER trg_audit_mascotas
    AFTER INSERT OR UPDATE ON public.mascotas
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_validacion_vet');

DROP TRIGGER IF EXISTS trg_audit_sos ON public.incidencias_emergencias;
CREATE TRIGGER trg_audit_sos
    AFTER INSERT OR UPDATE ON public.incidencias_emergencias
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_sos');

DROP TRIGGER IF EXISTS trg_audit_cancelaciones ON public.cancelaciones_reembolsos;
CREATE TRIGGER trg_audit_cancelaciones
    AFTER INSERT OR UPDATE ON public.cancelaciones_reembolsos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_cambio_estado('estado_tramite');

-- =============================================================================
-- 4. TRIGGER DE RECÁLCULO AUTOMÁTICO DE REPUTACIÓN DEL CUIDADOR
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_recalcular_reputacion_cuidador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_cuidador uuid;
    v_promedio numeric(3,2);
    v_total integer;
BEGIN
    v_id_cuidador := COALESCE(NEW.id_cuidador, OLD.id_cuidador);

    SELECT
        COALESCE(ROUND(AVG(calificacion_estrellas)::numeric, 2), 5.00),
        COUNT(*)::integer
    INTO v_promedio, v_total
    FROM public.resenas
    WHERE id_cuidador = v_id_cuidador
      AND visible = true;

    UPDATE public.perfiles_cuidadores
    SET reputacion_promedio = v_promedio,
        total_resenas = v_total,
        updated_at = now()
    WHERE id = v_id_cuidador;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_resenas_reputacion ON public.resenas;
CREATE TRIGGER trg_resenas_reputacion
    AFTER INSERT OR UPDATE OR DELETE ON public.resenas
    FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_reputacion_cuidador();

-- =============================================================================
-- 5. TRIGGER DE SINCRONIZACIÓN DE ESTADO DE BLOQUE HORARIO (disponibilidad_cuidadores)
-- Calcula automáticamente disponible / parcial / lleno según cupos_reservados
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_sincronizar_estado_bloque()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.estado_bloque != 'bloqueado' THEN
        IF NEW.cupos_reservados >= NEW.cupo_maximo THEN
            NEW.estado_bloque := 'lleno';
        ELSIF NEW.cupos_reservados > 0 THEN
            NEW.estado_bloque := 'parcial';
        ELSE
            NEW.estado_bloque := 'disponible';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disponibilidad_estado_bloque ON public.disponibilidad_cuidadores;
CREATE TRIGGER trg_disponibilidad_estado_bloque
    BEFORE INSERT OR UPDATE ON public.disponibilidad_cuidadores
    FOR EACH ROW EXECUTE FUNCTION public.fn_sincronizar_estado_bloque();

-- =============================================================================
-- 5B. TRIGGER DE VALIDACIÓN DE REPORTES DEL MURO EN VIVO (reportes_seguimiento)
-- Rechaza publicaciones en el Muro si la reserva asociada no está 'en_curso'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_validar_reporte_reserva_en_curso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado public.estado_reserva_enum;
    v_codigo text;
BEGIN
    SELECT estado_reserva, codigo_reserva
    INTO v_estado, v_codigo
    FROM public.reservas
    WHERE id = NEW.id_reserva;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La reserva asociada al reporte no existe.';
    END IF;

    -- Permitir el reporte automático de 'Check-Out' cuando la reserva acaba de pasar a 'finalizada'
    IF NEW.tipo_evento = 'Check-Out' AND v_estado IN ('en_curso', 'finalizada') THEN
        RETURN NEW;
    END IF;

    IF v_estado != 'en_curso' THEN
        RAISE EXCEPTION 'Solo se pueden publicar reportes en el Muro cuando la reserva (%) se encuentra En Curso (estado actual: %).',
            v_codigo, v_estado;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_reporte_en_curso ON public.reportes_seguimiento;
CREATE TRIGGER trg_validar_reporte_en_curso
    BEFORE INSERT ON public.reportes_seguimiento
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_reporte_reserva_en_curso();

-- =============================================================================
-- 6. VISTAS ANALÍTICAS Y OPERATIVAS SEGURAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- VISTA 1: v_catalogo_cuidadores
-- Alimenta el Catálogo Público, Filtros Combinados y Mapa Leaflet de Cusco
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_catalogo_cuidadores AS
SELECT
    pc.id AS id_cuidador,
    pc.codigo_cuidador,
    pc.id_usuario,
    TRIM(pu.nombre || ' ' || COALESCE(pu.apellido, '')) AS nombre_completo,
    pu.nombre,
    pu.apellido,
    pu.distrito_cusco,
    pu.telefono,
    pc.presentacion_corta,
    pc.descripcion_experiencia,
    pc.anios_experiencia,
    pc.especialidades,
    pc.idiomas,
    pc.tipo_vivienda,
    pc.capacidad_max_mascotas,
    pc.acepta_cachorros,
    pc.acepta_medicacion_oral,
    pc.latitud,
    pc.longitud,
    pc.reputacion_promedio,
    pc.total_resenas,
    pc.estado_postulacion,
    COALESCE(pc.foto_url, pu.avatar_url) AS foto_url,
    pc.foto_hogar_url,
    pc.disponibilidad_semanal,
    COALESCE(srv_agg.hu_ecode_principal, 'HU-000') AS hu_ecode_principal,
    COALESCE(srv_agg.tarifa_minima, 35.00) AS tarifa_minima,
    COALESCE(srv_agg.tarifa_maxima, 70.00) AS tarifa_maxima,
    COALESCE(srv_agg.ofrece_recojo_hotel, false) AS ofrece_recojo_hotel,
    COALESCE(srv_agg.categorias, ARRAY[]::text[]) AS categorias_servicio,
    COALESCE(srv_agg.servicios_json, '[]'::jsonb) AS servicios_disponibles
FROM public.perfiles_cuidadores pc
JOIN public.perfiles_usuarios pu ON pu.id = pc.id_usuario
LEFT JOIN LATERAL (
    SELECT
        (ARRAY_AGG(s.hu_ecode ORDER BY s.tarifa_diaria_por_perro ASC))[1] AS hu_ecode_principal,
        MIN(s.tarifa_diaria_por_perro) AS tarifa_minima,
        MAX(s.tarifa_diaria_por_perro) AS tarifa_maxima,
        BOOL_OR(s.incluye_recojo_hotel) AS ofrece_recojo_hotel,
        ARRAY_AGG(DISTINCT s.categoria) AS categorias,
        jsonb_agg(
            jsonb_build_object(
                'id_oferta', s.id,
                'hu_ecode', s.hu_ecode,
                'categoria', s.categoria,
                'tipo_servicio', s.tipo_servicio,
                'descripcion_servicio', s.descripcion_servicio,
                'tarifa_diaria_por_perro', s.tarifa_diaria_por_perro,
                'incluye_recojo_hotel', s.incluye_recojo_hotel,
                'tarifa_recojo_extra', s.tarifa_recojo_extra
            ) ORDER BY s.tarifa_diaria_por_perro ASC
        ) AS servicios_json
    FROM public.servicios s
    WHERE s.id_cuidador = pc.id
      AND s.disponible = true
) srv_agg ON true
WHERE pc.estado_postulacion = 'aprobado'
  AND pu.estado_cuenta = 'activo';

COMMENT ON VIEW public.v_catalogo_cuidadores IS 'Catálogo público de cuidadores aprobados en Cusco con precios mínimos, coordenadas Leaflet y ofertas activas.';

-- -----------------------------------------------------------------------------
-- VISTA 2: v_billetera_cuidador
-- Conciliación exacta al céntimo: Garantía, Disponible, Solicitado y Pagado
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_billetera_cuidador AS
SELECT
    pc.id AS id_cuidador,
    pc.codigo_cuidador,
    pc.id_usuario,
    TRIM(pu.nombre || ' ' || COALESCE(pu.apellido, '')) AS nombre_cuidador,
    pc.cuenta_cobro_tipo,
    pc.cuenta_cobro_numero,
    COALESCE(SUM(l.monto_liquidado) FILTER (WHERE l.estado_liquidacion = 'en_garantia'), 0.00)::numeric(12,2) AS saldo_en_garantia,
    COALESCE(SUM(l.monto_liquidado) FILTER (WHERE l.estado_liquidacion = 'disponible'), 0.00)::numeric(12,2) AS saldo_disponible_retiro,
    COALESCE(SUM(l.monto_liquidado) FILTER (WHERE l.estado_liquidacion = 'solicitado'), 0.00)::numeric(12,2) AS saldo_en_proceso_retiro,
    COALESCE(SUM(l.monto_liquidado) FILTER (WHERE l.estado_liquidacion = 'pagado'), 0.00)::numeric(12,2) AS total_historico_cobrado,
    COUNT(l.id) FILTER (WHERE l.estado_liquidacion = 'disponible')::integer AS items_disponibles,
    COUNT(l.id) FILTER (WHERE l.estado_liquidacion = 'solicitado')::integer AS items_solicitados,
    COUNT(l.id) FILTER (WHERE l.estado_liquidacion = 'pagado')::integer AS items_pagados
FROM public.perfiles_cuidadores pc
JOIN public.perfiles_usuarios pu ON pu.id = pc.id_usuario
LEFT JOIN public.liquidaciones_cuidadores l ON l.id_cuidador = pc.id
GROUP BY pc.id, pc.codigo_cuidador, pc.id_usuario, pu.nombre, pu.apellido, pc.cuenta_cobro_tipo, pc.cuenta_cobro_numero;

COMMENT ON VIEW public.v_billetera_cuidador IS 'Resumen financiero exacto por cuidador: Saldo en Garantía, Disponible para Retiro, En Proceso y Total Histórico Cobrado.';

-- -----------------------------------------------------------------------------
-- VISTA 3: v_resumen_mascotas
-- Ficha PAW-ID enriquecida con cálculo dinámico de edad en años y meses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_resumen_mascotas AS
SELECT
    m.id,
    m.paw_id,
    m.id_propietario,
    TRIM(pu.nombre || ' ' || COALESCE(pu.apellido, '')) AS propietario_nombre,
    pu.telefono AS propietario_telefono,
    pu.distrito_cusco AS propietario_distrito,
    pu.contacto_emergencia_nombre,
    pu.contacto_emergencia_tel,
    m.nombre,
    m.raza,
    m.fecha_nacimiento,
    EXTRACT(YEAR FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer AS edad_anios,
    EXTRACT(MONTH FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer AS edad_meses,
    CASE
        WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer = 0 THEN
            GREATEST(EXTRACT(MONTH FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer, 1)::text || ' mes(es)'
        WHEN EXTRACT(MONTH FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer = 0 THEN
            EXTRACT(YEAR FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer::text || ' año(s)'
        ELSE
            EXTRACT(YEAR FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer::text || ' año(s) y ' ||
            EXTRACT(MONTH FROM age(CURRENT_DATE, m.fecha_nacimiento))::integer::text || ' mes(es)'
    END AS edad_formateada,
    (age(CURRENT_DATE, m.fecha_nacimiento) < INTERVAL '1 year') AS es_cachorro,
    m.tamano,
    m.sexo,
    m.peso_kg,
    m.esterilizado,
    m.vacunas_al_dia,
    m.fecha_venc_vacunas,
    m.cartilla_vacunas_url,
    m.alergias_restricciones,
    m.medicacion_actual,
    m.dieta_alimentacion,
    m.conducta_observaciones,
    m.foto_url,
    m.estado_validacion_vet,
    m.id_clinica_validadora,
    cv.nombre AS clinica_validadora_nombre,
    cv.colegiatura_cmvp AS clinica_validadora_cmvp,
    m.observacion_veterinaria,
    m.fecha_ultima_validacion,
    m.activa,
    m.created_at
FROM public.mascotas m
JOIN public.perfiles_usuarios pu ON pu.id = m.id_propietario
LEFT JOIN public.clinicas_veterinarias cv ON cv.id = m.id_clinica_validadora;

COMMENT ON VIEW public.v_resumen_mascotas IS 'Vista enriquecida de mascotas con edad dinámica exacta (años y meses), indicador de cachorro y clínica validadora.';

-- =============================================================================
-- PAW PATITA CUSCO v5.0 — SCRIPT DE REPARACIÓN DEFINITIVA DE SUPABASE AUTH (GoTrue)
-- Archivo: supabase/07_fix_auth_and_audit.sql
-- Propósito:
--   1. Soluciona de raíz el error "Database error querying schema" en signInWithPassword:
--      - Reemplaza valores NULL por '' (cadena vacía) en las columnas de tokens de
--        auth.users que el ORM de GoTrue (Go database/sql) exige como string no nulo:
--        confirmation_token, recovery_token, email_change_token_new, email_change,
--        email_change_token_current, phone_change, phone_change_token, reauthentication_token.
--      - Normaliza is_sso_user = false, is_anonymous = false, email_change_confirm_status = 0,
--        instance_id = '00000000-0000-0000-0000-000000000000', aud = 'authenticated',
--        role = 'authenticated' y email_confirmed_at.
--   2. Sincroniza la tabla auth.identities (provider = 'email', provider_id = user.id::text,
--      identity_data JSONB) para todas las cuentas de auth.users.
--   3. Otorga permisos explícitos (GRANT USAGE/SELECT/ALL/EXECUTE) sobre el esquema public,
--      tablas, vistas, secuencias y funciones a anon, authenticated, service_role y
--      supabase_auth_admin (manteniendo RLS activo al 100%).
--   4. Endurece el trigger public.handle_new_auth_user() para evitar colisiones de
--      num_documento y crear automáticamente expedientes de cuidadores y clínicas postulantes.
--   5. Habilita de forma idempotente Supabase Realtime en incidencias_emergencias,
--      notificaciones y reportes_seguimiento.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. PERMISOS EXPLÍCITOS SOBRE ESQUEMA PUBLIC, TABLAS, SECUENCIAS Y FUNCIONES
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role, supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

GRANT SELECT ON public.v_catalogo_cuidadores TO anon, authenticated;
GRANT SELECT ON public.v_billetera_cuidador TO authenticated;
GRANT SELECT ON public.v_resumen_mascotas TO authenticated;

-- =============================================================================
-- 2. ENDURECIMIENTO DEL TRIGGER public.handle_new_auth_user()
--    - Califica tipos ENUM con esquema public.
--    - Evita errores de restricción UNIQUE en num_documento durante signUp.
--    - Auto-crea perfiles_cuidadores / antecedentes_cuidadores / clinicas_veterinarias
--      cuando un postulante se registra desde la interfaz web.
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
BEGIN
    -- 1. Determinar rol desde raw_user_meta_data (por defecto 'propietario')
    BEGIN
        v_rol := COALESCE((NEW.raw_user_meta_data->>'rol')::public.rol_usuario_enum, 'propietario');
    EXCEPTION WHEN OTHERS THEN
        v_rol := 'propietario';
    END;

    -- 2. Determinar estado inicial de cuenta
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

    -- 4. Si es postulación directa de clínica veterinaria desde la web, crear o vincular clínica
    v_auto_create := COALESCE((NEW.raw_user_meta_data->>'auto_create_perfil')::boolean, false);

    IF v_rol = 'veterinaria' AND v_auto_create THEN
        v_ruc := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'ruc'), ''), '20' || LPAD((floor(random() * 899999999) + 100000000)::text, 9, '0'));
        SELECT id INTO v_id_clinica FROM public.clinicas_veterinarias WHERE ruc = v_ruc OR email_institucional = NEW.email LIMIT 1;

        IF v_id_clinica IS NULL THEN
            BEGIN
                INSERT INTO public.clinicas_veterinarias (
                    ruc,
                    nombre,
                    email_institucional,
                    direccion,
                    distrito_cusco,
                    telefono_emergencia,
                    horario_atencion,
                    especialidades,
                    tarifa_consulta_emergencia,
                    colegiatura_cmvp,
                    estado_afiliacion,
                    activa
                )
                VALUES (
                    v_ruc,
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'nombre_clinica'), ''), 'Clínica Veterinaria ' || COALESCE(NEW.raw_user_meta_data->>'nombre', 'Cusco')),
                    NEW.email,
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'direccion'), ''), 'Cusco, Perú'),
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'distrito_cusco'), ''), 'Cusco Centro'),
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), ''), '984000000'),
                    COALESCE((NEW.raw_user_meta_data->>'horario_atencion')::public.horario_clinica_enum, '24 Horas'),
                    ARRAY['Emergencias 24h', 'Medicina General'],
                    GREATEST(COALESCE((NEW.raw_user_meta_data->>'tarifa_consulta_emergencia')::numeric, 60.00), 10.00),
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'colegiatura_cmvp'), ''), 'CMVP-CUSCO'),
                    'pendiente',
                    false
                )
                RETURNING id INTO v_id_clinica;
            EXCEPTION WHEN OTHERS THEN
                v_id_clinica := NULL;
            END;
        END IF;
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
        COALESCE(NEW.raw_user_meta_data->>'tyc_version_aceptada', 'v5.0'),
        v_estado
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        id_clinica_asociada = COALESCE(public.perfiles_usuarios.id_clinica_asociada, EXCLUDED.id_clinica_asociada);

    -- 6. Si es postulación directa de cuidador desde la web, crear expediente en perfiles_cuidadores y antecedentes_cuidadores
    IF v_rol = 'cuidador' AND v_auto_create THEN
        BEGIN
            INSERT INTO public.perfiles_cuidadores (
                id_usuario,
                presentacion_corta,
                descripcion_experiencia,
                anios_experiencia,
                tipo_vivienda,
                capacidad_max_mascotas,
                estado_postulacion,
                cuenta_cobro_tipo,
                cuenta_cobro_numero
            )
            VALUES (
                NEW.id,
                'Cuidador independiente postulante en ' || COALESCE(NEW.raw_user_meta_data->>'distrito_cusco', 'Cusco'),
                'Experiencia reportada en postulación web Paw Patita Cusco.',
                GREATEST(COALESCE((NEW.raw_user_meta_data->>'anios_experiencia')::integer, 2), 0),
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'tipo_vivienda'), ''), 'Casa con patio cercado'),
                LEAST(GREATEST(COALESCE((NEW.raw_user_meta_data->>'capacidad_max_mascotas')::integer, 3), 1), 10),
                'pendiente',
                'Yape',
                COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), ''), '984000000')
            )
            ON CONFLICT (id_usuario) DO NOTHING
            RETURNING id INTO v_id_cuidador;

            IF v_id_cuidador IS NOT NULL THEN
                INSERT INTO public.antecedentes_cuidadores (
                    id_cuidador,
                    doc_identidad_url,
                    doc_antecedentes_policiales_url,
                    doc_antecedentes_penales_url,
                    doc_domicilio_url,
                    declaracion_jurada,
                    estado_verificacion
                )
                VALUES (
                    v_id_cuidador,
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_identidad_url'), ''), 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700'),
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_policial_url'), ''), 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700'),
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_penal_url'), ''), 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700'),
                    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'doc_domicilio_url'), ''), 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700'),
                    true,
                    'pendiente'
                )
                ON CONFLICT (id_cuidador) DO NOTHING;

                INSERT INTO public.servicios (
                    id_cuidador,
                    categoria,
                    tipo_servicio,
                    descripcion_servicio,
                    tarifa_diaria_por_perro,
                    disponible
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
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. SANEAMIENTO DE COLUMNAS NULL EN auth.users (CAUSA RAÍZ DE GoTrue Error 500)
-- =============================================================================

-- 3.1 Garantizar que las 13 cuentas semilla existen con todas las columnas de tokens en ''
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_token, recovery_token,
    email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
    -- 1. Administrador Principal (Demo Admin)
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
     'admin@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Rodrigo","apellido":"Quispe Monzón","rol":"administrador","estado_cuenta":"activo","num_documento":"44112233","distrito_cusco":"Cusco Centro"}'::jsonb, now(), now()),

    -- 2. Propietario Local Cusco (Demo Propietario)
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
     'lucia.mendoza@gmail.com', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Lucía","apellido":"Mendoza Vargas","rol":"propietario","estado_cuenta":"activo","num_documento":"72849102","distrito_cusco":"Wanchaq"}'::jsonb, now(), now()),

    -- 3. Propietario Turista en Cusco
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
     'martin.dupont@france.fr', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Martin","apellido":"Dupont","rol":"propietario","es_turista":true,"tipo_documento":"Pasaporte","num_documento":"FR9928172","pais_origen":"Francia","idioma_preferido":"EN","distrito_cusco":"Cusco Centro","hospedaje_hotel_cusco":"Hotel Palacio del Inka Cusco"}'::jsonb, now(), now()),

    -- 4. Clínica Veterinaria Activa (Demo Veterinaria - VET-001)
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
     'vet.sanfrancisco@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Dra. Claudia","apellido":"Salazar Cáceres","rol":"veterinaria","estado_cuenta":"activo","num_documento":"41928374","distrito_cusco":"Wanchaq"}'::jsonb, now(), now()),

    -- 5. Clínica Veterinaria Pendiente (VET-005)
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
     'postulacion@sacsayhuamanvet.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Dr. Marco","apellido":"Paredes Ttito","rol":"veterinaria","estado_cuenta":"pendiente","num_documento":"43918273","distrito_cusco":"San Blas"}'::jsonb, now(), now()),

    -- 6..11. Los 6 Cuidadores Aprobados (CUID-001 es el Demo Cuidador)
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated',
     'valeria.cuidadora@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Valeria","apellido":"Huamán Delgado","rol":"cuidador","estado_cuenta":"activo","num_documento":"71029384","distrito_cusco":"Wanchaq"}'::jsonb, now(), now()),

    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated',
     'diego.alvarez@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Diego","apellido":"Álvarez Tupayachi","rol":"cuidador","estado_cuenta":"activo","num_documento":"72039485","distrito_cusco":"Cusco Centro"}'::jsonb, now(), now()),

    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated',
     'camila.rojas@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Camila","apellido":"Rojas Yábar","rol":"cuidador","estado_cuenta":"activo","num_documento":"73049586","distrito_cusco":"San Sebastián"}'::jsonb, now(), now()),

    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated',
     'mateo.cornejo@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Mateo","apellido":"Cornejo Paz","rol":"cuidador","estado_cuenta":"activo","num_documento":"74059687","distrito_cusco":"San Jerónimo"}'::jsonb, now(), now()),

    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated',
     'sofia.aguilar@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Sofía","apellido":"Aguilar Bellido","rol":"cuidador","estado_cuenta":"activo","num_documento":"75069788","distrito_cusco":"Santiago"}'::jsonb, now(), now()),

    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000016', 'authenticated', 'authenticated',
     'andres.zevallos@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Andrés","apellido":"Zevallos Kalinowski","rol":"cuidador","estado_cuenta":"activo","num_documento":"76079889","distrito_cusco":"San Blas"}'::jsonb, now(), now()),

    -- 12..13. Dos Cuidadores Pendientes de Aprobación
    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000017', 'authenticated', 'authenticated',
     'jorge.postulante@gmail.com', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Jorge","apellido":"Chávez Condori","rol":"cuidador","estado_cuenta":"pendiente","num_documento":"77089990","distrito_cusco":"Poroy"}'::jsonb, now(), now()),

    ('00000000-0000-0000-0000-000000000000'::uuid, '50000000-0000-0000-0000-000000000018', 'authenticated', 'authenticated',
     'elena.postulante@gmail.com', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"nombre":"Elena","apellido":"Mamani Ormachea","rol":"cuidador","estado_cuenta":"pendiente","num_documento":"78091091","distrito_cusco":"Saylla"}'::jsonb, now(), now())
ON CONFLICT (id) DO UPDATE SET
    instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
    aud = 'authenticated',
    role = 'authenticated',
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    recovery_token = COALESCE(auth.users.recovery_token, ''),
    email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
    email_change = COALESCE(auth.users.email_change, ''),
    raw_app_meta_data = COALESCE(auth.users.raw_app_meta_data, EXCLUDED.raw_app_meta_data),
    updated_at = now();

-- 3.2 Saneamiento masivo de TODAS las columnas de tokens y flags en auth.users
UPDATE auth.users
SET
    instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
    aud = COALESCE(NULLIF(aud, ''), 'authenticated'),
    role = COALESCE(NULLIF(role, ''), 'authenticated'),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
    updated_at = now();

-- 3.3 Saneamiento dinámico de columnas adicionales de GoTrue v2 (phone_change, reauthentication_token, etc.)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_token_current') THEN
        EXECUTE 'UPDATE auth.users SET email_change_token_current = COALESCE(email_change_token_current, '''') WHERE email_change_token_current IS NULL;';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change') THEN
        EXECUTE 'UPDATE auth.users SET phone_change = COALESCE(phone_change, '''') WHERE phone_change IS NULL;';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change_token') THEN
        EXECUTE 'UPDATE auth.users SET phone_change_token = COALESCE(phone_change_token, '''') WHERE phone_change_token IS NULL;';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'reauthentication_token') THEN
        EXECUTE 'UPDATE auth.users SET reauthentication_token = COALESCE(reauthentication_token, '''') WHERE reauthentication_token IS NULL;';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') THEN
        EXECUTE 'UPDATE auth.users SET is_sso_user = COALESCE(is_sso_user, false) WHERE is_sso_user IS NULL;';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous') THEN
        EXECUTE 'UPDATE auth.users SET is_anonymous = COALESCE(is_anonymous, false) WHERE is_anonymous IS NULL;';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_confirm_status') THEN
        EXECUTE 'UPDATE auth.users SET email_change_confirm_status = COALESCE(email_change_confirm_status, 0) WHERE email_change_confirm_status IS NULL;';
    END IF;
END $$;

-- =============================================================================
-- 4. SINCRONIZACIÓN DE auth.identities PARA TODOS LOS USUARIOS EN auth.users
-- =============================================================================

INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    u.id::text,
    jsonb_build_object(
        'sub', u.id::text,
        'email', LOWER(u.email),
        'email_verified', true,
        'phone_verified', false
    ),
    'email',
    now(),
    COALESCE(u.created_at, now()),
    now()
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM auth.identities i
      WHERE i.user_id = u.id
        AND i.provider = 'email'
  );

UPDATE auth.identities i
SET
    provider_id = u.id::text,
    identity_data = jsonb_build_object(
        'sub', u.id::text,
        'email', LOWER(u.email),
        'email_verified', true,
        'phone_verified', false
    ),
    updated_at = now()
FROM auth.users u
WHERE i.user_id = u.id
  AND i.provider = 'email';

-- Asegurar que los perfiles demo tienen sus vínculos e identificadores activos en perfiles_usuarios
UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-001', telefono = '+51 984 100 100', direccion = 'Av. El Sol 450, Cusco', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000001';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-002', telefono = '+51 984 234 567', direccion = 'Urb. Magisterio Primera Etapa K-12', distrito_cusco = 'Wanchaq',
    contacto_emergencia_nombre = 'Carlos Mendoza (Hermano)', contacto_emergencia_tel = '+51 984 998 877', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000002';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-004', telefono = '+51 984 711 222', id_clinica_asociada = '40000000-0000-0000-0000-000000000001', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000004';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-011', telefono = '+51 984 311 111', distrito_cusco = 'Wanchaq', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000011';

-- =============================================================================
-- 5. HABILITACIÓN IDEMPOTENTE DE SUPABASE REALTIME EN LAS 3 TABLAS CRÍTICAS
-- =============================================================================

DO $$
DECLARE
    v_tbl text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH v_tbl IN ARRAY ARRAY['incidencias_emergencias', 'notificaciones', 'reportes_seguimiento']
        LOOP
            IF NOT EXISTS (
                SELECT 1
                FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = v_tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', v_tbl);
            END IF;
        END LOOP;
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- 6. VERIFICACIÓN INMEDIATA DEL ESTADO DE LAS 4 CUENTAS DEMO
-- =============================================================================
SELECT
    u.email,
    p.rol,
    p.estado_cuenta,
    (u.confirmation_token IS NOT NULL AND u.recovery_token IS NOT NULL AND u.email_change IS NOT NULL) AS tokens_saneados_ok,
    EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email') AS identity_sincronizada_ok
FROM auth.users u
JOIN public.perfiles_usuarios p ON p.id = u.id
WHERE u.email IN (
    'lucia.mendoza@gmail.com',
    'valeria.cuidadora@pawpatitacusco.pe',
    'vet.sanfrancisco@pawpatitacusco.pe',
    'admin@pawpatitacusco.pe'
)
ORDER BY p.rol;

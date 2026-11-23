-- =============================================================================
-- PAW PATITA CUSCO v5.0 — FASE 2: INFRAESTRUCTURA DE BASE DE DATOS (SUPABASE)
-- Archivo: supabase/06_seed.sql
-- Descripción: Semilla de datos maestros y transaccionales realistas de Cusco:
--              - Parámetros globales (comisión 15%, TC USD 3.75)
--              - Temporadas turísticas de Cusco, Cupones y Términos Legales v5.0
--              - 4 Clínicas Veterinarias Activas + 1 Clínica Pendiente (VET-005)
--              - Usuarios Auth + Perfiles (4 cuentas demo + propietarios + cuidadores)
--              - 6 Cuidadores Aprobados (Cusco Centro, Wanchaq, San Sebastián,
--                San Jerónimo, Santiago, San Blas) + 2 Cuidadores Pendientes
--              - Ofertas de Servicio (HU-101..112) y Bloques Horarios
--              - Mascotas con fecha_nacimiento y PAW-ID (incluyendo PAW-6858)
--              - Reservas en todos los estados, Pagos con 15% conciliado,
--                Liquidaciones (en_garantia, disponible, solicitado, pagado),
--                Muro de Fotos (PostImg), Alertas S.O.S. y Reseñas verificadas.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CONFIGURACIÓN GLOBAL DE LA PLATAFORMA
-- =============================================================================

INSERT INTO public.configuracion_plataforma (clave, valor_numerico, valor_texto, valor_booleano, descripcion)
VALUES
    ('comision_plataforma_pct', 0.1500, '15%', true, 'Porcentaje de comisión de intermediación de Paw Patita Cusco (15% plataforma / 85% cuidador)'),
    ('tipo_cambio_usd', 3.7500, 'PEN/USD', true, 'Tipo de cambio referencial Soles a Dólares para turistas en Cusco'),
    ('tarifa_bano_extra', 25.0000, 'S/ 25.00', true, 'Tarifa estándar adicional por baño higiénico pre-entrega'),
    ('yape_oficial', NULL, '984-000-111', true, 'Número oficial Yape/Plin de garantía Paw Patita Cusco S.A.C.'),
    ('soporte_whatsapp', NULL, '+51984123456', true, 'Línea de asistencia y soporte 24/7 en Cusco')
ON CONFLICT (clave) DO UPDATE SET
    valor_numerico = EXCLUDED.valor_numerico,
    valor_texto = EXCLUDED.valor_texto;

-- =============================================================================
-- 2. TEMPORADAS TURÍSTICAS DE CUSCO Y CUPONES PROMOCIONALES
-- =============================================================================

INSERT INTO public.temporadas_tarifas (id, nombre, descripcion, mes_dia_inicio, mes_dia_fin, factor_multiplicador, recargo_porcentaje, activa)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Fiestas del Cusco e Inti Raymi', 'Alta demanda por mes jubilar del Cusco e Inti Raymi (Junio)', '06-01', '06-30', 1.20, 20.00, true),
    ('10000000-0000-0000-0000-000000000002', 'Fiestas Patrias Perú', 'Temporada alta de turismo nacional e internacional (Julio - Agosto)', '07-15', '08-15', 1.15, 15.00, true),
    ('10000000-0000-0000-0000-000000000003', 'Semana Santa Cusqueña', 'Feriado largo tradicional en Cusco', '03-25', '04-10', 1.15, 15.00, true),
    ('10000000-0000-0000-0000-000000000004', 'Navidad y Año Nuevo en los Andes', 'Cierre de año en Cusco y Valle Sagrado', '12-20', '12-31', 1.25, 25.00, true),
    ('10000000-0000-0000-0000-000000000005', 'Temporada de Lluvias Cusco', 'Protocolo especial de secado y paseo cubierto (Enero - Febrero)', '01-05', '02-28', 1.10, 10.00, true)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.cupones_promocionales (id, codigo, descripcion, tipo_descuento, valor_descuento, segmento_objetivo, monto_minimo, fecha_inicio, fecha_fin, usos_maximos, usos_actuales, activo)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'BIENVENIDO10', '10% de descuento en tu primera reserva en Paw Patita Cusco', 'porcentaje', 10.00, 'todos', 40.00, '2026-01-01', '2027-12-31', 500, 14, true),
    ('20000000-0000-0000-0000-000000000002', 'MACHUPICCHU15', '15% de descuento especial para turistas que visitan Machu Picchu', 'porcentaje', 15.00, 'turista', 70.00, '2026-01-01', '2027-12-31', 300, 8, true),
    ('20000000-0000-0000-0000-000000000003', 'CUSCO20', 'S/ 20.00 de descuento directo en hospedajes de 3 días o más', 'monto_fijo', 20.00, 'local', 120.00, '2026-01-01', '2027-12-31', 200, 5, true)
ON CONFLICT (codigo) DO NOTHING;

-- =============================================================================
-- 3. TÉRMINOS Y CONDICIONES LEGALES v5.0
-- =============================================================================

INSERT INTO public.terminos_condiciones (id, codigo_version, ambito, titulo, contenido_markdown, vigente)
VALUES
    ('30000000-0000-0000-0000-000000000001', 'v5.0-GENERAL', 'General', 'Términos Generales y Política de Privacidad Paw Patita Cusco', 'Contrato marco de intermediación tecnológica para cuidado responsable de mascotas en la ciudad del Cusco, bajo la Ley N° 30407 (Ley de Protección y Bienestar Animal) y Ley N° 29733 (Protección de Datos Personales).', true),
    ('30000000-0000-0000-0000-000000000002', 'v5.0-PROPIETARIO', 'Propietario', 'Condiciones de Custodia y Protocolo Sanitario PAW-ID', 'El propietario declara que la información de vacunación, alergias y conducta de su mascota en el Carné Digital PAW-ID es verídica y autoriza la derivación inmediata a una Clínica Veterinaria Aliada ante cualquier emergencia S.O.S.', true),
    ('30000000-0000-0000-0000-000000000003', 'v5.0-CUIDADOR', 'Cuidador', 'Declaración Jurada de Antecedentes y Estándar de Custodia', 'El cuidador independiente declara bajo juramento no registrar antecedentes penales ni policiales, mantener su domicilio en condiciones óptimas de seguridad e higiene y reportar evidencia fotográfica diaria en el Muro en Vivo.', true),
    ('30000000-0000-0000-0000-000000000004', 'v5.0-VETERINARIA', 'Veterinaria', 'Convenio de Red de Clínicas Veterinarias Aliadas Cusco', 'La clínica veterinaria acredita contar con médico veterinario colegiado y habilitado en el CMVP Cusco, comprometiéndose al triaje oportuno de alertas S.O.S. y validación rigurosa de carnés PAW-ID.', true),
    ('30000000-0000-0000-0000-000000000005', 'v5.0-RESERVA', 'Reserva', 'Política Escalonada de Cancelación y Garantía Escrow (15%/85%)', 'Cancelaciones con >48h reciben 100% de reembolso; entre 24h y 48h reciben 70% de reembolso (30% penalidad); con <24h reciben 50% de reembolso (50% penalidad). El pago permanece en garantía hasta el Check-Out conforme.', true)
ON CONFLICT (codigo_version) DO NOTHING;

-- =============================================================================
-- 4. RED DE CLÍNICAS VETERINARIAS ALIADAS EN CUSCO (4 ACTIVAS + 1 PENDIENTE)
-- =============================================================================

INSERT INTO public.clinicas_veterinarias (
    id, codigo_clinica, ruc, nombre, email_institucional, direccion, distrito_cusco,
    latitud, longitud, telefono_emergencia, horario_atencion, especialidades,
    tarifa_consulta_emergencia, foto_fachada_url, constancia_url, colegiatura_cmvp,
    estado_afiliacion, motivo_estado, activa
)
VALUES
    (
        '40000000-0000-0000-0000-000000000001', 'VET-001', '20601234561',
        'Clínica Veterinaria San Francisco Cusco 24h', 'emergencias@vetsanfranciscocusco.pe',
        'Av. de la Cultura 1420, frente a UNSAAC', 'Wanchaq',
        -13.522600, -71.961200, '+51 984 711 222', '24 Horas',
        ARRAY['Emergencias 24h', 'Traumatología', 'UCI Canina', 'Laboratorio Clínico'],
        60.00, 'https://i.postimg.cc/8cZ7xK2p/vet-cusco-1.jpg', 'https://i.postimg.cc/8cZ7xK2p/cmvp-cert-1.jpg',
        'CMVP-CUSCO-4821', 'activa', 'Sede principal acreditada 24h en Wanchaq', true
    ),
    (
        '40000000-0000-0000-0000-000000000002', 'VET-002', '20601234562',
        'Centro Médico Veterinario Qorikancha Pet', 'contacto@qorikanchapet.pe',
        'Av. El Sol 815, Centro Histórico', 'Cusco Centro',
        -13.519200, -71.975400, '+51 984 822 333', '24 Horas',
        ARRAY['Emergencias 24h', 'Medicina Interna', 'Oxigenoterapia de Altura', 'Ecografía'],
        65.00, 'https://i.postimg.cc/8cZ7xK2p/vet-cusco-2.jpg', 'https://i.postimg.cc/8cZ7xK2p/cmvp-cert-2.jpg',
        'CMVP-CUSCO-5104', 'activa', 'Acreditada para atención de turistas y locales en Cusco Centro', true
    ),
    (
        '40000000-0000-0000-0000-000000000003', 'VET-003', '20601234563',
        'Veterinaria Los Andes & Spa Canino', 'urgencias@vetlosandescusco.pe',
        'Av. Cusco 512, Paradero Enaco', 'San Sebastián',
        -13.531800, -71.936500, '+51 984 933 444', 'Extendido',
        ARRAY['Cirugía General', 'Vacunación Internacional', 'Dermatología'],
        50.00, 'https://i.postimg.cc/8cZ7xK2p/vet-cusco-3.jpg', 'https://i.postimg.cc/8cZ7xK2p/cmvp-cert-3.jpg',
        'CMVP-CUSCO-5390', 'activa', 'Sede aliada zona sur San Sebastián', true
    ),
    (
        '40000000-0000-0000-0000-000000000004', 'VET-004', '20601234564',
        'Hospital Veterinario Valle Sur Cusco', 'atencion@vetvallesur.pe',
        'Av. Manco Cápac 310, Plaza San Jerónimo', 'San Jerónimo',
        -13.544900, -71.884200, '+51 984 644 555', '24 Horas',
        ARRAY['Emergencias 24h', 'Hospitalización', 'Cardiología'],
        55.00, 'https://i.postimg.cc/8cZ7xK2p/vet-cusco-4.jpg', 'https://i.postimg.cc/8cZ7xK2p/cmvp-cert-4.jpg',
        'CMVP-CUSCO-5612', 'activa', 'Sede aliada 24h en San Jerónimo', true
    ),
    (
        '40000000-0000-0000-0000-000000000005', 'VET-005', '20601234565',
        'Consultorio Veterinario Sacsayhuamán Vet', 'postulacion@sacsayhuamanvet.pe',
        'Calle Suecia 240, San Blas', 'San Blas',
        -13.514100, -71.976800, '+51 984 555 666', 'Diurno',
        ARRAY['Medicina General', 'Profilaxis Dental'],
        45.00, 'https://i.postimg.cc/8cZ7xK2p/vet-cusco-5.jpg', 'https://i.postimg.cc/8cZ7xK2p/cmvp-cert-5.jpg',
        'CMVP-CUSCO-6019', 'pendiente', 'Solicitud de afiliación pendiente de revisión por Admin', false
    )
ON CONFLICT (codigo_clinica) DO NOTHING;

-- =============================================================================
-- 5. USUARIOS EN AUTH.USERS Y PERFILES_USUARIOS (CONTRASEÑA DEMO: PawPatita2026!)
-- =============================================================================

DO $$
DECLARE
    v_instance_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
    -- Insertar cuentas semilla en auth.users con tokens en '' (no NULL) para compatibilidad estricta con GoTrue v2
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_token, recovery_token,
        email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES
        -- 1. Administrador Principal (Demo Admin)
        (v_instance_id, '50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
         'admin@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Rodrigo","apellido":"Quispe Monzón","rol":"administrador","estado_cuenta":"activo","num_documento":"44112233","distrito_cusco":"Cusco Centro"}'::jsonb, now(), now()),

        -- 2. Propietaria Local Cusco (Demo Propietario)
        (v_instance_id, '50000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
         'lucia.mendoza@gmail.com', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Lucía","apellido":"Mendoza Vargas","rol":"propietario","estado_cuenta":"activo","num_documento":"72849102","distrito_cusco":"Wanchaq"}'::jsonb, now(), now()),

        -- 3. Propietario Turista en Cusco (Unificado bajo rol propietario con es_turista = true)
        (v_instance_id, '50000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
         'martin.dupont@france.fr', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Martin","apellido":"Dupont","rol":"propietario","es_turista":true,"tipo_documento":"Pasaporte","num_documento":"FR9928172","pais_origen":"Francia","idioma_preferido":"EN","distrito_cusco":"Cusco Centro","hospedaje_hotel_cusco":"Hotel Palacio del Inka Cusco"}'::jsonb, now(), now()),

        -- 4. Clínica Veterinaria Activa (Demo Veterinaria - VET-001)
        (v_instance_id, '50000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
         'vet.sanfrancisco@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Dra. Claudia","apellido":"Salazar Cáceres","rol":"veterinaria","estado_cuenta":"activo","num_documento":"41928374","distrito_cusco":"Wanchaq"}'::jsonb, now(), now()),

        -- 5. Clínica Veterinaria Pendiente (VET-005 - Bloqueada hasta aprobación)
        (v_instance_id, '50000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
         'postulacion@sacsayhuamanvet.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Dr. Marco","apellido":"Paredes Ttito","rol":"veterinaria","estado_cuenta":"pendiente","num_documento":"43918273","distrito_cusco":"San Blas"}'::jsonb, now(), now()),

        -- 6..11. Los 6 Cuidadores Aprobados en distritos de Cusco (CUID-101 es el Demo Cuidador)
        (v_instance_id, '50000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated',
         'valeria.cuidadora@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Valeria","apellido":"Huamán Delgado","rol":"cuidador","estado_cuenta":"activo","num_documento":"71029384","distrito_cusco":"Wanchaq"}'::jsonb, now(), now()),

        (v_instance_id, '50000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated',
         'diego.alvarez@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Diego","apellido":"Álvarez Tupayachi","rol":"cuidador","estado_cuenta":"activo","num_documento":"72039485","distrito_cusco":"Cusco Centro"}'::jsonb, now(), now()),

        (v_instance_id, '50000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated',
         'camila.rojas@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Camila","apellido":"Rojas Yábar","rol":"cuidador","estado_cuenta":"activo","num_documento":"73049586","distrito_cusco":"San Sebastián"}'::jsonb, now(), now()),

        (v_instance_id, '50000000-0000-0000-0000-000000000014', 'authenticated', 'authenticated',
         'mateo.cornejo@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Mateo","apellido":"Cornejo Paz","rol":"cuidador","estado_cuenta":"activo","num_documento":"74059687","distrito_cusco":"San Jerónimo"}'::jsonb, now(), now()),

        (v_instance_id, '50000000-0000-0000-0000-000000000015', 'authenticated', 'authenticated',
         'sofia.aguilar@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Sofía","apellido":"Aguilar Bellido","rol":"cuidador","estado_cuenta":"activo","num_documento":"75069788","distrito_cusco":"Santiago"}'::jsonb, now(), now()),

        (v_instance_id, '50000000-0000-0000-0000-000000000016', 'authenticated', 'authenticated',
         'andres.zevallos@pawpatitacusco.pe', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Andrés","apellido":"Zevallos Kalinowski","rol":"cuidador","estado_cuenta":"activo","num_documento":"76079889","distrito_cusco":"San Blas"}'::jsonb, now(), now()),

        -- 12..13. Dos Cuidadores Pendientes de Aprobación
        (v_instance_id, '50000000-0000-0000-0000-000000000017', 'authenticated', 'authenticated',
         'jorge.postulante@gmail.com', crypt('PawPatita2026!', gen_salt('bf')), now(), '', '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         '{"nombre":"Jorge","apellido":"Chávez Condori","rol":"cuidador","estado_cuenta":"pendiente","num_documento":"77089990","distrito_cusco":"Poroy"}'::jsonb, now(), now()),

        (v_instance_id, '50000000-0000-0000-0000-000000000018', 'authenticated', 'authenticated',
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

    -- Sanear todas las columnas de tokens y banderas opcionales en auth.users para GoTrue v2
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

    -- Sincronizar identidades en auth.identities para GoTrue v2
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
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
          SELECT 1 FROM auth.identities i
          WHERE i.user_id = u.id AND i.provider = 'email'
      );
END $$;

-- Permisos integrales de esquema y secuencias para anon, authenticated y supabase_auth_admin
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role, supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

-- Asegurar y enriquecer datos en perfiles_usuarios (vinculando clínicas y contactos)
UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-001', telefono = '+51 984 100 100', direccion = 'Av. El Sol 450, Cusco', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000001';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-002', telefono = '+51 984 234 567', direccion = 'Urb. Magisterio Primera Etapa K-12', distrito_cusco = 'Wanchaq',
    contacto_emergencia_nombre = 'Carlos Mendoza (Hermano)', contacto_emergencia_tel = '+51 984 998 877', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000002';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-003', telefono = '+33 6 12 34 56 78', direccion = 'Calle San Agustín 400 (Hotel Palacio del Inka)', distrito_cusco = 'Cusco Centro',
    es_turista = true, tipo_documento = 'Pasaporte', pais_origen = 'Francia', idioma_preferido = 'EN',
    hospedaje_hotel_cusco = 'Hotel Palacio del Inka Cusco', contacto_emergencia_nombre = 'Recepción Hotel Palacio del Inka', contacto_emergencia_tel = '+51 84 231 961', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000003';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-004', telefono = '+51 984 711 222', id_clinica_asociada = '40000000-0000-0000-0000-000000000001', estado_cuenta = 'activo'
WHERE id = '50000000-0000-0000-0000-000000000004';

UPDATE public.perfiles_usuarios
SET codigo_usuario = 'USR-005', telefono = '+51 984 555 666', id_clinica_asociada = '40000000-0000-0000-0000-000000000005', estado_cuenta = 'pendiente'
WHERE id = '50000000-0000-0000-0000-000000000005';

UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-011', telefono = '+51 984 311 111', distrito_cusco = 'Wanchaq', estado_cuenta = 'activo' WHERE id = '50000000-0000-0000-0000-000000000011';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-012', telefono = '+51 984 312 222', distrito_cusco = 'Cusco Centro', estado_cuenta = 'activo' WHERE id = '50000000-0000-0000-0000-000000000012';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-013', telefono = '+51 984 313 333', distrito_cusco = 'San Sebastián', estado_cuenta = 'activo' WHERE id = '50000000-0000-0000-0000-000000000013';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-014', telefono = '+51 984 314 444', distrito_cusco = 'San Jerónimo', estado_cuenta = 'activo' WHERE id = '50000000-0000-0000-0000-000000000014';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-015', telefono = '+51 984 315 555', distrito_cusco = 'Santiago', estado_cuenta = 'activo' WHERE id = '50000000-0000-0000-0000-000000000015';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-016', telefono = '+51 984 316 666', distrito_cusco = 'San Blas', estado_cuenta = 'activo' WHERE id = '50000000-0000-0000-0000-000000000016';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-017', telefono = '+51 984 317 777', distrito_cusco = 'Poroy', estado_cuenta = 'pendiente' WHERE id = '50000000-0000-0000-0000-000000000017';
UPDATE public.perfiles_usuarios SET codigo_usuario = 'USR-018', telefono = '+51 984 318 888', distrito_cusco = 'Saylla', estado_cuenta = 'pendiente' WHERE id = '50000000-0000-0000-0000-000000000018';

-- =============================================================================
-- 6. PERFILES DE CUIDADORES (6 APROBADOS + 2 PENDIENTES) Y SUS ANTECEDENTES
-- =============================================================================

INSERT INTO public.perfiles_cuidadores (
    id, codigo_cuidador, id_usuario, presentacion_corta, descripcion_experiencia,
    anios_experiencia, especialidades, idiomas, tipo_vivienda, capacidad_max_mascotas,
    acepta_cachorros, acepta_medicacion_oral, latitud, longitud, reputacion_promedio,
    total_resenas, estado_postulacion, foto_url, foto_hogar_url, cuenta_cobro_tipo, cuenta_cobro_numero
)
VALUES
    -- CUID-001: Wanchaq (Demo Cuidador)
    (
        '60000000-0000-0000-0000-000000000001', 'CUID-001', '50000000-0000-0000-0000-000000000011',
        'Especialista en hospedaje familiar cálido y primeros auxilios caninos en Wanchaq',
        'Técnica en bienestar animal con 5 años cuidando perritos locales y de turistas que viajan a Machu Picchu. Casa amplia con jardín cercado en Urb. Magisterio.',
        5, ARRAY['Hospedaje Familiar', 'Primeros Auxilios', 'Administración de Medicamentos'], ARRAY['Español', 'Inglés'],
        'Casa con jardín cercado de 120 m²', 4, true, true, -13.524800, -71.958900, 4.95, 18, 'aprobado',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600',
        'Yape', '984311111'
    ),
    -- CUID-002: Cusco Centro
    (
        '60000000-0000-0000-0000-000000000002', 'CUID-002', '50000000-0000-0000-0000-000000000012',
        'Cuidado en hoteles del Centro Histórico y paseos seguros de aclimatación',
        'Guía de turismo pet-friendly bilingüe con 4 años de experiencia atendiendo mascotas en hoteles de Cusco Centro y paseos ecológicos.',
        4, ARRAY['Domicilio Turístico', 'Paseos de Aclimatación', 'Razas Medianas y Grandes'], ARRAY['Español', 'Inglés', 'Francés'],
        'Departamento amplio pet-friendly cerca de Plaza Regocijo', 3, true, true, -13.517500, -71.979800, 4.90, 14, 'aprobado',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600',
        'BCP', '285-99182736-0-12'
    ),
    -- CUID-003: San Sebastián
    (
        '60000000-0000-0000-0000-000000000003', 'CUID-003', '50000000-0000-0000-0000-000000000013',
        'Guardería diurna recreativa y socialización controlada en San Sebastián',
        'Educadora canina positiva con 3 años brindando guardería de día con juegos de olfato y socialización por tamaños.',
        3, ARRAY['Guardería de Día', 'Etología y Conducta', 'Cachorros'], ARRAY['Español'],
        'Casa quinta con patio verde seguro', 5, true, true, -13.533400, -71.934100, 4.85, 11, 'aprobado',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600',
        'Plin', '984313333'
    ),
    -- CUID-004: San Jerónimo
    (
        '60000000-0000-0000-0000-000000000004', 'CUID-004', '50000000-0000-0000-0000-000000000014',
        'Hospedaje campestre para razas grandes y paseos de montaña en San Jerónimo',
        'Entrenador físico canino con 6 años de experiencia en manejo de razas activas (Golden, Husky, Pastor Alemán) en amplias áreas verdes.',
        6, ARRAY['Razas Grandes', 'Trekking Canino', 'Hospedaje Campestre'], ARRAY['Español', 'Inglés'],
        'Casa de campo cercada de 300 m² en San Jerónimo', 5, false, true, -13.545800, -71.886000, 5.00, 9, 'aprobado',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=600',
        'Interbank', '400-3102938475'
    ),
    -- CUID-005: Santiago
    (
        '60000000-0000-0000-0000-000000000005', 'CUID-005', '50000000-0000-0000-0000-000000000015',
        'Especialista en perros pequeños, senior y cuidados geriátricos en Santiago',
        'Auxiliar veterinaria dedicada al cuidado tranquilo de perritos pequeños y adultos mayores que requieren medicación horaria.',
        4, ARRAY['Perros Senior', 'Razas Pequeñas', 'Cuidado Geriátrico'], ARRAY['Español'],
        'Casa familiar tranquila sin escaleras', 3, true, true, -13.527100, -71.984500, 4.92, 12, 'aprobado',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600',
        'BBVA', '0011-0200-0299182736'
    ),
    -- CUID-006: San Blas
    (
        '60000000-0000-0000-0000-000000000006', 'CUID-006', '50000000-0000-0000-0000-000000000016',
        'Pet Sitter bilingüe para viajeros en San Blas con recojo directo en hotel/Airbnb',
        'Cuidador verificado en el barrio artístico de San Blas, especializado en atención a turistas extranjeros mientras realizan el tour a Machu Picchu.',
        3, ARRAY['Domicilio Turístico', 'Recojo en Hotel', 'Fotografía Diaria'], ARRAY['Español', 'Inglés'],
        'Casona tradicional con patio soleado en San Blas', 3, true, true, -13.514800, -71.974200, 4.88, 10, 'aprobado',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600',
        'CCI', '00228519283746500112'
    ),
    -- CUID-007: Pendiente (Poroy)
    (
        '60000000-0000-0000-0000-000000000007', 'CUID-007', '50000000-0000-0000-0000-000000000017',
        'Paseador y cuidador canino con patio amplio en Poroy',
        'Aficionado a los animales con 2 años cuidando mascotas de vecinos en Poroy.',
        2, ARRAY['Paseos Seguros'], ARRAY['Español'],
        'Casa con patio en Poroy', 3, true, false, -13.494200, -72.041100, 5.00, 0, 'pendiente',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400', 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=600',
        'Yape', '984317777'
    ),
    -- CUID-008: Pendiente (Saylla)
    (
        '60000000-0000-0000-0000-000000000008', 'CUID-008', '50000000-0000-0000-0000-000000000018',
        'Hospedaje campestre familiar en Saylla con áreas verdes',
        'Experiencia de 3 años en cuidado de mascotas medianas en zona campestre del Valle Sur.',
        3, ARRAY['Hospedaje Familiar', 'Guardería'], ARRAY['Español', 'Quechua'],
        'Casa huerta cercada en Saylla', 4, true, true, -13.568000, -71.829500, 5.00, 0, 'pendiente',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=600',
        'Plin', '984318888'
    )
ON CONFLICT (codigo_cuidador) DO NOTHING;

-- Expedientes documentales en antecedentes_cuidadores
INSERT INTO public.antecedentes_cuidadores (
    id_cuidador, doc_identidad_url, doc_antecedentes_policiales_url,
    doc_antecedentes_penales_url, doc_domicilio_url, declaracion_jurada,
    estado_verificacion, observaciones_admin
)
SELECT
    pc.id,
    'https://i.postimg.cc/8cZ7xK2p/dni-' || LOWER(pc.codigo_cuidador) || '.jpg',
    'https://i.postimg.cc/8cZ7xK2p/policial-' || LOWER(pc.codigo_cuidador) || '.jpg',
    'https://i.postimg.cc/8cZ7xK2p/penal-' || LOWER(pc.codigo_cuidador) || '.jpg',
    'https://i.postimg.cc/8cZ7xK2p/recibo-luz-' || LOWER(pc.codigo_cuidador) || '.jpg',
    true,
    pc.estado_postulacion,
    CASE WHEN pc.estado_postulacion = 'aprobado' THEN 'Antecedentes policiales, penales y DNI verificados conforme.' ELSE 'Pendiente de validación por Administración.' END
FROM public.perfiles_cuidadores pc
ON CONFLICT (id_cuidador) DO NOTHING;

-- =============================================================================
-- 7. OFERTAS DE SERVICIO (HU-ECODES REALES) Y BLOQUES HORARIOS DE AGENDA
-- =============================================================================

INSERT INTO public.servicios (
    id, hu_ecode, id_cuidador, categoria, tipo_servicio, descripcion_servicio,
    tarifa_diaria_por_perro, incluye_recojo_hotel, tarifa_recojo_extra, disponible
)
VALUES
    -- Valeria (CUID-001 - Wanchaq)
    ('70000000-0000-0000-0000-000000000001', 'HU-101', '60000000-0000-0000-0000-000000000001', 'Hospedaje', 'Hospedaje Familiar Premium 24h', 'Alojamiento dentro de casa con jardín seguro, 3 paseos diarios y reporte fotográfico cada 6 horas.', 60.00, true, 0.00, true),
    ('70000000-0000-0000-0000-000000000002', 'HU-102', '60000000-0000-0000-0000-000000000001', 'Guardería', 'Guardería de Día en Magisterio', 'Cuidado diurno de 08:00 a 18:00 mientras trabajas o haces excursiones de medio día.', 40.00, false, 15.00, true),

    -- Diego (CUID-002 - Cusco Centro)
    ('70000000-0000-0000-0000-000000000003', 'HU-103', '60000000-0000-0000-0000-000000000002', 'Domicilio Turístico', 'Cuidado en Hotel / Airbnb para Turistas', 'Cuidado personalizado en tu hotel de Cusco o con recojo directo para tu tour a Machu Picchu.', 75.00, true, 0.00, true),
    ('70000000-0000-0000-0000-000000000004', 'HU-104', '60000000-0000-0000-0000-000000000002', 'Paseo', 'Paseo Guiado de Aclimatación por Cusco', 'Paseo seguro con arnés e hidratación adaptado a la altura del Cusco (2 horas).', 35.00, true, 0.00, true),

    -- Camila (CUID-003 - San Sebastián)
    ('70000000-0000-0000-0000-000000000005', 'HU-105', '60000000-0000-0000-0000-000000000003', 'Guardería', 'Guardería Recreativa & Socialización', 'Juegos de estimulación mental y socialización supervisada en patio verde.', 45.00, false, 15.00, true),
    ('70000000-0000-0000-0000-000000000006', 'HU-106', '60000000-0000-0000-0000-000000000003', 'Paseo', 'Paseo Recreativo por Parques de San Sebastián', 'Caminata activa y juegos de olfato por 2 horas.', 30.00, false, 10.00, true),

    -- Mateo (CUID-004 - San Jerónimo)
    ('70000000-0000-0000-0000-000000000007', 'HU-107', '60000000-0000-0000-0000-000000000004', 'Hospedaje', 'Hospedaje Campestre Razas Grandes', 'Amplio jardín de 300 m² ideal para perros grandes con alta energía.', 70.00, true, 15.00, true),
    ('70000000-0000-0000-0000-000000000008', 'HU-108', '60000000-0000-0000-0000-000000000004', 'Paseo', 'Ruta de Trekking Canino Valle Sur', 'Excursión matutina controlada por senderos seguros de San Jerónimo.', 45.00, false, 15.00, true),

    -- Sofía (CUID-005 - Santiago)
    ('70000000-0000-0000-0000-000000000009', 'HU-109', '60000000-0000-0000-0000-000000000005', 'Hospedaje', 'Hospedaje Tranquilo Senior & Razas Pequeñas', 'Atención geriátrica dedicada, camas ortopédicas y administración puntual de medicinas.', 55.00, false, 15.00, true),
    ('70000000-0000-0000-0000-000000000010', 'HU-110', '60000000-0000-0000-0000-000000000005', 'Guardería', 'Guardería Suave para Cachorros y Peques', 'Ambiente cálido y libre de estrés para perritos de hasta 10 kg.', 38.00, false, 12.00, true),

    -- Andrés (CUID-006 - San Blas)
    ('70000000-0000-0000-0000-000000000011', 'HU-111', '60000000-0000-0000-0000-000000000006', 'Domicilio Turístico', 'Custodia Full Day Machu Picchu con Recojo Hotel', 'Te recogemos a las 05:30 AM en tu hotel o estación de tren y cuidamos a tu mascota hasta tu retorno.', 80.00, true, 0.00, true),
    ('70000000-0000-0000-0000-000000000012', 'HU-112', '60000000-0000-0000-0000-000000000006', 'Hospedaje', 'Hospedaje Boutique en Casona de San Blas', 'Estancia cálida en el centro turístico con patio soleado.', 65.00, true, 0.00, true)
ON CONFLICT (hu_ecode) DO NOTHING;

-- Poblar agenda horaria (disponibilidad_cuidadores) para los próximos 14 días con bloques variados
INSERT INTO public.disponibilidad_cuidadores (
    id_cuidador, fecha, bloque_horario, hora_inicio, hora_fin, cupo_maximo, cupos_reservados, nota_agenda
)
SELECT
    pc.id,
    (CURRENT_DATE + gs.dia)::date,
    b.bloque::bloque_horario_enum,
    b.h_ini::time,
    b.h_fin::time,
    pc.capacidad_max_mascotas,
    CASE WHEN gs.dia IN (0, 1) AND b.bloque = 'todo_el_dia' THEN 1 ELSE 0 END,
    'Agenda activa Cusco'
FROM public.perfiles_cuidadores pc
CROSS JOIN generate_series(0, 14) AS gs(dia)
CROSS JOIN (
    VALUES
        ('todo_el_dia', '08:00:00', '20:00:00'),
        ('manana_08_12', '08:00:00', '12:00:00'),
        ('tarde_14_18', '14:00:00', '18:00:00'),
        ('noche_18_22', '18:00:00', '22:00:00')
) AS b(bloque, h_ini, h_fin)
WHERE pc.estado_postulacion = 'aprobado'
ON CONFLICT (id_cuidador, fecha, bloque_horario, hora_inicio, hora_fin) DO NOTHING;

-- =============================================================================
-- 8. MASCOTAS Y VALIDACIONES VETERINARIAS (INCLUYENDO PAW-6858 PARA QR PÚBLICO)
-- =============================================================================

INSERT INTO public.mascotas (
    id, paw_id, id_propietario, nombre, raza, fecha_nacimiento, tamano, sexo, peso_kg,
    esterilizado, vacunas_al_dia, fecha_venc_vacunas, cartilla_vacunas_url,
    alergias_restricciones, medicacion_actual, dieta_alimentacion, conducta_observaciones,
    foto_url, estado_validacion_vet, id_clinica_validadora, observacion_veterinaria,
    fecha_ultima_validacion, activa
)
VALUES
    -- PAW-6858: Mascota insignia validada (para prueba de Carné QR Público #/paw-id/PAW-6858)
    (
        '80000000-0000-0000-0000-000000000001', 'PAW-6858', '50000000-0000-0000-0000-000000000002',
        'Inti', 'Golden Retriever', '2023-07-15', 'Grande', 'Macho', 28.50,
        true, true, '2027-07-15', 'https://i.postimg.cc/8cZ7xK2p/cartilla-inti-paw6858.jpg',
        'Alergia leve al pollo procesado (dar solo cordero o salmón)', 'Ninguna medicación permanente',
        '300g de croquetas de salmón (08:00 AM y 06:00 PM)', 'Muy cariñoso, sociable con otros perros y acostumbrado a paseos con arnés.',
        'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500', 'validado',
        '40000000-0000-0000-0000-000000000001', 'Vacunas Séxtuple, Antirrábica y KC vigentes. Apto para hospedaje y paseos en Cusco.',
        now() - INTERVAL '15 days', true
    ),
    -- PAW-1002: Cachorra pendiente de validación veterinaria
    (
        '80000000-0000-0000-0000-000000000002', 'PAW-1002', '50000000-0000-0000-0000-000000000002',
        'Killa', 'Beagle', '2026-04-10', 'Mediano', 'Hembra', 7.20,
        false, true, '2027-04-10', 'https://i.postimg.cc/8cZ7xK2p/cartilla-killa-paw1002.jpg',
        'Ninguna alergia conocida', 'Vitaminas de cachorro después del desayuno',
        'Croquetas Puppy 3 veces al día', 'Cachorra juguetona y curiosa.',
        'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=500', 'pendiente',
        NULL, 'En cola de revisión por Clínica Veterinaria Aliada.',
        NULL, true
    ),
    -- PAW-1003: Mascota del propietario turista validada por VET-002
    (
        '80000000-0000-0000-0000-000000000003', 'PAW-1003', '50000000-0000-0000-0000-000000000003',
        'Chaska', 'French Poodle', '2022-03-20', 'Pequeño', 'Hembra', 5.80,
        true, true, '2027-05-20', 'https://i.postimg.cc/8cZ7xK2p/cartilla-chaska-paw1003.jpg',
        'Sensible al frío nocturno (usar abrigo en noches de Cusco)', 'Gotas oftálmicas lubricantes cada noche',
        'Alimento hipoalergénico 120g diarios', 'Tranquila, acostumbrada a viajar en cabina y hoteles.',
        'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500', 'validado',
        '40000000-0000-0000-0000-000000000002', 'Certificado zoosanitario internacional y vacuna antirrábica verificados por Qorikancha Pet.',
        now() - INTERVAL '5 days', true
    ),
    -- PAW-1004: Mascota con cartilla observada para probar flujo de subsanación
    (
        '80000000-0000-0000-0000-000000000004', 'PAW-1004', '50000000-0000-0000-0000-000000000002',
        'Wayra', 'Schnauzer Miniatura', '2021-11-02', 'Pequeño', 'Macho', 8.10,
        true, false, '2025-10-01', 'https://i.postimg.cc/8cZ7xK2p/cartilla-wayra-paw1004.jpg',
        'Ninguna', 'Ninguna', 'Croquetas Adult Small Breed', 'Alerta y guardián.',
        'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=500', 'observado',
        '40000000-0000-0000-0000-000000000001', 'Observación Clínica: El refuerzo anual de vacuna Antirrábica figura vencido. Subir foto del sello actualizado.',
        now() - INTERVAL '2 days', true
    )
ON CONFLICT (paw_id) DO NOTHING;

INSERT INTO public.validaciones_veterinarias (
    id_mascota, id_clinica, id_usuario_vet, resultado, vacunas_verificadas, vigencia_hasta, observaciones_medicas, cartilla_evaluada_url
)
VALUES
    ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'validado', 'Séxtuple, Antirrábica, Bordetella y Desparasitación Interna/Externa', '2027-07-15', 'Paciente en excelente condición clínica. Sello CMVP verificado.', 'https://i.postimg.cc/8cZ7xK2p/cartilla-inti-paw6858.jpg'),
    ('80000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000004', 'validado', 'Pasaporte Europeo + Antirrábica Vigente + Antiparasitario', '2027-05-20', 'Apto para custodia turística en Cusco.', 'https://i.postimg.cc/8cZ7xK2p/cartilla-chaska-paw1003.jpg'),
    ('80000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004', 'observado', 'Séxtuple presente; falta sello de refuerzo Antirrábico 2026', NULL, 'El refuerzo anual de vacuna Antirrábica figura vencido. Actualizar cartilla.', 'https://i.postimg.cc/8cZ7xK2p/cartilla-wayra-paw1004.jpg');

-- =============================================================================
-- 9. RESERVAS EN TODOS LOS ESTADOS + PAGOS (15% COMISIÓN) + LIQUIDACIONES
-- Cubre los 6 distritos de Cusco para que rpc_admin_dashboard_metrics muestre
-- series completas en Chart.js y comisión real > 0.
-- =============================================================================

INSERT INTO public.reservas (
    id, codigo_reserva, id_propietario, id_cuidador, id_oferta, id_mascota,
    fecha_inicio, fecha_fin, bloque_horario, hora_inicio, hora_fin, dias_calculados,
    tarifa_unitaria, subtotal_base, extras_detalle, extras_monto, monto_total,
    moneda_referencial, estado_reserva, notas_propietario, fecha_checkin, fecha_checkout
)
VALUES
    -- RES-2026-0101: FINALIZADA (Wanchaq - CUID-001) -> S/ 180.00
    ('90000000-0000-0000-0000-000000000001', 'RES-2026-0101', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001',
     CURRENT_DATE - 10, CURRENT_DATE - 8, 'todo_el_dia', '08:00:00', '20:00:00', 3, 60.00, 180.00, '{"bano_higienico": false}'::jsonb, 0.00, 180.00, 'PEN', 'finalizada', 'Cuidar dieta sin pollo de Inti.', now() - INTERVAL '10 days', now() - INTERVAL '8 days'),

    -- RES-2026-0102: EN CURSO (Wanchaq - CUID-001) -> S/ 145.00
    ('90000000-0000-0000-0000-000000000002', 'RES-2026-0102', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001',
     CURRENT_DATE, CURRENT_DATE + 1, 'todo_el_dia', '08:00:00', '20:00:00', 2, 60.00, 120.00, '{"bano_higienico": true}'::jsonb, 25.00, 145.00, 'PEN', 'en_curso', 'Incluye baño higiénico antes del retorno.', now() - INTERVAL '3 hours', NULL),

    -- RES-2026-0103: PENDIENTE CONFIRMACIÓN (Wanchaq - CUID-001) -> S/ 80.00
    ('90000000-0000-0000-0000-000000000003', 'RES-2026-0103', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003',
     CURRENT_DATE + 4, CURRENT_DATE + 5, 'manana_08_12', '08:00:00', '12:00:00', 2, 40.00, 80.00, '{}'::jsonb, 0.00, 80.00, 'USD', 'pendiente_confirmacion', 'Guardería matutina para Chaska.', NULL, NULL),

    -- RES-2026-0104: CONFIRMADA (Cusco Centro - CUID-002) -> S/ 150.00
    ('90000000-0000-0000-0000-000000000004', 'RES-2026-0104', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003',
     CURRENT_DATE + 2, CURRENT_DATE + 3, 'todo_el_dia', '08:00:00', '20:00:00', 2, 75.00, 150.00, '{"recojo_hotel": true}'::jsonb, 0.00, 150.00, 'USD', 'confirmada', 'Recojo en lobby de Hotel Palacio del Inka.', NULL, NULL),

    -- RES-2026-0105: FINALIZADA (San Sebastián - CUID-003) -> S/ 90.00
    ('90000000-0000-0000-0000-000000000005', 'RES-2026-0105', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000001',
     CURRENT_DATE - 15, CURRENT_DATE - 14, 'tarde_14_18', '14:00:00', '18:00:00', 2, 45.00, 90.00, '{}'::jsonb, 0.00, 90.00, 'PEN', 'finalizada', 'Sesión de socialización recreativa.', now() - INTERVAL '15 days', now() - INTERVAL '14 days'),

    -- RES-2026-0106: FINALIZADA (San Jerónimo - CUID-004) -> S/ 210.00
    ('90000000-0000-0000-0000-000000000006', 'RES-2026-0106', '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000001',
     CURRENT_DATE - 20, CURRENT_DATE - 18, 'todo_el_dia', '08:00:00', '20:00:00', 3, 70.00, 210.00, '{}'::jsonb, 0.00, 210.00, 'PEN', 'finalizada', 'Fin de semana campestre en San Jerónimo.', now() - INTERVAL '20 days', now() - INTERVAL '18 days'),

    -- RES-2026-0107: FINALIZADA (Santiago - CUID-005) -> S/ 110.00
    ('90000000-0000-0000-0000-000000000007', 'RES-2026-0107', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000009', '80000000-0000-0000-0000-000000000003',
     CURRENT_DATE - 6, CURRENT_DATE - 5, 'todo_el_dia', '08:00:00', '20:00:00', 2, 55.00, 110.00, '{}'::jsonb, 0.00, 110.00, 'PEN', 'finalizada', 'Cuidado tranquilo en Santiago.', now() - INTERVAL '6 days', now() - INTERVAL '5 days'),

    -- RES-2026-0108: EN DISPUTA (San Blas - CUID-006) -> S/ 160.00
    ('90000000-0000-0000-0000-000000000008', 'RES-2026-0108', '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000011', '80000000-0000-0000-0000-000000000003',
     CURRENT_DATE - 3, CURRENT_DATE - 2, 'todo_el_dia', '08:00:00', '20:00:00', 2, 80.00, 160.00, '{}'::jsonb, 0.00, 160.00, 'USD', 'en_disputa', 'Retraso en hora de entrega en hotel por bloqueo de vía.', now() - INTERVAL '3 days', now() - INTERVAL '2 days')
ON CONFLICT (codigo_reserva) DO NOTHING;

-- Pagos exactos con 15% comisión plataforma y 85% neto cuidador
INSERT INTO public.pagos (
    id, codigo_pago, id_reserva, metodo_pago, num_operacion, ultimos_4_digitos,
    monto_bruto, comision_porcentaje, comision_plataforma, monto_neto_cuidador,
    estado_pago, tipo_comprobante, num_comprobante
)
VALUES
    ('91000000-0000-0000-0000-000000000001', 'PAY-2026-0101', '90000000-0000-0000-0000-000000000001', 'Yape', 'YAPE-882101', NULL, 180.00, 15.00, 27.00, 153.00, 'aprobado', 'Boleta Electrónica', 'B001-000101'),
    ('91000000-0000-0000-0000-000000000002', 'PAY-2026-0102', '90000000-0000-0000-0000-000000000002', 'Plin', 'PLIN-882102', NULL, 145.00, 15.00, 21.75, 123.25, 'aprobado', 'Boleta Electrónica', 'B001-000102'),
    ('91000000-0000-0000-0000-000000000003', 'PAY-2026-0103', '90000000-0000-0000-0000-000000000003', 'Tarjeta', 'VISA-882103', '4242', 80.00, 15.00, 12.00, 68.00, 'aprobado', 'Boleta Electrónica', 'B001-000103'),
    ('91000000-0000-0000-0000-000000000004', 'PAY-2026-0104', '90000000-0000-0000-0000-000000000004', 'Tarjeta', 'MC-882104', '8891', 150.00, 15.00, 22.50, 127.50, 'aprobado', 'Boleta Electrónica', 'B001-000104'),
    ('91000000-0000-0000-0000-000000000005', 'PAY-2026-0105', '90000000-0000-0000-0000-000000000005', 'Yape', 'YAPE-882105', NULL, 90.00, 15.00, 13.50, 76.50, 'aprobado', 'Boleta Electrónica', 'B001-000105'),
    ('91000000-0000-0000-0000-000000000006', 'PAY-2026-0106', '90000000-0000-0000-0000-000000000006', 'Transferencia', 'BCP-882106', NULL, 210.00, 15.00, 31.50, 178.50, 'aprobado', 'Factura Electrónica', 'F001-000106'),
    ('91000000-0000-0000-0000-000000000007', 'PAY-2026-0107', '90000000-0000-0000-0000-000000000007', 'Yape', 'YAPE-882107', NULL, 110.00, 15.00, 16.50, 93.50, 'aprobado', 'Boleta Electrónica', 'B001-000107'),
    ('91000000-0000-0000-0000-000000000008', 'PAY-2026-0108', '90000000-0000-0000-0000-000000000008', 'Tarjeta', 'VISA-882108', '4242', 160.00, 15.00, 24.00, 136.00, 'en_disputa', 'Boleta Electrónica', 'B001-000108')
ON CONFLICT (codigo_pago) DO NOTHING;

-- Liquidaciones en Billetera (mostrando estados pagado, disponible, solicitado y en_garantia)
INSERT INTO public.liquidaciones_cuidadores (
    id, codigo_liquidacion, id_cuidador, id_reserva, tipo_concepto, monto_liquidado,
    estado_liquidacion, metodo_desembolso, cuenta_destino, num_operacion_desembolso,
    fecha_disponible, fecha_solicitud_retiro, fecha_liquidacion
)
VALUES
    ('92000000-0000-0000-0000-000000000001', 'LIQ-2026-0101', '60000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Servicio de Custodia (85%)', 153.00, 'pagado', 'Yape', 'Yape: 984311111', 'OP-BCP-774120', now() - INTERVAL '8 days', now() - INTERVAL '7 days', now() - INTERVAL '6 days'),
    ('92000000-0000-0000-0000-000000000002', 'LIQ-2026-0102', '60000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', 'Servicio de Custodia (85%)', 123.25, 'en_garantia', 'Yape', 'Yape: 984311111', NULL, NULL, NULL, NULL),
    ('92000000-0000-0000-0000-000000000003', 'LIQ-2026-0103', '60000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000003', 'Servicio de Custodia (85%)', 68.00, 'en_garantia', 'Yape', 'Yape: 984311111', NULL, NULL, NULL, NULL),
    ('92000000-0000-0000-0000-000000000004', 'LIQ-2026-0104', '60000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000004', 'Servicio de Custodia (85%)', 127.50, 'en_garantia', 'BCP', 'BCP: 285-99182736-0-12', NULL, NULL, NULL, NULL),
    ('92000000-0000-0000-0000-000000000005', 'LIQ-2026-0105', '60000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000005', 'Servicio de Custodia (85%)', 76.50, 'disponible', 'Plin', 'Plin: 984313333', NULL, now() - INTERVAL '14 days', NULL, NULL),
    ('92000000-0000-0000-0000-000000000006', 'LIQ-2026-0106', '60000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000006', 'Servicio de Custodia (85%)', 178.50, 'solicitado', 'Interbank', 'Interbank: 400-3102938475', NULL, now() - INTERVAL '18 days', now() - INTERVAL '1 day', NULL),
    ('92000000-0000-0000-0000-000000000007', 'LIQ-2026-0107', '60000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000007', 'Servicio de Custodia (85%)', 93.50, 'pagado', 'BBVA', 'BBVA: 0011-0200-0299182736', 'OP-BBVA-992011', now() - INTERVAL '5 days', now() - INTERVAL '4 days', now() - INTERVAL '3 days'),
    ('92000000-0000-0000-0000-000000000008', 'LIQ-2026-0108', '60000000-0000-0000-0000-000000000006', '90000000-0000-0000-0000-000000000008', 'Servicio de Custodia (85%)', 136.00, 'en_garantia', 'CCI', 'CCI: 00228519283746500112', NULL, NULL, NULL, NULL)
ON CONFLICT (codigo_liquidacion) DO NOTHING;

-- Caso de Disputa Abierta en cancelaciones_reembolsos para arbitraje del Administrador
INSERT INTO public.cancelaciones_reembolsos (
    id, codigo_cancelacion, id_reserva, solicitado_por, tipo_caso, horas_anticipacion,
    regla_aplicada, motivo, porcentaje_reembolso, monto_reembolso,
    monto_penalidad_plataforma, monto_compensacion_cuidador, estado_tramite
)
VALUES (
    '93000000-0000-0000-0000-000000000001', 'CAN-2026-0101', '90000000-0000-0000-0000-000000000008',
    '50000000-0000-0000-0000-000000000003', 'disputa', 0,
    'En Arbitraje Administrativo',
    'El cuidador entregó a Chaska 2 horas después de lo pactado en el hotel debido al cierre vehicular en el centro de Cusco. Solicito reembolso parcial del 30%.',
    30.00, 48.00, 16.80, 95.20, 'pendiente_revision'
)
ON CONFLICT (codigo_cancelacion) DO NOTHING;

-- =============================================================================
-- 10. MURO DE FOTOS EN VIVO (REPORTES + FOTOS POSTIMG/UNSPLASH)
-- =============================================================================

INSERT INTO public.reportes_seguimiento (
    id, id_reserva, id_cuidador, tipo_evento, estado_animo_mascota,
    ubicacion_referencial, nota_estado, visto_por_propietario, fecha_reporte
)
VALUES
    ('94000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001',
     'Check-In', 'Feliz y moviendo la cola', 'Urb. Magisterio - Wanchaq, Cusco',
     '¡Inti llegó súper contento! Revisamos su arnés y ya está explorando el jardín cercado.', true, now() - INTERVAL '3 hours'),

    ('94000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001',
     'Paseo y Recreación', 'Activo y juguetón', 'Parque Marianito Ferro - Wanchaq',
     'Paseo soleado de 45 minutos por el parque con hidratación fresca. Se portó excelente.', false, now() - INTERVAL '1 hour'),

    ('94000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
     'Alimentación', 'Con buen apetito', 'Wanchaq, Cusco',
     'Comió toda su ración de croquetas de salmón (sin pollo) y descansó tranquilo.', true, now() - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fotos_reporte (id_reporte, foto_url, origen_almacenamiento, descripcion_foto, orden)
VALUES
    ('94000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=700', 'postimg', 'Inti en el jardín al momento del Check-In', 1),
    ('94000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=700', 'postimg', 'Paseo matutino en Wanchaq bajo el sol cusqueño', 1),
    ('94000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=700', 'postimg', 'Descanso e hidratación en sombra', 2),
    ('94000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=700', 'postimg', 'Hora de su comida hipoalergénica', 1);

-- =============================================================================
-- 11. ALERTAS S.O.S. VETERINARIAS (1 ACTIVA EN ATENCIÓN + 1 HISTÓRICA RESUELTA)
-- =============================================================================

INSERT INTO public.incidencias_emergencias (
    id, codigo_sos, id_reserva, id_mascota, reportado_por, id_clinica_derivada,
    atendido_por_vet, nivel_severidad, tipo_incidencia, descripcion,
    ubicacion_emergencia, estado_sos, diagnostico_clinico, tratamiento_aplicado,
    informe_resolucion, costo_atencion_ref, fecha_incidencia, fecha_atencion, fecha_resolucion
)
VALUES
    (
        '95000000-0000-0000-0000-000000000001', 'SOS-2026-0101', '90000000-0000-0000-0000-000000000002',
        '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000011',
        '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004',
        'moderada', 'Irritación en almohadilla plantar tras paseo',
        'Durante el paseo matutino en Wanchaq, Inti pisó una espina seca en el césped y presenta leve cojera en la pata delantera derecha.',
        'Parque Marianito Ferro, Wanchaq', 'en_atencion',
        'Cuerpo extraño superficial (espina vegetal) en almohadilla metacarpiana derecha sin sangrado profundo.',
        'Extracción aséptica, lavado con clorhexidina al 2% y vendaje protector ligero.',
        NULL, 60.00, now() - INTERVAL '45 minutes', now() - INTERVAL '30 minutes', NULL
    ),
    (
        '95000000-0000-0000-0000-000000000002', 'SOS-2026-0102', '90000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002',
        '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000004',
        'leve', 'Control preventivo por fatiga de altura',
        'Chequeo preventivo solicitado tras caminata larga.',
        'Av. de la Cultura 1420, Wanchaq', 'resuelta',
        'Signos vitales normales; saturación de oxígeno al 96% y frecuencia cardíaca fisiológica.',
        'Hidratación oral con electrolitos y reposo de 2 horas.',
        'Alta médica inmediata sin hallazgos patológicos.', 50.00,
        now() - INTERVAL '9 days', now() - INTERVAL '9 days', now() - INTERVAL '9 days'
    )
ON CONFLICT (codigo_sos) DO NOTHING;

-- =============================================================================
-- 12. RESEÑAS VERIFICADAS (ACTUALIZAN AUTOMÁTICAMENTE LA REPUTACIÓN)
-- =============================================================================

INSERT INTO public.resenas (
    id, id_reserva, id_propietario, id_cuidador, calificacion_estrellas,
    puntualidad_estrellas, comunicacion_estrellas, cuidado_estrellas,
    comentario, respuesta_cuidador, fecha_respuesta, visible
)
VALUES
    (
        '96000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001',
        5, 5, 5, 5,
        '¡Valeria cuidó a Inti como si fuera de su propia familia! Nos envió fotos preciosas en su jardín de Wanchaq y respetó al 100% su dieta sin pollo.',
        '¡Muchas gracias Lucía! Inti es un Golden súper noble, será un gusto recibirlo siempre en casa.',
        now() - INTERVAL '7 days', true
    ),
    (
        '96000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000005',
        '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003',
        5, 5, 5, 5,
        'Excelente guardería en San Sebastián. Camila tiene mucha paciencia y juegos interactivos.',
        '¡Gracias por la confianza!',
        now() - INTERVAL '13 days', true
    ),
    (
        '96000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000006',
        '50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000004',
        5, 5, 5, 5,
        'El espacio campestre de Mateo en San Jerónimo es perfecto para perros grandes. 100% recomendado.',
        NULL, NULL, true
    ),
    (
        '96000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000007',
        '50000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000005',
        5, 5, 5, 5,
        'Sofía took wonderful care of Chaska while we visited the Sacred Valley. Very gentle and punctual with her eye drops!',
        'Thank you Martin! Chaska is adorable.',
        now() - INTERVAL '4 days', true
    )
ON CONFLICT (id_reserva) DO NOTHING;

-- Sincronizar secuencias por encima de los IDs insertados
SELECT setval('seq_paw_id', 6860, true);
SELECT setval('seq_codigo_usuario', 120, true);
SELECT setval('seq_codigo_cuidador', 110, true);
SELECT setval('seq_codigo_clinica', 110, true);
SELECT setval('seq_hu_ecode', 120, true);
SELECT setval('seq_codigo_reserva', 1100, true);
SELECT setval('seq_codigo_pago', 1100, true);
SELECT setval('seq_codigo_liquidacion', 1100, true);
SELECT setval('seq_codigo_sos', 1100, true);
SELECT setval('seq_codigo_cancelacion', 1100, true);

COMMIT;

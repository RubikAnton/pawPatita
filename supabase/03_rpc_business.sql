-- =============================================================================
-- PAW PATITA CUSCO v5.0 — FASE 2: INFRAESTRUCTURA DE BASE DE DATOS (SUPABASE)
-- Archivo: supabase/03_rpc_business.sql
-- Descripción: Catálogo completo de 21 funciones RPC transaccionales atómicas
--              con SECURITY DEFINER y SET search_path = public, auth.
-- =============================================================================

-- =============================================================================
-- 1. rpc_cotizar_reserva
-- Cotización en tiempo real con desglose completo (15% plataforma, 85% cuidador,
-- extras, recargo cachorro y temporada turística Cusco — sin cupones en v5.1).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cotizar_reserva(
    p_id_oferta uuid,
    p_fecha_inicio date,
    p_fecha_fin date,
    p_bloque_horario public.bloque_horario_enum DEFAULT 'todo_el_dia',
    p_extras jsonb DEFAULT '{}'::jsonb,
    p_codigo_cupon text DEFAULT NULL,
    p_id_mascota uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_srv record;
    v_dias integer;
    v_bloque_efectivo public.bloque_horario_enum;
    v_comision_pct numeric(5,4) := 0.15;
    v_tc_usd numeric(10,4) := 3.75;
    v_tarifa_bano numeric(10,2) := 25.00;
    v_subtotal_base numeric(10,2);
    v_id_temporada uuid := NULL;
    v_nombre_temporada text := NULL;
    v_recargo_temp_pct numeric(5,2) := 0.00;
    v_ajuste_temporada numeric(10,2) := 0.00;
    v_es_cachorro boolean := false;
    v_recargo_cachorro numeric(10,2) := 0.00;
    v_extras_monto numeric(10,2) := 0.00;
    v_monto_total numeric(10,2);
    v_comision_plataforma numeric(10,2);
    v_monto_neto_cuidador numeric(10,2);
    v_mes_dia text;
BEGIN
    IF p_fecha_fin < p_fecha_inicio THEN
        RAISE EXCEPTION 'La fecha de fin no puede ser anterior a la fecha de inicio.';
    END IF;

    SELECT s.*, pc.id AS cuidador_id, pc.acepta_cachorros
    INTO v_srv
    FROM public.servicios s
    JOIN public.perfiles_cuidadores pc ON pc.id = s.id_cuidador
    WHERE s.id = p_id_oferta
      AND s.disponible = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La oferta de servicio seleccionada no existe o no está disponible.';
    END IF;

    -- En Hospedaje el bloque es siempre 'todo_el_dia' (24h)
    IF v_srv.categoria = 'Hospedaje' THEN
        v_bloque_efectivo := 'todo_el_dia';
    ELSE
        v_bloque_efectivo := COALESCE(p_bloque_horario, 'todo_el_dia');
    END IF;

    -- Leer parámetros vivos desde configuracion_plataforma
    SELECT COALESCE(MAX(valor_numerico) FILTER (WHERE clave = 'comision_plataforma_pct'), 0.15),
           COALESCE(MAX(valor_numerico) FILTER (WHERE clave = 'tipo_cambio_usd'), 3.75),
           COALESCE(MAX(valor_numerico) FILTER (WHERE clave = 'tarifa_bano_extra'), 25.00)
    INTO v_comision_pct, v_tc_usd, v_tarifa_bano
    FROM public.configuracion_plataforma;

    v_dias := (p_fecha_fin - p_fecha_inicio) + 1;
    v_subtotal_base := ROUND(v_srv.tarifa_diaria_por_perro * v_dias, 2);

    -- Verificar temporada turística de Cusco (formato MM-DD)
    v_mes_dia := to_char(p_fecha_inicio, 'MM-DD');
    SELECT id, nombre, recargo_porcentaje
    INTO v_id_temporada, v_nombre_temporada, v_recargo_temp_pct
    FROM public.temporadas_tarifas
    WHERE activa = true
      AND v_mes_dia BETWEEN mes_dia_inicio AND mes_dia_fin
    ORDER BY recargo_porcentaje DESC
    LIMIT 1;

    IF v_id_temporada IS NOT NULL THEN
        v_ajuste_temporada := ROUND(v_subtotal_base * (v_recargo_temp_pct / 100.0), 2);
    END IF;

    -- Verificar recargo por cachorro (< 1 año) si se informa mascota o flag en extras
    IF p_id_mascota IS NOT NULL THEN
        SELECT (age(CURRENT_DATE, fecha_nacimiento) < INTERVAL '1 year')
        INTO v_es_cachorro
        FROM public.mascotas
        WHERE id = p_id_mascota;
    ELSIF COALESCE((p_extras->>'es_cachorro')::boolean, false) THEN
        v_es_cachorro := true;
    END IF;

    IF COALESCE(v_es_cachorro, false) THEN
        IF NOT v_srv.acepta_cachorros THEN
            RAISE EXCEPTION 'Este cuidador no acepta cachorros menores de 1 año.';
        END IF;
        v_recargo_cachorro := ROUND(v_subtotal_base * 0.10, 2); -- 10% recargo cuidado cachorro
    END IF;

    -- Calcular extras opcionales (baño higiénico, recojo en hotel)
    IF COALESCE((p_extras->>'bano_higienico')::boolean, false) THEN
        v_extras_monto := v_extras_monto + v_tarifa_bano;
    END IF;

    IF COALESCE((p_extras->>'recojo_hotel')::boolean, false) THEN
        IF NOT v_srv.incluye_recojo_hotel THEN
            v_extras_monto := v_extras_monto + COALESCE(v_srv.tarifa_recojo_extra, 15.00);
        END IF;
    END IF;

    -- v5.1: Cupones deshabilitados por regla de negocio (cotización transparente sin cupones)
    v_monto_total := GREATEST(ROUND(v_subtotal_base + v_ajuste_temporada + v_recargo_cachorro + v_extras_monto, 2), 1.00);
    v_comision_plataforma := ROUND(v_monto_total * v_comision_pct, 2);
    v_monto_neto_cuidador := ROUND(v_monto_total - v_comision_plataforma, 2);

    RETURN jsonb_build_object(
        'exito', true,
        'id_oferta', v_srv.id,
        'hu_ecode', v_srv.hu_ecode,
        'id_cuidador', v_srv.id_cuidador,
        'categoria', v_srv.categoria,
        'tipo_servicio', v_srv.tipo_servicio,
        'fecha_inicio', p_fecha_inicio,
        'fecha_fin', p_fecha_fin,
        'bloque_horario', v_bloque_efectivo,
        'dias_calculados', v_dias,
        'tarifa_unitaria', v_srv.tarifa_diaria_por_perro,
        'subtotal_base', v_subtotal_base,
        'id_temporada', v_id_temporada,
        'nombre_temporada', v_nombre_temporada,
        'ajuste_temporada', v_ajuste_temporada,
        'es_cachorro', COALESCE(v_es_cachorro, false),
        'recargo_cachorro', v_recargo_cachorro,
        'extras_monto', v_extras_monto,
        'id_cupon', NULL,
        'codigo_cupon', NULL,
        'descuento_cupon', 0,
        'cupon_valido', false,
        'monto_total_pen', v_monto_total,
        'monto_total_usd', ROUND(v_monto_total / v_tc_usd, 2),
        'tipo_cambio_usd', v_tc_usd,
        'comision_porcentaje', ROUND(v_comision_pct * 100, 2),
        'comision_plataforma_15', v_comision_plataforma,
        'monto_neto_cuidador_85', v_monto_neto_cuidador
    );
END;
$$;

-- =============================================================================
-- 2. rpc_crear_reserva
-- Creación transaccional atómica con bloqueo FOR UPDATE anti-overbooking por
-- fecha y bloque horario, exigencia 24h en Hospedaje, pago (15%/85%), garantía
-- en billetera, TyC y notificación.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_crear_reserva(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_id_propietario uuid;
    v_id_oferta uuid;
    v_id_mascota uuid;
    v_fecha_inicio date;
    v_fecha_fin date;
    v_bloque_horario public.bloque_horario_enum;
    v_hora_inicio time;
    v_hora_fin time;
    v_extras jsonb;
    v_metodo_pago public.metodo_pago_enum;
    v_num_operacion text;
    v_ultimos_4 text;
    v_tipo_comprobante text;
    v_notas text;
    v_moneda text;
    v_acepta_tyc boolean;
    v_servicio record;
    v_cotizacion jsonb;
    v_mascota record;
    v_cuidador record;
    v_dia date;
    v_disp record;
    v_id_reserva uuid;
    v_codigo_reserva text;
    v_id_pago uuid;
    v_codigo_pago text;
    v_num_comprobante text;
    v_id_liquidacion uuid;
BEGIN
    v_id_propietario := COALESCE(auth.uid(), (p_payload->>'id_propietario')::uuid);
    IF v_id_propietario IS NULL THEN
        RAISE EXCEPTION 'Debe iniciar sesión como propietario para crear una reserva.';
    END IF;

    v_id_oferta := (p_payload->>'id_oferta')::uuid;
    v_id_mascota := (p_payload->>'id_mascota')::uuid;
    v_fecha_inicio := (p_payload->>'fecha_inicio')::date;
    v_fecha_fin := COALESCE((p_payload->>'fecha_fin')::date, v_fecha_inicio);
    v_bloque_horario := COALESCE(NULLIF(TRIM(p_payload->>'bloque_horario'), '')::public.bloque_horario_enum, 'todo_el_dia');
    v_extras := COALESCE(p_payload->'extras', '{}'::jsonb);
    v_metodo_pago := COALESCE((p_payload->>'metodo_pago')::public.metodo_pago_enum, 'Yape');
    v_num_operacion := COALESCE(NULLIF(TRIM(p_payload->>'num_operacion'), ''), 'OP-' || floor(random() * 900000 + 100000)::text);
    v_ultimos_4 := NULLIF(TRIM(COALESCE(p_payload->>'ultimos_4_digitos', '')), '');
    v_tipo_comprobante := COALESCE(NULLIF(TRIM(p_payload->>'tipo_comprobante'), ''), 'Boleta Electrónica');
    v_notas := COALESCE(p_payload->>'notas_propietario', '');
    v_moneda := COALESCE(NULLIF(TRIM(p_payload->>'moneda_referencial'), ''), 'PEN');
    v_acepta_tyc := COALESCE((p_payload->>'acepta_tyc')::boolean, true);

    IF NOT v_acepta_tyc THEN
        RAISE EXCEPTION 'Es obligatorio aceptar los Términos y Condiciones de Custodia.';
    END IF;

    IF v_fecha_fin < v_fecha_inicio THEN
        RAISE EXCEPTION 'La fecha de fin (%) no puede ser anterior a la fecha de inicio (%).',
            to_char(v_fecha_fin, 'DD/MM/YYYY'), to_char(v_fecha_inicio, 'DD/MM/YYYY');
    END IF;

    -- Verificar categoría del servicio y exigir bloque 'todo_el_dia' cuando es 'Hospedaje'
    SELECT * INTO v_servicio
    FROM public.servicios
    WHERE id = v_id_oferta
      AND disponible = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La oferta de servicio seleccionada no existe o no está disponible.';
    END IF;

    IF v_servicio.categoria = 'Hospedaje' AND v_bloque_horario != 'todo_el_dia' THEN
        RAISE EXCEPTION 'El servicio de Hospedaje requiere obligatoriamente la modalidad de Estadía Completa 24 Horas (bloque todo_el_dia).';
    END IF;

    -- Determinar horas exactas según bloque horario
    CASE v_bloque_horario
        WHEN 'manana_08_12' THEN v_hora_inicio := '08:00:00'; v_hora_fin := '12:00:00';
        WHEN 'tarde_14_18'  THEN v_hora_inicio := '14:00:00'; v_hora_fin := '18:00:00';
        WHEN 'noche_18_22'  THEN v_hora_inicio := '18:00:00'; v_hora_fin := '22:00:00';
        WHEN 'todo_el_dia'  THEN v_hora_inicio := '08:00:00'; v_hora_fin := '20:00:00';
        ELSE
            v_hora_inicio := COALESCE((p_payload->>'hora_inicio')::time, '08:00:00');
            v_hora_fin := COALESCE((p_payload->>'hora_fin')::time, '20:00:00');
    END CASE;

    -- Validar mascota del propietario y su estado sanitario PAW-ID
    SELECT * INTO v_mascota
    FROM public.mascotas
    WHERE id = v_id_mascota
      AND id_propietario = v_id_propietario
      AND activa = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La mascota seleccionada no existe o no pertenece a su cuenta.';
    END IF;

    IF v_mascota.estado_validacion_vet = 'observado' THEN
        RAISE EXCEPTION 'La ficha PAW-ID (%) de % tiene observaciones médicas pendientes de subsanar.', v_mascota.paw_id, v_mascota.nombre;
    END IF;

    -- Cotizar de forma autoritativa en servidor (sin cupones)
    v_cotizacion := public.rpc_cotizar_reserva(
        v_id_oferta,
        v_fecha_inicio,
        v_fecha_fin,
        v_bloque_horario,
        v_extras,
        NULL,
        v_id_mascota
    );

    SELECT * INTO v_cuidador
    FROM public.perfiles_cuidadores
    WHERE id = (v_cotizacion->>'id_cuidador')::uuid
      AND estado_postulacion = 'aprobado';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El cuidador seleccionado no se encuentra activo para recibir reservas.';
    END IF;

    -- CONTROL ANTI-OVERBOOKING ATÓMICO POR CADA DÍA DEL RANGO [v_fecha_inicio..v_fecha_fin] Y BLOQUE HORARIO (FOR UPDATE)
    v_dia := v_fecha_inicio;
    WHILE v_dia <= v_fecha_fin LOOP
        IF EXISTS (
            SELECT 1 FROM public.disponibilidad_cuidadores
            WHERE id_cuidador = v_cuidador.id
              AND fecha = v_dia
              AND estado_bloque = 'bloqueado'
              AND (bloque_horario = 'todo_el_dia' OR bloque_horario = v_bloque_horario)
        ) THEN
            RAISE EXCEPTION 'El cuidador ha bloqueado su agenda el día % (%).',
                to_char(v_dia, 'DD/MM/YYYY'), v_bloque_horario;
        END IF;

        SELECT * INTO v_disp
        FROM public.disponibilidad_cuidadores
        WHERE id_cuidador = v_cuidador.id
          AND fecha = v_dia
          AND bloque_horario = v_bloque_horario
          AND hora_inicio = v_hora_inicio
          AND hora_fin = v_hora_fin
        FOR UPDATE;

        IF FOUND THEN
            IF v_disp.estado_bloque = 'bloqueado' THEN
                RAISE EXCEPTION 'El cuidador ha bloqueado su agenda el día % para el bloque %.',
                    to_char(v_dia, 'DD/MM/YYYY'), v_bloque_horario;
            END IF;
            IF v_disp.cupos_reservados >= v_disp.cupo_maximo THEN
                RAISE EXCEPTION 'Sin cupos disponibles para el día % en el bloque % (Ocupados: %/%).',
                    to_char(v_dia, 'DD/MM/YYYY'), v_bloque_horario, v_disp.cupos_reservados, v_disp.cupo_maximo;
            END IF;

            UPDATE public.disponibilidad_cuidadores
            SET cupos_reservados = cupos_reservados + 1
            WHERE id = v_disp.id;
        ELSE
            -- Crear bloque con 1 cupo reservado respetando la capacidad máxima del cuidador
            INSERT INTO public.disponibilidad_cuidadores (
                id_cuidador,
                fecha,
                bloque_horario,
                hora_inicio,
                hora_fin,
                cupo_maximo,
                cupos_reservados
            )
            VALUES (
                v_cuidador.id,
                v_dia,
                v_bloque_horario,
                v_hora_inicio,
                v_hora_fin,
                v_cuidador.capacidad_max_mascotas,
                1
            );
        END IF;

        v_dia := v_dia + 1;
    END LOOP;

    -- Insertar Reserva (forzando id_cupon = NULL y descuento_cupon = 0)
    INSERT INTO public.reservas (
        id_propietario,
        id_cuidador,
        id_oferta,
        id_mascota,
        fecha_inicio,
        fecha_fin,
        bloque_horario,
        hora_inicio,
        hora_fin,
        dias_calculados,
        tarifa_unitaria,
        subtotal_base,
        id_temporada,
        ajuste_temporada,
        recargo_cachorro,
        id_cupon,
        descuento_cupon,
        extras_detalle,
        extras_monto,
        monto_total,
        moneda_referencial,
        estado_reserva,
        notas_propietario
    )
    VALUES (
        v_id_propietario,
        v_cuidador.id,
        v_id_oferta,
        v_id_mascota,
        v_fecha_inicio,
        v_fecha_fin,
        v_bloque_horario,
        v_hora_inicio,
        v_hora_fin,
        (v_cotizacion->>'dias_calculados')::integer,
        (v_cotizacion->>'tarifa_unitaria')::numeric,
        (v_cotizacion->>'subtotal_base')::numeric,
        NULLIF(v_cotizacion->>'id_temporada', '')::uuid,
        (v_cotizacion->>'ajuste_temporada')::numeric,
        (v_cotizacion->>'recargo_cachorro')::numeric,
        NULL,
        0.00,
        v_extras,
        (v_cotizacion->>'extras_monto')::numeric,
        (v_cotizacion->>'monto_total_pen')::numeric,
        v_moneda,
        'pendiente_confirmacion',
        v_notas
    )
    RETURNING id, codigo_reserva INTO v_id_reserva, v_codigo_reserva;

    -- Insertar Pago (15% comisión plataforma, 85% neto cuidador)
    INSERT INTO public.pagos (
        id_reserva,
        metodo_pago,
        num_operacion,
        ultimos_4_digitos,
        monto_bruto,
        comision_porcentaje,
        comision_plataforma,
        monto_neto_cuidador,
        estado_pago,
        tipo_comprobante
    )
    VALUES (
        v_id_reserva,
        v_metodo_pago,
        v_num_operacion,
        v_ultimos_4,
        (v_cotizacion->>'monto_total_pen')::numeric,
        (v_cotizacion->>'comision_porcentaje')::numeric,
        (v_cotizacion->>'comision_plataforma_15')::numeric,
        (v_cotizacion->>'monto_neto_cuidador_85')::numeric,
        'aprobado',
        v_tipo_comprobante
    )
    RETURNING id, codigo_pago, num_comprobante INTO v_id_pago, v_codigo_pago, v_num_comprobante;

    -- Registrar el 85% en la billetera del cuidador en estado 'en_garantia'
    INSERT INTO public.liquidaciones_cuidadores (
        id_cuidador,
        id_reserva,
        tipo_concepto,
        monto_liquidado,
        estado_liquidacion,
        metodo_desembolso,
        cuenta_destino
    )
    VALUES (
        v_cuidador.id,
        v_id_reserva,
        'Servicio de Custodia (85%)',
        (v_cotizacion->>'monto_neto_cuidador_85')::numeric,
        'en_garantia',
        v_cuidador.cuenta_cobro_tipo,
        v_cuidador.cuenta_cobro_numero
    )
    RETURNING id INTO v_id_liquidacion;

    -- Registrar aceptación de TyC de la reserva
    INSERT INTO public.aceptaciones_tyc (
        id_usuario,
        codigo_version,
        contexto_aceptacion
    )
    VALUES (
        v_id_propietario,
        'v5.1-RESERVA',
        'Reserva ' || v_codigo_reserva
    );

    -- Notificar en tiempo real al Cuidador y al Propietario
    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    VALUES
    (
        v_cuidador.id_usuario,
        'reserva',
        'Nueva Solicitud de Reserva ' || v_codigo_reserva,
        format('Tienes una solicitud para cuidar a %s del %s al %s (%s). Monto neto: S/ %s.',
               v_mascota.nombre, v_fecha_inicio, v_fecha_fin, v_bloque_horario, v_cotizacion->>'monto_neto_cuidador_85'),
        'reservas',
        v_id_reserva::text
    ),
    (
        v_id_propietario,
        'pago',
        'Reserva y Pago Confirmados (' || v_codigo_reserva || ')',
        format('Tu pago de S/ %s (%s) está protegido en garantía hasta finalizar el servicio.',
               v_cotizacion->>'monto_total_pen', v_num_comprobante),
        'reservas',
        v_id_reserva::text
    );

    RETURN jsonb_build_object(
        'exito', true,
        'mensaje', 'Reserva creada exitosamente con garantía anti-overbooking.',
        'id_reserva', v_id_reserva,
        'codigo_reserva', v_codigo_reserva,
        'id_pago', v_id_pago,
        'codigo_pago', v_codigo_pago,
        'num_comprobante', v_num_comprobante,
        'id_liquidacion', v_id_liquidacion,
        'cotizacion', v_cotizacion
    );
END;
$$;

-- =============================================================================
-- 3. rpc_cuidador_responder_reserva
-- Aceptar o rechazar una solicitud de reserva. Si rechaza, exige motivo,
-- libera inmediatamente el cupo horario y reembolsa el 100% al propietario.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cuidador_responder_reserva(
    p_id_reserva uuid,
    p_accion text,
    p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
    v_accion text := LOWER(TRIM(p_accion));
BEGIN
    SELECT r.*, pc.id_usuario AS cuidador_user_id, p.monto_bruto
    INTO v_res
    FROM public.reservas r
    JOIN public.perfiles_cuidadores pc ON pc.id = r.id_cuidador
    JOIN public.pagos p ON p.id_reserva = r.id
    WHERE r.id = p_id_reserva
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La reserva especificada no existe.';
    END IF;

    IF v_res.estado_reserva != 'pendiente_confirmacion' THEN
        RAISE EXCEPTION 'Solo se pueden responder reservas en estado pendiente de confirmación (estado actual: %).', v_res.estado_reserva;
    END IF;

    IF v_accion IN ('aceptar', 'confirmar') THEN
        UPDATE public.reservas
        SET estado_reserva = 'confirmada'
        WHERE id = p_id_reserva;

        INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
        VALUES (
            v_res.id_propietario,
            'reserva',
            '¡Reserva Confirmada! (' || v_res.codigo_reserva || ')',
            'El cuidador ha aceptado tu reserva. Ya puedes coordinar detalles por WhatsApp desde tu panel.',
            'reservas',
            p_id_reserva::text
        );

        RETURN jsonb_build_object(
            'exito', true,
            'estado_nuevo', 'confirmada',
            'mensaje', 'Reserva confirmada exitosamente.'
        );

    ELSIF v_accion = 'rechazar' THEN
        IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 5 THEN
            RAISE EXCEPTION 'Debe indicar un motivo válido (mínimo 5 caracteres) para rechazar la reserva.';
        END IF;

        UPDATE public.reservas
        SET estado_reserva = 'cancelada',
            motivo_rechazo = TRIM(p_motivo)
        WHERE id = p_id_reserva;

        -- Liberar cupo horario en disponibilidad_cuidadores
        UPDATE public.disponibilidad_cuidadores
        SET cupos_reservados = GREATEST(cupos_reservados - 1, 0)
        WHERE id_cuidador = v_res.id_cuidador
          AND fecha BETWEEN v_res.fecha_inicio AND v_res.fecha_fin
          AND bloque_horario = v_res.bloque_horario;

        -- Reembolsar 100% del pago y anular la liquidación en garantía
        UPDATE public.pagos
        SET estado_pago = 'reembolsado_total',
            monto_reembolsado = monto_bruto,
            penalidad_retenida = 0.00
        WHERE id_reserva = p_id_reserva;

        UPDATE public.liquidaciones_cuidadores
        SET estado_liquidacion = 'anulado',
            motivo_rechazo = 'Reserva rechazada por el cuidador: ' || TRIM(p_motivo)
        WHERE id_reserva = p_id_reserva;

        INSERT INTO public.cancelaciones_reembolsos (
            id_reserva,
            solicitado_por,
            tipo_caso,
            horas_anticipacion,
            regla_aplicada,
            motivo,
            porcentaje_reembolso,
            monto_reembolso,
            monto_penalidad_plataforma,
            monto_compensacion_cuidador,
            estado_tramite,
            resolucion_admin,
            fecha_resolucion
        )
        VALUES (
            p_id_reserva,
            COALESCE(auth.uid(), v_res.cuidador_user_id),
            'rechazo_cuidador',
            0,
            'Rechazo del Cuidador (100% Reembolso al Propietario)',
            TRIM(p_motivo),
            100.00,
            v_res.monto_bruto,
            0.00,
            0.00,
            'procesado',
            'Reembolso automático del 100% por rechazo del cuidador.',
            now()
        );

        INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
        VALUES (
            v_res.id_propietario,
            'reserva',
            'Reserva Rechazada con Reembolso 100% (' || v_res.codigo_reserva || ')',
            format('El cuidador no pudo tomar la reserva (%s). Se ha procesado el reembolso del 100%% (S/ %s).', TRIM(p_motivo), v_res.monto_bruto),
            'reservas',
            p_id_reserva::text
        );

        RETURN jsonb_build_object(
            'exito', true,
            'estado_nuevo', 'cancelada',
            'mensaje', 'Reserva rechazada, cupo liberado y reembolso del 100% registrado.'
        );
    ELSE
        RAISE EXCEPTION 'Acción inválida "%". Use "aceptar" o "rechazar".', p_accion;
    END IF;
END;
$$;

-- =============================================================================
-- 4. rpc_cuidador_checkin
-- Inicia formalmente la custodia (confirmada -> en_curso) con checklist
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cuidador_checkin(
    p_id_reserva uuid,
    p_checklist jsonb DEFAULT '{"estado_fisico_ok": true, "cartilla_verificada": true, "alimento_recibido": true}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
BEGIN
    SELECT * INTO v_res
    FROM public.reservas
    WHERE id = p_id_reserva
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada.';
    END IF;

    IF v_res.estado_reserva != 'confirmada' THEN
        RAISE EXCEPTION 'Solo se puede realizar Check-In de reservas en estado confirmada.';
    END IF;

    UPDATE public.reservas
    SET estado_reserva = 'en_curso',
        checklist_checkin = COALESCE(p_checklist, '{}'::jsonb),
        fecha_checkin = now()
    WHERE id = p_id_reserva;

    -- Crear reporte automático de Check-In en el Muro
    INSERT INTO public.reportes_seguimiento (
        id_reserva,
        id_cuidador,
        tipo_evento,
        estado_animo_mascota,
        ubicacion_referencial,
        nota_estado
    )
    VALUES (
        p_id_reserva,
        v_res.id_cuidador,
        'Check-In',
        'Feliz y adaptándose',
        'Domicilio del Cuidador - Cusco',
        'Check-In completado satisfactoriamente. Recepción verificada con protocolo de seguridad.'
    );

    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    VALUES (
        v_res.id_propietario,
        'reserva',
        'Check-In Completado (' || v_res.codigo_reserva || ')',
        'Tu mascota ya inició su servicio de custodia. Sigue sus fotos y reportes en el Muro en Vivo.',
        'reservas',
        p_id_reserva::text
    );

    RETURN jsonb_build_object(
        'exito', true,
        'estado_nuevo', 'en_curso',
        'fecha_checkin', now(),
        'mensaje', 'Check-In registrado con éxito. El servicio está En Curso.'
    );
END;
$$;

-- =============================================================================
-- 5. rpc_cuidador_checkout
-- Finaliza la custodia (en_curso -> finalizada) y LIBERA AUTOMÁTICAMENTE el
-- saldo del cuidador de 'en_garantia' a 'disponible' para retiro.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cuidador_checkout(
    p_id_reserva uuid,
    p_checklist jsonb DEFAULT '{"entrega_conforme": true, "pertenencias_devueltas": true, "sin_incidencias": true}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
    v_monto_liberado numeric(10,2);
BEGIN
    SELECT * INTO v_res
    FROM public.reservas
    WHERE id = p_id_reserva
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada.';
    END IF;

    IF v_res.estado_reserva != 'en_curso' THEN
        RAISE EXCEPTION 'Solo se puede realizar Check-Out de reservas que estén En Curso.';
    END IF;

    -- Validación temporal estricta en hora oficial de Cusco (America/Lima, UTC-5)
    IF ((v_res.fecha_inicio::text || ' ' || COALESCE(v_res.hora_inicio, '08:00:00')::text)::timestamp AT TIME ZONE 'America/Lima') > now() THEN
        RAISE EXCEPTION 'No puedes registrar el Check-Out antes de la fecha y hora de inicio programada (% %).',
            to_char(v_res.fecha_inicio, 'DD/MM/YYYY'),
            to_char(COALESCE(v_res.hora_inicio, '08:00:00'::time), 'HH24:MI');
    END IF;

    UPDATE public.reservas
    SET estado_reserva = 'finalizada',
        checklist_checkout = COALESCE(p_checklist, '{}'::jsonb),
        fecha_checkout = now()
    WHERE id = p_id_reserva;

    -- Liberar el 85% en la billetera del cuidador: en_garantia -> disponible
    UPDATE public.liquidaciones_cuidadores
    SET estado_liquidacion = 'disponible',
        fecha_disponible = now()
    WHERE id_reserva = p_id_reserva
      AND estado_liquidacion = 'en_garantia'
    RETURNING monto_liquidado INTO v_monto_liberado;

    -- Reporte de cierre en el muro
    INSERT INTO public.reportes_seguimiento (
        id_reserva,
        id_cuidador,
        tipo_evento,
        estado_animo_mascota,
        ubicacion_referencial,
        nota_estado
    )
    VALUES (
        p_id_reserva,
        v_res.id_cuidador,
        'Check-Out',
        'Excelente y tranquilo',
        'Cusco',
        'Check-Out completado. Mascota entregada sana y feliz a su propietario.'
    );

    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    VALUES (
        v_res.id_propietario,
        'reserva',
        'Servicio Finalizado (' || v_res.codigo_reserva || ') — ¡Califica tu experiencia!',
        'El servicio ha concluido con éxito. Ya puedes dejar tu reseña de 1 a 5 estrellas.',
        'reservas',
        p_id_reserva::text
    );

    RETURN jsonb_build_object(
        'exito', true,
        'estado_nuevo', 'finalizada',
        'fecha_checkout', now(),
        'monto_liberado_billetera', COALESCE(v_monto_liberado, 0.00),
        'mensaje', 'Check-Out completado. Los fondos en garantía han pasado a Saldo Disponible para Retiro.'
    );
END;
$$;

-- =============================================================================
-- 6. rpc_preview_cancelacion
-- Calcula con exactitud matemática la política escalonada de cancelación:
-- > 48h : 100% reembolso propietario / 0% penalidad
-- 24-48h: 70% reembolso propietario / 30% penalidad (15% plataforma + 15% cuidador)
-- < 24h : 50% reembolso propietario / 50% penalidad (15% plataforma + 35% cuidador)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_preview_cancelacion(p_id_reserva uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
    v_inicio_ts timestamptz;
    v_horas numeric(10,2);
    v_pct_reembolso numeric(5,2);
    v_pct_penalidad numeric(5,2);
    v_regla text;
    v_monto_reembolso numeric(10,2);
    v_monto_penalidad_total numeric(10,2);
    v_monto_penalidad_plataforma numeric(10,2);
    v_monto_compensacion_cuidador numeric(10,2);
BEGIN
    SELECT r.*, p.monto_bruto
    INTO v_res
    FROM public.reservas r
    JOIN public.pagos p ON p.id_reserva = r.id
    WHERE r.id = p_id_reserva;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada.';
    END IF;

    IF v_res.estado_reserva NOT IN ('pendiente_confirmacion', 'confirmada') THEN
        RAISE EXCEPTION 'No se puede cancelar una reserva en estado "%". Si el servicio está en curso, abra una disputa.', v_res.estado_reserva;
    END IF;

    v_inicio_ts := ((v_res.fecha_inicio::text || ' ' || v_res.hora_inicio::text)::timestamp AT TIME ZONE 'America/Lima');
    v_horas := ROUND((EXTRACT(EPOCH FROM (v_inicio_ts - now())) / 3600.0)::numeric, 2);

    -- Si la reserva aún no había sido confirmada por el cuidador o faltan > 48h: 100% reembolso
    IF v_res.estado_reserva = 'pendiente_confirmacion' OR v_horas > 48.0 THEN
        v_pct_reembolso := 100.00;
        v_pct_penalidad := 0.00;
        v_regla := 'Cancelación Libre (> 48h o sin confirmar): 100% Reembolso / 0% Penalidad';
        v_monto_reembolso := v_res.monto_bruto;
        v_monto_penalidad_total := 0.00;
        v_monto_penalidad_plataforma := 0.00;
        v_monto_compensacion_cuidador := 0.00;

    ELSIF v_horas >= 24.0 THEN
        v_pct_reembolso := 70.00;
        v_pct_penalidad := 30.00;
        v_regla := 'Cancelación Moderada (24h a 48h): 70% Reembolso / 30% Penalidad (15% Plataforma + 15% Cuidador)';
        v_monto_reembolso := ROUND(v_res.monto_bruto * 0.70, 2);
        v_monto_penalidad_total := ROUND(v_res.monto_bruto - v_monto_reembolso, 2);
        v_monto_penalidad_plataforma := ROUND(v_res.monto_bruto * 0.15, 2);
        v_monto_compensacion_cuidador := ROUND(v_monto_penalidad_total - v_monto_penalidad_plataforma, 2);

    ELSE
        v_pct_reembolso := 50.00;
        v_pct_penalidad := 50.00;
        v_regla := 'Cancelación Tardía (< 24h): 50% Reembolso / 50% Penalidad (15% Plataforma + 35% Cuidador)';
        v_monto_reembolso := ROUND(v_res.monto_bruto * 0.50, 2);
        v_monto_penalidad_total := ROUND(v_res.monto_bruto - v_monto_reembolso, 2);
        v_monto_penalidad_plataforma := ROUND(v_res.monto_bruto * 0.15, 2);
        v_monto_compensacion_cuidador := ROUND(v_monto_penalidad_total - v_monto_penalidad_plataforma, 2);
    END IF;

    RETURN jsonb_build_object(
        'exito', true,
        'id_reserva', v_res.id,
        'codigo_reserva', v_res.codigo_reserva,
        'estado_actual', v_res.estado_reserva,
        'horas_anticipacion', GREATEST(v_horas, 0),
        'regla_aplicada', v_regla,
        'monto_bruto', v_res.monto_bruto,
        'porcentaje_reembolso', v_pct_reembolso,
        'porcentaje_penalidad', v_pct_penalidad,
        'monto_reembolso', v_monto_reembolso,
        'monto_penalidad', v_monto_penalidad_total,
        'monto_penalidad_plataforma', v_monto_penalidad_plataforma,
        'monto_compensacion_cuidador', v_monto_compensacion_cuidador
    );
END;
$$;

-- =============================================================================
-- 7. rpc_cancelar_reserva
-- Ejecuta atómicamente la cancelación escalonada, libera los cupos horarios y
-- ajusta pago + liquidación del cuidador.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cancelar_reserva(
    p_id_reserva uuid,
    p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_preview jsonb;
    v_res record;
    v_monto_reembolso numeric(10,2);
    v_monto_penalidad numeric(10,2);
    v_monto_plat numeric(10,2);
    v_monto_cuid numeric(10,2);
    v_id_cancelacion uuid;
BEGIN
    IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 5 THEN
        RAISE EXCEPTION 'Debe ingresar el motivo de la cancelación (mínimo 5 caracteres).';
    END IF;

    SELECT * INTO v_res
    FROM public.reservas
    WHERE id = p_id_reserva
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada.';
    END IF;

    v_preview := public.rpc_preview_cancelacion(p_id_reserva);
    v_monto_reembolso := (v_preview->>'monto_reembolso')::numeric;
    v_monto_penalidad := (v_preview->>'monto_penalidad')::numeric;
    v_monto_plat := (v_preview->>'monto_penalidad_plataforma')::numeric;
    v_monto_cuid := (v_preview->>'monto_compensacion_cuidador')::numeric;

    -- 1. Cambiar estado de reserva
    UPDATE public.reservas
    SET estado_reserva = 'cancelada',
        motivo_rechazo = 'Cancelada por propietario: ' || TRIM(p_motivo)
    WHERE id = p_id_reserva;

    -- 2. Liberar cupo en disponibilidad_cuidadores
    UPDATE public.disponibilidad_cuidadores
    SET cupos_reservados = GREATEST(cupos_reservados - 1, 0)
    WHERE id_cuidador = v_res.id_cuidador
      AND fecha BETWEEN v_res.fecha_inicio AND v_res.fecha_fin
      AND bloque_horario = v_res.bloque_horario;

    -- 3. Actualizar pago
    UPDATE public.pagos
    SET estado_pago = CASE WHEN v_monto_penalidad = 0 THEN 'reembolsado_total'::estado_pago_enum ELSE 'reembolsado_parcial'::estado_pago_enum END,
        monto_reembolsado = v_monto_reembolso,
        penalidad_retenida = v_monto_penalidad,
        comision_plataforma = v_monto_plat,
        monto_neto_cuidador = v_monto_cuid
    WHERE id_reserva = p_id_reserva;

    -- 4. Ajustar billetera del cuidador (si hay compensación pasa a disponible, si es 0 se anula)
    IF v_monto_cuid > 0 THEN
        UPDATE public.liquidaciones_cuidadores
        SET tipo_concepto = 'Compensación por Cancelación',
            monto_liquidado = v_monto_cuid,
            estado_liquidacion = 'disponible',
            fecha_disponible = now()
        WHERE id_reserva = p_id_reserva;
    ELSE
        UPDATE public.liquidaciones_cuidadores
        SET estado_liquidacion = 'anulado',
            motivo_rechazo = 'Cancelación con >48h sin penalidad'
        WHERE id_reserva = p_id_reserva;
    END IF;

    -- 5. Registrar expediente en cancelaciones_reembolsos
    INSERT INTO public.cancelaciones_reembolsos (
        id_reserva,
        solicitado_por,
        tipo_caso,
        horas_anticipacion,
        regla_aplicada,
        motivo,
        porcentaje_reembolso,
        monto_reembolso,
        monto_penalidad_plataforma,
        monto_compensacion_cuidador,
        estado_tramite,
        resolucion_admin,
        fecha_resolucion
    )
    VALUES (
        p_id_reserva,
        COALESCE(auth.uid(), v_res.id_propietario),
        'cancelacion_propietario',
        (v_preview->>'horas_anticipacion')::numeric,
        v_preview->>'regla_aplicada',
        TRIM(p_motivo),
        (v_preview->>'porcentaje_reembolso')::numeric,
        v_monto_reembolso,
        v_monto_plat,
        v_monto_cuid,
        'procesado',
        'Aplicada automáticamente según política escalonada de cancelación v5.0.',
        now()
    )
    RETURNING id INTO v_id_cancelacion;

    RETURN jsonb_build_object(
        'exito', true,
        'id_cancelacion', v_id_cancelacion,
        'preview', v_preview,
        'mensaje', 'Reserva cancelada y reembolso procesado conforme a la política escalonada.'
    );
END;
$$;

-- =============================================================================
-- 8. rpc_abrir_disputa
-- Congela los fondos de la reserva y eleva el caso a arbitraje del Administrador
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_abrir_disputa(
    p_id_reserva uuid,
    p_motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
    v_id_disputa uuid;
BEGIN
    IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 10 THEN
        RAISE EXCEPTION 'Describa detalladamente el motivo de la disputa (mínimo 10 caracteres).';
    END IF;

    SELECT r.*, p.monto_bruto
    INTO v_res
    FROM public.reservas r
    JOIN public.pagos p ON p.id_reserva = r.id
    WHERE r.id = p_id_reserva
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada.';
    END IF;

    UPDATE public.reservas
    SET estado_reserva = 'en_disputa'
    WHERE id = p_id_reserva;

    UPDATE public.pagos
    SET estado_pago = 'en_disputa'
    WHERE id_reserva = p_id_reserva;

    -- Retener fondos en garantía mientras dura el arbitraje
    UPDATE public.liquidaciones_cuidadores
    SET estado_liquidacion = 'en_garantia'
    WHERE id_reserva = p_id_reserva
      AND estado_liquidacion IN ('en_garantia', 'disponible');

    INSERT INTO public.cancelaciones_reembolsos (
        id_reserva,
        solicitado_por,
        tipo_caso,
        horas_anticipacion,
        regla_aplicada,
        motivo,
        porcentaje_reembolso,
        monto_reembolso,
        monto_penalidad_plataforma,
        monto_compensacion_cuidador,
        estado_tramite
    )
    VALUES (
        p_id_reserva,
        COALESCE(auth.uid(), v_res.id_propietario),
        'disputa',
        0,
        'En Arbitraje Administrativo',
        TRIM(p_motivo),
        50.00,
        ROUND(v_res.monto_bruto * 0.50, 2),
        ROUND(v_res.monto_bruto * 0.15, 2),
        ROUND(v_res.monto_bruto * 0.35, 2),
        'pendiente_revision'
    )
    RETURNING id INTO v_id_disputa;

    RETURN jsonb_build_object(
        'exito', true,
        'id_disputa', v_id_disputa,
        'estado_nuevo', 'en_disputa',
        'mensaje', 'Disputa abierta formalmente. Los fondos han sido congelados hasta el laudo del Administrador.'
    );
END;
$$;

-- =============================================================================
-- 9. rpc_admin_resolver_caso
-- Arbitraje administrativo con porcentaje configurable de reembolso (0% a 100%)
-- y dictamen formal escrito.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_resolver_caso(
    p_id_cancelacion uuid,
    p_accion text,
    p_pct_reembolso numeric,
    p_resolucion text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caso record;
    v_pct numeric(5,2);
    v_reembolso numeric(10,2);
    v_remanente numeric(10,2);
    v_comision_plat numeric(10,2);
    v_neto_cuid numeric(10,2);
BEGIN
    IF p_resolucion IS NULL OR LENGTH(TRIM(p_resolucion)) < 5 THEN
        RAISE EXCEPTION 'Debe ingresar el dictamen o resolución administrativa.';
    END IF;

    v_pct := GREATEST(LEAST(COALESCE(p_pct_reembolso, 0), 100), 0);

    SELECT c.*, p.monto_bruto, r.id_propietario, r.codigo_reserva
    INTO v_caso
    FROM public.cancelaciones_reembolsos c
    JOIN public.reservas r ON r.id = c.id_reserva
    JOIN public.pagos p ON p.id_reserva = r.id
    WHERE c.id = p_id_cancelacion
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expediente de cancelación o disputa no encontrado.';
    END IF;

    IF LOWER(TRIM(p_accion)) = 'rechazar' THEN
        v_pct := 0.00;
    END IF;

    v_reembolso := ROUND(v_caso.monto_bruto * (v_pct / 100.0), 2);
    v_remanente := ROUND(v_caso.monto_bruto - v_reembolso, 2);
    v_comision_plat := ROUND(v_remanente * 0.15, 2);
    v_neto_cuid := ROUND(v_remanente - v_comision_plat, 2);

    UPDATE public.cancelaciones_reembolsos
    SET porcentaje_reembolso = v_pct,
        monto_reembolso = v_reembolso,
        monto_penalidad_plataforma = v_comision_plat,
        monto_compensacion_cuidador = v_neto_cuid,
        estado_tramite = CASE WHEN LOWER(TRIM(p_accion)) = 'rechazar' THEN 'rechazado'::estado_tramite_cancelacion_enum ELSE 'procesado'::estado_tramite_cancelacion_enum END,
        resolucion_admin = TRIM(p_resolucion),
        procesado_por = auth.uid(),
        fecha_resolucion = now()
    WHERE id = p_id_cancelacion;

    UPDATE public.reservas
    SET estado_reserva = CASE WHEN v_pct > 0 THEN 'cancelada'::estado_reserva_enum ELSE 'finalizada'::estado_reserva_enum END
    WHERE id = v_caso.id_reserva;

    UPDATE public.pagos
    SET estado_pago = CASE
            WHEN v_pct = 100 THEN 'reembolsado_total'::estado_pago_enum
            WHEN v_pct > 0 THEN 'reembolsado_parcial'::estado_pago_enum
            ELSE 'aprobado'::estado_pago_enum
        END,
        monto_reembolsado = v_reembolso,
        penalidad_retenida = v_remanente,
        comision_plataforma = v_comision_plat,
        monto_neto_cuidador = v_neto_cuid
    WHERE id_reserva = v_caso.id_reserva;

    IF v_neto_cuid > 0 THEN
        UPDATE public.liquidaciones_cuidadores
        SET tipo_concepto = 'Resolución de Arbitraje',
            monto_liquidado = v_neto_cuid,
            estado_liquidacion = 'disponible',
            fecha_disponible = now()
        WHERE id_reserva = v_caso.id_reserva;
    ELSE
        UPDATE public.liquidaciones_cuidadores
        SET estado_liquidacion = 'anulado',
            motivo_rechazo = 'Reembolso del 100% al propietario por arbitraje administrativo'
        WHERE id_reserva = v_caso.id_reserva;
    END IF;

    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    VALUES (
        v_caso.id_propietario,
        'sistema',
        'Resolución de Caso (' || v_caso.codigo_reserva || ')',
        format('Dictamen administrativo: %s. Reembolso aprobado: %s%% (S/ %s).', TRIM(p_resolucion), v_pct, v_reembolso),
        'cancelaciones_reembolsos',
        p_id_cancelacion::text
    );

    RETURN jsonb_build_object(
        'exito', true,
        'id_cancelacion', p_id_cancelacion,
        'porcentaje_reembolso', v_pct,
        'monto_reembolso', v_reembolso,
        'monto_compensacion_cuidador', v_neto_cuid,
        'mensaje', 'Caso resuelto y saldos contables actualizados.'
    );
END;
$$;

-- =============================================================================
-- 10. rpc_solicitar_retiro
-- El cuidador solicita el desembolso de sus fondos 'disponible' -> 'solicitado'
-- Compatible con Yape, Plin, CCI, BCP, Interbank y BBVA.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_solicitar_retiro(
    p_cuenta_tipo text,
    p_cuenta_numero text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_cuidador record;
    v_total_solicitado numeric(12,2);
    v_items integer;
BEGIN
    IF p_cuenta_tipo NOT IN ('Yape', 'Plin', 'CCI', 'BCP', 'Interbank', 'BBVA') THEN
        RAISE EXCEPTION 'Entidad de cobro "%" no soportada. Use Yape, Plin, CCI, BCP, Interbank o BBVA.', p_cuenta_tipo;
    END IF;

    IF p_cuenta_numero IS NULL OR LENGTH(TRIM(p_cuenta_numero)) < 6 THEN
        RAISE EXCEPTION 'Debe ingresar un número de cuenta o celular válido (mínimo 6 dígitos).';
    END IF;

    SELECT * INTO v_cuidador
    FROM public.perfiles_cuidadores
    WHERE id_usuario = auth.uid();

    IF NOT FOUND THEN
        -- Fallback para pruebas o invocación directa cuando solo hay 1 cuidador en sesión
        RAISE EXCEPTION 'No se encontró un perfil de cuidador vinculado a su sesión.';
    END IF;

    -- Actualizar cuenta preferida del cuidador
    UPDATE public.perfiles_cuidadores
    SET cuenta_cobro_tipo = p_cuenta_tipo,
        cuenta_cobro_numero = TRIM(p_cuenta_numero)
    WHERE id = v_cuidador.id;

    -- Pasar todas las liquidaciones 'disponible' del cuidador a 'solicitado'
    WITH actualizadas AS (
        UPDATE public.liquidaciones_cuidadores
        SET estado_liquidacion = 'solicitado',
            metodo_desembolso = p_cuenta_tipo,
            cuenta_destino = p_cuenta_tipo || ': ' || TRIM(p_cuenta_numero),
            fecha_solicitud_retiro = now()
        WHERE id_cuidador = v_cuidador.id
          AND estado_liquidacion = 'disponible'
        RETURNING monto_liquidado
    )
    SELECT COALESCE(SUM(monto_liquidado), 0.00), COUNT(*)::integer
    INTO v_total_solicitado, v_items
    FROM actualizadas;

    IF v_items = 0 THEN
        RAISE EXCEPTION 'No tienes saldo disponible para retiro en este momento.';
    END IF;

    RETURN jsonb_build_object(
        'exito', true,
        'items_solicitados', v_items,
        'monto_total_solicitado', v_total_solicitado,
        'cuenta_destino', p_cuenta_tipo || ': ' || TRIM(p_cuenta_numero),
        'mensaje', format('Solicitud de retiro por S/ %s enviada al Administrador.', v_total_solicitado)
    );
END;
$$;

-- =============================================================================
-- 11. rpc_admin_procesar_liquidacion
-- El Administrador aprueba el pago con N° de operación bancaria (pasando a
-- 'pagado' e incrementando el Total Histórico Cobrado) o lo rechaza devolviendo
-- el saldo a 'disponible'.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_procesar_liquidacion(
    p_id_liquidacion uuid,
    p_accion text,
    p_num_operacion text DEFAULT NULL,
    p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_liq record;
    v_accion text := LOWER(TRIM(p_accion));
BEGIN
    SELECT l.*, pc.id_usuario AS cuidador_user_id
    INTO v_liq
    FROM public.liquidaciones_cuidadores l
    JOIN public.perfiles_cuidadores pc ON pc.id = l.id_cuidador
    WHERE l.id = p_id_liquidacion
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de liquidación no encontrado.';
    END IF;

    IF v_accion IN ('pagar', 'aprobar', 'pagado') THEN
        IF p_num_operacion IS NULL OR LENGTH(TRIM(p_num_operacion)) < 4 THEN
            RAISE EXCEPTION 'Debe ingresar el N° de operación bancaria o voucher del desembolso.';
        END IF;

        UPDATE public.liquidaciones_cuidadores
        SET estado_liquidacion = 'pagado',
            num_operacion_desembolso = TRIM(p_num_operacion),
            fecha_liquidacion = now(),
            aprobado_por_admin = auth.uid()
        WHERE id = p_id_liquidacion;

        INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
        VALUES (
            v_liq.cuidador_user_id,
            'pago',
            '¡Retiro Desembolsado! (' || v_liq.codigo_liquidacion || ')',
            format('Se transfirió S/ %s a tu cuenta (%s). N° Operación: %s.', v_liq.monto_liquidado, COALESCE(v_liq.cuenta_destino, 'Registrada'), TRIM(p_num_operacion)),
            'liquidaciones_cuidadores',
            p_id_liquidacion::text
        );

        RETURN jsonb_build_object(
            'exito', true,
            'estado_nuevo', 'pagado',
            'num_operacion', TRIM(p_num_operacion),
            'monto_pagado', v_liq.monto_liquidado,
            'mensaje', 'Liquidación marcada como Pagada. El Total Histórico Cobrado del cuidador se actualizó.'
        );

    ELSIF v_accion = 'rechazar' THEN
        UPDATE public.liquidaciones_cuidadores
        SET estado_liquidacion = 'disponible',
            motivo_rechazo = COALESCE(NULLIF(TRIM(p_motivo), ''), 'Observación en datos de cuenta destino')
        WHERE id = p_id_liquidacion;

        RETURN jsonb_build_object(
            'exito', true,
            'estado_nuevo', 'disponible',
            'mensaje', 'Solicitud observada; el saldo ha retornado a Disponible para que el cuidador corrija su cuenta.'
        );
    ELSE
        RAISE EXCEPTION 'Acción inválida "%". Use "pagar" o "rechazar".', p_accion;
    END IF;
END;
$$;

-- =============================================================================
-- 12. rpc_emitir_sos
-- Emite alerta S.O.S. de emergencia veterinaria y notifica en tiempo real a
-- Clínica Aliada + Administrador + Contraparte.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_emitir_sos(
    p_id_reserva uuid,
    p_severidad public.nivel_severidad_sos_enum,
    p_tipo text,
    p_descripcion text,
    p_id_clinica uuid DEFAULT NULL,
    p_ubicacion text DEFAULT 'Cusco'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
    v_id_clinica uuid;
    v_nombre_clinica text;
    v_id_sos uuid;
    v_codigo_sos text;
    v_ubicacion_final text;
BEGIN
    IF p_descripcion IS NULL OR LENGTH(TRIM(p_descripcion)) < 5 THEN
        RAISE EXCEPTION 'Describa los síntomas o la emergencia veterinaria.';
    END IF;

    SELECT r.*, m.nombre AS mascota_nombre, pc.id_usuario AS cuidador_user_id
    INTO v_res
    FROM public.reservas r
    JOIN public.mascotas m ON m.id = r.id_mascota
    JOIN public.perfiles_cuidadores pc ON pc.id = r.id_cuidador
    WHERE r.id = p_id_reserva;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la reserva asociada a la alerta S.O.S.';
    END IF;

    -- Si no se especifica clínica, asignar automáticamente la primera clínica 24 Horas activa en Cusco
    IF p_id_clinica IS NOT NULL THEN
        SELECT id, nombre INTO v_id_clinica, v_nombre_clinica
        FROM public.clinicas_veterinarias
        WHERE id = p_id_clinica AND estado_afiliacion = 'activa';
    END IF;

    IF v_id_clinica IS NULL THEN
        SELECT id, nombre INTO v_id_clinica, v_nombre_clinica
        FROM public.clinicas_veterinarias
        WHERE estado_afiliacion = 'activa' AND activa = true
        ORDER BY (horario_atencion = '24 Horas') DESC, created_at ASC
        LIMIT 1;
    END IF;

    IF v_id_clinica IS NULL THEN
        RAISE EXCEPTION 'No hay clínicas veterinarias activas disponibles para derivar la emergencia.';
    END IF;

    v_ubicacion_final := COALESCE(NULLIF(TRIM(p_ubicacion), ''), 'Cusco');

    INSERT INTO public.incidencias_emergencias (
        id_reserva,
        id_mascota,
        reportado_por,
        id_clinica_derivada,
        nivel_severidad,
        tipo_incidencia,
        descripcion,
        ubicacion_emergencia,
        estado_sos
    )
    VALUES (
        p_id_reserva,
        v_res.id_mascota,
        COALESCE(auth.uid(), v_res.id_propietario),
        v_id_clinica,
        COALESCE(p_severidad, 'critica'),
        COALESCE(NULLIF(TRIM(p_tipo), ''), 'Urgencia Veterinaria S.O.S.'),
        TRIM(p_descripcion),
        v_ubicacion_final,
        'emitida'
    )
    RETURNING id, codigo_sos INTO v_id_sos, v_codigo_sos;

    -- Notificar a Propietario, Cuidador, Veterinarios de la Clínica y Administradores
    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    SELECT DISTINCT u.id,
           'sos',
           '🚨 ALERTA S.O.S. ' || v_codigo_sos || ' (' || UPPER(p_severidad::text) || ')',
           format('Emergencia para %s en %s derivada a %s: %s', v_res.mascota_nombre, v_ubicacion_final, v_nombre_clinica, TRIM(p_descripcion)),
           'incidencias_emergencias',
           v_id_sos::text
    FROM public.perfiles_usuarios u
    WHERE u.id IN (v_res.id_propietario, v_res.cuidador_user_id)
       OR u.id_clinica_asociada = v_id_clinica
       OR u.rol = 'administrador';

    RETURN jsonb_build_object(
        'ok', true,
        'exito', true,
        'id_incidencia', v_id_sos,
        'codigo_sos', v_codigo_sos,
        'id_clinica_derivada', v_id_clinica,
        'clinica_nombre', v_nombre_clinica,
        'ubicacion_emergencia', v_ubicacion_final,
        'estado_sos', 'emitida',
        'mensaje', format('Alerta S.O.S. %s emitida y derivada en tiempo real a %s.', v_codigo_sos, v_nombre_clinica)
    );
END;
$$;

-- =============================================================================
-- 13. rpc_vet_actualizar_sos
-- Ciclo clínico de la alerta S.O.S.: emitida -> en_atencion -> estabilizada -> resuelta
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_vet_actualizar_sos(
    p_id_incidencia uuid,
    p_accion text,
    p_diagnostico text DEFAULT NULL,
    p_tratamiento text DEFAULT NULL,
    p_costo numeric DEFAULT NULL,
    p_informe text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_sos record;
    v_updated record;
    v_rol text;
    v_mi_clinica uuid;
    v_clinica_tiene_responsable boolean := false;
    v_propietario_id uuid;
    v_cuidador_usuario_id uuid;
    v_nuevo_estado public.estado_sos_enum;
    v_accion text := LOWER(TRIM(COALESCE(p_accion, '')));
BEGIN
    v_rol := public.get_my_role();
    IF v_rol IS DISTINCT FROM 'veterinaria' AND v_rol IS DISTINCT FROM 'administrador' THEN
        RAISE EXCEPTION 'Acceso denegado: solo una Clínica Veterinaria Aliada o un Administrador pueden actualizar el estado clínico S.O.S.';
    END IF;

    -- Bloquear únicamente la fila de incidencias_emergencias (FOR UPDATE OF i)
    SELECT
        i.*,
        r.id_propietario AS reserva_propietario_id,
        r.id_cuidador AS reserva_cuidador_id,
        m.id_propietario AS mascota_propietario_id,
        m.nombre AS mascota_nombre
    INTO v_sos
    FROM public.incidencias_emergencias i
    LEFT JOIN public.reservas r ON r.id = i.id_reserva
    LEFT JOIN public.mascotas m ON m.id = i.id_mascota
    WHERE i.id = p_id_incidencia
    FOR UPDATE OF i;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Incidencia S.O.S. (%) no encontrada.', p_id_incidencia;
    END IF;

    IF v_rol = 'veterinaria' THEN
        v_mi_clinica := public.get_my_clinica_id();

        SELECT EXISTS (
            SELECT 1
            FROM public.perfiles_usuarios pu
            WHERE pu.id_clinica_asociada = v_sos.id_clinica_derivada
              AND pu.estado_cuenta = 'activo'
        )
        INTO v_clinica_tiene_responsable;

        IF v_clinica_tiene_responsable
           AND v_mi_clinica IS NOT NULL
           AND v_sos.id_clinica_derivada IS NOT NULL
           AND v_mi_clinica != v_sos.id_clinica_derivada THEN
            RAISE EXCEPTION 'Esta alerta S.O.S. está derivada a otra clínica veterinaria.';
        END IF;
    END IF;

    v_propietario_id := COALESCE(v_sos.reserva_propietario_id, v_sos.mascota_propietario_id);

    IF v_sos.reserva_cuidador_id IS NOT NULL THEN
        SELECT pc.id_usuario
        INTO v_cuidador_usuario_id
        FROM public.perfiles_cuidadores pc
        WHERE pc.id = v_sos.reserva_cuidador_id;
    END IF;

    IF v_accion IN ('tomar', 'en_atencion') THEN
        v_nuevo_estado := 'en_atencion';
    ELSIF v_accion IN ('estabilizar', 'estabilizada') THEN
        v_nuevo_estado := 'estabilizada';
    ELSIF v_accion IN ('resolver', 'alta', 'resuelta') THEN
        IF COALESCE(NULLIF(TRIM(p_diagnostico), ''), NULLIF(TRIM(v_sos.diagnostico_clinico), '')) IS NULL THEN
            RAISE EXCEPTION 'Para dar de alta un caso S.O.S. es obligatorio registrar el diagnóstico clínico.';
        END IF;
        v_nuevo_estado := 'resuelta';
    ELSE
        RAISE EXCEPTION 'Acción clínica "%" no reconocida. Use "en_atencion", "estabilizada" o "resuelta".', p_accion;
    END IF;

    UPDATE public.incidencias_emergencias i
    SET
        estado_sos = v_nuevo_estado,
        atendido_por_vet = COALESCE(auth.uid(), i.atendido_por_vet),
        diagnostico_clinico = COALESCE(
            NULLIF(TRIM(p_diagnostico), ''),
            i.diagnostico_clinico,
            CASE
                WHEN v_nuevo_estado = 'estabilizada' THEN 'Paciente en estabilización clínica'
                WHEN v_nuevo_estado = 'en_atencion' THEN 'Paciente en evaluación veterinaria'
                ELSE i.diagnostico_clinico
            END
        ),
        tratamiento_aplicado = COALESCE(
            NULLIF(TRIM(p_tratamiento), ''),
            i.tratamiento_aplicado,
            CASE
                WHEN v_nuevo_estado = 'resuelta' THEN 'Tratamiento ambulatorio completado'
                ELSE i.tratamiento_aplicado
            END
        ),
        informe_resolucion = CASE
            WHEN v_nuevo_estado = 'resuelta' THEN COALESCE(NULLIF(TRIM(p_informe), ''), i.informe_resolucion, 'Alta médica veterinaria sin complicaciones')
            ELSE COALESCE(NULLIF(TRIM(p_informe), ''), i.informe_resolucion)
        END,
        costo_atencion_ref = COALESCE(p_costo, i.costo_atencion_ref, 0.00),
        fecha_atencion = COALESCE(i.fecha_atencion, now()),
        fecha_estabilizacion = CASE
            WHEN v_nuevo_estado IN ('estabilizada', 'resuelta') THEN COALESCE(i.fecha_estabilizacion, now())
            ELSE i.fecha_estabilizacion
        END,
        fecha_resolucion = CASE
            WHEN v_nuevo_estado = 'resuelta' THEN now()
            ELSE i.fecha_resolucion
        END,
        updated_at = now()
    WHERE i.id = p_id_incidencia
    RETURNING * INTO v_updated;

    INSERT INTO public.notificaciones (
        id_usuario_destino,
        tipo,
        titulo,
        mensaje,
        referencia_entidad,
        referencia_id
    )
    SELECT DISTINCT
        u.id,
        'sos',
        format('Actualización Médica S.O.S. %s: %s', v_updated.codigo_sos, UPPER(v_nuevo_estado::text)),
        format(
            'Mascota: %s • Estado: %s • Diagnóstico: %s%s',
            COALESCE(v_sos.mascota_nombre, 'Paciente'),
            UPPER(v_nuevo_estado::text),
            COALESCE(NULLIF(TRIM(v_updated.diagnostico_clinico), ''), 'En evaluación clínica'),
            CASE
                WHEN COALESCE(v_updated.costo_atencion_ref, 0) > 0
                THEN ' • Costo ref.: S/ ' || to_char(v_updated.costo_atencion_ref, 'FM999990.00')
                ELSE ''
            END
        ),
        'incidencias_emergencias',
        p_id_incidencia::text
    FROM public.perfiles_usuarios u
    WHERE u.id = v_propietario_id
       OR (v_cuidador_usuario_id IS NOT NULL AND u.id = v_cuidador_usuario_id)
       OR u.rol = 'administrador';

    RETURN jsonb_build_object(
        'ok', true,
        'exito', true,
        'id', v_updated.id,
        'id_incidencia', v_updated.id,
        'codigo_sos', v_updated.codigo_sos,
        'estado_sos', v_updated.estado_sos,
        'estado_nuevo', v_updated.estado_sos,
        'diagnostico_clinico', v_updated.diagnostico_clinico,
        'tratamiento_aplicado', v_updated.tratamiento_aplicado,
        'informe_resolucion', v_updated.informe_resolucion,
        'costo_emergencia', COALESCE(v_updated.costo_atencion_ref, 0.00),
        'costo_atencion_ref', COALESCE(v_updated.costo_atencion_ref, 0.00),
        'fecha_atencion', v_updated.fecha_atencion,
        'fecha_estabilizacion', v_updated.fecha_estabilizacion,
        'fecha_resolucion', v_updated.fecha_resolucion,
        'updated_at', v_updated.updated_at,
        'mensaje', format('Alerta S.O.S. %s actualizada a estado "%s".', v_updated.codigo_sos, v_updated.estado_sos)
    );
END;
$$;

-- =============================================================================
-- 14. rpc_admin_reasignar_sos
-- Permite al Administrador derivar un caso S.O.S. a otra Clínica Veterinaria
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_reasignar_sos(
    p_id_incidencia uuid,
    p_nueva_clinica uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clinica record;
BEGIN
    SELECT * INTO v_clinica
    FROM public.clinicas_veterinarias
    WHERE id = p_nueva_clinica AND estado_afiliacion = 'activa';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La clínica de destino no existe o no está activa.';
    END IF;

    UPDATE public.incidencias_emergencias
    SET id_clinica_derivada = p_nueva_clinica
    WHERE id = p_id_incidencia;

    RETURN jsonb_build_object(
        'exito', true,
        'id_incidencia', p_id_incidencia,
        'id_clinica_nueva', p_nueva_clinica,
        'nombre_clinica_nueva', v_clinica.nombre,
        'mensaje', format('Caso S.O.S. reasignado exitosamente a %s.', v_clinica.nombre)
    );
END;
$$;

-- =============================================================================
-- 15. rpc_vet_dictaminar_ficha
-- Validación u observación médica oficial de ficha PAW-ID por Clínica Aliada
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_vet_dictaminar_ficha(
    p_id_mascota uuid,
    p_resultado estado_validacion_vet_enum,
    p_vacunas text,
    p_vigencia date,
    p_observaciones text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_mascota record;
    v_id_clinica uuid;
    v_id_dictamen uuid;
BEGIN
    IF p_resultado NOT IN ('validado', 'observado') THEN
        RAISE EXCEPTION 'El dictamen debe ser "validado" u "observado".';
    END IF;

    SELECT * INTO v_mascota
    FROM public.mascotas
    WHERE id = p_id_mascota
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mascota no encontrada.';
    END IF;

    -- Obtener clínica asociada al médico veterinario autenticado (o primera clínica activa como fallback)
    SELECT id_clinica_asociada INTO v_id_clinica
    FROM public.perfiles_usuarios
    WHERE id = auth.uid();

    IF v_id_clinica IS NULL THEN
        SELECT id INTO v_id_clinica
        FROM public.clinicas_veterinarias
        WHERE estado_afiliacion = 'activa'
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    UPDATE public.mascotas
    SET estado_validacion_vet = p_resultado,
        vacunas_al_dia = (p_resultado = 'validado'),
        fecha_venc_vacunas = COALESCE(p_vigencia, fecha_venc_vacunas),
        id_clinica_validadora = v_id_clinica,
        observacion_veterinaria = COALESCE(NULLIF(TRIM(p_observaciones), ''), 'Cartilla verificada conforme a protocolo sanitario Cusco.'),
        fecha_ultima_validacion = now()
    WHERE id = p_id_mascota;

    INSERT INTO public.validaciones_veterinarias (
        id_mascota,
        id_clinica,
        id_usuario_vet,
        resultado,
        vacunas_verificadas,
        vigencia_hasta,
        observaciones_medicas,
        cartilla_evaluada_url
    )
    VALUES (
        p_id_mascota,
        v_id_clinica,
        auth.uid(),
        p_resultado,
        COALESCE(NULLIF(TRIM(p_vacunas), ''), 'Séxtuple, Antirrábica y Desparasitación'),
        COALESCE(p_vigencia, (CURRENT_DATE + INTERVAL '1 year')::date),
        COALESCE(NULLIF(TRIM(p_observaciones), ''), 'Conformidad sanitaria otorgada.'),
        v_mascota.cartilla_vacunas_url
    )
    RETURNING id INTO v_id_dictamen;

    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    VALUES (
        v_mascota.id_propietario,
        'validacion',
        format('Carné %s (%s): %s', v_mascota.paw_id, v_mascota.nombre, UPPER(p_resultado::text)),
        COALESCE(NULLIF(TRIM(p_observaciones), ''), 'Tu ficha médica PAW-ID ha sido revisada por la Clínica Veterinaria Aliada.'),
        'mascotas',
        p_id_mascota::text
    );

    RETURN jsonb_build_object(
        'exito', true,
        'id_dictamen', v_id_dictamen,
        'paw_id', v_mascota.paw_id,
        'resultado', p_resultado,
        'mensaje', format('Dictamen médico "%s" registrado para %s (%s).', p_resultado, v_mascota.nombre, v_mascota.paw_id)
    );
END;
$$;

-- =============================================================================
-- 16. rpc_obtener_paw_id_publico
-- Vista pública segura al escanear el código QR del carné PAW-ID (#/paw-id/PAW-XXXX)
-- Oculta DNI y dirección exacta del propietario para máxima privacidad.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_obtener_paw_id_publico(p_paw_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_m record;
BEGIN
    SELECT
        vm.paw_id,
        vm.nombre,
        vm.raza,
        vm.fecha_nacimiento,
        vm.edad_formateada,
        vm.tamano,
        vm.sexo,
        vm.peso_kg,
        vm.esterilizado,
        vm.vacunas_al_dia,
        vm.fecha_venc_vacunas,
        vm.alergias_restricciones,
        vm.medicacion_actual,
        vm.conducta_observaciones,
        vm.foto_url,
        vm.estado_validacion_vet,
        vm.clinica_validadora_nombre,
        vm.clinica_validadora_cmvp,
        vm.observacion_veterinaria,
        vm.fecha_ultima_validacion,
        vm.propietario_nombre,
        vm.propietario_telefono,
        vm.propietario_distrito,
        vm.contacto_emergencia_nombre,
        vm.contacto_emergencia_tel
    INTO v_m
    FROM public.v_resumen_mascotas vm
    WHERE UPPER(vm.paw_id) = UPPER(TRIM(p_paw_id))
      AND vm.activa = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'exito', false,
            'mensaje', 'No se encontró ningún carné activo con el código ' || COALESCE(p_paw_id, '')
        );
    END IF;

    RETURN jsonb_build_object(
        'exito', true,
        'mascota', to_jsonb(v_m)
    );
END;
$$;

-- =============================================================================
-- 17. rpc_admin_aprobar_cuidador
-- Aprueba, rechaza o suspende a un cuidador y sincroniza su estado_cuenta en
-- perfiles_usuarios y antecedentes_cuidadores.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_aprobar_cuidador(
    p_id_cuidador uuid,
    p_accion text,
    p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_cuid record;
    v_estado_cuid estado_postulacion_cuidador_enum;
    v_estado_user estado_cuenta_enum;
    v_accion text := LOWER(TRIM(p_accion));
BEGIN
    SELECT * INTO v_cuid
    FROM public.perfiles_cuidadores
    WHERE id = p_id_cuidador
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Perfil de cuidador no encontrado.';
    END IF;

    IF v_accion IN ('aprobar', 'aprobado', 'reactivar') THEN
        v_estado_cuid := 'aprobado';
        v_estado_user := 'activo';
    ELSIF v_accion IN ('rechazar', 'rechazado') THEN
        IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 5 THEN
            RAISE EXCEPTION 'Debe especificar el motivo del rechazo del postulante.';
        END IF;
        v_estado_cuid := 'rechazado';
        v_estado_user := 'rechazado';
    ELSIF v_accion IN ('suspender', 'suspendido') THEN
        v_estado_cuid := 'suspendido';
        v_estado_user := 'suspendido';
    ELSE
        RAISE EXCEPTION 'Acción "%" no válida. Use "aprobar", "rechazar" o "suspender".', p_accion;
    END IF;

    UPDATE public.perfiles_cuidadores
    SET estado_postulacion = v_estado_cuid,
        motivo_estado = COALESCE(NULLIF(TRIM(p_motivo), ''), 'Verificación documental aprobada por Administración'),
        aprobado_por = auth.uid(),
        fecha_aprobacion = CASE WHEN v_estado_cuid = 'aprobado' THEN now() ELSE fecha_aprobacion END
    WHERE id = p_id_cuidador;

    UPDATE public.antecedentes_cuidadores
    SET estado_verificacion = v_estado_cuid,
        observaciones_admin = COALESCE(NULLIF(TRIM(p_motivo), ''), 'Expediente legal verificado'),
        revisado_por = auth.uid(),
        fecha_revision = now()
    WHERE id_cuidador = p_id_cuidador;

    UPDATE public.perfiles_usuarios
    SET estado_cuenta = v_estado_user,
        motivo_estado_cuenta = p_motivo
    WHERE id = v_cuid.id_usuario;

    INSERT INTO public.notificaciones (id_usuario_destino, tipo, titulo, mensaje, referencia_entidad, referencia_id)
    VALUES (
        v_cuid.id_usuario,
        'sistema',
        'Actualización de Postulación de Cuidador: ' || UPPER(v_estado_cuid::text),
        COALESCE(NULLIF(TRIM(p_motivo), ''), 'Tu perfil de cuidador ha sido actualizado por el Administrador.'),
        'perfiles_cuidadores',
        p_id_cuidador::text
    );

    RETURN jsonb_build_object(
        'exito', true,
        'id_cuidador', p_id_cuidador,
        'estado_nuevo', v_estado_cuid,
        'estado_cuenta', v_estado_user,
        'mensaje', format('El cuidador %s ahora se encuentra en estado "%s".', v_cuid.codigo_cuidador, v_estado_cuid)
    );
END;
$$;

-- =============================================================================
-- 18. rpc_admin_aprobar_clinica
-- Aprueba, rechaza o suspende una Clínica Veterinaria Aliada y activa la cuenta
-- de su médico veterinario responsable.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_aprobar_clinica(
    p_id_clinica uuid,
    p_accion text,
    p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_cli record;
    v_estado_cli estado_afiliacion_clinica_enum;
    v_estado_user estado_cuenta_enum;
    v_activa boolean;
    v_accion text := LOWER(TRIM(p_accion));
BEGIN
    SELECT * INTO v_cli
    FROM public.clinicas_veterinarias
    WHERE id = p_id_clinica
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clínica veterinaria no encontrada.';
    END IF;

    IF v_accion IN ('aprobar', 'activa', 'activar') THEN
        v_estado_cli := 'activa';
        v_estado_user := 'activo';
        v_activa := true;
    ELSIF v_accion IN ('rechazar', 'rechazada') THEN
        IF p_motivo IS NULL OR LENGTH(TRIM(p_motivo)) < 5 THEN
            RAISE EXCEPTION 'Debe especificar el motivo del rechazo de la clínica.';
        END IF;
        v_estado_cli := 'rechazada';
        v_estado_user := 'rechazado';
        v_activa := false;
    ELSIF v_accion IN ('suspender', 'suspendida') THEN
        v_estado_cli := 'suspendida';
        v_estado_user := 'suspendido';
        v_activa := false;
    ELSE
        RAISE EXCEPTION 'Acción "%" no válida. Use "aprobar", "rechazar" o "suspender".', p_accion;
    END IF;

    UPDATE public.clinicas_veterinarias
    SET estado_afiliacion = v_estado_cli,
        activa = v_activa,
        motivo_estado = COALESCE(NULLIF(TRIM(p_motivo), ''), 'Clínica acreditada en la Red Aliada de Cusco'),
        aprobado_por = auth.uid(),
        fecha_aprobacion = CASE WHEN v_activa THEN now() ELSE fecha_aprobacion END
    WHERE id = p_id_clinica;

    UPDATE public.perfiles_usuarios
    SET estado_cuenta = v_estado_user,
        motivo_estado_cuenta = p_motivo
    WHERE id_clinica_asociada = p_id_clinica;

    RETURN jsonb_build_object(
        'exito', true,
        'id_clinica', p_id_clinica,
        'estado_nuevo', v_estado_cli,
        'activa', v_activa,
        'mensaje', format('La clínica "%s" (%s) ha sido actualizada a "%s".', v_cli.nombre, v_cli.codigo_clinica, v_estado_cli)
    );
END;
$$;

-- =============================================================================
-- 19. rpc_admin_crear_clinica_directa
-- Permite al Administrador dar de alta una Clínica Veterinaria Aliada lista y
-- activa directamente desde su panel.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_crear_clinica_directa(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_id_clinica uuid;
    v_codigo_clinica text;
    v_id_usuario_vet uuid;
BEGIN
    INSERT INTO public.clinicas_veterinarias (
        ruc,
        nombre,
        email_institucional,
        direccion,
        distrito_cusco,
        latitud,
        longitud,
        telefono_emergencia,
        horario_atencion,
        especialidades,
        tarifa_consulta_emergencia,
        foto_fachada_url,
        constancia_url,
        colegiatura_cmvp,
        estado_afiliacion,
        activa,
        aprobado_por,
        fecha_aprobacion
    )
    VALUES (
        TRIM(p_payload->>'ruc'),
        TRIM(p_payload->>'nombre'),
        LOWER(TRIM(p_payload->>'email_institucional')),
        TRIM(p_payload->>'direccion'),
        COALESCE(NULLIF(TRIM(p_payload->>'distrito_cusco'), ''), 'Cusco Centro'),
        COALESCE((p_payload->>'latitud')::numeric, -13.517000),
        COALESCE((p_payload->>'longitud')::numeric, -71.978000),
        TRIM(p_payload->>'telefono_emergencia'),
        COALESCE((p_payload->>'horario_atencion')::horario_clinica_enum, '24 Horas'),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_payload->'especialidades')),
            ARRAY['Emergencias 24h', 'Medicina General']
        ),
        COALESCE((p_payload->>'tarifa_consulta_emergencia')::numeric, 60.00),
        p_payload->>'foto_fachada_url',
        p_payload->>'constancia_url',
        TRIM(p_payload->>'colegiatura_cmvp'),
        'activa',
        true,
        auth.uid(),
        now()
    )
    RETURNING id, codigo_clinica INTO v_id_clinica, v_codigo_clinica;

    -- Si se pasó id_usuario_vet existente, vincularlo y activarlo
    IF (p_payload->>'id_usuario_vet') IS NOT NULL THEN
        v_id_usuario_vet := (p_payload->>'id_usuario_vet')::uuid;
        UPDATE public.perfiles_usuarios
        SET rol = 'veterinaria',
            id_clinica_asociada = v_id_clinica,
            estado_cuenta = 'activo'
        WHERE id = v_id_usuario_vet;
    END IF;

    RETURN jsonb_build_object(
        'exito', true,
        'id_clinica', v_id_clinica,
        'codigo_clinica', v_codigo_clinica,
        'mensaje', 'Clínica Veterinaria Aliada creada y activada exitosamente.'
    );
END;
$$;

-- =============================================================================
-- 20. rpc_admin_dashboard_metrics
-- KPIs ejecutivos en tiempo real: Ingresos Brutos, Comisión Real del 15% (> 0),
-- Neto Cuidadores (85%), Reembolsos, SOS activos, Postulantes pendientes y
-- series analíticas para Chart.js por distrito de Cusco y categoría de servicio.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ingresos_brutos numeric(12,2);
    v_comision_15 numeric(12,2);
    v_neto_cuidadores_85 numeric(12,2);
    v_reembolsos_procesados numeric(12,2);
    v_fondos_en_garantia numeric(12,2);
    v_fondos_disponibles numeric(12,2);
    v_fondos_solicitados numeric(12,2);
    v_fondos_pagados numeric(12,2);
    v_total_reservas integer;
    v_cuidadores_aprobados integer;
    v_cuidadores_pendientes integer;
    v_clinicas_activas integer;
    v_clinicas_pendientes integer;
    v_sos_activos integer;
    v_disputas_pendientes integer;
    v_series_distritos jsonb;
    v_series_categorias jsonb;
    v_series_estados_reserva jsonb;
BEGIN
    -- Finanzas desde pagos reales ('aprobado' y 'reembolsado_parcial')
    SELECT
        COALESCE(SUM(monto_bruto) FILTER (WHERE estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00),
        COALESCE(SUM(comision_plataforma) FILTER (WHERE estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00),
        COALESCE(SUM(monto_neto_cuidador) FILTER (WHERE estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00),
        COALESCE(SUM(monto_reembolsado), 0.00)
    INTO v_ingresos_brutos, v_comision_15, v_neto_cuidadores_85, v_reembolsos_procesados
    FROM public.pagos;

    -- Saldos reales de billetera de cuidadores
    SELECT
        COALESCE(SUM(monto_liquidado) FILTER (WHERE estado_liquidacion = 'en_garantia'), 0.00),
        COALESCE(SUM(monto_liquidado) FILTER (WHERE estado_liquidacion = 'disponible'), 0.00),
        COALESCE(SUM(monto_liquidado) FILTER (WHERE estado_liquidacion = 'solicitado'), 0.00),
        COALESCE(SUM(monto_liquidado) FILTER (WHERE estado_liquidacion = 'pagado'), 0.00)
    INTO v_fondos_en_garantia, v_fondos_disponibles, v_fondos_solicitados, v_fondos_pagados
    FROM public.liquidaciones_cuidadores;

    SELECT COUNT(*)::integer INTO v_total_reservas FROM public.reservas;
    SELECT COUNT(*)::integer INTO v_cuidadores_aprobados FROM public.perfiles_cuidadores WHERE estado_postulacion = 'aprobado';
    SELECT COUNT(*)::integer INTO v_cuidadores_pendientes FROM public.perfiles_cuidadores WHERE estado_postulacion = 'pendiente';
    SELECT COUNT(*)::integer INTO v_clinicas_activas FROM public.clinicas_veterinarias WHERE estado_afiliacion = 'activa';
    SELECT COUNT(*)::integer INTO v_clinicas_pendientes FROM public.clinicas_veterinarias WHERE estado_afiliacion = 'pendiente';
    SELECT COUNT(*)::integer INTO v_sos_activos FROM public.incidencias_emergencias WHERE estado_sos != 'resuelta';
    SELECT COUNT(*)::integer INTO v_disputas_pendientes FROM public.cancelaciones_reembolsos WHERE estado_tramite = 'pendiente_revision';

    -- Serie 1: Actividad y facturación por Distrito específico de Cusco (sin colapsar en 'Cusco')
    SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb)
    INTO v_series_distritos
    FROM (
        SELECT
            pu.distrito_cusco AS distrito,
            COUNT(DISTINCT pc.id)::integer AS total_cuidadores,
            COUNT(r.id)::integer AS total_reservas,
            COALESCE(SUM(p.monto_bruto) FILTER (WHERE p.estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00)::numeric(12,2) AS ingresos_brutos,
            COALESCE(SUM(p.comision_plataforma) FILTER (WHERE p.estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00)::numeric(12,2) AS comision_15
        FROM public.perfiles_cuidadores pc
        JOIN public.perfiles_usuarios pu ON pu.id = pc.id_usuario
        LEFT JOIN public.reservas r ON r.id_cuidador = pc.id
        LEFT JOIN public.pagos p ON p.id_reserva = r.id
        GROUP BY pu.distrito_cusco
        ORDER BY ingresos_brutos DESC, total_cuidadores DESC
    ) d;

    -- Serie 2: Reservas e ingresos por Categoría de Servicio
    SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
    INTO v_series_categorias
    FROM (
        SELECT
            s.categoria,
            COUNT(r.id)::integer AS total_reservas,
            COALESCE(SUM(p.monto_bruto) FILTER (WHERE p.estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00)::numeric(12,2) AS ingresos_brutos,
            COALESCE(SUM(p.comision_plataforma) FILTER (WHERE p.estado_pago IN ('aprobado', 'reembolsado_parcial')), 0.00)::numeric(12,2) AS comision_15
        FROM public.servicios s
        LEFT JOIN public.reservas r ON r.id_oferta = s.id
        LEFT JOIN public.pagos p ON p.id_reserva = r.id
        GROUP BY s.categoria
        ORDER BY total_reservas DESC
    ) c;

    -- Serie 3: Distribución por Estado de Reserva
    SELECT COALESCE(jsonb_agg(row_to_json(e)), '[]'::jsonb)
    INTO v_series_estados_reserva
    FROM (
        SELECT
            estado_reserva::text AS estado,
            COUNT(*)::integer AS cantidad
        FROM public.reservas
        GROUP BY estado_reserva
        ORDER BY cantidad DESC
    ) e;

    RETURN jsonb_build_object(
        'exito', true,
        'kpis', jsonb_build_object(
            'ingresos_brutos', v_ingresos_brutos,
            'comision_plataforma_15', v_comision_15,
            'neto_cuidadores_85', v_neto_cuidadores_85,
            'reembolsos_procesados', v_reembolsos_procesados,
            'fondos_en_garantia', v_fondos_en_garantia,
            'fondos_disponibles_retiro', v_fondos_disponibles,
            'fondos_solicitados_por_pagar', v_fondos_solicitados,
            'fondos_historico_pagados', v_fondos_pagados,
            'total_reservas', v_total_reservas,
            'cuidadores_aprobados', v_cuidadores_aprobados,
            'cuidadores_pendientes', v_cuidadores_pendientes,
            'clinicas_activas', v_clinicas_activas,
            'clinicas_pendientes', v_clinicas_pendientes,
            'postulantes_pendientes_total', (v_cuidadores_pendientes + v_clinicas_pendientes),
            'sos_activos', v_sos_activos,
            'disputas_pendientes', v_disputas_pendientes
        ),
        'series_distritos_cusco', v_series_distritos,
        'series_categorias_servicio', v_series_categorias,
        'series_estados_reserva', v_series_estados_reserva
    );
END;
$$;

-- =============================================================================
-- 21. rpc_publicar_resena
-- Calificación verificada de 1 a 5 estrellas con desglose en 3 dimensiones
-- (puntualidad, comunicación y cuidado). Dispara el trigger de reputación.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_publicar_resena(
    p_id_reserva uuid,
    p_calificacion integer,
    p_puntualidad integer,
    p_comunicacion integer,
    p_cuidado integer,
    p_comentario text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_res record;
    v_id_resena uuid;
    v_nuevo_promedio numeric(3,2);
    v_nuevo_total integer;
BEGIN
    IF p_comentario IS NULL OR LENGTH(TRIM(p_comentario)) < 5 THEN
        RAISE EXCEPTION 'Por favor escribe un comentario breve sobre tu experiencia (mínimo 5 caracteres).';
    END IF;

    SELECT * INTO v_res
    FROM public.reservas
    WHERE id = p_id_reserva;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La reserva indicada no existe.';
    END IF;

    IF v_res.estado_reserva != 'finalizada' THEN
        RAISE EXCEPTION 'Solo puedes calificar reservas que hayan finalizado.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.resenas WHERE id_reserva = p_id_reserva) THEN
        RAISE EXCEPTION 'Esta reserva ya fue calificada anteriormente.';
    END IF;

    INSERT INTO public.resenas (
        id_reserva,
        id_propietario,
        id_cuidador,
        calificacion_estrellas,
        puntualidad_estrellas,
        comunicacion_estrellas,
        cuidado_estrellas,
        comentario
    )
    VALUES (
        p_id_reserva,
        v_res.id_propietario,
        v_res.id_cuidador,
        GREATEST(LEAST(COALESCE(p_calificacion, 5), 5), 1),
        GREATEST(LEAST(COALESCE(p_puntualidad, 5), 5), 1),
        GREATEST(LEAST(COALESCE(p_comunicacion, 5), 5), 1),
        GREATEST(LEAST(COALESCE(p_cuidado, 5), 5), 1),
        TRIM(p_comentario)
    )
    RETURNING id INTO v_id_resena;

    SELECT reputacion_promedio, total_resenas
    INTO v_nuevo_promedio, v_nuevo_total
    FROM public.perfiles_cuidadores
    WHERE id = v_res.id_cuidador;

    RETURN jsonb_build_object(
        'exito', true,
        'id_resena', v_id_resena,
        'reputacion_promedio_cuidador', v_nuevo_promedio,
        'total_resenas_cuidador', v_nuevo_total,
        'mensaje', '¡Gracias por tu calificación! La reputación del cuidador se ha actualizado.'
    );
END;
$$;

-- Permisos de ejecución para roles de Supabase (anon y authenticated)
GRANT EXECUTE ON FUNCTION public.rpc_cotizar_reserva TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_obtener_paw_id_publico TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_crear_reserva TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cuidador_responder_reserva TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cuidador_checkin TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cuidador_checkout TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_preview_cancelacion TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cancelar_reserva TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_abrir_disputa TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_resolver_caso TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_solicitar_retiro TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_procesar_liquidacion TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_emitir_sos TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vet_actualizar_sos TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_reasignar_sos TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vet_dictaminar_ficha TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_aprobar_cuidador TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_aprobar_clinica TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_crear_clinica_directa TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_dashboard_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_publicar_resena TO authenticated;

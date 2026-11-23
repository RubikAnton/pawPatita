-- =============================================================================
-- PAW PATITA CUSCO v5.1 — SUB-FASE P1: BLINDAJE BACKEND SQL, S.O.S., STORAGE & REALTIME
-- Archivo: supabase/08_pulido_v5_1.sql
-- Destino: SQL Editor de Producción (https://evephdzpoonavggwoejs.supabase.co)
-- Características: 100% Idempotente, sin pérdida de datos existentes.
--
-- Bloques incluidos:
--   Bloque A — Reparación Crítica S.O.S. (rpc_vet_actualizar_sos, rpc_emitir_sos, RLS)
--   Bloque B — Reglas de Negocio (Check-Out Temporal, Hospedaje 24h, Sin Cupones, Muro en_curso)
--   Bloque C — Trigger handle_new_auth_user() Mejorado (Postulaciones sin Doble INSERT)
--   Bloque D — Storage Buckets (Imágenes + PDFs) y Limpieza de URLs PostImg en BD
--   Bloque E — Publicación supabase_realtime Completa (6 tablas operativas)
--   Bloque F — Grants y Consultas de Verificación Comentadas
-- =============================================================================

BEGIN;

-- =============================================================================
-- BLOQUE A — REPARACIÓN CRÍTICA S.O.S. (rpc_vet_actualizar_sos, rpc_emitir_sos, RLS)
-- =============================================================================

-- A.1. Eliminar sobrecargas previas de rpc_vet_actualizar_sos y rpc_emitir_sos de forma segura
DROP FUNCTION IF EXISTS public.rpc_vet_actualizar_sos(uuid, text, text, text, text, numeric);
DROP FUNCTION IF EXISTS public.rpc_vet_actualizar_sos(uuid, text, text, text, numeric);
DROP FUNCTION IF EXISTS public.rpc_emitir_sos(uuid, public.nivel_severidad_sos_enum, text, text, uuid);
DROP FUNCTION IF EXISTS public.rpc_emitir_sos(uuid, public.nivel_severidad_sos_enum, text, text, uuid, text);

-- A.2. Reescribir public.rpc_vet_actualizar_sos corrigiendo el error fatal 0A000 (FOR UPDATE OF i)
--      Soportando tanto llamada de 5 argumentos como llamada de 6 argumentos (con p_informe opcional)
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
    -- 1. Validar que el rol invocante sea 'veterinaria' o 'administrador'
    v_rol := public.get_my_role();
    IF v_rol IS DISTINCT FROM 'veterinaria' AND v_rol IS DISTINCT FROM 'administrador' THEN
        RAISE EXCEPTION 'Acceso denegado: solo una Clínica Veterinaria Aliada o un Administrador pueden actualizar el estado clínico S.O.S.';
    END IF;

    -- 2. Bloquear exclusivamente la fila de incidencias_emergencias (FOR UPDATE OF i)
    --    NUNCA aplicar FOR UPDATE sobre el lado anulable de un LEFT JOIN (evita error PostgreSQL 0A000)
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

    -- 3. Si el usuario es 'veterinaria', verificar vinculación a la clínica derivada
    --    (o permitir si la clínica derivada no tiene ningún usuario responsable asignado)
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

    -- 4. Resolver propietario (desde reserva o directamente desde la mascota) y usuario cuidador
    v_propietario_id := COALESCE(v_sos.reserva_propietario_id, v_sos.mascota_propietario_id);

    IF v_sos.reserva_cuidador_id IS NOT NULL THEN
        SELECT pc.id_usuario
        INTO v_cuidador_usuario_id
        FROM public.perfiles_cuidadores pc
        WHERE pc.id = v_sos.reserva_cuidador_id;
    END IF;

    -- 5. Determinar estado destino según acción clínica
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

    -- 6. Persistir diagnóstico, tratamiento y costo en TODAS las transiciones (en_atencion, estabilizada, resuelta)
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

    -- 7. Insertar notificaciones en tiempo real para Propietario, Cuidador (si existe) y todos los Administradores
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

    -- 8. Retornar JSONB confirmado con todos los campos actualizados
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

-- A.3. Actualizar public.rpc_emitir_sos agregando p_ubicacion text DEFAULT 'Cusco' al final de la firma
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

-- A.4. Actualizar política RLS sos_select_involucrados en public.incidencias_emergencias
--      para incluir propiedad directa de la mascota (cuando id_reserva sea NULL)
DROP POLICY IF EXISTS "sos_select_involucrados" ON public.incidencias_emergencias;
CREATE POLICY "sos_select_involucrados" ON public.incidencias_emergencias
    FOR SELECT USING (
        reportado_por = auth.uid()
        OR id_clinica_derivada = public.get_my_clinica_id()
        OR public.get_my_role() IN ('veterinaria', 'administrador')
        OR EXISTS (
            SELECT 1 FROM public.reservas r
            WHERE r.id = incidencias_emergencias.id_reserva
              AND (r.id_propietario = auth.uid() OR r.id_cuidador = public.get_my_cuidador_id())
        )
        OR EXISTS (
            SELECT 1 FROM public.mascotas m
            WHERE m.id = incidencias_emergencias.id_mascota
              AND m.id_propietario = auth.uid()
        )
    );


-- =============================================================================
-- BLOQUE B — REGLAS DE NEGOCIO (Check-Out Temporal, Hospedaje 24h, Sin Cupones, Muro en_curso)
-- =============================================================================

-- B.1. Desactivar todos los cupones promocionales existentes sin romper FKs históricas
UPDATE public.cupones_promocionales
SET activo = false
WHERE activo = true;

-- B.2. Actualizar public.rpc_cuidador_checkout con validación temporal en zona America/Lima
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

    -- Reporte de cierre en el muro (el trigger permite 'Check-Out' o reservas recién finalizadas)
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

-- B.3. Actualizar public.rpc_cotizar_reserva: ignorar cupones y retornar siempre
--      descuento_cupon = 0, id_cupon = NULL, cupon_valido = false
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

-- B.4. Actualizar public.rpc_crear_reserva:
--      - Forzar id_cupon = NULL, descuento_cupon = 0 y eliminar UPDATE public.cupones_promocionales
--      - Si categoria = 'Hospedaje', exigir v_bloque_horario = 'todo_el_dia'
--      - Validar disponibilidad/cupo en TODOS los días del rango [fecha_inicio..fecha_fin]
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
        -- Si existe bloqueo de día completo en esa fecha, rechazar inmediatamente
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

-- B.5. Trigger BEFORE INSERT en public.reportes_seguimiento para rechazar reportes
--      si la reserva asociada no tiene estado_reserva = 'en_curso'
--      (permitiendo eventos automáticos de cierre 'Check-Out' cuando la reserva acaba de pasar a 'finalizada')
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

    -- Permitir el reporte automático de 'Check-Out' que inserta rpc_cuidador_checkout justo tras cambiar a 'finalizada'
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
-- BLOQUE C — TRIGGER handle_new_auth_user() MEJORADO (Postulaciones sin Doble INSERT)
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
    --    persistiendo foto_fachada_url y constancia_url con ON CONFLICT (ruc) DO NOTHING
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
                ruc,
                nombre,
                email_institucional,
                direccion,
                distrito_cusco,
                telefono_emergencia,
                horario_atencion,
                especialidades,
                tarifa_consulta_emergencia,
                foto_fachada_url,
                constancia_url,
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
                id_usuario,
                presentacion_corta,
                descripcion_experiencia,
                anios_experiencia,
                tipo_vivienda,
                capacidad_max_mascotas,
                estado_postulacion,
                foto_url,
                foto_hogar_url,
                cuenta_cobro_tipo,
                cuenta_cobro_numero
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
-- BLOQUE D — STORAGE BUCKETS (IMÁGENES + PDFs) Y LIMPIEZA DE URLs PostImg EN BD
-- =============================================================================

-- D.1. Actualizar storage.buckets asegurando allowed_mime_types y file_size_limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    -- Fotos de mascotas y cartillas de vacunación (imágenes + PDF, hasta 10 MB)
    ('mascotas-fotos', 'mascotas-fotos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    -- Alias compatible 'mascotas'
    ('mascotas', 'mascotas', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    -- Fotografías del Muro en Vivo publicadas por cuidadores (imágenes hasta 5 MB)
    ('muro-fotos', 'muro-fotos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    -- Avatares de usuarios, fotos de hogar de cuidadores y fachadas de clínicas (imágenes hasta 5 MB)
    ('perfiles', 'perfiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    -- Documentos de verificación legal (DNI, antecedentes policiales/penales, domicilio, CMVP) — PRIVADO (imágenes + PDF hasta 10 MB)
    ('documentos-verificacion', 'documentos-verificacion', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    -- Comprobantes de pago y vouchers de liquidación — PRIVADO (imágenes + PDF hasta 10 MB)
    ('comprobantes-pago', 'comprobantes-pago', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- D.2. Actualizar políticas RLS en storage.objects
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('mascotas-fotos', 'mascotas', 'muro-fotos', 'perfiles')
    );

DROP POLICY IF EXISTS "storage_authenticated_upload_public_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_upload_public_buckets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('mascotas-fotos', 'mascotas', 'muro-fotos', 'perfiles')
        AND (
            auth.role() = 'authenticated'
            OR (bucket_id = 'perfiles' AND auth.role() IN ('anon', 'authenticated') AND name LIKE 'postulaciones/%')
        )
    );

DROP POLICY IF EXISTS "storage_postulaciones_upload" ON storage.objects;
CREATE POLICY "storage_postulaciones_upload" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        bucket_id IN ('perfiles', 'documentos-verificacion')
        AND name LIKE 'postulaciones/%'
    );

DROP POLICY IF EXISTS "storage_owner_or_admin_modify" ON storage.objects;
CREATE POLICY "storage_owner_or_admin_modify" ON storage.objects
    FOR UPDATE USING (
        owner = auth.uid() OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "storage_owner_or_admin_delete" ON storage.objects;
CREATE POLICY "storage_owner_or_admin_delete" ON storage.objects
    FOR DELETE USING (
        owner = auth.uid() OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "storage_private_upload" ON storage.objects;
CREATE POLICY "storage_private_upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('documentos-verificacion', 'comprobantes-pago')
        AND (
            auth.role() = 'authenticated'
            OR (bucket_id = 'documentos-verificacion' AND auth.role() = 'anon' AND name LIKE 'postulaciones/%')
        )
    );

DROP POLICY IF EXISTS "storage_private_read_owner_or_admin" ON storage.objects;
CREATE POLICY "storage_private_read_owner_or_admin" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('documentos-verificacion', 'comprobantes-pago')
        AND (
            owner = auth.uid()
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_my_role() IN ('administrador', 'veterinaria')
        )
    );

-- D.3. Reemplazar en public.clinicas_veterinarias todas las URLs foto_fachada_url que contengan
--      'postimg' por fotografías veterinarias reales válidas de Unsplash (URLs distintas por clínica)
UPDATE public.clinicas_veterinarias
SET foto_fachada_url = CASE codigo_clinica
    WHEN 'VET-001' THEN 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=900&q=80'
    WHEN 'VET-002' THEN 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=900&q=80'
    WHEN 'VET-003' THEN 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&w=900&q=80'
    WHEN 'VET-004' THEN 'https://images.unsplash.com/photo-1599443015574-be5fe8a05783?auto=format&fit=crop&w=900&q=80'
    WHEN 'VET-005' THEN 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80'
    ELSE 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=900&q=80'
END
WHERE foto_fachada_url IS NULL
   OR foto_fachada_url ILIKE '%postimg%';

-- Limpiar constancia_url en clinicas_veterinarias que apunten a enlaces rotos de PostImg
UPDATE public.clinicas_veterinarias
SET constancia_url = NULL
WHERE constancia_url ILIKE '%postimg%';

-- Limpiar cartilla_vacunas_url en mascotas y cartilla_evaluada_url en validaciones_veterinarias con PostImg
UPDATE public.mascotas
SET cartilla_vacunas_url = NULL
WHERE cartilla_vacunas_url ILIKE '%postimg%';

UPDATE public.validaciones_veterinarias
SET cartilla_evaluada_url = NULL
WHERE cartilla_evaluada_url ILIKE '%postimg%';

-- Limpiar enlaces rotos de PostImg en antecedentes_cuidadores
-- (doc_domicilio_url es nullable -> NULL; los otros 3 son NOT NULL en 01_schema.sql,
--  por lo que se relaja NOT NULL de forma idempotente para poder dejar NULL limpio donde había postimg)
ALTER TABLE public.antecedentes_cuidadores
    ALTER COLUMN doc_identidad_url DROP NOT NULL,
    ALTER COLUMN doc_antecedentes_policiales_url DROP NOT NULL,
    ALTER COLUMN doc_antecedentes_penales_url DROP NOT NULL;

UPDATE public.antecedentes_cuidadores
SET
    doc_identidad_url = CASE WHEN doc_identidad_url ILIKE '%postimg%' THEN NULL ELSE doc_identidad_url END,
    doc_antecedentes_policiales_url = CASE WHEN doc_antecedentes_policiales_url ILIKE '%postimg%' THEN NULL ELSE doc_antecedentes_policiales_url END,
    doc_antecedentes_penales_url = CASE WHEN doc_antecedentes_penales_url ILIKE '%postimg%' THEN NULL ELSE doc_antecedentes_penales_url END,
    doc_domicilio_url = CASE WHEN doc_domicilio_url ILIKE '%postimg%' THEN NULL ELSE doc_domicilio_url END
WHERE doc_identidad_url ILIKE '%postimg%'
   OR doc_antecedentes_policiales_url ILIKE '%postimg%'
   OR doc_antecedentes_penales_url ILIKE '%postimg%'
   OR doc_domicilio_url ILIKE '%postimg%';

-- Actualizar origen_almacenamiento en fotos_reporte que tenían URL de Unsplash etiquetada como 'postimg'
UPDATE public.fotos_reporte
SET origen_almacenamiento = 'externo'
WHERE origen_almacenamiento = 'postimg'
  AND foto_url NOT ILIKE '%postimg%';


-- =============================================================================
-- BLOQUE E — PUBLICACIÓN supabase_realtime COMPLETA (6 TABLAS OPERATIVAS)
-- =============================================================================

DO $$
DECLARE
    v_tbl text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH v_tbl IN ARRAY ARRAY[
            'incidencias_emergencias',
            'notificaciones',
            'reportes_seguimiento',
            'reservas',
            'liquidaciones_cuidadores',
            'auditoria_estados'
        ]
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


-- =============================================================================
-- BLOQUE F — GRANTS Y CONSULTAS DE VERIFICACIÓN COMENTADAS
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role, supabase_auth_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.rpc_cotizar_reserva(uuid, date, date, public.bloque_horario_enum, jsonb, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_obtener_paw_id_publico(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_crear_reserva(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cuidador_responder_reserva(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cuidador_checkin(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cuidador_checkout(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_preview_cancelacion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cancelar_reserva(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_abrir_disputa(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_resolver_caso(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_solicitar_retiro(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_procesar_liquidacion(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_emitir_sos(uuid, public.nivel_severidad_sos_enum, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vet_actualizar_sos(uuid, text, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_reasignar_sos(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vet_dictaminar_ficha(uuid, public.estado_validacion_vet_enum, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_aprobar_cuidador(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_aprobar_clinica(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_crear_clinica_directa(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_publicar_resena(uuid, integer, integer, integer, integer, text) TO authenticated;

GRANT SELECT ON public.v_catalogo_cuidadores TO anon, authenticated;
GRANT SELECT ON public.v_billetera_cuidador TO authenticated;
GRANT SELECT ON public.v_resumen_mascotas TO authenticated;

COMMIT;

-- =============================================================================
-- CONSULTAS DE VERIFICACIÓN POST-EJECUCIÓN (Descomentar para probar en SQL Editor)
-- =============================================================================
/*
-- 1. Verificar que 0 URLs de PostImg quedan en clínicas, mascotas o antecedentes:
SELECT 'clinicas_fachada' AS tabla, COUNT(*) AS postimg_count FROM public.clinicas_veterinarias WHERE foto_fachada_url ILIKE '%postimg%'
UNION ALL
SELECT 'clinicas_constancia', COUNT(*) FROM public.clinicas_veterinarias WHERE constancia_url ILIKE '%postimg%'
UNION ALL
SELECT 'mascotas_cartilla', COUNT(*) FROM public.mascotas WHERE cartilla_vacunas_url ILIKE '%postimg%'
UNION ALL
SELECT 'antecedentes_cuidadores', COUNT(*) FROM public.antecedentes_cuidadores
WHERE doc_identidad_url ILIKE '%postimg%'
   OR doc_antecedentes_policiales_url ILIKE '%postimg%'
   OR doc_antecedentes_penales_url ILIKE '%postimg%'
   OR doc_domicilio_url ILIKE '%postimg%';

-- 2. Verificar que todos los cupones promocionales están desactivados (0 activos):
SELECT codigo, activo FROM public.cupones_promocionales;

-- 3. Verificar las 6 tablas registradas en supabase_realtime:
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 4. Verificar configuración de buckets de Storage (application/pdf e imágenes):
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;
*/

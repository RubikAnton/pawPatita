-- =============================================================================
-- PAW PATITA CUSCO v5.2 — SUB-FASE 5.2A: BLINDAJE SQL, NOTIFICACIONES Y S.O.S.
-- Archivo: supabase/09_pulido_v5_2.sql
-- Destino: SQL Editor de Producción (https://evephdzpoonavggwoejs.supabase.co)
-- Características: 100% Idempotente, sin pérdida de datos existentes.
--
-- Bloques incluidos:
--   Bloque A — Trazabilidad Financiera S.O.S. (columnas cobro, backfill, RPCs)
--   Bloque B — Restricción S.O.S. del Cuidador (en_curso obligatorio)
--   Bloque C — Aislamiento Estricto de public.notificaciones y Realtime
--   Bloque D — Grants de Ejecución
-- =============================================================================

BEGIN;

-- =============================================================================
-- BLOQUE A — TRAZABILIDAD FINANCIERA S.O.S.
-- =============================================================================

-- A.1. Columnas idempotentes en public.incidencias_emergencias
ALTER TABLE public.incidencias_emergencias
    ADD COLUMN IF NOT EXISTS estado_cobro_sos text NOT NULL DEFAULT 'sin_cargo',
    ADD COLUMN IF NOT EXISTS metodo_pago_sos text,
    ADD COLUMN IF NOT EXISTS comprobante_pago_sos text,
    ADD COLUMN IF NOT EXISTS fecha_pago_sos timestamptz,
    ADD COLUMN IF NOT EXISTS observacion_cobro_sos text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_incidencias_estado_cobro_sos'
          AND conrelid = 'public.incidencias_emergencias'::regclass
    ) THEN
        ALTER TABLE public.incidencias_emergencias
            ADD CONSTRAINT chk_incidencias_estado_cobro_sos
            CHECK (estado_cobro_sos IN ('sin_cargo', 'pendiente_pago', 'reportado_propietario', 'conciliado', 'exonerado'));
    END IF;
END $$;

-- A.2. Backfill seguro para registros existentes con costo clínico > 0
UPDATE public.incidencias_emergencias
SET
    estado_cobro_sos = CASE
        WHEN codigo_sos = 'SOS-2026-0102' AND estado_sos = 'resuelta' THEN 'conciliado'
        ELSE 'pendiente_pago'
    END,
    metodo_pago_sos = CASE
        WHEN codigo_sos = 'SOS-2026-0102' AND estado_sos = 'resuelta' THEN COALESCE(metodo_pago_sos, 'Yape')
        ELSE metodo_pago_sos
    END,
    comprobante_pago_sos = CASE
        WHEN codigo_sos = 'SOS-2026-0102' AND estado_sos = 'resuelta' THEN COALESCE(comprobante_pago_sos, 'YAPE-SOS-0102')
        ELSE comprobante_pago_sos
    END,
    fecha_pago_sos = CASE
        WHEN codigo_sos = 'SOS-2026-0102' AND estado_sos = 'resuelta' THEN COALESCE(fecha_pago_sos, fecha_resolucion, now())
        ELSE fecha_pago_sos
    END,
    observacion_cobro_sos = CASE
        WHEN codigo_sos = 'SOS-2026-0102' AND estado_sos = 'resuelta' THEN COALESCE(observacion_cobro_sos, 'Cargo clínico histórico conciliado.')
        ELSE observacion_cobro_sos
    END
WHERE COALESCE(costo_atencion_ref, 0) > 0
  AND estado_cobro_sos = 'sin_cargo';

-- A.3. Actualizar public.rpc_vet_actualizar_sos manteniendo firma y FOR UPDATE OF i
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

    IF p_costo IS NOT NULL AND p_costo < 0 THEN
        RAISE EXCEPTION 'El costo clínico referencial no puede ser negativo.';
    END IF;

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
        estado_cobro_sos = CASE
            WHEN COALESCE(p_costo, i.costo_atencion_ref, 0) > 0 AND i.estado_cobro_sos = 'sin_cargo'
                THEN 'pendiente_pago'
            ELSE i.estado_cobro_sos
        END,
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
                WHEN COALESCE(v_updated.costo_atencion_ref, 0) > 0 THEN
                    CASE
                        WHEN u.id = v_propietario_id THEN
                            ' • Costo ref.: S/ ' || to_char(v_updated.costo_atencion_ref, 'FM999990.00') ||
                            ' (Cobro: ' || v_updated.estado_cobro_sos || ')'
                        ELSE
                            ' • Costo ref.: S/ ' || to_char(v_updated.costo_atencion_ref, 'FM999990.00')
                    END
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
        'estado_cobro_sos', v_updated.estado_cobro_sos,
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

-- A.4. Crear public.rpc_propietario_regularizar_sos
CREATE OR REPLACE FUNCTION public.rpc_propietario_regularizar_sos(
    p_id_incidencia uuid,
    p_metodo_pago text,
    p_comprobante text,
    p_observacion text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_sos record;
    v_updated record;
    v_propietario_id uuid;
    v_metodo text := TRIM(COALESCE(p_metodo_pago, ''));
    v_comprobante text := TRIM(COALESCE(p_comprobante, ''));
    v_obs text := NULLIF(TRIM(COALESCE(p_observacion, '')), '');
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para regularizar un cargo clínico S.O.S.';
    END IF;

    IF LENGTH(v_metodo) < 2 THEN
        RAISE EXCEPTION 'Selecciona o indica el método de pago utilizado.';
    END IF;

    IF LENGTH(v_comprobante) < 3 THEN
        RAISE EXCEPTION 'Ingresa el número de operación o comprobante de pago.';
    END IF;

    SELECT
        i.*,
        r.id_propietario AS reserva_propietario_id,
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

    v_propietario_id := COALESCE(v_sos.reserva_propietario_id, v_sos.mascota_propietario_id);

    IF auth.uid() IS DISTINCT FROM v_propietario_id AND auth.uid() IS DISTINCT FROM v_sos.mascota_propietario_id THEN
        RAISE EXCEPTION 'Acceso denegado: solo el propietario de la mascota puede regularizar este cargo clínico.';
    END IF;

    IF COALESCE(v_sos.costo_atencion_ref, 0) <= 0 THEN
        RAISE EXCEPTION 'Esta incidencia S.O.S. no tiene un cargo clínico pendiente por regularizar.';
    END IF;

    IF v_sos.estado_cobro_sos IN ('conciliado', 'exonerado') THEN
        RAISE EXCEPTION 'Este cargo clínico S.O.S. ya se encuentra en estado "%".', v_sos.estado_cobro_sos;
    END IF;

    UPDATE public.incidencias_emergencias
    SET
        estado_cobro_sos = 'reportado_propietario',
        metodo_pago_sos = v_metodo,
        comprobante_pago_sos = v_comprobante,
        fecha_pago_sos = now(),
        observacion_cobro_sos = COALESCE(v_obs, observacion_cobro_sos),
        updated_at = now()
    WHERE id = p_id_incidencia
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
        'pago',
        format('Regularización de Cargo S.O.S. %s', v_updated.codigo_sos),
        format(
            'El propietario reportó el pago de S/ %s para %s (%s • Op.: %s). Pendiente de conciliación.',
            to_char(v_updated.costo_atencion_ref, 'FM999990.00'),
            COALESCE(v_sos.mascota_nombre, 'Mascota'),
            v_metodo,
            v_comprobante
        ),
        'incidencias_emergencias',
        p_id_incidencia::text
    FROM public.perfiles_usuarios u
    WHERE u.estado_cuenta = 'activo'
      AND (
          (v_sos.id_clinica_derivada IS NOT NULL AND u.id_clinica_asociada = v_sos.id_clinica_derivada)
          OR u.rol = 'administrador'
      );

    RETURN jsonb_build_object(
        'ok', true,
        'exito', true,
        'id_incidencia', v_updated.id,
        'codigo_sos', v_updated.codigo_sos,
        'estado_cobro_sos', v_updated.estado_cobro_sos,
        'metodo_pago_sos', v_updated.metodo_pago_sos,
        'comprobante_pago_sos', v_updated.comprobante_pago_sos,
        'fecha_pago_sos', v_updated.fecha_pago_sos,
        'observacion_cobro_sos', v_updated.observacion_cobro_sos,
        'costo_atencion_ref', COALESCE(v_updated.costo_atencion_ref, 0.00),
        'mensaje', format('Pago de cargo clínico S.O.S. %s reportado correctamente.', v_updated.codigo_sos)
    );
END;
$$;

-- A.5. Crear public.rpc_admin_conciliar_cobro_sos
CREATE OR REPLACE FUNCTION public.rpc_admin_conciliar_cobro_sos(
    p_id_incidencia uuid,
    p_accion text,
    p_observacion text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_sos record;
    v_updated record;
    v_propietario_id uuid;
    v_accion text := LOWER(TRIM(COALESCE(p_accion, '')));
    v_nuevo_estado text;
    v_obs text := NULLIF(TRIM(COALESCE(p_observacion, '')), '');
BEGIN
    IF public.get_my_role() IS DISTINCT FROM 'administrador' THEN
        RAISE EXCEPTION 'Acceso denegado: solo un Administrador puede conciliar o exonerar cargos clínicos S.O.S.';
    END IF;

    IF v_accion IN ('conciliar', 'conciliado') THEN
        v_nuevo_estado := 'conciliado';
    ELSIF v_accion IN ('exonerar', 'exonerado') THEN
        v_nuevo_estado := 'exonerado';
    ELSE
        RAISE EXCEPTION 'Acción "%" no reconocida. Use "conciliar" o "exonerar".', p_accion;
    END IF;

    SELECT
        i.*,
        r.id_propietario AS reserva_propietario_id,
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

    IF v_nuevo_estado = 'conciliado' AND COALESCE(v_sos.costo_atencion_ref, 0) <= 0 THEN
        RAISE EXCEPTION 'No se puede conciliar un cargo S.O.S. sin monto clínico registrado.';
    END IF;

    v_propietario_id := COALESCE(v_sos.reserva_propietario_id, v_sos.mascota_propietario_id);

    UPDATE public.incidencias_emergencias
    SET
        estado_cobro_sos = v_nuevo_estado,
        fecha_pago_sos = CASE
            WHEN v_nuevo_estado = 'conciliado' THEN COALESCE(fecha_pago_sos, now())
            ELSE fecha_pago_sos
        END,
        observacion_cobro_sos = COALESCE(
            v_obs,
            observacion_cobro_sos,
            CASE
                WHEN v_nuevo_estado = 'exonerado' THEN 'Cargo clínico exonerado por administración.'
                ELSE 'Cargo clínico conciliado por administración.'
            END
        ),
        updated_at = now()
    WHERE id = p_id_incidencia
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
        'pago',
        format(
            'Cargo S.O.S. %s %s',
            v_updated.codigo_sos,
            CASE WHEN v_nuevo_estado = 'exonerado' THEN 'Exonerado' ELSE 'Conciliado' END
        ),
        format(
            'El cargo clínico de S/ %s para %s fue marcado como %s.%s',
            to_char(COALESCE(v_updated.costo_atencion_ref, 0), 'FM999990.00'),
            COALESCE(v_sos.mascota_nombre, 'Mascota'),
            UPPER(v_nuevo_estado),
            CASE WHEN v_obs IS NOT NULL THEN ' • Obs.: ' || v_obs ELSE '' END
        ),
        'incidencias_emergencias',
        p_id_incidencia::text
    FROM public.perfiles_usuarios u
    WHERE u.estado_cuenta = 'activo'
      AND (
          u.id = v_propietario_id
          OR (v_sos.id_clinica_derivada IS NOT NULL AND u.id_clinica_asociada = v_sos.id_clinica_derivada)
      );

    RETURN jsonb_build_object(
        'ok', true,
        'exito', true,
        'id_incidencia', v_updated.id,
        'codigo_sos', v_updated.codigo_sos,
        'estado_cobro_sos', v_updated.estado_cobro_sos,
        'fecha_pago_sos', v_updated.fecha_pago_sos,
        'observacion_cobro_sos', v_updated.observacion_cobro_sos,
        'costo_atencion_ref', COALESCE(v_updated.costo_atencion_ref, 0.00),
        'mensaje', format('Cargo clínico S.O.S. %s actualizado a "%s".', v_updated.codigo_sos, v_updated.estado_cobro_sos)
    );
END;
$$;


-- =============================================================================
-- BLOQUE B — RESTRICCIÓN S.O.S. DEL CUIDADOR (en_curso OBLIGATORIO)
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
    v_rol text;
    v_id_clinica uuid;
    v_nombre_clinica text;
    v_id_sos uuid;
    v_codigo_sos text;
    v_ubicacion_final text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para emitir una alerta S.O.S.';
    END IF;

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

    v_rol := public.get_my_role();

    IF auth.uid() NOT IN (v_res.id_propietario, v_res.cuidador_user_id)
       AND v_rol IS DISTINCT FROM 'administrador' THEN
        RAISE EXCEPTION 'Acceso denegado: no estás autorizado para emitir una alerta S.O.S. sobre esta reserva.';
    END IF;

    IF v_rol = 'cuidador' AND v_res.estado_reserva != 'en_curso' THEN
        RAISE EXCEPTION 'Solo puedes emitir una alerta S.O.S. para mascotas que estén actualmente En Curso bajo tu custodia activa.';
    END IF;

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
        auth.uid(),
        v_id_clinica,
        COALESCE(p_severidad, 'critica'),
        COALESCE(NULLIF(TRIM(p_tipo), ''), 'Urgencia Veterinaria S.O.S.'),
        TRIM(p_descripcion),
        v_ubicacion_final,
        'emitida'
    )
    RETURNING id, codigo_sos INTO v_id_sos, v_codigo_sos;

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
-- BLOQUE C — AISLAMIENTO ESTRICTO DE public.notificaciones Y REALTIME
-- =============================================================================

DROP POLICY IF EXISTS "notificaciones_select_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_select_propias" ON public.notificaciones
    FOR SELECT USING (id_usuario_destino = auth.uid());

DROP POLICY IF EXISTS "notificaciones_update_leida" ON public.notificaciones;
CREATE POLICY "notificaciones_update_leida" ON public.notificaciones
    FOR UPDATE USING (id_usuario_destino = auth.uid())
    WITH CHECK (id_usuario_destino = auth.uid());

ALTER TABLE public.notificaciones REPLICA IDENTITY DEFAULT;
ALTER TABLE public.incidencias_emergencias REPLICA IDENTITY DEFAULT;

DO $$
DECLARE
    v_tbl text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH v_tbl IN ARRAY ARRAY['notificaciones', 'incidencias_emergencias']
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
-- BLOQUE D — GRANTS DE EJECUCIÓN
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.rpc_emitir_sos(uuid, public.nivel_severidad_sos_enum, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_vet_actualizar_sos(uuid, text, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_propietario_regularizar_sos(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_conciliar_cobro_sos(uuid, text, text) TO authenticated;

COMMIT;

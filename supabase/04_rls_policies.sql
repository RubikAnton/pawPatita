-- =============================================================================
-- PAW PATITA CUSCO v5.0 — FASE 2: INFRAESTRUCTURA DE BASE DE DATOS (SUPABASE)
-- Archivo: supabase/04_rls_policies.sql
-- Descripción: Habilitación obligatoria de Row Level Security (RLS) en las
--              23 tablas del modelo y políticas granulares por rol
--              (anon, propietario, cuidador, veterinaria, administrador).
-- =============================================================================

-- =============================================================================
-- 1. FUNCIONES HELPER DE AUTORIZACIÓN (SECURITY DEFINER)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT rol::text
    FROM public.perfiles_usuarios
    WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT COALESCE(
        (SELECT estado_cuenta = 'activo' FROM public.perfiles_usuarios WHERE id = auth.uid()),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.get_my_cuidador_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT id
    FROM public.perfiles_cuidadores
    WHERE id_usuario = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT id_clinica_asociada
    FROM public.perfiles_usuarios
    WHERE id = auth.uid();
$$;

-- =============================================================================
-- 2. HABILITACIÓN OBLIGATORIA DE RLS EN LAS 23 TABLAS
-- =============================================================================

ALTER TABLE public.configuracion_plataforma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas_veterinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mascotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validaciones_veterinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_cuidadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antecedentes_cuidadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidad_cuidadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporadas_tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupones_promocionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidaciones_cuidadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelaciones_reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_seguimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_reporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias_emergencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminos_condiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aceptaciones_tyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 3. POLÍTICAS RLS TABLA POR TABLA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 01. configuracion_plataforma
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "config_select_public" ON public.configuracion_plataforma;
CREATE POLICY "config_select_public" ON public.configuracion_plataforma
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "config_admin_all" ON public.configuracion_plataforma;
CREATE POLICY "config_admin_all" ON public.configuracion_plataforma
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 02. clinicas_veterinarias
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "clinicas_select_public_activas" ON public.clinicas_veterinarias;
CREATE POLICY "clinicas_select_public_activas" ON public.clinicas_veterinarias
    FOR SELECT USING (
        (estado_afiliacion = 'activa' AND activa = true)
        OR id = public.get_my_clinica_id()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "clinicas_insert_postulacion" ON public.clinicas_veterinarias;
CREATE POLICY "clinicas_insert_postulacion" ON public.clinicas_veterinarias
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "clinicas_update_propia_o_admin" ON public.clinicas_veterinarias;
CREATE POLICY "clinicas_update_propia_o_admin" ON public.clinicas_veterinarias
    FOR UPDATE USING (
        id = public.get_my_clinica_id()
        OR public.get_my_role() = 'administrador'
    )
    WITH CHECK (
        id = public.get_my_clinica_id()
        OR public.get_my_role() = 'administrador'
    );

-- -----------------------------------------------------------------------------
-- 03. perfiles_usuarios
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "usuarios_select_authenticated_o_cuidadores" ON public.perfiles_usuarios;
CREATE POLICY "usuarios_select_authenticated_o_cuidadores" ON public.perfiles_usuarios
    FOR SELECT USING (
        id = auth.uid()
        OR (rol = 'cuidador' AND estado_cuenta = 'activo')
        OR auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "usuarios_insert_self" ON public.perfiles_usuarios;
CREATE POLICY "usuarios_insert_self" ON public.perfiles_usuarios
    FOR INSERT WITH CHECK (id = auth.uid() OR public.get_my_role() = 'administrador');

DROP POLICY IF EXISTS "usuarios_update_self_o_admin" ON public.perfiles_usuarios;
CREATE POLICY "usuarios_update_self_o_admin" ON public.perfiles_usuarios
    FOR UPDATE USING (id = auth.uid() OR public.get_my_role() = 'administrador')
    WITH CHECK (id = auth.uid() OR public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 04. mascotas
-- Sin acceso anon directo (solo vía rpc_obtener_paw_id_publico).
-- Accesible al propietario dueño, al cuidador con reserva asignada, a veterinarias y admin.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "mascotas_select_roles" ON public.mascotas;
CREATE POLICY "mascotas_select_roles" ON public.mascotas
    FOR SELECT USING (
        id_propietario = auth.uid()
        OR public.get_my_role() IN ('veterinaria', 'administrador')
        OR EXISTS (
            SELECT 1 FROM public.reservas r
            WHERE r.id_mascota = mascotas.id
              AND r.id_cuidador = public.get_my_cuidador_id()
        )
    );

DROP POLICY IF EXISTS "mascotas_crud_propietario_o_admin" ON public.mascotas;
CREATE POLICY "mascotas_crud_propietario_o_admin" ON public.mascotas
    FOR ALL USING (
        id_propietario = auth.uid()
        OR public.get_my_role() = 'administrador'
    )
    WITH CHECK (
        id_propietario = auth.uid()
        OR public.get_my_role() = 'administrador'
    );

-- -----------------------------------------------------------------------------
-- 05. validaciones_veterinarias
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "validaciones_select_autorizados" ON public.validaciones_veterinarias;
CREATE POLICY "validaciones_select_autorizados" ON public.validaciones_veterinarias
    FOR SELECT USING (
        public.get_my_role() IN ('veterinaria', 'administrador')
        OR EXISTS (
            SELECT 1 FROM public.mascotas m
            WHERE m.id = validaciones_veterinarias.id_mascota
              AND m.id_propietario = auth.uid()
        )
    );

DROP POLICY IF EXISTS "validaciones_insert_vet_o_admin" ON public.validaciones_veterinarias;
CREATE POLICY "validaciones_insert_vet_o_admin" ON public.validaciones_veterinarias
    FOR INSERT WITH CHECK (public.get_my_role() IN ('veterinaria', 'administrador'));

-- -----------------------------------------------------------------------------
-- 06. perfiles_cuidadores
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cuidadores_select_aprobados_o_propio" ON public.perfiles_cuidadores;
CREATE POLICY "cuidadores_select_aprobados_o_propio" ON public.perfiles_cuidadores
    FOR SELECT USING (
        estado_postulacion = 'aprobado'
        OR id_usuario = auth.uid()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "cuidadores_insert_postulacion" ON public.perfiles_cuidadores;
CREATE POLICY "cuidadores_insert_postulacion" ON public.perfiles_cuidadores
    FOR INSERT WITH CHECK (id_usuario = auth.uid() OR public.get_my_role() = 'administrador');

DROP POLICY IF EXISTS "cuidadores_update_propio_o_admin" ON public.perfiles_cuidadores;
CREATE POLICY "cuidadores_update_propio_o_admin" ON public.perfiles_cuidadores
    FOR UPDATE USING (id_usuario = auth.uid() OR public.get_my_role() = 'administrador')
    WITH CHECK (id_usuario = auth.uid() OR public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 07. antecedentes_cuidadores
-- Privado: solo el propio cuidador y el Administrador
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "antecedentes_select_propio_o_admin" ON public.antecedentes_cuidadores;
CREATE POLICY "antecedentes_select_propio_o_admin" ON public.antecedentes_cuidadores
    FOR SELECT USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "antecedentes_insert_propio_o_admin" ON public.antecedentes_cuidadores;
CREATE POLICY "antecedentes_insert_propio_o_admin" ON public.antecedentes_cuidadores
    FOR INSERT WITH CHECK (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "antecedentes_update_propio_o_admin" ON public.antecedentes_cuidadores;
CREATE POLICY "antecedentes_update_propio_o_admin" ON public.antecedentes_cuidadores
    FOR UPDATE USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    )
    WITH CHECK (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

-- -----------------------------------------------------------------------------
-- 08. servicios
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "servicios_select_public" ON public.servicios;
CREATE POLICY "servicios_select_public" ON public.servicios
    FOR SELECT USING (
        disponible = true
        OR id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "servicios_crud_cuidador_o_admin" ON public.servicios;
CREATE POLICY "servicios_crud_cuidador_o_admin" ON public.servicios
    FOR ALL USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    )
    WITH CHECK (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

-- -----------------------------------------------------------------------------
-- 09. disponibilidad_cuidadores
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "disponibilidad_select_public" ON public.disponibilidad_cuidadores;
CREATE POLICY "disponibilidad_select_public" ON public.disponibilidad_cuidadores
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "disponibilidad_crud_cuidador_o_admin" ON public.disponibilidad_cuidadores;
CREATE POLICY "disponibilidad_crud_cuidador_o_admin" ON public.disponibilidad_cuidadores
    FOR ALL USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    )
    WITH CHECK (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

-- -----------------------------------------------------------------------------
-- 10. temporadas_tarifas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "temporadas_select_public" ON public.temporadas_tarifas;
CREATE POLICY "temporadas_select_public" ON public.temporadas_tarifas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "temporadas_admin_all" ON public.temporadas_tarifas;
CREATE POLICY "temporadas_admin_all" ON public.temporadas_tarifas
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 11. cupones_promocionales
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cupones_select_public" ON public.cupones_promocionales;
CREATE POLICY "cupones_select_public" ON public.cupones_promocionales
    FOR SELECT USING (activo = true OR public.get_my_role() = 'administrador');

DROP POLICY IF EXISTS "cupones_admin_all" ON public.cupones_promocionales;
CREATE POLICY "cupones_admin_all" ON public.cupones_promocionales
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 12. reservas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reservas_select_involucrados" ON public.reservas;
CREATE POLICY "reservas_select_involucrados" ON public.reservas
    FOR SELECT USING (
        id_propietario = auth.uid()
        OR id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() IN ('administrador', 'veterinaria')
    );

DROP POLICY IF EXISTS "reservas_admin_all" ON public.reservas;
CREATE POLICY "reservas_admin_all" ON public.reservas
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 13. pagos
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "pagos_select_involucrados" ON public.pagos;
CREATE POLICY "pagos_select_involucrados" ON public.pagos
    FOR SELECT USING (
        public.get_my_role() = 'administrador'
        OR EXISTS (
            SELECT 1 FROM public.reservas r
            WHERE r.id = pagos.id_reserva
              AND (r.id_propietario = auth.uid() OR r.id_cuidador = public.get_my_cuidador_id())
        )
    );

DROP POLICY IF EXISTS "pagos_admin_all" ON public.pagos;
CREATE POLICY "pagos_admin_all" ON public.pagos
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 14. liquidaciones_cuidadores
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "liquidaciones_select_cuidador_o_admin" ON public.liquidaciones_cuidadores;
CREATE POLICY "liquidaciones_select_cuidador_o_admin" ON public.liquidaciones_cuidadores
    FOR SELECT USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "liquidaciones_admin_all" ON public.liquidaciones_cuidadores;
CREATE POLICY "liquidaciones_admin_all" ON public.liquidaciones_cuidadores
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 15. cancelaciones_reembolsos
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "cancelaciones_select_involucrados" ON public.cancelaciones_reembolsos;
CREATE POLICY "cancelaciones_select_involucrados" ON public.cancelaciones_reembolsos
    FOR SELECT USING (
        solicitado_por = auth.uid()
        OR public.get_my_role() = 'administrador'
        OR EXISTS (
            SELECT 1 FROM public.reservas r
            WHERE r.id = cancelaciones_reembolsos.id_reserva
              AND (r.id_propietario = auth.uid() OR r.id_cuidador = public.get_my_cuidador_id())
        )
    );

DROP POLICY IF EXISTS "cancelaciones_admin_all" ON public.cancelaciones_reembolsos;
CREATE POLICY "cancelaciones_admin_all" ON public.cancelaciones_reembolsos
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 16. reportes_seguimiento
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reportes_select_propietario_cuidador_admin" ON public.reportes_seguimiento;
CREATE POLICY "reportes_select_propietario_cuidador_admin" ON public.reportes_seguimiento
    FOR SELECT USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
        OR EXISTS (
            SELECT 1 FROM public.reservas r
            WHERE r.id = reportes_seguimiento.id_reserva
              AND r.id_propietario = auth.uid()
        )
    );

DROP POLICY IF EXISTS "reportes_insert_cuidador" ON public.reportes_seguimiento;
CREATE POLICY "reportes_insert_cuidador" ON public.reportes_seguimiento
    FOR INSERT WITH CHECK (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

DROP POLICY IF EXISTS "reportes_update_visto" ON public.reportes_seguimiento;
CREATE POLICY "reportes_update_visto" ON public.reportes_seguimiento
    FOR UPDATE USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
        OR EXISTS (
            SELECT 1 FROM public.reservas r
            WHERE r.id = reportes_seguimiento.id_reserva
              AND r.id_propietario = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 17. fotos_reporte
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "fotos_reporte_select_autorizados" ON public.fotos_reporte;
CREATE POLICY "fotos_reporte_select_autorizados" ON public.fotos_reporte
    FOR SELECT USING (
        public.get_my_role() = 'administrador'
        OR EXISTS (
            SELECT 1 FROM public.reportes_seguimiento rep
            JOIN public.reservas r ON r.id = rep.id_reserva
            WHERE rep.id = fotos_reporte.id_reporte
              AND (r.id_propietario = auth.uid() OR rep.id_cuidador = public.get_my_cuidador_id())
        )
    );

DROP POLICY IF EXISTS "fotos_reporte_insert_cuidador" ON public.fotos_reporte;
CREATE POLICY "fotos_reporte_insert_cuidador" ON public.fotos_reporte
    FOR INSERT WITH CHECK (
        public.get_my_role() = 'administrador'
        OR EXISTS (
            SELECT 1 FROM public.reportes_seguimiento rep
            WHERE rep.id = fotos_reporte.id_reporte
              AND rep.id_cuidador = public.get_my_cuidador_id()
        )
    );

-- -----------------------------------------------------------------------------
-- 18. incidencias_emergencias
-- -----------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "sos_admin_vet_update" ON public.incidencias_emergencias;
CREATE POLICY "sos_admin_vet_update" ON public.incidencias_emergencias
    FOR UPDATE USING (public.get_my_role() IN ('veterinaria', 'administrador'))
    WITH CHECK (public.get_my_role() IN ('veterinaria', 'administrador'));

-- -----------------------------------------------------------------------------
-- 19. resenas
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "resenas_select_public" ON public.resenas;
CREATE POLICY "resenas_select_public" ON public.resenas
    FOR SELECT USING (visible = true OR public.get_my_role() = 'administrador');

DROP POLICY IF EXISTS "resenas_insert_propietario" ON public.resenas;
CREATE POLICY "resenas_insert_propietario" ON public.resenas
    FOR INSERT WITH CHECK (id_propietario = auth.uid() OR public.get_my_role() = 'administrador');

DROP POLICY IF EXISTS "resenas_update_respuesta_cuidador" ON public.resenas;
CREATE POLICY "resenas_update_respuesta_cuidador" ON public.resenas
    FOR UPDATE USING (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    )
    WITH CHECK (
        id_cuidador = public.get_my_cuidador_id()
        OR public.get_my_role() = 'administrador'
    );

-- -----------------------------------------------------------------------------
-- 20. terminos_condiciones
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tyc_select_public" ON public.terminos_condiciones;
CREATE POLICY "tyc_select_public" ON public.terminos_condiciones
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "tyc_admin_all" ON public.terminos_condiciones;
CREATE POLICY "tyc_admin_all" ON public.terminos_condiciones
    FOR ALL USING (public.get_my_role() = 'administrador')
    WITH CHECK (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 21. aceptaciones_tyc
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "aceptaciones_select_propio_o_admin" ON public.aceptaciones_tyc;
CREATE POLICY "aceptaciones_select_propio_o_admin" ON public.aceptaciones_tyc
    FOR SELECT USING (id_usuario = auth.uid() OR public.get_my_role() = 'administrador');

DROP POLICY IF EXISTS "aceptaciones_insert_authenticated" ON public.aceptaciones_tyc;
CREATE POLICY "aceptaciones_insert_authenticated" ON public.aceptaciones_tyc
    FOR INSERT WITH CHECK (id_usuario = auth.uid() OR public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 22. auditoria_estados
-- Inmutable desde el cliente: solo el Administrador puede hacer SELECT
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "auditoria_select_solo_admin" ON public.auditoria_estados;
CREATE POLICY "auditoria_select_solo_admin" ON public.auditoria_estados
    FOR SELECT USING (public.get_my_role() = 'administrador');

-- -----------------------------------------------------------------------------
-- 23. notificaciones
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "notificaciones_select_propias" ON public.notificaciones;
CREATE POLICY "notificaciones_select_propias" ON public.notificaciones
    FOR SELECT USING (id_usuario_destino = auth.uid());

DROP POLICY IF EXISTS "notificaciones_update_leida" ON public.notificaciones;
CREATE POLICY "notificaciones_update_leida" ON public.notificaciones
    FOR UPDATE USING (id_usuario_destino = auth.uid())
    WITH CHECK (id_usuario_destino = auth.uid());

-- Permisos de lectura sobre las vistas analíticas
GRANT SELECT ON public.v_catalogo_cuidadores TO anon, authenticated;
GRANT SELECT ON public.v_billetera_cuidador TO authenticated;
GRANT SELECT ON public.v_resumen_mascotas TO authenticated;

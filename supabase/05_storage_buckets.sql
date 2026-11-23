-- =============================================================================
-- PAW PATITA CUSCO v5.0 — FASE 2: INFRAESTRUCTURA DE BASE DE DATOS (SUPABASE)
-- Archivo: supabase/05_storage_buckets.sql
-- Descripción: Creación y configuración de buckets de Supabase Storage
--              (mascotas-fotos, muro-fotos, documentos-verificacion,
--              comprobantes-pago, perfiles) + políticas de seguridad RLS
--              y función validadora para soporte híbrido con URLs PostImg.
-- =============================================================================

-- =============================================================================
-- 1. CREACIÓN DE BUCKETS DE SUPABASE STORAGE
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    -- Fotos de mascotas y cartillas de vacunación (lectura pública para carné PAW-ID y QR, imágenes + PDF hasta 10 MB)
    ('mascotas-fotos', 'mascotas-fotos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    -- Alias compatible 'mascotas' por si algún módulo lo referencia con nombre corto
    ('mascotas', 'mascotas', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    -- Fotografías del Muro en Vivo publicadas por cuidadores (imágenes hasta 5 MB)
    ('muro-fotos', 'muro-fotos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    -- Avatares de usuarios, fotos de hogar de cuidadores y fachadas de clínicas (imágenes hasta 5 MB)
    ('perfiles', 'perfiles', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    -- Documentos de verificación legal (DNI, antecedentes policiales/penales, CMVP) — PRIVADO (imágenes + PDF hasta 10 MB)
    ('documentos-verificacion', 'documentos-verificacion', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    -- Comprobantes de pago y vouchers de liquidación — PRIVADO (imágenes + PDF hasta 10 MB)
    ('comprobantes-pago', 'comprobantes-pago', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- 2. POLÍTICAS RLS EN STORAGE.OBJECTS
-- =============================================================================

-- Lectura pública para buckets de imágenes públicas (mascotas-fotos, mascotas, muro-fotos, perfiles)
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('mascotas-fotos', 'mascotas', 'muro-fotos', 'perfiles')
    );

-- Subida para usuarios autenticados en buckets públicos (y postulaciones públicas bajo prefijo postulaciones/)
DROP POLICY IF EXISTS "storage_authenticated_upload_public_buckets" ON storage.objects;
CREATE POLICY "storage_authenticated_upload_public_buckets" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('mascotas-fotos', 'mascotas', 'muro-fotos', 'perfiles')
        AND (
            auth.role() = 'authenticated'
            OR (bucket_id = 'perfiles' AND auth.role() IN ('anon', 'authenticated') AND name LIKE 'postulaciones/%')
        )
    );

-- Subida pública controlada en perfiles y documentos-verificacion para postulaciones/
DROP POLICY IF EXISTS "storage_postulaciones_upload" ON storage.objects;
CREATE POLICY "storage_postulaciones_upload" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        bucket_id IN ('perfiles', 'documentos-verificacion')
        AND name LIKE 'postulaciones/%'
    );

-- Actualización y eliminación por el propietario del archivo o Administrador
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

-- Buckets privados (documentos-verificacion y comprobantes-pago):
-- Subida permitida durante postulación/operación, lectura solo por el propietario de carpeta, Veterinaria o Administrador
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

-- =============================================================================
-- 3. FUNCIÓN HELPER PARA CLASIFICACIÓN DE ORIGEN MULTIMEDIA (Supabase Storage / Externo)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_clasificar_origen_imagen(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_url IS NULL OR TRIM(p_url) = '' THEN
        RETURN 'externo';
    ELSIF p_url ILIKE 'storage://%' OR p_url ILIKE '%/storage/v1/object/%' THEN
        RETURN 'supabase_storage';
    ELSE
        RETURN 'externo';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.fn_clasificar_origen_imagen IS 'Detecta automáticamente si una URL multimedia proviene de un bucket de Supabase Storage o de una fuente externa.';

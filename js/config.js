/**
 * Paw Patita Cusco v5.0 — Configuración Centralizada de Producción
 * js/config.js
 * 
 * ==============================================================================
 * GUÍA DE CONFIGURACIÓN DE SUPABASE EN PRODUCCIÓN:
 * ==============================================================================
 * 1. Accede a tu proyecto en Supabase Dashboard: https://supabase.com/dashboard
 * 2. Ve a: Project Settings (icono de engranaje) -> API
 * 3. En la sección "Project API keys", localiza:
 *    - Project URL: Copia la URL (ej. https://abcdefghijklm.supabase.co)
 *    - anon / public key: Copia la clave anon (ej. eyJhbGciOiJIUzI1NiIsInR5cCI6...)
 * 4. Pega tus credenciales en las constantes SUPABASE_URL y SUPABASE_ANON_KEY abajo,
 *    o inyéctalas dinámicamente mediante window.__ENV__ en tu HTML/CDN.
 * 
 * ⚠️ REGLA DE ORO DE SEGURIDAD:
 * NUNCA uses ni coloques aquí la clave 'service_role' (secret). Únicamente la clave 'anon' (public).
 * La seguridad está 100% blindada por las políticas RLS definidas en supabase/04_rls_policies.sql.
 * ==============================================================================
 */

export const ENV = {
  // URL del Proyecto Supabase (Project URL)
  // Reemplazar 'https://xyzcompany.supabase.co' con tu URL real de Supabase
  SUPABASE_URL: window.__ENV__?.SUPABASE_URL || 'https://evephdzpoonavggwoejs.supabase.co',

  // Clave Anónima Pública de Supabase (anon public API key)
  // Reemplazar con el token JWT público de tu proyecto
  SUPABASE_ANON_KEY: window.__ENV__?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZXBoZHpwb29uYXZnZ3dvZWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MjMyMTgsImV4cCI6MjExMDk5OTIxOH0.7vOFGE4Pwpjj7lt5i9_zOPf71oywZ0iwWFhq0p4aFd0',

  // URL canónica de producción en GitHub Pages
  SITE_URL: window.__ENV__?.SITE_URL || (window.location.origin + window.location.pathname),

  // Modo depuración (false en producción final si se desea silenciar logs en consola)
  DEBUG: true
};

export const CUSCO_CONFIG = {
  DISTRITOS: [
    'Cusco Centro',
    'Wanchaq',
    'San Sebastián',
    'San Jerónimo',
    'Santiago',
    'San Blas',
    'Saylla',
    'Poroy'
  ],
  COORDINADAS_CENTRO: {
    lat: -13.5167,
    lng: -71.9788,
    zoom: 13
  },
  SERVICIOS_CATEGORIAS: [
    { id: 'Paseo', nombre: 'Paseo Recreativo Andino', icono: 'bi-compass' },
    { id: 'Hospedaje', nombre: 'Hospedaje Familiar con Amor', icono: 'bi-house-heart' },
    { id: 'Guardería', nombre: 'Guardería Diurna Segura', icono: 'bi-sun' },
    { id: 'Domicilio Turístico', nombre: 'Cuidado en Hotel / Alojamiento', icono: 'bi-building' }
  ],
  BLOQUES_HORARIOS: [
    { id: '08:00-12:00', etiqueta: 'Mañana (08:00 - 12:00)', inicio: '08:00:00', fin: '12:00:00' },
    { id: '14:00-18:00', etiqueta: 'Tarde (14:00 - 18:00)', inicio: '14:00:00', fin: '18:00:00' },
    { id: '18:00-22:00', etiqueta: 'Noche (18:00 - 22:00)', inicio: '18:00:00', fin: '22:00:00' },
    { id: 'todo_el_dia', etiqueta: 'Todo el Día (08:00 - 20:00)', inicio: '08:00:00', fin: '20:00:00' }
  ],
  TIPOS_DOCUMENTO: [
    { id: 'DNI', nombre: 'DNI (Documento Nacional de Identidad - Perú)', longitud: 8 },
    { id: 'CE', nombre: 'Carné de Extranjería (CE)', longitud: 9 },
    { id: 'Pasaporte', nombre: 'Pasaporte Extranjero', longitud: 12 }
  ],
  CUENTAS_DEMO: [
    {
      rol: 'propietario',
      nombre: 'Lucía Mendoza (Propietaria Local / Turista)',
      email: 'lucia.mendoza@gmail.com',
      password: 'PawPatita2026!',
      badge: 'Propietaria',
      desc: 'Mascotas PAW-ID, Wizard Reserva y SOS'
    },
    {
      rol: 'cuidador',
      nombre: 'Valeria Quispe (Cuidadora Aprobada)',
      email: 'valeria.cuidadora@pawpatitacusco.pe',
      password: 'PawPatita2026!',
      badge: 'Cuidadora Activa',
      desc: 'Wanchaq • Agenda Bloques y Billetera'
    },
    {
      rol: 'veterinaria',
      nombre: 'Dr. Marco Polo (Clínica San Francisco 24h)',
      email: 'vet.sanfrancisco@pawpatitacusco.pe',
      password: 'PawPatita2026!',
      badge: 'Veterinaria 24h',
      desc: 'Central SOS Realtime y Validar PAW-ID'
    },
    {
      rol: 'administrador',
      nombre: 'Admin General Paw Patita',
      email: 'admin@pawpatitacusco.pe',
      password: 'PawPatita2026!',
      badge: 'Administrador',
      desc: 'KPIs 15%, Arbitraje, Vets y Liquidaciones'
    }
  ],
  STORAGE_BUCKETS: {
    MASCOTAS: 'mascotas',
    MURO: 'muro-fotos',
    PERFILES: 'perfiles',
    DOCUMENTOS: 'documentos-verificacion',
    COMPROBANTES: 'comprobantes-pago'
  },
  DEFAULT_TIPO_CAMBIO: 3.75,
  COMISION_PLATAFORMA_PCT: 0.15,
  TYC_VERSION: '5.0'
};

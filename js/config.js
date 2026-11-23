/**
 * Paw Patita Cusco v5.0 — Configuración Centralizada
 * js/config.js
 * 
 * Centraliza las credenciales públicas de Supabase, constantes geográficas de Cusco,
 * parámetros de plataforma, tipos de documento y bloques horarios.
 */

export const ENV = {
  // Configuración de Supabase Cloud
  // Reemplazar con las credenciales de tu proyecto Supabase o configurar en window.__ENV__
  SUPABASE_URL: window.__ENV__?.SUPABASE_URL || 'https://xyzcompany.supabase.co',
  SUPABASE_ANON_KEY: window.__ENV__?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development',
  SITE_URL: window.location.origin + window.location.pathname,
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

/**
 * Paw Patita Cusco v5.1 — Panel Maestro de Administración de Red y Analítica
 * js/roles/administrador.js
 *
 * Implementa las 6 Secciones Ejecutivas:
 *  1. Sección 1 — Panel Ejecutivo y Analítica de Distritos Cusco
 *  2. Sección 2 — Gestión de Cuidadores y Clínicas Veterinarias (con visor firmado y dropzones)
 *  3. Sección 3 — Cancelaciones, Reembolsos y Arbitraje de Disputas
 *  4. Sección 4 — Liquidaciones y Desembolsos a Cuidadores (85%)
 *  5. Sección 5 — Central Global S.O.S., Parámetros Financieros y Temporadas Oficiales de Cusco
 *  6. Sección 6 — Bitácora Global de Auditoría en Lenguaje Humano
 */

import {
  getSupabase,
  isSupabaseConfigured,
  subscribeRealtime,
  unsubscribeRealtime,
  resolveMediaUrl,
  getFallbackSvgDataUri
} from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import {
  formatMoneda,
  formatFechaEs,
  escapeHtml,
  getHoyIso,
  exportarCsv
} from '../utils/formatters.js';
import {
  showSpinner,
  hideSpinner,
  showToast,
  crearModalDinamico,
  handleSupabaseError
} from '../utils/ui-helpers.js';
import {
  renderChartDistritosCusco,
  renderChartCategoriasServicio,
  renderChartEstadosReserva,
  renderTablaDesgloseDistritosCusco,
  destroyAdminCharts
} from '../components/chart-dashboard.js';
import {
  getLocalLiquidacionesCuidador,
  saveLocalLiquidacionesCuidador,
  normalizarLiquidacion,
  renderBadgeEstadoLiquidacion
} from '../components/billetera-cuidador.js';
import { mountFileUploader, abrirVisorDocumento } from '../components/file-uploader.js';
import {
  CLINICAS_CUSCO_SOS,
  SOS_SEED_OWNER,
  renderBadgeEstadoCobroSos,
  normalizarIncidenciaSos
} from '../components/alerta-sos.js';
import { attachFormValidation, validateFormNow } from '../utils/validators.js';

const STORAGE_KEY_CUIDADORES_ADMIN = 'paw_demo_admin_cuidadores_v5';
const STORAGE_KEY_CLINICAS_ADMIN = 'paw_demo_clinicas_v5';
const STORAGE_KEY_CANCELACIONES_ADMIN = 'paw_demo_admin_cancelaciones_v5';
const STORAGE_KEY_LIQUIDACIONES_ADMIN = 'paw_demo_admin_liquidaciones_all_v5';
const STORAGE_KEY_LIQUIDACIONES_CUID = 'paw_demo_liquidaciones_cuidador_v5';
const STORAGE_KEY_SOS = 'paw_demo_sos_owner_v5';
const STORAGE_KEY_CONFIG_ADMIN = 'paw_demo_admin_config_v5';
const STORAGE_KEY_AUDITORIA = 'paw_demo_auditoria_v5';

/* ==========================================================================
   SEMILLAS SINCRONIZADAS CON `supabase/06_seed.sql` (0 `undefined`)
   ========================================================================== */

export const CUIDADORES_ADMIN_SEED = [
  {
    id: '60000000-0000-0000-0000-000000000007',
    codigo_cuidador: 'CUID-007',
    id_usuario: '50000000-0000-0000-0000-000000000017',
    nombre_completo: 'Jorge Chávez Condori',
    email: 'jorge.postulante@gmail.com',
    telefono: '+51 984 317 777',
    tipo_documento: 'DNI',
    num_documento: '77089990',
    distrito_cusco: 'Poroy',
    direccion: 'Av. Principal Poroy Lote 14, Cusco',
    anios_experiencia: 2,
    tipo_vivienda: 'Casa con patio cercado en Poroy',
    capacidad_max_mascotas: 3,
    especialidades: ['Paseos Seguros', 'Razas Medianas'],
    cuenta_cobro_tipo: 'Yape',
    cuenta_cobro_numero: '984317777',
    reputacion_promedio: 5.00,
    total_resenas: 0,
    estado_postulacion: 'pendiente',
    estado_cuenta: 'pendiente',
    motivo_estado: 'Postulación pendiente de revisión documental por Administración.',
    foto_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-11-21T09:15:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000008',
    codigo_cuidador: 'CUID-008',
    id_usuario: '50000000-0000-0000-0000-000000000018',
    nombre_completo: 'Elena Mamani Ormachea',
    email: 'elena.postulante@gmail.com',
    telefono: '+51 984 318 888',
    tipo_documento: 'DNI',
    num_documento: '78091091',
    distrito_cusco: 'Saylla',
    direccion: 'Urb. Valle Sur Km 18, Saylla - Cusco',
    anios_experiencia: 3,
    tipo_vivienda: 'Casa huerta cercada en Saylla',
    capacidad_max_mascotas: 4,
    especialidades: ['Hospedaje Familiar', 'Guardería'],
    cuenta_cobro_tipo: 'Plin',
    cuenta_cobro_numero: '984318888',
    reputacion_promedio: 5.00,
    total_resenas: 0,
    estado_postulacion: 'pendiente',
    estado_cuenta: 'pendiente',
    motivo_estado: 'Postulación pendiente de revisión documental por Administración.',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-11-21T14:40:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000001',
    codigo_cuidador: 'CUID-001',
    id_usuario: '50000000-0000-0000-0000-000000000011',
    nombre_completo: 'Valeria Huamán Delgado',
    email: 'valeria.cuidadora@pawpatitacusco.pe',
    telefono: '+51 984 311 111',
    tipo_documento: 'DNI',
    num_documento: '71029384',
    distrito_cusco: 'Wanchaq',
    direccion: 'Urb. Magisterio Primera Etapa, Wanchaq',
    anios_experiencia: 5,
    tipo_vivienda: 'Casa con jardín cercado de 120 m²',
    capacidad_max_mascotas: 4,
    especialidades: ['Hospedaje Familiar', 'Primeros Auxilios', 'Administración de Medicamentos'],
    cuenta_cobro_tipo: 'Yape',
    cuenta_cobro_numero: '984311111',
    reputacion_promedio: 4.95,
    total_resenas: 18,
    estado_postulacion: 'aprobado',
    estado_cuenta: 'activo',
    motivo_estado: 'Antecedentes policiales, penales y DNI verificados conforme.',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-09-10T10:00:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000002',
    codigo_cuidador: 'CUID-002',
    id_usuario: '50000000-0000-0000-0000-000000000012',
    nombre_completo: 'Diego Álvarez Tupayachi',
    email: 'diego.alvarez@pawpatitacusco.pe',
    telefono: '+51 984 312 222',
    tipo_documento: 'DNI',
    num_documento: '72039485',
    distrito_cusco: 'Cusco Centro',
    direccion: 'Calle Plateros 318, Centro Histórico',
    anios_experiencia: 4,
    tipo_vivienda: 'Departamento amplio pet-friendly cerca de Plaza Regocijo',
    capacidad_max_mascotas: 3,
    especialidades: ['Domicilio Turístico', 'Paseos de Aclimatación'],
    cuenta_cobro_tipo: 'BCP',
    cuenta_cobro_numero: '285-99182736-0-12',
    reputacion_promedio: 4.90,
    total_resenas: 14,
    estado_postulacion: 'aprobado',
    estado_cuenta: 'activo',
    motivo_estado: 'Antecedentes policiales, penales y DNI verificados conforme.',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-09-12T10:00:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000003',
    codigo_cuidador: 'CUID-003',
    id_usuario: '50000000-0000-0000-0000-000000000013',
    nombre_completo: 'Camila Rojas Yábar',
    email: 'camila.rojas@pawpatitacusco.pe',
    telefono: '+51 984 313 333',
    tipo_documento: 'DNI',
    num_documento: '73049586',
    distrito_cusco: 'San Sebastián',
    direccion: 'Urb. Larapa Grande B-4, San Sebastián',
    anios_experiencia: 3,
    tipo_vivienda: 'Casa quinta con patio verde seguro',
    capacidad_max_mascotas: 5,
    especialidades: ['Guardería de Día', 'Etología y Conducta', 'Cachorros'],
    cuenta_cobro_tipo: 'Plin',
    cuenta_cobro_numero: '984313333',
    reputacion_promedio: 4.85,
    total_resenas: 11,
    estado_postulacion: 'aprobado',
    estado_cuenta: 'activo',
    motivo_estado: 'Antecedentes policiales, penales y DNI verificados conforme.',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-09-14T10:00:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000004',
    codigo_cuidador: 'CUID-004',
    id_usuario: '50000000-0000-0000-0000-000000000014',
    nombre_completo: 'Mateo Cornejo Paz',
    email: 'mateo.cornejo@pawpatitacusco.pe',
    telefono: '+51 984 314 444',
    tipo_documento: 'DNI',
    num_documento: '74059687',
    distrito_cusco: 'San Jerónimo',
    direccion: 'Sector Patapata s/n, San Jerónimo',
    anios_experiencia: 6,
    tipo_vivienda: 'Casa de campo cercada de 300 m² en San Jerónimo',
    capacidad_max_mascotas: 5,
    especialidades: ['Razas Grandes', 'Trekking Canino', 'Hospedaje Campestre'],
    cuenta_cobro_tipo: 'Interbank',
    cuenta_cobro_numero: '400-3102938475',
    reputacion_promedio: 5.00,
    total_resenas: 9,
    estado_postulacion: 'aprobado',
    estado_cuenta: 'activo',
    motivo_estado: 'Antecedentes policiales, penales y DNI verificados conforme.',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-09-16T10:00:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000005',
    codigo_cuidador: 'CUID-005',
    id_usuario: '50000000-0000-0000-0000-000000000015',
    nombre_completo: 'Sofía Aguilar Bellido',
    email: 'sofia.aguilar@pawpatitacusco.pe',
    telefono: '+51 984 315 555',
    tipo_documento: 'DNI',
    num_documento: '75069788',
    distrito_cusco: 'Santiago',
    direccion: 'Urb. Huancaro K-8, Santiago',
    anios_experiencia: 4,
    tipo_vivienda: 'Casa familiar tranquila sin escaleras',
    capacidad_max_mascotas: 3,
    especialidades: ['Perros Senior', 'Razas Pequeñas', 'Cuidado Geriátrico'],
    cuenta_cobro_tipo: 'BBVA',
    cuenta_cobro_numero: '0011-0200-0299182736',
    reputacion_promedio: 4.92,
    total_resenas: 12,
    estado_postulacion: 'aprobado',
    estado_cuenta: 'activo',
    motivo_estado: 'Antecedentes policiales, penales y DNI verificados conforme.',
    foto_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-09-18T10:00:00-05:00'
  },
  {
    id: '60000000-0000-0000-0000-000000000006',
    codigo_cuidador: 'CUID-006',
    id_usuario: '50000000-0000-0000-0000-000000000016',
    nombre_completo: 'Andrés Zevallos Kalinowski',
    email: 'andres.zevallos@pawpatitacusco.pe',
    telefono: '+51 984 316 666',
    tipo_documento: 'DNI',
    num_documento: '76079889',
    distrito_cusco: 'San Blas',
    direccion: 'Cuesta de San Blas 540, Cusco',
    anios_experiencia: 3,
    tipo_vivienda: 'Casona tradicional con patio soleado en San Blas',
    capacidad_max_mascotas: 3,
    especialidades: ['Domicilio Turístico', 'Recojo en Hotel', 'Fotografía Diaria'],
    cuenta_cobro_tipo: 'CCI',
    cuenta_cobro_numero: '00228519283746500112',
    reputacion_promedio: 4.88,
    total_resenas: 10,
    estado_postulacion: 'aprobado',
    estado_cuenta: 'activo',
    motivo_estado: 'Antecedentes policiales, penales y DNI verificados conforme.',
    foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    doc_identidad_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
    doc_antecedentes_policiales_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
    doc_antecedentes_penales_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
    doc_domicilio_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
    declaracion_jurada: true,
    created_at: '2026-09-20T10:00:00-05:00'
  }
];

export const CLINICAS_ADMIN_SEED = [
  {
    id: '40000000-0000-0000-0000-000000000005',
    codigo_clinica: 'VET-005',
    ruc: '20601234565',
    nombre: 'Consultorio Veterinario Sacsayhuamán Vet',
    email_institucional: 'postulacion@sacsayhuamanvet.pe',
    direccion: 'Calle Suecia 240, San Blas',
    distrito_cusco: 'San Blas',
    latitud: -13.5141,
    longitud: -71.9768,
    telefono_emergencia: '+51 984 555 666',
    horario_atencion: 'Diurno',
    especialidades: ['Medicina General', 'Profilaxis Dental', 'Vacunación'],
    tarifa_consulta_emergencia: 45.00,
    colegiatura_cmvp: 'CMVP-CUSCO-6019',
    director_medico: 'Dr. Marco Paredes Ttito',
    constancia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=700',
    estado_afiliacion: 'pendiente',
    motivo_estado: 'Solicitud de afiliación pendiente de revisión por Administración.',
    activa: false,
    sos_atendidos: 0
  },
  {
    id: '40000000-0000-0000-0000-000000000001',
    codigo_clinica: 'VET-001',
    ruc: '20601234561',
    nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    email_institucional: 'emergencias@vetsanfranciscocusco.pe',
    direccion: 'Av. de la Cultura 1420, frente a UNSAAC',
    distrito_cusco: 'Wanchaq',
    latitud: -13.5226,
    longitud: -71.9612,
    telefono_emergencia: '+51 984 711 222',
    horario_atencion: '24 Horas',
    especialidades: ['Emergencias 24h', 'Traumatología', 'UCI Canina', 'Laboratorio Clínico'],
    tarifa_consulta_emergencia: 60.00,
    colegiatura_cmvp: 'CMVP-CUSCO-4821',
    director_medico: 'Dra. Claudia Salazar Cáceres',
    constancia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=700',
    estado_afiliacion: 'activa',
    motivo_estado: 'Sede principal acreditada 24h en Wanchaq',
    activa: true,
    sos_atendidos: 2
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    codigo_clinica: 'VET-002',
    ruc: '20601234562',
    nombre: 'Centro Médico Veterinario Qorikancha Pet',
    email_institucional: 'contacto@qorikanchapet.pe',
    direccion: 'Av. El Sol 815, Centro Histórico',
    distrito_cusco: 'Cusco Centro',
    latitud: -13.5192,
    longitud: -71.9754,
    telefono_emergencia: '+51 984 822 333',
    horario_atencion: '24 Horas',
    especialidades: ['Emergencias 24h', 'Medicina Interna', 'Oxigenoterapia de Altura'],
    tarifa_consulta_emergencia: 65.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5104',
    director_medico: 'Dr. Marco Polo',
    constancia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=700',
    estado_afiliacion: 'activa',
    motivo_estado: 'Acreditada para atención de turistas y locales en Cusco Centro',
    activa: true,
    sos_atendidos: 1
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    codigo_clinica: 'VET-003',
    ruc: '20601234563',
    nombre: 'Veterinaria Los Andes & Spa Canino',
    email_institucional: 'urgencias@vetlosandescusco.pe',
    direccion: 'Av. Cusco 512, Paradero Enaco',
    distrito_cusco: 'San Sebastián',
    latitud: -13.5318,
    longitud: -71.9365,
    telefono_emergencia: '+51 984 933 444',
    horario_atencion: 'Extendido',
    especialidades: ['Cirugía General', 'Vacunación Internacional', 'Dermatología'],
    tarifa_consulta_emergencia: 50.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5390',
    director_medico: 'Dra. Rosaura Quispe',
    constancia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=700',
    estado_afiliacion: 'activa',
    motivo_estado: 'Sede aliada zona sur San Sebastián',
    activa: true,
    sos_atendidos: 0
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    codigo_clinica: 'VET-004',
    ruc: '20601234564',
    nombre: 'Hospital Veterinario Valle Sur Cusco',
    email_institucional: 'atencion@vetvallesur.pe',
    direccion: 'Av. Manco Cápac 310, Plaza San Jerónimo',
    distrito_cusco: 'San Jerónimo',
    latitud: -13.5449,
    longitud: -71.8842,
    telefono_emergencia: '+51 984 644 555',
    horario_atencion: '24 Horas',
    especialidades: ['Emergencias 24h', 'Hospitalización', 'Cardiología'],
    tarifa_consulta_emergencia: 55.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5612',
    director_medico: 'Dr. César Huamán',
    constancia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=700',
    estado_afiliacion: 'activa',
    motivo_estado: 'Sede aliada 24h en San Jerónimo',
    activa: true,
    sos_atendidos: 1
  }
];

export const CANCELACIONES_ADMIN_SEED = [
  {
    id: '93000000-0000-0000-0000-000000000001',
    codigo_cancelacion: 'CAN-2026-0101',
    id_reserva: '90000000-0000-0000-0000-000000000008',
    codigo_reserva: 'RES-2026-0108',
    solicitante_nombre: 'Martin Dupont (Turista - Francia)',
    solicitante_rol: 'propietario',
    cuidador_nombre: 'Andrés Zevallos Kalinowski (CUID-006)',
    cuidador_distrito: 'San Blas',
    mascota_nombre: 'Chaska (PAW-1003)',
    tipo_caso: 'disputa',
    horas_anticipacion: 0,
    regla_aplicada: 'En Arbitraje Administrativo (Fondos Congelados en Garantía)',
    motivo: 'El cuidador entregó a Chaska 2 horas después de lo pactado en el hotel debido al cierre vehicular en el centro de Cusco. Solicito reembolso parcial del 30%.',
    monto_bruto_reserva: 160.00,
    porcentaje_reembolso: 30.00,
    monto_reembolso: 48.00,
    monto_penalidad_plataforma: 16.80,
    monto_compensacion_cuidador: 95.20,
    estado_tramite: 'pendiente_revision',
    resolucion_admin: null,
    created_at: '2026-11-21T18:30:00-05:00',
    fecha_resolucion: null
  },
  {
    id: '93000000-0000-0000-0000-000000000002',
    codigo_cancelacion: 'CAN-2026-0099',
    id_reserva: '90000000-0000-0000-0000-000000000004',
    codigo_reserva: 'RES-2026-0095',
    solicitante_nombre: 'Lucía Mendoza Vargas',
    solicitante_rol: 'propietario',
    cuidador_nombre: 'Diego Álvarez Tupayachi (CUID-002)',
    cuidador_distrito: 'Cusco Centro',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_caso: 'cancelacion_propietario',
    horas_anticipacion: 36.5,
    regla_aplicada: 'Cancelación Moderada (24h a 48h): 70% Reembolso / 30% Penalidad (15% Plataforma + 15% Cuidador)',
    motivo: 'Reprogramación de viaje familiar a Valle Sagrado por lluvias.',
    monto_bruto_reserva: 100.00,
    porcentaje_reembolso: 70.00,
    monto_reembolso: 70.00,
    monto_penalidad_plataforma: 15.00,
    monto_compensacion_cuidador: 15.00,
    estado_tramite: 'pendiente_revision',
    resolucion_admin: 'Pendiente de confirmación de transferencia de reembolso al Yape del propietario.',
    created_at: '2026-11-20T11:20:00-05:00',
    fecha_resolucion: null
  },
  {
    id: '93000000-0000-0000-0000-000000000003',
    codigo_cancelacion: 'CAN-2026-0092',
    id_reserva: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0088',
    solicitante_nombre: 'Lucía Mendoza Vargas',
    solicitante_rol: 'propietario',
    cuidador_nombre: 'Valeria Huamán Delgado (CUID-001)',
    cuidador_distrito: 'Wanchaq',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_caso: 'cancelacion_propietario',
    horas_anticipacion: 72.0,
    regla_aplicada: 'Cancelación Libre (> 48h): 100% Reembolso / 0% Penalidad',
    motivo: 'Cambio de fecha con más de 3 días de anticipación.',
    monto_bruto_reserva: 120.00,
    porcentaje_reembolso: 100.00,
    monto_reembolso: 120.00,
    monto_penalidad_plataforma: 0.00,
    monto_compensacion_cuidador: 0.00,
    estado_tramite: 'procesado',
    resolucion_admin: 'Reembolso del 100% ejecutado vía Yape (OP-YAPE-441209).',
    created_at: '2026-11-10T09:10:00-05:00',
    fecha_resolucion: '2026-11-10T10:05:00-05:00'
  }
];

export const LIQUIDACIONES_ADMIN_SEED = [
  {
    id: '92000000-0000-0000-0000-000000000006',
    codigo_liquidacion: 'LIQ-2026-0106',
    id_cuidador: '60000000-0000-0000-0000-000000000004',
    cuidador_codigo: 'CUID-004',
    cuidador_nombre: 'Mateo Cornejo Paz',
    cuidador_distrito: 'San Jerónimo',
    id_reserva: '90000000-0000-0000-0000-000000000006',
    codigo_reserva: 'RES-2026-0106',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Campestre 3 días',
    monto_bruto_reserva: 210.00,
    comision_plataforma: 31.50,
    monto_liquidado: 178.50,
    estado_liquidacion: 'solicitado',
    metodo_desembolso: 'Interbank',
    cuenta_destino: 'Interbank: 400-3102938475',
    num_operacion_desembolso: null,
    fecha_disponible: '2026-11-05T18:00:00-05:00',
    fecha_solicitud_retiro: '2026-11-22T09:30:00-05:00',
    fecha_liquidacion: null,
    created_at: '2026-11-03T10:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000010',
    codigo_liquidacion: 'LIQ-2026-0110',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_codigo: 'CUID-001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_reserva: '90000000-0000-0000-0000-000000000010',
    codigo_reserva: 'RES-2026-0100',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_concepto: 'Servicio de Custodia (85%) — Guardería de Día Finalizada',
    monto_bruto_reserva: 100.00,
    comision_plataforma: 15.00,
    monto_liquidado: 85.00,
    estado_liquidacion: 'solicitado',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: null,
    fecha_disponible: '2026-11-21T18:00:00-05:00',
    fecha_solicitud_retiro: '2026-11-22T15:00:00-05:00',
    fecha_liquidacion: null,
    created_at: '2026-11-20T10:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000005',
    codigo_liquidacion: 'LIQ-2026-0105',
    id_cuidador: '60000000-0000-0000-0000-000000000003',
    cuidador_codigo: 'CUID-003',
    cuidador_nombre: 'Camila Rojas Yábar',
    cuidador_distrito: 'San Sebastián',
    id_reserva: '90000000-0000-0000-0000-000000000005',
    codigo_reserva: 'RES-2026-0105',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_concepto: 'Servicio de Custodia (85%) — Guardería Recreativa 2 días',
    monto_bruto_reserva: 90.00,
    comision_plataforma: 13.50,
    monto_liquidado: 76.50,
    estado_liquidacion: 'disponible',
    metodo_desembolso: 'Plin',
    cuenta_destino: 'Plin: 984313333',
    num_operacion_desembolso: null,
    fecha_disponible: '2026-11-09T18:00:00-05:00',
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: '2026-11-08T10:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000002',
    codigo_liquidacion: 'LIQ-2026-0102',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_codigo: 'CUID-001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_reserva: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Familiar Premium 24h',
    monto_bruto_reserva: 145.00,
    comision_plataforma: 21.75,
    monto_liquidado: 123.25,
    estado_liquidacion: 'en_garantia',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: null,
    fecha_disponible: null,
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: '2026-11-22T08:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000003',
    codigo_liquidacion: 'LIQ-2026-0103',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_codigo: 'CUID-001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_reserva: '90000000-0000-0000-0000-000000000003',
    codigo_reserva: 'RES-2026-0103',
    mascota_nombre: 'Chaska (PAW-1003)',
    tipo_concepto: 'Servicio de Custodia (85%) — Guardería de Día en Magisterio',
    monto_bruto_reserva: 80.00,
    comision_plataforma: 12.00,
    monto_liquidado: 68.00,
    estado_liquidacion: 'en_garantia',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: null,
    fecha_disponible: null,
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: '2026-11-22T10:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000004',
    codigo_liquidacion: 'LIQ-2026-0104',
    id_cuidador: '60000000-0000-0000-0000-000000000002',
    cuidador_codigo: 'CUID-002',
    cuidador_nombre: 'Diego Álvarez Tupayachi',
    cuidador_distrito: 'Cusco Centro',
    id_reserva: '90000000-0000-0000-0000-000000000004',
    codigo_reserva: 'RES-2026-0104',
    mascota_nombre: 'Chaska (PAW-1003)',
    tipo_concepto: 'Servicio de Custodia (85%) — Cuidado en Hotel Turistas',
    monto_bruto_reserva: 150.00,
    comision_plataforma: 22.50,
    monto_liquidado: 127.50,
    estado_liquidacion: 'en_garantia',
    metodo_desembolso: 'BCP',
    cuenta_destino: 'BCP: 285-99182736-0-12',
    num_operacion_desembolso: null,
    fecha_disponible: null,
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: '2026-11-22T11:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000008',
    codigo_liquidacion: 'LIQ-2026-0108',
    id_cuidador: '60000000-0000-0000-0000-000000000006',
    cuidador_codigo: 'CUID-006',
    cuidador_nombre: 'Andrés Zevallos Kalinowski',
    cuidador_distrito: 'San Blas',
    id_reserva: '90000000-0000-0000-0000-000000000008',
    codigo_reserva: 'RES-2026-0108',
    mascota_nombre: 'Chaska (PAW-1003)',
    tipo_concepto: 'Servicio de Custodia (85%) — Retenido por Disputa Activa',
    monto_bruto_reserva: 160.00,
    comision_plataforma: 24.00,
    monto_liquidado: 136.00,
    estado_liquidacion: 'en_garantia',
    metodo_desembolso: 'CCI',
    cuenta_destino: 'CCI: 00228519283746500112',
    num_operacion_desembolso: null,
    fecha_disponible: null,
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: '2026-11-20T10:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000001',
    codigo_liquidacion: 'LIQ-2026-0101',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_codigo: 'CUID-001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_reserva: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    mascota_nombre: 'Inti (PAW-6858)',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Familiar 3 días',
    monto_bruto_reserva: 180.00,
    comision_plataforma: 27.00,
    monto_liquidado: 153.00,
    estado_liquidacion: 'pagado',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: 'OP-BCP-774120',
    fecha_disponible: '2026-11-15T18:00:00-05:00',
    fecha_solicitud_retiro: '2026-11-16T09:00:00-05:00',
    fecha_liquidacion: '2026-11-17T11:20:00-05:00',
    created_at: '2026-11-13T10:00:00-05:00'
  },
  {
    id: '92000000-0000-0000-0000-000000000007',
    codigo_liquidacion: 'LIQ-2026-0107',
    id_cuidador: '60000000-0000-0000-0000-000000000005',
    cuidador_codigo: 'CUID-005',
    cuidador_nombre: 'Sofía Aguilar Bellido',
    cuidador_distrito: 'Santiago',
    id_reserva: '90000000-0000-0000-0000-000000000007',
    codigo_reserva: 'RES-2026-0107',
    mascota_nombre: 'Chaska (PAW-1003)',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Tranquilo Senior',
    monto_bruto_reserva: 110.00,
    comision_plataforma: 16.50,
    monto_liquidado: 93.50,
    estado_liquidacion: 'pagado',
    metodo_desembolso: 'BBVA',
    cuenta_destino: 'BBVA: 0011-0200-0299182736',
    num_operacion_desembolso: 'OP-BBVA-992011',
    fecha_disponible: '2026-11-18T18:00:00-05:00',
    fecha_solicitud_retiro: '2026-11-19T10:00:00-05:00',
    fecha_liquidacion: '2026-11-20T14:15:00-05:00',
    created_at: '2026-11-17T10:00:00-05:00'
  }
];

export const AUDITORIA_ADMIN_SEED = [
  {
    id: 'aud-seed-001',
    entidad: 'incidencias_emergencias',
    id_registro: 'SOS-2026-0101',
    accion: 'UPDATE',
    estado_anterior: 'emitida',
    estado_nuevo: 'en_atencion',
    actor_nombre: 'Dra. Claudia Salazar Cáceres (VET-001)',
    actor_rol: 'veterinaria',
    detalle: 'Triaje S.O.S. iniciado en Clínica San Francisco Wanchaq: Extracción de espina vegetal en almohadilla plantar de Inti (PAW-6858).',
    old_record: { estado_sos: 'emitida', diagnostico_clinico: null },
    new_record: { estado_sos: 'en_atencion', diagnostico_clinico: 'Cuerpo extraño superficial en almohadilla metacarpiana derecha.' },
    created_at: '2026-11-22T22:15:00-05:00'
  },
  {
    id: 'aud-seed-002',
    entidad: 'cancelaciones_reembolsos',
    id_registro: 'CAN-2026-0101',
    accion: 'INSERT',
    estado_anterior: 'confirmada',
    estado_nuevo: 'en_disputa',
    actor_nombre: 'Martin Dupont (USR-003)',
    actor_rol: 'propietario',
    detalle: 'Apertura formal de disputa en reserva RES-2026-0108 (San Blas). Fondos S/ 160.00 congelados en garantía hasta arbitraje.',
    old_record: { estado_reserva: 'en_curso', estado_pago: 'aprobado' },
    new_record: { estado_reserva: 'en_disputa', estado_pago: 'en_disputa', porcentaje_reembolso_solicitado: 30 },
    created_at: '2026-11-21T18:30:00-05:00'
  },
  {
    id: 'aud-seed-003',
    entidad: 'liquidaciones_cuidadores',
    id_registro: 'LIQ-2026-0106',
    accion: 'UPDATE',
    estado_anterior: 'disponible',
    estado_nuevo: 'solicitado',
    actor_nombre: 'Mateo Cornejo Paz (CUID-004)',
    actor_rol: 'cuidador',
    detalle: 'Solicitud de retiro bancario por S/ 178.50 (85% neto de RES-2026-0106) hacia cuenta Interbank: 400-3102938475.',
    old_record: { estado_liquidacion: 'disponible' },
    new_record: { estado_liquidacion: 'solicitado', cuenta_destino: 'Interbank: 400-3102938475' },
    created_at: '2026-11-22T09:30:00-05:00'
  },
  {
    id: 'aud-seed-004',
    entidad: 'mascotas',
    id_registro: 'PAW-1004',
    accion: 'UPDATE',
    estado_anterior: 'pendiente',
    estado_nuevo: 'observado',
    actor_nombre: 'Dra. Claudia Salazar Cáceres (VET-001)',
    actor_rol: 'veterinaria',
    detalle: 'Dictamen sanitario PAW-1004 (Wayra): Observado por refuerzo anual de vacuna Antirrábica vencido.',
    old_record: { estado_validacion_vet: 'pendiente' },
    new_record: { estado_validacion_vet: 'observado', clinica_cmvp: 'CMVP-CUSCO-4821' },
    created_at: '2026-11-20T16:15:00-05:00'
  },
  {
    id: 'aud-seed-005',
    entidad: 'liquidaciones_cuidadores',
    id_registro: 'LIQ-2026-0107',
    accion: 'UPDATE',
    estado_anterior: 'solicitado',
    estado_nuevo: 'pagado',
    actor_nombre: 'Rodrigo Quispe Monzón (Admin General)',
    actor_rol: 'administrador',
    detalle: 'Desembolso bancario aprobado por S/ 93.50 a Sofía Aguilar (Santiago). N° Operación: OP-BBVA-992011.',
    old_record: { estado_liquidacion: 'solicitado', num_operacion_desembolso: null },
    new_record: { estado_liquidacion: 'pagado', num_operacion_desembolso: 'OP-BBVA-992011' },
    created_at: '2026-11-20T14:15:00-05:00'
  },
  {
    id: 'aud-seed-006',
    entidad: 'perfiles_cuidadores',
    id_registro: 'CUID-006',
    accion: 'UPDATE',
    estado_anterior: 'pendiente',
    estado_nuevo: 'aprobado',
    actor_nombre: 'Rodrigo Quispe Monzón (Admin General)',
    actor_rol: 'administrador',
    detalle: 'Aprobación de expediente legal y antecedentes de Andrés Zevallos Kalinowski (Distrito: San Blas).',
    old_record: { estado_postulacion: 'pendiente', estado_cuenta: 'pendiente' },
    new_record: { estado_postulacion: 'aprobado', estado_cuenta: 'activo' },
    created_at: '2026-11-15T11:00:00-05:00'
  }
];

export const CONFIG_GOBERNANZA_SEED = {
  parametros: {
    comision_plataforma_pct: 15.0,
    tipo_cambio_usd: 3.75,
    tarifa_bano_extra: 25.00,
    yape_oficial: '984-000-111',
    soporte_whatsapp: '+51 984 123 456'
  },
  temporadas: [
    {
      id: '10000000-0000-0000-0000-000000000001',
      nombre: 'Fiestas del Cusco e Inti Raymi',
      descripcion: 'Alta demanda por mes jubilar del Cusco e Inti Raymi (Junio)',
      mes_dia_inicio: '06-01',
      mes_dia_fin: '06-30',
      rango: '01 Jun - 30 Jun',
      recargo_porcentaje: 20,
      activa: true
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      nombre: 'Fiestas Patrias Perú',
      descripcion: 'Temporada alta de turismo nacional e internacional (Julio - Agosto)',
      mes_dia_inicio: '07-15',
      mes_dia_fin: '08-15',
      rango: '15 Jul - 15 Ago',
      recargo_porcentaje: 15,
      activa: true
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      nombre: 'Semana Santa Cusqueña',
      descripcion: 'Feriado largo tradicional en Cusco',
      mes_dia_inicio: '03-25',
      mes_dia_fin: '04-10',
      rango: '25 Mar - 10 Abr',
      recargo_porcentaje: 15,
      activa: true
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      nombre: 'Navidad y Año Nuevo en los Andes',
      descripcion: 'Cierre de año en Cusco y Valle Sagrado',
      mes_dia_inicio: '12-20',
      mes_dia_fin: '12-31',
      rango: '20 Dic - 31 Dic',
      recargo_porcentaje: 25,
      activa: true
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      nombre: 'Temporada de Lluvias Cusco',
      descripcion: 'Atención reforzada bajo techo durante temporada de lluvias',
      mes_dia_inicio: '01-05',
      mes_dia_fin: '02-28',
      rango: '05 Ene - 28 Feb',
      recargo_porcentaje: 10,
      activa: true
    }
  ],
  terminos: [
    {
      codigo_version: 'v5.1-GENERAL',
      ambito: 'General',
      titulo: 'Términos Generales y Política de Privacidad Paw Patita Cusco',
      contenido: 'Contrato marco de intermediación tecnológica para cuidado responsable de mascotas en la ciudad del Cusco, bajo la Ley N° 30407 y Ley N° 29733.',
      vigente: true
    },
    {
      codigo_version: 'v5.1-RESERVA',
      ambito: 'Reserva',
      titulo: 'Política Escalonada de Cancelación y Pago Protegido en Garantía (15%/85%)',
      contenido: 'Cancelaciones con >48h reciben 100% de reembolso; entre 24h y 48h reciben 70% de reembolso (30% penalidad); con <24h reciben 50% de reembolso (50% penalidad).',
      vigente: true
    }
  ]
};

const MESES_CORTOS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatearMesDiaCorto(md) {
  if (!md || typeof md !== 'string' || !md.includes('-')) return md || '—';
  const [mm, dd] = md.split('-');
  const mesIdx = parseInt(mm, 10) - 1;
  const mesNombre = MESES_CORTOS_ES[mesIdx] || mm;
  return `${dd} ${mesNombre}`;
}

function normalizarTemporadaAdmin(t) {
  const rango = t.rango || (
    t.mes_dia_inicio && t.mes_dia_fin
      ? `${formatearMesDiaCorto(t.mes_dia_inicio)} - ${formatearMesDiaCorto(t.mes_dia_fin)}`
      : 'Temporada Oficial'
  );
  return {
    id: t.id || `temp-${Date.now()}`,
    nombre: t.nombre || 'Temporada Cusco',
    descripcion: t.descripcion || '',
    mes_dia_inicio: t.mes_dia_inicio || '',
    mes_dia_fin: t.mes_dia_fin || '',
    rango,
    recargo_porcentaje: Number(t.recargo_porcentaje ?? 15),
    factor_multiplicador: Number(t.factor_multiplicador ?? (1 + (Number(t.recargo_porcentaje ?? 15) / 100))),
    activa: t.activa !== false
  };
}

// Estado Reactivo del Panel Administrador
const adminState = {
  activeTab: 'dashboard', // 'dashboard' | 'afiliados' | 'cancelaciones' | 'liquidaciones' | 'sos-config' | 'auditoria'
  modoChartDistritos: 'finanzas', // 'finanzas' | 'operaciones'
  subTabAfiliados: 'cuidadores', // 'cuidadores' | 'clinicas'
  filtroCuidadoresEstado: 'todos',
  filtroCuidadoresDistrito: 'todos',
  filtroClinicasEstado: 'todos',
  filtroCancelacionesEstado: 'todos',
  filtroLiquidacionesEstado: 'todos',
  filtroAuditoriaEntidad: 'todas',
  filtroAuditoriaRol: 'todos',
  filtroAuditoriaFechaDesde: '',
  filtroAuditoriaFechaHasta: '',
  filtroAuditoriaTexto: '',
  profile: null,
  rawRpcMetrics: null,
  metricasRpc: null,
  cuidadores: [],
  clinicas: [],
  cancelaciones: [],
  liquidaciones: [],
  alertasSos: [],
  gobernanza: null,
  auditoria: []
};

function resetAdminState() {
  destroyAdminCharts();
  adminState.activeTab = 'dashboard';
  adminState.modoChartDistritos = 'finanzas';
  adminState.subTabAfiliados = 'cuidadores';
  adminState.filtroCuidadoresEstado = 'todos';
  adminState.filtroCuidadoresDistrito = 'todos';
  adminState.filtroClinicasEstado = 'todos';
  adminState.filtroCancelacionesEstado = 'todos';
  adminState.filtroLiquidacionesEstado = 'todos';
  adminState.filtroAuditoriaEntidad = 'todas';
  adminState.filtroAuditoriaRol = 'todos';
  adminState.filtroAuditoriaFechaDesde = '';
  adminState.filtroAuditoriaFechaHasta = '';
  adminState.filtroAuditoriaTexto = '';
  adminState.profile = null;
  adminState.rawRpcMetrics = null;
  adminState.metricasRpc = null;
  adminState.cuidadores = [];
  adminState.clinicas = [];
  adminState.cancelaciones = [];
  adminState.liquidaciones = [];
  adminState.alertasSos = [];
  adminState.gobernanza = null;
  adminState.auditoria = [];
  unsubscribeRealtime('canal-admin-auditoria-live');
  unsubscribeRealtime('canal-admin-sos-live');
}

if (typeof window !== 'undefined') {
  window.addEventListener('paw:auth-changed', (ev) => {
    const nextUser = ev?.detail?.user || null;
    const nextRole = ev?.detail?.profile?.rol || null;
    if (!nextUser || (nextRole && nextRole !== 'administrador') || (adminState.profile?.id && nextUser.id !== adminState.profile.id)) {
      resetAdminState();
    }
  });
}

/* ==========================================================================
   PERSISTENCIA Y NORMALIZACIÓN SIN `undefined`
   ========================================================================== */

function registrarAuditoriaAdmin({
  entidad,
  id_registro,
  accion = 'UPDATE',
  estado_anterior = '—',
  estado_nuevo = '—',
  detalle = '',
  old_record = null,
  new_record = null
}) {
  const actorNombre = adminState.profile?.nombre
    ? `${adminState.profile.nombre} ${adminState.profile.apellido || ''}`.trim()
    : 'Rodrigo Quispe Monzón (Admin General)';

  const nuevoEvento = {
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    entidad,
    id_registro,
    accion,
    estado_anterior,
    estado_nuevo,
    actor_nombre: actorNombre,
    actor_rol: 'administrador',
    detalle,
    old_record: old_record || { estado: estado_anterior },
    new_record: new_record || { estado: estado_nuevo, detalle },
    created_at: new Date().toISOString()
  };

  adminState.auditoria.unshift(nuevoEvento);
  try {
    localStorage.setItem(STORAGE_KEY_AUDITORIA, JSON.stringify(adminState.auditoria.slice(0, 200)));
  } catch (_) { /* ignore */ }
}

const LEGACY_BROKEN_HOSTS = ['post' + 'img.cc', 'post' + 'images.org'];

function sanitizeDocRef(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (LEGACY_BROKEN_HOSTS.some((h) => lower.includes(h))) return '';
  return trimmed;
}

function normalizarCuidadorAdmin(c) {
  const u = c.perfiles_usuarios || {};
  const ant = Array.isArray(c.antecedentes_cuidadores)
    ? (c.antecedentes_cuidadores[0] || {})
    : (c.antecedentes_cuidadores || {});

  const codigo = c.codigo_cuidador || 'CUID-100';
  const sufijo = codigo.toLowerCase();
  const nombreCompleto = c.nombre_completo
    || (u.nombre ? `${u.nombre} ${u.apellido || ''}`.trim() : '')
    || c.nombre
    || 'Cuidador Registrado';

  return {
    id: c.id || `cuid-${Date.now()}`,
    codigo_cuidador: codigo,
    id_usuario: c.id_usuario || u.id || '',
    nombre_completo: nombreCompleto,
    email: c.email || u.email || `${sufijo}@pawpatitacusco.pe`,
    telefono: c.telefono || u.telefono || '+51 984 311 000',
    tipo_documento: c.tipo_documento || u.tipo_documento || 'DNI',
    num_documento: c.num_documento || u.num_documento || '71029384',
    distrito_cusco: c.distrito_cusco || u.distrito_cusco || 'Cusco Centro',
    direccion: c.direccion || u.direccion || 'Cusco, Perú',
    anios_experiencia: Number(c.anios_experiencia ?? 2),
    tipo_vivienda: c.tipo_vivienda || 'Casa familiar pet-friendly',
    capacidad_max_mascotas: Number(c.capacidad_max_mascotas || 3),
    especialidades: Array.isArray(c.especialidades) ? c.especialidades : ['Custodia Familiar'],
    cuenta_cobro_tipo: c.cuenta_cobro_tipo || 'Yape',
    cuenta_cobro_numero: c.cuenta_cobro_numero || '984311111',
    reputacion_promedio: Number(c.reputacion_promedio || 5.0).toFixed(2),
    total_resenas: Number(c.total_resenas || 0),
    estado_postulacion: (c.estado_postulacion || 'pendiente').toLowerCase(),
    estado_cuenta: (c.estado_cuenta || u.estado_cuenta || (c.estado_postulacion === 'aprobado' ? 'activo' : 'pendiente')).toLowerCase(),
    motivo_estado: c.motivo_estado || ant.observaciones_admin || 'Verificación documental en curso.',
    foto_url: sanitizeDocRef(c.foto_url) || getFallbackSvgDataUri('avatar'),
    foto_hogar_url: sanitizeDocRef(c.foto_hogar_url),
    doc_identidad_url: sanitizeDocRef(c.doc_identidad_url || ant.doc_identidad_url),
    doc_antecedentes_policiales_url: sanitizeDocRef(c.doc_antecedentes_policiales_url || ant.doc_antecedentes_policiales_url),
    doc_antecedentes_penales_url: sanitizeDocRef(c.doc_antecedentes_penales_url || ant.doc_antecedentes_penales_url),
    doc_domicilio_url: sanitizeDocRef(c.doc_domicilio_url || ant.doc_domicilio_url),
    declaracion_jurada: c.declaracion_jurada ?? ant.declaracion_jurada ?? true,
    created_at: c.created_at || new Date().toISOString()
  };
}

function normalizarClinicaAdmin(cl) {
  const estado = (cl.estado_afiliacion || (cl.activa ? 'activa' : 'pendiente')).toLowerCase();
  return {
    id: cl.id || `40000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
    codigo_clinica: cl.codigo_clinica || 'VET-006',
    ruc: cl.ruc || '20601234599',
    nombre: cl.nombre || 'Clínica Veterinaria Cusco',
    email_institucional: cl.email_institucional || 'contacto@vetcusco.pe',
    direccion: cl.direccion || 'Av. de la Cultura, Cusco',
    distrito_cusco: cl.distrito_cusco || 'Cusco Centro',
    telefono_emergencia: cl.telefono_emergencia || '+51 984 700 000',
    horario_atencion: cl.horario_atencion || '24 Horas',
    especialidades: Array.isArray(cl.especialidades) ? cl.especialidades : ['Emergencias 24h', 'Medicina General'],
    tarifa_consulta_emergencia: Number(cl.tarifa_consulta_emergencia || 60),
    colegiatura_cmvp: cl.colegiatura_cmvp || 'CMVP-CUSCO-5000',
    director_medico: cl.director_medico || 'Médico Veterinario Colegiado CMVP',
    foto_fachada_url: sanitizeDocRef(cl.foto_fachada_url) || getFallbackSvgDataUri('clinica'),
    constancia_url: sanitizeDocRef(cl.constancia_url),
    estado_afiliacion: estado,
    motivo_estado: cl.motivo_estado || 'Afiliación registrada en Red Aliada Cusco.',
    activa: estado === 'activa',
    sos_atendidos: Number(cl.sos_atendidos ?? 0)
  };
}

function normalizarCancelacionAdmin(ca) {
  const r = ca.reservas || {};
  const u = ca.perfiles_usuarios || {};
  const montoBruto = Number(ca.monto_bruto_reserva ?? r.monto_total ?? 160);
  const pctReembolso = Number(ca.porcentaje_reembolso ?? 50);
  const montoReembolso = Number(ca.monto_reembolso ?? ((montoBruto * pctReembolso) / 100).toFixed(2));
  const remanente = Number((montoBruto - montoReembolso).toFixed(2));
  const penalidadPlat = Number(ca.monto_penalidad_plataforma ?? (remanente * 0.15).toFixed(2));
  const compensacionCuid = Number(ca.monto_compensacion_cuidador ?? (remanente - penalidadPlat).toFixed(2));

  return {
    id: ca.id || `can-${Date.now()}`,
    codigo_cancelacion: ca.codigo_cancelacion || 'CAN-2026-0100',
    id_reserva: ca.id_reserva || r.id || '',
    codigo_reserva: ca.codigo_reserva || r.codigo_reserva || 'RES-2026-0108',
    solicitante_nombre: ca.solicitante_nombre
      || (u.nombre ? `${u.nombre} ${u.apellido || ''}`.trim() : 'Martin Dupont'),
    solicitante_rol: ca.solicitante_rol || u.rol || 'propietario',
    cuidador_nombre: ca.cuidador_nombre || 'Andrés Zevallos Kalinowski (CUID-006)',
    cuidador_distrito: ca.cuidador_distrito || 'San Blas',
    mascota_nombre: ca.mascota_nombre || 'Chaska (PAW-1003)',
    tipo_caso: (ca.tipo_caso || 'disputa').toLowerCase(),
    horas_anticipacion: Number(ca.horas_anticipacion ?? 0),
    regla_aplicada: ca.regla_aplicada || 'Política Escalonada de Cancelación / Arbitraje v5.0',
    motivo: ca.motivo || 'Solicitud de revisión administrativa.',
    monto_bruto_reserva: montoBruto,
    porcentaje_reembolso: pctReembolso,
    monto_reembolso: montoReembolso,
    monto_penalidad_plataforma: penalidadPlat,
    monto_compensacion_cuidador: compensacionCuid,
    estado_tramite: (ca.estado_tramite || 'pendiente_revision').toLowerCase(),
    resolucion_admin: ca.resolucion_admin || null,
    created_at: ca.created_at || new Date().toISOString(),
    fecha_resolucion: ca.fecha_resolucion || null
  };
}

function normalizarLiquidacionAdmin(l) {
  const base = normalizarLiquidacion(l);
  const cuidInfo = adminState.cuidadores.find((c) => c.id === base.id_cuidador) || {};
  return {
    ...base,
    cuidador_codigo: l.cuidador_codigo || l.perfiles_cuidadores?.codigo_cuidador || cuidInfo.codigo_cuidador || 'CUID-001',
    cuidador_nombre: l.cuidador_nombre || cuidInfo.nombre_completo || 'Valeria Huamán Delgado',
    cuidador_distrito: l.cuidador_distrito || cuidInfo.distrito_cusco || 'Wanchaq'
  };
}

/* ==========================================================================
   CARGA Y CONCILIACIÓN DE DATOS DEL PANEL ADMINISTRADOR
   ========================================================================== */

function getLocalCollection(key, seed, normalizer = (x) => x) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizer);
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed.map(normalizer);
}

/**
 * Fusiona las liquidaciones globales del Admin con las de la Billetera del Cuidador (`paw_demo_liquidaciones_cuidador_v5`)
 * para que cualquier solicitud de retiro del cuidador o pago del Admin se refleje en ambos paneles en tiempo real.
 */
function cargarLiquidacionesSincronizadasAdmin() {
  const adminList = getLocalCollection(STORAGE_KEY_LIQUIDACIONES_ADMIN, LIQUIDACIONES_ADMIN_SEED, normalizarLiquidacionAdmin);
  const cuidList = getLocalLiquidacionesCuidador();

  const mapa = new Map();
  adminList.forEach((item) => mapa.set(item.codigo_liquidacion, item));
  cuidList.forEach((item) => {
    const prev = mapa.get(item.codigo_liquidacion) || {};
    mapa.set(item.codigo_liquidacion, normalizarLiquidacionAdmin({ ...prev, ...item }));
  });

  const unificadas = Array.from(mapa.values());
  localStorage.setItem(STORAGE_KEY_LIQUIDACIONES_ADMIN, JSON.stringify(unificadas));
  return unificadas;
}

function guardarLiquidacionesSincronizadasAdmin(listaAdmin) {
  localStorage.setItem(STORAGE_KEY_LIQUIDACIONES_ADMIN, JSON.stringify(listaAdmin));

  // Sincronizar las que pertenecen a Valeria (CUID-001) en la billetera del cuidador
  const cuidActuales = getLocalLiquidacionesCuidador();
  const mapaAdmin = new Map(listaAdmin.map((l) => [l.codigo_liquidacion, l]));
  const nuevasCuid = cuidActuales.map((item) => {
    const match = mapaAdmin.get(item.codigo_liquidacion);
    return match ? normalizarLiquidacion({ ...item, ...match }) : item;
  });
  saveLocalLiquidacionesCuidador(nuevasCuid);
}

/**
 * Calcula las métricas del Dashboard Administrativo conciliando al céntimo la comisión real del 15%
 * y las series por distrito específico de Cusco (compatible con `rpc_admin_dashboard_metrics`).
 */
function calcularMetricasConciliadasCusco(rpcData = null) {
  const cuidadores = adminState.cuidadores;
  const clinicas = adminState.clinicas;
  const liquidaciones = adminState.liquidaciones;
  const cancelaciones = adminState.cancelaciones;
  const alertasSos = adminState.alertasSos;

  // Series por distrito específico de Cusco (8 distritos reales, jamás colapsados en 'Cusco')
  const baseDistritos = [
    { distrito: 'Wanchaq', reservas_base: 3, brutos_base: 405.00 },
    { distrito: 'San Jerónimo', reservas_base: 1, brutos_base: 210.00 },
    { distrito: 'San Blas', reservas_base: 1, brutos_base: 160.00 },
    { distrito: 'Cusco Centro', reservas_base: 1, brutos_base: 150.00 },
    { distrito: 'Santiago', reservas_base: 1, brutos_base: 110.00 },
    { distrito: 'San Sebastián', reservas_base: 1, brutos_base: 90.00 },
    { distrito: 'Saylla', reservas_base: 0, brutos_base: 0.00 },
    { distrito: 'Poroy', reservas_base: 0, brutos_base: 0.00 }
  ];

  const seriesDistritos = (rpcData?.series_distritos_cusco && rpcData.series_distritos_cusco.length > 0)
    ? rpcData.series_distritos_cusco
    : baseDistritos.map((d) => {
        const cuidCount = cuidadores.filter(
          (c) => c.distrito_cusco === d.distrito && c.estado_postulacion === 'aprobado'
        ).length;
        const com15 = Number((d.brutos_base * 0.15).toFixed(2));
        const neto85 = Number((d.brutos_base - com15).toFixed(2));
        return {
          distrito: d.distrito,
          total_cuidadores: cuidCount,
          total_reservas: d.reservas_base,
          ingresos_brutos: d.brutos_base,
          comision_15: com15,
          neto_cuidadores_85: neto85
        };
      });

  const seriesCategorias = (rpcData?.series_categorias_servicio && rpcData.series_categorias_servicio.length > 0)
    ? rpcData.series_categorias_servicio
    : [
        { categoria: 'Hospedaje', total_reservas: 4, ingresos_brutos: 645.00, comision_15: 96.75 },
        { categoria: 'Domicilio Turístico', total_reservas: 2, ingresos_brutos: 310.00, comision_15: 46.50 },
        { categoria: 'Guardería', total_reservas: 2, ingresos_brutos: 170.00, comision_15: 25.50 },
        { categoria: 'Paseo', total_reservas: 1, ingresos_brutos: 70.00, comision_15: 10.50 }
      ];

  const seriesEstadosReserva = (rpcData?.series_estados_reserva && rpcData.series_estados_reserva.length > 0)
    ? rpcData.series_estados_reserva
    : [
        { estado: 'finalizada', cantidad: 4 },
        { estado: 'en_curso', cantidad: 1 },
        { estado: 'confirmada', cantidad: 1 },
        { estado: 'pendiente_confirmacion', cantidad: 1 },
        { estado: 'en_disputa', cantidad: cancelaciones.filter((c) => c.tipo_caso === 'disputa' && c.estado_tramite === 'pendiente_revision').length || 1 }
      ];

  // Totales financieros exactos (15% comisión plataforma / 85% neto cuidadores)
  const ingresosBrutos = Number(
    rpcData?.kpis?.ingresos_brutos
    ?? seriesDistritos.reduce((acc, d) => acc + Number(d.ingresos_brutos || 0), 0).toFixed(2)
  );
  const comision15 = Number(
    rpcData?.kpis?.comision_plataforma_15
    ?? Number((ingresosBrutos * 0.15).toFixed(2))
  );
  const netoCuidadores85 = Number(
    rpcData?.kpis?.neto_cuidadores_85
    ?? Number((ingresosBrutos - comision15).toFixed(2))
  );
  const reembolsosProcesados = Number(
    rpcData?.kpis?.reembolsos_procesados
    ?? cancelaciones
      .filter((c) => c.estado_tramite === 'procesado')
      .reduce((acc, c) => acc + Number(c.monto_reembolso || 0), 0)
      .toFixed(2)
  );

  // Saldos en vivo desde liquidaciones_cuidadores
  const sumLiq = (est) => Number(
    liquidaciones
      .filter((l) => l.estado_liquidacion === est)
      .reduce((acc, l) => acc + Number(l.monto_liquidado || 0), 0)
      .toFixed(2)
  );

  const cuidadoresAprobados = cuidadores.filter((c) => c.estado_postulacion === 'aprobado').length;
  const cuidadoresPendientes = cuidadores.filter((c) => c.estado_postulacion === 'pendiente').length;
  const clinicasActivas = clinicas.filter((c) => c.estado_afiliacion === 'activa').length;
  const clinicasPendientes = clinicas.filter((c) => c.estado_afiliacion === 'pendiente').length;
  const sosActivos = alertasSos.filter((s) => s.estado_sos !== 'resuelta').length;
  const disputasPendientes = cancelaciones.filter((c) => c.estado_tramite === 'pendiente_revision').length;

  return {
    kpis: {
      ingresos_brutos: ingresosBrutos,
      comision_plataforma_15: comision15,
      neto_cuidadores_85: netoCuidadores85,
      reembolsos_procesados: reembolsosProcesados,
      fondos_en_garantia: sumLiq('en_garantia'),
      fondos_disponibles_retiro: sumLiq('disponible'),
      fondos_solicitados_por_pagar: sumLiq('solicitado'),
      fondos_historico_pagados: sumLiq('pagado'),
      total_reservas: seriesDistritos.reduce((acc, d) => acc + Number(d.total_reservas || 0), 0),
      cuidadores_aprobados: cuidadoresAprobados,
      cuidadores_pendientes: cuidadoresPendientes,
      clinicas_activas: clinicasActivas,
      clinicas_pendientes: clinicasPendientes,
      postulantes_pendientes_total: cuidadoresPendientes + clinicasPendientes,
      sos_activos: sosActivos,
      disputas_pendientes: disputasPendientes
    },
    series_distritos_cusco: seriesDistritos,
    series_categorias_servicio: seriesCategorias,
    series_estados_reserva: seriesEstadosReserva
  };
}

/**
 * Carga todos los datos del Panel Maestro de Administración desde Supabase o almacenamiento local sincronizado
 */
async function cargarDatosPanelAdministrador() {
  adminState.cuidadores = getLocalCollection(STORAGE_KEY_CUIDADORES_ADMIN, CUIDADORES_ADMIN_SEED, normalizarCuidadorAdmin);
  adminState.clinicas = getLocalCollection(STORAGE_KEY_CLINICAS_ADMIN, CLINICAS_ADMIN_SEED, normalizarClinicaAdmin);
  adminState.cancelaciones = getLocalCollection(STORAGE_KEY_CANCELACIONES_ADMIN, CANCELACIONES_ADMIN_SEED, normalizarCancelacionAdmin);
  adminState.liquidaciones = cargarLiquidacionesSincronizadasAdmin();
  adminState.alertasSos = getLocalCollection(STORAGE_KEY_SOS, SOS_SEED_OWNER);

  try {
    const rawGob = localStorage.getItem(STORAGE_KEY_CONFIG_ADMIN);
    const parsedGob = rawGob ? JSON.parse(rawGob) : JSON.parse(JSON.stringify(CONFIG_GOBERNANZA_SEED));
    adminState.gobernanza = {
      parametros: { ...CONFIG_GOBERNANZA_SEED.parametros, ...(parsedGob?.parametros || {}) },
      temporadas: Array.isArray(parsedGob?.temporadas) && parsedGob.temporadas.length > 0
        ? parsedGob.temporadas.map(normalizarTemporadaAdmin)
        : CONFIG_GOBERNANZA_SEED.temporadas.map(normalizarTemporadaAdmin),
      terminos: CONFIG_GOBERNANZA_SEED.terminos
    };
  } catch (_) {
    adminState.gobernanza = {
      parametros: { ...CONFIG_GOBERNANZA_SEED.parametros },
      temporadas: CONFIG_GOBERNANZA_SEED.temporadas.map(normalizarTemporadaAdmin),
      terminos: CONFIG_GOBERNANZA_SEED.terminos
    };
  }

  adminState.auditoria = getLocalCollection(STORAGE_KEY_AUDITORIA, AUDITORIA_ADMIN_SEED);

  const supabase = getSupabase();
  let rpcMetrics = null;

  if (supabase && isSupabaseConfigured()) {
    try {
      const [resMetrics, resCuid, resClin, resCanc, resLiq, resSos, resAud, resConf, resTemp] = await Promise.all([
        supabase.rpc('rpc_admin_dashboard_metrics'),
        supabase.from('perfiles_cuidadores').select('*, perfiles_usuarios!perfiles_cuidadores_id_usuario_fkey(*), antecedentes_cuidadores(*)').order('created_at', { ascending: false }),
        supabase.from('clinicas_veterinarias').select('*').order('created_at', { ascending: false }),
        supabase.from('cancelaciones_reembolsos').select('*, reservas(codigo_reserva, monto_total), perfiles_usuarios!cancelaciones_reembolsos_solicitado_por_fkey(nombre, apellido, rol)').order('created_at', { ascending: false }),
        supabase.from('liquidaciones_cuidadores').select('*, reservas(codigo_reserva, monto_total, mascotas(nombre, paw_id)), perfiles_cuidadores(codigo_cuidador)').order('created_at', { ascending: false }),
        supabase.from('incidencias_emergencias').select('*, mascotas(nombre, paw_id), clinicas_veterinarias(nombre, telefono_emergencia, direccion), reservas(codigo_reserva)').order('fecha_incidencia', { ascending: false }),
        supabase.from('auditoria_estados').select('*').order('created_at', { ascending: false }).limit(150),
        supabase.from('configuracion_plataforma').select('clave, valor_numerico, valor_texto, valor_booleano, descripcion'),
        supabase.from('temporadas_tarifas').select('*').order('mes_dia_inicio', { ascending: true })
      ]);

      if (!resMetrics.error && resMetrics.data) {
        rpcMetrics = resMetrics.data;
      }
      if (!resCuid.error && Array.isArray(resCuid.data)) {
        adminState.cuidadores = resCuid.data.map(normalizarCuidadorAdmin);
      }
      if (!resClin.error && Array.isArray(resClin.data)) {
        adminState.clinicas = resClin.data.map(normalizarClinicaAdmin);
      }
      if (!resCanc.error && Array.isArray(resCanc.data)) {
        adminState.cancelaciones = resCanc.data.map(normalizarCancelacionAdmin);
      }
      if (!resLiq.error && Array.isArray(resLiq.data)) {
        adminState.liquidaciones = resLiq.data.map(normalizarLiquidacionAdmin);
      }
      if (!resSos.error && Array.isArray(resSos.data)) {
        adminState.alertasSos = resSos.data.map((s) => normalizarIncidenciaSos({
          ...s,
          mascota_nombre: s.mascota_nombre || s.mascotas?.nombre || 'Mascota',
          mascota_paw_id: s.mascota_paw_id || s.mascotas?.paw_id || 'PAW-ID',
          codigo_reserva: s.codigo_reserva || s.reservas?.codigo_reserva || 'SIN-RES',
          clinica_nombre: s.clinica_nombre || s.clinicas_veterinarias?.nombre || 'Clínica Aliada Cusco',
          clinica_telefono: s.clinica_telefono || s.clinicas_veterinarias?.telefono_emergencia || '+51 984 711 222',
          clinica_direccion: s.clinica_direccion || s.clinicas_veterinarias?.direccion || 'Cusco'
        }));
      }
      if (!resAud.error && Array.isArray(resAud.data)) {
        adminState.auditoria = resAud.data;
      }
      if (!resConf.error && Array.isArray(resConf.data) && resConf.data.length > 0) {
        const params = { ...adminState.gobernanza.parametros };
        resConf.data.forEach((row) => {
          if (row.clave === 'comision_plataforma_pct' && row.valor_numerico !== null) {
            const num = Number(row.valor_numerico);
            params.comision_plataforma_pct = num <= 1 ? Number((num * 100).toFixed(2)) : num;
          } else if (row.clave === 'tipo_cambio_usd' && row.valor_numerico !== null) {
            params.tipo_cambio_usd = Number(row.valor_numerico);
          } else if (row.clave === 'tarifa_bano_extra' && row.valor_numerico !== null) {
            params.tarifa_bano_extra = Number(row.valor_numerico);
          } else if (row.clave === 'yape_oficial' && row.valor_texto) {
            params.yape_oficial = row.valor_texto;
          } else if (row.clave === 'soporte_whatsapp' && row.valor_texto) {
            params.soporte_whatsapp = row.valor_texto;
          }
        });
        adminState.gobernanza.parametros = params;
      }
      if (!resTemp.error && Array.isArray(resTemp.data) && resTemp.data.length > 0) {
        adminState.gobernanza.temporadas = resTemp.data.map(normalizarTemporadaAdmin);
      }
    } catch (err) {
      console.warn('Error consultando datos administrativos remotos:', err);
    }
  }

  adminState.rawRpcMetrics = rpcMetrics;
  adminState.metricasRpc = calcularMetricasConciliadasCusco(rpcMetrics);
}

/**
 * Entrypoint principal montado por `js/router.js` en la ruta `#/admin`
 */
export async function renderPanelAdministrador(container, profile) {
  if (!container) return;
  adminState.profile = profile || {
    id: '50000000-0000-0000-0000-000000000001',
    nombre: 'Rodrigo Quispe Monzón',
    email: 'admin@pawpatitacusco.pe',
    rol: 'administrador',
    distrito_cusco: 'Cusco Centro'
  };

  showSpinner('Cargando Centro de Comando Administrativo y Analítica Cusco...');
  try {
    await cargarDatosPanelAdministrador();
    renderContenidoPanelAdministrador(container);
    subscribeRealtime('canal-admin-auditoria-live', 'auditoria_estados', '*', async () => {
      if (!adminState.profile || adminState.profile.rol !== 'administrador') return;
      await cargarDatosPanelAdministrador();
      if (!adminState.profile) return;
      renderContenidoPanelAdministrador(container);
    });
    subscribeRealtime('canal-admin-sos-live', 'incidencias_emergencias', '*', async () => {
      if (!adminState.profile || adminState.profile.rol !== 'administrador') return;
      await cargarDatosPanelAdministrador();
      if (!adminState.profile) return;
      renderContenidoPanelAdministrador(container);
    });
  } catch (err) {
    handleSupabaseError(err, 'No se pudo cargar el Panel de Administración.');
  } finally {
    hideSpinner();
  }
}

/**
 * Renderiza el Shell del Panel Maestro de Administración (Sidebar + Hero + KPIs + Workspace)
 */
function renderContenidoPanelAdministrador(container) {
  if (!container) return;
  destroyAdminCharts();

  adminState.metricasRpc = calcularMetricasConciliadasCusco(adminState.rawRpcMetrics);
  const k = adminState.metricasRpc.kpis;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const adminNombre = adminState.profile?.nombre
    ? `${adminState.profile.nombre} ${adminState.profile.apellido || ''}`.trim()
    : 'Rodrigo Quispe Monzón';

  const retirosSolicitadosCount = adminState.liquidaciones.filter((l) => l.estado_liquidacion === 'solicitado').length;

  container.innerHTML = `
    <div class="container">
      <div class="panel-dashboard-shell">
        <!-- SIDEBAR EJECUTIVO DE ADMINISTRACIÓN DE RED -->
        <aside class="panel-sidebar">
          <div class="panel-sidebar-profile">
            <div class="d-flex align-items-center gap-3 mb-2">
              <div class="panel-avatar-circle">
                <i class="bi bi-shield-lock-fill fs-4"></i>
              </div>
              <div class="min-w-0">
                <span class="badge bg-warning text-dark fw-bold mb-1">GOBERNANZA RED CUSCO</span>
                <h6 class="fw-bold text-white mb-0 panel-user-name">${escapeHtml(adminNombre)}</h6>
                <div class="small text-white-50 panel-user-email">${escapeHtml(adminState.profile?.email || 'admin@pawpatitacusco.pe')}</div>
              </div>
            </div>
            <div class="d-flex justify-content-between align-items-center small pt-2 border-top border-secondary">
              <span class="text-white-50">Comisión Oficial:</span>
              <span class="badge bg-success">15% Plataforma / 85% Cuidador</span>
            </div>
          </div>

          <button type="button" class="panel-mobile-toggle" id="btn-toggle-panel-menu-admin" aria-expanded="false" aria-controls="panel-nav-menu-admin">
            <span><i class="bi bi-list-nested me-2 text-warning"></i>Menú de Administración</span>
            <i class="bi bi-chevron-down toggle-chevron"></i>
          </button>

          <nav class="panel-nav-menu" id="panel-nav-menu-admin" aria-label="Menú Administrador de Red">
            <button type="button" class="panel-nav-btn ${adminState.activeTab === 'dashboard' ? 'active' : ''}" data-admin-tab="dashboard">
              <span class="nav-icon-wrap">
                <i class="bi bi-bar-chart-line-fill"></i>
                <span>1. Panel Ejecutivo</span>
              </span>
              <span class="badge bg-warning text-dark rounded-pill">15%</span>
            </button>

            <button type="button" class="panel-nav-btn ${adminState.activeTab === 'afiliados' ? 'active' : ''}" data-admin-tab="afiliados">
              <span class="nav-icon-wrap">
                <i class="bi bi-people-fill"></i>
                <span>2. Cuidadores & Clínicas</span>
              </span>
              ${k.postulantes_pendientes_total > 0 ? `<span class="badge bg-danger rounded-pill">${k.postulantes_pendientes_total}</span>` : ''}
            </button>

            <button type="button" class="panel-nav-btn ${adminState.activeTab === 'cancelaciones' ? 'active' : ''}" data-admin-tab="cancelaciones">
              <span class="nav-icon-wrap">
                <i class="bi bi-scales"></i>
                <span>3. Reembolsos & Disputas</span>
              </span>
              ${k.disputas_pendientes > 0 ? `<span class="badge bg-warning text-dark rounded-pill">${k.disputas_pendientes}</span>` : ''}
            </button>

            <button type="button" class="panel-nav-btn ${adminState.activeTab === 'liquidaciones' ? 'active' : ''}" data-admin-tab="liquidaciones">
              <span class="nav-icon-wrap">
                <i class="bi bi-bank2"></i>
                <span>4. Liquidaciones (85%)</span>
              </span>
              ${retirosSolicitadosCount > 0 ? `<span class="badge bg-primary rounded-pill">${retirosSolicitadosCount}</span>` : ''}
            </button>

            <button type="button" class="panel-nav-btn nav-btn-sos ${adminState.activeTab === 'sos-config' ? 'active' : ''}" data-admin-tab="sos-config">
              <span class="nav-icon-wrap">
                <i class="bi bi-sliders"></i>
                <span>5. Central S.O.S. & Config</span>
              </span>
              ${k.sos_activos > 0 ? `<span class="badge bg-danger rounded-pill">${k.sos_activos}</span>` : ''}
            </button>

            <button type="button" class="panel-nav-btn ${adminState.activeTab === 'auditoria' ? 'active' : ''}" data-admin-tab="auditoria">
              <span class="nav-icon-wrap">
                <i class="bi bi-journal-check"></i>
                <span>6. Bitácora de Auditoría</span>
              </span>
              <span class="badge bg-dark rounded-pill">${adminState.auditoria.length}</span>
            </button>

            <hr class="my-1">

            <button type="button" class="panel-nav-btn" data-help-role="administrador">
              <span class="nav-icon-wrap">
                <i class="bi bi-question-circle-fill text-warning"></i>
                <span>Centro de Ayuda & FAQ</span>
              </span>
            </button>
          </nav>
        </aside>

        <!-- ÁREA PRINCIPAL DEL ADMINISTRADOR -->
        <section class="panel-main-area">
          <!-- HERO BANNER EJECUTIVO -->
          <div class="panel-hero-banner">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span class="badge bg-dark">CENTRO DE COMANDO Y ANALÍTICA v5.2</span>
                  <span class="badge bg-warning text-dark"><i class="bi bi-calculator-fill me-1"></i>Comisión 15% Conciliada</span>
                  <span class="badge bg-success"><i class="bi bi-geo-alt-fill me-1"></i>8 Distritos Cusco</span>
                </div>
                <h3 class="fw-bold text-dark mb-1">Panel Maestro de Administración — Paw Patita Cusco</h3>
                <p class="text-secondary small mb-0">
                  Supervisión financiera en tiempo real, acreditación de cuidadores y clínicas aliadas, arbitraje de disputas y registro de actividad inmutable.
                </p>
              </div>

              <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-paw btn-sm fw-bold" id="btn-admin-nueva-clinica-top">
                  <i class="bi bi-hospital-fill me-1"></i>+ Registrar Clínica Directa
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-admin-sync-top">
                  <i class="bi bi-arrow-clockwise me-1"></i>Recalcular KPIs
                </button>
              </div>
            </div>
          </div>

          <!-- 6 TARJETAS KPI EJECUTIVAS -->
          <div class="row g-3 mb-4">
            <div class="col-md-6 col-xl-4">
              <div class="kpi-card-paw h-100">
                <div class="kpi-icon-box kpi-andino"><i class="bi bi-cash-stack"></i></div>
                <div>
                  <div class="kpi-label">1. Ingresos Brutos (100%)</div>
                  <div class="kpi-value">${formatMoneda(k.ingresos_brutos, moneda)}</div>
                  <div class="small text-muted">${k.total_reservas} reservas procesadas en Cusco</div>
                </div>
              </div>
            </div>

            <div class="col-md-6 col-xl-4">
              <div class="kpi-card-paw h-100" style="border-left: 4px solid var(--pp-primary); background: #FFFAF7;">
                <div class="kpi-icon-box kpi-terracota"><i class="bi bi-percent"></i></div>
                <div>
                  <div class="kpi-label text-primary">2. Comisión Real Plataforma (15%)</div>
                  <div class="kpi-value text-primary">${formatMoneda(k.comision_plataforma_15, moneda)}</div>
                  <div class="small text-success fw-semibold">
                    <i class="bi bi-check-circle-fill me-1"></i>Conciliado al 15% exacto
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6 col-xl-4">
              <div class="kpi-card-paw h-100">
                <div class="kpi-icon-box kpi-turquesa"><i class="bi bi-wallet2"></i></div>
                <div>
                  <div class="kpi-label">3. Neto para Cuidadores (85%)</div>
                  <div class="kpi-value text-success">${formatMoneda(k.neto_cuidadores_85, moneda)}</div>
                  <div class="small text-muted">
                    Pagado: ${formatMoneda(k.fondos_historico_pagados, moneda)} • Por pagar: ${formatMoneda(k.fondos_solicitados_por_pagar, moneda)}
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6 col-xl-4">
              <div class="kpi-card-paw h-100">
                <div class="kpi-icon-box kpi-oro"><i class="bi bi-arrow-counterclockwise"></i></div>
                <div>
                  <div class="kpi-label">4. Reembolsos & Disputas</div>
                  <div class="kpi-value">${formatMoneda(k.reembolsos_procesados, moneda)}</div>
                  <div class="small text-muted">${k.disputas_pendientes} caso(s) pendientes de arbitraje</div>
                </div>
              </div>
            </div>

            <div class="col-md-6 col-xl-4">
              <div class="kpi-card-paw h-100">
                <div class="kpi-icon-box kpi-andino"><i class="bi bi-person-check-fill"></i></div>
                <div>
                  <div class="kpi-label">5. Postulantes Pendientes</div>
                  <div class="kpi-value">${k.postulantes_pendientes_total}</div>
                  <div class="small text-muted">
                    ${k.cuidadores_pendientes} cuidador(es) • ${k.clinicas_pendientes} clínica(s) vet
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6 col-xl-4">
              <div class="kpi-card-paw h-100">
                <div class="kpi-icon-box kpi-rojo"><i class="bi bi-heart-pulse-fill"></i></div>
                <div>
                  <div class="kpi-label">6. Alertas S.O.S. Activas</div>
                  <div class="kpi-value text-danger">${k.sos_activos}</div>
                  <div class="small text-muted">${k.clinicas_activas} clínicas aliadas activas en Cusco</div>
                </div>
              </div>
            </div>
          </div>

          <!-- CONTENEDOR DINÁMICO DE LA SECCIÓN ACTIVA -->
          <div id="admin-tab-workspace"></div>
        </section>
      </div>
    </div>
  `;

  // Listeners de navegación del sidebar
  const toggleBtn = container.querySelector('#btn-toggle-panel-menu-admin');
  const navMenu = container.querySelector('#panel-nav-menu-admin');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      const isShown = navMenu.classList.toggle('show');
      toggleBtn.setAttribute('aria-expanded', isShown ? 'true' : 'false');
    });
  }

  container.querySelectorAll('[data-admin-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      adminState.activeTab = btn.getAttribute('data-admin-tab');
      renderContenidoPanelAdministrador(container);
    });
  });

  // Botón superior Registrar Nueva Clínica Directa
  container.querySelector('#btn-admin-nueva-clinica-top')?.addEventListener('click', () => {
    abrirModalCrearClinicaDirecta(() => {
      adminState.activeTab = 'afiliados';
      adminState.subTabAfiliados = 'clinicas';
      renderContenidoPanelAdministrador(container);
    });
  });

  // Botón superior Recalcular KPIs
  container.querySelector('#btn-admin-sync-top')?.addEventListener('click', async () => {
    showSpinner('Actualizando métricas financieras en tiempo real...');
    try {
      await cargarDatosPanelAdministrador();
      renderContenidoPanelAdministrador(container);
      showToast('KPIs y series analíticas de Cusco actualizados.', 'success');
    } finally {
      hideSpinner();
    }
  });

  const workspace = container.querySelector('#admin-tab-workspace');
  switch (adminState.activeTab) {
    case 'dashboard':
      renderSeccionDashboardEjecutivo(workspace, container);
      break;
    case 'afiliados':
      renderSeccionCuidadoresYClinicas(workspace, container);
      break;
    case 'cancelaciones':
      renderSeccionCancelacionesYDisputas(workspace, container);
      break;
    case 'liquidaciones':
      renderSeccionLiquidacionesCuidadores(workspace, container);
      break;
    case 'sos-config':
      renderSeccionCentralSosYGobernanza(workspace, container);
      break;
    case 'auditoria':
      renderSeccionBitacoraAuditoria(workspace, container);
      break;
    default:
      renderSeccionDashboardEjecutivo(workspace, container);
      break;
  }
}

/* ==========================================================================
   SECCIÓN 1: DASHBOARD EJECUTIVO Y GRÁFICOS CHART.JS (`chart-dashboard.js`)
   ========================================================================== */

function renderSeccionDashboardEjecutivo(workspace, rootContainer) {
  if (!workspace) return;
  const m = adminState.metricasRpc;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const tc = adminState.gobernanza?.parametros?.tipo_cambio_usd || CUSCO_CONFIG.DEFAULT_TIPO_CAMBIO;

  workspace.innerHTML = `
    <!-- Fila Principal de Gráficos Chart.js -->
    <div class="row g-4 mb-4">
      <!-- Gráfico de Barras por Distritos Específicos de Cusco -->
      <div class="col-lg-8">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <span class="badge bg-warning text-dark fw-bold mb-1">DESGLOSE GEOGRÁFICO CUSCO (8 DISTRITOS)</span>
              <h6 class="fw-bold mb-0">
                <i class="bi bi-bar-chart-fill text-warning me-2"></i>Distribución por Distritos Específicos de Cusco
              </h6>
            </div>
            <div class="btn-group btn-group-sm" role="group" aria-label="Modo Gráfico Distritos">
              <button type="button" class="btn ${adminState.modoChartDistritos === 'finanzas' ? 'btn-paw' : 'btn-outline-secondary'}" data-chart-modo="finanzas">
                Ingresos & Comisión 15%
              </button>
              <button type="button" class="btn ${adminState.modoChartDistritos === 'operaciones' ? 'btn-paw' : 'btn-outline-secondary'}" data-chart-modo="operaciones">
                Reservas & Cuidadores
              </button>
            </div>
          </div>

          <div style="height: 300px; position: relative;">
            <canvas id="admin-chart-distritos-cusco"></canvas>
          </div>
        </div>
      </div>

      <!-- Gráfico Doughnut por Categoría de Servicio -->
      <div class="col-lg-4">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="mb-3">
            <span class="badge bg-info-subtle text-primary fw-bold mb-1">MIX DE SERVICIOS</span>
            <h6 class="fw-bold mb-0">
              <i class="bi bi-pie-chart-fill text-primary me-2"></i>Reservas por Categoría de Servicio
            </h6>
          </div>

          <div style="height: 255px; position: relative;">
            <canvas id="admin-chart-categorias-servicio"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Segunda Fila: Tabla Comparativa por Distrito + Gráfico de Estados de Reserva -->
    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0">
              <i class="bi bi-table text-warning me-2"></i>Matriz Financiera por Distrito de Cusco (100% / 15% / 85%)
            </h6>
            <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-exportar-distritos-csv">
              <i class="bi bi-download me-1"></i>Exportar CSV
            </button>
          </div>
          ${renderTablaDesgloseDistritosCusco(m.series_distritos_cusco, moneda)}
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="mb-3">
            <span class="badge bg-success-subtle text-success fw-bold mb-1">PIPELINE TRANSACCIONAL</span>
            <h6 class="fw-bold mb-0">
              <i class="bi bi-funnel-fill text-success me-2"></i>Reservas por Estado Operativo
            </h6>
          </div>
          <div style="height: 230px; position: relative;">
            <canvas id="admin-chart-estados-reserva"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inicializar los 3 gráficos Chart.js
  const canvasDistritos = workspace.querySelector('#admin-chart-distritos-cusco');
  const canvasCategorias = workspace.querySelector('#admin-chart-categorias-servicio');
  const canvasEstados = workspace.querySelector('#admin-chart-estados-reserva');

  renderChartDistritosCusco(canvasDistritos, m.series_distritos_cusco, {
    modo: adminState.modoChartDistritos,
    moneda,
    tipoCambio: tc
  });
  renderChartCategoriasServicio(canvasCategorias, m.series_categorias_servicio, {
    moneda,
    tipoCambio: tc
  });
  renderChartEstadosReserva(canvasEstados, m.series_estados_reserva);

  // Conmutar modo del gráfico de barras por distritos
  workspace.querySelectorAll('[data-chart-modo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      adminState.modoChartDistritos = btn.getAttribute('data-chart-modo');
      renderSeccionDashboardEjecutivo(workspace, rootContainer);
    });
  });

  // Exportar CSV de distritos
  workspace.querySelector('#btn-exportar-distritos-csv')?.addEventListener('click', () => {
    exportarCsv(m.series_distritos_cusco, `metricas_distritos_cusco_${getHoyIso()}.csv`);
    showToast('Matriz financiera por distritos de Cusco exportada a CSV.', 'info');
  });
}

/* ==========================================================================
   SECCIÓN 2: GESTIÓN DE CUIDADORES Y CLÍNICAS VETERINARIAS
   ========================================================================== */

function renderBadgeEstadoAfiliado(estado) {
  const est = (estado || 'pendiente').toLowerCase();
  const map = {
    aprobado: { cls: 'bg-success text-white', icon: 'bi-patch-check-fill', txt: 'Aprobado / Activo' },
    activa: { cls: 'bg-success text-white', icon: 'bi-hospital-fill', txt: 'Afiliada Activa' },
    pendiente: { cls: 'bg-warning text-dark', icon: 'bi-hourglass-split', txt: 'Pendiente Revisión' },
    rechazado: { cls: 'bg-danger text-white', icon: 'bi-x-circle-fill', txt: 'Rechazado' },
    rechazada: { cls: 'bg-danger text-white', icon: 'bi-x-circle-fill', txt: 'Rechazada' },
    suspendido: { cls: 'bg-secondary text-white', icon: 'bi-slash-circle', txt: 'Suspendido' },
    suspendida: { cls: 'bg-secondary text-white', icon: 'bi-slash-circle', txt: 'Suspendida' }
  };
  const cfg = map[est] || map.pendiente;
  return `<span class="badge ${cfg.cls} px-2 py-1"><i class="bi ${cfg.icon} me-1"></i>${cfg.txt}</span>`;
}

function renderSeccionCuidadoresYClinicas(workspace, rootContainer) {
  if (!workspace) return;

  const cuidPendientes = adminState.cuidadores.filter((c) => c.estado_postulacion === 'pendiente').length;
  const clinPendientes = adminState.clinicas.filter((c) => c.estado_afiliacion === 'pendiente').length;

  workspace.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm">
      <!-- Sub-navegación entre Cuidadores y Clínicas Veterinarias -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div class="btn-group" role="group" aria-label="Sub-vista Afiliados">
          <button type="button" class="btn ${adminState.subTabAfiliados === 'cuidadores' ? 'btn-paw' : 'btn-outline-secondary'} fw-bold" data-sub-afiliado="cuidadores">
            <i class="bi bi-person-heart me-1"></i>Cuidadores Independientes (${adminState.cuidadores.length})
            ${cuidPendientes > 0 ? `<span class="badge bg-danger ms-1">${cuidPendientes} pend.</span>` : ''}
          </button>
          <button type="button" class="btn ${adminState.subTabAfiliados === 'clinicas' ? 'btn-paw' : 'btn-outline-secondary'} fw-bold" data-sub-afiliado="clinicas">
            <i class="bi bi-hospital-fill me-1"></i>Clínicas Veterinarias Aliadas (${adminState.clinicas.length})
            ${clinPendientes > 0 ? `<span class="badge bg-danger ms-1">${clinPendientes} pend.</span>` : ''}
          </button>
        </div>

        ${adminState.subTabAfiliados === 'clinicas' ? `
          <button type="button" class="btn btn-success btn-sm fw-bold px-3" id="btn-abrir-modal-crear-clinica">
            <i class="bi bi-plus-circle-fill me-1"></i>Registrar Nueva Clínica Directamente
          </button>
        ` : ''}
      </div>

      <div id="afiliados-sub-container"></div>
    </div>
  `;

  workspace.querySelectorAll('[data-sub-afiliado]').forEach((btn) => {
    btn.addEventListener('click', () => {
      adminState.subTabAfiliados = btn.getAttribute('data-sub-afiliado');
      renderSeccionCuidadoresYClinicas(workspace, rootContainer);
    });
  });

  workspace.querySelector('#btn-abrir-modal-crear-clinica')?.addEventListener('click', () => {
    abrirModalCrearClinicaDirecta(() => {
      renderContenidoPanelAdministrador(rootContainer);
    });
  });

  const subContainer = workspace.querySelector('#afiliados-sub-container');
  if (adminState.subTabAfiliados === 'cuidadores') {
    renderSubVistaCuidadoresAdmin(subContainer, rootContainer);
  } else {
    renderSubVistaClinicasAdmin(subContainer, rootContainer);
  }
}

function renderSubVistaCuidadoresAdmin(subContainer, rootContainer) {
  const filtrados = adminState.cuidadores.filter((c) => {
    if (adminState.filtroCuidadoresEstado !== 'todos' && c.estado_postulacion !== adminState.filtroCuidadoresEstado) return false;
    if (adminState.filtroCuidadoresDistrito !== 'todos' && c.distrito_cusco !== adminState.filtroCuidadoresDistrito) return false;
    return true;
  });

  const avatarFallback = getFallbackSvgDataUri('avatar');

  subContainer.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h6 class="fw-bold mb-0">
          <i class="bi bi-shield-check text-warning me-2"></i>Verificación Legal y Aprobación de Cuidadores
        </h6>
        <div class="small text-secondary">Expedientes documentales y distritos de Cusco verificados.</div>
      </div>

      <div class="d-flex flex-wrap gap-2">
        <select class="form-select form-select-sm" id="admin-filtro-cuid-estado" style="width: auto;">
          <option value="todos" ${adminState.filtroCuidadoresEstado === 'todos' ? 'selected' : ''}>Todos los estados (${adminState.cuidadores.length})</option>
          <option value="pendiente" ${adminState.filtroCuidadoresEstado === 'pendiente' ? 'selected' : ''}>Pendientes de Aprobación</option>
          <option value="aprobado" ${adminState.filtroCuidadoresEstado === 'aprobado' ? 'selected' : ''}>Aprobados / Activos</option>
          <option value="rechazado" ${adminState.filtroCuidadoresEstado === 'rechazado' ? 'selected' : ''}>Rechazados</option>
          <option value="suspendido" ${adminState.filtroCuidadoresEstado === 'suspendido' ? 'selected' : ''}>Suspendidos</option>
        </select>

        <select class="form-select form-select-sm" id="admin-filtro-cuid-distrito" style="width: auto;">
          <option value="todos" ${adminState.filtroCuidadoresDistrito === 'todos' ? 'selected' : ''}>Todos los distritos Cusco</option>
          ${CUSCO_CONFIG.DISTRITOS.map((d) => `
            <option value="${escapeHtml(d)}" ${adminState.filtroCuidadoresDistrito === d ? 'selected' : ''}>${escapeHtml(d)}</option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 small">
        <thead class="table-light">
          <tr>
            <th>Código & Cuidador</th>
            <th>Distrito Cusco</th>
            <th>Experiencia & Vivienda</th>
            <th>Expediente Documental (4 Docs + DJ)</th>
            <th>Estado</th>
            <th class="text-end">Acciones Administrativas</th>
          </tr>
        </thead>
        <tbody>
          ${filtrados.map((c) => `
            <tr class="${c.estado_postulacion === 'pendiente' ? 'table-warning bg-opacity-25' : ''}">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <img src="${escapeHtml(c.foto_url && !c.foto_url.startsWith('storage://') ? c.foto_url : avatarFallback)}"
                    data-resolve-avatar="${escapeHtml(c.foto_url || '')}"
                    alt="${escapeHtml(c.nombre_completo)}"
                    style="width:42px; height:42px; border-radius:50%; object-fit:cover;"
                    onerror="this.onerror=null;this.src='${avatarFallback}'">
                  <div>
                    <span class="badge bg-dark font-monospace">${escapeHtml(c.codigo_cuidador)}</span>
                    <div class="fw-bold text-dark">${escapeHtml(c.nombre_completo)}</div>
                    <div class="text-muted" style="font-size:0.74rem;">
                      ${escapeHtml(c.tipo_documento)}: ${escapeHtml(c.num_documento)} • ${escapeHtml(c.telefono)}
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <span class="badge bg-light text-dark border px-2 py-1">
                  <i class="bi bi-geo-alt-fill text-warning me-1"></i>${escapeHtml(c.distrito_cusco)}
                </span>
                <div class="text-muted mt-1" style="font-size:0.73rem;">${escapeHtml(c.direccion)}</div>
              </td>

              <td>
                <div class="fw-semibold text-dark">${c.anios_experiencia} año(s) exp. • Cap: ${c.capacidad_max_mascotas} mascotas</div>
                <div class="text-secondary" style="font-size:0.75rem;">${escapeHtml(c.tipo_vivienda)}</div>
                <div class="text-muted" style="font-size:0.73rem;">Cobro: ${escapeHtml(c.cuenta_cobro_tipo)} (${escapeHtml(c.cuenta_cobro_numero)})</div>
              </td>

              <td>
                <div class="d-flex flex-wrap gap-1 mb-1">
                  <button type="button" class="badge bg-primary-subtle text-primary border"
                    data-admin-doc-url="${escapeHtml(c.doc_identidad_url || '')}"
                    data-admin-doc-titulo="Documento de Identidad (${escapeHtml(c.tipo_documento)}) — ${escapeHtml(c.nombre_completo)}"
                    ${!c.doc_identidad_url ? 'disabled title="Sin archivo adjunto"' : ''}>
                    <i class="bi bi-person-vcard me-1"></i>DNI
                  </button>
                  <button type="button" class="badge bg-info-subtle text-dark border"
                    data-admin-doc-url="${escapeHtml(c.doc_antecedentes_policiales_url || '')}"
                    data-admin-doc-titulo="Antecedentes Policiales (PNP) — ${escapeHtml(c.nombre_completo)}"
                    ${!c.doc_antecedentes_policiales_url ? 'disabled title="Sin archivo adjunto"' : ''}>
                    <i class="bi bi-shield-check me-1"></i>Policiales
                  </button>
                  <button type="button" class="badge bg-info-subtle text-dark border"
                    data-admin-doc-url="${escapeHtml(c.doc_antecedentes_penales_url || '')}"
                    data-admin-doc-titulo="Antecedentes Penales (PJ) — ${escapeHtml(c.nombre_completo)}"
                    ${!c.doc_antecedentes_penales_url ? 'disabled title="Sin archivo adjunto"' : ''}>
                    <i class="bi bi-file-earmark-lock2 me-1"></i>Penales
                  </button>
                  <button type="button" class="badge bg-secondary-subtle text-dark border"
                    data-admin-doc-url="${escapeHtml(c.doc_domicilio_url || '')}"
                    data-admin-doc-titulo="Constancia Domiciliaria — ${escapeHtml(c.nombre_completo)}"
                    ${!c.doc_domicilio_url ? 'disabled title="Sin archivo adjunto"' : ''}>
                    <i class="bi bi-house-check me-1"></i>Domicilio
                  </button>
                </div>
                <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" data-admin-ver-docs="${escapeHtml(c.id)}">
                  <i class="bi bi-eye-fill me-1"></i>Inspeccionar Expediente + DJ
                </button>
              </td>

              <td>
                <div>${renderBadgeEstadoAfiliado(c.estado_postulacion)}</div>
                <div class="text-muted mt-1" style="font-size:0.72rem; max-width:170px;">${escapeHtml(c.motivo_estado)}</div>
              </td>

              <td class="text-end">
                <div class="d-flex justify-content-end gap-1 flex-wrap">
                  ${c.estado_postulacion !== 'aprobado' ? `
                    <button type="button" class="btn btn-success btn-sm fw-bold" data-cuid-action="aprobar" data-cuid-id="${escapeHtml(c.id)}">
                      <i class="bi bi-check-lg me-1"></i>Aprobar
                    </button>
                  ` : ''}
                  ${c.estado_postulacion === 'pendiente' ? `
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold" data-cuid-action="rechazar" data-cuid-id="${escapeHtml(c.id)}">
                      <i class="bi bi-x-lg me-1"></i>Rechazar
                    </button>
                  ` : ''}
                  ${c.estado_postulacion === 'aprobado' ? `
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-cuid-action="suspender" data-cuid-id="${escapeHtml(c.id)}">
                      <i class="bi bi-pause-circle me-1"></i>Suspender
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Resolver avatares almacenados en buckets privados si aplica
  subContainer.querySelectorAll('img[data-resolve-avatar]').forEach(async (img) => {
    const ref = img.getAttribute('data-resolve-avatar');
    if (ref && ref.startsWith('storage://')) {
      const resolved = await resolveMediaUrl(ref);
      if (resolved) img.src = resolved;
    }
  });

  subContainer.querySelector('#admin-filtro-cuid-estado')?.addEventListener('change', (e) => {
    adminState.filtroCuidadoresEstado = e.target.value;
    renderSubVistaCuidadoresAdmin(subContainer, rootContainer);
  });

  subContainer.querySelector('#admin-filtro-cuid-distrito')?.addEventListener('change', (e) => {
    adminState.filtroCuidadoresDistrito = e.target.value;
    renderSubVistaCuidadoresAdmin(subContainer, rootContainer);
  });

  // Visor firmado universal para los 4 documentos en línea
  subContainer.querySelectorAll('[data-admin-doc-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const urlRef = btn.getAttribute('data-admin-doc-url');
      const titulo = btn.getAttribute('data-admin-doc-titulo') || 'Documento del Cuidador';
      if (!urlRef) {
        showToast('Este documento aún no ha sido adjuntado por el postulante.', 'info');
        return;
      }
      abrirVisorDocumento(urlRef, titulo);
    });
  });

  // Visor modal de los 4 documentos legales + Declaración Jurada
  subContainer.querySelectorAll('[data-admin-ver-docs]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-admin-ver-docs');
      const cuidador = adminState.cuidadores.find((x) => x.id === id);
      if (cuidador) {
        abrirModalExpedienteCuidador(cuidador, () => {
          renderContenidoPanelAdministrador(rootContainer);
        });
      }
    });
  });

  // Botones Aprobar / Rechazar / Suspender cuidador
  subContainer.querySelectorAll('[data-cuid-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accion = btn.getAttribute('data-cuid-action');
      const id = btn.getAttribute('data-cuid-id');
      const cuidador = adminState.cuidadores.find((x) => x.id === id);
      if (cuidador) {
        abrirModalDecisionCuidador(cuidador, accion, () => {
          renderContenidoPanelAdministrador(rootContainer);
        });
      }
    });
  });
}

function abrirModalExpedienteCuidador(c, onDecisionCallback) {
  const cuerpoHtml = `
    <div class="p-3 bg-light rounded-3 border mb-3 small">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <span class="badge bg-dark font-monospace me-1">${escapeHtml(c.codigo_cuidador)}</span>
          <strong class="fs-6">${escapeHtml(c.nombre_completo)}</strong>
          <span class="text-secondary">(${escapeHtml(c.tipo_documento)}: ${escapeHtml(c.num_documento)})</span>
        </div>
        ${renderBadgeEstadoAfiliado(c.estado_postulacion)}
      </div>
      <div class="mt-1 text-secondary">
        <strong>Distrito en Cusco:</strong> ${escapeHtml(c.distrito_cusco)} (${escapeHtml(c.direccion)}) •
        <strong>Teléfono:</strong> ${escapeHtml(c.telefono)} •
        <strong>Declaración Jurada:</strong> <span class="text-success fw-bold">Firmada Digitalmente ✓</span>
      </div>
    </div>

    <div class="row g-3 small">
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="fw-bold mb-1"><i class="bi bi-person-vcard text-primary me-1"></i>1. Documento de Identidad (${escapeHtml(c.tipo_documento)})</div>
          <button type="button" class="btn btn-outline-primary btn-sm w-100"
            data-exp-doc-url="${escapeHtml(c.doc_identidad_url || '')}"
            data-exp-doc-titulo="Documento de Identidad (${escapeHtml(c.tipo_documento)}) — ${escapeHtml(c.nombre_completo)}"
            ${!c.doc_identidad_url ? 'disabled' : ''}>
            <i class="bi bi-file-earmark-check me-1"></i>${c.doc_identidad_url ? 'Visualizar Documento de Identidad' : 'Sin archivo adjunto'}
          </button>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="fw-bold mb-1"><i class="bi bi-shield-check text-success me-1"></i>2. Certificado de Antecedentes Policiales</div>
          <button type="button" class="btn btn-outline-success btn-sm w-100"
            data-exp-doc-url="${escapeHtml(c.doc_antecedentes_policiales_url || '')}"
            data-exp-doc-titulo="Certificado Policial (PNP) — ${escapeHtml(c.nombre_completo)}"
            ${!c.doc_antecedentes_policiales_url ? 'disabled' : ''}>
            <i class="bi bi-file-earmark-check me-1"></i>${c.doc_antecedentes_policiales_url ? 'Visualizar Certificado Policial (PNP)' : 'Sin archivo adjunto'}
          </button>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="fw-bold mb-1"><i class="bi bi-file-earmark-lock2 text-warning me-1"></i>3. Certificado de Antecedentes Penales</div>
          <button type="button" class="btn btn-outline-dark btn-sm w-100"
            data-exp-doc-url="${escapeHtml(c.doc_antecedentes_penales_url || '')}"
            data-exp-doc-titulo="Certificado Penal (PJ) — ${escapeHtml(c.nombre_completo)}"
            ${!c.doc_antecedentes_penales_url ? 'disabled' : ''}>
            <i class="bi bi-file-earmark-check me-1"></i>${c.doc_antecedentes_penales_url ? 'Visualizar Certificado Penal (PJ)' : 'Sin archivo adjunto'}
          </button>
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="fw-bold mb-1"><i class="bi bi-house-check text-info me-1"></i>4. Constancia Domiciliaria en ${escapeHtml(c.distrito_cusco)}</div>
          <button type="button" class="btn btn-outline-secondary btn-sm w-100"
            data-exp-doc-url="${escapeHtml(c.doc_domicilio_url || '')}"
            data-exp-doc-titulo="Constancia Domiciliaria — ${escapeHtml(c.nombre_completo)}"
            ${!c.doc_domicilio_url ? 'disabled' : ''}>
            <i class="bi bi-file-earmark-check me-1"></i>${c.doc_domicilio_url ? 'Visualizar Recibo de Luz / Agua' : 'Sin archivo adjunto'}
          </button>
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
    ${c.estado_postulacion === 'pendiente' ? `
      <button type="button" class="btn btn-outline-danger fw-bold" id="btn-exp-rechazar">Rechazar Postulante</button>
      <button type="button" class="btn btn-success fw-bold" id="btn-exp-aprobar">Aprobar Cuidador</button>
    ` : ''}
  `;

  const modal = crearModalDinamico({
    titulo: `Expediente Documental — ${c.nombre_completo} (${c.codigo_cuidador})`,
    icono: 'bi-folder-check',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  modal.el.querySelectorAll('[data-exp-doc-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const urlRef = btn.getAttribute('data-exp-doc-url');
      const titulo = btn.getAttribute('data-exp-doc-titulo') || 'Documento';
      if (urlRef) abrirVisorDocumento(urlRef, titulo);
    });
  });

  modal.el.querySelector('#btn-exp-aprobar')?.addEventListener('click', async () => {
    await modal.cerrarAsync();
    abrirModalDecisionCuidador(c, 'aprobar', onDecisionCallback);
  });

  modal.el.querySelector('#btn-exp-rechazar')?.addEventListener('click', async () => {
    await modal.cerrarAsync();
    abrirModalDecisionCuidador(c, 'rechazar', onDecisionCallback);
  });
}

function abrirModalDecisionCuidador(cuidador, accion, onSaved) {
  const esAprobar = accion === 'aprobar';
  const esRechazar = accion === 'rechazar';

  const cuerpoHtml = `
    <div class="p-3 rounded-3 bg-light border mb-3 small">
      <strong>Cuidador:</strong> ${escapeHtml(cuidador.nombre_completo)} (${escapeHtml(cuidador.codigo_cuidador)}) •
      <strong>Distrito:</strong> ${escapeHtml(cuidador.distrito_cusco)}
    </div>
    <div class="mb-2">
      <label class="form-label small fw-bold">
        ${esRechazar ? 'Motivo Obligatorio del Rechazo * (mín. 5 caracteres)' : 'Observación / Nota de Verificación Administrativa'}
      </label>
      <textarea class="form-control" id="admin-cuid-motivo" rows="3" ${esRechazar ? 'required minlength="5"' : ''}
        placeholder="Escribe el dictamen de revisión documental...">${escapeHtml(
          esAprobar
            ? 'Antecedentes policiales, penales, DNI y domicilio en Cusco verificados conforme.'
            : ''
        )}</textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn ${esAprobar ? 'btn-success' : (esRechazar ? 'btn-danger' : 'btn-warning')} fw-bold" id="btn-confirmar-cuid-rpc">
      Confirmar (${escapeHtml(accion.toUpperCase())})
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `${esAprobar ? 'Aprobar' : (esRechazar ? 'Rechazar' : 'Suspender')} Cuidador ${cuidador.codigo_cuidador}`,
    icono: 'bi-person-check-fill',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-cuid-rpc')?.addEventListener('click', async () => {
    const motivo = modal.el.querySelector('#admin-cuid-motivo').value.trim();
    if (esRechazar && motivo.length < 5) {
      showToast('Debes especificar el motivo del rechazo (mínimo 5 caracteres).', 'warning');
      return;
    }

    const estadoNuevo = esAprobar ? 'aprobado' : (esRechazar ? 'rechazado' : 'suspendido');
    const cuentaNueva = esAprobar ? 'activo' : estadoNuevo;

    showSpinner('Actualizando estado del cuidador...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(cuidador.id).startsWith('cuid-')) {
        const { error } = await supabase.rpc('rpc_admin_aprobar_cuidador', {
          p_id_cuidador: cuidador.id,
          p_accion: accion,
          p_motivo: motivo || null
        });
        if (error) throw error;
        await cargarDatosPanelAdministrador();
      } else {
        const estadoAnterior = cuidador.estado_postulacion;
        adminState.cuidadores = adminState.cuidadores.map((item) => (
          item.id === cuidador.id
            ? {
                ...item,
                estado_postulacion: estadoNuevo,
                estado_cuenta: cuentaNueva,
                motivo_estado: motivo || 'Verificado por Administración'
              }
            : item
        ));
        localStorage.setItem(STORAGE_KEY_CUIDADORES_ADMIN, JSON.stringify(adminState.cuidadores));

        registrarAuditoriaAdmin({
          entidad: 'perfiles_cuidadores',
          id_registro: cuidador.codigo_cuidador,
          accion: 'UPDATE',
          estado_anterior: estadoAnterior,
          estado_nuevo: estadoNuevo,
          detalle: `Cuidador ${cuidador.nombre_completo} (${cuidador.distrito_cusco}) actualizado a ${estadoNuevo}: ${motivo}`,
          old_record: { codigo_cuidador: cuidador.codigo_cuidador, estado_postulacion: estadoAnterior },
          new_record: { codigo_cuidador: cuidador.codigo_cuidador, estado_postulacion: estadoNuevo, motivo_estado: motivo }
        });
      }

      await modal.cerrarAsync();
      showToast(`Cuidador ${cuidador.nombre_completo} actualizado a "${estadoNuevo.toUpperCase()}".`, 'success');
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      handleSupabaseError(err, 'No se pudo actualizar el estado del cuidador.');
    } finally {
      hideSpinner();
    }
  });
}

function renderSubVistaClinicasAdmin(subContainer, rootContainer) {
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const filtradas = adminState.clinicas.filter((cl) => (
    adminState.filtroClinicasEstado === 'todos' ? true : cl.estado_afiliacion === adminState.filtroClinicasEstado
  ));

  subContainer.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h6 class="fw-bold mb-0">
          <i class="bi bi-hospital text-danger me-2"></i>Red de Clínicas Veterinarias Aliadas en Cusco
        </h6>
        <div class="small text-secondary">Al aprobar una clínica postulante, se activa automáticamente la cuenta de su médico veterinario responsable.</div>
      </div>

      <select class="form-select form-select-sm" id="admin-filtro-clin-estado" style="width: auto;">
        <option value="todos" ${adminState.filtroClinicasEstado === 'todos' ? 'selected' : ''}>Todas las clínicas (${adminState.clinicas.length})</option>
        <option value="pendiente" ${adminState.filtroClinicasEstado === 'pendiente' ? 'selected' : ''}>Pendientes de Afiliación</option>
        <option value="activa" ${adminState.filtroClinicasEstado === 'activa' ? 'selected' : ''}>Clínicas Activas</option>
        <option value="rechazada" ${adminState.filtroClinicasEstado === 'rechazada' ? 'selected' : ''}>Rechazadas</option>
        <option value="suspendida" ${adminState.filtroClinicasEstado === 'suspendida' ? 'selected' : ''}>Suspendidas</option>
      </select>
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0 small">
        <thead class="table-light">
          <tr>
            <th>Código & Clínica Veterinaria</th>
            <th>RUC & Colegiatura CMVP</th>
            <th>Sede Distrito Cusco</th>
            <th>Horario & Tarifa S.O.S.</th>
            <th>S.O.S. Atendidos</th>
            <th>Estado</th>
            <th class="text-end">Acciones Administrativas</th>
          </tr>
        </thead>
        <tbody>
          ${filtradas.map((cl) => `
            <tr class="${cl.estado_afiliacion === 'pendiente' ? 'table-warning bg-opacity-25' : ''}">
              <td>
                <span class="badge bg-dark font-monospace">${escapeHtml(cl.codigo_clinica)}</span>
                <div class="fw-bold text-dark mt-1">${escapeHtml(cl.nombre)}</div>
                <div class="text-muted" style="font-size:0.74rem;">
                  <i class="bi bi-telephone-fill text-danger me-1"></i>${escapeHtml(cl.telefono_emergencia)} • ${escapeHtml(cl.email_institucional)}
                </div>
              </td>

              <td>
                <div class="font-monospace fw-semibold">RUC: ${escapeHtml(cl.ruc)}</div>
                <span class="badge bg-success-subtle text-success border font-monospace mt-1">${escapeHtml(cl.colegiatura_cmvp)}</span>
                <div class="mt-1">
                  ${cl.constancia_url ? `
                    <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none"
                      data-admin-constancia-url="${escapeHtml(cl.constancia_url)}"
                      data-admin-constancia-titulo="Constancia CMVP — ${escapeHtml(cl.nombre)} (${escapeHtml(cl.colegiatura_cmvp)})">
                      <i class="bi bi-file-earmark-medical me-1"></i>Ver Constancia CMVP
                    </button>
                  ` : `<span class="text-muted small"><i class="bi bi-file-earmark-x me-1"></i>Sin constancia adjunta</span>`}
                </div>
              </td>

              <td>
                <span class="badge bg-light text-dark border">
                  <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(cl.distrito_cusco)}
                </span>
                <div class="text-secondary mt-1" style="font-size:0.74rem;">${escapeHtml(cl.direccion)}</div>
              </td>

              <td>
                <span class="badge ${cl.horario_atencion === '24 Horas' ? 'bg-danger' : 'bg-info text-dark'}">${escapeHtml(cl.horario_atencion)}</span>
                <div class="fw-bold text-dark mt-1">Urgencia: ${formatMoneda(cl.tarifa_consulta_emergencia, moneda)}</div>
              </td>

              <td class="text-center">
                <span class="badge bg-dark rounded-pill px-3 py-1">${cl.sos_atendidos} caso(s)</span>
              </td>

              <td>
                <div>${renderBadgeEstadoAfiliado(cl.estado_afiliacion)}</div>
                <div class="text-muted mt-1" style="font-size:0.72rem; max-width:160px;">${escapeHtml(cl.motivo_estado)}</div>
              </td>

              <td class="text-end">
                <div class="d-flex justify-content-end gap-1 flex-wrap">
                  ${cl.estado_afiliacion !== 'activa' ? `
                    <button type="button" class="btn btn-success btn-sm fw-bold" data-clin-action="aprobar" data-clin-id="${escapeHtml(cl.id)}">
                      <i class="bi bi-check-lg me-1"></i>Aprobar Clínica
                    </button>
                  ` : ''}
                  ${cl.estado_afiliacion === 'pendiente' ? `
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold" data-clin-action="rechazar" data-clin-id="${escapeHtml(cl.id)}">
                      <i class="bi bi-x-lg me-1"></i>Rechazar
                    </button>
                  ` : ''}
                  ${cl.estado_afiliacion === 'activa' ? `
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-clin-action="suspender" data-clin-id="${escapeHtml(cl.id)}">
                      <i class="bi bi-pause-circle me-1"></i>Suspender
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  subContainer.querySelector('#admin-filtro-clin-estado')?.addEventListener('change', (e) => {
    adminState.filtroClinicasEstado = e.target.value;
    renderSubVistaClinicasAdmin(subContainer, rootContainer);
  });

  // Visor firmado universal para constancia CMVP
  subContainer.querySelectorAll('[data-admin-constancia-url]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const urlRef = btn.getAttribute('data-admin-constancia-url');
      const titulo = btn.getAttribute('data-admin-constancia-titulo') || 'Constancia CMVP';
      if (urlRef) abrirVisorDocumento(urlRef, titulo);
    });
  });

  subContainer.querySelectorAll('[data-clin-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accion = btn.getAttribute('data-clin-action');
      const id = btn.getAttribute('data-clin-id');
      const clinica = adminState.clinicas.find((x) => x.id === id);
      if (clinica) {
        abrirModalDecisionClinica(clinica, accion, () => {
          renderContenidoPanelAdministrador(rootContainer);
        });
      }
    });
  });
}

function abrirModalDecisionClinica(clinica, accion, onSaved) {
  const esAprobar = accion === 'aprobar';
  const esRechazar = accion === 'rechazar';

  const cuerpoHtml = `
    <div class="p-3 rounded-3 bg-light border mb-3 small">
      <strong>Clínica Veterinaria:</strong> ${escapeHtml(clinica.nombre)} (${escapeHtml(clinica.codigo_clinica)})<br>
      <strong>RUC:</strong> ${escapeHtml(clinica.ruc)} • <strong>Colegiatura:</strong> ${escapeHtml(clinica.colegiatura_cmvp)} •
      <strong>Sede:</strong> ${escapeHtml(clinica.distrito_cusco)}
    </div>
    <div class="mb-2">
      <label class="form-label small fw-bold">
        ${esRechazar ? 'Motivo Obligatorio del Rechazo * (mín. 5 caracteres)' : 'Resolución de Acreditación CMVP'}
      </label>
      <textarea class="form-control" id="admin-clin-motivo" rows="3" ${esRechazar ? 'required minlength="5"' : ''}>${escapeHtml(
        esAprobar ? 'RUC y Colegiatura CMVP verificados conforme. Clínica incorporada a la Red Aliada de Cusco.' : ''
      )}</textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn ${esAprobar ? 'btn-success' : (esRechazar ? 'btn-danger' : 'btn-warning')} fw-bold" id="btn-confirmar-clin-rpc">
      Confirmar (${escapeHtml(accion.toUpperCase())})
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `${esAprobar ? 'Aprobar y Activar' : (esRechazar ? 'Rechazar' : 'Suspender')} Clínica ${clinica.codigo_clinica}`,
    icono: 'bi-hospital-fill',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-clin-rpc')?.addEventListener('click', async () => {
    const motivo = modal.el.querySelector('#admin-clin-motivo').value.trim();
    if (esRechazar && motivo.length < 5) {
      showToast('Debes ingresar el motivo del rechazo de la clínica.', 'warning');
      return;
    }

    const nuevoEstado = esAprobar ? 'activa' : (esRechazar ? 'rechazada' : 'suspendida');

    showSpinner('Actualizando acreditación de la clínica veterinaria...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured()) {
        const { error } = await supabase.rpc('rpc_admin_aprobar_clinica', {
          p_id_clinica: clinica.id,
          p_accion: accion,
          p_motivo: motivo || null
        });
        if (error) throw error;
        await cargarDatosPanelAdministrador();
      } else {
        const estadoAnterior = clinica.estado_afiliacion;
        adminState.clinicas = adminState.clinicas.map((c) => (
          c.id === clinica.id
            ? { ...c, estado_afiliacion: nuevoEstado, activa: nuevoEstado === 'activa', motivo_estado: motivo }
            : c
        ));
        localStorage.setItem(STORAGE_KEY_CLINICAS_ADMIN, JSON.stringify(adminState.clinicas));

        registrarAuditoriaAdmin({
          entidad: 'clinicas_veterinarias',
          id_registro: clinica.codigo_clinica,
          accion: 'UPDATE',
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          detalle: `Clínica ${clinica.nombre} (${clinica.colegiatura_cmvp}) actualizada a "${nuevoEstado}": ${motivo}`,
          old_record: { codigo_clinica: clinica.codigo_clinica, estado_afiliacion: estadoAnterior },
          new_record: { codigo_clinica: clinica.codigo_clinica, estado_afiliacion: nuevoEstado, motivo_estado: motivo }
        });
      }

      await modal.cerrarAsync();
      showToast(`Clínica "${clinica.nombre}" actualizada a estado "${nuevoEstado.toUpperCase()}".`, 'success');
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      handleSupabaseError(err, 'No se pudo actualizar el estado de la clínica.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Modal para Registrar Nueva Clínica Veterinaria Directamente
 */
function abrirModalCrearClinicaDirecta(onCreatedCallback = null) {
  const cuerpoHtml = `
    <div class="alert alert-info border-0 small mb-3">
      <i class="bi bi-hospital-fill me-1"></i>
      Al registrar una clínica directamente desde Administración,
      queda en estado <strong>Activa</strong> de inmediato en el directorio público y en la Central S.O.S. de Cusco.
    </div>

    <form id="form-admin-crear-clinica" novalidate>
      <div class="row g-3">
        <div class="col-md-7">
          <label class="form-label small fw-bold">Razón Social / Nombre de la Clínica Veterinaria *</label>
          <input type="text" class="form-control" id="new-clin-nombre" required minlength="3" maxlength="100"
            placeholder="Ej. Clínica Veterinaria Imperial Cusco 24h">
        </div>
        <div class="col-md-5">
          <label class="form-label small fw-bold">RUC (11 dígitos) *</label>
          <input type="text" class="form-control font-monospace" id="new-clin-ruc" required inputmode="numeric" maxlength="11" data-validate="ruc"
            placeholder="Ej. 20609988771">
          <div class="form-text small">11 dígitos exactos (inicia en 10, 15, 17 o 20).</div>
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Distrito en Cusco *</label>
          <select class="form-select" id="new-clin-distrito">
            ${CUSCO_CONFIG.DISTRITOS.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}
          </select>
        </div>
        <div class="col-md-8">
          <label class="form-label small fw-bold">Dirección Exacta en Cusco *</label>
          <input type="text" class="form-control" id="new-clin-direccion" required minlength="5" maxlength="160"
            placeholder="Ej. Av. Garcilaso 412, Wanchaq">
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Teléfono Emergencias S.O.S. *</label>
          <input type="tel" class="form-control" id="new-clin-telefono" required inputmode="numeric" maxlength="16" data-validate="phone"
            placeholder="984700888 o +51984700888">
          <div class="form-text small">Perú 9 dígitos (inicia en 9) o +código país.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Colegiatura CMVP *</label>
          <input type="text" class="form-control font-monospace" id="new-clin-cmvp" required data-validate="cmvp"
            placeholder="CMVP-CUSCO-6420">
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Email Institucional *</label>
          <input type="email" class="form-control" id="new-clin-email" required data-validate="email"
            placeholder="urgencias@imperialvetcusco.pe">
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Horario de Atención *</label>
          <select class="form-select" id="new-clin-horario">
            <option value="24 Horas" selected>24 Horas (Guardia S.O.S.)</option>
            <option value="Extendido">Extendido (07:00 - 22:00)</option>
            <option value="Diurno">Diurno (08:00 - 19:00)</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Tarifa Consulta Urgencia (S/) *</label>
          <input type="number" step="1" min="20" max="500" class="form-control" id="new-clin-tarifa" value="60" required data-validate="number-range">
          <div class="form-text small">Rango válido: S/ 20 a S/ 500.</div>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Especialidades Clínicas</label>
          <input type="text" class="form-control" id="new-clin-especialidades"
            value="Emergencias 24h, Medicina Interna, Cirugía">
        </div>

        <div class="col-md-6">
          <div id="admin-clin-fachada-uploader"></div>
        </div>
        <div class="col-md-6">
          <div id="admin-clin-constancia-uploader"></div>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold px-4" id="btn-guardar-nueva-clinica-rpc">
      <i class="bi bi-hospital-fill me-1"></i>Crear y Activar Clínica Aliada
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: 'Registrar Nueva Clínica Veterinaria Directamente',
    icono: 'bi-hospital-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  const formNuevaClin = modal.el.querySelector('#form-admin-crear-clinica');
  attachFormValidation(formNuevaClin);

  const fachadaUploader = mountFileUploader(modal.el.querySelector('#admin-clin-fachada-uploader'), {
    accept: 'image/*',
    bucket: 'perfiles',
    folder: 'clinicas-fachadas',
    label: 'Fotografía de Fachada (Imagen)',
    helpText: 'Se mostrará en el directorio público y en la Central S.O.S.',
    compact: true
  });

  const constanciaUploader = mountFileUploader(modal.el.querySelector('#admin-clin-constancia-uploader'), {
    accept: 'image/*,application/pdf',
    bucket: 'documentos-verificacion',
    folder: 'clinicas-constancias',
    label: 'Constancia CMVP / Ficha RUC (Imagen o PDF)',
    helpText: 'Documento privado resguardado con acceso firmado.',
    compact: true
  });

  modal.el.querySelector('#btn-guardar-nueva-clinica-rpc')?.addEventListener('click', async () => {
    if (!validateFormNow(formNuevaClin).valid) return;

    const nombre = modal.el.querySelector('#new-clin-nombre').value.trim();
    const ruc = modal.el.querySelector('#new-clin-ruc').value.trim();
    const distrito_cusco = modal.el.querySelector('#new-clin-distrito').value;
    const direccion = modal.el.querySelector('#new-clin-direccion').value.trim();
    const telefono_emergencia = modal.el.querySelector('#new-clin-telefono').value.trim();
    const colegiatura_cmvp = modal.el.querySelector('#new-clin-cmvp').value.trim();
    const email_institucional = modal.el.querySelector('#new-clin-email').value.trim();
    const horario_atencion = modal.el.querySelector('#new-clin-horario').value;
    const tarifa_consulta_emergencia = parseFloat(modal.el.querySelector('#new-clin-tarifa').value) || 60;
    const especialidades = modal.el.querySelector('#new-clin-especialidades').value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    showSpinner('Registrando y activando clínica aliada...');
    try {
      const fotoFachadaUrl = await fachadaUploader.uploadIfPending();
      const constanciaUrl = await constanciaUploader.uploadIfPending();

      const payload = {
        ruc,
        nombre,
        email_institucional: email_institucional || 'contacto@vetcusco.pe',
        direccion,
        distrito_cusco,
        telefono_emergencia,
        horario_atencion,
        especialidades,
        tarifa_consulta_emergencia,
        colegiatura_cmvp,
        foto_fachada_url: fotoFachadaUrl || null,
        constancia_url: constanciaUrl || null
      };

      const supabase = getSupabase();
      let rpcRes = null;
      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.rpc('rpc_admin_crear_clinica_directa', { p_payload: payload });
        if (error) throw error;
        rpcRes = data;
        await cargarDatosPanelAdministrador();
      } else {
        const nextNum = adminState.clinicas.length + 1;
        const nuevaClinica = normalizarClinicaAdmin({
          id: `40000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
          codigo_clinica: `VET-00${nextNum}`,
          ...payload,
          estado_afiliacion: 'activa',
          motivo_estado: 'Alta directa por Administración General Paw Patita Cusco.',
          activa: true,
          sos_atendidos: 0
        });

        adminState.clinicas.unshift(nuevaClinica);
        localStorage.setItem(STORAGE_KEY_CLINICAS_ADMIN, JSON.stringify(adminState.clinicas));

        registrarAuditoriaAdmin({
          entidad: 'clinicas_veterinarias',
          id_registro: nuevaClinica.codigo_clinica,
          accion: 'INSERT',
          estado_anterior: '—',
          estado_nuevo: 'activa',
          detalle: `Alta directa de clínica ${nuevaClinica.nombre} (RUC: ${ruc}, CMVP: ${colegiatura_cmvp}) en ${distrito_cusco}.`,
          old_record: {},
          new_record: { codigo_clinica: nuevaClinica.codigo_clinica, estado_afiliacion: 'activa', colegiatura_cmvp }
        });
      }

      const codigoFinal = rpcRes?.codigo_clinica || adminState.clinicas[0]?.codigo_clinica || 'VET';
      await modal.cerrarAsync();
      showToast(`Clínica "${nombre}" (${codigoFinal}) creada y activada.`, 'success');
      if (typeof onCreatedCallback === 'function') onCreatedCallback();
    } catch (err) {
      handleSupabaseError(err, 'No se pudo registrar la clínica veterinaria.');
    } finally {
      hideSpinner();
    }
  });
}

/* ==========================================================================
   SECCIÓN 3: CANCELACIONES, REEMBOLSOS Y ARBITRAJE DE DISPUTAS
   ========================================================================== */

function renderSeccionCancelacionesYDisputas(workspace, rootContainer) {
  if (!workspace) return;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';

  const filtradas = adminState.cancelaciones.filter((c) => (
    adminState.filtroCancelacionesEstado === 'todos' ? true : c.estado_tramite === adminState.filtroCancelacionesEstado
  ));

  workspace.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-warning text-dark fw-bold mb-1">TRIBUNAL DE ARBITRAJE Y REEMBOLSOS ESCALONADOS</span>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-scales text-warning me-2"></i>Gestión de Cancelaciones, Reembolsos y Disputas
          </h5>
          <p class="text-secondary small mb-0">
            Revisa solicitudes, ejecuta reembolsos o define porcentajes de conciliación entre propietario y cuidador.
          </p>
        </div>

        <select class="form-select form-select-sm" id="admin-filtro-canc-estado" style="width: auto;">
          <option value="todos" ${adminState.filtroCancelacionesEstado === 'todos' ? 'selected' : ''}>Todos los expedientes (${adminState.cancelaciones.length})</option>
          <option value="pendiente_revision" ${adminState.filtroCancelacionesEstado === 'pendiente_revision' ? 'selected' : ''}>Pendientes de Arbitraje / Reembolso</option>
          <option value="procesado" ${adminState.filtroCancelacionesEstado === 'procesado' ? 'selected' : ''}>Procesados / Resueltos</option>
          <option value="rechazado" ${adminState.filtroCancelacionesEstado === 'rechazado' ? 'selected' : ''}>Rechazados (0% Reembolso)</option>
        </select>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Expediente & Reserva</th>
              <th>Solicitante & Cuidador</th>
              <th>Tipo Caso & Anticipación</th>
              <th>Motivo & Regla Aplicada</th>
              <th class="text-end">Bruto (100%)</th>
              <th class="text-end">Reembolso Dueño</th>
              <th class="text-end">Plat. (15%) / Cuid.</th>
              <th>Estado</th>
              <th class="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtradas.map((c) => {
              const esDisputa = c.tipo_caso === 'disputa';
              const badgeTipo = esDisputa
                ? '<span class="badge bg-danger text-white"><i class="bi bi-exclamation-diamond-fill me-1"></i>DISPUTA ABIERTA</span>'
                : '<span class="badge bg-info text-dark"><i class="bi bi-calendar-x me-1"></i>CANCELACIÓN</span>';

              const badgeEstado = c.estado_tramite === 'procesado'
                ? '<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>Procesado</span>'
                : (c.estado_tramite === 'rechazado'
                    ? '<span class="badge bg-secondary">Rechazado</span>'
                    : '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Pendiente Revisión</span>');

              return `
                <tr class="${c.estado_tramite === 'pendiente_revision' ? 'table-warning bg-opacity-10' : ''}">
                  <td>
                    <div class="fw-bold font-monospace text-dark">${escapeHtml(c.codigo_cancelacion)}</div>
                    <span class="badge bg-dark font-monospace">${escapeHtml(c.codigo_reserva)}</span>
                    <div class="text-muted" style="font-size:0.72rem;">${formatFechaEs(c.created_at)}</div>
                  </td>

                  <td>
                    <div class="fw-bold text-dark"><i class="bi bi-person me-1 text-primary"></i>${escapeHtml(c.solicitante_nombre)}</div>
                    <div class="text-secondary" style="font-size:0.75rem;">Cuidador: ${escapeHtml(c.cuidador_nombre)}</div>
                    <div class="text-muted" style="font-size:0.73rem;">Mascota: ${escapeHtml(c.mascota_nombre)}</div>
                  </td>

                  <td>
                    ${badgeTipo}
                    <div class="text-secondary mt-1" style="font-size:0.75rem;">
                      Anticipación: <strong>${c.horas_anticipacion} h</strong>
                    </div>
                  </td>

                  <td style="max-width: 250px;">
                    <div class="fw-semibold text-dark">${escapeHtml(c.regla_aplicada)}</div>
                    <div class="text-secondary" style="font-size:0.75rem;">"${escapeHtml(c.motivo)}"</div>
                    ${c.resolucion_admin ? `
                      <div class="mt-1 p-1 rounded bg-light border text-success" style="font-size:0.73rem;">
                        <strong>Laudo:</strong> ${escapeHtml(c.resolucion_admin)}
                      </div>
                    ` : ''}
                  </td>

                  <td class="text-end fw-semibold">${formatMoneda(c.monto_bruto_reserva, moneda)}</td>

                  <td class="text-end">
                    <div class="fw-bold text-primary">${formatMoneda(c.monto_reembolso, moneda)}</div>
                    <span class="badge bg-primary-subtle text-primary border">${Number(c.porcentaje_reembolso).toFixed(0)}%</span>
                  </td>

                  <td class="text-end">
                    <div class="text-secondary" style="font-size:0.75rem;">Plat: <strong>${formatMoneda(c.monto_penalidad_plataforma, moneda)}</strong></div>
                    <div class="text-success" style="font-size:0.75rem;">Cuid: <strong>${formatMoneda(c.monto_compensacion_cuidador, moneda)}</strong></div>
                  </td>

                  <td>${badgeEstado}</td>

                  <td class="text-end">
                    <div class="d-flex justify-content-end gap-1 flex-wrap">
                      <button type="button" class="btn ${esDisputa ? 'btn-danger' : 'btn-paw'} btn-sm fw-bold"
                        data-admin-arbitrar="${escapeHtml(c.id)}">
                        <i class="bi ${esDisputa ? 'bi-hammer' : 'bi-cash-coin'} me-1"></i>
                        ${c.estado_tramite === 'pendiente_revision'
                          ? (esDisputa ? 'Arbitrar Disputa' : 'Procesar Reembolso')
                          : 'Re-evaluar Laudo'}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  workspace.querySelector('#admin-filtro-canc-estado')?.addEventListener('change', (e) => {
    adminState.filtroCancelacionesEstado = e.target.value;
    renderSeccionCancelacionesYDisputas(workspace, rootContainer);
  });

  workspace.querySelectorAll('[data-admin-arbitrar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-admin-arbitrar');
      const caso = adminState.cancelaciones.find((x) => x.id === id);
      if (caso) {
        abrirModalArbitrajeDisputa(caso, () => {
          renderContenidoPanelAdministrador(rootContainer);
        });
      }
    });
  });
}

/**
 * Abre el Modal de Arbitraje de Disputas y Ejecución de Reembolsos (`rpc_admin_resolver_caso`)
 * Permite asignar el porcentaje exacto (0% a 100%) de reembolso al propietario vs. pago al cuidador.
 */
function abrirModalArbitrajeDisputa(casoRaw, onResolvedCallback) {
  const c = normalizarCancelacionAdmin(casoRaw);
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const bruto = Number(c.monto_bruto_reserva || 160);

  const cuerpoHtml = `
    <div class="p-3 rounded-3 bg-light border mb-3 small">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
        <div>
          <span class="badge bg-dark font-monospace me-1">${escapeHtml(c.codigo_cancelacion)}</span>
          <span class="badge bg-secondary font-monospace me-1">${escapeHtml(c.codigo_reserva)}</span>
          <strong>Monto Bruto Protegido en Garantía: ${formatMoneda(bruto, moneda)}</strong>
        </div>
        <span class="badge bg-danger text-uppercase">${escapeHtml(c.tipo_caso)}</span>
      </div>
      <div><strong>Solicitante:</strong> ${escapeHtml(c.solicitante_nombre)} • <strong>Cuidador:</strong> ${escapeHtml(c.cuidador_nombre)}</div>
      <div class="mt-1 text-secondary"><strong>Motivo del Caso:</strong> "${escapeHtml(c.motivo)}"</div>
    </div>

    <form id="form-admin-arbitraje-rpc" novalidate>
      <div class="mb-3">
        <label class="form-label small fw-bold d-flex justify-content-between">
          <span>Asignación Porcentual de Reembolso al Propietario (0% a 100%) *</span>
          <span class="badge bg-primary fs-6" id="arb-badge-pct">${Number(c.porcentaje_reembolso).toFixed(0)}% Propietario / ${(100 - Number(c.porcentaje_reembolso)).toFixed(0)}% Remanente</span>
        </label>
        <input type="range" class="form-range" id="arb-slider-pct" min="0" max="100" step="5"
          value="${Number(c.porcentaje_reembolso)}">
        <div class="d-flex justify-content-between small text-muted">
          <span>0% (100% favor Cuidador)</span>
          <span>30% (Parcial)</span>
          <span>50% (Mitad)</span>
          <span>70% (24-48h)</span>
          <span>100% (Reembolso Total)</span>
        </div>
      </div>

      <!-- Tarjetas de Simulación Contable en Vivo -->
      <div class="row g-2 mb-3 text-center small">
        <div class="col-md-4">
          <div class="p-2 rounded-3 bg-primary-subtle border border-primary-subtle">
            <div class="text-primary fw-bold">1. Reembolso al Propietario</div>
            <div class="fs-5 fw-bold text-primary" id="arb-val-reembolso">S/ 0.00</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-2 rounded-3 bg-warning-subtle border border-warning-subtle">
            <div class="text-dark fw-bold">2. Comisión Plataforma (15% rem.)</div>
            <div class="fs-5 fw-bold text-dark" id="arb-val-plataforma">S/ 0.00</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-2 rounded-3 bg-success-subtle border border-success-subtle">
            <div class="text-success fw-bold">3. Compensación Neta Cuidador</div>
            <div class="fs-5 fw-bold text-success" id="arb-val-cuidador">S/ 0.00</div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-md-5">
          <label class="form-label small fw-bold">Decisión / Acción Administrativa *</label>
          <select class="form-select" id="arb-select-accion">
            <option value="aprobar" selected>Aprobar Resolución y Ejecutar Reembolso</option>
            <option value="rechazar">Rechazar Reclamo (0% Reembolso — Liberar al Cuidador)</option>
          </select>
        </div>
        <div class="col-md-7">
          <label class="form-label small fw-bold">N° Operación Bancaria de Reembolso (Opcional)</label>
          <input type="text" class="form-control font-monospace" id="arb-input-op"
            data-validate="operation-code-optional" maxlength="30"
            value="OP-REEMB-${Math.floor(100000 + Math.random() * 899999)}"
            placeholder="Ej. OP-YAPE-884120">
          <div class="form-text small">6 a 30 caracteres (letras, números o guiones).</div>
        </div>
        <div class="col-12">
          <label class="form-label small fw-bold">Dictamen / Laudo Arbitral Formal * (mín. 5 caracteres)</label>
          <textarea class="form-control" id="arb-input-resolucion" rows="3" required minlength="5" maxlength="500"
            placeholder="Redacta el dictamen administrativo que notificará a ambas partes...">${escapeHtml(
              c.resolucion_admin
              || `Laudo Arbitral Paw Patita Cusco: Verificadas las evidencias de la reserva ${c.codigo_reserva}, se autoriza un reembolso del ${c.porcentaje_reembolso}% al propietario y se libera la compensación proporcional al cuidador.`
            )}</textarea>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold px-4" id="btn-confirmar-arbitraje-rpc">
      <i class="bi bi-check2-circle me-1"></i>Emitir Dictamen y Procesar Reembolso
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Arbitraje y Resolución Financiera — ${c.codigo_cancelacion} (${c.codigo_reserva})`,
    icono: 'bi-scales',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  const formArbitraje = modal.el.querySelector('#form-admin-arbitraje-rpc');
  attachFormValidation(formArbitraje);

  const slider = modal.el.querySelector('#arb-slider-pct');
  const selectAccion = modal.el.querySelector('#arb-select-accion');
  const badgePct = modal.el.querySelector('#arb-badge-pct');
  const elReembolso = modal.el.querySelector('#arb-val-reembolso');
  const elPlat = modal.el.querySelector('#arb-val-plataforma');
  const elCuid = modal.el.querySelector('#arb-val-cuidador');

  const actualizarCalculoArbitraje = () => {
    const pct = selectAccion.value === 'rechazar' ? 0 : (parseFloat(slider.value) || 0);
    if (selectAccion.value === 'rechazar') slider.value = 0;

    const montoReemb = Number((bruto * (pct / 100)).toFixed(2));
    const remanente = Number((bruto - montoReemb).toFixed(2));
    const comPlat = Number((remanente * 0.15).toFixed(2));
    const netoCuid = Number((remanente - comPlat).toFixed(2));

    if (badgePct) badgePct.textContent = `${pct.toFixed(0)}% Propietario / ${(100 - pct).toFixed(0)}% Remanente`;
    if (elReembolso) elReembolso.textContent = formatMoneda(montoReemb, moneda);
    if (elPlat) elPlat.textContent = formatMoneda(comPlat, moneda);
    if (elCuid) elCuid.textContent = formatMoneda(netoCuid, moneda);

    return { pct, montoReemb, comPlat, netoCuid };
  };

  slider?.addEventListener('input', actualizarCalculoArbitraje);
  selectAccion?.addEventListener('change', actualizarCalculoArbitraje);
  actualizarCalculoArbitraje();

  modal.el.querySelector('#btn-confirmar-arbitraje-rpc')?.addEventListener('click', async () => {
    if (!validateFormNow(formArbitraje).valid) return;

    const accion = selectAccion.value;
    const { pct, montoReemb, comPlat, netoCuid } = actualizarCalculoArbitraje();
    const numOp = modal.el.querySelector('#arb-input-op').value.trim();
    const resolucionRaw = modal.el.querySelector('#arb-input-resolucion').value.trim();

    const resolucionFinal = numOp ? `${resolucionRaw} [N° Op: ${numOp}]` : resolucionRaw;

    showSpinner('Registrando resolución y actualizando saldos...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(c.id).startsWith('can-')) {
        const { error } = await supabase.rpc('rpc_admin_resolver_caso', {
          p_id_cancelacion: c.id,
          p_accion: accion,
          p_pct_reembolso: pct,
          p_resolucion: resolucionFinal
        });
        if (error) throw error;
        await cargarDatosPanelAdministrador();
      } else {
        const ahoraIso = new Date().toISOString();
        const nuevoEstado = accion === 'rechazar' ? 'rechazado' : 'procesado';

        adminState.cancelaciones = adminState.cancelaciones.map((item) => (
          item.id === c.id
            ? {
                ...item,
                porcentaje_reembolso: pct,
                monto_reembolso: montoReemb,
                monto_penalidad_plataforma: comPlat,
                monto_compensacion_cuidador: netoCuid,
                estado_tramite: nuevoEstado,
                resolucion_admin: resolucionFinal,
                fecha_resolucion: ahoraIso
              }
            : item
        ));
        localStorage.setItem(STORAGE_KEY_CANCELACIONES_ADMIN, JSON.stringify(adminState.cancelaciones));

        // Actualizar también la liquidación asociada a esa reserva (pasa de en_garantia a disponible o anulado)
        adminState.liquidaciones = adminState.liquidaciones.map((liq) => {
          if (liq.id_reserva === c.id_reserva || liq.codigo_reserva === c.codigo_reserva) {
            return normalizarLiquidacionAdmin({
              ...liq,
              tipo_concepto: 'Resolución de Arbitraje Administrativo',
              monto_liquidado: netoCuid,
              comision_plataforma: comPlat,
              estado_liquidacion: netoCuid > 0 ? 'disponible' : 'anulado',
              fecha_disponible: ahoraIso
            });
          }
          return liq;
        });
        guardarLiquidacionesSincronizadasAdmin(adminState.liquidaciones);

        registrarAuditoriaAdmin({
          entidad: 'cancelaciones_reembolsos',
          id_registro: c.codigo_cancelacion,
          accion: 'UPDATE',
          estado_anterior: c.estado_tramite,
          estado_nuevo: nuevoEstado,
          detalle: `Arbitraje ${c.codigo_reserva}: Reembolso ${pct}% (S/ ${montoReemb.toFixed(2)}) | Cuidador S/ ${netoCuid.toFixed(2)} | ${resolucionFinal}`,
          old_record: { codigo_cancelacion: c.codigo_cancelacion, estado_tramite: c.estado_tramite },
          new_record: { codigo_cancelacion: c.codigo_cancelacion, estado_tramite: nuevoEstado, porcentaje_reembolso: pct, monto_reembolso: montoReemb }
        });
      }

      await modal.cerrarAsync();
      showToast(
        `Caso ${c.codigo_cancelacion} resuelto: ${pct}% reembolsado (${formatMoneda(montoReemb, moneda)}).`,
        'success',
        'Arbitraje Administrativo'
      );
      if (typeof onResolvedCallback === 'function') onResolvedCallback();
    } catch (err) {
      handleSupabaseError(err, 'No se pudo procesar el arbitraje de la disputa.');
    } finally {
      hideSpinner();
    }
  });
}

/* ==========================================================================
   SECCIÓN 4: LIQUIDACIONES Y DESEMBOLSOS A CUIDADORES
   ========================================================================== */

function renderSeccionLiquidacionesCuidadores(workspace, rootContainer) {
  if (!workspace) return;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const k = adminState.metricasRpc.kpis;

  const filtradas = adminState.liquidaciones.filter((l) => (
    adminState.filtroLiquidacionesEstado === 'todos' ? true : l.estado_liquidacion === adminState.filtroLiquidacionesEstado
  ));

  workspace.innerHTML = `
    <!-- 4 Bloques Financieros de Tesorería -->
    <div class="row g-3 mb-4">
      <div class="col-md-6 col-xl-3">
        <div class="wallet-balance-card wallet-card-garantia h-100">
          <div class="small fw-bold text-uppercase text-secondary mb-1">1. Fondos Protegidos en Garantía</div>
          <div class="fs-4 fw-bold text-dark">${formatMoneda(k.fondos_en_garantia, moneda)}</div>
          <div class="small text-secondary">Servicios en curso o confirmados</div>
        </div>
      </div>
      <div class="col-md-6 col-xl-3">
        <div class="wallet-balance-card wallet-card-disponible h-100">
          <div class="small fw-bold text-uppercase text-success mb-1">2. Disponible en Billeteras</div>
          <div class="fs-4 fw-bold text-success">${formatMoneda(k.fondos_disponibles_retiro, moneda)}</div>
          <div class="small text-secondary">Liberados tras Check-Out</div>
        </div>
      </div>
      <div class="col-md-6 col-xl-3">
        <div class="wallet-balance-card wallet-card-proceso h-100">
          <div class="small fw-bold text-uppercase text-primary mb-1">3. Retiros Solicitados por Pagar</div>
          <div class="fs-4 fw-bold text-primary">${formatMoneda(k.fondos_solicitados_por_pagar, moneda)}</div>
          <div class="small text-secondary">Requieren N° operación bancaria</div>
        </div>
      </div>
      <div class="col-md-6 col-xl-3">
        <div class="wallet-balance-card wallet-card-cobrado h-100">
          <div class="small fw-bold text-uppercase text-white-50 mb-1">4. Total Histórico Desembolsado</div>
          <div class="fs-4 fw-bold text-white">${formatMoneda(k.fondos_historico_pagados, moneda)}</div>
          <div class="small text-white-50">Liquidaciones en estado Pagado</div>
        </div>
      </div>
    </div>

    <!-- Tabla de Liquidaciones -->
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-success-subtle text-success fw-bold mb-1">TESORERÍA Y DESEMBOLSOS BANCARIOS (85% CUIDADOR)</span>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-bank2 text-success me-2"></i>Liquidaciones a Cuidadores
          </h5>
          <p class="text-secondary small mb-0">
            Al registrar el <strong>N° de Operación Bancaria</strong>, la partida pasa a <strong>Pagado</strong> e incrementa automáticamente el <em>Total Histórico Cobrado</em> en la billetera del cuidador.
          </p>
        </div>

        <div class="d-flex flex-wrap gap-2">
          <select class="form-select form-select-sm" id="admin-filtro-liq-estado" style="width: auto;">
            <option value="todos" ${adminState.filtroLiquidacionesEstado === 'todos' ? 'selected' : ''}>Todas las liquidaciones (${adminState.liquidaciones.length})</option>
            <option value="solicitado" ${adminState.filtroLiquidacionesEstado === 'solicitado' ? 'selected' : ''}>Solicitadas por Pagar</option>
            <option value="disponible" ${adminState.filtroLiquidacionesEstado === 'disponible' ? 'selected' : ''}>Disponibles en Billetera</option>
            <option value="en_garantia" ${adminState.filtroLiquidacionesEstado === 'en_garantia' ? 'selected' : ''}>Protegidas en Garantía</option>
            <option value="pagado" ${adminState.filtroLiquidacionesEstado === 'pagado' ? 'selected' : ''}>Pagadas / Desembolsadas</option>
          </select>

          <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-admin-exportar-liq-csv">
            <i class="bi bi-file-earmark-spreadsheet me-1"></i>Exportar CSV
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Código Liquidación</th>
              <th>Cuidador & Distrito</th>
              <th>Reserva & Mascota</th>
              <th class="text-end">Bruto (100%)</th>
              <th class="text-end">Comisión (15%)</th>
              <th class="text-end">Neto a Pagar (85%)</th>
              <th>Cuenta Destino</th>
              <th>N° Operación Pago</th>
              <th>Estado</th>
              <th class="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtradas.map((l) => `
              <tr class="${l.estado_liquidacion === 'solicitado' ? 'table-info bg-opacity-25' : ''}">
                <td class="fw-bold font-monospace">
                  ${escapeHtml(l.codigo_liquidacion)}
                  <div class="text-muted fw-normal" style="font-size:0.72rem;">
                    ${formatFechaEs(l.fecha_liquidacion || l.fecha_solicitud_retiro || l.created_at)}
                  </div>
                </td>

                <td>
                  <span class="badge bg-dark font-monospace">${escapeHtml(l.cuidador_codigo)}</span>
                  <div class="fw-bold text-dark">${escapeHtml(l.cuidador_nombre)}</div>
                  <div class="text-muted" style="font-size:0.73rem;">
                    <i class="bi bi-geo-alt-fill text-warning me-1"></i>${escapeHtml(l.cuidador_distrito)}
                  </div>
                </td>

                <td>
                  <span class="badge bg-secondary font-monospace">${escapeHtml(l.codigo_reserva)}</span>
                  <div class="text-secondary">${escapeHtml(l.mascota_nombre)}</div>
                </td>

                <td class="text-end text-secondary">${formatMoneda(l.monto_bruto_reserva, moneda)}</td>
                <td class="text-end text-primary fw-semibold">${formatMoneda(l.comision_plataforma, moneda)}</td>
                <td class="text-end fw-bold text-success fs-6">${formatMoneda(l.monto_liquidado, moneda)}</td>

                <td>
                  <span class="badge bg-light text-dark border font-monospace">${escapeHtml(l.cuenta_destino)}</span>
                </td>

                <td>
                  ${l.num_operacion_desembolso
                    ? `<span class="badge bg-success-subtle text-success border font-monospace"><i class="bi bi-receipt me-1"></i>${escapeHtml(l.num_operacion_desembolso)}</span>`
                    : '<span class="text-muted">—</span>'}
                </td>

                <td>${renderBadgeEstadoLiquidacion(l.estado_liquidacion)}</td>

                <td class="text-end">
                  ${['solicitado', 'disponible'].includes(l.estado_liquidacion) ? `
                    <div class="d-flex justify-content-end gap-1">
                      <button type="button" class="btn btn-success btn-sm fw-bold" data-liq-pagar="${escapeHtml(l.id)}">
                        <i class="bi bi-cash-coin me-1"></i>Pagar c/ N° Op.
                      </button>
                      ${l.estado_liquidacion === 'solicitado' ? `
                        <button type="button" class="btn btn-outline-danger btn-sm" data-liq-rechazar="${escapeHtml(l.id)}" title="Observar cuenta y devolver a disponible">
                          <i class="bi bi-arrow-return-left"></i>
                        </button>
                      ` : ''}
                    </div>
                  ` : `
                    <span class="text-muted small">${l.estado_liquidacion === 'pagado' ? 'Liquidado ✓' : 'En Custodia'}</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  workspace.querySelector('#admin-filtro-liq-estado')?.addEventListener('change', (e) => {
    adminState.filtroLiquidacionesEstado = e.target.value;
    renderSeccionLiquidacionesCuidadores(workspace, rootContainer);
  });

  workspace.querySelector('#btn-admin-exportar-liq-csv')?.addEventListener('click', () => {
    exportarCsv(adminState.liquidaciones, `liquidaciones_cuidadores_cusco_${getHoyIso()}.csv`);
    showToast('Reporte contable de liquidaciones descargado en CSV.', 'info');
  });

  workspace.querySelectorAll('[data-liq-pagar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-liq-pagar');
      const liq = adminState.liquidaciones.find((x) => x.id === id);
      if (liq) {
        abrirModalProcesarLiquidacion(liq, 'pagar', () => {
          renderContenidoPanelAdministrador(rootContainer);
        });
      }
    });
  });

  workspace.querySelectorAll('[data-liq-rechazar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-liq-rechazar');
      const liq = adminState.liquidaciones.find((x) => x.id === id);
      if (liq) {
        abrirModalProcesarLiquidacion(liq, 'rechazar', () => {
          renderContenidoPanelAdministrador(rootContainer);
        });
      }
    });
  });
}

function abrirModalProcesarLiquidacion(liq, accion = 'pagar', onProcessed) {
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const esPagar = accion === 'pagar';
  const opSugerida = `OP-${(liq.metodo_desembolso || 'BCP').toUpperCase()}-${Math.floor(100000 + Math.random() * 899999)}`;

  const cuerpoHtml = `
    <div class="p-3 rounded-3 ${esPagar ? 'bg-success-subtle border border-success-subtle' : 'bg-warning-subtle border'} mb-3 small">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <span class="badge bg-dark font-monospace me-1">${escapeHtml(liq.codigo_liquidacion)}</span>
          <strong>Cuidador:</strong> ${escapeHtml(liq.cuidador_nombre)} (${escapeHtml(liq.cuidador_distrito)})
        </div>
        <span class="fs-5 fw-bold text-success">${formatMoneda(liq.monto_liquidado, moneda)}</span>
      </div>
      <div class="mt-1 text-secondary">
        <strong>Cuenta Destino:</strong> <span class="font-monospace">${escapeHtml(liq.cuenta_destino)}</span> •
        <strong>Reserva:</strong> ${escapeHtml(liq.codigo_reserva)}
      </div>
    </div>

    ${esPagar ? `
      <div class="mb-2">
        <label class="form-label small fw-bold">Número de Operación Bancaria / Voucher de Transferencia * (mín. 4 caracteres)</label>
        <input type="text" class="form-control font-monospace fw-bold" id="admin-liq-num-op" required minlength="4"
          value="${escapeHtml(opSugerida)}" placeholder="Ej. OP-BCP-774120">
        <div class="form-text small">
          Este N° de operación quedará registrado de forma inmutable en la liquidación del cuidador y en la Bitácora de Auditoría.
        </div>
      </div>
    ` : `
      <div class="mb-2">
        <label class="form-label small fw-bold">Motivo de Observación de la Cuenta Destino *</label>
        <textarea class="form-control" id="admin-liq-motivo" rows="2" required
          placeholder="Indica por qué no se pudo transferir para que el cuidador actualice su cuenta...">Número de cuenta o titularidad observada por el banco; el saldo retorna a Disponible.</textarea>
      </div>
    `}
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn ${esPagar ? 'btn-success' : 'btn-warning'} fw-bold px-4" id="btn-confirmar-liq-rpc">
      <i class="bi ${esPagar ? 'bi-patch-check-fill' : 'bi-arrow-return-left'} me-1"></i>
      ${esPagar ? 'Confirmar Pago y Actualizar Histórico' : 'Devolver Saldo a Disponible'}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: esPagar
      ? `Aprobar Desembolso Bancario — ${liq.codigo_liquidacion}`
      : `Observar Solicitud de Retiro — ${liq.codigo_liquidacion}`,
    icono: 'bi-bank2',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-liq-rpc')?.addEventListener('click', async () => {
    const numOp = modal.el.querySelector('#admin-liq-num-op')?.value.trim() || null;
    const motivo = modal.el.querySelector('#admin-liq-motivo')?.value.trim() || null;

    if (esPagar && (!numOp || numOp.length < 4)) {
      showToast('Debes ingresar un N° de operación bancaria válido (mínimo 4 caracteres).', 'warning');
      return;
    }

    showSpinner('Registrando pago bancario de liquidación...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(liq.id).startsWith('liq-')) {
        const { error } = await supabase.rpc('rpc_admin_procesar_liquidacion', {
          p_id_liquidacion: liq.id,
          p_accion: accion,
          p_num_operacion: numOp,
          p_motivo: motivo
        });
        if (error) throw error;
        await cargarDatosPanelAdministrador();
      } else {
        const ahoraIso = new Date().toISOString();
        const estadoAnterior = liq.estado_liquidacion;
        const nuevoEstado = esPagar ? 'pagado' : 'disponible';

        adminState.liquidaciones = adminState.liquidaciones.map((item) => (
          item.id === liq.id || item.codigo_liquidacion === liq.codigo_liquidacion
            ? normalizarLiquidacionAdmin({
                ...item,
                estado_liquidacion: nuevoEstado,
                num_operacion_desembolso: esPagar ? numOp : null,
                motivo_rechazo: esPagar ? null : motivo,
                fecha_liquidacion: esPagar ? ahoraIso : null
              })
            : item
        ));
        guardarLiquidacionesSincronizadasAdmin(adminState.liquidaciones);

        registrarAuditoriaAdmin({
          entidad: 'liquidaciones_cuidadores',
          id_registro: liq.codigo_liquidacion,
          accion: 'UPDATE',
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          detalle: esPagar
            ? `Liquidación ${liq.codigo_liquidacion} (${liq.cuidador_nombre}) PAGADA por S/ ${liq.monto_liquidado.toFixed(2)} — N° Operación: ${numOp}`
            : `Liquidación ${liq.codigo_liquidacion} devuelta a disponible: ${motivo}`,
          old_record: { codigo_liquidacion: liq.codigo_liquidacion, estado_liquidacion: estadoAnterior },
          new_record: { codigo_liquidacion: liq.codigo_liquidacion, estado_liquidacion: nuevoEstado, num_operacion_desembolso: esPagar ? numOp : null }
        });
      }

      await modal.cerrarAsync();
      showToast(
        esPagar
          ? `¡Liquidación ${liq.codigo_liquidacion} marcada como PAGADA (Op: ${numOp})! El Total Histórico Cobrado del cuidador se actualizó.`
          : `Solicitud ${liq.codigo_liquidacion} observada; el saldo retornó a Disponible.`,
        esPagar ? 'success' : 'info',
        'Tesorería Paw Patita'
      );
      if (typeof onProcessed === 'function') onProcessed();
    } catch (err) {
      handleSupabaseError(err, 'No se pudo procesar la liquidación.');
    } finally {
      hideSpinner();
    }
  });
}

/* ==========================================================================
   SECCIÓN 5: CENTRAL GLOBAL S.O.S. Y CONFIGURACIÓN DE PLATAFORMA CUSCO
   ========================================================================== */

function renderSeccionCentralSosYGobernanza(workspace, rootContainer) {
  if (!workspace) return;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const clinicasActivas = adminState.clinicas.filter((c) => c.estado_afiliacion === 'activa');
  const gob = adminState.gobernanza || {
    parametros: { ...CONFIG_GOBERNANZA_SEED.parametros },
    temporadas: CONFIG_GOBERNANZA_SEED.temporadas.map(normalizarTemporadaAdmin)
  };
  const alertasNormalizadas = adminState.alertasSos.map(normalizarIncidenciaSos);

  workspace.innerHTML = `
    <!-- Monitor Global S.O.S. con Reasignación de Clínica y Conciliación de Cargos Clínicos -->
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-danger text-white fw-bold mb-1">SUPERVISIÓN MÉDICA 24H & COBRO CLÍNICO — CUSCO</span>
          <h5 class="fw-bold mb-0">
            <i class="bi bi-broadcast-pin text-danger me-2"></i>Central Global S.O.S. y Conciliación de Cargos Clínicos
          </h5>
        </div>
        <span class="badge bg-light text-dark border">${alertasNormalizadas.length} incidencia(s) registrada(s)</span>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Código S.O.S. & Severidad</th>
              <th>Mascota & Reserva</th>
              <th>Motivo / Ubicación en Cusco</th>
              <th>Clínica Veterinaria Derivada</th>
              <th>Estado Clínico</th>
              <th>Cargo Clínico S.O.S.</th>
              <th class="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${alertasNormalizadas.length === 0 ? `
              <tr>
                <td colspan="7" class="text-center text-muted py-4">
                  <i class="bi bi-shield-check text-success fs-4 d-block mb-1"></i>
                  No hay alertas S.O.S. registradas en este momento.
                </td>
              </tr>
            ` : alertasNormalizadas.map((s) => `
              <tr>
                <td>
                  <div class="fw-bold font-monospace">${escapeHtml(s.codigo_sos || 'SOS')}</div>
                  <span class="badge ${s.nivel_severidad === 'critica' ? 'bg-danger' : 'bg-warning text-dark'} text-uppercase">${escapeHtml(s.nivel_severidad || 'alta')}</span>
                </td>
                <td>
                  <div class="fw-bold text-dark">${escapeHtml(s.mascota_nombre || 'Mascota')} (${escapeHtml(s.mascota_paw_id || 'PAW-ID')})</div>
                  <span class="badge bg-secondary font-monospace">${escapeHtml(s.codigo_reserva || '—')}</span>
                </td>
                <td style="max-width: 220px;">
                  <div class="fw-semibold">${escapeHtml(s.tipo_incidencia || 'Emergencia Veterinaria')}</div>
                  <div class="text-danger" style="font-size:0.74rem;"><i class="bi bi-geo-alt-fill me-1"></i>${escapeHtml(s.ubicacion_emergencia || 'Cusco')}</div>
                </td>
                <td>
                  <div class="fw-bold text-dark"><i class="bi bi-hospital text-danger me-1"></i>${escapeHtml(s.clinica_nombre || 'Clínica Aliada 24h')}</div>
                  <div class="text-muted" style="font-size:0.73rem;">${escapeHtml(s.clinica_telefono || '+51 984 711 222')}</div>
                </td>
                <td>
                  <span class="badge ${s.estado_sos === 'resuelta' ? 'bg-success' : (s.estado_sos === 'estabilizada' ? 'bg-info text-dark' : 'bg-danger')}">${escapeHtml(traducirEstadoHumano(s.estado_sos))}</span>
                </td>
                <td style="min-width: 170px;">
                  <div class="fw-bold text-dark">${formatMoneda(s.costo_atencion_ref, moneda)}</div>
                  <div class="mt-1">${renderBadgeEstadoCobroSos(s.estado_cobro_sos, s.costo_atencion_ref)}</div>
                  ${s.comprobante_pago_sos ? `
                    <div class="text-muted mt-1" style="font-size:0.72rem;">
                      ${escapeHtml(s.metodo_pago_sos || 'Pago')}: <span class="font-monospace">${escapeHtml(s.comprobante_pago_sos)}</span>
                    </div>
                  ` : ''}
                </td>
                <td class="text-end text-nowrap">
                  <div class="d-flex flex-column align-items-end gap-1">
                    ${s.costo_atencion_ref > 0 ? `
                      <button type="button" class="btn btn-paw btn-sm fw-bold" data-admin-conciliar-sos="${escapeHtml(s.id)}">
                        <i class="bi bi-cash-coin me-1"></i>Conciliar / Exonerar Cargo
                      </button>
                    ` : ''}
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold" data-admin-reasignar-sos="${escapeHtml(s.id)}">
                      <i class="bi bi-arrow-left-right me-1"></i>Reasignar Clínica
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Gobernanza en 2 Tarjetas Limpias: Parámetros Financieros Globales + Temporadas Turísticas Oficiales de Cusco -->
    <div class="row g-4">
      <!-- Tarjeta 1: Parámetros Financieros Globales -->
      <div class="col-lg-5">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="mb-3">
            <span class="badge bg-warning-subtle text-dark border fw-bold mb-1">GOBERNANZA ECONÓMICA</span>
            <h6 class="fw-bold mb-0">
              <i class="bi bi-sliders text-warning me-2"></i>Parámetros Financieros Globales
            </h6>
            <div class="small text-secondary mt-1">
              Los cambios se aplican de inmediato en las cotizaciones y liquidaciones de toda la red Cusco.
            </div>
          </div>
          <form id="form-admin-parametros" novalidate>
            <div class="mb-2">
              <label class="form-label small fw-bold">Comisión Plataforma Paw Patita (%) *</label>
              <input type="number" step="0.5" min="5" max="30" required data-validate="number-range" class="form-control form-control-sm" id="param-comision"
                value="${escapeHtml(gob.parametros.comision_plataforma_pct)}">
              <div class="form-text small">Rango permitido: 5% a 30%.</div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Tipo de Cambio Referencial (S/ por $ 1 USD) *</label>
              <input type="number" step="0.01" min="3.0" max="5.0" required data-validate="number-range" class="form-control form-control-sm" id="param-tc"
                value="${escapeHtml(gob.parametros.tipo_cambio_usd)}">
              <div class="form-text small">Rango válido: S/ 3.00 a S/ 5.00.</div>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Tarifa Extra Baño Higiénico (S/) *</label>
              <input type="number" step="1" min="0" max="200" required data-validate="number-range" class="form-control form-control-sm" id="param-bano"
                value="${escapeHtml(gob.parametros.tarifa_bano_extra)}">
              <div class="form-text small">Rango válido: S/ 0 a S/ 200.</div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-bold">Número Oficial Yape/Plin de Garantía *</label>
              <input type="tel" inputmode="numeric" maxlength="9" required data-validate="yape-plin" class="form-control form-control-sm font-monospace" id="param-yape"
                value="${escapeHtml(String(gob.parametros.yape_oficial || '984000111').replace(/\D/g, ''))}">
              <div class="form-text small">Exactamente 9 dígitos numéricos empezando en 9.</div>
            </div>
            <button type="submit" class="btn btn-paw btn-sm w-100 fw-bold">
              <i class="bi bi-check2-circle me-1"></i>Guardar Parámetros Globales
            </button>
          </form>
        </div>
      </div>

      <!-- Tarjeta 2: Temporadas Turísticas Oficiales de Cusco -->
      <div class="col-lg-7">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <span class="badge bg-success-subtle text-success border fw-bold mb-1">CALENDARIO TARIFARIO CUSCO</span>
              <h6 class="fw-bold mb-0">
                <i class="bi bi-calendar-range-fill text-warning me-2"></i>Temporadas Turísticas Oficiales de Cusco
              </h6>
            </div>
            <span class="badge bg-light text-dark border">${gob.temporadas.length} temporada(s)</span>
          </div>

          <p class="small text-secondary mb-3">
            Recargos estacionales transparentes aplicados automáticamente durante festividades de alta demanda en la ciudad del Cusco.
          </p>

          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 small">
              <thead class="table-light">
                <tr>
                  <th>Temporada Oficial</th>
                  <th>Fechas</th>
                  <th class="text-center">Recargo</th>
                  <th class="text-end">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${gob.temporadas.map((t) => `
                  <tr>
                    <td>
                      <div class="fw-bold text-dark">
                        <i class="bi bi-sun-fill text-warning me-1"></i>${escapeHtml(t.nombre)}
                      </div>
                      ${t.descripcion ? `<div class="text-muted" style="font-size:0.74rem;">${escapeHtml(t.descripcion)}</div>` : ''}
                    </td>
                    <td class="text-nowrap">
                      <span class="badge bg-light text-dark border">${escapeHtml(t.rango)}</span>
                    </td>
                    <td class="text-center">
                      <span class="badge bg-warning-subtle text-dark border fw-bold">+${Number(t.recargo_porcentaje).toFixed(0)}%</span>
                    </td>
                    <td class="text-end">
                      <button type="button" class="btn btn-sm ${t.activa ? 'btn-success' : 'btn-outline-secondary'} py-0 px-2"
                        data-toggle-temporada="${escapeHtml(t.id)}">
                        ${t.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Conciliar o Exonerar Cargo Clínico S.O.S. (rpc_admin_conciliar_cobro_sos)
  workspace.querySelectorAll('[data-admin-conciliar-sos]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idSos = btn.getAttribute('data-admin-conciliar-sos');
      const inc = alertasNormalizadas.find((x) => x.id === idSos);
      if (!inc) return;

      const modalCobro = crearModalDinamico({
        titulo: `Conciliar / Exonerar Cargo Clínico — ${inc.codigo_sos}`,
        icono: 'bi-cash-coin',
        cuerpoHtml: `
          <div class="p-3 rounded-3 bg-light border mb-3 small">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <span class="badge bg-dark font-monospace me-1">${escapeHtml(inc.codigo_sos)}</span>
                ${renderBadgeEstadoCobroSos(inc.estado_cobro_sos, inc.costo_atencion_ref)}
                <div class="fw-bold text-dark mt-1">${escapeHtml(inc.mascota_nombre)} (${escapeHtml(inc.mascota_paw_id)}) • ${escapeHtml(inc.clinica_nombre)}</div>
              </div>
              <div class="fs-5 fw-bold text-dark">${formatMoneda(inc.costo_atencion_ref, moneda)}</div>
            </div>
            ${inc.comprobante_pago_sos ? `
              <div class="mt-2 pt-2 border-top text-secondary">
                <strong>Comprobante reportado por propietario:</strong> ${escapeHtml(inc.metodo_pago_sos || 'Pago')} —
                <span class="font-monospace">${escapeHtml(inc.comprobante_pago_sos)}</span>
                ${inc.fecha_pago_sos ? ` (${formatFechaEs(inc.fecha_pago_sos, true)})` : ''}
              </div>
            ` : `
              <div class="mt-2 pt-2 border-top text-warning-emphasis">
                <i class="bi bi-info-circle me-1"></i>El propietario aún no ha reportado un comprobante digital; puedes conciliar si el pago ingresó directo en clínica o exonerar el cargo.
              </div>
            `}
          </div>

          <form id="form-admin-conciliar-sos" novalidate>
            <div class="mb-3">
              <label class="form-label small fw-bold">Decisión Financiera sobre el Cargo Clínico *</label>
              <select class="form-select" id="admin-sos-cobro-accion" required>
                <option value="conciliar" selected>Conciliar Cargo (Pago Verificado / Liquidado)</option>
                <option value="exonerar">Exonerar Cargo Clínico (Cobertura Especial / Sin Cobro)</option>
              </select>
            </div>
            <div class="mb-2">
              <label class="form-label small fw-bold">Observación Administrativa * (mín. 5 caracteres)</label>
              <textarea class="form-control" id="admin-sos-cobro-obs" rows="3" required minlength="5" maxlength="300"
                placeholder="Detalla la verificación del comprobante o el motivo de la exoneración...">${escapeHtml(
                  inc.observacion_cobro_sos || `Verificación contable del cargo clínico ${inc.codigo_sos} completada por Administración.`
                )}</textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-paw fw-bold px-4" id="btn-confirmar-conciliar-sos">
            <i class="bi bi-check2-circle me-1"></i>Aplicar Decisión Financiera
          </button>
        `
      });

      const formConciliar = modalCobro.el.querySelector('#form-admin-conciliar-sos');
      attachFormValidation(formConciliar);

      modalCobro.el.querySelector('#btn-confirmar-conciliar-sos')?.addEventListener('click', async () => {
        if (!validateFormNow(formConciliar).valid) return;

        const accionCobro = modalCobro.el.querySelector('#admin-sos-cobro-accion').value;
        const obsCobro = modalCobro.el.querySelector('#admin-sos-cobro-obs').value.trim();

        showSpinner('Registrando conciliación financiera del cargo S.O.S....');
        try {
          const supabase = getSupabase();
          const estadoPrevio = inc.estado_cobro_sos;
          const nuevoEstado = accionCobro === 'exonerar' ? 'exonerado' : 'conciliado';

          if (supabase && isSupabaseConfigured() && !String(inc.id).startsWith('sos-')) {
            const { error } = await supabase.rpc('rpc_admin_conciliar_cobro_sos', {
              p_id_incidencia: inc.id,
              p_accion: accionCobro,
              p_observacion: obsCobro
            });
            if (error) throw error;
            await cargarDatosPanelAdministrador();
          } else {
            const ahoraIso = new Date().toISOString();
            adminState.alertasSos = adminState.alertasSos.map((item) => (
              item.id === inc.id || item.codigo_sos === inc.codigo_sos
                ? normalizarIncidenciaSos({
                    ...item,
                    estado_cobro_sos: nuevoEstado,
                    fecha_pago_sos: nuevoEstado === 'conciliado' ? (item.fecha_pago_sos || ahoraIso) : item.fecha_pago_sos,
                    observacion_cobro_sos: obsCobro
                  })
                : item
            ));
            localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(adminState.alertasSos));

            registrarAuditoriaAdmin({
              entidad: 'incidencias_emergencias',
              id_registro: inc.codigo_sos,
              accion: 'UPDATE',
              estado_anterior: estadoPrevio,
              estado_nuevo: nuevoEstado,
              detalle: `Cargo clínico ${inc.codigo_sos} (S/ ${inc.costo_atencion_ref.toFixed(2)}) marcado como ${nuevoEstado.toUpperCase()}: ${obsCobro}`,
              old_record: { codigo_sos: inc.codigo_sos, estado_cobro_sos: estadoPrevio },
              new_record: { codigo_sos: inc.codigo_sos, estado_cobro_sos: nuevoEstado }
            });
          }

          await modalCobro.cerrarAsync();
          renderContenidoPanelAdministrador(rootContainer);
          showToast(
            `Cargo clínico ${inc.codigo_sos} actualizado a "${nuevoEstado === 'exonerado' ? 'Exonerado' : 'Conciliado'}".`,
            'success',
            'Conciliación S.O.S.'
          );
        } catch (err) {
          handleSupabaseError(err, 'No se pudo conciliar el cargo clínico S.O.S.');
        } finally {
          hideSpinner();
        }
      });
    });
  });

  // Reasignar Clínica S.O.S.
  workspace.querySelectorAll('[data-admin-reasignar-sos]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idSos = btn.getAttribute('data-admin-reasignar-sos');
      const inc = adminState.alertasSos.find((x) => x.id === idSos);
      if (!inc) return;

      const modal = crearModalDinamico({
        titulo: `Reasignar Clínica Veterinaria — ${inc.codigo_sos}`,
        icono: 'bi-hospital-fill',
        cuerpoHtml: `
          <p class="small text-secondary">Selecciona la nueva Clínica Veterinaria Aliada activa en Cusco para derivar de inmediato el caso <strong>${escapeHtml(inc.codigo_sos)}</strong> (${escapeHtml(inc.mascota_nombre || 'Mascota')}):</p>
          <select class="form-select" id="select-reasignar-clinica">
            ${clinicasActivas.map((c) => `
              <option value="${escapeHtml(c.id)}" ${c.id === inc.id_clinica_derivada ? 'selected' : ''}>
                [${escapeHtml(c.horario_atencion)}] ${escapeHtml(c.nombre)} — ${escapeHtml(c.distrito_cusco)} (${escapeHtml(c.telefono_emergencia)})
              </option>
            `).join('')}
          </select>
        `,
        footerHtml: `
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
          <button type="button" class="btn btn-danger fw-bold" id="btn-confirmar-reasignar-sos">Confirmar Reasignación</button>
        `
      });

      modal.el.querySelector('#btn-confirmar-reasignar-sos')?.addEventListener('click', async () => {
        const nuevaClinicaId = modal.el.querySelector('#select-reasignar-clinica').value;
        const nuevaClinica = clinicasActivas.find((c) => c.id === nuevaClinicaId) || clinicasActivas[0];
        if (!nuevaClinica) {
          showToast('No hay clínicas activas disponibles para reasignación.', 'warning');
          return;
        }

        showSpinner('Reasignando clínica veterinaria de emergencia...');
        try {
          const supabase = getSupabase();
          if (supabase && isSupabaseConfigured() && !String(inc.id).startsWith('sos-')) {
            const { error } = await supabase.rpc('rpc_admin_reasignar_sos', {
              p_id_incidencia: inc.id,
              p_nueva_clinica: nuevaClinica.id
            });
            if (error) throw error;
            await cargarDatosPanelAdministrador();
          } else {
            const clinicaAnterior = inc.clinica_nombre || 'Clínica Anterior';
            adminState.alertasSos = adminState.alertasSos.map((item) => (
              item.id === inc.id
                ? {
                    ...item,
                    id_clinica_derivada: nuevaClinica.id,
                    clinica_nombre: nuevaClinica.nombre,
                    clinica_telefono: nuevaClinica.telefono_emergencia,
                    clinica_direccion: nuevaClinica.direccion
                  }
                : item
            ));
            localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(adminState.alertasSos));

            registrarAuditoriaAdmin({
              entidad: 'incidencias_emergencias',
              id_registro: inc.codigo_sos,
              accion: 'UPDATE',
              estado_anterior: clinicaAnterior,
              estado_nuevo: nuevaClinica.nombre,
              detalle: `Reasignación administrativa de S.O.S. ${inc.codigo_sos} hacia ${nuevaClinica.nombre} (${nuevaClinica.distrito_cusco}).`,
              old_record: { codigo_sos: inc.codigo_sos, id_clinica_derivada: clinicaAnterior },
              new_record: { codigo_sos: inc.codigo_sos, id_clinica_derivada: nuevaClinica.nombre }
            });
          }

          await modal.cerrarAsync();
          renderContenidoPanelAdministrador(rootContainer);
          showToast(`Alerta ${inc.codigo_sos} reasignada a ${nuevaClinica.nombre}.`, 'success');
        } catch (err) {
          handleSupabaseError(err, 'No se pudo reasignar la emergencia S.O.S.');
        } finally {
          hideSpinner();
        }
      });
    });
  });

  // Guardar parámetros financieros globales (persistencia real en BD)
  const formParams = workspace.querySelector('#form-admin-parametros');
  attachFormValidation(formParams);
  formParams?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateFormNow(formParams).valid) return;
    const comisionPct = parseFloat(workspace.querySelector('#param-comision').value) || 15;
    const tcUsd = parseFloat(workspace.querySelector('#param-tc').value) || 3.75;
    const tarifaBano = parseFloat(workspace.querySelector('#param-bano').value) || 25;
    const yapeOficial = workspace.querySelector('#param-yape').value.trim() || '984000111';

    const anterior = { ...gob.parametros };

    showSpinner('Guardando parámetros financieros globales...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured()) {
        const comisionDecimal = Number((comisionPct / 100).toFixed(4));
        const updates = [
          supabase
            .from('configuracion_plataforma')
            .update({ valor_numerico: comisionDecimal, valor_texto: `${comisionPct}%`, updated_at: new Date().toISOString() })
            .eq('clave', 'comision_plataforma_pct'),
          supabase
            .from('configuracion_plataforma')
            .update({ valor_numerico: tcUsd, valor_texto: 'PEN/USD', updated_at: new Date().toISOString() })
            .eq('clave', 'tipo_cambio_usd'),
          supabase
            .from('configuracion_plataforma')
            .update({ valor_numerico: tarifaBano, valor_texto: `S/ ${tarifaBano.toFixed(2)}`, updated_at: new Date().toISOString() })
            .eq('clave', 'tarifa_bano_extra'),
          supabase
            .from('configuracion_plataforma')
            .update({ valor_texto: yapeOficial, updated_at: new Date().toISOString() })
            .eq('clave', 'yape_oficial')
        ];

        const resultados = await Promise.all(updates);
        const fallo = resultados.find((r) => r.error);
        if (fallo?.error) throw fallo.error;

        await cargarDatosPanelAdministrador();
      } else {
        gob.parametros.comision_plataforma_pct = comisionPct;
        gob.parametros.tipo_cambio_usd = tcUsd;
        gob.parametros.tarifa_bano_extra = tarifaBano;
        gob.parametros.yape_oficial = yapeOficial;

        registrarAuditoriaAdmin({
          entidad: 'configuracion_plataforma',
          id_registro: 'PARAMS-GLOBAL',
          accion: 'UPDATE',
          estado_anterior: `Comisión ${anterior.comision_plataforma_pct}%`,
          estado_nuevo: `Comisión ${comisionPct}%`,
          detalle: `Parámetros actualizados: Comisión ${comisionPct}%, Tipo de cambio S/ ${tcUsd.toFixed(2)}, Baño S/ ${tarifaBano.toFixed(2)}.`,
          old_record: anterior,
          new_record: { ...gob.parametros }
        });
      }

      localStorage.setItem(STORAGE_KEY_CONFIG_ADMIN, JSON.stringify(adminState.gobernanza));
      renderContenidoPanelAdministrador(rootContainer);
      showToast('Parámetros financieros globales guardados y sincronizados.', 'success');
    } catch (err) {
      handleSupabaseError(err, 'No se pudieron guardar los parámetros globales.');
    } finally {
      hideSpinner();
    }
  });

  // Activar/Desactivar temporada turística oficial de Cusco
  workspace.querySelectorAll('[data-toggle-temporada]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idTemp = btn.getAttribute('data-toggle-temporada');
      const temp = gob.temporadas.find((t) => String(t.id) === String(idTemp));
      if (!temp) return;

      const nuevoEstado = !temp.activa;
      showSpinner('Actualizando estado de temporada turística...');
      try {
        const supabase = getSupabase();
        if (supabase && isSupabaseConfigured() && !String(temp.id).startsWith('temp-')) {
          const { error } = await supabase
            .from('temporadas_tarifas')
            .update({ activa: nuevoEstado })
            .eq('id', temp.id);
          if (error) throw error;
          await cargarDatosPanelAdministrador();
        } else {
          gob.temporadas = gob.temporadas.map((t) => (
            String(t.id) === String(idTemp) ? { ...t, activa: nuevoEstado } : t
          ));
          localStorage.setItem(STORAGE_KEY_CONFIG_ADMIN, JSON.stringify(gob));
        }

        renderSeccionCentralSosYGobernanza(workspace, rootContainer);
        showToast(`Temporada "${temp.nombre}" marcada como ${nuevoEstado ? 'Activa' : 'Inactiva'}.`, 'info');
      } catch (err) {
        handleSupabaseError(err, 'No se pudo actualizar el estado de la temporada.');
      } finally {
        hideSpinner();
      }
    });
  });
}

/* ==========================================================================
   SECCIÓN 6: BITÁCORA GLOBAL DE AUDITORÍA EN LENGUAJE HUMANO
   ========================================================================== */

const ENTIDAD_LABELS = {
  reservas: 'Reservas',
  pagos: 'Pagos',
  liquidaciones_cuidadores: 'Liquidaciones',
  cancelaciones_reembolsos: 'Cancelaciones y Disputas',
  perfiles_cuidadores: 'Cuidadores',
  clinicas_veterinarias: 'Clínicas Veterinarias',
  mascotas: 'Mascotas (PAW-ID)',
  incidencias_emergencias: 'Emergencias S.O.S.',
  configuracion_plataforma: 'Parámetros Globales',
  temporadas_tarifas: 'Temporadas Cusco',
  perfiles_usuarios: 'Usuarios',
  validaciones_veterinarias: 'Dictámenes Veterinarios',
  reportes_seguimiento: 'Muro Fotográfico'
};

const ESTADO_LABELS = {
  pendiente_confirmacion: 'Pendiente de Confirmación',
  confirmada: 'Confirmada',
  en_curso: 'En Curso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  en_disputa: 'En Disputa',
  pendiente: 'Pendiente',
  pendiente_revision: 'Pendiente de Revisión',
  aprobado: 'Aprobado',
  aprobada: 'Aprobada',
  activo: 'Activo',
  activa: 'Activa',
  rechazado: 'Rechazado',
  rechazada: 'Rechazada',
  suspendido: 'Suspendido',
  suspendida: 'Suspendida',
  en_garantia: 'En Garantía',
  disponible: 'Disponible',
  solicitado: 'Retiro Solicitado',
  pagado: 'Pagado',
  anulado: 'Anulado',
  procesado: 'Procesado',
  emitida: 'Alerta Emitida',
  en_atencion: 'En Atención Médica',
  estabilizada: 'Estabilizada',
  resuelta: 'Resuelta',
  validado: 'Validado',
  observado: 'Observado',
  vencido: 'Vencido',
  inactivo: 'Inactivo',
  inactiva: 'Inactiva'
};

const ROL_LABELS = {
  administrador: 'Administrador',
  veterinaria: 'Clínica Veterinaria',
  cuidador: 'Cuidador',
  propietario: 'Propietario',
  sistema: 'Sistema'
};

const CAMPO_LABELS = {
  estado_reserva: 'Estado de la Reserva',
  estado_pago: 'Estado del Pago',
  estado_sos: 'Estado de la Emergencia',
  estado_liquidacion: 'Estado de Liquidación',
  estado_postulacion: 'Estado de Postulación',
  estado_cuenta: 'Estado de Cuenta',
  estado_afiliacion: 'Estado de Afiliación',
  estado_tramite: 'Estado del Trámite',
  estado_validacion_vet: 'Dictamen Veterinario',
  diagnostico_clinico: 'Diagnóstico Clínico',
  tratamiento_aplicado: 'Tratamiento Aplicado',
  costo_emergencia: 'Costo de Emergencia',
  num_operacion_desembolso: 'N° de Operación Bancaria',
  cuenta_destino: 'Cuenta de Destino',
  monto_liquidado: 'Monto a Liquidar',
  monto_total: 'Monto Total',
  monto_reembolso: 'Monto de Reembolso',
  porcentaje_reembolso: 'Porcentaje de Reembolso',
  porcentaje_reembolso_solicitado: 'Reembolso Solicitado (%)',
  resolucion_admin: 'Resolución Administrativa',
  motivo_estado: 'Observación / Motivo',
  motivo_rechazo: 'Motivo de Observación',
  clinica_cmvp: 'Colegiatura CMVP',
  colegiatura_cmvp: 'Colegiatura CMVP',
  id_clinica_derivada: 'Clínica Derivada',
  comision_plataforma_pct: 'Comisión Plataforma (%)',
  tipo_cambio_usd: 'Tipo de Cambio USD',
  tarifa_bano_extra: 'Tarifa Baño Higiénico',
  yape_oficial: 'Cuenta Oficial Yape/Plin',
  activa: 'Estado Activo',
  nivel_severidad: 'Nivel de Severidad',
  ubicacion_emergencia: 'Ubicación de Emergencia',
  detalle: 'Detalle del Evento',
  estado: 'Estado',
  codigo_reserva: 'Código de Reserva',
  codigo_sos: 'Código S.O.S.',
  codigo_liquidacion: 'Código de Liquidación',
  codigo_cancelacion: 'Código de Expediente',
  codigo_cuidador: 'Código de Cuidador',
  codigo_clinica: 'Código de Clínica',
  paw_id: 'Carné PAW-ID'
};

const CAMPOS_RUIDO_AUDITORIA = new Set([
  'id',
  'created_at',
  'updated_at',
  'id_usuario',
  'id_reserva',
  'id_mascota',
  'id_cuidador',
  'id_propietario',
  'id_servicio',
  'id_pago',
  'id_cupon',
  'aprobado_por',
  'resuelto_por',
  'validado_por',
  'id_clinica_asociada',
  'id_usuario_responsable'
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function traducirEstadoHumano(valor) {
  if (valor === null || valor === undefined || valor === '' || valor === '—') return '—';
  const str = String(valor).trim();
  const key = str.toLowerCase();
  return ESTADO_LABELS[key] || str.replace(/_/g, ' ');
}

function formatearValorCampoHumano(clave, valor) {
  if (valor === null || valor === undefined || valor === '') return 'Sin registro';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (Array.isArray(valor)) return valor.length > 0 ? valor.join(', ') : 'Ninguno';
  if (typeof valor === 'object') {
    const pares = Object.entries(valor)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .slice(0, 4)
      .map(([k, v]) => `${CAMPO_LABELS[k] || k.replace(/_/g, ' ')}: ${v}`);
    return pares.length > 0 ? pares.join(' • ') : 'Registrado';
  }
  const str = String(valor).trim();
  if (ESTADO_LABELS[str.toLowerCase()]) return ESTADO_LABELS[str.toLowerCase()];
  if (clave.startsWith('monto_') || clave === 'costo_emergencia' || clave === 'tarifa_bano_extra') {
    const num = Number(str);
    if (!Number.isNaN(num)) return `S/ ${num.toFixed(2)}`;
  }
  if (clave.includes('porcentaje') || clave === 'comision_plataforma_pct') {
    const num = Number(str);
    if (!Number.isNaN(num)) return `${num <= 1 && clave === 'comision_plataforma_pct' ? (num * 100).toFixed(0) : num}%`;
  }
  if (clave === 'id_clinica_derivada' && UUID_REGEX.test(str)) {
    const cl = adminState.clinicas.find((c) => c.id === str);
    return cl ? cl.nombre : `Sede #${str.slice(0, 8).toUpperCase()}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
    return formatFechaEs(str, true);
  }
  if (UUID_REGEX.test(str)) return `Ref. #${str.slice(0, 8).toUpperCase()}`;
  return str;
}

function extraerCodigoLegibleAuditoria(item) {
  const newRec = item?.new_record && typeof item.new_record === 'object' ? item.new_record : {};
  const oldRec = item?.old_record && typeof item.old_record === 'object' ? item.old_record : {};
  const codigo =
    newRec.codigo_reserva || oldRec.codigo_reserva ||
    newRec.codigo_sos || oldRec.codigo_sos ||
    newRec.codigo_liquidacion || oldRec.codigo_liquidacion ||
    newRec.codigo_cancelacion || oldRec.codigo_cancelacion ||
    newRec.paw_id || oldRec.paw_id ||
    newRec.codigo_cuidador || oldRec.codigo_cuidador ||
    newRec.codigo_clinica || oldRec.codigo_clinica ||
    newRec.clave || oldRec.clave ||
    newRec.nombre || oldRec.nombre ||
    item.id_registro || item.id || '';

  const str = String(codigo).trim();
  if (!str) return 'Registro General';
  if (UUID_REGEX.test(str)) return `Registro #${str.slice(0, 8).toUpperCase()}`;
  return str;
}

function limpiarDetalleAuditoria(detalleRaw) {
  if (!detalleRaw || typeof detalleRaw !== 'string') return '';
  const lower = detalleRaw.toLowerCase();
  if (lower.includes('fn_auditar') || lower.includes('trigger') || lower.includes('postgresql')) {
    return '';
  }
  let texto = detalleRaw.trim();
  Object.entries(ENTIDAD_LABELS).forEach(([tabla, etiqueta]) => {
    const rx = new RegExp(`\\b${tabla}\\b`, 'gi');
    texto = texto.replace(rx, etiqueta);
  });
  return texto;
}

/**
 * Transforma un registro de auditoría en etiquetas, resumen conciso y tabla comparativa humana
 */
function formatearResumenCambioAuditoria(item) {
  const entidadKey = (item?.entidad || 'sistema').toLowerCase();
  const entidadLabel = ENTIDAD_LABELS[entidadKey] || entidadKey.replace(/_/g, ' ');
  const codigoLegible = extraerCodigoLegibleAuditoria(item);

  const estadoAnteriorLabel = traducirEstadoHumano(item?.estado_anterior);
  const estadoNuevoLabel = traducirEstadoHumano(item?.estado_nuevo);

  let actorNombre = (item?.actor_nombre || '').trim();
  if (!actorNombre || actorNombre.toLowerCase().includes('trigger') || actorNombre.toLowerCase().includes('postgresql')) {
    actorNombre = 'Sistema Automático';
  }
  const actorRolKey = (item?.actor_rol || 'sistema').toLowerCase();
  const actorRolLabel = ROL_LABELS[actorRolKey] || actorRolKey;

  const oldRec = item?.old_record && typeof item.old_record === 'object' ? item.old_record : {};
  const newRec = item?.new_record && typeof item.new_record === 'object' ? item.new_record : {};

  const claves = Array.from(new Set([...Object.keys(oldRec), ...Object.keys(newRec)]))
    .filter((k) => !CAMPOS_RUIDO_AUDITORIA.has(k));

  const cambiosTabla = [];
  claves.forEach((clave) => {
    const valOld = oldRec[clave];
    const valNew = newRec[clave];
    const same = JSON.stringify(valOld ?? null) === JSON.stringify(valNew ?? null);
    if (same && claves.length > 2) return;

    cambiosTabla.push({
      clave,
      campo: CAMPO_LABELS[clave] || clave.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      anterior: formatearValorCampoHumano(clave, valOld),
      nuevo: formatearValorCampoHumano(clave, valNew),
      modificado: !same
    });
  });

  if (cambiosTabla.length === 0) {
    cambiosTabla.push({
      clave: 'estado',
      campo: 'Estado del Registro',
      anterior: estadoAnteriorLabel,
      nuevo: estadoNuevoLabel,
      modificado: estadoAnteriorLabel !== estadoNuevoLabel
    });
  }

  const detalleLimpio = limpiarDetalleAuditoria(item?.detalle);
  let resumenFila = detalleLimpio;
  if (!resumenFila) {
    const partes = [];
    if (estadoAnteriorLabel !== '—' || estadoNuevoLabel !== '—') {
      partes.push(`Estado: ${estadoAnteriorLabel} → ${estadoNuevoLabel}`);
    }
    const extras = cambiosTabla
      .filter((c) => c.modificado && !c.clave.startsWith('estado'))
      .slice(0, 2)
      .map((c) => `${c.campo}: ${c.nuevo}`);
    partes.push(...extras);
    resumenFila = partes.join(' • ') || 'Actualización registrada automáticamente.';
  }

  return {
    entidadLabel,
    codigoLegible,
    estadoAnteriorLabel,
    estadoNuevoLabel,
    actorNombre,
    actorRolLabel,
    resumenFila,
    cambiosTabla
  };
}

function renderSeccionBitacoraAuditoria(workspace, rootContainer) {
  if (!workspace) return;

  const query = (adminState.filtroAuditoriaTexto || '').trim().toLowerCase();
  const desde = adminState.filtroAuditoriaFechaDesde;
  const hasta = adminState.filtroAuditoriaFechaHasta;

  const filtrados = adminState.auditoria.filter((a) => {
    if (adminState.filtroAuditoriaEntidad !== 'todas' && a.entidad !== adminState.filtroAuditoriaEntidad) return false;
    if (adminState.filtroAuditoriaRol !== 'todos' && (a.actor_rol || '').toLowerCase() !== adminState.filtroAuditoriaRol) return false;

    const fechaIso = (a.created_at || '').slice(0, 10);
    if (desde && fechaIso && fechaIso < desde) return false;
    if (hasta && fechaIso && fechaIso > hasta) return false;

    if (query) {
      const info = formatearResumenCambioAuditoria(a);
      const str = `${info.entidadLabel} ${info.codigoLegible} ${info.estadoAnteriorLabel} ${info.estadoNuevoLabel} ${info.actorNombre} ${info.actorRolLabel} ${info.resumenFila}`.toLowerCase();
      return str.includes(query);
    }
    return true;
  });

  workspace.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-dark text-warning fw-bold mb-1">TRAZABILIDAD INMUTABLE EN TIEMPO REAL</span>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-journal-check text-warning me-2"></i>Bitácora Global de Auditoría (${filtrados.length})
          </h5>
          <p class="text-secondary small mb-0">
            Historial automático de todos los cambios de estado, aprobaciones, emergencias y movimientos financieros de la red Cusco.
          </p>
        </div>

        <button type="button" class="btn btn-paw btn-sm fw-bold" id="btn-admin-exportar-auditoria-csv">
          <i class="bi bi-file-earmark-spreadsheet-fill me-1"></i>Exportar Bitácora a CSV
        </button>
      </div>

      <!-- Filtros Combinados: Módulo, Rol del Actor, Fechas y Buscador -->
      <div class="row g-2 mb-3">
        <div class="col-md-3">
          <label class="form-label small fw-bold mb-1">Módulo / Área</label>
          <select class="form-select form-select-sm" id="aud-filtro-entidad">
            <option value="todas" ${adminState.filtroAuditoriaEntidad === 'todas' ? 'selected' : ''}>Todos los módulos</option>
            <option value="reservas" ${adminState.filtroAuditoriaEntidad === 'reservas' ? 'selected' : ''}>Reservas</option>
            <option value="pagos" ${adminState.filtroAuditoriaEntidad === 'pagos' ? 'selected' : ''}>Pagos</option>
            <option value="liquidaciones_cuidadores" ${adminState.filtroAuditoriaEntidad === 'liquidaciones_cuidadores' ? 'selected' : ''}>Liquidaciones</option>
            <option value="cancelaciones_reembolsos" ${adminState.filtroAuditoriaEntidad === 'cancelaciones_reembolsos' ? 'selected' : ''}>Cancelaciones y Disputas</option>
            <option value="perfiles_cuidadores" ${adminState.filtroAuditoriaEntidad === 'perfiles_cuidadores' ? 'selected' : ''}>Cuidadores</option>
            <option value="clinicas_veterinarias" ${adminState.filtroAuditoriaEntidad === 'clinicas_veterinarias' ? 'selected' : ''}>Clínicas Veterinarias</option>
            <option value="mascotas" ${adminState.filtroAuditoriaEntidad === 'mascotas' ? 'selected' : ''}>Mascotas (PAW-ID)</option>
            <option value="incidencias_emergencias" ${adminState.filtroAuditoriaEntidad === 'incidencias_emergencias' ? 'selected' : ''}>Emergencias S.O.S.</option>
            <option value="configuracion_plataforma" ${adminState.filtroAuditoriaEntidad === 'configuracion_plataforma' ? 'selected' : ''}>Parámetros Globales</option>
          </select>
        </div>

        <div class="col-md-2">
          <label class="form-label small fw-bold mb-1">Rol del Actor</label>
          <select class="form-select form-select-sm" id="aud-filtro-rol">
            <option value="todos" ${adminState.filtroAuditoriaRol === 'todos' ? 'selected' : ''}>Todos los roles</option>
            <option value="administrador" ${adminState.filtroAuditoriaRol === 'administrador' ? 'selected' : ''}>Administrador</option>
            <option value="veterinaria" ${adminState.filtroAuditoriaRol === 'veterinaria' ? 'selected' : ''}>Clínica Veterinaria</option>
            <option value="cuidador" ${adminState.filtroAuditoriaRol === 'cuidador' ? 'selected' : ''}>Cuidador</option>
            <option value="propietario" ${adminState.filtroAuditoriaRol === 'propietario' ? 'selected' : ''}>Propietario</option>
          </select>
        </div>

        <div class="col-md-2">
          <label class="form-label small fw-bold mb-1">Fecha Desde</label>
          <input type="date" class="form-control form-control-sm" id="aud-filtro-desde" value="${escapeHtml(adminState.filtroAuditoriaFechaDesde)}">
        </div>

        <div class="col-md-2">
          <label class="form-label small fw-bold mb-1">Fecha Hasta</label>
          <input type="date" class="form-control form-control-sm" id="aud-filtro-hasta" value="${escapeHtml(adminState.filtroAuditoriaFechaHasta)}">
        </div>

        <div class="col-md-3">
          <label class="form-label small fw-bold mb-1">Búsqueda Textual</label>
          <input type="text" class="form-control form-control-sm" id="aud-filtro-texto"
            value="${escapeHtml(adminState.filtroAuditoriaTexto)}"
            placeholder="Código, responsable o resumen...">
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Fecha & Hora (Cusco)</th>
              <th>Módulo & Código</th>
              <th>Cambio de Estado</th>
              <th>Responsable</th>
              <th>Resumen del Cambio</th>
              <th class="text-end">Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${filtrados.length === 0 ? `
              <tr>
                <td colspan="6" class="text-center text-muted py-4">
                  <i class="bi bi-journal-x fs-4 d-block mb-1"></i>
                  No se encontraron registros con los filtros seleccionados.
                </td>
              </tr>
            ` : filtrados.map((a, idx) => {
              const info = formatearResumenCambioAuditoria(a);
              return `
                <tr>
                  <td class="text-muted text-nowrap">${formatFechaEs(a.created_at, true)}</td>
                  <td>
                    <span class="badge bg-light text-dark border">${escapeHtml(info.entidadLabel)}</span>
                    <div class="fw-bold font-monospace text-dark mt-1">${escapeHtml(info.codigoLegible)}</div>
                  </td>
                  <td>
                    <span class="badge bg-secondary-subtle text-secondary border">${escapeHtml(info.estadoAnteriorLabel)}</span>
                    <i class="bi bi-arrow-right mx-1 text-warning"></i>
                    <span class="badge bg-success-subtle text-success border fw-bold">${escapeHtml(info.estadoNuevoLabel)}</span>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark">${escapeHtml(info.actorNombre)}</div>
                    <span class="badge bg-dark" style="font-size:0.68rem;">${escapeHtml(info.actorRolLabel)}</span>
                  </td>
                  <td style="max-width: 320px;">${escapeHtml(info.resumenFila)}</td>
                  <td class="text-end text-nowrap">
                    <button type="button" class="btn btn-outline-dark btn-sm" data-aud-inspect="${idx}" title="Ver Detalle del Cambio">
                      <i class="bi bi-card-list me-1"></i>Ver Detalle
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  workspace.querySelector('#aud-filtro-entidad')?.addEventListener('change', (e) => {
    adminState.filtroAuditoriaEntidad = e.target.value;
    renderSeccionBitacoraAuditoria(workspace, rootContainer);
  });

  workspace.querySelector('#aud-filtro-rol')?.addEventListener('change', (e) => {
    adminState.filtroAuditoriaRol = e.target.value;
    renderSeccionBitacoraAuditoria(workspace, rootContainer);
  });

  workspace.querySelector('#aud-filtro-desde')?.addEventListener('change', (e) => {
    adminState.filtroAuditoriaFechaDesde = e.target.value;
    renderSeccionBitacoraAuditoria(workspace, rootContainer);
  });

  workspace.querySelector('#aud-filtro-hasta')?.addEventListener('change', (e) => {
    adminState.filtroAuditoriaFechaHasta = e.target.value;
    renderSeccionBitacoraAuditoria(workspace, rootContainer);
  });

  workspace.querySelector('#aud-filtro-texto')?.addEventListener('input', (e) => {
    adminState.filtroAuditoriaTexto = e.target.value;
    renderSeccionBitacoraAuditoria(workspace, rootContainer);
    const el = workspace.querySelector('#aud-filtro-texto');
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });

  // Exportar Bitácora a CSV con etiquetas legibles
  workspace.querySelector('#btn-admin-exportar-auditoria-csv')?.addEventListener('click', () => {
    const rows = filtrados.map((a) => {
      const info = formatearResumenCambioAuditoria(a);
      return {
        fecha_hora: a.created_at,
        modulo: info.entidadLabel,
        codigo: info.codigoLegible,
        estado_anterior: info.estadoAnteriorLabel,
        estado_nuevo: info.estadoNuevoLabel,
        responsable: info.actorNombre,
        rol: info.actorRolLabel,
        resumen: info.resumenFila
      };
    });
    exportarCsv(rows, `bitacora_auditoria_pawpatita_${getHoyIso()}.csv`);
    showToast('Bitácora de auditoría exportada a CSV.', 'info');
  });

  // Modal de Detalle Humano: Tabla comparativa Campo | Valor Anterior | Valor Nuevo
  workspace.querySelectorAll('[data-aud-inspect]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-aud-inspect'), 10);
      const item = filtrados[idx];
      if (!item) return;

      const info = formatearResumenCambioAuditoria(item);

      crearModalDinamico({
        titulo: `Detalle del Cambio — ${info.entidadLabel} (${info.codigoLegible})`,
        icono: 'bi-card-list',
        tamano: 'modal-lg',
        cuerpoHtml: `
          <div class="p-3 bg-light rounded-3 border mb-3 small">
            <div class="row g-2">
              <div class="col-md-6">
                <strong>Módulo:</strong> ${escapeHtml(info.entidadLabel)}<br>
                <strong>Referencia:</strong> <span class="font-monospace fw-bold">${escapeHtml(info.codigoLegible)}</span>
              </div>
              <div class="col-md-6">
                <strong>Responsable:</strong> ${escapeHtml(info.actorNombre)} (${escapeHtml(info.actorRolLabel)})<br>
                <strong>Fecha y Hora:</strong> ${formatFechaEs(item.created_at, true)}
              </div>
              <div class="col-12 pt-2 border-top mt-2">
                <strong>Resumen del Evento:</strong> ${escapeHtml(info.resumenFila)}
              </div>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-bordered table-sm align-middle mb-0 small">
              <thead class="table-light">
                <tr>
                  <th style="width: 30%;">Campo</th>
                  <th style="width: 35%;">Valor Anterior</th>
                  <th style="width: 35%;">Valor Nuevo</th>
                </tr>
              </thead>
              <tbody>
                ${info.cambiosTabla.map((fila) => `
                  <tr class="${fila.modificado ? 'table-warning bg-opacity-10' : ''}">
                    <td class="fw-semibold text-dark text-break">${escapeHtml(fila.campo)}</td>
                    <td class="text-secondary text-break">${escapeHtml(fila.anterior)}</td>
                    <td class="fw-semibold text-success text-break">${escapeHtml(fila.nuevo)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `,
        footerHtml: `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>`
      });
    });
  });
}

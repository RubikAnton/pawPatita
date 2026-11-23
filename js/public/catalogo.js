/**
 * Paw Patita Cusco v5.0 — Catálogo de Cuidadores con Filtros Reales
 * js/public/catalogo.js
 * 
 * Renderizado del catálogo completo de cuidadores aprobados (superando el límite de 3),
 * con filtrado reactivo instantáneo por distrito, categoría de servicio, precio,
 * estrellas mínimas, toggle de recojo en hotel, buscador por texto y ordenamiento.
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { formatMoneda, escapeHtml } from '../utils/formatters.js';
import { CUSCO_CONFIG } from '../config.js';
import { inicializarMapaCusco, actualizarMarcadoresMapa, centrarEnCoordenada } from './mapa-cusco.js';
import { getSessionData } from '../auth/auth.js';
import { navigateTo } from '../router.js';
import { showToast } from '../utils/ui-helpers.js';

// Semilla de cuidadores de respaldo para modo offline/demo y verificación inmediata
export const CUIDADORES_SEED = [
  {
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    codigo_cuidador: 'CUID-001',
    id_usuario: '50000000-0000-0000-0000-000000000011',
    nombre_completo: 'Valeria Huamán Delgado',
    nombre: 'Valeria',
    apellido: 'Huamán Delgado',
    distrito_cusco: 'Wanchaq',
    telefono: '+51 984 111 222',
    presentacion_corta: 'Amante de los perritos con casa amplia y patio seguro en Wanchaq. Reportes diarios con fotos.',
    descripcion_experiencia: 'Más de 4 años cuidando perritos de todas las razas y tamaños. Cuento con patio cercado, zonas de descanso acolchadas y botiquín de primeros auxilios.',
    anios_experiencia: 4,
    especialidades: ['Cuidados especiales', 'Primeros auxilios', 'Paseo recreativo', 'Administración de medicación oral'],
    idiomas: ['Español', 'Inglés'],
    tipo_vivienda: 'Casa con patio cercado',
    capacidad_max_mascotas: 3,
    acepta_cachorros: true,
    acepta_medicacion_oral: true,
    latitud: -13.5226,
    longitud: -71.9612,
    reputacion_promedio: 4.9,
    total_resenas: 18,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hu_ecode_principal: 'HU-101',
    tarifa_minima: 35.00,
    tarifa_maxima: 50.00,
    ofrece_recojo_hotel: true,
    categorias_servicio: ['Paseo', 'Hospedaje'],
    servicios_disponibles: [
      {
        id_oferta: '70000000-0000-0000-0000-000000000001',
        hu_ecode: 'HU-101',
        categoria: 'Paseo',
        tipo_servicio: 'Paseo Recreativo Canino (1 hora)',
        descripcion_servicio: 'Paseo seguro por parques de Wanchaq con hidratación y bolsa de premios.',
        tarifa_diaria_por_perro: 35.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 10.00
      },
      {
        id_oferta: '70000000-0000-0000-0000-000000000002',
        hu_ecode: 'HU-102',
        categoria: 'Hospedaje',
        tipo_servicio: 'Hospedaje Familiar 24 Horas',
        descripcion_servicio: 'Alojamiento cariñoso en casa, camas individuales y fotos cada 3 horas.',
        tarifa_diaria_por_perro: 50.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 15.00
      }
    ]
  },
  {
    id_cuidador: '60000000-0000-0000-0000-000000000002',
    codigo_cuidador: 'CUID-002',
    id_usuario: '50000000-0000-0000-0000-000000000012',
    nombre_completo: 'Diego Álvarez Tupayachi',
    nombre: 'Diego',
    apellido: 'Álvarez Tupayachi',
    distrito_cusco: 'Cusco Centro',
    telefono: '+51 984 222 333',
    presentacion_corta: 'Guía y cuidador bilingüe en Centro Histórico. Cuidado a domicilio en hoteles y paseos culturales.',
    descripcion_experiencia: 'Especialista en turistas que visitan Cusco. Cuido a tu mascota en tu hotel o Airbnb mientras vas a Machu Picchu o Vinicunca. Inglés fluido y comunicación por WhatsApp en tiempo real.',
    anios_experiencia: 5,
    especialidades: ['Turistas y hoteles', 'Bilingüe', 'Adaptación a la altura', 'Paseo Centro Histórico'],
    idiomas: ['Español', 'Inglés'],
    tipo_vivienda: 'Departamento seguro en Centro Histórico',
    capacidad_max_mascotas: 2,
    acepta_cachorros: false,
    acepta_medicacion_oral: true,
    latitud: -13.5167,
    longitud: -71.9788,
    reputacion_promedio: 5.0,
    total_resenas: 24,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hu_ecode_principal: 'HU-103',
    tarifa_minima: 38.00,
    tarifa_maxima: 55.00,
    ofrece_recojo_hotel: true,
    categorias_servicio: ['Domicilio Turístico', 'Paseo'],
    servicios_disponibles: [
      {
        id_oferta: '70000000-0000-0000-0000-000000000003',
        hu_ecode: 'HU-103',
        categoria: 'Domicilio Turístico',
        tipo_servicio: 'Cuidado Exclusivo en Hotel / Airbnb',
        descripcion_servicio: 'Acompañamiento y paseo en tu propio hospedaje de Cusco mientras realizas tours.',
        tarifa_diaria_por_perro: 55.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 0.00
      },
      {
        id_oferta: '70000000-0000-0000-0000-000000000004',
        hu_ecode: 'HU-104',
        categoria: 'Paseo',
        tipo_servicio: 'Paseo Cultural Centro & San Cristóbal',
        descripcion_servicio: 'Ruta relajada por plazoletas y miradores de Cusco Centro.',
        tarifa_diaria_por_perro: 38.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 5.00
      }
    ]
  },
  {
    id_cuidador: '60000000-0000-0000-0000-000000000003',
    codigo_cuidador: 'CUID-003',
    id_usuario: '50000000-0000-0000-0000-000000000013',
    nombre_completo: 'Camila Rojas Yábar',
    nombre: 'Camila',
    apellido: 'Rojas Yábar',
    distrito_cusco: 'San Sebastián',
    telefono: '+51 984 333 444',
    presentacion_corta: 'Casa de campo con amplio jardín verde en San Sebastián. Mucho amor y juegos libres.',
    descripcion_experiencia: 'Estudiante de veterinaria de últimos ciclos. Mi hogar cuenta con 200 m² de jardín cercado ideal para perritos enérgicos que necesitan correr y socializar sanamente.',
    anios_experiencia: 3,
    especialidades: ['Jardín amplio', 'Guardería diurna', 'Socialización canina', 'Atención geriátrica'],
    idiomas: ['Español'],
    tipo_vivienda: 'Casa quinta con jardín 200m2',
    capacidad_max_mascotas: 4,
    acepta_cachorros: true,
    acepta_medicacion_oral: true,
    latitud: -13.5318,
    longitud: -71.9365,
    reputacion_promedio: 4.8,
    total_resenas: 12,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    hu_ecode_principal: 'HU-105',
    tarifa_minima: 35.00,
    tarifa_maxima: 50.00,
    ofrece_recojo_hotel: true,
    categorias_servicio: ['Guardería', 'Hospedaje'],
    servicios_disponibles: [
      {
        id_oferta: '70000000-0000-0000-0000-000000000005',
        hu_ecode: 'HU-105',
        categoria: 'Guardería',
        tipo_servicio: 'Guardería de Día en Jardín Verde (08:00 - 18:00)',
        descripcion_servicio: 'Juegos libres en césped natural, piscina de pelotas y siesta tranquila.',
        tarifa_diaria_por_perro: 35.00,
        incluye_recojo_hotel: false,
        tarifa_recojo_extra: 15.00
      },
      {
        id_oferta: '70000000-0000-0000-0000-000000000006',
        hu_ecode: 'HU-106',
        categoria: 'Hospedaje',
        tipo_servicio: 'Hospedaje Campestre Familiar',
        descripcion_servicio: 'Noches dentro de casa y días de juego libre en el jardín.',
        tarifa_diaria_por_perro: 50.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 15.00
      }
    ]
  },
  {
    id_cuidador: '60000000-0000-0000-0000-000000000004',
    codigo_cuidador: 'CUID-004',
    id_usuario: '50000000-0000-0000-0000-000000000014',
    nombre_completo: 'Mateo Cornejo Paz',
    nombre: 'Mateo',
    apellido: 'Cornejo Paz',
    distrito_cusco: 'San Jerónimo',
    telefono: '+51 984 444 555',
    presentacion_corta: 'Espacio campestre tranquilo y seguro en San Jerónimo. Paseos extensos y atención paciente.',
    descripcion_experiencia: 'Especialista en razas medianas y grandes que disfrutan de paseos largos y naturaleza. Ambiente tranquilo libre de estrés urbano.',
    anios_experiencia: 2,
    especialidades: ['Razas grandes', 'Paseos extensos', 'Juegos al aire libre'],
    idiomas: ['Español', 'Quechua'],
    tipo_vivienda: 'Casa de campo con patio cerrado',
    capacidad_max_mascotas: 3,
    acepta_cachorros: false,
    acepta_medicacion_oral: false,
    latitud: -13.5449,
    longitud: -71.8842,
    reputacion_promedio: 4.7,
    total_resenas: 9,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hu_ecode_principal: 'HU-107',
    tarifa_minima: 30.00,
    tarifa_maxima: 45.00,
    ofrece_recojo_hotel: false,
    categorias_servicio: ['Paseo', 'Hospedaje'],
    servicios_disponibles: [
      {
        id_oferta: '70000000-0000-0000-0000-000000000007',
        hu_ecode: 'HU-107',
        categoria: 'Paseo',
        tipo_servicio: 'Paseo Campestre Extenso (1.5 horas)',
        descripcion_servicio: 'Rutas verdes por San Jerónimo con ejercicios de estimulación.',
        tarifa_diaria_por_perro: 30.00,
        incluye_recojo_hotel: false,
        tarifa_recojo_extra: 0.00
      },
      {
        id_oferta: '70000000-0000-0000-0000-000000000008',
        hu_ecode: 'HU-108',
        categoria: 'Hospedaje',
        tipo_servicio: 'Hospedaje Familiar Valle Sur',
        descripcion_servicio: 'Estadía campestre y tranquila con supervisión continua.',
        tarifa_diaria_por_perro: 45.00,
        incluye_recojo_hotel: false,
        tarifa_recojo_extra: 0.00
      }
    ]
  },
  {
    id_cuidador: '60000000-0000-0000-0000-000000000005',
    codigo_cuidador: 'CUID-005',
    id_usuario: '50000000-0000-0000-0000-000000000015',
    nombre_completo: 'Sofía Aguilar Bellido',
    nombre: 'Sofía',
    apellido: 'Aguilar Bellido',
    distrito_cusco: 'Santiago',
    telefono: '+51 984 555 666',
    presentacion_corta: 'Adiestradora canina básica y cuidadora con 6 años de experiencia en Santiago.',
    descripcion_experiencia: 'Cuento con formación en etología canina y refuerzo positivo. Trato perritos tímidos o con ansiedad por separación con calma y rutinas estructuradas.',
    anios_experiencia: 6,
    especialidades: ['Adiestramiento positivo', 'Ansiedad por separación', 'Perritos rescatados', 'Primeros auxilios'],
    idiomas: ['Español', 'Inglés'],
    tipo_vivienda: 'Casa familiar con terraza amplia',
    capacidad_max_mascotas: 2,
    acepta_cachorros: true,
    acepta_medicacion_oral: true,
    latitud: -13.5285,
    longitud: -71.9840,
    reputacion_promedio: 4.9,
    total_resenas: 15,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lunes', 'Miércoles', 'Viernes', 'Sábado', 'Domingo'],
    hu_ecode_principal: 'HU-109',
    tarifa_minima: 40.00,
    tarifa_maxima: 55.00,
    ofrece_recojo_hotel: true,
    categorias_servicio: ['Paseo', 'Hospedaje'],
    servicios_disponibles: [
      {
        id_oferta: '70000000-0000-0000-0000-000000000009',
        hu_ecode: 'HU-109',
        categoria: 'Paseo',
        tipo_servicio: 'Paseo con Refuerzo Positivo (1 hora)',
        descripcion_servicio: 'Caminata estructurada y ejercicios de olfato anti-estrés.',
        tarifa_diaria_por_perro: 40.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 10.00
      },
      {
        id_oferta: '70000000-0000-0000-0000-000000000010',
        hu_ecode: 'HU-110',
        categoria: 'Hospedaje',
        tipo_servicio: 'Hospedaje Cálido en Familia',
        descripcion_servicio: 'Atención personalizada sin jaulas ni estrés.',
        tarifa_diaria_por_perro: 55.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 12.00
      }
    ]
  },
  {
    id_cuidador: '60000000-0000-0000-0000-000000000006',
    codigo_cuidador: 'CUID-006',
    id_usuario: '50000000-0000-0000-0000-000000000016',
    nombre_completo: 'Andrés Zevallos Kalinowski',
    nombre: 'Andrés',
    apellido: 'Zevallos Kalinowski',
    distrito_cusco: 'San Blas',
    telefono: '+51 984 666 777',
    presentacion_corta: 'Cuidador en el barrio artesanal de San Blas. Casona tradicional y rutas a Sacsayhuamán.',
    descripcion_experiencia: 'Trilingüe (Español, Inglés y Francés). Ideal para turistas que se alojan en San Blas o Centro Histórico. Paseos hermosos por caminos incas y atención cariñosa.',
    anios_experiencia: 4,
    especialidades: ['Turismo internacional', 'Trilingüe', 'Paseos a Sacsayhuamán', 'Atención 24h'],
    idiomas: ['Español', 'Inglés', 'Francés'],
    tipo_vivienda: 'Casona colonial restaurada en San Blas',
    capacidad_max_mascotas: 3,
    acepta_cachorros: true,
    acepta_medicacion_oral: true,
    latitud: -13.5141,
    longitud: -71.9768,
    reputacion_promedio: 5.0,
    total_resenas: 21,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    hu_ecode_principal: 'HU-111',
    tarifa_minima: 45.00,
    tarifa_maxima: 60.00,
    ofrece_recojo_hotel: true,
    categorias_servicio: ['Domicilio Turístico', 'Hospedaje', 'Paseo'],
    servicios_disponibles: [
      {
        id_oferta: '70000000-0000-0000-0000-000000000011',
        hu_ecode: 'HU-111',
        categoria: 'Domicilio Turístico',
        tipo_servicio: 'Cuidado Turístico VIP San Blas & Centro',
        descripcion_servicio: 'Acompañamiento VIP en hoteles de San Blas mientras visitas atractivos turísticos.',
        tarifa_diaria_por_perro: 60.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 0.00
      },
      {
        id_oferta: '70000000-0000-0000-0000-000000000012',
        hu_ecode: 'HU-112',
        categoria: 'Paseo',
        tipo_servicio: 'Paseo Senderos Andinos (1.5 horas)',
        descripcion_servicio: 'Ruta panorámica hacia mirador de San Cristóbal y Sacsayhuamán.',
        tarifa_diaria_por_perro: 45.00,
        incluye_recojo_hotel: true,
        tarifa_recojo_extra: 0.00
      }
    ]
  }
];

// Estado reactivo global del catálogo
let todosLosCuidadores = [];
let cuidadoresFiltrados = [];
let filtrosActivos = {
  distrito: '',
  categoria: '',
  precioMax: 100,
  estrellasMin: 0,
  recojoHotel: false,
  busqueda: '',
  orden: 'rating_desc'
};

/**
 * Obtiene la lista completa de cuidadores aprobados desde Supabase (vista SQL v_catalogo_cuidadores)
 */
async function cargarCuidadoresDesdeBD() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    console.info('Usando cuidadores de semilla locales de Cusco (6 cuidadores aprobados en seed).');
    return CUIDADORES_SEED;
  }

  try {
    const { data, error } = await supabase
      .from('v_catalogo_cuidadores')
      .select('*')
      .order('reputacion_promedio', { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn('Fallo al consultar v_catalogo_cuidadores, usando semilla:', error);
      return CUIDADORES_SEED;
    }
    return data;
  } catch (err) {
    console.error('Error al consultar catálogo Supabase:', err);
    return CUIDADORES_SEED;
  }
}

/**
 * Renderiza la vista principal del catálogo en el contenedor principal
 * @param {HTMLElement} container 
 */
export async function renderCatalogo(container) {
  if (!container) return;

  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';

  container.innerHTML = `
    <div class="container py-4">
      <!-- CABECERA DEL CATÁLOGO -->
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 class="fw-bold mb-1"><i class="bi bi-compass text-warning me-2"></i>Catálogo de Cuidadores en Cusco</h2>
          <p class="text-secondary mb-0">Encuentra y reserva cuidadores verificados en tu distrito con disponibilidad y tarifas en vivo.</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-light text-dark border px-3 py-2 fs-6">
            <i class="bi bi-shield-check text-success me-1"></i> <span id="contador-cuidadores">Cargando...</span>
          </span>
          <button class="btn btn-outline-secondary btn-sm" id="btn-toggle-mapa" title="Alternar Mapa">
            <i class="bi bi-map me-1"></i> Ver Mapa
          </button>
        </div>
      </div>

      <!-- SECCIÓN DEL MAPA INTERACTIVO DE CUSCO (COLLAPSIBLE / EXPANDIBLE) -->
      <div id="seccion-mapa-wrapper" class="mapa-seccion-card mb-4">
        <div class="mapa-header-toolbar">
          <div class="d-flex align-items-center gap-2">
            <strong class="text-dark"><i class="bi bi-geo-alt-fill text-danger me-1"></i> Mapa Georreferenciado de Cusco</strong>
            <span class="badge bg-warning text-dark small">Leaflet.js + OpenStreetMap</span>
          </div>
          <div class="mapa-leyenda">
            <div class="leyenda-item">
              <span class="badge rounded-circle p-1" style="background: var(--pp-primary); width: 14px; height: 14px; display: inline-block;"></span>
              <span>Cuidador Aprobado</span>
            </div>
            <div class="leyenda-item">
              <span class="badge rounded-circle p-1" style="background: var(--pp-danger); width: 14px; height: 14px; display: inline-block;"></span>
              <span>Clínica 24h / Urgencias</span>
            </div>
          </div>
        </div>
        <div id="mapa-cusco-leaf"></div>
      </div>

      <!-- LAYOUT PRINCIPAL: SIDEBAR DE FILTROS + GRILLA DE TARJETAS -->
      <div class="catalogo-layout">
        <!-- SIDEBAR DE FILTROS REACTIVOS -->
        <aside class="filtros-sidebar" aria-label="Filtros del Catálogo">
          <div class="filtros-header">
            <span class="fw-bold text-dark"><i class="bi bi-funnel-fill text-warning me-1"></i> Filtros de Búsqueda</span>
            <button class="btn btn-link btn-sm text-muted p-0 text-decoration-none" id="btn-reset-filtros">
              <i class="bi bi-arrow-counterclockwise"></i> Limpiar
            </button>
          </div>

          <!-- Búsqueda por texto -->
          <div class="filtro-seccion">
            <label class="filtro-titulo" for="filtro-busqueda-input">
              <i class="bi bi-search"></i> Buscar Cuidador
            </label>
            <div class="input-group input-group-sm">
              <input type="text" class="form-control" id="filtro-busqueda-input" placeholder="Nombre, habilidad...">
              <button class="btn btn-outline-secondary" type="button" id="btn-clear-search">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>

          <!-- Filtro por Distrito de Cusco -->
          <div class="filtro-seccion">
            <div class="filtro-titulo">
              <i class="bi bi-geo-alt"></i> Distrito de Cusco
            </div>
            <div class="distritos-chips" id="distritos-chips-container">
              <span class="chip-distrito active" data-distrito="">Todos</span>
              ${CUSCO_CONFIG.DISTRITOS.map(d => `
                <span class="chip-distrito" data-distrito="${escapeHtml(d)}">${escapeHtml(d)}</span>
              `).join('')}
            </div>
          </div>

          <!-- Filtro por Categoría de Servicio -->
          <div class="filtro-seccion">
            <div class="filtro-titulo">
              <i class="bi bi-tags"></i> Tipo de Servicio
            </div>
            <div class="d-flex flex-column gap-1">
              <label class="filtro-item-check">
                <span class="small"><i class="bi bi-grid text-muted me-1"></i> Todos los servicios</span>
                <input type="radio" name="filtro-categoria" value="" checked>
              </label>
              ${CUSCO_CONFIG.SERVICIOS_CATEGORIAS.map(cat => `
                <label class="filtro-item-check">
                  <span class="small"><i class="bi ${escapeHtml(cat.icono)} text-warning me-1"></i> ${escapeHtml(cat.nombre)}</span>
                  <input type="radio" name="filtro-categoria" value="${escapeHtml(cat.id)}">
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Toggle Recojo en Hotel (Turistas) -->
          <div class="filtro-seccion">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" role="switch" id="filtro-recojo-hotel">
              <label class="form-check-label small fw-bold text-dark" for="filtro-recojo-hotel">
                <i class="bi bi-building text-info me-1"></i> Con recojo en hotel / Airbnb
              </label>
            </div>
          </div>

          <!-- Filtro por Rango de Precio Máximo -->
          <div class="filtro-seccion">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <div class="filtro-titulo mb-0"><i class="bi bi-cash"></i> Tarifa Máxima</div>
              <span class="badge bg-light text-dark border fw-bold" id="label-precio-max">
                ${formatMoneda(80, currentCurrency)}
              </span>
            </div>
            <input type="range" class="form-range" id="filtro-precio-slider" min="30" max="120" step="5" value="80">
            <div class="d-flex justify-content-between text-muted" style="font-size: 0.72rem;">
              <span>Min S/ 30</span>
              <span>Max S/ 120</span>
            </div>
          </div>

          <!-- Filtro por Calificación Mínima (Estrellas) -->
          <div class="filtro-seccion mb-0">
            <div class="filtro-titulo">
              <i class="bi bi-star"></i> Calificación Mínima
            </div>
            <div class="estrellas-selector" id="filtro-estrellas-container">
              <button type="button" class="estrella-btn active" data-stars="0">Todas</button>
              <button type="button" class="estrella-btn" data-stars="4">4.0 ★</button>
              <button type="button" class="estrella-btn" data-stars="4.5">4.5 ★</button>
              <button type="button" class="estrella-btn" data-stars="5">5.0 ★</button>
            </div>
          </div>
        </aside>

        <!-- COLUMNA PRINCIPAL: BARRA DE ORDENAMIENTO + GRILLA -->
        <section>
          <!-- Barra de Ordenamiento y Resultados -->
          <div class="card card-paw p-3 mb-3 border-0 shadow-sm d-flex flex-row justify-content-between align-items-center flex-wrap gap-2">
            <div class="small text-muted" id="resumen-filtros-texto">
              Mostrando todos los cuidadores verificados en Cusco.
            </div>
            <div class="d-flex align-items-center gap-2">
              <label for="select-ordenar-cuidadores" class="small fw-bold text-muted mb-0">Ordenar por:</label>
              <select id="select-ordenar-cuidadores" class="form-select form-select-sm" style="width: auto;">
                <option value="rating_desc">Mejor calificados (Estrellas)</option>
                <option value="price_asc">Menor tarifa diaria</option>
                <option value="price_desc">Mayor tarifa diaria</option>
                <option value="exp_desc">Más años de experiencia</option>
              </select>
            </div>
          </div>

          <!-- Grilla de Tarjetas de Cuidadores -->
          <div class="grid-cuidadores" id="grid-cuidadores-container">
            <div class="text-center py-5 col-12">
              <div class="spinner-border text-warning" role="status"></div>
              <p class="text-muted small mt-2">Cargando cuidadores certificados en Cusco...</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  // Cargar datos
  todosLosCuidadores = await cargarCuidadoresDesdeBD();
  cuidadoresFiltrados = [...todosLosCuidadores];

  // Inicializar componentes y mapa
  inicializarMapaCusco('mapa-cusco-leaf');
  actualizarMarcadoresMapa(cuidadoresFiltrados);
  configurarEventosFiltros();
  aplicarFiltros();
}

/**
 * Configura los event listeners para todos los controles reactivos de filtros
 */
function configurarEventosFiltros() {
  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';

  // 1. Buscador por texto
  const inputBusqueda = document.getElementById('filtro-busqueda-input');
  inputBusqueda?.addEventListener('input', (e) => {
    filtrosActivos.busqueda = e.target.value.trim().toLowerCase();
    aplicarFiltros();
  });

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    if (inputBusqueda) {
      inputBusqueda.value = '';
      filtrosActivos.busqueda = '';
      aplicarFiltros();
    }
  });

  // 2. Chips de Distrito
  document.querySelectorAll('.chip-distrito').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-distrito').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filtrosActivos.distrito = chip.getAttribute('data-distrito') || '';
      aplicarFiltros();
    });
  });

  // 3. Radios de Categoría
  document.querySelectorAll('input[name="filtro-categoria"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      filtrosActivos.categoria = e.target.value;
      aplicarFiltros();
    });
  });

  // 4. Switch Recojo en Hotel
  const checkHotel = document.getElementById('filtro-recojo-hotel');
  checkHotel?.addEventListener('change', (e) => {
    filtrosActivos.recojoHotel = e.target.checked;
    aplicarFiltros();
  });

  // 5. Slider de Precio
  const sliderPrecio = document.getElementById('filtro-precio-slider');
  const labelPrecio = document.getElementById('label-precio-max');
  sliderPrecio?.addEventListener('input', (e) => {
    filtrosActivos.precioMax = Number(e.target.value);
    if (labelPrecio) {
      labelPrecio.textContent = formatMoneda(filtrosActivos.precioMax, currentCurrency);
    }
    aplicarFiltros();
  });

  // 6. Selector de Estrellas
  document.querySelectorAll('#filtro-estrellas-container .estrella-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-estrellas-container .estrella-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtrosActivos.estrellasMin = Number(btn.getAttribute('data-stars') || 0);
      aplicarFiltros();
    });
  });

  // 7. Ordenamiento
  const selectOrden = document.getElementById('select-ordenar-cuidadores');
  selectOrden?.addEventListener('change', (e) => {
    filtrosActivos.orden = e.target.value;
    aplicarFiltros();
  });

  // 8. Botón Limpiar Filtros
  document.getElementById('btn-reset-filtros')?.addEventListener('click', () => {
    filtrosActivos = {
      distrito: '',
      categoria: '',
      precioMax: 100,
      estrellasMin: 0,
      recojoHotel: false,
      busqueda: '',
      orden: 'rating_desc'
    };

    if (inputBusqueda) inputBusqueda.value = '';
    document.querySelectorAll('.chip-distrito').forEach(c => c.classList.remove('active'));
    document.querySelector('.chip-distrito[data-distrito=""]')?.classList.add('active');
    const radioTodos = document.querySelector('input[name="filtro-categoria"][value=""]');
    if (radioTodos) radioTodos.checked = true;
    if (checkHotel) checkHotel.checked = false;
    if (sliderPrecio) sliderPrecio.value = 80;
    if (labelPrecio) labelPrecio.textContent = formatMoneda(80, currentCurrency);
    document.querySelectorAll('#filtro-estrellas-container .estrella-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#filtro-estrellas-container .estrella-btn[data-stars="0"]')?.classList.add('active');
    if (selectOrden) selectOrden.value = 'rating_desc';

    aplicarFiltros();
  });

  // 9. Alternar Visibilidad del Mapa
  document.getElementById('btn-toggle-mapa')?.addEventListener('click', () => {
    const mapaWrapper = document.getElementById('seccion-mapa-wrapper');
    if (mapaWrapper) {
      if (mapaWrapper.style.display === 'none') {
        mapaWrapper.style.display = 'block';
        window.dispatchEvent(new Event('resize')); // Ajustar tiles Leaflet
      } else {
        mapaWrapper.style.display = 'none';
      }
    }
  });
}

/**
 * Aplica los filtros reactivos sobre la lista de cuidadores y actualiza la UI y el mapa
 */
export function aplicarFiltros() {
  cuidadoresFiltrados = todosLosCuidadores.filter(c => {
    // 1. Filtro Distrito
    if (filtrosActivos.distrito && c.distrito_cusco !== filtrosActivos.distrito) {
      return false;
    }

    // 2. Filtro Categoría de Servicio
    if (filtrosActivos.categoria) {
      const categorias = c.categorias_servicio || [];
      if (!categorias.includes(filtrosActivos.categoria)) {
        return false;
      }
    }

    // 3. Filtro Recojo en Hotel
    if (filtrosActivos.recojoHotel && !c.ofrece_recojo_hotel) {
      return false;
    }

    // 4. Filtro Precio Máximo
    const tarifaMin = Number(c.tarifa_minima || 0);
    if (tarifaMin > filtrosActivos.precioMax) {
      return false;
    }

    // 5. Filtro Calificación Mínima
    const rating = Number(c.reputacion_promedio || 0);
    if (rating < filtrosActivos.estrellasMin) {
      return false;
    }

    // 6. Buscador de Texto (Nombre, distrito, especialidad, presentación)
    if (filtrosActivos.busqueda) {
      const q = filtrosActivos.busqueda;
      const haystack = [
        c.nombre_completo,
        c.distrito_cusco,
        c.presentacion_corta,
        c.descripcion_experiencia,
        (c.especialidades || []).join(' ')
      ].join(' ').toLowerCase();

      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Ordenar lista
  cuidadoresFiltrados.sort((a, b) => {
    switch (filtrosActivos.orden) {
      case 'rating_desc':
        return (b.reputacion_promedio || 0) - (a.reputacion_promedio || 0);
      case 'price_asc':
        return (a.tarifa_minima || 0) - (b.tarifa_minima || 0);
      case 'price_desc':
        return (b.tarifa_minima || 0) - (a.tarifa_minima || 0);
      case 'exp_desc':
        return (b.anios_experiencia || 0) - (a.anios_experiencia || 0);
      default:
        return 0;
    }
  });

  // Actualizar contador y resumen
  const contadorEl = document.getElementById('contador-cuidadores');
  if (contadorEl) {
    contadorEl.textContent = `${cuidadoresFiltrados.length} disponibles`;
  }

  const resumenTextoEl = document.getElementById('resumen-filtros-texto');
  if (resumenTextoEl) {
    const distritoTxt = filtrosActivos.distrito ? `en ${filtrosActivos.distrito}` : 'en todo Cusco';
    const catTxt = filtrosActivos.categoria ? `para ${filtrosActivos.categoria}` : 'para todos los servicios';
    resumenTextoEl.innerHTML = `Mostrando <strong>${cuidadoresFiltrados.length}</strong> cuidadores aprobados ${distritoTxt} ${catTxt}.`;
  }

  // Renderizar tarjetas y actualizar pines en el mapa
  renderizarTarjetasCuidadores(cuidadoresFiltrados);
  actualizarMarcadoresMapa(cuidadoresFiltrados);
}

/**
 * Renderiza las tarjetas de cuidadores en la grilla
 * @param {Array} cuidadores 
 */
function renderizarTarjetasCuidadores(cuidadores) {
  const container = document.getElementById('grid-cuidadores-container');
  if (!container) return;

  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';

  if (!cuidadores || cuidadores.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="card card-paw p-5 border-0 shadow-sm mx-auto" style="max-width: 480px;">
          <i class="bi bi-search text-muted fs-1 mb-2"></i>
          <h5 class="fw-bold text-dark">No se encontraron cuidadores con estos filtros</h5>
          <p class="text-secondary small mb-3">
            Intenta ampliar el rango de precio, seleccionar "Todos los distritos" o borrar el término de búsqueda.
          </p>
          <button class="btn btn-paw-outline btn-sm mx-auto" onclick="document.getElementById('btn-reset-filtros')?.click()">
            <i class="bi bi-arrow-counterclockwise me-1"></i> Restablecer Filtros
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = cuidadores.map(c => {
    const estrellas = Number(c.reputacion_promedio || 5.0).toFixed(1);
    const estrellasEnteras = Math.floor(estrellas);
    const tieneMitad = estrellas - estrellasEnteras >= 0.5;
    const estrellasVacias = 5 - estrellasEnteras - (tieneMitad ? 1 : 0);

    return `
      <article class="card-cuidador" id="card-cuidador-${escapeHtml(c.codigo_cuidador)}">
        <!-- Banner superior con código HU -->
        <div class="cuidador-header-banner ${c.ofrece_recojo_hotel ? 'banner-turistico' : ''}">
          <span class="badge-hu-code">
            <i class="bi bi-shield-check text-success me-1"></i>${escapeHtml(c.hu_ecode_principal || c.codigo_cuidador)}
          </span>
        </div>

        <!-- Avatar circular con badge de verificado -->
        <div class="cuidador-avatar-container">
          <img src="${escapeHtml(c.foto_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80')}" 
               alt="${escapeHtml(c.nombre_completo)}"
               class="cuidador-avatar"
               onerror="this.src='https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80'">
          <span class="badge-verificado-icon" title="Antecedentes Verificados">
            <i class="bi bi-check-lg"></i>
          </span>
        </div>

        <!-- Cuerpo de la tarjeta -->
        <div class="cuidador-body">
          <div class="d-flex justify-content-between align-items-start">
            <h5 class="cuidador-nombre mb-1">${escapeHtml(c.nombre_completo)}</h5>
          </div>

          <div class="cuidador-distrito">
            <i class="bi bi-geo-alt-fill text-danger"></i>
            <span>${escapeHtml(c.distrito_cusco || 'Cusco')}</span>
            <span class="text-muted">• ${escapeHtml(c.anios_experiencia || 1)} años exp.</span>
          </div>

          <!-- Puntuación visual con estrellas -->
          <div class="cuidador-calificacion-row">
            <div class="estrellas-score">
              ${'<i class="bi bi-star-fill"></i>'.repeat(estrellasEnteras)}
              ${tieneMitad ? '<i class="bi bi-star-half"></i>' : ''}
              ${'<i class="bi bi-star"></i>'.repeat(estrellasVacias)}
              <span class="score-num">${estrellas}</span>
            </div>
            <span class="resenas-count">(${escapeHtml(c.total_resenas || 0)} reseñas)</span>
          </div>

          <p class="cuidador-bio">
            ${escapeHtml(c.presentacion_corta || c.descripcion_experiencia || 'Cuidador apasionado y comprometido con el bienestar de tu mascota en Cusco.')}
          </p>

          <!-- Badges de Servicios y Habilidades -->
          <div class="cuidador-tags">
            ${(c.categorias_servicio || []).map(cat => `
              <span class="tag-servicio"><i class="bi bi-tag-fill me-1"></i>${escapeHtml(cat)}</span>
            `).join('')}
            ${c.ofrece_recojo_hotel ? `
              <span class="tag-servicio tag-hotel" title="Recojo disponible en hospedajes de Cusco">
                <i class="bi bi-building me-1"></i>Recojo en hotel
              </span>
            ` : ''}
            ${(c.especialidades || []).slice(0, 2).map(esp => `
              <span class="tag-servicio tag-especialidad">${escapeHtml(esp)}</span>
            `).join('')}
          </div>

          <!-- Pie de tarjeta con precio y CTA -->
          <div class="cuidador-footer">
            <div class="cuidador-precio-box">
              <span class="precio-desde-label">Desde</span>
              <div>
                <span class="precio-monto">${formatMoneda(c.tarifa_minima || 35, currentCurrency)}</span>
                <span class="precio-unidad">/ día</span>
              </div>
            </div>

            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm" onclick="window.abrirModalPerfil('${escapeHtml(c.codigo_cuidador)}')" title="Ver Perfil Completo">
                <i class="bi bi-eye"></i> Perfil
              </button>
              <button class="btn btn-reservar-cuidador btn-sm" onclick="window.iniciarReservaCon('${escapeHtml(c.codigo_cuidador)}', '${escapeHtml(c.id_cuidador)}')">
                <i class="bi bi-calendar-check me-1"></i> Reservar
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Abre el modal con el perfil completo y detallado del cuidador
 * @param {string} codigoCuidador 
 */
window.abrirModalPerfil = function(codigoCuidador) {
  const cuidador = todosLosCuidadores.find(c => c.codigo_cuidador === codigoCuidador);
  if (!cuidador) return;

  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';
  const modalContentEl = document.getElementById('modal-perfil-cuidador-content');
  if (!modalContentEl) return;

  modalContentEl.innerHTML = `
    <!-- Header del Perfil -->
    <div class="modal-perfil-header">
      <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      <div class="modal-avatar-wrapper">
        <img src="${escapeHtml(cuidador.foto_url)}" alt="${escapeHtml(cuidador.nombre_completo)}" class="modal-cuidador-avatar">
      </div>
    </div>

    <!-- Cuerpo del Modal -->
    <div class="modal-body p-4 pt-5">
      <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
        <div>
          <h4 class="fw-bold mb-0 text-dark">${escapeHtml(cuidador.nombre_completo)}</h4>
          <div class="text-muted small">
            <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(cuidador.distrito_cusco || 'Cusco')} •
            <i class="bi bi-clock-history text-primary me-1"></i>${escapeHtml(cuidador.anios_experiencia || 1)} años de experiencia
          </div>
        </div>
        <div class="text-end">
          <div class="badge bg-warning text-dark fs-6 px-3 py-1">
            <i class="bi bi-star-fill me-1"></i>${Number(cuidador.reputacion_promedio || 5.0).toFixed(1)} (${escapeHtml(cuidador.total_resenas || 0)} reseñas)
          </div>
          <div class="small text-muted mt-1">Código: <code>${escapeHtml(cuidador.codigo_cuidador)}</code></div>
        </div>
      </div>

      <hr class="my-3">

      <!-- Sobre mí y vivienda -->
      <h6 class="fw-bold text-dark"><i class="bi bi-person-lines-fill text-warning me-2"></i>Sobre mi cuidado y experiencia</h6>
      <p class="text-secondary small mb-3">${escapeHtml(cuidador.descripcion_experiencia || cuidador.presentacion_corta)}</p>

      <div class="row g-2 mb-4 small">
        <div class="col-sm-6">
          <div class="p-2 border rounded bg-light">
            <strong>Tipo de Vivienda:</strong> ${escapeHtml(cuidador.tipo_vivienda || 'Casa familiar')}
          </div>
        </div>
        <div class="col-sm-6">
          <div class="p-2 border rounded bg-light">
            <strong>Capacidad Máxima:</strong> Hasta ${escapeHtml(cuidador.capacidad_max_mascotas || 2)} mascotas
          </div>
        </div>
        <div class="col-sm-6">
          <div class="p-2 border rounded bg-light">
            <strong>Idiomas:</strong> ${(cuidador.idiomas || ['Español']).join(', ')}
          </div>
        </div>
        <div class="col-sm-6">
          <div class="p-2 border rounded bg-light">
            <strong>Recojo en Hotel:</strong> ${cuidador.ofrece_recojo_hotel ? 'Disponible' : 'Solo entrega en domicilio'}
          </div>
        </div>
      </div>

      <!-- Foto del Hogar -->
      ${cuidador.foto_hogar_url ? `
        <h6 class="fw-bold text-dark mb-2"><i class="bi bi-house-door text-warning me-2"></i>Espacio de Estadía en Cusco</h6>
        <div class="mb-4 rounded overflow-hidden shadow-sm" style="max-height: 220px;">
          <img src="${escapeHtml(cuidador.foto_hogar_url)}" alt="Hogar del cuidador" style="width: 100%; height: 220px; object-fit: cover;">
        </div>
      ` : ''}

      <!-- Tabla de Servicios y Tarifas -->
      <h6 class="fw-bold text-dark mb-2"><i class="bi bi-list-check text-warning me-2"></i>Servicios Disponibles y Tarifas</h6>
      <div class="table-responsive mb-4">
        <table class="table table-bordered table-sm servicios-table mb-0 align-middle">
          <thead>
            <tr>
              <th>Código</th>
              <th>Servicio</th>
              <th>Descripción</th>
              <th class="text-end">Tarifa</th>
            </tr>
          </thead>
          <tbody>
            ${(cuidador.servicios_disponibles || []).map(s => `
              <tr>
                <td><code class="fw-bold">${escapeHtml(s.hu_ecode)}</code></td>
                <td><strong>${escapeHtml(s.tipo_servicio)}</strong></td>
                <td class="small text-muted">${escapeHtml(s.descripcion_servicio)}</td>
                <td class="text-end fw-bold text-dark">${formatMoneda(s.tarifa_diaria_por_perro, currentCurrency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Reseñas Destacadas -->
      <h6 class="fw-bold text-dark mb-2"><i class="bi bi-chat-heart text-warning me-2"></i>Reseña Verificada de Propietario</h6>
      <div class="p-3 border rounded bg-light small mb-3">
        <div class="d-flex justify-content-between mb-1">
          <strong>Lucía M. (Propietaria Local)</strong>
          <span class="text-warning"><i class="bi bi-star-fill"></i> 5.0</span>
        </div>
        <p class="text-muted fst-italic mb-1">
          "Excelente atención y comunicación continua por WhatsApp y fotos. Mi perrito regresó muy feliz y relajado."
        </p>
        <div class="text-primary fw-bold" style="font-size: 0.75rem;">
          <i class="bi bi-arrow-return-right me-1"></i>Respuesta de ${escapeHtml(cuidador.nombre)}: "¡Gracias Lucía! Fue un placer total cuidar de tu perrito."
        </div>
      </div>
    </div>

    <!-- Footer del Modal -->
    <div class="modal-footer bg-light border-top d-flex justify-content-between">
      <div>
        <span class="small text-muted">Desde </span>
        <strong class="h5 mb-0 text-dark">${formatMoneda(cuidador.tarifa_minima || 35, currentCurrency)}</strong>
        <span class="small text-muted"> / día</span>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
        <button type="button" class="btn btn-paw" onclick="window.iniciarReservaCon('${escapeHtml(cuidador.codigo_cuidador)}', '${escapeHtml(cuidador.id_cuidador)}')">
          <i class="bi bi-calendar-check me-1"></i> Reservar con este Cuidador
        </button>
      </div>
    </div>
  `;

  // Mostrar modal de Bootstrap
  const modalEl = document.getElementById('modal-perfil-cuidador');
  if (modalEl && window.bootstrap?.Modal) {
    const bsModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
  }
};

/**
 * Inicia el flujo de reserva con el cuidador seleccionado
 * @param {string} codigoCuidador 
 * @param {string} idCuidador 
 */
window.iniciarReservaCon = function(codigoCuidador, idCuidador) {
  // Cerrar modal de perfil si estuviera abierto
  const modalEl = document.getElementById('modal-perfil-cuidador');
  if (modalEl && window.bootstrap?.Modal) {
    const bsModal = window.bootstrap.Modal.getInstance(modalEl);
    if (bsModal) bsModal.hide();
  }

  const { user, profile } = getSessionData();

  if (!user || !profile) {
    showToast('Inicia sesión o regístrate como Propietario para realizar tu reserva.', 'info', 'Acceso Requerido');
    const loginModalEl = document.getElementById('modal-login');
    if (loginModalEl && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(loginModalEl).show();
    }
    return;
  }

  if (profile.rol !== 'propietario' && profile.rol !== 'administrador') {
    showToast('Solo los usuarios con rol Propietario pueden solicitar reservas.', 'warning', 'Rol no admitido');
    return;
  }

  // Guardar preferencia de cuidador y navegar al Wizard del Propietario (Fase 5)
  localStorage.setItem('paw_reserva_cuidador_codigo', codigoCuidador);
  localStorage.setItem('paw_reserva_cuidador_id', idCuidador);

  showToast(`Iniciando reserva con ${codigoCuidador}...`, 'success', 'Wizard de Reserva');
  navigateTo('#/propietario');
};

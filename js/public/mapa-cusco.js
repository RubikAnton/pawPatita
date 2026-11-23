/**
 * Paw Patita Cusco v5.0 — Mapa Interactivo de Cusco (Leaflet.js + OpenStreetMap)
 * js/public/mapa-cusco.js
 * 
 * Mapa centrado en la ciudad del Cusco con marcadores personalizados para cuidadores
 * aprobados y clínicas veterinarias aliadas 24h, popups interactivos y sincronización reactiva
 * con los filtros del catálogo.
 */

import { CUSCO_CONFIG } from '../config.js';
import { formatMoneda, escapeHtml } from '../utils/formatters.js';
import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';

let leafletMap = null;
let markersLayerGroup = null;
let clinicasMarkersGroup = null;

// Semilla de clínicas para marcadores en el mapa
const CLINICAS_MAPA_SEED = [
  {
    codigo_clinica: 'VET-001',
    nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    distrito: 'Wanchaq',
    lat: -13.5226,
    lng: -71.9612,
    telefono: '+51 984 711 222',
    horario: '24 Horas',
    tarifa_urgencia: 60.00,
    foto_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&auto=format&fit=crop&q=80'
  },
  {
    codigo_clinica: 'VET-002',
    nombre: 'Centro Médico Veterinario Qorikancha Pet',
    distrito: 'Cusco Centro',
    lat: -13.5192,
    lng: -71.9754,
    telefono: '+51 984 822 333',
    horario: '24 Horas',
    tarifa_urgencia: 65.00,
    foto_url: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=200&auto=format&fit=crop&q=80'
  },
  {
    codigo_clinica: 'VET-003',
    nombre: 'Veterinaria Los Andes & Spa Canino',
    distrito: 'San Sebastián',
    lat: -13.5318,
    lng: -71.9365,
    telefono: '+51 984 933 444',
    horario: 'Extendido',
    tarifa_urgencia: 50.00,
    foto_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=200&auto=format&fit=crop&q=80'
  },
  {
    codigo_clinica: 'VET-004',
    nombre: 'Hospital Veterinario Valle Sur Cusco',
    distrito: 'San Jerónimo',
    lat: -13.5449,
    lng: -71.8842,
    telefono: '+51 984 644 555',
    horario: '24 Horas',
    tarifa_urgencia: 55.00,
    foto_url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop&q=80'
  }
];

/**
 * Inicializa el mapa de Leaflet centrado en Cusco
 * @param {string} elementId ID del elemento contenedor HTML
 */
export function inicializarMapaCusco(elementId = 'mapa-cusco-leaf') {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (typeof window.L === 'undefined') {
    console.error('Leaflet.js no está cargado en window.L.');
    container.innerHTML = `
      <div class="p-4 text-center text-muted">
        <i class="bi bi-exclamation-triangle fs-2 text-warning"></i>
        <p class="small mt-2">No se pudo cargar la librería cartográfica Leaflet.js.</p>
      </div>
    `;
    return;
  }

  // Si ya existía un mapa previo, destruirlo limpiamente para evitar fugas de memoria
  if (leafletMap) {
    try {
      leafletMap.remove();
    } catch (e) {
      console.warn('Limpiando instancia previa de mapa Leaflet:', e);
    }
    leafletMap = null;
  }

  // Coordenadas oficiales de Plaza de Armas de Cusco
  const centro = CUSCO_CONFIG.COORDINADAS_CENTRO || { lat: -13.5167, lng: -71.9788, zoom: 13 };

  leafletMap = window.L.map(elementId, {
    center: [centro.lat, centro.lng],
    zoom: centro.zoom,
    zoomControl: true,
    scrollWheelZoom: false // Evitar atrapar el scroll de la página accidentalmente
  });

  // Capa base de OpenStreetMap estándar
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors • Paw Patita Cusco'
  }).addTo(leafletMap);

  // Grupos de capas para cuidadores y clínicas
  markersLayerGroup = window.L.layerGroup().addTo(leafletMap);
  clinicasMarkersGroup = window.L.layerGroup().addTo(leafletMap);

  // Renderizar de inmediato los pines de las clínicas aliadas 24h
  renderizarMarcadoresClinicas();

  // Forzar recálculo de tamaño de tiles
  setTimeout(() => {
    if (leafletMap) leafletMap.invalidateSize();
  }, 250);
}

/**
 * Renderiza los marcadores de las Clínicas Veterinarias Aliadas 24h
 */
async function renderizarMarcadoresClinicas() {
  if (!leafletMap || !clinicasMarkersGroup) return;

  clinicasMarkersGroup.clearLayers();

  let clinicas = CLINICAS_MAPA_SEED;
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('clinicas_veterinarias')
        .select('*')
        .eq('activa', true);

      if (!error && data && data.length > 0) {
        clinicas = data.map(c => ({
          codigo_clinica: c.codigo_clinica,
          nombre: c.nombre,
          distrito: c.distrito_cusco,
          lat: Number(c.latitud),
          lng: Number(c.longitud),
          telefono: c.telefono_emergencia,
          horario: c.horario_atencion,
          tarifa_urgencia: Number(c.tarifa_consulta_emergencia || 50),
          foto_url: c.foto_fachada_url
        }));
      }
    } catch (e) {
      console.warn('Usando clínicas seed para mapa:', e);
    }
  }

  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';

  clinicas.forEach(c => {
    if (!c.lat || !c.lng) return;

    // Ícono HTML personalizado para Clínicas SOS
    const clinicIcon = window.L.divIcon({
      className: 'custom-pin-container',
      html: `
        <div class="custom-pin-clinica" title="${escapeHtml(c.nombre)} (Clínica Aliada)">
          <i class="bi bi-hospital-fill"></i>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });

    const popupHtml = `
      <div class="popup-clinica-content">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge bg-danger text-white small">${escapeHtml(c.horario || 'Urgencias 24h')}</span>
          <span class="small text-muted">${escapeHtml(c.distrito)}</span>
        </div>
        <h6 class="fw-bold mb-1 text-dark" style="font-size: 0.95rem;">${escapeHtml(c.nombre)}</h6>
        <div class="small text-muted mb-2">Consulta de urgencia desde: <strong>${formatMoneda(c.tarifa_urgencia, currentCurrency)}</strong></div>
        <div class="d-grid gap-1">
          <a href="tel:${escapeHtml(c.telefono?.replace(/\s+/g, '') || '')}" class="btn btn-danger btn-sm text-white">
            <i class="bi bi-telephone-fill me-1"></i> Llamar a Emergencias (${escapeHtml(c.telefono || '')})
          </a>
        </div>
      </div>
    `;

    const marker = window.L.marker([c.lat, c.lng], { icon: clinicIcon });
    marker.bindPopup(popupHtml);
    clinicasMarkersGroup.addLayer(marker);
  });
}

/**
 * Actualiza los marcadores de los cuidadores en el mapa según el filtrado actual
 * @param {Array} cuidadores 
 */
export function actualizarMarcadoresMapa(cuidadores = []) {
  if (!leafletMap || !markersLayerGroup) return;

  markersLayerGroup.clearLayers();

  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';
  const bounds = [];

  cuidadores.forEach(c => {
    const lat = Number(c.latitud);
    const lng = Number(c.longitud);

    if (isNaN(lat) || isNaN(lng)) return;

    bounds.push([lat, lng]);

    // Ícono personalizado para Cuidadores Paw Patita
    const cuidadorIcon = window.L.divIcon({
      className: 'custom-pin-container',
      html: `
        <div class="custom-pin-cuidador" title="${escapeHtml(c.nombre_completo)} (${escapeHtml(c.distrito_cusco)})">
          <i class="bi bi-paw-fill"></i>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });

    const popupHtml = `
      <div class="popup-cuidador-content">
        <div class="popup-cuidador-top">
          <img src="${escapeHtml(c.foto_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80')}" 
               alt="${escapeHtml(c.nombre_completo)}" 
               class="popup-cuidador-img"
               onerror="this.src='https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'">
          <div>
            <div class="fw-bold text-dark text-truncate" style="max-width: 170px;">${escapeHtml(c.nombre_completo)}</div>
            <div class="small text-muted"><i class="bi bi-geo-alt-fill text-danger"></i> ${escapeHtml(c.distrito_cusco || 'Cusco')}</div>
            <div class="text-warning small">
              <i class="bi bi-star-fill"></i> ${Number(c.reputacion_promedio || 5.0).toFixed(1)} (${escapeHtml(c.total_resenas || 0)})
            </div>
          </div>
        </div>
        <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
          <div>
            <div class="small text-muted" style="font-size: 0.7rem;">Tarifa desde:</div>
            <strong class="text-dark small">${formatMoneda(c.tarifa_minima || 35, currentCurrency)}/día</strong>
          </div>
          <button class="btn btn-paw btn-sm py-1 px-2" onclick="window.abrirModalPerfil('${escapeHtml(c.codigo_cuidador)}')" style="font-size: 0.75rem;">
            Ver Perfil
          </button>
        </div>
      </div>
    `;

    const marker = window.L.marker([lat, lng], { icon: cuidadorIcon });
    marker.bindPopup(popupHtml);
    markersLayerGroup.addLayer(marker);
  });

  // Ajustar vista a los cuidadores si hay alguno filtrado
  if (bounds.length > 0 && leafletMap) {
    try {
      leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } catch (e) {
      console.warn('Error al ajustar límites de mapa:', e);
    }
  }
}

/**
 * Centra el mapa en una coordenada específica y abre el popup
 * @param {number} lat 
 * @param {number} lng 
 * @param {number} zoom 
 */
export function centrarEnCoordenada(lat, lng, zoom = 15) {
  if (leafletMap && !isNaN(lat) && !isNaN(lng)) {
    leafletMap.setView([lat, lng], zoom, { animate: true });
  }
}

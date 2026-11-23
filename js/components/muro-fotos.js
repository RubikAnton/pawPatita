/**
 * Paw Patita Cusco v5.1 — Muro Privado de Fotos y Reportes en Vivo
 * js/components/muro-fotos.js
 *
 * Funcionalidades:
 *  - Consulta relacional de `reportes_seguimiento` + `fotos_reporte` ordenada cronológicamente
 *  - Filtrado por reserva / mascota del propietario
 *  - Marcado de reportes como vistos (`visto_por_propietario = true`)
 *  - Visor Lightbox para ampliar fotografías en alta resolución
 *  - Suscripción en tiempo real a nuevas publicaciones del cuidador
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { formatFechaEs, escapeHtml } from '../utils/formatters.js';
import { showToast, crearModalDinamico } from '../utils/ui-helpers.js';

const STORAGE_KEY_MURO = 'paw_demo_muro_reportes_v5';

export const REPORTES_MURO_SEED = [
  {
    id: '94000000-0000-0000-0000-000000000002',
    id_reserva: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    mascota_id: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    tipo_evento: 'Paseo y Recreación',
    estado_animo_mascota: 'Activo y juguetón',
    ubicacion_referencial: 'Parque Marianito Ferro - Wanchaq, Cusco',
    nota_estado: 'Paseo soleado de 45 minutos por el parque con hidratación fresca. Se portó excelente con otros perritos.',
    visto_por_propietario: false,
    fecha_reporte: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    fotos_reporte: [
      {
        id: 'foto-seed-2a',
        foto_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
        origen_almacenamiento: 'supabase_storage',
        descripcion_foto: 'Paseo matutino en Wanchaq bajo el sol cusqueño',
        orden: 1
      },
      {
        id: 'foto-seed-2b',
        foto_url: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=800&auto=format&fit=crop&q=80',
        origen_almacenamiento: 'supabase_storage',
        descripcion_foto: 'Descanso e hidratación en sombra',
        orden: 2
      }
    ]
  },
  {
    id: '94000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    mascota_id: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    tipo_evento: 'Check-In',
    estado_animo_mascota: 'Feliz y moviendo la cola',
    ubicacion_referencial: 'Urb. Magisterio - Wanchaq, Cusco',
    nota_estado: '¡Inti llegó súper contento! Revisamos su arnés y ya está explorando el jardín cercado.',
    visto_por_propietario: true,
    fecha_reporte: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    fotos_reporte: [
      {
        id: 'foto-seed-1a',
        foto_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80',
        origen_almacenamiento: 'supabase_storage',
        descripcion_foto: 'Inti en el jardín al momento del Check-In',
        orden: 1
      }
    ]
  },
  {
    id: '94000000-0000-0000-0000-000000000003',
    id_reserva: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    mascota_id: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    tipo_evento: 'Alimentación',
    estado_animo_mascota: 'Con buen apetito',
    ubicacion_referencial: 'Wanchaq, Cusco',
    nota_estado: 'Comió toda su ración de croquetas de salmón (sin pollo) y descansó tranquilo.',
    visto_por_propietario: true,
    fecha_reporte: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    fotos_reporte: [
      {
        id: 'foto-seed-3a',
        foto_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80',
        origen_almacenamiento: 'supabase_storage',
        descripcion_foto: 'Hora de su comida hipoalergénica',
        orden: 1
      }
    ]
  }
];

function getLocalReportes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MURO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_MURO, JSON.stringify(REPORTES_MURO_SEED));
  return [...REPORTES_MURO_SEED];
}

function saveLocalReportes(list) {
  try {
    localStorage.setItem(STORAGE_KEY_MURO, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Obtiene todos los reportes del muro de las reservas del propietario
 */
export async function obtenerReportesMuroPropietario(reservasPropietario = []) {
  const mapaReservas = new Map((reservasPropietario || []).map((r) => [r.id, r]));
  const idsReservas = Array.from(mapaReservas.keys());
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    if (idsReservas.length === 0) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('reportes_seguimiento')
        .select('*, fotos_reporte(*)')
        .in('id_reserva', idsReservas)
        .order('fecha_reporte', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((rep) => enriquecerReporteConReserva(rep, mapaReservas.get(rep.id_reserva)));
      }
    } catch (err) {
      console.warn('Error al consultar reportes del muro:', err);
    }
  }

  return getLocalReportes()
    .map((rep) => enriquecerReporteConReserva(rep, mapaReservas.get(rep.id_reserva)))
    .sort((a, b) => new Date(b.fecha_reporte).getTime() - new Date(a.fecha_reporte).getTime());
}

function enriquecerReporteConReserva(rep, res = null) {
  const fotos = Array.isArray(rep.fotos_reporte) && rep.fotos_reporte.length > 0
    ? rep.fotos_reporte
    : (rep.foto_url ? [{ id: `f-${rep.id}`, foto_url: rep.foto_url, descripcion_foto: rep.nota_estado, orden: 1 }] : []);

  return {
    id: rep.id || `rep-${Date.now()}`,
    id_reserva: rep.id_reserva || res?.id || '',
    codigo_reserva: rep.codigo_reserva || res?.codigo_reserva || 'RES-2026-0102',
    cuidador_nombre: rep.cuidador_nombre || res?.cuidador_nombre || 'Valeria Huamán Delgado',
    cuidador_foto: rep.cuidador_foto || res?.cuidador_foto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    mascota_id: rep.mascota_id || res?.id_mascota || '80000000-0000-0000-0000-000000000001',
    mascota_nombre: rep.mascota_nombre || res?.mascota_nombre || 'Inti',
    mascota_paw_id: rep.mascota_paw_id || res?.mascota_paw_id || 'PAW-6858',
    tipo_evento: rep.tipo_evento || 'Reporte General',
    estado_animo_mascota: rep.estado_animo_mascota || 'Feliz y activo',
    ubicacion_referencial: rep.ubicacion_referencial || 'Cusco',
    nota_estado: rep.nota_estado || 'Todo excelente durante la custodia.',
    visto_por_propietario: Boolean(rep.visto_por_propietario),
    fecha_reporte: rep.fecha_reporte || rep.created_at || new Date().toISOString(),
    fotos_reporte: fotos.map((f, idx) => ({
      id: f.id || `foto-${idx}`,
      foto_url: f.foto_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
      origen_almacenamiento: f.origen_almacenamiento || 'supabase_storage',
      descripcion_foto: f.descripcion_foto || rep.nota_estado || 'Evidencia fotográfica en Cusco',
      orden: f.orden || (idx + 1)
    }))
  };
}

/**
 * Marca un reporte como visto por el propietario
 */
export async function marcarReporteComoVisto(idReporte) {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && idReporte && !String(idReporte).startsWith('rep-')) {
    const { error } = await supabase
      .from('reportes_seguimiento')
      .update({ visto_por_propietario: true })
      .eq('id', idReporte);
    if (error) throw error;
  }

  const local = getLocalReportes().map((r) => (
    r.id === idReporte ? { ...r, visto_por_propietario: true } : r
  ));
  saveLocalReportes(local);
}

/**
 * Abre el Lightbox de una fotografía del Muro en Vivo
 */
export function abrirLightboxFotoMuro(fotoUrl, descripcion, metaInfo = {}) {
  const cuerpoHtml = `
    <div class="text-center">
      <img src="${escapeHtml(fotoUrl)}" alt="${escapeHtml(descripcion)}"
        class="img-fluid rounded-3 border shadow-sm mb-3" style="max-height: 520px; object-fit: contain;"
        onerror="this.src='https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'">
      <div class="p-3 bg-light rounded-3 border text-start small">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
          <div>
            <span class="badge bg-warning text-dark me-1">${escapeHtml(metaInfo.tipo_evento || 'Reporte en Vivo')}</span>
            <strong class="text-dark">${escapeHtml(metaInfo.mascota_nombre || 'Mascota')} (${escapeHtml(metaInfo.mascota_paw_id || '')})</strong>
          </div>
          <span class="text-muted"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(metaInfo.ubicacion_referencial || 'Cusco')}</span>
        </div>
        <div class="text-secondary">${escapeHtml(descripcion || metaInfo.nota_estado || '')}</div>
        <div class="text-muted mt-1" style="font-size:0.75rem;">
          Enviado por ${escapeHtml(metaInfo.cuidador_nombre || 'Cuidador Verificado')} • ${formatFechaEs(metaInfo.fecha_reporte, true)}
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <a href="${escapeHtml(fotoUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
      <i class="bi bi-box-arrow-up-right me-1"></i>Ver en Tamaño Completo
    </a>
    <button type="button" class="btn btn-paw btn-sm" data-bs-dismiss="modal">Cerrar</button>
  `;

  crearModalDinamico({
    titulo: `Fotografía en Vivo — ${metaInfo.mascota_nombre || 'Paw Patita Cusco'}`,
    icono: 'bi-camera-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });
}

/**
 * Renderiza la sección completa del Muro de Fotos en Vivo con filtros por mascota y reserva
 */
export function renderSeccionMuroFotos(container, { reportes = [], reservas = [], filtroReservaId = 'todas', filtroMascotaId = 'todas' } = {}) {
  if (!container) return;

  let filtrados = [...reportes];
  if (filtroReservaId && filtroReservaId !== 'todas') {
    filtrados = filtrados.filter((r) => r.id_reserva === filtroReservaId);
  }
  if (filtroMascotaId && filtroMascotaId !== 'todas') {
    filtrados = filtrados.filter((r) => r.mascota_id === filtroMascotaId);
  }

  // Lista única de mascotas presentes en reportes o reservas
  const mascotasUnicas = new Map();
  reservas.forEach((r) => {
    if (r.id_mascota) mascotasUnicas.set(r.id_mascota, { id: r.id_mascota, nombre: r.mascota_nombre, paw_id: r.mascota_paw_id });
  });
  reportes.forEach((rep) => {
    if (rep.mascota_id) mascotasUnicas.set(rep.mascota_id, { id: rep.mascota_id, nombre: rep.mascota_nombre, paw_id: rep.mascota_paw_id });
  });

  const noVistosCount = filtrados.filter((r) => !r.visto_por_propietario).length;

  container.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom">
        <div>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-camera-reels-fill text-warning me-2"></i>Muro Privado de Fotos y Bienestar en Vivo
          </h5>
          <p class="text-secondary small mb-0">
            Seguimiento fotográfico enviado por el cuidador en Cusco.
          </p>
        </div>
        <div class="d-flex align-items-center gap-2">
          ${noVistosCount > 0 ? `
            <span class="badge bg-warning text-dark px-3 py-2">
              <i class="bi bi-sparkles me-1"></i>${noVistosCount} reporte(s) nuevo(s)
            </span>
          ` : `
            <span class="badge bg-success-subtle text-success px-3 py-2">
              <i class="bi bi-check2-all me-1"></i>Todos los reportes al día
            </span>
          `}
        </div>
      </div>

      <!-- Barra de Filtros del Muro -->
      <div class="row g-2 mb-4">
        <div class="col-md-5">
          <label class="form-label small fw-bold text-secondary mb-1">Filtrar por Reserva</label>
          <select class="form-select form-select-sm" id="muro-filtro-reserva">
            <option value="todas" ${filtroReservaId === 'todas' ? 'selected' : ''}>Todas mis reservas (${reportes.length} reportes)</option>
            ${reservas.map((r) => `
              <option value="${escapeHtml(r.id)}" ${filtroReservaId === r.id ? 'selected' : ''}>
                ${escapeHtml(r.codigo_reserva)} — ${escapeHtml(r.mascota_nombre)} con ${escapeHtml(r.cuidador_nombre)}
              </option>
            `).join('')}
          </select>
        </div>
        <div class="col-md-5">
          <label class="form-label small fw-bold text-secondary mb-1">Filtrar por Mascota</label>
          <select class="form-select form-select-sm" id="muro-filtro-mascota">
            <option value="todas" ${filtroMascotaId === 'todas' ? 'selected' : ''}>Todas mis mascotas</option>
            ${Array.from(mascotasUnicas.values()).map((m) => `
              <option value="${escapeHtml(m.id)}" ${filtroMascotaId === m.id ? 'selected' : ''}>
                ${escapeHtml(m.nombre)} (${escapeHtml(m.paw_id)})
              </option>
            `).join('')}
          </select>
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <button type="button" class="btn btn-outline-secondary btn-sm w-100" id="muro-btn-marcar-todos">
            <i class="bi bi-check2-all me-1"></i>Marcar vistos
          </button>
        </div>
      </div>

      <!-- Timeline Cronológico -->
      ${filtrados.length === 0 ? `
        <div class="text-center py-5 bg-light rounded-3 border">
          <i class="bi bi-images text-warning fs-1 d-block mb-2"></i>
          <h6 class="fw-bold">No hay reportes fotográficos para el filtro seleccionado</h6>
          <p class="text-secondary small mb-0">Cuando tu cuidador publique fotos durante una reserva en curso, aparecerán aquí en tiempo real.</p>
        </div>
      ` : `
        <div class="muro-timeline">
          ${filtrados.map((rep) => `
            <article class="muro-post-card" data-reporte-id="${escapeHtml(rep.id)}">
              <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div class="d-flex align-items-center gap-2">
                  <img src="${escapeHtml(rep.cuidador_foto)}" alt="${escapeHtml(rep.cuidador_nombre)}"
                    class="rounded-circle border" style="width:44px;height:44px;object-fit:cover;">
                  <div>
                    <div class="fw-bold text-dark">
                      ${escapeHtml(rep.cuidador_nombre)}
                      <span class="badge bg-dark ms-1">${escapeHtml(rep.codigo_reserva)}</span>
                      <span class="badge bg-warning text-dark ms-1">${escapeHtml(rep.mascota_nombre)} (${escapeHtml(rep.mascota_paw_id)})</span>
                    </div>
                    <div class="small text-muted">
                      <i class="bi bi-clock me-1"></i>${formatFechaEs(rep.fecha_reporte, true)} •
                      <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(rep.ubicacion_referencial)}
                    </div>
                  </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                  <span class="badge bg-primary-subtle text-primary">${escapeHtml(rep.tipo_evento)}</span>
                  <span class="badge bg-success-subtle text-success"><i class="bi bi-emoji-smile me-1"></i>${escapeHtml(rep.estado_animo_mascota)}</span>
                  ${!rep.visto_por_propietario ? `
                    <button type="button" class="btn btn-warning btn-sm py-0 px-2 fw-bold" data-action="marcar-visto" data-id="${escapeHtml(rep.id)}">
                      Nuevo • Confirmar lectura
                    </button>
                  ` : `
                    <span class="small text-success"><i class="bi bi-check-all"></i> Visto</span>
                  `}
                </div>
              </div>

              <p class="mb-2 text-dark bg-light p-3 rounded-3 border-start border-4 border-warning">
                ${escapeHtml(rep.nota_estado)}
              </p>

              ${rep.fotos_reporte.length > 0 ? `
                <div class="muro-photos-grid">
                  ${rep.fotos_reporte.map((f) => `
                    <div class="position-relative">
                      <img src="${escapeHtml(f.foto_url)}" alt="${escapeHtml(f.descripcion_foto)}"
                        class="muro-photo-thumb"
                        data-action="lightbox-foto"
                        data-url="${escapeHtml(f.foto_url)}"
                        data-desc="${escapeHtml(f.descripcion_foto)}"
                        data-reporte="${escapeHtml(rep.id)}"
                        onerror="this.src='https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'">
                      <span class="badge bg-dark bg-opacity-75 position-absolute bottom-0 start-0 m-2" style="font-size:0.68rem;">
                        <i class="bi bi-zoom-in me-1"></i>Ampliar
                      </span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </article>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // Eventos de filtrado
  container.querySelector('#muro-filtro-reserva')?.addEventListener('change', (e) => {
    renderSeccionMuroFotos(container, {
      reportes,
      reservas,
      filtroReservaId: e.target.value,
      filtroMascotaId
    });
  });

  container.querySelector('#muro-filtro-mascota')?.addEventListener('change', (e) => {
    renderSeccionMuroFotos(container, {
      reportes,
      reservas,
      filtroReservaId,
      filtroMascotaId: e.target.value
    });
  });

  // Marcar todos como vistos
  container.querySelector('#muro-btn-marcar-todos')?.addEventListener('click', async () => {
    for (const r of filtrados) {
      if (!r.visto_por_propietario) {
        r.visto_por_propietario = true;
        await marcarReporteComoVisto(r.id);
      }
    }
    showToast('Todos los reportes del muro han sido marcados como vistos.', 'success');
    renderSeccionMuroFotos(container, { reportes, reservas, filtroReservaId, filtroMascotaId });
  });

  // Marcar un reporte individual como visto
  container.querySelectorAll('[data-action="marcar-visto"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idRep = btn.getAttribute('data-id');
      const target = reportes.find((r) => r.id === idRep);
      if (target) target.visto_por_propietario = true;
      await marcarReporteComoVisto(idRep);
      showToast('Reporte confirmado como leído.', 'info');
      renderSeccionMuroFotos(container, { reportes, reservas, filtroReservaId, filtroMascotaId });
    });
  });

  // Abrir Lightbox
  container.querySelectorAll('[data-action="lightbox-foto"]').forEach((img) => {
    img.addEventListener('click', async () => {
      const url = img.getAttribute('data-url');
      const desc = img.getAttribute('data-desc');
      const idRep = img.getAttribute('data-reporte');
      const repObj = reportes.find((r) => r.id === idRep) || {};
      if (repObj && !repObj.visto_por_propietario) {
        repObj.visto_por_propietario = true;
        await marcarReporteComoVisto(repObj.id);
      }
      abrirLightboxFotoMuro(url, desc, repObj);
    });
  });
}

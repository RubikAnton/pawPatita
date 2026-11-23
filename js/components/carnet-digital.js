/**
 * Paw Patita Cusco v5.1 — CRUD de Mascotas, Carné Digital PAW-ID (con QR Real) y Comprobantes
 * js/components/carnet-digital.js
 *
 * Funcionalidades:
 *  - CRUD completo de mascotas (Crear, Editar, Archivar/Baja lógica)
 *  - Cálculo dinámico de edad exacta en años y meses desde `fecha_nacimiento` (0 `undefined`)
 *  - Subida directa de foto y cartilla de vacunas (Imagen o PDF) con visor universal
 *  - Modal Credencial Oficial PAW-ID con QR escaneable (`QRCode.js` -> `#/paw-id/PAW-XXXX`),
 *    historial de validaciones veterinarias, atenciones S.O.S. y botón de Impresión / PDF
 *  - Visor e Impresión de Comprobante Electrónico de Reserva (Boleta / Factura con 15%/85%)
 */

import { getSupabase, isSupabaseConfigured, getFallbackSvgDataUri } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import { calcularEdadDinamica, formatFechaEs, formatMoneda, escapeHtml, getHoyIso } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, showConfirmModal, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';
import { mountFileUploader, abrirVisorDocumento } from './file-uploader.js';

const BLOQUE_HORARIO_LABELS = {
  manana_08_12: 'Mañana (08:00 - 12:00)',
  tarde_14_18: 'Tarde (14:00 - 18:00)',
  noche_18_22: 'Noche (18:00 - 22:00)',
  todo_el_dia: 'Estadía Completa (24 Horas)'
};

const STORAGE_KEY_MASCOTAS = 'paw_demo_mascotas_v5';

// Semilla inicial idéntica a supabase/06_seed.sql para resiliencia offline y pruebas E2E inmediatas
export const MASCOTAS_SEED_OWNER = [
  {
    id: '80000000-0000-0000-0000-000000000001',
    paw_id: 'PAW-6858',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    nombre: 'Inti',
    raza: 'Golden Retriever',
    fecha_nacimiento: '2023-07-15',
    tamano: 'Grande',
    sexo: 'Macho',
    peso_kg: 28.5,
    esterilizado: true,
    vacunas_al_dia: true,
    fecha_venc_vacunas: '2027-07-15',
    cartilla_vacunas_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    alergias_restricciones: 'Alergia leve al pollo procesado (dar solo cordero o salmón)',
    medicacion_actual: 'Ninguna medicación permanente',
    dieta_alimentacion: '300g de croquetas de salmón (08:00 AM y 06:00 PM)',
    conducta_observaciones: 'Muy cariñoso, sociable con otros perros y acostumbrado a paseos con arnés.',
    foto_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80',
    estado_validacion_vet: 'validado',
    id_clinica_validadora: '40000000-0000-0000-0000-000000000001',
    clinica_validadora_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    clinica_validadora_cmvp: 'CMVP-CUSCO-4821',
    observacion_veterinaria: 'Vacunas Séxtuple, Antirrábica y KC vigentes. Apto para hospedaje y paseos en Cusco.',
    fecha_ultima_validacion: '2026-11-07T10:30:00-05:00',
    activa: true
  },
  {
    id: '80000000-0000-0000-0000-000000000002',
    paw_id: 'PAW-1002',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    nombre: 'Killa',
    raza: 'Beagle',
    fecha_nacimiento: '2026-04-10',
    tamano: 'Mediano',
    sexo: 'Hembra',
    peso_kg: 7.2,
    esterilizado: false,
    vacunas_al_dia: true,
    fecha_venc_vacunas: '2027-04-10',
    cartilla_vacunas_url: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=700&auto=format&fit=crop&q=80',
    alergias_restricciones: 'Ninguna alergia conocida',
    medicacion_actual: 'Vitaminas de cachorro después del desayuno',
    dieta_alimentacion: 'Croquetas Puppy 3 veces al día',
    conducta_observaciones: 'Cachorra juguetona y curiosa.',
    foto_url: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=500&auto=format&fit=crop&q=80',
    estado_validacion_vet: 'pendiente',
    id_clinica_validadora: null,
    clinica_validadora_nombre: 'En cola de revisión por Clínica Aliada',
    clinica_validadora_cmvp: '—',
    observacion_veterinaria: 'En cola de revisión por Clínica Veterinaria Aliada.',
    fecha_ultima_validacion: null,
    activa: true
  },
  {
    id: '80000000-0000-0000-0000-000000000004',
    paw_id: 'PAW-1004',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    nombre: 'Wayra',
    raza: 'Schnauzer Miniatura',
    fecha_nacimiento: '2021-11-02',
    tamano: 'Pequeño',
    sexo: 'Macho',
    peso_kg: 8.1,
    esterilizado: true,
    vacunas_al_dia: false,
    fecha_venc_vacunas: '2025-10-01',
    cartilla_vacunas_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=700&auto=format&fit=crop&q=80',
    alergias_restricciones: 'Ninguna reportada',
    medicacion_actual: 'Ninguna',
    dieta_alimentacion: 'Croquetas Adult Small Breed',
    conducta_observaciones: 'Alerta y guardián.',
    foto_url: 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=500&auto=format&fit=crop&q=80',
    estado_validacion_vet: 'observado',
    id_clinica_validadora: '40000000-0000-0000-0000-000000000001',
    clinica_validadora_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    clinica_validadora_cmvp: 'CMVP-CUSCO-4821',
    observacion_veterinaria: 'Observación Clínica: El refuerzo anual de vacuna Antirrábica figura vencido. Subir foto del sello actualizado.',
    fecha_ultima_validacion: '2026-11-20T16:15:00-05:00',
    activa: true
  }
];

function getLocalMascotas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASCOTAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_MASCOTAS, JSON.stringify(MASCOTAS_SEED_OWNER));
  return [...MASCOTAS_SEED_OWNER];
}

function saveLocalMascotas(list) {
  try {
    localStorage.setItem(STORAGE_KEY_MASCOTAS, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Normaliza un registro de mascota garantizando 0 `undefined`
 */
export function normalizarMascota(m) {
  const edadInfo = calcularEdadDinamica(m.fecha_nacimiento);
  const estado = (m.estado_validacion_vet || 'pendiente').toLowerCase();
  const clinicaNombre = m.clinica_validadora_nombre || m.clinicas_veterinarias?.nombre || (
    estado === 'validado' ? 'Clínica Veterinaria San Francisco Cusco 24h' : 'Pendiente de Asignación'
  );
  const clinicaCmvp = m.clinica_validadora_cmvp || m.clinicas_veterinarias?.colegiatura_cmvp || (
    estado === 'validado' ? 'CMVP-CUSCO-4821' : '—'
  );

  return {
    id: m.id || `pet-${Date.now()}`,
    paw_id: m.paw_id || 'PAW-0000',
    id_propietario: m.id_propietario || '',
    nombre: m.nombre || 'Mascota sin nombre',
    raza: m.raza || 'Mestizo',
    fecha_nacimiento: m.fecha_nacimiento || '2023-01-01',
    edad_texto: edadInfo.texto,
    edad_anios: edadInfo.anios,
    edad_meses: edadInfo.meses,
    es_cachorro: edadInfo.esCachorro,
    tamano: m.tamano || 'Mediano',
    sexo: m.sexo || 'Macho',
    peso_kg: Number(m.peso_kg || 10).toFixed(1),
    esterilizado: Boolean(m.esterilizado),
    vacunas_al_dia: Boolean(m.vacunas_al_dia),
    fecha_venc_vacunas: m.fecha_venc_vacunas || null,
    cartilla_vacunas_url: m.cartilla_vacunas_url || '',
    alergias_restricciones: m.alergias_restricciones || 'Ninguna reportada',
    medicacion_actual: m.medicacion_actual || 'Ninguna',
    dieta_alimentacion: m.dieta_alimentacion || 'Croquetas balanceadas 2 veces al día',
    conducta_observaciones: m.conducta_observaciones || 'Sociable y tranquilo',
    foto_url: m.foto_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=80',
    estado_validacion_vet: estado,
    clinica_validadora_nombre: clinicaNombre,
    clinica_validadora_cmvp: clinicaCmvp,
    observacion_veterinaria: m.observacion_veterinaria || (
      estado === 'validado'
        ? 'Cartilla sanitaria verificada conforme por Clínica Veterinaria Aliada.'
        : 'En espera de revisión de cartilla de vacunación por Clínica Veterinaria Aliada.'
    ),
    fecha_ultima_validacion: m.fecha_ultima_validacion || null,
    activa: m.activa !== false
  };
}

/**
 * Obtiene las mascotas activas del propietario desde Supabase (`v_resumen_mascotas` o `mascotas`)
 * con fallback local sincronizado.
 */
export async function obtenerMascotasPropietario(idPropietario) {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && idPropietario && !String(idPropietario).startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('v_resumen_mascotas')
        .select('*')
        .eq('id_propietario', idPropietario)
        .eq('activa', true)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map(normalizarMascota);
      }

      // Intento directo sobre tabla mascotas con join a clinicas_veterinarias
      const { data: directData, error: directErr } = await supabase
        .from('mascotas')
        .select('*, clinicas_veterinarias(nombre, colegiatura_cmvp)')
        .eq('id_propietario', idPropietario)
        .eq('activa', true)
        .order('created_at', { ascending: true });

      if (!directErr && Array.isArray(directData)) {
        return directData.map(normalizarMascota);
      }
    } catch (err) {
      console.warn('Error al consultar mascotas del propietario:', err);
    }
  }

  return getLocalMascotas()
    .filter((m) => m.activa !== false)
    .map(normalizarMascota);
}

/**
 * Genera el badge visual del estado sanitario PAW-ID
 */
export function renderBadgeSanitario(estado) {
  const est = (estado || 'pendiente').toLowerCase();
  if (est === 'validado') {
    return `<span class="badge-status status-validado"><i class="bi bi-patch-check-fill me-1"></i>Validado CMVP</span>`;
  }
  if (est === 'observado') {
    return `<span class="badge-status status-observado"><i class="bi bi-exclamation-triangle-fill me-1"></i>Observado</span>`;
  }
  return `<span class="badge-status status-pendiente"><i class="bi bi-hourglass-split me-1"></i>Pendiente Validación</span>`;
}

/**
 * Renderiza una tarjeta de mascota completa libre de `undefined`
 */
export function renderTarjetaMascota(mascota) {
  const m = normalizarMascota(mascota);
  const obsClass = m.estado_validacion_vet === 'validado'
    ? 'obs-validado'
    : (m.estado_validacion_vet === 'observado' ? 'obs-observado' : 'obs-pendiente');

  return `
    <article class="pet-card-paw" data-pet-id="${escapeHtml(m.id)}">
      <div class="pet-card-top">
        <img src="${escapeHtml(m.foto_url)}" alt="${escapeHtml(m.nombre)}" class="pet-avatar-photo"
          onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'">
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <span class="paw-id-chip"><i class="bi bi-qr-code me-1"></i>${escapeHtml(m.paw_id)}</span>
            ${renderBadgeSanitario(m.estado_validacion_vet)}
          </div>
          <h5 class="fw-bold mb-0 mt-1 text-dark">${escapeHtml(m.nombre)}</h5>
          <div class="text-secondary small">${escapeHtml(m.raza)} • <strong>${escapeHtml(m.edad_texto)}</strong></div>
          <div class="pet-meta-pills">
            <span class="pet-meta-pill"><i class="bi bi-arrows-angle-expand me-1 text-warning"></i>${escapeHtml(m.tamano)}</span>
            <span class="pet-meta-pill">${m.sexo === 'Hembra' ? '♀ Hembra' : '♂ Macho'}</span>
            <span class="pet-meta-pill">${escapeHtml(m.peso_kg)} kg</span>
            ${m.es_cachorro ? '<span class="pet-meta-pill bg-warning-subtle text-dark">🐾 Cachorro</span>' : ''}
          </div>
        </div>
      </div>

      <div class="pet-card-body">
        <div class="row g-2 mb-2">
          <div class="col-6">
            <div class="text-muted" style="font-size:0.73rem;">VACUNAS / VIGENCIA</div>
            <div class="fw-semibold ${m.vacunas_al_dia ? 'text-success' : 'text-danger'}">
              <i class="bi ${m.vacunas_al_dia ? 'bi-shield-check' : 'bi-shield-exclamation'} me-1"></i>
              ${m.vacunas_al_dia ? 'Al día' : 'Por actualizar'}
              ${m.fecha_venc_vacunas ? `<span class="text-secondary fw-normal">(${formatFechaEs(m.fecha_venc_vacunas)})</span>` : ''}
            </div>
          </div>
          <div class="col-6">
            <div class="text-muted" style="font-size:0.73rem;">ESTERILIZADO</div>
            <div class="fw-semibold">${m.esterilizado ? 'Sí, esterilizado(a)' : 'No'}</div>
          </div>
        </div>

        <div class="mb-1">
          <span class="text-muted" style="font-size:0.74rem;">ALERGIAS / RESTRICCIONES:</span>
          <div class="fw-medium text-dark">${escapeHtml(m.alergias_restricciones)}</div>
        </div>
        <div class="mb-1">
          <span class="text-muted" style="font-size:0.74rem;">DIETA & MEDICACIÓN:</span>
          <div class="text-secondary">${escapeHtml(m.dieta_alimentacion)} | Med: ${escapeHtml(m.medicacion_actual)}</div>
        </div>

        <div class="pet-observation-box ${obsClass}">
          <div class="fw-bold mb-1">
            <i class="bi bi-hospital me-1"></i>${escapeHtml(m.clinica_validadora_nombre)}
          </div>
          <div>${escapeHtml(m.observacion_veterinaria)}</div>
        </div>
      </div>

      <div class="pet-card-actions">
        <div class="d-flex gap-1 flex-wrap">
          <button type="button" class="btn btn-paw btn-sm" data-action="ver-carnet" data-id="${escapeHtml(m.id)}">
            <i class="bi bi-qr-code-scan me-1"></i>Carné PAW-ID & QR
          </button>
          ${m.cartilla_vacunas_url ? `
            <button type="button" class="btn btn-outline-secondary btn-sm" data-action="ver-cartilla" data-id="${escapeHtml(m.id)}" title="Ver Cartilla de Vacunación">
              <i class="bi bi-file-earmark-medical"></i> Cartilla
            </button>
          ` : ''}
        </div>
        <div class="d-flex gap-1">
          <button type="button" class="btn btn-outline-primary btn-sm" data-action="editar-mascota" data-id="${escapeHtml(m.id)}" title="Editar Ficha">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="archivar-mascota" data-id="${escapeHtml(m.id)}" title="Archivar Mascota">
            <i class="bi bi-archive"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Abre el modal CRUD para Crear o Editar una Mascota (con Dropzones directos para Imagen y PDF)
 * @param {Object|null} mascotaExistente
 * @param {string} idPropietario
 * @param {function} onSavedCallback
 */
export function abrirModalFormularioMascota(mascotaExistente = null, idPropietario = null, onSavedCallback = null) {
  const esEdicion = Boolean(mascotaExistente && mascotaExistente.id);
  const m = esEdicion ? normalizarMascota(mascotaExistente) : {
    nombre: '',
    raza: '',
    fecha_nacimiento: '2024-05-15',
    tamano: 'Mediano',
    sexo: 'Macho',
    peso_kg: 12.0,
    esterilizado: true,
    vacunas_al_dia: true,
    fecha_venc_vacunas: '2027-06-01',
    foto_url: '',
    cartilla_vacunas_url: '',
    alergias_restricciones: 'Ninguna reportada',
    medicacion_actual: 'Ninguna',
    dieta_alimentacion: 'Croquetas balanceadas 2 veces al día',
    conducta_observaciones: 'Sociable con personas y otros perros'
  };

  const hoy = getHoyIso();
  const edadPreview = calcularEdadDinamica(m.fecha_nacimiento);

  const cuerpoHtml = `
    <form id="form-crud-mascota" novalidate>
      <div class="alert alert-light border d-flex align-items-center justify-content-between py-2 px-3 mb-3">
        <div class="small text-secondary">
          <i class="bi bi-shield-check text-success me-1"></i>
          ${esEdicion
            ? `Editando ficha oficial <strong>${escapeHtml(m.paw_id)}</strong>`
            : 'Al registrar tu mascota se generará automáticamente su código único <strong>PAW-ID</strong> con QR de emergencia.'}
        </div>
        <span class="badge bg-warning text-dark" id="badge-edad-preview">Edad calculada: ${escapeHtml(edadPreview.texto)}</span>
      </div>

      <div class="row g-3">
        <div class="col-md-5">
          <label class="form-label small fw-bold">Nombre de la Mascota *</label>
          <input type="text" class="form-control" id="pet-nombre" required maxlength="60"
            value="${escapeHtml(m.nombre)}" placeholder="Ej. Inti, Killa, Toby">
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Raza *</label>
          <input type="text" class="form-control" id="pet-raza" required maxlength="60"
            value="${escapeHtml(m.raza)}" placeholder="Ej. Golden Retriever, Mestizo">
        </div>
        <div class="col-md-3">
          <label class="form-label small fw-bold">Fecha de Nacimiento *</label>
          <input type="date" class="form-control" id="pet-nacimiento" required max="${hoy}"
            value="${escapeHtml(m.fecha_nacimiento)}">
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Tamaño *</label>
          <select class="form-select" id="pet-tamano">
            <option value="Pequeño" ${m.tamano === 'Pequeño' ? 'selected' : ''}>Pequeño (hasta 10 kg)</option>
            <option value="Mediano" ${m.tamano === 'Mediano' ? 'selected' : ''}>Mediano (10 a 25 kg)</option>
            <option value="Grande" ${m.tamano === 'Grande' ? 'selected' : ''}>Grande (más de 25 kg)</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Sexo *</label>
          <select class="form-select" id="pet-sexo">
            <option value="Macho" ${m.sexo === 'Macho' ? 'selected' : ''}>Macho</option>
            <option value="Hembra" ${m.sexo === 'Hembra' ? 'selected' : ''}>Hembra</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-bold">Peso Aproximado (kg) *</label>
          <input type="number" step="0.1" min="0.5" max="110" class="form-control" id="pet-peso" required
            value="${escapeHtml(m.peso_kg)}">
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Vigencia de Vacunas</label>
          <input type="date" class="form-control" id="pet-venc-vacunas"
            value="${escapeHtml(m.fecha_venc_vacunas || '')}">
        </div>
        <div class="col-md-4 d-flex align-items-end">
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="pet-vacunas-dia" ${m.vacunas_al_dia ? 'checked' : ''}>
            <label class="form-check-label small fw-semibold" for="pet-vacunas-dia">Vacunas al día (Séxtuple/Rabia)</label>
          </div>
        </div>
        <div class="col-md-4 d-flex align-items-end">
          <div class="form-check form-switch mb-2">
            <input class="form-check-input" type="checkbox" id="pet-esterilizado" ${m.esterilizado ? 'checked' : ''}>
            <label class="form-check-label small fw-semibold" for="pet-esterilizado">Mascota Esterilizada</label>
          </div>
        </div>

        <!-- Fotografía de la Mascota (Dropzone Directo) -->
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 border h-100">
            <div id="uploader-pet-foto"></div>
          </div>
        </div>

        <!-- Cartilla de Vacunación (Dropzone Directo Imagen o PDF) -->
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 border h-100">
            <div id="uploader-pet-cartilla"></div>
          </div>
        </div>

        <div class="col-md-6">
          <label class="form-label small fw-bold">Alergias o Restricciones Médicas</label>
          <input type="text" class="form-control" id="pet-alergias" maxlength="200"
            value="${escapeHtml(m.alergias_restricciones)}" placeholder="Ej. Alergia al pollo, ninguna">
        </div>
        <div class="col-md-6">
          <label class="form-label small fw-bold">Medicación Actual</label>
          <input type="text" class="form-control" id="pet-medicacion" maxlength="200"
            value="${escapeHtml(m.medicacion_actual)}" placeholder="Ej. Vitaminas, gotas oftálmicas, ninguna">
        </div>

        <div class="col-md-6">
          <label class="form-label small fw-bold">Dieta y Horarios de Alimentación</label>
          <textarea class="form-control" id="pet-dieta" rows="2" maxlength="300">${escapeHtml(m.dieta_alimentacion)}</textarea>
        </div>
        <div class="col-md-6">
          <label class="form-label small fw-bold">Conducta y Recomendaciones para el Cuidador</label>
          <textarea class="form-control" id="pet-conducta" rows="2" maxlength="300">${escapeHtml(m.conducta_observaciones)}</textarea>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw" id="btn-guardar-mascota-modal">
      <i class="bi bi-check2-circle me-1"></i>${esEdicion ? 'Guardar Cambios en PAW-ID' : 'Registrar Mascota y Generar PAW-ID'}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: esEdicion ? `Editar Mascota (${m.nombre} - ${m.paw_id})` : 'Registrar Nueva Mascota y Carné PAW-ID',
    icono: 'bi-heart-pulse-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  // Montar dropzones de Fotografía y Cartilla de Vacunación (Imagen o PDF)
  const fotoUploader = mountFileUploader(modal.el.querySelector('#uploader-pet-foto'), {
    label: 'Fotografía de la Mascota',
    accept: 'image/*',
    bucket: 'mascotas-fotos',
    folder: 'mascotas/fotos',
    initialValue: m.foto_url || ''
  });

  const cartillaUploader = mountFileUploader(modal.el.querySelector('#uploader-pet-cartilla'), {
    label: 'Cartilla de Vacunación (Para Validación Veterinaria)',
    accept: 'image/*,application/pdf',
    bucket: 'mascotas-fotos',
    folder: 'mascotas/cartillas',
    initialValue: m.cartilla_vacunas_url || '',
    helpText: 'Fotografía o documento PDF • Máx. 10 MB'
  });

  // Actualizar preview de edad en vivo al cambiar fecha_nacimiento
  const inputNac = modal.el.querySelector('#pet-nacimiento');
  const badgeEdad = modal.el.querySelector('#badge-edad-preview');
  inputNac?.addEventListener('change', () => {
    const info = calcularEdadDinamica(inputNac.value);
    if (badgeEdad) {
      badgeEdad.textContent = `Edad calculada: ${info.texto}${info.esCachorro ? ' (Cachorro)' : ''}`;
    }
  });

  // Guardar mascota
  modal.el.querySelector('#btn-guardar-mascota-modal')?.addEventListener('click', async () => {
    const nombre = modal.el.querySelector('#pet-nombre').value.trim();
    const raza = modal.el.querySelector('#pet-raza').value.trim();
    const fechaNacimiento = modal.el.querySelector('#pet-nacimiento').value;
    const peso = parseFloat(modal.el.querySelector('#pet-peso').value) || 10;

    if (!nombre || !raza || !fechaNacimiento) {
      showToast('Por favor completa el nombre, raza y fecha de nacimiento de tu mascota.', 'warning');
      return;
    }

    showSpinner(esEdicion ? 'Actualizando ficha médica PAW-ID...' : 'Generando Carné Digital PAW-ID...');
    try {
      let fotoUrl = await fotoUploader.uploadIfPending();
      if (!fotoUrl) {
        fotoUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&auto=format&fit=crop&q=80';
      }

      const cartillaUrl = await cartillaUploader.uploadIfPending();

      // Si estaba observada y el propietario sube/actualiza cartilla, pasa a pendiente de re-evaluación
      let nuevoEstadoVal = esEdicion ? m.estado_validacion_vet : 'pendiente';
      let nuevaObsVet = esEdicion
        ? m.observacion_veterinaria
        : 'Ficha registrada. En cola de validación por Clínica Veterinaria Aliada en Cusco.';

      if (esEdicion && m.estado_validacion_vet === 'observado' && cartillaUrl) {
        nuevoEstadoVal = 'pendiente';
        nuevaObsVet = 'Cartilla subsanada por el propietario. Pendiente de re-validación veterinaria.';
      }

      const payloadMascota = {
        nombre,
        raza,
        fecha_nacimiento: fechaNacimiento,
        tamano: modal.el.querySelector('#pet-tamano').value,
        sexo: modal.el.querySelector('#pet-sexo').value,
        peso_kg: peso,
        esterilizado: modal.el.querySelector('#pet-esterilizado').checked,
        vacunas_al_dia: modal.el.querySelector('#pet-vacunas-dia').checked,
        fecha_venc_vacunas: modal.el.querySelector('#pet-venc-vacunas').value || null,
        foto_url: fotoUrl,
        cartilla_vacunas_url: cartillaUrl || null,
        alergias_restricciones: modal.el.querySelector('#pet-alergias').value.trim() || 'Ninguna reportada',
        medicacion_actual: modal.el.querySelector('#pet-medicacion').value.trim() || 'Ninguna',
        dieta_alimentacion: modal.el.querySelector('#pet-dieta').value.trim() || 'Croquetas balanceadas 2 veces al día',
        conducta_observaciones: modal.el.querySelector('#pet-conducta').value.trim() || 'Sociable y tranquilo',
        estado_validacion_vet: nuevoEstadoVal,
        observacion_veterinaria: nuevaObsVet,
        activa: true
      };

      const supabase = getSupabase();
      let savedRecord = null;

      if (supabase && isSupabaseConfigured() && idPropietario && !String(idPropietario).startsWith('mock-')) {
        if (esEdicion) {
          const { data, error } = await supabase
            .from('mascotas')
            .update(payloadMascota)
            .eq('id', m.id)
            .select()
            .single();
          if (error) throw error;
          savedRecord = data;
        } else {
          const { data, error } = await supabase
            .from('mascotas')
            .insert([{ ...payloadMascota, id_propietario: idPropietario }])
            .select()
            .single();
          if (error) throw error;
          savedRecord = data;
        }
      }

      // Sincronizar en almacenamiento local para respuesta instantánea y modo demo
      const localList = getLocalMascotas();
      if (esEdicion) {
        const idx = localList.findIndex((item) => item.id === m.id);
        const updated = {
          ...(idx >= 0 ? localList[idx] : m),
          ...payloadMascota,
          ...(savedRecord || {})
        };
        if (idx >= 0) localList[idx] = updated;
        else localList.push(updated);
        savedRecord = updated;
      } else {
        const nextNum = 1005 + localList.length;
        const created = {
          id: savedRecord?.id || `80000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
          paw_id: savedRecord?.paw_id || `PAW-${nextNum}`,
          id_propietario: idPropietario || '50000000-0000-0000-0000-000000000002',
          ...payloadMascota,
          ...(savedRecord || {})
        };
        localList.push(created);
        savedRecord = created;
      }
      saveLocalMascotas(localList);

      await modal.cerrarAsync();
      showToast(
        esEdicion
          ? `Ficha PAW-ID de ${nombre} actualizada correctamente.`
          : `¡Mascota ${nombre} registrada con código ${savedRecord.paw_id}!`,
        'success',
        'Carné Digital PAW-ID'
      );
      if (typeof onSavedCallback === 'function') {
        onSavedCallback(normalizarMascota(savedRecord));
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo guardar la ficha de la mascota.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Archiva (baja lógica `activa = false`) una mascota del propietario
 */
export async function archivarMascotaPropietario(mascota, onArchivedCallback = null) {
  const m = normalizarMascota(mascota);
  const confirmado = await showConfirmModal({
    titulo: `Archivar Ficha PAW-ID (${m.paw_id})`,
    mensaje: `¿Deseas archivar a ${m.nombre}? Sus reservas históricas se conservarán intactas, pero ya no aparecerá en la lista activa.`,
    confirmText: 'Sí, Archivar Mascota',
    cancelText: 'Cancelar',
    tipo: 'danger'
  });

  if (!confirmado) return;

  showSpinner('Archivando ficha de mascota...');
  try {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && !String(m.id).startsWith('pet-')) {
      const { error } = await supabase.from('mascotas').update({ activa: false }).eq('id', m.id);
      if (error) throw error;
    }
    const localList = getLocalMascotas().map((item) => (
      item.id === m.id ? { ...item, activa: false } : item
    ));
    saveLocalMascotas(localList);
    showToast(`La ficha de ${m.nombre} (${m.paw_id}) fue archivada.`, 'info');
    if (typeof onArchivedCallback === 'function') onArchivedCallback(m.id);
  } catch (err) {
    handleSupabaseError(err, 'No se pudo archivar la mascota.');
  } finally {
    hideSpinner();
  }
}

/**
 * Abre el Modal Oficial del Carné Digital PAW-ID con Código QR Real (QRCode.js),
 * Historial Clínico (validaciones + atenciones SOS) y Botón Imprimir Credencial.
 */
export async function abrirModalCarnetPawId(mascota, propietarioProfile = null, sosList = []) {
  const m = normalizarMascota(mascota);
  const propNombre = propietarioProfile
    ? `${propietarioProfile.nombre || ''} ${propietarioProfile.apellido || ''}`.trim()
    : 'Lucía Mendoza Vargas';
  const propTel = propietarioProfile?.telefono || '+51 984 234 567';
  const propDistrito = propietarioProfile?.distrito_cusco || 'Wanchaq';
  const urlPublicaQr = `${window.location.origin}${window.location.pathname}#/paw-id/${encodeURIComponent(m.paw_id)}`;

  // Filtrar historial SOS de esta mascota
  const sosMascota = (sosList || []).filter((inc) => inc.id_mascota === m.id || inc.mascota_nombre === m.nombre);

  const cuerpoHtml = `
    <div class="carnet-credencial-card carnet-paw-print-wrapper">
      <div class="carnet-credencial-header">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-heart-pulse-fill text-warning fs-3"></i>
          <div>
            <div class="fw-bold text-uppercase" style="letter-spacing:0.06em; font-size:0.78rem; color:#F4D06F;">
              RED DE CUSTODIA & BIENESTAR ANIMAL CUSCO
            </div>
            <h5 class="mb-0 text-white fw-bold">CARNÉ SANITARIO DIGITAL PAW-ID</h5>
          </div>
        </div>
        <div class="text-end">
          <div class="badge bg-warning text-dark fs-6 fw-bold px-3 py-2">${escapeHtml(m.paw_id)}</div>
        </div>
      </div>

      <div class="carnet-credencial-body">
        <div class="text-center">
          <img src="${escapeHtml(m.foto_url)}" alt="${escapeHtml(m.nombre)}" class="carnet-photo-frame"
            onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'">
          <div class="mt-2">${renderBadgeSanitario(m.estado_validacion_vet)}</div>
        </div>

        <div>
          <h4 class="fw-bold mb-1 text-dark">${escapeHtml(m.nombre)}</h4>
          <div class="text-secondary fw-semibold mb-2">
            ${escapeHtml(m.raza)} • ${escapeHtml(m.sexo)} • ${escapeHtml(m.tamano)} (${escapeHtml(m.peso_kg)} kg)
          </div>

          <div class="row g-2 small mb-2">
            <div class="col-sm-6">
              <span class="text-muted d-block" style="font-size:0.72rem;">EDAD ACTUAL (DINÁMICA)</span>
              <strong class="text-dark">${escapeHtml(m.edad_texto)}</strong>
              <span class="text-muted"> (Nac: ${formatFechaEs(m.fecha_nacimiento)})</span>
            </div>
            <div class="col-sm-6">
              <span class="text-muted d-block" style="font-size:0.72rem;">VIGENCIA VACUNAS</span>
              <strong class="${m.vacunas_al_dia ? 'text-success' : 'text-danger'}">
                ${m.fecha_venc_vacunas ? formatFechaEs(m.fecha_venc_vacunas) : 'Por verificar'}
              </strong>
            </div>
            <div class="col-sm-6">
              <span class="text-muted d-block" style="font-size:0.72rem;">PROPIETARIO RESPONSABLE</span>
              <strong class="text-dark">${escapeHtml(propNombre)}</strong>
            </div>
            <div class="col-sm-6">
              <span class="text-muted d-block" style="font-size:0.72rem;">CONTACTO EMERGENCIA CUSCO</span>
              <strong class="text-dark">${escapeHtml(propTel)} (${escapeHtml(propDistrito)})</strong>
            </div>
          </div>

          <div class="p-2 rounded-2 bg-light border small">
            <div><strong>Alergias / Médicas:</strong> ${escapeHtml(m.alergias_restricciones)}</div>
            <div><strong>Medicación:</strong> ${escapeHtml(m.medicacion_actual)}</div>
          </div>
        </div>

        <div class="carnet-qr-box">
          <div id="paw-id-qrcode-target" class="carnet-qr-canvas" title="Escanea para abrir ficha pública de emergencia"></div>
          <div class="fw-bold text-dark mt-1" style="font-size:0.72rem;">ESCANEAR EN EMERGENCIA</div>
          <a href="#/paw-id/${encodeURIComponent(m.paw_id)}" class="small text-primary no-print" data-bs-dismiss="modal" style="font-size:0.72rem;">
            Abrir ficha pública <i class="bi bi-box-arrow-up-right"></i>
          </a>
        </div>
      </div>

      <div class="carnet-credencial-footer">
        <div>
          <i class="bi bi-hospital-fill text-success me-1"></i>
          <strong>Clínica Validadora:</strong> ${escapeHtml(m.clinica_validadora_nombre)}
          <span class="badge bg-secondary ms-1">${escapeHtml(m.clinica_validadora_cmvp)}</span>
        </div>
        <div class="text-muted">
          Dictamen: <em>${escapeHtml(m.observacion_veterinaria)}</em>
        </div>
      </div>
    </div>

    <!-- Historial Clínico y Atenciones S.O.S. (Oculto al imprimir solo si el usuario desea credencial limpia) -->
    <div class="mt-4 no-print">
      <h6 class="fw-bold text-secondary mb-2">
        <i class="bi bi-journal-medical text-warning me-1"></i>Historial Clínico Auditado & Atenciones S.O.S.
      </h6>
      <div class="list-group small">
        <div class="list-group-item d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-bold text-dark">
              <i class="bi bi-clipboard2-pulse text-success me-1"></i>Dictamen de Cartilla de Vacunación (${escapeHtml(m.clinica_validadora_nombre)})
            </div>
            <div class="text-secondary">${escapeHtml(m.observacion_veterinaria)}</div>
          </div>
          <span class="badge bg-light text-dark border">${m.fecha_ultima_validacion ? formatFechaEs(m.fecha_ultima_validacion) : 'Reciente'}</span>
        </div>
        ${sosMascota.map((s) => `
          <div class="list-group-item d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-bold text-danger">
                <i class="bi bi-bandaid-fill me-1"></i>Atención S.O.S. ${escapeHtml(s.codigo_sos || '')} — ${escapeHtml(s.tipo_incidencia || 'Emergencia')}
              </div>
              <div class="text-secondary">Diagnóstico: ${escapeHtml(s.diagnostico_clinico || s.descripcion || 'En evaluación clínica')}</div>
              ${s.tratamiento_aplicado ? `<div class="text-muted">Tratamiento: ${escapeHtml(s.tratamiento_aplicado)}</div>` : ''}
            </div>
            <span class="badge bg-danger-subtle text-danger text-uppercase">${escapeHtml(s.estado_sos || 'emitida')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const footerHtml = `
    <a href="#/paw-id/${encodeURIComponent(m.paw_id)}" class="btn btn-outline-secondary btn-sm me-auto" id="btn-ir-qr-publico">
      <i class="bi bi-phone me-1"></i>Ver Vista Pública de Collar QR
    </a>
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
    <button type="button" class="btn btn-paw" id="btn-print-carnet-paw">
      <i class="bi bi-printer-fill me-1"></i>Imprimir / Guardar PDF
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Carné Digital Oficial ${m.paw_id} — ${m.nombre}`,
    icono: 'bi-qr-code-scan',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  // Renderizar código QR real con QRCode.js
  const qrContainer = modal.el.querySelector('#paw-id-qrcode-target');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    if (typeof window.QRCode === 'function') {
      new window.QRCode(qrContainer, {
        text: urlPublicaQr,
        width: 116,
        height: 116,
        colorDark: '#2E4057',
        colorLight: '#FFFFFF',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      qrContainer.innerHTML = `<div class="small text-center p-2 border">${escapeHtml(m.paw_id)}</div>`;
    }
  }

  modal.el.querySelector('#btn-ir-qr-publico')?.addEventListener('click', () => {
    modal.cerrar();
  });

  modal.el.querySelector('#btn-print-carnet-paw')?.addEventListener('click', () => {
    window.print();
  });
}

/**
 * Visor Universal de Cartilla de Vacunación (compatible con Imágenes, PDFs y URLs firmadas)
 */
export async function abrirVisorCartillaVacunas(mascota) {
  const m = normalizarMascota(mascota);
  const url = m.cartilla_vacunas_url || m.foto_url;

  const extraHeaderHtml = `
    <div class="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded border">
      <div class="text-start small">
        <strong>Mascota:</strong> ${escapeHtml(m.nombre)} (${escapeHtml(m.paw_id)})<br>
        <strong>Vigencia declarada:</strong> ${m.fecha_venc_vacunas ? formatFechaEs(m.fecha_venc_vacunas) : 'En revisión'}
      </div>
      <div>${renderBadgeSanitario(m.estado_validacion_vet)}</div>
    </div>
  `;

  return abrirVisorDocumento(url, `Cartilla Sanitaria — ${m.nombre} (${m.paw_id})`, extraHeaderHtml);
}

/**
 * Abre el Comprobante Electrónico Imprimible (Boleta / Factura) de una Reserva
 */
export function abrirModalComprobantePago(reserva, propietarioProfile = null) {
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const montoTotal = Number(reserva.monto_total || 0);
  const comision15 = Number(reserva.comision_plataforma ?? (montoTotal * 0.15).toFixed(2));
  const netoCuidador85 = Number(reserva.monto_neto_cuidador ?? (montoTotal - comision15).toFixed(2));
  const numComprobante = reserva.num_comprobante || `B001-${String(reserva.codigo_reserva || '000101').slice(-6)}`;
  const tipoComprobante = reserva.tipo_comprobante || 'Boleta de Venta Electrónica';
  const metodoPago = reserva.metodo_pago || 'Yape';
  const numOperacion = reserva.num_operacion || 'OP-882100';
  const clienteNombre = propietarioProfile
    ? `${propietarioProfile.nombre || ''} ${propietarioProfile.apellido || ''}`.trim()
    : 'Lucía Mendoza Vargas';
  const clienteDoc = `${propietarioProfile?.tipo_documento || 'DNI'}: ${propietarioProfile?.num_documento || '72849102'}`;

  const cuerpoHtml = `
    <div class="comprobante-print-wrapper p-4 bg-white border rounded-3">
      <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
        <div>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-heart-pulse-fill text-warning fs-3"></i>
            <div>
              <h5 class="fw-bold mb-0 text-dark">PAW PATITA CUSCO S.A.C.</h5>
              <div class="small text-muted">RUC: 20609876541 • Av. El Sol 450, Cusco - Perú</div>
            </div>
          </div>
        </div>
        <div class="text-end border rounded-3 px-3 py-2 bg-light">
          <div class="fw-bold text-uppercase small text-secondary">${escapeHtml(tipoComprobante)}</div>
          <div class="fs-5 fw-bold text-primary">${escapeHtml(numComprobante)}</div>
        </div>
      </div>

      <div class="row g-2 small mb-3">
        <div class="col-sm-6">
          <div><strong>Cliente / Propietario:</strong> ${escapeHtml(clienteNombre)}</div>
          <div><strong>Documento:</strong> ${escapeHtml(clienteDoc)}</div>
          <div><strong>Código de Reserva:</strong> <span class="badge bg-dark">${escapeHtml(reserva.codigo_reserva || 'RES-2026')}</span></div>
        </div>
        <div class="col-sm-6 text-sm-end">
          <div><strong>Fecha de Emisión:</strong> ${formatFechaEs(reserva.fecha_pago || reserva.created_at || new Date().toISOString(), true)}</div>
          <div><strong>Método de Pago:</strong> ${escapeHtml(metodoPago)} (${escapeHtml(numOperacion)})</div>
          <div><strong>Mascota Custodiada:</strong> ${escapeHtml(reserva.mascota_nombre || 'Inti')} (${escapeHtml(reserva.mascota_paw_id || 'PAW-6858')})</div>
        </div>
      </div>

      <div class="table-responsive mb-3">
        <table class="table table-sm table-bordered align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Concepto / Servicio en Cusco</th>
              <th class="text-center">Días</th>
              <th class="text-end">Tarifa Unit.</th>
              <th class="text-end">Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="fw-bold">${escapeHtml(reserva.tipo_servicio || reserva.categoria_servicio || 'Custodia Familiar')}</div>
                <div class="small text-muted">
                  Cuidador(a): ${escapeHtml(reserva.cuidador_nombre || 'Valeria Huamán')} (${escapeHtml(reserva.cuidador_distrito || 'Wanchaq')}) •
                  Del ${formatFechaEs(reserva.fecha_inicio)} al ${formatFechaEs(reserva.fecha_fin)} (${escapeHtml(BLOQUE_HORARIO_LABELS[reserva.bloque_horario] || BLOQUE_HORARIO_LABELS.todo_el_dia)})
                </div>
              </td>
              <td class="text-center">${escapeHtml(reserva.dias_calculados || 1)}</td>
              <td class="text-end">${formatMoneda(reserva.tarifa_unitaria || montoTotal, moneda)}</td>
              <td class="text-end fw-semibold">${formatMoneda(reserva.subtotal_base || montoTotal, moneda)}</td>
            </tr>
            ${Number(reserva.ajuste_temporada) > 0 ? `
              <tr>
                <td colspan="3" class="text-secondary">Ajuste por Temporada Turística Cusco</td>
                <td class="text-end">+ ${formatMoneda(reserva.ajuste_temporada, moneda)}</td>
              </tr>
            ` : ''}
            ${Number(reserva.recargo_cachorro) > 0 ? `
              <tr>
                <td colspan="3" class="text-secondary">Recargo Cuidado Especial Cachorro (&lt; 1 año)</td>
                <td class="text-end">+ ${formatMoneda(reserva.recargo_cachorro, moneda)}</td>
              </tr>
            ` : ''}
            ${Number(reserva.extras_monto) > 0 ? `
              <tr>
                <td colspan="3" class="text-secondary">Servicios Adicionales (Baño Higiénico / Recojo Hotel)</td>
                <td class="text-end">+ ${formatMoneda(reserva.extras_monto, moneda)}</td>
              </tr>
            ` : ''}
            ${Number(reserva.descuento_cupon) > 0 ? `
              <tr class="table-success">
                <td colspan="3" class="text-success fw-semibold">Descuento por Cupón Promocional Aplicado</td>
                <td class="text-end text-success fw-bold">- ${formatMoneda(reserva.descuento_cupon, moneda)}</td>
              </tr>
            ` : ''}
          </tbody>
          <tfoot>
            <tr class="table-dark">
              <th colspan="3" class="text-end">TOTAL PAGADO (${escapeHtml(moneda)})</th>
              <th class="text-end fs-6">${formatMoneda(montoTotal, moneda)}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="p-3 rounded-3 bg-light border small">
        <div class="fw-bold text-secondary mb-1"><i class="bi bi-shield-lock-fill text-warning me-1"></i>Desglose de Pago Protegido en Garantía Paw Patita Cusco:</div>
        <div class="d-flex justify-content-between">
          <span>Fondo de Custodia para el Cuidador (85% en garantía hasta Check-Out):</span>
          <strong>${formatMoneda(netoCuidador85, moneda)}</strong>
        </div>
        <div class="d-flex justify-content-between">
          <span>Comisión de Plataforma, Soporte S.O.S. 24h y Verificación PAW-ID (15%):</span>
          <strong>${formatMoneda(comision15, moneda)}</strong>
        </div>
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
    <button type="button" class="btn btn-paw" id="btn-imprimir-comprobante">
      <i class="bi bi-printer-fill me-1"></i>Imprimir / Descargar PDF
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Comprobante Electrónico ${numComprobante}`,
    icono: 'bi-receipt-cutoff',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  modal.el.querySelector('#btn-imprimir-comprobante')?.addEventListener('click', () => {
    window.print();
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

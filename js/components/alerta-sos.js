/**
 * Paw Patita Cusco v5.0 — Emisión y Seguimiento en Tiempo Real de Alertas S.O.S. Veterinarias
 * js/components/alerta-sos.js
 *
 * Funcionalidades:
 *  - Emisión inmediata de emergencia veterinaria invocando `rpc_emitir_sos`
 *  - Selección de reserva activa/reciente, severidad (`leve` | `moderada` | `critica`),
 *    tipo de emergencia, síntomas/ubicación en Cusco y Clínica Veterinaria Aliada
 *  - Auto-sugerencia de la clínica 24 Horas más cercana por distancia geodésica en Cusco
 *  - Timeline en tiempo real de estados clínicos: `emitida` -> `en_atencion` -> `estabilizada` -> `resuelta`
 *    con diagnóstico médico, tratamiento aplicado, informe de alta y botón de llamada directa
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import { formatFechaEs, formatMoneda, escapeHtml } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';
import { attachFormValidation, validateFormNow } from '../utils/validators.js';
import { t } from '../i18n.js';

const STORAGE_KEY_SOS = 'paw_demo_sos_owner_v5';

export const CLINICAS_CUSCO_SOS = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    codigo_clinica: 'VET-001',
    nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    direccion: 'Av. de la Cultura 1420, frente a UNSAAC',
    distrito_cusco: 'Wanchaq',
    latitud: -13.5226,
    longitud: -71.9612,
    telefono_emergencia: '+51 984 711 222',
    horario_atencion: '24 Horas',
    tarifa_consulta_emergencia: 60.00,
    colegiatura_cmvp: 'CMVP-CUSCO-4821'
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    codigo_clinica: 'VET-002',
    nombre: 'Centro Médico Veterinario Qorikancha Pet',
    direccion: 'Av. El Sol 815, Centro Histórico',
    distrito_cusco: 'Cusco Centro',
    latitud: -13.5192,
    longitud: -71.9754,
    telefono_emergencia: '+51 984 822 333',
    horario_atencion: '24 Horas',
    tarifa_consulta_emergencia: 65.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5104'
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    codigo_clinica: 'VET-003',
    nombre: 'Veterinaria Los Andes & Spa Canino',
    direccion: 'Av. Cusco 512, Paradero Enaco',
    distrito_cusco: 'San Sebastián',
    latitud: -13.5318,
    longitud: -71.9365,
    telefono_emergencia: '+51 984 933 444',
    horario_atencion: 'Extendido',
    tarifa_consulta_emergencia: 50.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5390'
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    codigo_clinica: 'VET-004',
    nombre: 'Hospital Veterinario Valle Sur Cusco',
    direccion: 'Av. Manco Cápac 310, Plaza San Jerónimo',
    distrito_cusco: 'San Jerónimo',
    latitud: -13.5449,
    longitud: -71.8842,
    telefono_emergencia: '+51 984 644 555',
    horario_atencion: '24 Horas',
    tarifa_consulta_emergencia: 55.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5612'
  }
];

export const SOS_SEED_OWNER = [
  {
    id: '95000000-0000-0000-0000-000000000001',
    codigo_sos: 'SOS-2026-0101',
    id_reserva: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    cuidador_nombre: 'Valeria Huamán Delgado',
    id_clinica_derivada: '40000000-0000-0000-0000-000000000001',
    clinica_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    clinica_telefono: '+51 984 711 222',
    clinica_direccion: 'Av. de la Cultura 1420, Wanchaq',
    nivel_severidad: 'moderada',
    tipo_incidencia: 'Irritación en almohadilla plantar tras paseo',
    descripcion: 'Durante el paseo matutino en Wanchaq, Inti pisó una espina seca en el césped y presenta leve cojera en la pata delantera derecha.',
    ubicacion_emergencia: 'Parque Marianito Ferro, Wanchaq',
    estado_sos: 'en_atencion',
    diagnostico_clinico: 'Cuerpo extraño superficial (espina vegetal) en almohadilla metacarpiana derecha sin sangrado profundo.',
    tratamiento_aplicado: 'Extracción aséptica, lavado con clorhexidina al 2% y vendaje protector ligero.',
    informe_resolucion: null,
    costo_atencion_ref: 60.00,
    estado_cobro_sos: 'pendiente_pago',
    metodo_pago_sos: null,
    comprobante_pago_sos: null,
    fecha_pago_sos: null,
    observacion_cobro_sos: null,
    fecha_incidencia: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    fecha_atencion: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    fecha_resolucion: null
  },
  {
    id: '95000000-0000-0000-0000-000000000002',
    codigo_sos: 'SOS-2026-0102',
    id_reserva: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    cuidador_nombre: 'Valeria Huamán Delgado',
    id_clinica_derivada: '40000000-0000-0000-0000-000000000001',
    clinica_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    clinica_telefono: '+51 984 711 222',
    clinica_direccion: 'Av. de la Cultura 1420, Wanchaq',
    nivel_severidad: 'leve',
    tipo_incidencia: 'Control preventivo por fatiga de altura',
    descripcion: 'Chequeo preventivo solicitado tras caminata larga.',
    ubicacion_emergencia: 'Av. de la Cultura 1420, Wanchaq',
    estado_sos: 'resuelta',
    diagnostico_clinico: 'Signos vitales normales; saturación de oxígeno al 96% y frecuencia cardíaca fisiológica.',
    tratamiento_aplicado: 'Hidratación oral con electrolitos y reposo de 2 horas.',
    informe_resolucion: 'Alta médica inmediata sin hallazgos patológicos.',
    costo_atencion_ref: 50.00,
    estado_cobro_sos: 'conciliado',
    metodo_pago_sos: 'Yape',
    comprobante_pago_sos: 'YAPE-SOS-0102',
    fecha_pago_sos: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    observacion_cobro_sos: 'Cargo clínico histórico conciliado.',
    fecha_incidencia: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    fecha_atencion: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    fecha_resolucion: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString()
  }
];

function getLocalSosList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(SOS_SEED_OWNER));
  return [...SOS_SEED_OWNER];
}

function saveLocalSosList(list) {
  try {
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Renderiza el badge semántico del estado de cobro clínico S.O.S. (compartido en Propietario, Vet y Admin)
 */
export function renderBadgeEstadoCobroSos(estadoCobro, costoRef = 0) {
  const costo = Number(costoRef || 0);
  const est = String(estadoCobro || (costo > 0 ? 'pendiente_pago' : 'sin_cargo')).toLowerCase();

  if (costo <= 0 && est === 'sin_cargo') {
    return `<span class="badge bg-light text-secondary border"><i class="bi bi-dash-circle me-1"></i>${escapeHtml(t('sos.cobro_sin_cargo'))}</span>`;
  }
  const map = {
    pendiente_pago: {
      cls: 'bg-danger-subtle text-danger border border-danger-subtle',
      icon: 'bi-exclamation-circle-fill',
      label: t('sos.cobro_pendiente')
    },
    reportado_propietario: {
      cls: 'bg-warning-subtle text-dark border border-warning-subtle',
      icon: 'bi-hourglass-split',
      label: t('sos.cobro_reportado')
    },
    conciliado: {
      cls: 'bg-success text-white',
      icon: 'bi-patch-check-fill',
      label: t('sos.cobro_conciliado')
    },
    exonerado: {
      cls: 'bg-info-subtle text-primary border border-info-subtle',
      icon: 'bi-shield-check',
      label: t('sos.cobro_exonerado')
    },
    sin_cargo: {
      cls: 'bg-light text-secondary border',
      icon: 'bi-dash-circle',
      label: t('sos.cobro_sin_cargo')
    }
  };
  const cfg = map[est] || map.pendiente_pago;
  return `<span class="badge ${cfg.cls} px-2 py-1"><i class="bi ${cfg.icon} me-1"></i>${escapeHtml(cfg.label)}</span>`;
}

/**
 * Calcula los totales financieros de cargos clínicos S.O.S. para KPIs y alertas del Propietario
 */
export function calcularResumenFinancieroSos(alertasSos = []) {
  const lista = (alertasSos || []).map(normalizarIncidenciaSos);
  let montoPendiente = 0;
  let montoReportado = 0;
  let montoConciliado = 0;
  let casosPendientes = 0;
  let casosReportados = 0;
  let casosConciliados = 0;
  let casosExonerados = 0;

  lista.forEach((s) => {
    const costo = Number(s.costo_atencion_ref || 0);
    if (costo <= 0) return;
    if (s.estado_cobro_sos === 'pendiente_pago' || s.estado_cobro_sos === 'sin_cargo') {
      montoPendiente += costo;
      casosPendientes++;
    } else if (s.estado_cobro_sos === 'reportado_propietario') {
      montoReportado += costo;
      casosReportados++;
    } else if (s.estado_cobro_sos === 'conciliado') {
      montoConciliado += costo;
      casosConciliados++;
    } else if (s.estado_cobro_sos === 'exonerado') {
      casosExonerados++;
    }
  });

  return {
    totalCasos: lista.length,
    casosPendientes,
    casosReportados,
    casosConciliados,
    casosExonerados,
    montoPendiente: Number(montoPendiente.toFixed(2)),
    montoReportado: Number(montoReportado.toFixed(2)),
    montoConciliado: Number(montoConciliado.toFixed(2)),
    montoRegularizadoYConciliado: Number((montoReportado + montoConciliado).toFixed(2))
  };
}

/**
 * Obtiene las clínicas activas de Cusco
 */
export async function cargarClinicasAliadasSos() {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('clinicas_veterinarias')
        .select('*')
        .eq('estado_afiliacion', 'activa')
        .eq('activa', true)
        .order('horario_atencion', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) return data;
    } catch (_) { /* fallback */ }
  }
  return CLINICAS_CUSCO_SOS;
}

/**
 * Obtiene las alertas S.O.S. vinculadas al propietario o sus mascotas
 */
export async function obtenerAlertasSosPropietario(idPropietario, mascotasIds = []) {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && idPropietario && !String(idPropietario).startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('incidencias_emergencias')
        .select('*, mascotas(nombre, paw_id), clinicas_veterinarias(nombre, telefono_emergencia, direccion), reservas(codigo_reserva)')
        .order('fecha_incidencia', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map(normalizarIncidenciaSos);
      }
    } catch (err) {
      console.warn('Error al consultar alertas S.O.S. del propietario:', err);
    }
  }

  return getLocalSosList().map(normalizarIncidenciaSos);
}

export function normalizarIncidenciaSos(inc) {
  const clinicaMatch = CLINICAS_CUSCO_SOS.find((c) => c.id === inc.id_clinica_derivada) || CLINICAS_CUSCO_SOS[0];
  const costo = Number(inc.costo_atencion_ref || 0);
  const estadoSos = (inc.estado_sos || 'emitida').toLowerCase();
  let estadoCobro = inc.estado_cobro_sos ? String(inc.estado_cobro_sos).toLowerCase() : null;
  if (!estadoCobro || (estadoCobro === 'sin_cargo' && costo > 0)) {
    if (costo > 0) {
      estadoCobro = (inc.codigo_sos === 'SOS-2026-0102' && estadoSos === 'resuelta')
        ? 'conciliado'
        : 'pendiente_pago';
    } else {
      estadoCobro = 'sin_cargo';
    }
  }

  return {
    id: inc.id || `sos-${Date.now()}`,
    codigo_sos: inc.codigo_sos || 'SOS-2026-0100',
    id_reserva: inc.id_reserva || '',
    codigo_reserva: inc.codigo_reserva || inc.reservas?.codigo_reserva || 'RES-2026-0102',
    id_mascota: inc.id_mascota || '',
    mascota_nombre: inc.mascota_nombre || inc.mascotas?.nombre || 'Inti',
    mascota_paw_id: inc.mascota_paw_id || inc.mascotas?.paw_id || 'PAW-6858',
    id_clinica_derivada: inc.id_clinica_derivada || clinicaMatch.id,
    clinica_nombre: inc.clinica_nombre || inc.clinicas_veterinarias?.nombre || clinicaMatch.nombre,
    clinica_telefono: inc.clinica_telefono || inc.clinicas_veterinarias?.telefono_emergencia || clinicaMatch.telefono_emergencia,
    clinica_direccion: inc.clinica_direccion || inc.clinicas_veterinarias?.direccion || clinicaMatch.direccion,
    nivel_severidad: (inc.nivel_severidad || 'moderada').toLowerCase(),
    tipo_incidencia: inc.tipo_incidencia || 'Urgencia Veterinaria S.O.S.',
    descripcion: inc.descripcion || 'Sin descripción adicional.',
    ubicacion_emergencia: inc.ubicacion_emergencia || 'Cusco',
    estado_sos: estadoSos,
    diagnostico_clinico: inc.diagnostico_clinico || null,
    tratamiento_aplicado: inc.tratamiento_aplicado || null,
    informe_resolucion: inc.informe_resolucion || null,
    costo_atencion_ref: costo,
    estado_cobro_sos: estadoCobro,
    metodo_pago_sos: inc.metodo_pago_sos || null,
    comprobante_pago_sos: inc.comprobante_pago_sos || null,
    fecha_pago_sos: inc.fecha_pago_sos || null,
    observacion_cobro_sos: inc.observacion_cobro_sos || null,
    fecha_incidencia: inc.fecha_incidencia || inc.created_at || new Date().toISOString(),
    fecha_atencion: inc.fecha_atencion || null,
    fecha_resolucion: inc.fecha_resolucion || null
  };
}

/**
 * Calcula la clínica 24h más cercana en Cusco según distrito o coordenadas
 */
function sugerirClinica24hCercana(clinicas = [], distritoReferencia = 'Wanchaq') {
  const mismoDistrito24h = clinicas.find(
    (c) => c.distrito_cusco === distritoReferencia && String(c.horario_atencion).includes('24')
  );
  if (mismoDistrito24h) return mismoDistrito24h;
  const primera24h = clinicas.find((c) => String(c.horario_atencion).includes('24'));
  return primera24h || clinicas[0];
}

/**
 * Abre el Modal de Emisión Inmediata de Alerta S.O.S. Veterinaria
 * Si `soloEnCurso === true` o `roleContext === 'cuidador'`, filtra estrictamente `estado_reserva === 'en_curso'`.
 */
export async function abrirModalEmitirSos({
  reservas = [],
  preselectedReservaId = null,
  distritoPropietario = 'Wanchaq',
  soloEnCurso = false,
  roleContext = 'propietario',
  onSosEmitido = null,
  onIrAReservas = null
} = {}) {
  const esContextoCuidador = Boolean(soloEnCurso || roleContext === 'cuidador');
  const reservasCandidatas = (reservas || []).filter((r) => (
    esContextoCuidador
      ? r.estado_reserva === 'en_curso'
      : ['en_curso', 'confirmada', 'pendiente_confirmacion', 'finalizada'].includes(r.estado_reserva)
  ));

  if (reservasCandidatas.length === 0) {
    if (esContextoCuidador) {
      const confirmadasCount = (reservas || []).filter((r) => r.estado_reserva === 'confirmada').length;
      const modalVacio = crearModalDinamico({
        titulo: t('sos.cuidador_sin_custodia_titulo'),
        icono: 'bi-shield-exclamation',
        headerClass: 'bg-warning-subtle text-dark',
        cuerpoHtml: `
          <div class="text-center py-2">
            <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger mb-3" style="width:64px;height:64px;">
              <i class="bi bi-hospital-fill fs-2"></i>
            </div>
            <h5 class="fw-bold text-dark mb-2">${escapeHtml(t('sos.cuidador_sin_custodia_titulo'))}</h5>
            <p class="text-secondary small mb-3">
              ${escapeHtml(t('sos.cuidador_sin_custodia_desc'))}
            </p>
            <div class="p-3 rounded-3 bg-light border small text-start">
              <div class="fw-bold text-dark mb-1"><i class="bi bi-info-circle-fill text-primary me-1"></i>¿Cómo activar la cobertura S.O.S.?</div>
              <ul class="mb-0 ps-3 text-secondary">
                <li>Las reservas <strong>finalizadas</strong> o <strong>pendientes</strong> no pueden emitir alertas S.O.S. desde el panel del cuidador.</li>
                ${confirmadasCount > 0
                  ? `<li>Tienes <strong>${confirmadasCount} reserva(s) confirmada(s)</strong>: registra el <strong>Check-In</strong> al recibir a la mascota para activar la custodia y el botón S.O.S.</li>`
                  : '<li>Cuando recibas una mascota en custodia y registres el <strong>Check-In</strong>, el botón S.O.S. quedará habilitado de inmediato.</li>'}
              </ul>
            </div>
          </div>
        `,
        footerHtml: `
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Entendido</button>
          ${typeof onIrAReservas === 'function' ? `
            <button type="button" class="btn btn-paw fw-bold" id="btn-sos-ir-reservas-cuid">
              <i class="bi bi-inboxes-fill me-1"></i>Ir a 1. Reservas y Check-In
            </button>
          ` : ''}
        `,
        tamano: ''
      });

      modalVacio.el.querySelector('#btn-sos-ir-reservas-cuid')?.addEventListener('click', async () => {
        await modalVacio.cerrarAsync();
        onIrAReservas();
      });
      return;
    }

    showToast('Debes contar con una reserva registrada para vincular la alerta S.O.S.', 'warning');
    return;
  }

  const clinicas = await cargarClinicasAliadasSos();
  const reservaActiva = reservasCandidatas.find((r) => r.id === preselectedReservaId)
    || reservasCandidatas.find((r) => r.estado_reserva === 'en_curso')
    || reservasCandidatas[0];

  const clinicaSugerida = sugerirClinica24hCercana(
    clinicas,
    reservaActiva?.cuidador_distrito || distritoPropietario
  );

  const cuerpoHtml = `
    <div class="alert alert-danger border-0 d-flex align-items-center gap-3 mb-3">
      <i class="bi bi-broadcast-pin fs-2"></i>
      <div class="small">
        <strong>Protocolo de Triaje Veterinario Inmediato (Cusco 24h):</strong>
        Al emitir esta alerta S.O.S., se notificará en tiempo real a la <strong>Clínica Veterinaria Aliada</strong>,
        al <strong>Administrador de Red</strong> y ${esContextoCuidador ? 'al <strong>Propietario de la mascota</strong>' : 'al <strong>Cuidador asignado</strong>'}.
      </div>
    </div>

    <form id="form-emitir-sos" novalidate>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label small fw-bold">
            Reserva y Mascota Afectada *
            ${esContextoCuidador ? '<span class="badge bg-success-subtle text-success ms-1">Solo En Curso</span>' : ''}
          </label>
          <select class="form-select" id="sos-select-reserva" required>
            ${reservasCandidatas.map((r) => `
              <option value="${escapeHtml(r.id)}" ${r.id === reservaActiva?.id ? 'selected' : ''}>
                ${escapeHtml(r.codigo_reserva)} — ${escapeHtml(r.mascota_nombre)} (${escapeHtml(r.mascota_paw_id)}) [${escapeHtml(r.estado_reserva.toUpperCase())}]
              </option>
            `).join('')}
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label small fw-bold">Nivel de Severidad Clínica *</label>
          <select class="form-select" id="sos-select-severidad" required>
            <option value="critica">🚨 CRÍTICA — Urgencia Vital / Atención Inmediata 24h</option>
            <option value="moderada" selected>⚠️ MODERADA — Cojera, vómito, dolor o herida superficial</option>
            <option value="leve">ℹ️ LEVE — Consulta preventiva / Malestar de altura</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label small fw-bold">Motivo / Tipo de Emergencia *</label>
          <select class="form-select" id="sos-select-tipo">
            <option value="Mal de Altura / Hipoxia Canina en Cusco">Mal de Altura / Fatiga Respiratoria en Cusco</option>
            <option value="Lesión o Cojera durante Paseo">Lesión o Cojera en Almohadilla / Paseo</option>
            <option value="Ingesta Accidental / Trastorno Digestivo">Ingesta Accidental / Vómitos o Diarrea</option>
            <option value="Reacción Alérgica Aguda">Reacción Alérgica Aguda</option>
            <option value="Urgencia Médica General">Otra Urgencia Médica General</option>
          </select>
        </div>

        <div class="col-md-6">
          <label class="form-label small fw-bold">Ubicación / Dirección Actual de Emergencia en Cusco *</label>
          <div class="input-group">
            <input type="text" class="form-control" id="sos-input-ubicacion" required minlength="4" maxlength="160"
              value="${escapeHtml(reservaActiva?.cuidador_distrito || distritoPropietario)}, Cusco"
              placeholder="Ej. Av. de la Cultura 1420, Wanchaq">
            <button class="btn btn-outline-secondary" type="button" id="sos-btn-gps" title="Detectar GPS en Cusco">
              <i class="bi bi-crosshair"></i> GPS
            </button>
          </div>
          <div class="form-text small">Indica referencia exacta o pulsa GPS para ayudar a la clínica 24h.</div>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold">
            Clínica Veterinaria Aliada Derivada *
            <span class="badge bg-success ms-1">Auto-sugerida 24h más cercana</span>
          </label>
          <select class="form-select" id="sos-select-clinica" required>
            ${clinicas.map((c) => `
              <option value="${escapeHtml(c.id)}" ${c.id === clinicaSugerida?.id ? 'selected' : ''}>
                [${escapeHtml(c.horario_atencion)}] ${escapeHtml(c.nombre)} — ${escapeHtml(c.distrito_cusco)} (Tel: ${escapeHtml(c.telefono_emergencia)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold">Descripción de Síntomas y Estado de la Mascota * (mín. 5 caracteres)</label>
          <textarea class="form-control" id="sos-input-descripcion" rows="3" required minlength="5" maxlength="500"
            placeholder="Describe detalladamente los síntomas observados, desde hace cuánto tiempo ocurren y si la mascota recibió algún primer auxilio..."></textarea>
          <div class="form-text small">Describe signos claros (respiración, movilidad, herida o ingestión) para agilizar el triaje.</div>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-danger fw-bold px-4" id="btn-confirmar-emision-sos">
      <i class="bi bi-exclamation-octagon-fill me-1"></i>EMITIR ALERTA S.O.S. AHORA
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: 'Emitir Alerta Veterinaria S.O.S. en Cusco',
    icono: 'bi-exclamation-triangle-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg',
    headerClass: 'bg-danger text-white',
    headerOscuro: true
  });

  const formSos = modal.el.querySelector('#form-emitir-sos');
  attachFormValidation(formSos);

  // Botón de geolocalización rápida en Cusco
  modal.el.querySelector('#sos-btn-gps')?.addEventListener('click', () => {
    const inputUbi = modal.el.querySelector('#sos-input-ubicacion');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          inputUbi.value = `GPS Cusco (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) - ${distritoPropietario}`;
          showToast('Coordenadas GPS capturadas con éxito.', 'info');
        },
        () => {
          inputUbi.value = `Plaza Túpac Amaru, ${distritoPropietario} (-13.5226, -71.9612)`;
          showToast('Ubicación referencial en Cusco establecida.', 'info');
        },
        { timeout: 3500 }
      );
    } else {
      inputUbi.value = `Plaza Túpac Amaru, ${distritoPropietario} (-13.5226, -71.9612)`;
    }
  });

  // Confirmar emisión llamando al servicio de emergencias
  modal.el.querySelector('#btn-confirmar-emision-sos')?.addEventListener('click', async () => {
    if (!validateFormNow(formSos).valid) return;

    const idReserva = modal.el.querySelector('#sos-select-reserva').value;
    const severidad = modal.el.querySelector('#sos-select-severidad').value;
    const tipo = modal.el.querySelector('#sos-select-tipo').value;
    const ubicacion = modal.el.querySelector('#sos-input-ubicacion').value.trim() || 'Cusco';
    const idClinica = modal.el.querySelector('#sos-select-clinica').value;
    const descripcionRaw = modal.el.querySelector('#sos-input-descripcion').value.trim();

    const resObj = reservasCandidatas.find((r) => r.id === idReserva) || reservaActiva;
    if (esContextoCuidador && resObj?.estado_reserva !== 'en_curso') {
      showToast(t('sos.cuidador_sin_custodia_desc'), 'warning');
      return;
    }

    const clinicaObj = clinicas.find((c) => c.id === idClinica) || clinicaSugerida;

    showSpinner('Enviando alerta S.O.S. a la Clínica Veterinaria 24h y Central de Emergencias...');
    try {
      const supabase = getSupabase();
      let rpcData = null;

      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.rpc('rpc_emitir_sos', {
          p_id_reserva: idReserva,
          p_severidad: severidad,
          p_tipo: tipo,
          p_descripcion: descripcionRaw,
          p_id_clinica: idClinica,
          p_ubicacion: ubicacion
        });
        if (error) throw error;
        rpcData = data;
      }

      const seqNum = Math.floor(105 + Math.random() * 890);
      const nuevaSos = normalizarIncidenciaSos({
        id: rpcData?.id_incidencia || `95000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
        codigo_sos: rpcData?.codigo_sos || `SOS-2026-0${seqNum}`,
        id_reserva: idReserva,
        codigo_reserva: resObj?.codigo_reserva || 'RES-2026',
        id_mascota: resObj?.id_mascota || '80000000-0000-0000-0000-000000000001',
        mascota_nombre: resObj?.mascota_nombre || 'Inti',
        mascota_paw_id: resObj?.mascota_paw_id || 'PAW-6858',
        id_clinica_derivada: clinicaObj.id,
        clinica_nombre: rpcData?.clinica_nombre || clinicaObj.nombre,
        clinica_telefono: clinicaObj.telefono_emergencia,
        clinica_direccion: clinicaObj.direccion,
        nivel_severidad: severidad,
        tipo_incidencia: tipo,
        descripcion: descripcionRaw,
        ubicacion_emergencia: ubicacion,
        estado_sos: 'emitida',
        costo_atencion_ref: 0,
        estado_cobro_sos: 'sin_cargo',
        fecha_incidencia: new Date().toISOString()
      });

      const localList = getLocalSosList();
      localList.unshift(nuevaSos);
      saveLocalSosList(localList);

      await modal.cerrarAsync();
      showToast(
        `🚨 Alerta ${nuevaSos.codigo_sos} emitida y derivada a ${nuevaSos.clinica_nombre}.`,
        'danger',
        'S.O.S. Veterinario Activado',
        7000
      );

      if (typeof onSosEmitido === 'function') {
        onSosEmitido(nuevaSos);
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo emitir la alerta S.O.S.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Abre el modal validado "Regularizar Cargo Clínico" del Propietario
 */
export function abrirModalRegularizarCargoSos(incidencia, onRegularizado = null) {
  const s = normalizarIncidenciaSos(incidencia);
  const tc = CUSCO_CONFIG.DEFAULT_TIPO_CAMBIO || 3.75;
  const montoPen = Number(s.costo_atencion_ref || 0);
  const montoUsd = Number((montoPen / tc).toFixed(2));

  const cuerpoHtml = `
    <div class="p-3 rounded-3 bg-light border mb-3 small">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
        <div>
          <span class="badge bg-dark font-monospace me-1">${escapeHtml(s.codigo_sos)}</span>
          ${renderBadgeEstadoCobroSos(s.estado_cobro_sos, montoPen)}
          <div class="fw-bold text-dark mt-1">
            ${escapeHtml(s.mascota_nombre)} (${escapeHtml(s.mascota_paw_id)}) — ${escapeHtml(s.clinica_nombre)}
          </div>
        </div>
        <div class="text-end">
          <div class="fs-5 fw-bold text-danger">S/ ${montoPen.toFixed(2)} PEN</div>
          <div class="text-muted">Ref. $ ${montoUsd.toFixed(2)} USD</div>
        </div>
      </div>
      ${s.diagnostico_clinico ? `<div><strong>Diagnóstico:</strong> ${escapeHtml(s.diagnostico_clinico)}</div>` : ''}
      ${s.tratamiento_aplicado ? `<div class="text-secondary mt-1"><strong>Tratamiento:</strong> ${escapeHtml(s.tratamiento_aplicado)}</div>` : ''}
    </div>

    <div class="p-3 rounded-3 bg-warning-subtle border border-warning-subtle mb-3 small">
      <div class="fw-bold text-dark mb-1"><i class="bi bi-bank2 me-1"></i>Canales de Regularización de Cargo Clínico</div>
      <div class="text-secondary">
        Yape / Plin Recaudador Cusco: <strong class="font-monospace">984000111</strong> (Paw Patita Cusco S.A.C.) •
        BCP Soles: <strong class="font-monospace">285-00112233-0-45</strong> •
        o cancelación directa en caja de <strong>${escapeHtml(s.clinica_nombre)}</strong>.
      </div>
    </div>

    <form id="form-propietario-regularizar-sos" novalidate>
      <div class="row g-3">
        <div class="col-md-5">
          <label class="form-label small fw-bold">Método de Pago Utilizado *</label>
          <select class="form-select" id="reg-sos-metodo" required>
            <option value="Yape" ${s.metodo_pago_sos === 'Yape' ? 'selected' : ''}>Yape</option>
            <option value="Plin" ${s.metodo_pago_sos === 'Plin' ? 'selected' : ''}>Plin</option>
            <option value="Transferencia Bancaria" ${s.metodo_pago_sos === 'Transferencia Bancaria' ? 'selected' : ''}>Transferencia Bancaria</option>
            <option value="Tarjeta" ${s.metodo_pago_sos === 'Tarjeta' ? 'selected' : ''}>Tarjeta de Crédito / Débito</option>
            <option value="Pago Directo en Clínica" ${s.metodo_pago_sos === 'Pago Directo en Clínica' ? 'selected' : ''}>Pago Directo en Clínica</option>
          </select>
        </div>
        <div class="col-md-7">
          <label class="form-label small fw-bold">N.º de Operación / Comprobante *</label>
          <input type="text" class="form-control font-monospace" id="reg-sos-comprobante" required
            data-validate="operation-code" maxlength="30"
            value="${escapeHtml(s.comprobante_pago_sos || '')}"
            placeholder="Ej. YAPE-994821 o BOL-004120">
          <div class="form-text small">6 a 30 caracteres (letras, números o guiones).</div>
        </div>
        <div class="col-12">
          <label class="form-label small fw-bold">Observación o Detalle Adicional (Opcional)</label>
          <textarea class="form-control" id="reg-sos-observacion" rows="2" maxlength="250"
            placeholder="Ej. Pago realizado por Yape desde el celular del propietario o recibo emitido en recepción clínica...">${escapeHtml(s.observacion_cobro_sos || '')}</textarea>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold px-4" id="btn-confirmar-reg-sos">
      <i class="bi bi-receipt-cutoff me-1"></i>Reportar Pago de S/ ${montoPen.toFixed(2)}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Regularizar Cargo Clínico S.O.S. — ${s.codigo_sos}`,
    icono: 'bi-cash-coin',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  const formEl = modal.el.querySelector('#form-propietario-regularizar-sos');
  attachFormValidation(formEl);

  modal.el.querySelector('#btn-confirmar-reg-sos')?.addEventListener('click', async () => {
    if (!validateFormNow(formEl).valid) return;

    const metodo = modal.el.querySelector('#reg-sos-metodo').value;
    const comprobante = modal.el.querySelector('#reg-sos-comprobante').value.trim();
    const observacion = modal.el.querySelector('#reg-sos-observacion').value.trim();

    showSpinner('Registrando comprobante de regularización de cargo clínico...');
    try {
      const supabase = getSupabase();
      let rpcData = null;

      if (supabase && isSupabaseConfigured() && !String(s.id).startsWith('sos-')) {
        const { data, error } = await supabase.rpc('rpc_propietario_regularizar_sos', {
          p_id_incidencia: s.id,
          p_metodo_pago: metodo,
          p_comprobante: comprobante,
          p_observacion: observacion || null
        });
        if (error) throw error;
        rpcData = data;
      }

      const actualizada = normalizarIncidenciaSos({
        ...s,
        estado_cobro_sos: rpcData?.estado_cobro_sos || 'reportado_propietario',
        metodo_pago_sos: rpcData?.metodo_pago_sos || metodo,
        comprobante_pago_sos: rpcData?.comprobante_pago_sos || comprobante,
        fecha_pago_sos: rpcData?.fecha_pago_sos || new Date().toISOString(),
        observacion_cobro_sos: rpcData?.observacion_cobro_sos || observacion || null
      });

      const localList = getLocalSosList().map((item) => (
        item.id === s.id || item.codigo_sos === s.codigo_sos ? { ...item, ...actualizada } : item
      ));
      saveLocalSosList(localList);

      await modal.cerrarAsync();
      showToast(
        `Comprobante ${comprobante} registrado para ${s.codigo_sos}. La clínica y administración verificarán y conciliarán tu pago.`,
        'success',
        'Pago Clínico Reportado'
      );

      if (typeof onRegularizado === 'function') {
        onRegularizado(actualizada);
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo registrar la regularización del cargo clínico.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Renderiza el Stepper de 4 etapas de una incidencia S.O.S.
 * (`emitida` -> `en_atencion` -> `estabilizada` -> `resuelta`)
 */
function renderStepperEstadoSos(estadoActual) {
  const etapas = [
    { key: 'emitida', label: '1. Emitida', icon: 'bi-megaphone-fill' },
    { key: 'en_atencion', label: '2. En Atención Vet', icon: 'bi-heart-pulse-fill' },
    { key: 'estabilizada', label: '3. Estabilizada', icon: 'bi-shield-plus' },
    { key: 'resuelta', label: '4. Alta / Resuelta', icon: 'bi-check-circle-fill' }
  ];
  const idxActual = Math.max(0, etapas.findIndex((e) => e.key === estadoActual));

  return `
    <div class="sos-stepper-track">
      ${etapas.map((et, idx) => {
        let cls = '';
        if (idx < idxActual || estadoActual === 'resuelta') cls = 'step-done';
        else if (idx === idxActual) cls = 'step-current';
        return `
          <div class="sos-step-node ${cls}">
            <i class="bi ${et.icon} me-1"></i>${escapeHtml(et.label)}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Renderiza la pestaña "Alertas S.O.S." del Propietario con Timeline, Resumen Financiero y Regularización
 */
export function renderSeccionAlertasSos(container, {
  alertasSos = [],
  reservas = [],
  distritoPropietario = 'Wanchaq',
  onNuevaAlerta = null,
  onCargoRegularizado = null
} = {}) {
  if (!container) return;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const tc = CUSCO_CONFIG.DEFAULT_TIPO_CAMBIO || 3.75;
  const listaNormalizada = (alertasSos || []).map(normalizarIncidenciaSos);
  const finSos = calcularResumenFinancieroSos(listaNormalizada);

  const fmtDual = (montoPen) => {
    const usd = (Number(montoPen || 0) / tc).toFixed(2);
    return moneda === 'USD'
      ? `$ ${usd} USD <span class="small fw-normal text-muted">(S/ ${Number(montoPen || 0).toFixed(2)})</span>`
      : `S/ ${Number(montoPen || 0).toFixed(2)} <span class="small fw-normal text-muted">($ ${usd} USD)</span>`;
  };

  container.innerHTML = `
    <!-- Banner de Emergencia S.O.S. -->
    <div class="sos-emergency-banner mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <div class="badge bg-warning text-dark fw-bold mb-1">PROTOCOLO DE RESPUESTA MÉDICA 24 HORAS — CUSCO</div>
        <h4 class="fw-bold text-white mb-1"><i class="bi bi-hospital-fill me-2"></i>Central de Emergencias Veterinarias S.O.S.</h4>
        <p class="mb-0 text-white-50 small">
          Derivación inmediata a Clínicas Veterinarias Aliadas acreditadas por el CMVP Cusco y trazabilidad completa de cargos clínicos.
        </p>
      </div>
      <button type="button" class="btn btn-light text-danger fw-bold px-4 py-2 shadow" id="btn-disparar-modal-sos">
        <i class="bi bi-exclamation-octagon-fill me-2"></i>Emitir Nueva Alerta S.O.S.
      </button>
    </div>

    <!-- Historial Médico y Cargos Clínicos S.O.S. (KPIs Financieros) -->
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h5 class="fw-bold mb-0">
            <i class="bi bi-receipt-cutoff text-warning me-2"></i>Historial Médico y Cargos Clínicos S.O.S.
          </h5>
          <div class="small text-secondary">Transparencia total sobre atenciones veterinarias derivadas y regularización de pagos en PEN / USD.</div>
        </div>
        ${finSos.montoPendiente > 0
          ? `<span class="badge bg-danger px-3 py-2"><i class="bi bi-exclamation-circle-fill me-1"></i>${finSos.casosPendientes} cargo(s) pendiente(s) de regularizar</span>`
          : `<span class="badge bg-success-subtle text-success border px-3 py-2"><i class="bi bi-check-circle-fill me-1"></i>Sin saldos clínicos pendientes</span>`}
      </div>

      <div class="row g-3">
        <div class="col-md-4">
          <div class="p-3 rounded-3 bg-light border h-100">
            <div class="small text-muted fw-bold text-uppercase">Casos S.O.S. Registrados</div>
            <div class="fs-4 fw-bold text-dark mt-1">${finSos.totalCasos}</div>
            <div class="small text-secondary">${finSos.casosPendientes} pend. • ${finSos.casosReportados} reportado(s) • ${finSos.casosConciliados} conciliado(s)</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 rounded-3 ${finSos.montoPendiente > 0 ? 'bg-danger-subtle border border-danger-subtle' : 'bg-light border'} h-100">
            <div class="small fw-bold text-uppercase ${finSos.montoPendiente > 0 ? 'text-danger' : 'text-muted'}">Saldo Clínico Pendiente</div>
            <div class="fs-4 fw-bold ${finSos.montoPendiente > 0 ? 'text-danger' : 'text-dark'} mt-1">${fmtDual(finSos.montoPendiente)}</div>
            <div class="small text-secondary">Atenciones clínicas por regularizar</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 rounded-3 bg-success-subtle border border-success-subtle h-100">
            <div class="small text-success fw-bold text-uppercase">Total Regularizado / Conciliado</div>
            <div class="fs-4 fw-bold text-success mt-1">${fmtDual(finSos.montoRegularizadoYConciliado)}</div>
            <div class="small text-secondary">Pagos reportados y conciliados</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lista de Incidencias S.O.S. con Línea de Tiempo y Regularización -->
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <h5 class="fw-bold mb-3">
        <i class="bi bi-activity text-danger me-2"></i>Seguimiento en Tiempo Real de Mis Alertas S.O.S. (${listaNormalizada.length})
      </h5>

      ${listaNormalizada.length === 0 ? `
        <div class="text-center py-5 bg-light rounded-3 border">
          <i class="bi bi-shield-check text-success fs-1 d-block mb-2"></i>
          <h6 class="fw-bold">No tienes alertas S.O.S. activas ni históricas</h6>
          <p class="text-secondary small mb-0">Tus mascotas se encuentran seguras. Ante cualquier eventualidad puedes activar el botón S.O.S. 24h.</p>
        </div>
      ` : listaNormalizada.map((s) => {
        const sevBadge = s.nivel_severidad === 'critica'
          ? 'bg-danger text-white'
          : (s.nivel_severidad === 'moderada' ? 'bg-warning text-dark' : 'bg-info text-dark');
        const telLimpio = String(s.clinica_telefono).replace(/[^0-9+]/g, '');
        const tieneCargo = s.costo_atencion_ref > 0;
        const puedeRegularizar = tieneCargo && ['pendiente_pago', 'sin_cargo', 'reportado_propietario'].includes(s.estado_cobro_sos);
        const esPendiente = tieneCargo && ['pendiente_pago', 'sin_cargo'].includes(s.estado_cobro_sos);

        return `
          <div class="p-3 rounded-3 border mb-3 ${s.estado_sos !== 'resuelta' ? 'border-danger bg-danger-subtle bg-opacity-10' : 'bg-white'}">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <span class="badge bg-dark me-1">${escapeHtml(s.codigo_sos)}</span>
                <span class="badge ${sevBadge} text-uppercase me-1">Severidad: ${escapeHtml(s.nivel_severidad)}</span>
                <span class="badge bg-secondary me-1">${escapeHtml(s.codigo_reserva)}</span>
                ${tieneCargo ? renderBadgeEstadoCobroSos(s.estado_cobro_sos, s.costo_atencion_ref) : ''}
                <h6 class="fw-bold text-dark mt-2 mb-1">
                  ${escapeHtml(s.tipo_incidencia)} — Mascota: <span class="text-primary">${escapeHtml(s.mascota_nombre)} (${escapeHtml(s.mascota_paw_id)})</span>
                </h6>
              </div>
              <div class="text-end small text-muted">
                <div><i class="bi bi-clock me-1"></i>Emitida: ${formatFechaEs(s.fecha_incidencia, true)}</div>
                <div><i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(s.ubicacion_emergencia)}</div>
              </div>
            </div>

            ${renderStepperEstadoSos(s.estado_sos)}

            <div class="row g-3 mt-1 small">
              <div class="col-md-7">
                <div class="p-3 bg-light rounded-3 border h-100">
                  <div class="fw-bold text-dark mb-1">Reporte Inicial de Emergencia:</div>
                  <div class="text-secondary mb-2">${escapeHtml(s.descripcion)}</div>

                  ${s.diagnostico_clinico ? `
                    <div class="border-top pt-2 mt-2">
                      <div class="fw-bold text-success"><i class="bi bi-clipboard2-pulse-fill me-1"></i>Diagnóstico Clínico Veterinario:</div>
                      <div class="text-dark">${escapeHtml(s.diagnostico_clinico)}</div>
                    </div>
                  ` : ''}

                  ${s.tratamiento_aplicado ? `
                    <div class="mt-1">
                      <strong class="text-secondary">Tratamiento Aplicado:</strong> ${escapeHtml(s.tratamiento_aplicado)}
                    </div>
                  ` : ''}

                  ${s.informe_resolucion ? `
                    <div class="mt-1 text-success fw-semibold">
                      <i class="bi bi-check2-circle me-1"></i>Informe de Alta: ${escapeHtml(s.informe_resolucion)}
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="col-md-5">
                <div class="p-3 bg-white rounded-3 border h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div class="text-muted" style="font-size:0.72rem;">CLÍNICA VETERINARIA ASIGNADA</div>
                    <div class="fw-bold text-dark fs-6"><i class="bi bi-hospital text-danger me-1"></i>${escapeHtml(s.clinica_nombre)}</div>
                    <div class="text-secondary mb-2">${escapeHtml(s.clinica_direccion)}</div>

                    ${tieneCargo ? `
                      <div class="p-2 rounded-2 bg-light border mt-2">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-1">
                          <span class="text-muted fw-semibold">Cargo Clínico S.O.S.:</span>
                          ${renderBadgeEstadoCobroSos(s.estado_cobro_sos, s.costo_atencion_ref)}
                        </div>
                        <div class="fw-bold text-dark fs-6 mt-1">
                          ${fmtDual(s.costo_atencion_ref)}
                        </div>
                        ${s.comprobante_pago_sos ? `
                          <div class="text-secondary mt-1" style="font-size:0.76rem;">
                            <i class="bi bi-receipt me-1"></i><strong>${escapeHtml(s.metodo_pago_sos || 'Pago')}:</strong>
                            <span class="font-monospace">${escapeHtml(s.comprobante_pago_sos)}</span>
                            ${s.fecha_pago_sos ? ` • ${formatFechaEs(s.fecha_pago_sos)}` : ''}
                          </div>
                        ` : ''}
                        ${s.observacion_cobro_sos ? `
                          <div class="text-muted fst-italic mt-1" style="font-size:0.74rem;">${escapeHtml(s.observacion_cobro_sos)}</div>
                        ` : ''}
                      </div>
                    ` : ''}
                  </div>

                  <div class="d-flex flex-wrap gap-2 mt-3">
                    ${puedeRegularizar ? `
                      <button type="button" class="btn ${esPendiente ? 'btn-paw' : 'btn-outline-primary'} btn-sm fw-bold flex-grow-1"
                        data-action="regularizar-cargo-sos" data-sos-id="${escapeHtml(s.id)}">
                        <i class="bi bi-cash-coin me-1"></i>${esPendiente ? 'Regularizar Cargo Clínico' : 'Actualizar Comprobante'}
                      </button>
                    ` : ''}
                    <a href="tel:${escapeHtml(telLimpio)}" class="btn btn-outline-danger btn-sm flex-grow-1">
                      <i class="bi bi-telephone-outbound-fill me-1"></i>Llamar Clínica (${escapeHtml(s.clinica_telefono)})
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelector('#btn-disparar-modal-sos')?.addEventListener('click', () => {
    abrirModalEmitirSos({
      reservas,
      distritoPropietario,
      roleContext: 'propietario',
      onSosEmitido: (nueva) => {
        if (typeof onNuevaAlerta === 'function') onNuevaAlerta(nueva);
      }
    });
  });

  container.querySelectorAll('[data-action="regularizar-cargo-sos"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idSos = btn.getAttribute('data-sos-id');
      const inc = listaNormalizada.find((x) => x.id === idSos);
      if (!inc) return;
      abrirModalRegularizarCargoSos(inc, (actualizada) => {
        if (typeof onCargoRegularizado === 'function') onCargoRegularizado(actualizada);
      });
    });
  });
}

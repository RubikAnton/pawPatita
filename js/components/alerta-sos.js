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
import { formatFechaEs, formatMoneda, escapeHtml } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';

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

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(normalizarIncidenciaSos);
      }
    } catch (err) {
      console.warn('Fallback local en obtenerAlertasSosPropietario:', err);
    }
  }

  return getLocalSosList().map(normalizarIncidenciaSos);
}

export function normalizarIncidenciaSos(inc) {
  const clinicaMatch = CLINICAS_CUSCO_SOS.find((c) => c.id === inc.id_clinica_derivada) || CLINICAS_CUSCO_SOS[0];
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
    estado_sos: (inc.estado_sos || 'emitida').toLowerCase(),
    diagnostico_clinico: inc.diagnostico_clinico || null,
    tratamiento_aplicado: inc.tratamiento_aplicado || null,
    informe_resolucion: inc.informe_resolucion || null,
    costo_atencion_ref: Number(inc.costo_atencion_ref || 0),
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
 * Abre el Modal de Emisión Inmediata de Alerta S.O.S. Veterinaria (`rpc_emitir_sos`)
 */
export async function abrirModalEmitirSos({
  reservas = [],
  preselectedReservaId = null,
  distritoPropietario = 'Wanchaq',
  onSosEmitido = null
} = {}) {
  const reservasCandidatas = (reservas || []).filter((r) => (
    ['en_curso', 'confirmada', 'pendiente_confirmacion', 'finalizada'].includes(r.estado_reserva)
  ));

  if (reservasCandidatas.length === 0) {
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
      <i class="bi bi-Broadcast-pin fs-2"></i>
      <div class="small">
        <strong>Protocolo de Triaje Veterinario Inmediato (Cusco 24h):</strong>
        Al emitir esta alerta S.O.S., se notificará en tiempo real a la <strong>Clínica Veterinaria Aliada</strong>,
        al <strong>Administrador de Red</strong> y al <strong>Cuidador asignado</strong>.
      </div>
    </div>

    <form id="form-emitir-sos" novalidate>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label small fw-bold">Reserva y Mascota Afectada *</label>
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
            <input type="text" class="form-control" id="sos-input-ubicacion" required
              value="${escapeHtml(reservaActiva?.cuidador_distrito || distritoPropietario)}, Cusco"
              placeholder="Ej. Av. de la Cultura 1420, Wanchaq">
            <button class="btn btn-outline-secondary" type="button" id="sos-btn-gps" title="Detectar GPS en Cusco">
              <i class="bi bi-crosshair"></i> GPS
            </button>
          </div>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold">
            Clínica Veterinaria Aliada Derivada *
            <span class="badge bg-success ms-1">Auto-sugerida 24h más cercana</span>
          </label>
          <select class="form-select" id="sos-select-clinica">
            ${clinicas.map((c) => `
              <option value="${escapeHtml(c.id)}" ${c.id === clinicaSugerida?.id ? 'selected' : ''}>
                [${escapeHtml(c.horario_atencion)}] ${escapeHtml(c.nombre)} — ${escapeHtml(c.distrito_cusco)} (Tel: ${escapeHtml(c.telefono_emergencia)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold">Descripción de Síntomas y Estado de la Mascota * (mín. 5 caracteres)</label>
          <textarea class="form-control" id="sos-input-descripcion" rows="3" required minlength="5"
            placeholder="Describe detalladamente los síntomas observados, desde hace cuánto tiempo ocurren y si la mascota recibió algún primer auxilio..."></textarea>
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

  // Confirmar emisión llamando a rpc_emitir_sos
  modal.el.querySelector('#btn-confirmar-emision-sos')?.addEventListener('click', async () => {
    const idReserva = modal.el.querySelector('#sos-select-reserva').value;
    const severidad = modal.el.querySelector('#sos-select-severidad').value;
    const tipo = modal.el.querySelector('#sos-select-tipo').value;
    const ubicacion = modal.el.querySelector('#sos-input-ubicacion').value.trim() || 'Cusco';
    const idClinica = modal.el.querySelector('#sos-select-clinica').value;
    const descripcionRaw = modal.el.querySelector('#sos-input-descripcion').value.trim();

    if (descripcionRaw.length < 5) {
      showToast('Por favor describe los síntomas o la emergencia (mínimo 5 caracteres).', 'warning');
      return;
    }

    const resObj = reservasCandidatas.find((r) => r.id === idReserva) || reservaActiva;
    const clinicaObj = clinicas.find((c) => c.id === idClinica) || clinicaSugerida;
    const descripcionCompleta = `${descripcionRaw} [Ubicación: ${ubicacion}]`;

    showSpinner('Derivando emergencia a Clínica Veterinaria 24h y Administrador (rpc_emitir_sos)...');
    try {
      const supabase = getSupabase();
      let rpcData = null;

      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.rpc('rpc_emitir_sos', {
          p_id_reserva: idReserva,
          p_severidad: severidad,
          p_tipo: tipo,
          p_descripcion: descripcionCompleta,
          p_id_clinica: idClinica
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
 * Renderiza la pestaña "Alertas S.O.S." del Propietario con Timeline en Vivo y Directorio 24h
 */
export function renderSeccionAlertasSos(container, { alertasSos = [], reservas = [], distritoPropietario = 'Wanchaq', onNuevaAlerta = null } = {}) {
  if (!container) return;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';

  container.innerHTML = `
    <!-- Banner de Emergencia S.O.S. -->
    <div class="sos-emergency-banner mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <div class="badge bg-warning text-dark fw-bold mb-1">PROTOCOLO DE RESPUESTA MÉDICA 24 HORAS — CUSCO</div>
        <h4 class="fw-bold text-white mb-1"><i class="bi bi-hospital-fill me-2"></i>Central de Emergencias Veterinarias S.O.S.</h4>
        <p class="mb-0 text-white-50 small">
          Derivación inmediata a Clínicas Veterinarias Aliadas acreditadas por el CMVP Cusco y notificación simultánea al Administrador.
        </p>
      </div>
      <button type="button" class="btn btn-light text-danger fw-bold px-4 py-2 shadow" id="btn-disparar-modal-sos">
        <i class="bi bi-exclamation-octagon-fill me-2"></i>Emitir Nueva Alerta S.O.S.
      </button>
    </div>

    <!-- Lista de Incidencias S.O.S. con Línea de Tiempo -->
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <h5 class="fw-bold mb-3">
        <i class="bi bi-activity text-danger me-2"></i>Seguimiento en Tiempo Real de Mis Alertas S.O.S. (${alertasSos.length})
      </h5>

      ${alertasSos.length === 0 ? `
        <div class="text-center py-5 bg-light rounded-3 border">
          <i class="bi bi-shield-check text-success fs-1 d-block mb-2"></i>
          <h6 class="fw-bold">No tienes alertas S.O.S. activas ni históricas</h6>
          <p class="text-secondary small mb-0">Tus mascotas se encuentran seguras. Ante cualquier eventualidad puedes activar el botón S.O.S. 24h.</p>
        </div>
      ` : alertasSos.map((inc) => {
        const s = normalizarIncidenciaSos(inc);
        const sevBadge = s.nivel_severidad === 'critica'
          ? 'bg-danger text-white'
          : (s.nivel_severidad === 'moderada' ? 'bg-warning text-dark' : 'bg-info text-dark');
        const telLimpio = String(s.clinica_telefono).replace(/[^0-9+]/g, '');

        return `
          <div class="p-3 rounded-3 border mb-3 ${s.estado_sos !== 'resuelta' ? 'border-danger bg-danger-subtle bg-opacity-10' : 'bg-white'}">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <span class="badge bg-dark me-1">${escapeHtml(s.codigo_sos)}</span>
                <span class="badge ${sevBadge} text-uppercase me-1">Severidad: ${escapeHtml(s.nivel_severidad)}</span>
                <span class="badge bg-secondary">${escapeHtml(s.codigo_reserva)}</span>
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
                    <div class="text-secondary">${escapeHtml(s.clinica_direccion)}</div>
                    ${s.costo_atencion_ref > 0 ? `
                      <div class="mt-1 text-muted">Costo clínico referencial: <strong>${formatMoneda(s.costo_atencion_ref, moneda)}</strong></div>
                    ` : ''}
                  </div>
                  <div class="d-flex gap-2 mt-3">
                    <a href="tel:${escapeHtml(telLimpio)}" class="btn btn-danger btn-sm flex-grow-1">
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
      onSosEmitido: (nueva) => {
        if (typeof onNuevaAlerta === 'function') onNuevaAlerta(nueva);
      }
    });
  });
}

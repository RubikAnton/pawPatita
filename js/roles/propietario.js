/**
 * Paw Patita Cusco v5.0 — Panel Unificado de Propietario (Local y Turista)
 * js/roles/propietario.js
 *
 * Unifica definitivamente en un único rol `propietario` a dueños locales de Cusco y
 * turistas nacionales/extranjeros (`es_turista`, selector `DNI`/`CE`/`Pasaporte`, país,
 * idioma `ES`/`EN` y hotel de recojo en Cusco).
 *
 * Sub-vistas integradas:
 *  1. Resumen y Reservas (KPIs, Wizard 4 Pasos, Comprobante, Cancelación escalonada, Disputas, Reseñas, WhatsApp)
 *  2. Mis Mascotas y Carné Digital PAW-ID (CRUD completo, Edad dinámica, QR imprimible, Cartilla)
 *  3. Muro de Fotos en Vivo (Timeline cronológico de reportes y fotos con Lightbox + Realtime)
 *  4. Alertas S.O.S. (Emisión inmediata a clínicas 24h + línea de tiempo clínica en vivo)
 *  5. Mi Perfil (Edición de datos personales, interruptor Local/Turista, hotel en Cusco y contacto emergencia)
 */

import { getSupabase, isSupabaseConfigured, subscribeRealtime } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import { updateLocalSessionProfile } from '../auth/auth.js';
import { navigateTo } from '../router.js';
import { formatMoneda, formatFechaEs, escapeHtml, getHoyIso, sumarDiasIso } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';
import {
  obtenerMascotasPropietario,
  renderTarjetaMascota,
  abrirModalFormularioMascota,
  archivarMascotaPropietario,
  abrirModalCarnetPawId,
  abrirVisorCartillaVacunas,
  abrirModalComprobantePago
} from '../components/carnet-digital.js';
import { abrirWizardReserva } from '../components/wizard-reserva.js';
import { obtenerReportesMuroPropietario, renderSeccionMuroFotos } from '../components/muro-fotos.js';
import { obtenerAlertasSosPropietario, renderSeccionAlertasSos, abrirModalEmitirSos } from '../components/alerta-sos.js';

const STORAGE_KEY_RESERVAS = 'paw_demo_reservas_owner_v5';

// Semilla inicial sincronizada con supabase/06_seed.sql cubriendo todos los estados para pruebas E2E
export const RESERVAS_SEED_OWNER = [
  {
    id: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    cuidador_telefono: '+51 984 311 111',
    cuidador_foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    id_oferta: '70000000-0000-0000-0000-000000000001',
    hu_ecode: 'HU-101',
    categoria_servicio: 'Hospedaje',
    tipo_servicio: 'Hospedaje Familiar Premium 24h',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    fecha_inicio: getHoyIso(),
    fecha_fin: sumarDiasIso(getHoyIso(), 1),
    bloque_horario: 'todo_el_dia',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    dias_calculados: 2,
    tarifa_unitaria: 60.00,
    subtotal_base: 120.00,
    ajuste_temporada: 0.00,
    recargo_cachorro: 0.00,
    descuento_cupon: 0.00,
    extras_monto: 25.00,
    monto_total: 145.00,
    comision_plataforma: 21.75,
    monto_neto_cuidador: 123.25,
    moneda_referencial: 'PEN',
    estado_reserva: 'en_curso',
    metodo_pago: 'Plin',
    num_operacion: 'PLIN-882102',
    tipo_comprobante: 'Boleta Electrónica',
    num_comprobante: 'B001-000102',
    notas_propietario: 'Incluye baño higiénico antes del retorno.',
    calificada: false
  },
  {
    id: '90000000-0000-0000-0000-000000000004',
    codigo_reserva: 'RES-2026-0104',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    id_cuidador: '60000000-0000-0000-0000-000000000002',
    cuidador_nombre: 'Diego Álvarez Tupayachi',
    cuidador_distrito: 'Cusco Centro',
    cuidador_telefono: '+51 984 312 222',
    cuidador_foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    id_oferta: '70000000-0000-0000-0000-000000000003',
    hu_ecode: 'HU-103',
    categoria_servicio: 'Domicilio Turístico',
    tipo_servicio: 'Cuidado en Hotel / Airbnb para Turistas',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    fecha_inicio: sumarDiasIso(getHoyIso(), 3),
    fecha_fin: sumarDiasIso(getHoyIso(), 4),
    bloque_horario: 'todo_el_dia',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    dias_calculados: 2,
    tarifa_unitaria: 75.00,
    subtotal_base: 150.00,
    ajuste_temporada: 0.00,
    recargo_cachorro: 0.00,
    descuento_cupon: 0.00,
    extras_monto: 0.00,
    monto_total: 150.00,
    comision_plataforma: 22.50,
    monto_neto_cuidador: 127.50,
    moneda_referencial: 'PEN',
    estado_reserva: 'confirmada',
    metodo_pago: 'Tarjeta',
    num_operacion: 'MC-882104',
    tipo_comprobante: 'Boleta Electrónica',
    num_comprobante: 'B001-000104',
    notas_propietario: 'Paseo de aclimatación y custodia completa.',
    calificada: false
  },
  {
    id: '90000000-0000-0000-0000-000000000006',
    codigo_reserva: 'RES-2026-0106',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    id_cuidador: '60000000-0000-0000-0000-000000000004',
    cuidador_nombre: 'Mateo Cornejo Paz',
    cuidador_distrito: 'San Jerónimo',
    cuidador_telefono: '+51 984 314 444',
    cuidador_foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    id_oferta: '70000000-0000-0000-0000-000000000007',
    hu_ecode: 'HU-107',
    categoria_servicio: 'Hospedaje',
    tipo_servicio: 'Hospedaje Campestre Razas Grandes',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    fecha_inicio: sumarDiasIso(getHoyIso(), -7),
    fecha_fin: sumarDiasIso(getHoyIso(), -5),
    bloque_horario: 'todo_el_dia',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    dias_calculados: 3,
    tarifa_unitaria: 70.00,
    subtotal_base: 210.00,
    ajuste_temporada: 0.00,
    recargo_cachorro: 0.00,
    descuento_cupon: 0.00,
    extras_monto: 0.00,
    monto_total: 210.00,
    comision_plataforma: 31.50,
    monto_neto_cuidador: 178.50,
    moneda_referencial: 'PEN',
    estado_reserva: 'finalizada',
    metodo_pago: 'Transferencia',
    num_operacion: 'BCP-882106',
    tipo_comprobante: 'Factura Electrónica',
    num_comprobante: 'F001-000106',
    notas_propietario: 'Fin de semana campestre en San Jerónimo.',
    calificada: false
  },
  {
    id: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    cuidador_telefono: '+51 984 311 111',
    cuidador_foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    id_oferta: '70000000-0000-0000-0000-000000000001',
    hu_ecode: 'HU-101',
    categoria_servicio: 'Hospedaje',
    tipo_servicio: 'Hospedaje Familiar Premium 24h',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    fecha_inicio: sumarDiasIso(getHoyIso(), -12),
    fecha_fin: sumarDiasIso(getHoyIso(), -10),
    bloque_horario: 'todo_el_dia',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    dias_calculados: 3,
    tarifa_unitaria: 60.00,
    subtotal_base: 180.00,
    ajuste_temporada: 0.00,
    recargo_cachorro: 0.00,
    descuento_cupon: 0.00,
    extras_monto: 0.00,
    monto_total: 180.00,
    comision_plataforma: 27.00,
    monto_neto_cuidador: 153.00,
    moneda_referencial: 'PEN',
    estado_reserva: 'finalizada',
    metodo_pago: 'Yape',
    num_operacion: 'YAPE-882101',
    tipo_comprobante: 'Boleta Electrónica',
    num_comprobante: 'B001-000101',
    notas_propietario: 'Cuidar dieta sin pollo de Inti.',
    calificada: true,
    estrellas_otorgadas: 5
  }
];

function getLocalReservas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESERVAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(RESERVAS_SEED_OWNER));
  return [...RESERVAS_SEED_OWNER];
}

function saveLocalReservas(list) {
  try {
    localStorage.setItem(STORAGE_KEY_RESERVAS, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Normaliza una fila de reserva garantizando 0 `undefined`
 */
function normalizarReserva(r) {
  const monto = Number(r.monto_total ?? r.pagos?.monto_bruto ?? 120);
  const comision = Number(r.comision_plataforma ?? r.pagos?.comision_plataforma ?? (monto * 0.15).toFixed(2));
  const neto = Number(r.monto_neto_cuidador ?? r.pagos?.monto_neto_cuidador ?? (monto - comision).toFixed(2));
  const cuidadorUser = r.perfiles_cuidadores?.perfiles_usuarios || {};

  return {
    id: r.id || `res-${Date.now()}`,
    codigo_reserva: r.codigo_reserva || 'RES-2026-0100',
    id_propietario: r.id_propietario || '',
    id_cuidador: r.id_cuidador || '',
    cuidador_nombre: r.cuidador_nombre || `${cuidadorUser.nombre || 'Valeria'} ${cuidadorUser.apellido || 'Huamán'}`.trim(),
    cuidador_distrito: r.cuidador_distrito || cuidadorUser.distrito_cusco || 'Wanchaq',
    cuidador_telefono: r.cuidador_telefono || cuidadorUser.telefono || '+51 984 311 111',
    cuidador_foto: r.cuidador_foto || r.perfiles_cuidadores?.foto_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    id_oferta: r.id_oferta || '',
    hu_ecode: r.hu_ecode || r.servicios?.hu_ecode || 'HU-101',
    categoria_servicio: r.categoria_servicio || r.servicios?.categoria || 'Hospedaje',
    tipo_servicio: r.tipo_servicio || r.servicios?.tipo_servicio || 'Hospedaje Familiar 24h',
    id_mascota: r.id_mascota || '',
    mascota_nombre: r.mascota_nombre || r.mascotas?.nombre || 'Inti',
    mascota_paw_id: r.mascota_paw_id || r.mascotas?.paw_id || 'PAW-6858',
    fecha_inicio: r.fecha_inicio || getHoyIso(),
    fecha_fin: r.fecha_fin || getHoyIso(),
    bloque_horario: r.bloque_horario || 'todo_el_dia',
    hora_inicio: r.hora_inicio || '08:00:00',
    hora_fin: r.hora_fin || '20:00:00',
    dias_calculados: Number(r.dias_calculados || 1),
    tarifa_unitaria: Number(r.tarifa_unitaria || monto),
    subtotal_base: Number(r.subtotal_base || monto),
    ajuste_temporada: Number(r.ajuste_temporada || 0),
    recargo_cachorro: Number(r.recargo_cachorro || 0),
    descuento_cupon: Number(r.descuento_cupon || 0),
    extras_monto: Number(r.extras_monto || 0),
    monto_total: monto,
    comision_plataforma: comision,
    monto_neto_cuidador: neto,
    moneda_referencial: r.moneda_referencial || 'PEN',
    estado_reserva: (r.estado_reserva || 'pendiente_confirmacion').toLowerCase(),
    motivo_rechazo: r.motivo_rechazo || null,
    notas_propietario: r.notas_propietario || '',
    metodo_pago: r.metodo_pago || r.pagos?.metodo_pago || 'Yape',
    num_operacion: r.num_operacion || r.pagos?.num_operacion || 'OP-882100',
    tipo_comprobante: r.tipo_comprobante || r.pagos?.tipo_comprobante || 'Boleta Electrónica',
    num_comprobante: r.num_comprobante || r.pagos?.num_comprobante || 'B001-000101',
    calificada: Boolean(r.calificada || (Array.isArray(r.resenas) ? r.resenas.length > 0 : r.resenas?.id)),
    estrellas_otorgadas: Number(r.estrellas_otorgadas || r.resenas?.[0]?.calificacion_estrellas || r.resenas?.calificacion_estrellas || 0)
  };
}

/**
 * Obtiene las reservas del propietario desde Supabase o fallback local
 */
async function obtenerReservasPropietario(idPropietario) {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && idPropietario && !String(idPropietario).startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          mascotas(nombre, paw_id, foto_url),
          servicios(hu_ecode, categoria, tipo_servicio),
          pagos(*),
          resenas(id, calificacion_estrellas),
          perfiles_cuidadores(foto_url, perfiles_usuarios(nombre, apellido, distrito_cusco, telefono))
        `)
        .eq('id_propietario', idPropietario)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(normalizarReserva);
      }
    } catch (err) {
      console.warn('Fallback local en obtenerReservasPropietario:', err);
    }
  }
  return getLocalReservas().map(normalizarReserva);
}

/**
 * Replica exactamente el cálculo determinista de `rpc_preview_cancelacion` en modo demo/offline
 */
function calcularPreviewCancelacionLocal(reserva) {
  const r = normalizarReserva(reserva);
  const inicioTs = new Date(`${r.fecha_inicio}T${r.hora_inicio || '08:00:00'}-05:00`);
  const diffHoras = Number(((inicioTs.getTime() - Date.now()) / (1000 * 60 * 60)).toFixed(2));
  const horasAnticipacion = Math.max(0, diffHoras);
  const montoBruto = Number(r.monto_total || 0);

  let pctReembolso = 100;
  let pctPenalidad = 0;
  let regla = 'Cancelación Libre (> 48h o sin confirmar): 100% Reembolso / 0% Penalidad';
  let montoReembolso = montoBruto;
  let montoPenalidad = 0;
  let montoPlataforma = 0;
  let montoCuidador = 0;

  if (r.estado_reserva !== 'pendiente_confirmacion' && horasAnticipacion <= 48) {
    if (horasAnticipacion >= 24) {
      pctReembolso = 70;
      pctPenalidad = 30;
      regla = 'Cancelación Moderada (24h a 48h): 70% Reembolso / 30% Penalidad (15% Plataforma + 15% Cuidador)';
      montoReembolso = Number((montoBruto * 0.70).toFixed(2));
      montoPenalidad = Number((montoBruto - montoReembolso).toFixed(2));
      montoPlataforma = Number((montoBruto * 0.15).toFixed(2));
      montoCuidador = Number((montoPenalidad - montoPlataforma).toFixed(2));
    } else {
      pctReembolso = 50;
      pctPenalidad = 50;
      regla = 'Cancelación Tardía (< 24h): 50% Reembolso / 50% Penalidad (15% Plataforma + 35% Cuidador)';
      montoReembolso = Number((montoBruto * 0.50).toFixed(2));
      montoPenalidad = Number((montoBruto - montoReembolso).toFixed(2));
      montoPlataforma = Number((montoBruto * 0.15).toFixed(2));
      montoCuidador = Number((montoPenalidad - montoPlataforma).toFixed(2));
    }
  }

  return {
    exito: true,
    id_reserva: r.id,
    codigo_reserva: r.codigo_reserva,
    estado_actual: r.estado_reserva,
    horas_anticipacion: horasAnticipacion,
    regla_aplicada: regla,
    monto_bruto: montoBruto,
    porcentaje_reembolso: pctReembolso,
    porcentaje_penalidad: pctPenalidad,
    monto_reembolso: montoReembolso,
    monto_penalidad: montoPenalidad,
    monto_penalidad_plataforma: montoPlataforma,
    monto_compensacion_cuidador: montoCuidador
  };
}

/**
 * Abre el modal de Cancelación Escalonada con previsualización real (`rpc_preview_cancelacion` + `rpc_cancelar_reserva`)
 */
async function abrirModalCancelarReserva(reserva, onCanceladaCallback) {
  const r = normalizarReserva(reserva);
  const moneda = localStorage.getItem('paw_currency') || 'PEN';

  showSpinner('Calculando horas de anticipación y reembolso (rpc_preview_cancelacion)...');
  let preview = null;
  try {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
      const { data, error } = await supabase.rpc('rpc_preview_cancelacion', { p_id_reserva: r.id });
      if (!error && data) preview = data;
    }
    if (!preview) preview = calcularPreviewCancelacionLocal(r);
  } finally {
    hideSpinner();
  }

  const cuerpoHtml = `
    <div class="alert alert-warning border-0 d-flex align-items-center gap-3 mb-3">
      <i class="bi bi-calculator-fill fs-2 text-warning-emphasis"></i>
      <div class="small">
        <strong>Liquidación Automática por Política Escalonada v5.0:</strong><br>
        ${escapeHtml(preview.regla_aplicada)}
      </div>
    </div>

    <div class="p-3 bg-light rounded-3 border mb-3 small">
      <div class="d-flex justify-content-between py-1 border-bottom">
        <span>Reserva a cancelar:</span>
        <strong>${escapeHtml(r.codigo_reserva)} — ${escapeHtml(r.mascota_nombre)} con ${escapeHtml(r.cuidador_nombre)}</strong>
      </div>
      <div class="d-flex justify-content-between py-1 border-bottom">
        <span>Anticipación calculada al inicio del servicio:</span>
        <strong>${Number(preview.horas_anticipacion || 0).toFixed(1)} horas</strong>
      </div>
      <div class="d-flex justify-content-between py-1 border-bottom">
        <span>Monto bruto pagado:</span>
        <strong>${formatMoneda(preview.monto_bruto, moneda)}</strong>
      </div>
      <div class="d-flex justify-content-between py-1 border-bottom text-success">
        <span><strong>Monto a Reembolsar (${Number(preview.porcentaje_reembolso).toFixed(0)}%):</strong></span>
        <strong class="fs-6">${formatMoneda(preview.monto_reembolso, moneda)}</strong>
      </div>
      <div class="d-flex justify-content-between py-1 text-danger">
        <span>Penalidad retenida (${Number(preview.porcentaje_penalidad).toFixed(0)}%):</span>
        <strong>${formatMoneda(preview.monto_penalidad, moneda)}</strong>
      </div>
    </div>

    <div>
      <label class="form-label small fw-bold">Motivo de la Cancelación * (mínimo 5 caracteres)</label>
      <textarea class="form-control" id="input-motivo-cancelacion" rows="2" required minlength="5"
        placeholder="Ej. Cambio de fecha de nuestro vuelo o reprogramación de tour a Machu Picchu..."></textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Volver</button>
    <button type="button" class="btn btn-danger fw-bold" id="btn-confirmar-cancelacion-rpc">
      <i class="bi bi-x-octagon-fill me-1"></i>Confirmar Cancelación y Reembolso (${formatMoneda(preview.monto_reembolso, moneda)})
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Cancelar Reserva ${r.codigo_reserva}`,
    icono: 'bi-calendar-x-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  modal.el.querySelector('#btn-confirmar-cancelacion-rpc')?.addEventListener('click', async () => {
    const motivo = modal.el.querySelector('#input-motivo-cancelacion').value.trim();
    if (motivo.length < 5) {
      showToast('Por favor ingresa el motivo de la cancelación (mínimo 5 caracteres).', 'warning');
      return;
    }

    showSpinner('Ejecutando cancelación y reembolso (rpc_cancelar_reserva)...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
        const { error } = await supabase.rpc('rpc_cancelar_reserva', {
          p_id_reserva: r.id,
          p_motivo: motivo
        });
        if (error) throw error;
      }

      const local = getLocalReservas().map((item) => (
        item.id === r.id
          ? { ...item, estado_reserva: 'cancelada', motivo_rechazo: `Cancelada por propietario: ${motivo}` }
          : item
      ));
      saveLocalReservas(local);

      await modal.cerrarAsync();
      showToast(
        `Reserva ${r.codigo_reserva} cancelada. Reembolso procesado: ${formatMoneda(preview.monto_reembolso, moneda)}.`,
        'success',
        'Cancelación Procesada'
      );
      if (typeof onCanceladaCallback === 'function') onCanceladaCallback(r.id, motivo);
    } catch (err) {
      handleSupabaseError(err, 'No se pudo cancelar la reserva.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Abre el modal para Abrir Disputa (`rpc_abrir_disputa`) congelando fondos en garantía
 */
function abrirModalDisputaReserva(reserva, onDisputaCallback) {
  const r = normalizarReserva(reserva);

  const cuerpoHtml = `
    <div class="alert alert-danger border-0 d-flex align-items-center gap-3 mb-3">
      <i class="bi bi-shield-exclamation fs-2"></i>
      <div class="small">
        <strong>Protección de Garantía Escrow:</strong> Al abrir una disputa formal sobre la reserva
        <strong>${escapeHtml(r.codigo_reserva)}</strong>, los fondos quedan congelados inmediatamente en garantía
        y el caso se eleva a arbitraje del Administrador de Paw Patita Cusco.
      </div>
    </div>

    <div>
      <label class="form-label small fw-bold">Describe detalladamente el motivo del reclamo o disputa * (mínimo 10 caracteres)</label>
      <textarea class="form-control" id="input-motivo-disputa" rows="3" required minlength="10"
        placeholder="Describe el incumplimiento de horario, condición del servicio o incidencia observada..."></textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-danger fw-bold" id="btn-confirmar-disputa-rpc">
      <i class="bi bi-hammer me-1"></i>Congelar Fondos y Elevar a Arbitraje
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Abrir Disputa Formal — ${r.codigo_reserva}`,
    icono: 'bi-exclamation-diamond-fill',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-disputa-rpc')?.addEventListener('click', async () => {
    const motivo = modal.el.querySelector('#input-motivo-disputa').value.trim();
    if (motivo.length < 10) {
      showToast('Describe detalladamente el motivo de la disputa (mínimo 10 caracteres).', 'warning');
      return;
    }

    showSpinner('Congelando fondos y registrando expediente de arbitraje (rpc_abrir_disputa)...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
        const { error } = await supabase.rpc('rpc_abrir_disputa', {
          p_id_reserva: r.id,
          p_motivo: motivo
        });
        if (error) throw error;
      }

      const local = getLocalReservas().map((item) => (
        item.id === r.id ? { ...item, estado_reserva: 'en_disputa', motivo_rechazo: motivo } : item
      ));
      saveLocalReservas(local);

      await modal.cerrarAsync();
      showToast(
        `Disputa abierta para ${r.codigo_reserva}. Los fondos han sido congelados para arbitraje administrativo.`,
        'warning',
        'Disputa en Arbitraje'
      );
      if (typeof onDisputaCallback === 'function') onDisputaCallback(r.id, motivo);
    } catch (err) {
      handleSupabaseError(err, 'No se pudo abrir la disputa.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Abre el modal de Calificación Verificada con Estrellas (1 a 5) + 3 dimensiones (`rpc_publicar_resena`)
 */
function abrirModalCalificarReserva(reserva, onCalificadaCallback) {
  const r = normalizarReserva(reserva);
  const scores = { general: 5, puntualidad: 5, comunicacion: 5, cuidado: 5 };

  const renderEstrellasGrupo = (campo, valorActual) => `
    <div class="star-rating-interactive" data-rating-field="${campo}">
      ${[1, 2, 3, 4, 5].map((num) => `
        <i class="bi bi-star-fill ${num <= valorActual ? 'active' : ''}" data-star-val="${num}"></i>
      `).join('')}
    </div>
  `;

  const cuerpoHtml = `
    <div class="p-3 bg-light rounded-3 border mb-3 d-flex align-items-center gap-3">
      <img src="${escapeHtml(r.cuidador_foto)}" alt="${escapeHtml(r.cuidador_nombre)}"
        class="rounded-circle border" style="width:56px;height:56px;object-fit:cover;">
      <div>
        <div class="fw-bold text-dark">${escapeHtml(r.cuidador_nombre)} <span class="badge bg-dark ms-1">${escapeHtml(r.codigo_reserva)}</span></div>
        <div class="small text-secondary">${escapeHtml(r.tipo_servicio)} para <strong>${escapeHtml(r.mascota_nombre)}</strong></div>
      </div>
    </div>

    <div class="row g-3 mb-3 text-center">
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="small fw-bold text-secondary mb-1">Calificación General *</div>
          ${renderEstrellasGrupo('general', scores.general)}
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="small fw-bold text-secondary mb-1">Puntualidad y Horarios</div>
          ${renderEstrellasGrupo('puntualidad', scores.puntualidad)}
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="small fw-bold text-secondary mb-1">Comunicación y Fotos en Muro</div>
          ${renderEstrellasGrupo('comunicacion', scores.comunicacion)}
        </div>
      </div>
      <div class="col-md-6">
        <div class="p-2 border rounded-3 bg-white">
          <div class="small fw-bold text-secondary mb-1">Cariño, Higiene y Cuidado</div>
          ${renderEstrellasGrupo('cuidado', scores.cuidado)}
        </div>
      </div>
    </div>

    <div>
      <label class="form-label small fw-bold">Tu Reseña Verificada sobre la Experiencia * (mínimo 5 caracteres)</label>
      <textarea class="form-control" id="input-comentario-resena" rows="3" required minlength="5"
        placeholder="Cuéntale a otros dueños de mascotas en Cusco cómo fue el cuidado de ${escapeHtml(r.mascota_nombre)}..."></textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold" id="btn-publicar-resena-rpc">
      <i class="bi bi-star-fill me-1"></i>Publicar Calificación Verificada
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Calificar Servicio de ${r.cuidador_nombre}`,
    icono: 'bi-stars',
    cuerpoHtml,
    footerHtml
  });

  // Interacción con estrellas
  modal.el.querySelectorAll('[data-rating-field]').forEach((group) => {
    const field = group.getAttribute('data-rating-field');
    group.querySelectorAll('[data-star-val]').forEach((star) => {
      star.addEventListener('click', () => {
        const val = Number(star.getAttribute('data-star-val'));
        scores[field] = val;
        group.querySelectorAll('[data-star-val]').forEach((s) => {
          s.classList.toggle('active', Number(s.getAttribute('data-star-val')) <= val);
        });
      });
    });
  });

  modal.el.querySelector('#btn-publicar-resena-rpc')?.addEventListener('click', async () => {
    const comentario = modal.el.querySelector('#input-comentario-resena').value.trim();
    if (comentario.length < 5) {
      showToast('Escribe un breve comentario sobre tu experiencia (mínimo 5 caracteres).', 'warning');
      return;
    }

    showSpinner('Publicando reseña y actualizando reputación del cuidador (rpc_publicar_resena)...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
        const { error } = await supabase.rpc('rpc_publicar_resena', {
          p_id_reserva: r.id,
          p_calificacion: scores.general,
          p_puntualidad: scores.puntualidad,
          p_comunicacion: scores.comunicacion,
          p_cuidado: scores.cuidado,
          p_comentario: comentario
        });
        if (error) throw error;
      }

      const local = getLocalReservas().map((item) => (
        item.id === r.id ? { ...item, calificada: true, estrellas_otorgadas: scores.general } : item
      ));
      saveLocalReservas(local);

      await modal.cerrarAsync();
      showToast('¡Muchas gracias por tu calificación! La reputación del cuidador ha sido actualizada.', 'success', 'Reseña Publicada');
      if (typeof onCalificadaCallback === 'function') onCalificadaCallback(r.id, scores.general);
    } catch (err) {
      handleSupabaseError(err, 'No se pudo registrar la calificación.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Renderiza el badge visual de estado de reserva
 */
function renderBadgeEstadoReserva(estado) {
  const est = (estado || 'pendiente_confirmacion').toLowerCase();
  const map = {
    pendiente_confirmacion: { cls: 'status-pendiente', icon: 'bi-hourglass-split', txt: 'Pendiente Confirmación' },
    confirmada: { cls: 'status-confirmada', icon: 'bi-check-circle-fill', txt: 'Confirmada' },
    en_curso: { cls: 'status-activo', icon: 'bi-play-circle-fill', txt: 'En Curso Ahora' },
    finalizada: { cls: 'status-finalizada', icon: 'bi-patch-check-fill', txt: 'Finalizada' },
    cancelada: { cls: 'status-cancelada', icon: 'bi-x-circle-fill', txt: 'Cancelada' },
    en_disputa: { cls: 'status-sos', icon: 'bi-shield-exclamation', txt: 'En Arbitraje / Disputa' }
  };
  const cfg = map[est] || map.pendiente_confirmacion;
  return `<span class="badge-status ${cfg.cls}"><i class="bi ${cfg.icon} me-1"></i>${cfg.txt}</span>`;
}

/**
 * Renderizador Principal del Panel Unificado de Propietario
 */
export async function renderPanelPropietario(container, profile) {
  if (!container) return;

  const propProfile = {
    id: profile?.id || '50000000-0000-0000-0000-000000000002',
    codigo_usuario: profile?.codigo_usuario || 'USR-002',
    nombre: profile?.nombre || 'Lucía',
    apellido: profile?.apellido || 'Mendoza Vargas',
    email: profile?.email || 'lucia.mendoza@gmail.com',
    telefono: profile?.telefono || '+51 984 234 567',
    rol: 'propietario',
    es_turista: Boolean(profile?.es_turista),
    tipo_documento: profile?.tipo_documento || 'DNI',
    num_documento: profile?.num_documento || '72849102',
    pais_origen: profile?.pais_origen || 'Perú',
    idioma_preferido: profile?.idioma_preferido || 'ES',
    direccion: profile?.direccion || 'Urb. Magisterio Primera Etapa K-12',
    distrito_cusco: profile?.distrito_cusco || 'Wanchaq',
    hospedaje_hotel_cusco: profile?.hospedaje_hotel_cusco || '',
    contacto_emergencia_nombre: profile?.contacto_emergencia_nombre || 'Carlos Mendoza (Hermano)',
    contacto_emergencia_tel: profile?.contacto_emergencia_tel || '+51 984 998 877'
  };

  let activeTab = 'resumen';
  let filtroEstadoReserva = 'todas';
  let mascotas = [];
  let reservas = [];
  let reportesMuro = [];
  let alertasSos = [];

  showSpinner('Cargando tu Panel Unificado de Propietario...');
  try {
    mascotas = await obtenerMascotasPropietario(propProfile.id);
    reservas = await obtenerReservasPropietario(propProfile.id);
    reportesMuro = await obtenerReportesMuroPropietario(reservas);
    alertasSos = await obtenerAlertasSosPropietario(propProfile.id, mascotas.map((m) => m.id));
  } finally {
    hideSpinner();
  }

  // Suscripción Realtime a nuevos reportes del Muro y cambios en Alertas S.O.S.
  subscribeRealtime('canal-propietario-muro', 'reportes_seguimiento', 'INSERT', async () => {
    reportesMuro = await obtenerReportesMuroPropietario(reservas);
    showToast('📸 ¡Tu cuidador acaba de publicar una nueva foto en el Muro en Vivo!', 'info', 'Muro en Vivo');
    if (activeTab === 'muro') renderWorkspace();
  });

  subscribeRealtime('canal-propietario-sos', 'incidencias_emergencias', 'UPDATE', async () => {
    alertasSos = await obtenerAlertasSosPropietario(propProfile.id, mascotas.map((m) => m.id));
    showToast('🏥 Actualización clínica en tiempo real sobre tu alerta S.O.S.', 'info', 'Central S.O.S.');
    if (activeTab === 'sos') renderWorkspace();
  });

  function renderLayout() {
    const iniciales = `${propProfile.nombre.charAt(0)}${(propProfile.apellido || 'P').charAt(0)}`.toUpperCase();
    const noVistosMuro = reportesMuro.filter((r) => !r.visto_por_propietario).length;
    const sosActivos = alertasSos.filter((s) => s.estado_sos !== 'resuelta').length;

    container.innerHTML = `
      <div class="container">
        <div class="panel-dashboard-shell">
          <!-- SIDEBAR DEL PROPIETARIO UNIFICADO -->
          <aside class="panel-sidebar">
            <div class="panel-sidebar-profile">
              <div class="d-flex align-items-center gap-3 mb-2">
                <div class="panel-avatar-circle">${escapeHtml(iniciales)}</div>
                <div class="min-w-0">
                  <h6 class="fw-bold text-white mb-0 text-truncate">${escapeHtml(propProfile.nombre)} ${escapeHtml(propProfile.apellido)}</h6>
                  <div class="small text-white-50 text-truncate">${escapeHtml(propProfile.email)}</div>
                  <div class="small text-warning fw-semibold">
                    ${escapeHtml(propProfile.tipo_documento)}: ${escapeHtml(propProfile.num_documento)}
                  </div>
                </div>
              </div>
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-1 mt-2 pt-2 border-top border-secondary">
                <span class="badge-origen-usuario ${propProfile.es_turista ? 'badge-origen-turista' : 'badge-origen-local'}">
                  <i class="bi ${propProfile.es_turista ? 'bi-airplane-fill' : 'bi-geo-alt-fill'}"></i>
                  ${propProfile.es_turista ? `Turista (${escapeHtml(propProfile.pais_origen)})` : `Residente Local (${escapeHtml(propProfile.distrito_cusco)})`}
                </span>
                <span class="badge bg-dark">${escapeHtml(propProfile.codigo_usuario)}</span>
              </div>
            </div>

            <nav class="panel-nav-menu" aria-label="Menú del Propietario">
              <button type="button" class="panel-nav-btn ${activeTab === 'resumen' ? 'active' : ''}" data-tab="resumen">
                <span class="nav-icon-wrap"><i class="bi bi-calendar2-check-fill"></i>Resumen y Reservas</span>
                <span class="badge rounded-pill bg-secondary">${reservas.length}</span>
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'mascotas' ? 'active' : ''}" data-tab="mascotas">
                <span class="nav-icon-wrap"><i class="bi bi-qr-code-scan"></i>Mis Mascotas & PAW-ID</span>
                <span class="badge rounded-pill bg-secondary">${mascotas.length}</span>
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'muro' ? 'active' : ''}" data-tab="muro">
                <span class="nav-icon-wrap"><i class="bi bi-camera-reels-fill"></i>Muro de Fotos en Vivo</span>
                ${noVistosMuro > 0 ? `<span class="badge rounded-pill bg-warning text-dark">${noVistosMuro}</span>` : ''}
              </button>

              <button type="button" class="panel-nav-btn nav-btn-sos ${activeTab === 'sos' ? 'active' : ''}" data-tab="sos">
                <span class="nav-icon-wrap"><i class="bi bi-hospital-fill"></i>Alertas S.O.S. 24h</span>
                ${sosActivos > 0 ? `<span class="badge rounded-pill bg-danger">${sosActivos}</span>` : ''}
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'perfil' ? 'active' : ''}" data-tab="perfil">
                <span class="nav-icon-wrap"><i class="bi bi-person-gear"></i>Mi Perfil (Local/Turista)</span>
              </button>

              <hr class="my-1">

              <button type="button" class="panel-nav-btn text-primary" id="btn-sidebar-ir-catalogo">
                <span class="nav-icon-wrap"><i class="bi bi-search-heart text-primary"></i>Explorar Catálogo Cusco</span>
                <i class="bi bi-arrow-up-right small"></i>
              </button>
            </nav>
          </aside>

          <!-- ÁREA PRINCIPAL DE TRABAJO -->
          <section class="panel-main-area" id="propietario-workspace"></section>
        </div>
      </div>
    `;

    // Listeners de navegación en sidebar
    container.querySelectorAll('.panel-nav-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderLayout();
      });
    });

    container.querySelector('#btn-sidebar-ir-catalogo')?.addEventListener('click', () => {
      navigateTo('#/catalogo');
    });

    renderWorkspace();
  }

  function renderKpisHeader() {
    const moneda = localStorage.getItem('paw_currency') || 'PEN';
    const activasCount = reservas.filter((r) => ['pendiente_confirmacion', 'confirmada', 'en_curso'].includes(r.estado_reserva)).length;
    const validadasCount = mascotas.filter((m) => m.estado_validacion_vet === 'validado').length;
    const totalInvertido = reservas
      .filter((r) => r.estado_reserva !== 'cancelada')
      .reduce((acc, r) => acc + Number(r.monto_total || 0), 0);

    return `
      <div class="panel-hero-banner d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="badge bg-warning text-dark">PANEL UNIFICADO PROPIETARIO v5.0</span>
            ${propProfile.es_turista && propProfile.hospedaje_hotel_cusco ? `
              <span class="badge bg-info-subtle text-info border">
                <i class="bi bi-building me-1"></i>Hospedaje en Cusco: ${escapeHtml(propProfile.hospedaje_hotel_cusco)}
              </span>
            ` : `
              <span class="badge bg-light text-secondary border">
                <i class="bi bi-geo-alt-fill text-danger me-1"></i>Distrito: ${escapeHtml(propProfile.distrito_cusco)}
              </span>
            `}
          </div>
          <h4 class="fw-bold mb-0 mt-1">¡Hola, ${escapeHtml(propProfile.nombre)}! Gestiona el bienestar de tus mascotas</h4>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-paw" id="btn-hero-nueva-reserva">
            <i class="bi bi-plus-circle-fill me-1"></i>Nueva Reserva (Wizard 4 Pasos)
          </button>
          <button type="button" class="btn btn-danger fw-bold" id="btn-hero-sos-rapido">
            <i class="bi bi-exclamation-octagon-fill me-1"></i>S.O.S. 24h
          </button>
        </div>
      </div>

      <div class="kpi-grid-owner">
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-terracota"><i class="bi bi-qr-code-scan"></i></div>
          <div>
            <div class="kpi-value">${mascotas.length} <span class="fs-6 fw-normal text-success">(${validadasCount} valid.)</span></div>
            <div class="kpi-label">Mascotas PAW-ID</div>
          </div>
        </div>
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-turquesa"><i class="bi bi-calendar2-heart-fill"></i></div>
          <div>
            <div class="kpi-value">${activasCount}</div>
            <div class="kpi-label">Reservas Activas</div>
          </div>
        </div>
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-andino"><i class="bi bi-camera-fill"></i></div>
          <div>
            <div class="kpi-value">${reportesMuro.length}</div>
            <div class="kpi-label">Reportes en Muro</div>
          </div>
        </div>
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-oro"><i class="bi bi-shield-check"></i></div>
          <div>
            <div class="kpi-value">${formatMoneda(totalInvertido, moneda)}</div>
            <div class="kpi-label">Custodia en Garantía</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTabResumenYReservas(workspace) {
    const moneda = localStorage.getItem('paw_currency') || 'PEN';
    const reservasFiltradas = filtroEstadoReserva === 'todas'
      ? reservas
      : reservas.filter((r) => r.estado_reserva === filtroEstadoReserva);

    workspace.innerHTML = `
      ${renderKpisHeader()}

      <div class="card card-paw p-4 border-0 shadow-sm mb-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
          <div>
            <h5 class="fw-bold mb-0"><i class="bi bi-journal-check text-warning me-2"></i>Mis Reservas y Servicios de Custodia</h5>
            <div class="small text-secondary">Cancelación escalonada automática, comprobantes imprimibles, disputas y coordinación por WhatsApp.</div>
          </div>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <select class="form-select form-select-sm" id="select-filtro-estado-res" style="width:auto;">
              <option value="todas" ${filtroEstadoReserva === 'todas' ? 'selected' : ''}>Todos los estados (${reservas.length})</option>
              <option value="en_curso" ${filtroEstadoReserva === 'en_curso' ? 'selected' : ''}>En Curso</option>
              <option value="confirmada" ${filtroEstadoReserva === 'confirmada' ? 'selected' : ''}>Confirmadas</option>
              <option value="pendiente_confirmacion" ${filtroEstadoReserva === 'pendiente_confirmacion' ? 'selected' : ''}>Pendientes de Confirmación</option>
              <option value="finalizada" ${filtroEstadoReserva === 'finalizada' ? 'selected' : ''}>Finalizadas</option>
              <option value="en_disputa" ${filtroEstadoReserva === 'en_disputa' ? 'selected' : ''}>En Disputa</option>
              <option value="cancelada" ${filtroEstadoReserva === 'cancelada' ? 'selected' : ''}>Canceladas</option>
            </select>
            <button type="button" class="btn btn-paw btn-sm" id="btn-tabla-nueva-reserva">
              <i class="bi bi-plus-lg me-1"></i>Reservar Cuidador
            </button>
          </div>
        </div>

        ${reservasFiltradas.length === 0 ? `
          <div class="text-center py-5 bg-light rounded-3 border">
            <i class="bi bi-calendar2-plus text-warning fs-1 d-block mb-2"></i>
            <h6 class="fw-bold">No hay reservas en este estado</h6>
            <p class="text-secondary small mb-3">Inicia una reserva con cualquiera de nuestros cuidadores verificados en Cusco.</p>
            <button type="button" class="btn btn-paw btn-sm" id="btn-empty-reservar">Abrir Wizard de Reserva</button>
          </div>
        ` : reservasFiltradas.map((r) => {
          const puedeCancelar = ['pendiente_confirmacion', 'confirmada'].includes(r.estado_reserva);
          const puedeDisputa = ['en_curso', 'finalizada'].includes(r.estado_reserva);
          const puedeCalificar = r.estado_reserva === 'finalizada' && !r.calificada;
          const puedeWhatsApp = ['confirmada', 'en_curso'].includes(r.estado_reserva);
          const telWa = String(r.cuidador_telefono || '51984311111').replace(/[^0-9]/g, '');
          const msgWa = encodeURIComponent(`Hola ${r.cuidador_nombre}, soy ${propProfile.nombre} de Paw Patita Cusco sobre la reserva ${r.codigo_reserva} de mi mascota ${r.mascota_nombre} (${r.mascota_paw_id}).`);

          return `
            <div class="reserva-item-card">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                <div class="d-flex align-items-center gap-3">
                  <img src="${escapeHtml(r.cuidador_foto)}" alt="${escapeHtml(r.cuidador_nombre)}"
                    class="rounded-circle border" style="width:50px;height:50px;object-fit:cover;">
                  <div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                      <span class="badge bg-dark">${escapeHtml(r.codigo_reserva)}</span>
                      <span class="badge bg-warning text-dark">${escapeHtml(r.hu_ecode)} • ${escapeHtml(r.categoria_servicio)}</span>
                      ${renderBadgeEstadoReserva(r.estado_reserva)}
                    </div>
                    <h6 class="fw-bold text-dark mb-0 mt-1">
                      ${escapeHtml(r.tipo_servicio)} — Cuidador(a): ${escapeHtml(r.cuidador_nombre)} (${escapeHtml(r.cuidador_distrito)})
                    </h6>
                  </div>
                </div>

                <div class="text-end">
                  <div class="fs-5 fw-bold text-primary">${formatMoneda(r.monto_total, moneda)}</div>
                  <div class="small text-muted">${escapeHtml(r.metodo_pago)} • ${escapeHtml(r.num_comprobante)}</div>
                </div>
              </div>

              <div class="row g-2 small bg-light p-2 rounded-3 border mb-3">
                <div class="col-sm-4">
                  <span class="text-muted">Mascota:</span>
                  <strong class="text-dark ms-1">${escapeHtml(r.mascota_nombre)} (${escapeHtml(r.mascota_paw_id)})</strong>
                </div>
                <div class="col-sm-5">
                  <span class="text-muted">Fechas y Horario:</span>
                  <strong class="text-dark ms-1">${formatFechaEs(r.fecha_inicio)} al ${formatFechaEs(r.fecha_fin)} (${escapeHtml(r.bloque_horario)})</strong>
                </div>
                <div class="col-sm-3 text-sm-end">
                  <span class="text-muted">Duración:</span>
                  <strong class="text-dark ms-1">${escapeHtml(r.dias_calculados)} día(s)</strong>
                </div>
                ${r.notas_propietario ? `
                  <div class="col-12 text-secondary border-top pt-1 mt-1">
                    <i class="bi bi-chat-left-text me-1"></i><strong>Notas:</strong> ${escapeHtml(r.notas_propietario)}
                  </div>
                ` : ''}
                ${r.motivo_rechazo ? `
                  <div class="col-12 text-danger border-top pt-1 mt-1">
                    <i class="bi bi-info-circle-fill me-1"></i><strong>Detalle de Estado:</strong> ${escapeHtml(r.motivo_rechazo)}
                  </div>
                ` : ''}
              </div>

              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div class="d-flex flex-wrap gap-2">
                  <button type="button" class="btn btn-outline-dark btn-sm" data-res-action="comprobante" data-id="${escapeHtml(r.id)}">
                    <i class="bi bi-receipt me-1"></i>Comprobante
                  </button>
                  <button type="button" class="btn btn-outline-primary btn-sm" data-res-action="ver-muro" data-id="${escapeHtml(r.id)}">
                    <i class="bi bi-images me-1"></i>Muro en Vivo
                  </button>
                  ${puedeWhatsApp ? `
                    <a href="https://wa.me/${escapeHtml(telWa)}?text=${msgWa}" target="_blank" rel="noopener noreferrer"
                      class="btn btn-success btn-sm">
                      <i class="bi bi-whatsapp me-1"></i>Coordinar WhatsApp
                    </a>
                  ` : `
                    <button type="button" class="btn btn-outline-secondary btn-sm" disabled title="WhatsApp directo habilitado únicamente en reservas Confirmadas o En Curso">
                      <i class="bi bi-whatsapp me-1"></i>WhatsApp (Al Confirmar)
                    </button>
                  `}
                </div>

                <div class="d-flex flex-wrap gap-2">
                  ${puedeCalificar ? `
                    <button type="button" class="btn btn-warning btn-sm fw-bold text-dark" data-res-action="calificar" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-star-fill me-1"></i>Calificar Servicio
                    </button>
                  ` : (r.calificada ? `
                    <span class="badge bg-warning-subtle text-dark border px-2 py-2">
                      ★ Calificada (${escapeHtml(r.estrellas_otorgadas || 5)}/5)
                    </span>
                  ` : '')}

                  ${puedeDisputa ? `
                    <button type="button" class="btn btn-outline-warning btn-sm text-dark" data-res-action="disputa" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-hammer me-1"></i>Abrir Disputa
                    </button>
                  ` : ''}

                  ${puedeCancelar ? `
                    <button type="button" class="btn btn-outline-danger btn-sm" data-res-action="cancelar" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-x-circle me-1"></i>Cancelar con Reembolso
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderTabMascotas(workspace) {
    workspace.innerHTML = `
      <div class="card card-paw p-4 border-0 shadow-sm mb-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-3 border-bottom">
          <div>
            <h5 class="fw-bold mb-1">
              <i class="bi bi-qr-code-scan text-warning me-2"></i>Mis Mascotas y Carné Sanitario Digital PAW-ID
            </h5>
            <p class="text-secondary small mb-0">
              Edad calculada dinámicamente en tiempo real desde la fecha de nacimiento, validación oficial por Clínicas Aliadas y QR de emergencia imprimible.
            </p>
          </div>
          <button type="button" class="btn btn-paw" id="btn-registrar-nueva-mascota">
            <i class="bi bi-plus-circle-fill me-1"></i>Registrar Nueva Mascota
          </button>
        </div>

        ${mascotas.length === 0 ? `
          <div class="text-center py-5 bg-light rounded-3 border">
            <i class="bi bi-heart-pulse text-warning fs-1 d-block mb-2"></i>
            <h6 class="fw-bold">Aún no has registrado mascotas</h6>
            <p class="text-secondary small mb-3">Registra a tu compañero para obtener su código PAW-ID y reservar cuidadores en Cusco.</p>
            <button type="button" class="btn btn-paw btn-sm" id="btn-empty-add-pet">Registrar Primera Mascota</button>
          </div>
        ` : `
          <div class="mascotas-grid">
            ${mascotas.map((m) => renderTarjetaMascota(m)).join('')}
          </div>
        `}
      </div>
    `;
  }

  function renderTabPerfil(workspace) {
    workspace.innerHTML = `
      <div class="card card-paw p-4 border-0 shadow-sm">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-3 border-bottom">
          <div>
            <h5 class="fw-bold mb-1">
              <i class="bi bi-person-Vcard-fill text-warning me-2"></i>Mi Perfil Unificado de Propietario (Residente Local / Turista)
            </h5>
            <p class="text-secondary small mb-0">
              Configura tus datos de contacto, documento (DNI, CE o Pasaporte) y si te encuentras de visita turística en un hotel de Cusco.
            </p>
          </div>
          <span class="badge bg-dark fs-6">${escapeHtml(propProfile.codigo_usuario)}</span>
        </div>

        <form id="form-perfil-propietario" novalidate>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label small fw-bold">Nombres *</label>
              <input type="text" class="form-control" id="prof-nombre" required value="${escapeHtml(propProfile.nombre)}">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-bold">Apellidos *</label>
              <input type="text" class="form-control" id="prof-apellido" required value="${escapeHtml(propProfile.apellido)}">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-bold">Teléfono / WhatsApp *</label>
              <input type="text" class="form-control" id="prof-telefono" required value="${escapeHtml(propProfile.telefono)}">
            </div>

            <div class="col-md-4">
              <label class="form-label small fw-bold">Tipo de Documento *</label>
              <select class="form-select" id="prof-tipo-doc">
                ${CUSCO_CONFIG.TIPOS_DOCUMENTO.map((td) => `
                  <option value="${escapeHtml(td.id)}" ${propProfile.tipo_documento === td.id ? 'selected' : ''}>
                    ${escapeHtml(td.nombre)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-bold">Número de Documento *</label>
              <input type="text" class="form-control" id="prof-num-doc" required value="${escapeHtml(propProfile.num_documento)}">
            </div>
            <div class="col-md-4">
              <label class="form-label small fw-bold">Distrito en Cusco *</label>
              <select class="form-select" id="prof-distrito">
                ${CUSCO_CONFIG.DISTRITOS.map((d) => `
                  <option value="${escapeHtml(d)}" ${propProfile.distrito_cusco === d ? 'selected' : ''}>${escapeHtml(d)}</option>
                `).join('')}
              </select>
            </div>

            <div class="col-12">
              <label class="form-label small fw-bold">Dirección en Cusco</label>
              <input type="text" class="form-control" id="prof-direccion" value="${escapeHtml(propProfile.direccion)}"
                placeholder="Ej. Urb. Magisterio K-12, Wanchaq o Calle San Agustín 400">
            </div>

            <!-- Interruptor Unificado: Local vs Turista en Cusco -->
            <div class="col-12">
              <div class="p-3 rounded-3 border bg-warning-subtle">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="prof-check-turista" ${propProfile.es_turista ? 'checked' : ''}>
                  <label class="form-check-label fw-bold text-dark" for="prof-check-turista">
                    <i class="bi bi-airplane-engines-fill text-primary me-1"></i>
                    Soy turista / visitante temporal en Cusco (habilitar recojo en Hotel / Airbnb)
                  </label>
                </div>

                <div class="row g-3 mt-1 ${propProfile.es_turista ? '' : 'd-none'}" id="prof-campos-turista">
                  <div class="col-md-4">
                    <label class="form-label small fw-bold">País de Origen</label>
                    <input type="text" class="form-control bg-white" id="prof-pais" value="${escapeHtml(propProfile.pais_origen)}"
                      placeholder="Ej. Francia, Estados Unidos, Perú (Lima)">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-bold">Idioma Preferido</label>
                    <select class="form-select bg-white" id="prof-idioma">
                      <option value="ES" ${propProfile.idioma_preferido === 'ES' ? 'selected' : ''}>Español (ES)</option>
                      <option value="EN" ${propProfile.idioma_preferido === 'EN' ? 'selected' : ''}>English (EN)</option>
                    </select>
                  </div>
                  <div class="col-md-5">
                    <label class="form-label small fw-bold">Hotel / Airbnb en Cusco (Para recojo de mascota)</label>
                    <input type="text" class="form-control bg-white" id="prof-hotel"
                      value="${escapeHtml(propProfile.hospedaje_hotel_cusco)}"
                      placeholder="Ej. Hotel Palacio del Inka, Selina Cusco, Airbnb San Blas">
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label small fw-bold">Contacto de Emergencia (Nombre y Parentesco)</label>
              <input type="text" class="form-control" id="prof-emerg-nombre"
                value="${escapeHtml(propProfile.contacto_emergencia_nombre)}"
                placeholder="Ej. Carlos Mendoza (Hermano) o Recepción Hotel">
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-bold">Teléfono de Emergencia (Visible al escanear QR PAW-ID)</label>
              <input type="text" class="form-control" id="prof-emerg-tel"
                value="${escapeHtml(propProfile.contacto_emergencia_tel)}"
                placeholder="Ej. +51 984 998 877">
            </div>

            <div class="col-12 text-end pt-2">
              <button type="submit" class="btn btn-paw px-4">
                <i class="bi bi-save2-fill me-1"></i>Guardar Cambios en Mi Perfil
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    const checkTurista = workspace.querySelector('#prof-check-turista');
    const boxTurista = workspace.querySelector('#prof-campos-turista');
    checkTurista?.addEventListener('change', () => {
      boxTurista?.classList.toggle('d-none', !checkTurista.checked);
    });

    workspace.querySelector('#form-perfil-propietario')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = {
        nombre: workspace.querySelector('#prof-nombre').value.trim() || propProfile.nombre,
        apellido: workspace.querySelector('#prof-apellido').value.trim(),
        telefono: workspace.querySelector('#prof-telefono').value.trim(),
        tipo_documento: workspace.querySelector('#prof-tipo-doc').value,
        num_documento: workspace.querySelector('#prof-num-doc').value.trim(),
        distrito_cusco: workspace.querySelector('#prof-distrito').value,
        direccion: workspace.querySelector('#prof-direccion').value.trim(),
        es_turista: checkTurista.checked,
        pais_origen: checkTurista.checked ? (workspace.querySelector('#prof-pais').value.trim() || 'Perú') : 'Perú',
        idioma_preferido: checkTurista.checked ? workspace.querySelector('#prof-idioma').value : 'ES',
        hospedaje_hotel_cusco: checkTurista.checked ? workspace.querySelector('#prof-hotel').value.trim() : '',
        contacto_emergencia_nombre: workspace.querySelector('#prof-emerg-nombre').value.trim(),
        contacto_emergencia_tel: workspace.querySelector('#prof-emerg-tel').value.trim()
      };

      showSpinner('Actualizando tu perfil unificado de propietario...');
      try {
        const supabase = getSupabase();
        if (supabase && isSupabaseConfigured() && !String(propProfile.id).startsWith('mock-')) {
          const { error } = await supabase
            .from('perfiles_usuarios')
            .update(updated)
            .eq('id', propProfile.id);
          if (error) throw error;
        }

        Object.assign(propProfile, updated);
        updateLocalSessionProfile(updated);
        showToast('Tu perfil de propietario ha sido actualizado con éxito.', 'success', 'Perfil Actualizado');
        renderLayout();
      } catch (err) {
        handleSupabaseError(err, 'No se pudo actualizar el perfil.');
      } finally {
        hideSpinner();
      }
    });
  }

  function renderWorkspace() {
    const workspace = container.querySelector('#propietario-workspace');
    if (!workspace) return;

    if (activeTab === 'resumen') {
      renderTabResumenYReservas(workspace);
    } else if (activeTab === 'mascotas') {
      renderTabMascotas(workspace);
    } else if (activeTab === 'muro') {
      renderSeccionMuroFotos(workspace, { reportes: reportesMuro, reservas });
    } else if (activeTab === 'sos') {
      renderSeccionAlertasSos(workspace, {
        alertasSos,
        reservas,
        distritoPropietario: propProfile.distrito_cusco,
        onNuevaAlerta: (nueva) => {
          alertasSos.unshift(nueva);
          renderLayout();
        }
      });
    } else if (activeTab === 'perfil') {
      renderTabPerfil(workspace);
    }

    bindWorkspaceEvents(workspace);
  }

  function lanzarWizardReserva(preCuidadorId = null, preCuidadorCodigo = null) {
    abrirWizardReserva({
      mascotas,
      propietarioProfile: propProfile,
      preselectedCuidadorId: preCuidadorId,
      preselectedCuidadorCodigo: preCuidadorCodigo,
      onReservaCreada: (nuevaReserva) => {
        reservas.unshift(normalizarReserva(nuevaReserva));
        const local = getLocalReservas();
        local.unshift(nuevaReserva);
        saveLocalReservas(local);
        activeTab = 'resumen';
        filtroEstadoReserva = 'todas';
        renderLayout();
      }
    });
  }

  function bindWorkspaceEvents(workspace) {
    // Botones para abrir Wizard de Reserva
    workspace.querySelector('#btn-hero-nueva-reserva')?.addEventListener('click', () => lanzarWizardReserva());
    workspace.querySelector('#btn-tabla-nueva-reserva')?.addEventListener('click', () => lanzarWizardReserva());
    workspace.querySelector('#btn-empty-reservar')?.addEventListener('click', () => lanzarWizardReserva());

    // Botón rápido S.O.S. en Hero
    workspace.querySelector('#btn-hero-sos-rapido')?.addEventListener('click', () => {
      abrirModalEmitirSos({
        reservas,
        distritoPropietario: propProfile.distrito_cusco,
        onSosEmitido: (nueva) => {
          alertasSos.unshift(nueva);
          activeTab = 'sos';
          renderLayout();
        }
      });
    });

    // Filtro por estado de reserva
    workspace.querySelector('#select-filtro-estado-res')?.addEventListener('change', (e) => {
      filtroEstadoReserva = e.target.value;
      renderWorkspace();
    });

    // Acciones en tarjetas de reserva
    workspace.querySelectorAll('[data-res-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-res-action');
        const idRes = btn.getAttribute('data-id');
        const reservaObj = reservas.find((r) => r.id === idRes);
        if (!reservaObj) return;

        if (action === 'comprobante') {
          abrirModalComprobantePago(reservaObj, propProfile);
        } else if (action === 'ver-muro') {
          activeTab = 'muro';
          renderLayout();
          const ws = container.querySelector('#propietario-workspace');
          renderSeccionMuroFotos(ws, { reportes: reportesMuro, reservas, filtroReservaId: idRes });
        } else if (action === 'cancelar') {
          abrirModalCancelarReserva(reservaObj, (cancelledId, motivo) => {
            const target = reservas.find((item) => item.id === cancelledId);
            if (target) {
              target.estado_reserva = 'cancelada';
              target.motivo_rechazo = `Cancelada por propietario: ${motivo}`;
            }
            renderLayout();
          });
        } else if (action === 'disputa') {
          abrirModalDisputaReserva(reservaObj, (disputaId, motivo) => {
            const target = reservas.find((item) => item.id === disputaId);
            if (target) {
              target.estado_reserva = 'en_disputa';
              target.motivo_rechazo = motivo;
            }
            renderLayout();
          });
        } else if (action === 'calificar') {
          abrirModalCalificarReserva(reservaObj, (calificadaId, estrellas) => {
            const target = reservas.find((item) => item.id === calificadaId);
            if (target) {
              target.calificada = true;
              target.estrellas_otorgadas = estrellas;
            }
            renderLayout();
          });
        }
      });
    });

    // Acciones en pestaña Mis Mascotas y PAW-ID
    const openNewPetModal = () => {
      abrirModalFormularioMascota(null, propProfile.id, (nuevaMascota) => {
        mascotas.push(nuevaMascota);
        renderLayout();
      });
    };
    workspace.querySelector('#btn-registrar-nueva-mascota')?.addEventListener('click', openNewPetModal);
    workspace.querySelector('#btn-empty-add-pet')?.addEventListener('click', openNewPetModal);

    workspace.querySelectorAll('[data-action="ver-carnet"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pet = mascotas.find((m) => m.id === btn.getAttribute('data-id'));
        if (pet) abrirModalCarnetPawId(pet, propProfile, alertasSos);
      });
    });

    workspace.querySelectorAll('[data-action="ver-cartilla"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pet = mascotas.find((m) => m.id === btn.getAttribute('data-id'));
        if (pet) abrirVisorCartillaVacunas(pet);
      });
    });

    workspace.querySelectorAll('[data-action="editar-mascota"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pet = mascotas.find((m) => m.id === btn.getAttribute('data-id'));
        if (!pet) return;
        abrirModalFormularioMascota(pet, propProfile.id, (actualizada) => {
          const idx = mascotas.findIndex((item) => item.id === actualizada.id);
          if (idx >= 0) mascotas[idx] = actualizada;
          renderLayout();
        });
      });
    });

    workspace.querySelectorAll('[data-action="archivar-mascota"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pet = mascotas.find((m) => m.id === btn.getAttribute('data-id'));
        if (!pet) return;
        archivarMascotaPropietario(pet, (archivedId) => {
          mascotas = mascotas.filter((item) => item.id !== archivedId);
          renderLayout();
        });
      });
    });
  }

  renderLayout();

  // Si el usuario pulsó "Reservar" en el Catálogo Público (Fase 4), abrir el Wizard preseleccionando ese cuidador
  const preCodigo = localStorage.getItem('paw_reserva_cuidador_codigo');
  const preId = localStorage.getItem('paw_reserva_cuidador_id');
  if (preCodigo || preId) {
    localStorage.removeItem('paw_reserva_cuidador_codigo');
    localStorage.removeItem('paw_reserva_cuidador_id');
    setTimeout(() => {
      lanzarWizardReserva(preId, preCodigo);
    }, 180);
  }
}

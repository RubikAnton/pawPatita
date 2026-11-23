/**
 * Paw Patita Cusco v5.0 — Wizard de Reserva en 4 Pasos
 * js/components/wizard-reserva.js
 *
 * Flujo Transaccional en 4 Pasos:
 *  - Paso 1: Selección de Cuidador Aprobado, Oferta/Servicio real (`HU-XXX`) y Mascota validada.
 *  - Paso 2: Selección de Fechas (`fecha_inicio`, `fecha_fin`), Bloque Horario exacto
 *            (`todo_el_dia`, `manana_08_12`, `tarde_14_18`, `noche_18_22`) verificando cupos
 *            en `disponibilidad_cuidadores`, Extras (Baño higiénico, Recojo en hotel) y Notas.
 *  - Paso 3: Cotización transparente vía `rpc_cotizar_reserva` (tarifa base, días, temporada Cusco,
 *            recargo cachorro <1 año, extras, validación de cupón `BIENVENIDO10`/`MACHUPICCHU15`/`CUSCO20`,
 *            desglose exacto 15% plataforma / 85% cuidador y total en PEN y USD).
 *  - Paso 4: Pasarela Simulada (Yape/Plin con QR + N° operación o Tarjeta con últimos 4 dígitos),
 *            aceptación de TyC v5.0, ejecución atómica de `rpc_crear_reserva` y apertura automática
 *            del Comprobante Electrónico Imprimible.
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { CUIDADORES_SEED } from '../public/catalogo.js';
import { normalizarMascota, renderBadgeSanitario, abrirModalComprobantePago } from './carnet-digital.js';
import { formatMoneda, formatFechaEs, escapeHtml, getHoyIso, sumarDiasIso, parseFechaLocal } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';

const BLOQUES_WIZARD = [
  { id: 'todo_el_dia', etiqueta: 'Todo el Día (08:00 - 20:00)', inicio: '08:00:00', fin: '20:00:00', icono: 'bi-sun-fill' },
  { id: 'manana_08_12', etiqueta: 'Mañana (08:00 - 12:00)', inicio: '08:00:00', fin: '12:00:00', icono: 'bi-sunrise-fill' },
  { id: 'tarde_14_18', etiqueta: 'Tarde (14:00 - 18:00)', inicio: '14:00:00', fin: '18:00:00', icono: 'bi-cloud-sun-fill' },
  { id: 'noche_18_22', etiqueta: 'Noche (18:00 - 22:00)', inicio: '18:00:00', fin: '22:00:00', icono: 'bi-moon-stars-fill' }
];

const TEMPORADAS_FALLBACK = [
  { id: '10000000-0000-0000-0000-000000000001', nombre: 'Fiestas del Cusco e Inti Raymi', inicio: '06-01', fin: '06-30', recargo_pct: 20 },
  { id: '10000000-0000-0000-0000-000000000002', nombre: 'Fiestas Patrias Perú', inicio: '07-15', fin: '08-15', recargo_pct: 15 },
  { id: '10000000-0000-0000-0000-000000000003', nombre: 'Semana Santa Cusqueña', inicio: '03-25', fin: '04-10', recargo_pct: 15 },
  { id: '10000000-0000-0000-0000-000000000004', nombre: 'Navidad y Año Nuevo en los Andes', inicio: '12-20', fin: '12-31', recargo_pct: 25 },
  { id: '10000000-0000-0000-0000-000000000005', nombre: 'Temporada de Lluvias Cusco', inicio: '01-05', fin: '02-28', recargo_pct: 10 }
];

const CUPONES_FALLBACK = {
  BIENVENIDO10: { id: '20000000-0000-0000-0000-000000000001', codigo: 'BIENVENIDO10', tipo: 'porcentaje', valor: 10, minimo: 40, desc: '10% de descuento de bienvenida' },
  MACHUPICCHU15: { id: '20000000-0000-0000-0000-000000000002', codigo: 'MACHUPICCHU15', tipo: 'porcentaje', valor: 15, minimo: 70, desc: '15% de descuento especial Machu Picchu' },
  CUSCO20: { id: '20000000-0000-0000-0000-000000000003', codigo: 'CUSCO20', tipo: 'monto_fijo', valor: 20, minimo: 120, desc: 'S/ 20.00 de descuento directo en hospedajes' }
};

/**
 * Carga todos los cuidadores aprobados con sus ofertas desde `v_catalogo_cuidadores` o fallback
 */
export async function cargarCuidadoresConOfertas() {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('v_catalogo_cuidadores')
        .select('*')
        .order('reputacion_promedio', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('Usando CUIDADORES_SEED en Wizard:', err);
    }
  }
  return CUIDADORES_SEED;
}

/**
 * Replica exactamente la lógica matemática de `rpc_cotizar_reserva` cuando se opera en modo local/demo
 */
function cotizarReservaLocal({ oferta, cuidador, mascota, fechaInicio, fechaFin, bloqueHorario, extras, codigoCupon }) {
  const fIni = parseFechaLocal(fechaInicio);
  const fFin = parseFechaLocal(fechaFin);
  if (!fIni || !fFin || fFin < fIni) {
    throw new Error('La fecha de término no puede ser anterior a la fecha de inicio.');
  }

  const diffDays = Math.round((fFin.getTime() - fIni.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dias = Math.max(1, diffDays);
  const tarifaUnitaria = Number(oferta.tarifa_diaria_por_perro || 45);
  const subtotalBase = Number((tarifaUnitaria * dias).toFixed(2));

  // Detectar temporada turística en Cusco (MM-DD)
  const mmdd = String(fechaInicio).slice(5, 10);
  const temp = TEMPORADAS_FALLBACK.find((t) => mmdd >= t.inicio && mmdd <= t.fin) || null;
  const ajusteTemporada = temp ? Number((subtotalBase * (temp.recargo_pct / 100)).toFixed(2)) : 0;

  // Recargo cachorro (< 1 año)
  const esCachorro = Boolean(mascota?.es_cachorro);
  if (esCachorro && cuidador && cuidador.acepta_cachorros === false) {
    throw new Error(`El cuidador ${cuidador.nombre_completo} no acepta cachorros menores de 1 año.`);
  }
  const recargoCachorro = esCachorro ? Number((subtotalBase * 0.10).toFixed(2)) : 0;

  // Extras
  let extrasMonto = 0;
  if (extras?.bano_higienico) extrasMonto += 25.00;
  if (extras?.recojo_hotel && !oferta.incluye_recojo_hotel) {
    extrasMonto += Number(oferta.tarifa_recojo_extra ?? 15.00);
  }

  // Cupón promocional
  let idCupon = null;
  let codigoAplicado = null;
  let descuentoCupon = 0;
  if (codigoCupon && codigoCupon.trim() !== '') {
    const key = codigoCupon.trim().toUpperCase();
    const cup = CUPONES_FALLBACK[key];
    if (!cup) {
      throw new Error(`El cupón "${codigoCupon}" no es válido o ha expirado. Prueba con BIENVENIDO10, MACHUPICCHU15 o CUSCO20.`);
    }
    const preTotal = subtotalBase + ajusteTemporada + recargoCachorro + extrasMonto;
    if (preTotal < cup.minimo) {
      throw new Error(`El cupón "${cup.codigo}" requiere un consumo mínimo de S/ ${cup.minimo.toFixed(2)}.`);
    }
    idCupon = cup.id;
    codigoAplicado = cup.codigo;
    if (cup.tipo === 'porcentaje') {
      descuentoCupon = Number(((subtotalBase + ajusteTemporada) * (cup.valor / 100)).toFixed(2));
    } else {
      descuentoCupon = Math.min(cup.valor, subtotalBase);
    }
  }

  const montoTotalPen = Math.max(1, Number((subtotalBase + ajusteTemporada + recargoCachorro + extrasMonto - descuentoCupon).toFixed(2)));
  const tcUsd = 3.75;
  const montoTotalUsd = Number((montoTotalPen / tcUsd).toFixed(2));
  const comision15 = Number((montoTotalPen * 0.15).toFixed(2));
  const netoCuidador85 = Number((montoTotalPen - comision15).toFixed(2));

  return {
    exito: true,
    id_oferta: oferta.id_oferta || oferta.id,
    hu_ecode: oferta.hu_ecode,
    id_cuidador: cuidador.id_cuidador,
    categoria: oferta.categoria,
    tipo_servicio: oferta.tipo_servicio,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    bloque_horario: bloqueHorario,
    dias_calculados: dias,
    tarifa_unitaria: tarifaUnitaria,
    subtotal_base: subtotalBase,
    id_temporada: temp?.id || null,
    nombre_temporada: temp?.nombre || null,
    ajuste_temporada: ajusteTemporada,
    es_cachorro: esCachorro,
    recargo_cachorro: recargoCachorro,
    extras_monto: extrasMonto,
    id_cupon: idCupon,
    codigo_cupon: codigoAplicado,
    descuento_cupon: descuentoCupon,
    monto_total_pen: montoTotalPen,
    monto_total_usd: montoTotalUsd,
    tipo_cambio_usd: tcUsd,
    comision_porcentaje: 15,
    comision_plataforma_15: comision15,
    monto_neto_cuidador_85: netoCuidador85
  };
}

/**
 * Abre el Modal Asistente de Reserva en 4 Pasos
 */
export async function abrirWizardReserva({
  mascotas = [],
  propietarioProfile = null,
  preselectedCuidadorId = null,
  preselectedCuidadorCodigo = null,
  onReservaCreada = null
} = {}) {
  const mascotasActivas = (mascotas || []).map(normalizarMascota);
  if (mascotasActivas.length === 0) {
    showToast('Primero debes registrar al menos una mascota con su Carné PAW-ID antes de reservar.', 'warning', 'Registra tu Mascota');
    return;
  }

  showSpinner('Cargando ofertas y agenda de cuidadores en Cusco...');
  let cuidadores = [];
  try {
    cuidadores = await cargarCuidadoresConOfertas();
  } finally {
    hideSpinner();
  }

  // Determinar cuidador preseleccionado (desde catálogo o el primero)
  const cuidadorInicial = cuidadores.find((c) => (
    (preselectedCuidadorId && c.id_cuidador === preselectedCuidadorId) ||
    (preselectedCuidadorCodigo && c.codigo_cuidador === preselectedCuidadorCodigo)
  )) || cuidadores[0];

  const mascotaInicial = mascotasActivas.find((m) => m.estado_validacion_vet === 'validado') || mascotasActivas[0];
  const ofertaInicial = (cuidadorInicial?.servicios_disponibles || [])[0] || null;
  const mananaIso = sumarDiasIso(getHoyIso(), 2);
  const pasadoMananaIso = sumarDiasIso(getHoyIso(), 3);

  const state = {
    paso: 1,
    cuidador: cuidadorInicial,
    oferta: ofertaInicial,
    mascota: mascotaInicial,
    fechaInicio: mananaIso,
    fechaFin: pasadoMananaIso,
    bloqueHorario: 'todo_el_dia',
    disponibilidadDia: null,
    extras: {
      bano_higienico: false,
      recojo_hotel: Boolean(propietarioProfile?.es_turista)
    },
    notasPropietario: propietarioProfile?.hospedaje_hotel_cusco
      ? `Recojo coordinado en ${propietarioProfile.hospedaje_hotel_cusco}.`
      : '',
    codigoCupon: '',
    cotizacion: null,
    metodoPago: 'Yape',
    numOperacion: `YAPE-${Math.floor(100000 + Math.random() * 900000)}`,
    ultimos4: '4242',
    tipoComprobante: 'Boleta Electrónica',
    aceptaTyc: true
  };

  const modal = crearModalDinamico({
    titulo: 'Asistente de Reserva Segura con Garantía Escrow (4 Pasos)',
    icono: 'bi-calendar2-check-fill',
    cuerpoHtml: '<div id="wizard-reserva-root"></div>',
    footerHtml: '<div id="wizard-reserva-footer" class="w-100 d-flex justify-content-between align-items-center"></div>',
    tamano: 'modal-xl',
    estatico: true
  });

  async function verificarDisponibilidadStep2() {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && state.cuidador?.id_cuidador) {
      try {
        const { data } = await supabase
          .from('disponibilidad_cuidadores')
          .select('*')
          .eq('id_cuidador', state.cuidador.id_cuidador)
          .gte('fecha', state.fechaInicio)
          .lte('fecha', state.fechaFin);

        if (Array.isArray(data) && data.length > 0) {
          state.disponibilidadDia = data;
          return;
        }
      } catch (_) { /* fallback */ }
    }
    state.disponibilidadDia = null;
  }

  async function ejecutarCotizacionStep3(mostrarToastCupon = false) {
    showSpinner('Calculando cotización con rpc_cotizar_reserva...');
    try {
      const supabase = getSupabase();
      let cot = null;

      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.rpc('rpc_cotizar_reserva', {
          p_id_oferta: state.oferta.id_oferta || state.oferta.id,
          p_fecha_inicio: state.fechaInicio,
          p_fecha_fin: state.fechaFin,
          p_bloque_horario: state.bloqueHorario,
          p_extras: {
            ...state.extras,
            es_cachorro: state.mascota.es_cachorro
          },
          p_codigo_cupon: state.codigoCupon ? state.codigoCupon.trim() : null,
          p_id_mascota: state.mascota.id
        });
        if (error) throw error;
        cot = data;
      } else {
        cot = cotizarReservaLocal({
          oferta: state.oferta,
          cuidador: state.cuidador,
          mascota: state.mascota,
          fechaInicio: state.fechaInicio,
          fechaFin: state.fechaFin,
          bloqueHorario: state.bloqueHorario,
          extras: state.extras,
          codigoCupon: state.codigoCupon
        });
      }

      state.cotizacion = cot;
      if (mostrarToastCupon && cot.codigo_cupon) {
        showToast(`¡Cupón ${cot.codigo_cupon} aplicado! Descuento: S/ ${Number(cot.descuento_cupon).toFixed(2)}`, 'success', 'Cupón Promocional');
      }
      return true;
    } catch (err) {
      handleSupabaseError(err, 'No se pudo cotizar la reserva.');
      return false;
    } finally {
      hideSpinner();
    }
  }

  function renderStepperHeader() {
    const titulos = [
      { n: 1, t: 'Mascota y Servicio' },
      { n: 2, t: 'Fechas y Horario' },
      { n: 3, t: 'Cotización y Cupón' },
      { n: 4, t: 'Pago y Confirmación' }
    ];
    return `
      <div class="wizard-steps-bar">
        ${titulos.map((s) => {
          const cls = state.paso === s.n ? 'active' : (state.paso > s.n ? 'completed' : '');
          const iconOrNum = state.paso > s.n ? '<i class="bi bi-check-lg"></i>' : s.n;
          return `
            <div class="wizard-step-pill ${cls}">
              <span class="step-num">${iconOrNum}</span>
              <span>${escapeHtml(s.t)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderPaso1() {
    const moneda = localStorage.getItem('paw_currency') || 'PEN';
    const ofertas = state.cuidador?.servicios_disponibles || [];

    return `
      <div class="row g-4">
        <!-- Selección de Cuidador -->
        <div class="col-12">
          <div class="p-3 bg-light rounded-3 border">
            <div class="row align-items-center g-2">
              <div class="col-md-5">
                <label class="form-label small fw-bold mb-1 text-secondary">
                  <i class="bi bi-person-heart text-warning me-1"></i>Cuidador Verificado en Cusco
                </label>
                <select class="form-select" id="wiz-select-cuidador">
                  ${cuidadores.map((c) => `
                    <option value="${escapeHtml(c.id_cuidador)}" ${c.id_cuidador === state.cuidador?.id_cuidador ? 'selected' : ''}>
                      ${escapeHtml(c.nombre_completo)} — ${escapeHtml(c.distrito_cusco)} (★ ${Number(c.reputacion_promedio || 5).toFixed(2)})
                    </option>
                  `).join('')}
                </select>
              </div>
              <div class="col-md-7">
                <div class="d-flex align-items-center gap-3 ps-md-2">
                  <img src="${escapeHtml(state.cuidador?.foto_url)}" alt="${escapeHtml(state.cuidador?.nombre_completo)}"
                    class="rounded-circle border" style="width:52px;height:52px;object-fit:cover;">
                  <div class="small">
                    <div class="fw-bold text-dark">
                      ${escapeHtml(state.cuidador?.nombre_completo)}
                      <span class="badge bg-secondary ms-1">${escapeHtml(state.cuidador?.codigo_cuidador)}</span>
                      <span class="badge bg-warning text-dark ms-1">${escapeHtml(state.cuidador?.distrito_cusco)}</span>
                    </div>
                    <div class="text-secondary">${escapeHtml(state.cuidador?.presentacion_corta || '')}</div>
                    <div class="text-muted">
                      Vivienda: <strong>${escapeHtml(state.cuidador?.tipo_vivienda || 'Casa verificada')}</strong> •
                      Capacidad máx: <strong>${escapeHtml(state.cuidador?.capacidad_max_mascotas || 3)} mascotas</strong> •
                      Acepta cachorros: <strong>${state.cuidador?.acepta_cachorros ? 'Sí' : 'No'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selección de Mascota del Propietario -->
        <div class="col-md-6">
          <h6 class="fw-bold mb-2"><i class="bi bi-qr-code text-warning me-1"></i>1. Selecciona tu Mascota (Ficha PAW-ID)</h6>
          <div class="d-flex flex-column gap-2">
            ${mascotasActivas.map((m) => {
              const esObservada = m.estado_validacion_vet === 'observado';
              const esSeleccionada = state.mascota?.id === m.id;
              return `
                <div class="wizard-selectable-card ${esSeleccionada ? 'selected' : ''} ${esObservada ? 'disabled-card' : ''}"
                  data-select-pet="${escapeHtml(m.id)}" data-observada="${esObservada}">
                  <div class="d-flex align-items-center gap-3">
                    <img src="${escapeHtml(m.foto_url)}" alt="${escapeHtml(m.nombre)}"
                      class="rounded-3 border" style="width:54px;height:54px;object-fit:cover;">
                    <div class="flex-grow-1">
                      <div class="d-flex justify-content-between align-items-center flex-wrap gap-1">
                        <strong class="text-dark">${escapeHtml(m.nombre)} <span class="badge bg-dark ms-1">${escapeHtml(m.paw_id)}</span></strong>
                        ${renderBadgeSanitario(m.estado_validacion_vet)}
                      </div>
                      <div class="small text-secondary">${escapeHtml(m.raza)} • ${escapeHtml(m.edad_texto)} • ${escapeHtml(m.tamano)}</div>
                      ${esObservada ? `
                        <div class="small text-danger fw-semibold mt-1">
                          <i class="bi bi-exclamation-octagon me-1"></i>Ficha observada: actualiza su cartilla de vacunas antes de reservar.
                        </div>
                      ` : (m.estado_validacion_vet === 'pendiente' ? `
                        <div class="small text-warning-emphasis mt-1">
                          <i class="bi bi-info-circle me-1"></i>Pendiente de dictamen vet: puedes reservar, sujeta a verificación previa al Check-In.
                        </div>
                      ` : '')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Selección de Servicio / Oferta del Cuidador -->
        <div class="col-md-6">
          <h6 class="fw-bold mb-2"><i class="bi bi-briefcase-fill text-warning me-1"></i>2. Selecciona la Oferta / Servicio del Cuidador</h6>
          <div class="d-flex flex-column gap-2">
            ${ofertas.map((of) => {
              const ofId = of.id_oferta || of.id;
              const sel = (state.oferta?.id_oferta || state.oferta?.id) === ofId;
              return `
                <div class="wizard-selectable-card ${sel ? 'selected' : ''}" data-select-oferta="${escapeHtml(ofId)}">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <span class="badge bg-warning text-dark me-1">${escapeHtml(of.hu_ecode)}</span>
                      <span class="badge bg-secondary">${escapeHtml(of.categoria)}</span>
                      <div class="fw-bold text-dark mt-1">${escapeHtml(of.tipo_servicio)}</div>
                    </div>
                    <div class="text-end">
                      <div class="fs-5 fw-bold text-primary">${formatMoneda(of.tarifa_diaria_por_perro, moneda)}</div>
                      <div class="small text-muted">por día / bloque</div>
                    </div>
                  </div>
                  <div class="small text-secondary mt-1">${escapeHtml(of.descripcion_servicio)}</div>
                  <div class="small mt-2">
                    ${of.incluye_recojo_hotel
                      ? '<span class="badge bg-success-subtle text-success"><i class="bi bi-building-check me-1"></i>Recojo en Hotel Incluido Gratis</span>'
                      : `<span class="badge bg-light text-secondary border">Recojo en hotel opcional (+${formatMoneda(of.tarifa_recojo_extra || 15, moneda)})</span>`}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderPaso2() {
    const hoy = getHoyIso();
    const moneda = localStorage.getItem('paw_currency') || 'PEN';
    const capMax = state.cuidador?.capacidad_max_mascotas || 3;

    return `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 border h-100">
            <h6 class="fw-bold mb-3"><i class="bi bi-calendar-range text-warning me-1"></i>1. Fechas del Servicio en Cusco</h6>
            <div class="row g-3">
              <div class="col-sm-6">
                <label class="form-label small fw-bold">Fecha de Inicio *</label>
                <input type="date" class="form-control" id="wiz-fecha-inicio" min="${hoy}" value="${escapeHtml(state.fechaInicio)}">
              </div>
              <div class="col-sm-6">
                <label class="form-label small fw-bold">Fecha de Fin *</label>
                <input type="date" class="form-control" id="wiz-fecha-fin" min="${escapeHtml(state.fechaInicio)}" value="${escapeHtml(state.fechaFin)}">
              </div>
            </div>

            <h6 class="fw-bold mt-4 mb-2"><i class="bi bi-clock-history text-warning me-1"></i>2. Selecciona el Bloque Horario Exacto</h6>
            <div class="row g-2">
              ${BLOQUES_WIZARD.map((b) => {
                const sel = state.bloqueHorario === b.id;
                const matchDisp = (state.disponibilidadDia || []).find((d) => d.bloque_horario === b.id);
                const ocupados = matchDisp ? matchDisp.cupos_reservados : (b.id === 'todo_el_dia' ? 1 : 0);
                const cupo = matchDisp ? matchDisp.cupo_maximo : capMax;
                const bloqueado = matchDisp?.estado_bloque === 'bloqueado' || ocupados >= cupo;
                return `
                  <div class="col-sm-6">
                    <div class="wizard-selectable-card p-2 ${sel ? 'selected' : ''} ${bloqueado ? 'disabled-card' : ''}"
                      data-select-bloque="${escapeHtml(b.id)}" data-bloqueado="${bloqueado}">
                      <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold small"><i class="bi ${b.icono} text-warning me-1"></i>${escapeHtml(b.etiqueta)}</span>
                      </div>
                      <div class="d-flex justify-content-between align-items-center mt-1 small">
                        <span class="text-muted">Cupos libres: <strong>${Math.max(0, cupo - ocupados)} de ${cupo}</strong></span>
                        <span class="badge ${bloqueado ? 'bg-danger' : 'bg-success-subtle text-success'}">
                          ${bloqueado ? 'Agotado' : 'Disponible'}
                        </span>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 border h-100">
            <h6 class="fw-bold mb-3"><i class="bi bi-stars text-warning me-1"></i>3. Servicios Adicionales y Notas de Custodia</h6>

            <div class="form-check form-switch p-3 bg-white rounded-3 border mb-2">
              <input class="form-check-input ms-0 me-2" type="checkbox" id="wiz-extra-bano" ${state.extras.bano_higienico ? 'checked' : ''}>
              <label class="form-check-label fw-semibold" for="wiz-extra-bano">
                Baño Higiénico con Agua Tibia y Cepillado (+${formatMoneda(25, moneda)})
                <span class="d-block small text-muted fw-normal">Realizado antes del Check-Out con productos hipoalergénicos.</span>
              </label>
            </div>

            <div class="form-check form-switch p-3 bg-white rounded-3 border mb-3">
              <input class="form-check-input ms-0 me-2" type="checkbox" id="wiz-extra-recojo" ${state.extras.recojo_hotel ? 'checked' : ''}>
              <label class="form-check-label fw-semibold" for="wiz-extra-recojo">
                Recojo y Retorno en Hotel / Domicilio en Cusco
                (${state.oferta?.incluye_recojo_hotel ? '<span class="text-success">Incluido Gratis en esta oferta</span>' : `+${formatMoneda(state.oferta?.tarifa_recojo_extra || 15, moneda)}`})
                <span class="d-block small text-muted fw-normal">Ideal para turistas con tour temprano a Machu Picchu o Valle Sagrado.</span>
              </label>
            </div>

            <div>
              <label class="form-label small fw-bold">Instrucciones Especiales para ${escapeHtml(state.cuidador?.nombre || 'el Cuidador')}</label>
              <textarea class="form-control" id="wiz-notas" rows="3" maxlength="350"
                placeholder="Ej. Horario de recojo en el lobby del hotel, rutina de paseo, premios permitidos...">${escapeHtml(state.notasPropietario)}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaso3() {
    const cot = state.cotizacion || {};
    const moneda = localStorage.getItem('paw_currency') || 'PEN';

    return `
      <div class="row g-4 align-items-start">
        <div class="col-lg-7">
          <div class="cotizacion-receipt-box">
            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <div>
                <span class="badge bg-warning text-dark me-1">${escapeHtml(cot.hu_ecode || state.oferta?.hu_ecode)}</span>
                <strong class="text-dark">${escapeHtml(cot.tipo_servicio || state.oferta?.tipo_servicio)}</strong>
              </div>
              <span class="badge bg-dark">${escapeHtml(cot.dias_calculados || 1)} día(s)</span>
            </div>

            <div class="cotizacion-line">
              <span>Tarifa base (${escapeHtml(cot.dias_calculados)} día(s) × ${formatMoneda(cot.tarifa_unitaria, moneda)})</span>
              <strong>${formatMoneda(cot.subtotal_base, moneda)}</strong>
            </div>

            <div class="cotizacion-line">
              <span>
                Temporada Turística Cusco
                ${cot.nombre_temporada
                  ? `<span class="badge bg-warning text-dark ms-1">${escapeHtml(cot.nombre_temporada)}</span>`
                  : '<span class="badge bg-light text-secondary border ms-1">Tarifa Estándar</span>'}
              </span>
              <strong>${Number(cot.ajuste_temporada) > 0 ? `+ ${formatMoneda(cot.ajuste_temporada, moneda)}` : formatMoneda(0, moneda)}</strong>
            </div>

            <div class="cotizacion-line">
              <span>
                Recargo Cuidado Cachorro (&lt; 1 año)
                ${cot.es_cachorro ? '<span class="badge bg-info-subtle text-info ms-1">+10% Cachorro</span>' : ''}
              </span>
              <strong>${Number(cot.recargo_cachorro) > 0 ? `+ ${formatMoneda(cot.recargo_cachorro, moneda)}` : formatMoneda(0, moneda)}</strong>
            </div>

            <div class="cotizacion-line">
              <span>Servicios adicionales (Baño / Recojo Hotel)</span>
              <strong>${Number(cot.extras_monto) > 0 ? `+ ${formatMoneda(cot.extras_monto, moneda)}` : formatMoneda(0, moneda)}</strong>
            </div>

            ${Number(cot.descuento_cupon) > 0 ? `
              <div class="cotizacion-line text-success fw-bold">
                <span><i class="bi bi-ticket-perforated-fill me-1"></i>Descuento Cupón (${escapeHtml(cot.codigo_cupon)})</span>
                <span>- ${formatMoneda(cot.descuento_cupon, moneda)}</span>
              </div>
            ` : ''}

            <div class="cotizacion-total-row">
              <div>
                <div class="small text-white-50 text-uppercase">Total Final a Pagar</div>
                <div class="fs-4 fw-bold">S/ ${Number(cot.monto_total_pen || 0).toFixed(2)} PEN</div>
              </div>
              <div class="text-end">
                <div class="small text-white-50">Equivalente Referencial</div>
                <div class="fs-5 fw-bold text-warning">$ ${Number(cot.monto_total_usd || 0).toFixed(2)} USD</div>
              </div>
            </div>

            <!-- Desglose transparente 15% Plataforma / 85% Cuidador -->
            <div class="mt-3 p-3 rounded-3 bg-light border small">
              <div class="fw-bold text-secondary mb-1">
                <i class="bi bi-pie-chart-fill text-warning me-1"></i>Transparencia Financiera Paw Patita Cusco:
              </div>
              <div class="d-flex justify-content-between">
                <span>Pago Neto al Cuidador (85% retenido en garantía hasta el Check-Out):</span>
                <strong class="text-success">S/ ${Number(cot.monto_neto_cuidador_85 || 0).toFixed(2)}</strong>
              </div>
              <div class="d-flex justify-content-between">
                <span>Comisión Plataforma, Respaldo Clínico S.O.S. 24h y Garantía (15%):</span>
                <strong class="text-dark">S/ ${Number(cot.comision_plataforma_15 || 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="p-3 bg-light rounded-3 border mb-3">
            <h6 class="fw-bold mb-2"><i class="bi bi-ticket-detailed-fill text-warning me-1"></i>¿Tienes un Cupón Promocional?</h6>
            <div class="input-group mb-2">
              <input type="text" class="form-control text-uppercase" id="wiz-input-cupon"
                value="${escapeHtml(state.codigoCupon)}" placeholder="Ej. BIENVENIDO10">
              <button class="btn btn-paw" type="button" id="wiz-btn-aplicar-cupon">Aplicar</button>
            </div>
            <div class="small text-muted">
              Cupones activos en Cusco:
              <button type="button" class="btn btn-link btn-sm p-0 me-2" data-quick-coupon="BIENVENIDO10">BIENVENIDO10</button>
              <button type="button" class="btn btn-link btn-sm p-0 me-2" data-quick-coupon="MACHUPICCHU15">MACHUPICCHU15</button>
              <button type="button" class="btn btn-link btn-sm p-0" data-quick-coupon="CUSCO20">CUSCO20</button>
            </div>
          </div>

          <div class="p-3 bg-white rounded-3 border small">
            <div class="fw-bold text-dark mb-2"><i class="bi bi-shield-check text-success me-1"></i>Política Escalonada de Cancelación v5.0</div>
            <ul class="mb-0 ps-3 text-secondary">
              <li><strong>&gt; 48 horas antes (o sin confirmar):</strong> 100% de reembolso inmediato.</li>
              <li><strong>Entre 24h y 48h antes:</strong> 70% de reembolso (30% penalidad).</li>
              <li><strong>Menos de 24h antes:</strong> 50% de reembolso (50% penalidad).</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaso4() {
    const cot = state.cotizacion || {};
    const esTarjeta = state.metodoPago === 'Tarjeta';

    return `
      <div class="row g-4">
        <div class="col-md-7">
          <div class="p-3 bg-light rounded-3 border">
            <h6 class="fw-bold mb-3"><i class="bi bi-credit-card-2-front-fill text-warning me-1"></i>1. Selecciona el Método de Pago en Garantía</h6>

            <div class="row g-2 mb-3">
              ${['Yape', 'Plin', 'Tarjeta', 'Transferencia'].map((met) => `
                <div class="col-6 col-sm-3">
                  <div class="wizard-selectable-card text-center p-2 ${state.metodoPago === met ? 'selected' : ''}"
                    data-select-metodo="${met}">
                    <i class="bi ${met === 'Tarjeta' ? 'bi-credit-card-fill' : (met === 'Transferencia' ? 'bi-bank2' : 'bi-phone-vibrate-fill')} fs-4 text-warning d-block"></i>
                    <span class="fw-bold small">${met}</span>
                  </div>
                </div>
              `).join('')}
            </div>

            ${!esTarjeta ? `
              <div class="p-3 bg-white rounded-3 border mb-3">
                <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <div class="fw-bold text-dark">Cuenta Recaudadora Escrow Paw Patita Cusco</div>
                    <div class="small text-secondary">
                      ${state.metodoPago === 'Transferencia'
                        ? 'BCP Soles: 285-00112233-0-45 (CCI: 00228500001122330451)'
                        : `Número Oficial ${state.metodoPago}: 984-000-111 (A nombre de Paw Patita Cusco S.A.C.)`}
                    </div>
                  </div>
                  <span class="badge bg-success">Monto: S/ ${Number(cot.monto_total_pen || 0).toFixed(2)}</span>
                </div>
                <div class="mt-3">
                  <label class="form-label small fw-bold">Código / Número de Operación ${escapeHtml(state.metodoPago)} *</label>
                  <input type="text" class="form-control" id="wiz-num-operacion" required
                    value="${escapeHtml(state.numOperacion)}" placeholder="Ej. YAPE-884920">
                </div>
              </div>
            ` : `
              <div class="p-3 bg-white rounded-3 border mb-3">
                <div class="row g-2">
                  <div class="col-sm-8">
                    <label class="form-label small fw-bold">Número de Tarjeta (Simulación Segura)</label>
                    <input type="text" class="form-control" value="**** **** **** ${escapeHtml(state.ultimos4)}" readonly>
                  </div>
                  <div class="col-sm-4">
                    <label class="form-label small fw-bold">Últimos 4 Dígitos *</label>
                    <input type="text" class="form-control" id="wiz-ultimos-4" maxlength="4" value="${escapeHtml(state.ultimos4)}">
                  </div>
                </div>
              </div>
            `}

            <div class="row g-2">
              <div class="col-sm-6">
                <label class="form-label small fw-bold">Tipo de Comprobante Electrónico</label>
                <select class="form-select" id="wiz-tipo-comprobante">
                  <option value="Boleta Electrónica" ${state.tipoComprobante === 'Boleta Electrónica' ? 'selected' : ''}>Boleta de Venta Electrónica</option>
                  <option value="Factura Electrónica" ${state.tipoComprobante === 'Factura Electrónica' ? 'selected' : ''}>Factura Electrónica</option>
                </select>
              </div>
              <div class="col-sm-6 d-flex align-items-end">
                <div class="form-check mb-2">
                  <input class="form-check-input" type="checkbox" id="wiz-check-tyc" ${state.aceptaTyc ? 'checked' : ''}>
                  <label class="form-check-label small fw-semibold" for="wiz-check-tyc">
                    Acepto los Términos de Custodia v5.0 y la Política Escalonada de Cancelación.
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-5">
          <div class="p-3 bg-white rounded-3 border shadow-sm">
            <h6 class="fw-bold border-bottom pb-2 mb-3">Resumen Final de tu Reserva</h6>
            <div class="small mb-2"><strong>Mascota:</strong> ${escapeHtml(state.mascota?.nombre)} (${escapeHtml(state.mascota?.paw_id)})</div>
            <div class="small mb-2"><strong>Cuidador(a):</strong> ${escapeHtml(state.cuidador?.nombre_completo)} (${escapeHtml(state.cuidador?.distrito_cusco)})</div>
            <div class="small mb-2"><strong>Servicio:</strong> ${escapeHtml(state.oferta?.tipo_servicio)} (${escapeHtml(state.oferta?.hu_ecode)})</div>
            <div class="small mb-2"><strong>Fechas:</strong> Del ${formatFechaEs(state.fechaInicio)} al ${formatFechaEs(state.fechaFin)} (${escapeHtml(cot.dias_calculados)} día(s))</div>
            <div class="small mb-3"><strong>Bloque Horario:</strong> ${escapeHtml(state.bloqueHorario)}</div>

            <div class="p-2 rounded bg-warning-subtle text-dark fw-bold d-flex justify-content-between">
              <span>Total con Garantía Escrow:</span>
              <span>S/ ${Number(cot.monto_total_pen || 0).toFixed(2)} ($ ${Number(cot.monto_total_usd || 0).toFixed(2)})</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderWizard() {
    const root = modal.el.querySelector('#wizard-reserva-root');
    const footer = modal.el.querySelector('#wizard-reserva-footer');
    if (!root || !footer) return;

    let stepContent = '';
    if (state.paso === 1) stepContent = renderPaso1();
    else if (state.paso === 2) stepContent = renderPaso2();
    else if (state.paso === 3) stepContent = renderPaso3();
    else if (state.paso === 4) stepContent = renderPaso4();

    root.innerHTML = `${renderStepperHeader()}${stepContent}`;

    footer.innerHTML = `
      <div>
        ${state.paso > 1 ? `
          <button type="button" class="btn btn-outline-secondary" id="wiz-btn-prev">
            <i class="bi bi-arrow-left me-1"></i>Paso Anterior
          </button>
        ` : `
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
        `}
      </div>
      <div>
        ${state.paso < 4 ? `
          <button type="button" class="btn btn-paw" id="wiz-btn-next">
            Continuar al Paso ${state.paso + 1} <i class="bi bi-arrow-right ms-1"></i>
          </button>
        ` : `
          <button type="button" class="btn btn-success fw-bold px-4" id="wiz-btn-confirmar">
            <i class="bi bi-shield-check me-1"></i>Confirmar Pago y Crear Reserva (S/ ${Number(state.cotizacion?.monto_total_pen || 0).toFixed(2)})
          </button>
        `}
      </div>
    `;

    bindStepEvents();
  }

  function bindStepEvents() {
    const root = modal.el;

    // Eventos Paso 1
    root.querySelector('#wiz-select-cuidador')?.addEventListener('change', (e) => {
      const found = cuidadores.find((c) => c.id_cuidador === e.target.value);
      if (found) {
        state.cuidador = found;
        state.oferta = (found.servicios_disponibles || [])[0] || null;
        renderWizard();
      }
    });

    root.querySelectorAll('[data-select-pet]').forEach((card) => {
      card.addEventListener('click', () => {
        if (card.getAttribute('data-observada') === 'true') {
          showToast('Esta mascota tiene su ficha PAW-ID observada. Actualiza su cartilla de vacunas primero.', 'warning');
          return;
        }
        const petId = card.getAttribute('data-select-pet');
        const pet = mascotasActivas.find((m) => m.id === petId);
        if (pet) {
          state.mascota = pet;
          renderWizard();
        }
      });
    });

    root.querySelectorAll('[data-select-oferta]').forEach((card) => {
      card.addEventListener('click', () => {
        const ofId = card.getAttribute('data-select-oferta');
        const of = (state.cuidador?.servicios_disponibles || []).find((s) => (s.id_oferta || s.id) === ofId);
        if (of) {
          state.oferta = of;
          renderWizard();
        }
      });
    });

    // Eventos Paso 2
    root.querySelector('#wiz-fecha-inicio')?.addEventListener('change', async (e) => {
      state.fechaInicio = e.target.value;
      if (state.fechaFin < state.fechaInicio) {
        state.fechaFin = state.fechaInicio;
      }
      await verificarDisponibilidadStep2();
      renderWizard();
    });

    root.querySelector('#wiz-fecha-fin')?.addEventListener('change', async (e) => {
      state.fechaFin = e.target.value;
      await verificarDisponibilidadStep2();
      renderWizard();
    });

    root.querySelectorAll('[data-select-bloque]').forEach((card) => {
      card.addEventListener('click', () => {
        if (card.getAttribute('data-bloqueado') === 'true') {
          showToast('Este bloque horario no tiene cupos disponibles en las fechas elegidas.', 'warning');
          return;
        }
        state.bloqueHorario = card.getAttribute('data-select-bloque');
        renderWizard();
      });
    });

    root.querySelector('#wiz-extra-bano')?.addEventListener('change', (e) => {
      state.extras.bano_higienico = e.target.checked;
    });

    root.querySelector('#wiz-extra-recojo')?.addEventListener('change', (e) => {
      state.extras.recojo_hotel = e.target.checked;
    });

    root.querySelector('#wiz-notas')?.addEventListener('input', (e) => {
      state.notasPropietario = e.target.value;
    });

    // Eventos Paso 3 (Cupones)
    root.querySelector('#wiz-btn-aplicar-cupon')?.addEventListener('click', async () => {
      state.codigoCupon = root.querySelector('#wiz-input-cupon')?.value.trim() || '';
      const ok = await ejecutarCotizacionStep3(true);
      if (ok) renderWizard();
    });

    root.querySelectorAll('[data-quick-coupon]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        state.codigoCupon = btn.getAttribute('data-quick-coupon');
        const ok = await ejecutarCotizacionStep3(true);
        if (ok) renderWizard();
      });
    });

    // Eventos Paso 4
    root.querySelectorAll('[data-select-metodo]').forEach((card) => {
      card.addEventListener('click', () => {
        state.metodoPago = card.getAttribute('data-select-metodo');
        state.numOperacion = `${state.metodoPago.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
        renderWizard();
      });
    });

    root.querySelector('#wiz-num-operacion')?.addEventListener('input', (e) => {
      state.numOperacion = e.target.value;
    });

    root.querySelector('#wiz-ultimos-4')?.addEventListener('input', (e) => {
      state.ultimos4 = e.target.value;
    });

    root.querySelector('#wiz-tipo-comprobante')?.addEventListener('change', (e) => {
      state.tipoComprobante = e.target.value;
    });

    root.querySelector('#wiz-check-tyc')?.addEventListener('change', (e) => {
      state.aceptaTyc = e.target.checked;
    });

    // Navegación Anterior / Siguiente
    root.querySelector('#wiz-btn-prev')?.addEventListener('click', () => {
      if (state.paso > 1) {
        state.paso--;
        renderWizard();
      }
    });

    root.querySelector('#wiz-btn-next')?.addEventListener('click', async () => {
      if (state.paso === 1) {
        if (!state.mascota || !state.oferta) {
          showToast('Selecciona una mascota y un servicio para continuar.', 'warning');
          return;
        }
        if (state.mascota.estado_validacion_vet === 'observado') {
          showToast('No puedes reservar con una ficha PAW-ID observada. Actualiza primero su cartilla.', 'danger');
          return;
        }
        if (state.mascota.es_cachorro && state.cuidador?.acepta_cachorros === false) {
          showToast(`El cuidador ${state.cuidador.nombre_completo} no acepta cachorros (<1 año). Elige otro cuidador.`, 'warning');
          return;
        }
        await verificarDisponibilidadStep2();
        state.paso = 2;
        renderWizard();
      } else if (state.paso === 2) {
        if (!state.fechaInicio || !state.fechaFin || state.fechaFin < state.fechaInicio) {
          showToast('Verifica que la fecha de fin sea igual o posterior a la fecha de inicio.', 'warning');
          return;
        }
        const ok = await ejecutarCotizacionStep3(false);
        if (ok) {
          state.paso = 3;
          renderWizard();
        }
      } else if (state.paso === 3) {
        state.paso = 4;
        renderWizard();
      }
    });

    // Confirmación Final Paso 4 -> rpc_crear_reserva
    root.querySelector('#wiz-btn-confirmar')?.addEventListener('click', async () => {
      if (!state.aceptaTyc) {
        showToast('Debes aceptar los Términos y Condiciones de Custodia v5.0 para confirmar.', 'warning');
        return;
      }

      showSpinner('Procesando reserva y garantía anti-overbooking (rpc_crear_reserva)...');
      try {
        const supabase = getSupabase();
        const monedaActual = localStorage.getItem('paw_currency') || 'PEN';
        const payload = {
          id_propietario: propietarioProfile?.id || '50000000-0000-0000-0000-000000000002',
          id_oferta: state.oferta.id_oferta || state.oferta.id,
          id_mascota: state.mascota.id,
          fecha_inicio: state.fechaInicio,
          fecha_fin: state.fechaFin,
          bloque_horario: state.bloqueHorario,
          extras: { ...state.extras, es_cachorro: state.mascota.es_cachorro },
          codigo_cupon: state.codigoCupon || null,
          metodo_pago: state.metodoPago,
          num_operacion: state.numOperacion || `OP-${Date.now()}`,
          ultimos_4_digitos: state.metodoPago === 'Tarjeta' ? (state.ultimos4 || '4242') : null,
          tipo_comprobante: state.tipoComprobante,
          notas_propietario: state.notasPropietario,
          moneda_referencial: monedaActual,
          acepta_tyc: true
        };

        let rpcRes = null;
        if (supabase && isSupabaseConfigured() && !String(payload.id_propietario).startsWith('mock-')) {
          const { data, error } = await supabase.rpc('rpc_crear_reserva', { p_payload: payload });
          if (error) throw error;
          rpcRes = data;
        }

        const bloqueMeta = BLOQUES_WIZARD.find((b) => b.id === state.bloqueHorario) || BLOQUES_WIZARD[0];
        const cot = state.cotizacion;
        const seqNum = Math.floor(110 + Math.random() * 880);
        const nuevaReserva = {
          id: rpcRes?.id_reserva || `90000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
          codigo_reserva: rpcRes?.codigo_reserva || `RES-2026-0${seqNum}`,
          id_propietario: payload.id_propietario,
          id_cuidador: state.cuidador.id_cuidador,
          cuidador_nombre: state.cuidador.nombre_completo,
          cuidador_distrito: state.cuidador.distrito_cusco,
          cuidador_telefono: state.cuidador.telefono || '+51 984 311 111',
          cuidador_foto: state.cuidador.foto_url,
          id_oferta: payload.id_oferta,
          hu_ecode: state.oferta.hu_ecode,
          categoria_servicio: state.oferta.categoria,
          tipo_servicio: state.oferta.tipo_servicio,
          id_mascota: state.mascota.id,
          mascota_nombre: state.mascota.nombre,
          mascota_paw_id: state.mascota.paw_id,
          mascota_foto: state.mascota.foto_url,
          fecha_inicio: state.fechaInicio,
          fecha_fin: state.fechaFin,
          bloque_horario: state.bloqueHorario,
          hora_inicio: bloqueMeta.inicio,
          hora_fin: bloqueMeta.fin,
          dias_calculados: cot.dias_calculados,
          tarifa_unitaria: cot.tarifa_unitaria,
          subtotal_base: cot.subtotal_base,
          ajuste_temporada: cot.ajuste_temporada,
          recargo_cachorro: cot.recargo_cachorro,
          descuento_cupon: cot.descuento_cupon,
          extras_detalle: state.extras,
          extras_monto: cot.extras_monto,
          monto_total: cot.monto_total_pen,
          comision_plataforma: cot.comision_plataforma_15,
          monto_neto_cuidador: cot.monto_neto_cuidador_85,
          moneda_referencial: monedaActual,
          estado_reserva: 'pendiente_confirmacion',
          metodo_pago: state.metodoPago,
          num_operacion: payload.num_operacion,
          tipo_comprobante: state.tipoComprobante,
          num_comprobante: rpcRes?.num_comprobante || `${state.tipoComprobante.startsWith('Factura') ? 'F001' : 'B001'}-000${seqNum}`,
          notas_propietario: state.notasPropietario,
          created_at: new Date().toISOString()
        };

        // Limpiar preferencia temporal del catálogo
        localStorage.removeItem('paw_reserva_cuidador_codigo');
        localStorage.removeItem('paw_reserva_cuidador_id');

        await modal.cerrarAsync();
        showToast(
          `¡Reserva ${nuevaReserva.codigo_reserva} creada en estado Pendiente de Confirmación!`,
          'success',
          'Reserva Confirmada con Garantía'
        );

        if (typeof onReservaCreada === 'function') {
          onReservaCreada(nuevaReserva);
        }

        // Mostrar automáticamente el Comprobante Electrónico Imprimible
        abrirModalComprobantePago(nuevaReserva, propietarioProfile);
      } catch (err) {
        handleSupabaseError(err, 'No se pudo completar la creación de la reserva.');
      } finally {
        hideSpinner();
      }
    });
  }

  renderWizard();
}

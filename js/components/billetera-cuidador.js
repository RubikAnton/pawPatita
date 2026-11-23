/**
 * Paw Patita Cusco v5.0 — Billetera Digital, Conciliación Exacta (85%) y Solicitud de Retiros
 * js/components/billetera-cuidador.js
 *
 * Funcionalidades:
 *  - Elimina al 100% los `undefined` del historial de liquidaciones (`codigo_liquidacion`, `monto_liquidado`,
 *    `estado_liquidacion`, `num_operacion_desembolso`, `cuenta_destino`, `tipo_concepto`)
 *  - Desglose financiero exacto desde `v_billetera_cuidador` y `liquidaciones_cuidadores`:
 *      1. Saldo en Garantía (`en_garantia` — reservas confirmadas o en curso)
 *      2. Saldo Disponible para Retiro (`disponible` — liberado automáticamente tras Check-Out)
 *      3. En Proceso de Retiro (`solicitado` — pendiente de desembolso por el Administrador)
 *      4. Total Histórico Cobrado (`pagado` — liquidaciones desembolsadas con N° operación bancaria)
 *  - Formulario de Solicitud de Retiro invocando `rpc_solicitar_retiro(p_cuenta_tipo, p_cuenta_numero)`
 *    soportando entidades financieras peruanas: `Yape`, `Plin`, `CCI`, `BCP`, `Interbank` y `BBVA`
 *  - Gráfico interactivo Chart.js de evolución de ingresos netos (85%) por mes en Cusco
 *  - Exportación del historial contable a CSV
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { formatMoneda, formatFechaEs, escapeHtml, exportarCsv } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';

const STORAGE_KEY_LIQUIDACIONES = 'paw_demo_liquidaciones_cuidador_v5';

export const ENTIDADES_BANCARIAS_PERU = [
  { id: 'Yape', nombre: 'Yape (BCP / Celular 9 dígitos)', placeholder: 'Ej. 984311111', minLen: 9 },
  { id: 'Plin', nombre: 'Plin (Interbank / BBVA / Celular 9 dígitos)', placeholder: 'Ej. 984311111', minLen: 9 },
  { id: 'BCP', nombre: 'BCP — Banco de Crédito del Perú (Cuenta Soles)', placeholder: 'Ej. 285-99182736-0-12', minLen: 10 },
  { id: 'Interbank', nombre: 'Interbank — Cuenta Simple Soles', placeholder: 'Ej. 400-3102938475', minLen: 10 },
  { id: 'BBVA', nombre: 'BBVA Perú — Cuenta Soles', placeholder: 'Ej. 0011-0200-0299182736', minLen: 10 },
  { id: 'CCI', nombre: 'CCI — Código de Cuenta Interbancario (20 dígitos)', placeholder: 'Ej. 00228519283746500112', minLen: 20 }
];

// Semilla inicial sincronizada con supabase/06_seed.sql + 1 saldo disponible listo para probar retiro E2E
export const LIQUIDACIONES_SEED_CUIDADOR = [
  {
    id: '92000000-0000-0000-0000-000000000002',
    codigo_liquidacion: 'LIQ-2026-0102',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    mascota_nombre: 'Inti (PAW-6858)',
    propietario_nombre: 'Lucía Mendoza Vargas',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Familiar Premium 24h',
    monto_bruto_reserva: 145.00,
    comision_plataforma: 21.75,
    monto_liquidado: 123.25,
    estado_liquidacion: 'en_garantia',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: null,
    motivo_rechazo: null,
    fecha_disponible: null,
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '92000000-0000-0000-0000-000000000003',
    codigo_liquidacion: 'LIQ-2026-0103',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000003',
    codigo_reserva: 'RES-2026-0103',
    mascota_nombre: 'Chaska (PAW-1003)',
    propietario_nombre: 'Martin Dupont',
    tipo_concepto: 'Servicio de Custodia (85%) — Guardería de Día en Magisterio',
    monto_bruto_reserva: 80.00,
    comision_plataforma: 12.00,
    monto_liquidado: 68.00,
    estado_liquidacion: 'en_garantia',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: null,
    motivo_rechazo: null,
    fecha_disponible: null,
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '92000000-0000-0000-0000-000000000010',
    codigo_liquidacion: 'LIQ-2026-0110',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000010',
    codigo_reserva: 'RES-2026-0100',
    mascota_nombre: 'Inti (PAW-6858)',
    propietario_nombre: 'Lucía Mendoza Vargas',
    tipo_concepto: 'Servicio de Custodia (85%) — Guardería de Día Finalizada',
    monto_bruto_reserva: 100.00,
    comision_plataforma: 15.00,
    monto_liquidado: 85.00,
    estado_liquidacion: 'disponible',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: null,
    motivo_rechazo: null,
    fecha_disponible: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    fecha_solicitud_retiro: null,
    fecha_liquidacion: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '92000000-0000-0000-0000-000000000001',
    codigo_liquidacion: 'LIQ-2026-0101',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    mascota_nombre: 'Inti (PAW-6858)',
    propietario_nombre: 'Lucía Mendoza Vargas',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Familiar 3 días',
    monto_bruto_reserva: 180.00,
    comision_plataforma: 27.00,
    monto_liquidado: 153.00,
    estado_liquidacion: 'pagado',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: 'OP-BCP-774120',
    motivo_rechazo: null,
    fecha_disponible: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    fecha_solicitud_retiro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    fecha_liquidacion: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '92000000-0000-0000-0000-000000000009',
    codigo_liquidacion: 'LIQ-2026-0098',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000009',
    codigo_reserva: 'RES-2026-0098',
    mascota_nombre: 'Chaska (PAW-1003)',
    propietario_nombre: 'Martin Dupont',
    tipo_concepto: 'Servicio de Custodia (85%) — Hospedaje Familiar 4 días',
    monto_bruto_reserva: 240.00,
    comision_plataforma: 36.00,
    monto_liquidado: 204.00,
    estado_liquidacion: 'pagado',
    metodo_desembolso: 'Yape',
    cuenta_destino: 'Yape: 984311111',
    num_operacion_desembolso: 'OP-BCP-651094',
    motivo_rechazo: null,
    fecha_disponible: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    fecha_solicitud_retiro: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
    fecha_liquidacion: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let chartIngresosCuidadorInstance = null;

export function getLocalLiquidacionesCuidador() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIQUIDACIONES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizarLiquidacion);
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_LIQUIDACIONES, JSON.stringify(LIQUIDACIONES_SEED_CUIDADOR));
  return LIQUIDACIONES_SEED_CUIDADOR.map(normalizarLiquidacion);
}

export function saveLocalLiquidacionesCuidador(list) {
  try {
    localStorage.setItem(STORAGE_KEY_LIQUIDACIONES, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Normaliza un registro de `liquidaciones_cuidadores` garantizando 0 `undefined`
 */
export function normalizarLiquidacion(l) {
  const montoNeto = Number(l.monto_liquidado ?? l.monto ?? 0);
  const montoBruto = Number(l.monto_bruto_reserva ?? l.reservas?.monto_total ?? (montoNeto / 0.85).toFixed(2));
  const comision15 = Number(l.comision_plataforma ?? (montoBruto - montoNeto).toFixed(2));
  const estado = (l.estado_liquidacion || l.estado || 'en_garantia').toLowerCase();

  const mascotaNom = l.mascota_nombre
    || (l.reservas?.mascotas ? `${l.reservas.mascotas.nombre} (${l.reservas.mascotas.paw_id})` : 'Mascota en Custodia');

  return {
    id: l.id || `liq-${Date.now()}`,
    codigo_liquidacion: l.codigo_liquidacion || l.id_liquidacion || 'LIQ-2026-0100',
    id_cuidador: l.id_cuidador || '60000000-0000-0000-0000-000000000001',
    id_reserva: l.id_reserva || '',
    codigo_reserva: l.codigo_reserva || l.reservas?.codigo_reserva || 'RES-2026-0100',
    mascota_nombre: mascotaNom,
    tipo_concepto: l.tipo_concepto || 'Servicio de Custodia (85%)',
    monto_bruto_reserva: montoBruto,
    comision_plataforma: comision15,
    monto_liquidado: montoNeto,
    estado_liquidacion: estado,
    metodo_desembolso: l.metodo_desembolso || 'Yape',
    cuenta_destino: l.cuenta_destino || 'Yape: 984311111',
    num_operacion_desembolso: l.num_operacion_desembolso || l.numero_operacion_pago || l.operacion || null,
    motivo_rechazo: l.motivo_rechazo || null,
    fecha_disponible: l.fecha_disponible || null,
    fecha_solicitud_retiro: l.fecha_solicitud_retiro || null,
    fecha_liquidacion: l.fecha_liquidacion || null,
    created_at: l.created_at || new Date().toISOString()
  };
}

/**
 * Calcula los 4 saldos conciliados a partir de la lista de liquidaciones (idéntico a `v_billetera_cuidador`)
 */
export function calcularResumenBilletera(liquidaciones = []) {
  const lista = (liquidaciones || []).map(normalizarLiquidacion);

  const sumByEstado = (est) => Number(
    lista
      .filter((item) => item.estado_liquidacion === est)
      .reduce((acc, item) => acc + Number(item.monto_liquidado || 0), 0)
      .toFixed(2)
  );

  const countByEstado = (est) => lista.filter((item) => item.estado_liquidacion === est).length;

  return {
    saldo_en_garantia: sumByEstado('en_garantia'),
    saldo_disponible_retiro: sumByEstado('disponible'),
    saldo_en_proceso_retiro: sumByEstado('solicitado'),
    total_historico_cobrado: sumByEstado('pagado'),
    items_en_garantia: countByEstado('en_garantia'),
    items_disponibles: countByEstado('disponible'),
    items_solicitados: countByEstado('solicitado'),
    items_pagados: countByEstado('pagado')
  };
}

/**
 * Sincroniza en la billetera local el cambio de estado cuando una reserva hace Check-Out o se Rechaza
 */
export function sincronizarLiquidacionPorReservaLocal(idReserva, nuevoEstadoLiquidacion, datosReserva = {}) {
  const lista = getLocalLiquidacionesCuidador();
  const idx = lista.findIndex((l) => l.id_reserva === idReserva || l.codigo_reserva === datosReserva.codigo_reserva);
  const ahoraIso = new Date().toISOString();

  if (idx >= 0) {
    lista[idx] = normalizarLiquidacion({
      ...lista[idx],
      estado_liquidacion: nuevoEstadoLiquidacion,
      fecha_disponible: nuevoEstadoLiquidacion === 'disponible' ? ahoraIso : lista[idx].fecha_disponible,
      motivo_rechazo: nuevoEstadoLiquidacion === 'anulado'
        ? (datosReserva.motivo_rechazo || 'Reserva rechazada con reembolso 100% al propietario')
        : lista[idx].motivo_rechazo
    });
  } else if (nuevoEstadoLiquidacion === 'disponible' && datosReserva.monto_neto_cuidador) {
    lista.unshift(normalizarLiquidacion({
      id: `92000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
      codigo_liquidacion: `LIQ-2026-0${Math.floor(115 + Math.random() * 800)}`,
      id_cuidador: datosReserva.id_cuidador || '60000000-0000-0000-0000-000000000001',
      id_reserva: idReserva,
      codigo_reserva: datosReserva.codigo_reserva || 'RES-2026',
      mascota_nombre: `${datosReserva.mascota_nombre || 'Mascota'} (${datosReserva.mascota_paw_id || 'PAW-ID'})`,
      tipo_concepto: 'Servicio de Custodia (85%) — Liberado en Check-Out',
      monto_bruto_reserva: datosReserva.monto_total || 120,
      comision_plataforma: datosReserva.comision_plataforma || 18,
      monto_liquidado: datosReserva.monto_neto_cuidador,
      estado_liquidacion: 'disponible',
      fecha_disponible: ahoraIso,
      created_at: ahoraIso
    }));
  }

  saveLocalLiquidacionesCuidador(lista);
  return lista;
}

/**
 * Obtiene el resumen de `v_billetera_cuidador` y el historial de `liquidaciones_cuidadores`
 */
export async function obtenerDatosBilleteraCuidador(idCuidador) {
  const supabase = getSupabase();
  let liquidaciones = null;
  let resumenVista = null;

  if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
    try {
      const [resView, resLiq] = await Promise.all([
        supabase.from('v_billetera_cuidador').select('*').eq('id_cuidador', idCuidador).maybeSingle(),
        supabase
          .from('liquidaciones_cuidadores')
          .select('*, reservas(codigo_reserva, monto_total, mascotas(nombre, paw_id))')
          .eq('id_cuidador', idCuidador)
          .order('created_at', { ascending: false })
      ]);

      if (!resLiq.error && Array.isArray(resLiq.data)) {
        liquidaciones = resLiq.data.map(normalizarLiquidacion);
        saveLocalLiquidacionesCuidador(liquidaciones);
      }
      if (!resView.error && resView.data) {
        resumenVista = resView.data;
      }
    } catch (err) {
      console.warn('Error al consultar billetera del cuidador:', err);
    }
  }

  if (liquidaciones === null) {
    liquidaciones = getLocalLiquidacionesCuidador();
  }

  const resumenCalculado = calcularResumenBilletera(liquidaciones);
  const resumenFinal = {
    saldo_en_garantia: Number(resumenVista?.saldo_en_garantia ?? resumenCalculado.saldo_en_garantia),
    saldo_disponible_retiro: Number(resumenVista?.saldo_disponible_retiro ?? resumenCalculado.saldo_disponible_retiro),
    saldo_en_proceso_retiro: Number(resumenVista?.saldo_en_proceso_retiro ?? resumenCalculado.saldo_en_proceso_retiro),
    total_historico_cobrado: Number(resumenVista?.total_historico_cobrado ?? resumenCalculado.total_historico_cobrado),
    items_en_garantia: resumenCalculado.items_en_garantia,
    items_disponibles: Number(resumenVista?.items_disponibles ?? resumenCalculado.items_disponibles),
    items_solicitados: Number(resumenVista?.items_solicitados ?? resumenCalculado.items_solicitados),
    items_pagados: Number(resumenVista?.items_pagados ?? resumenCalculado.items_pagados)
  };

  return {
    resumen: resumenFinal,
    liquidaciones
  };
}

/**
 * Renderiza el badge visual para cada estado canónico de liquidación
 */
export function renderBadgeEstadoLiquidacion(estado) {
  const est = (estado || 'en_garantia').toLowerCase();
  const map = {
    en_garantia: {
      cls: 'bg-warning-subtle text-dark border border-warning-subtle',
      icon: 'bi-shield-lock-fill text-warning',
      txt: 'Pago Protegido en Garantía'
    },
    disponible: {
      cls: 'bg-success-subtle text-success border border-success-subtle',
      icon: 'bi-unlock-fill text-success',
      txt: 'Disponible para Retiro'
    },
    solicitado: {
      cls: 'bg-info-subtle text-primary border border-info-subtle',
      icon: 'bi-hourglass-split text-primary',
      txt: 'Retiro Solicitado'
    },
    pagado: {
      cls: 'bg-success text-white',
      icon: 'bi-patch-check-fill',
      txt: 'Pagado / Desembolsado'
    },
    rechazado: {
      cls: 'bg-danger-subtle text-danger border border-danger-subtle',
      icon: 'bi-exclamation-triangle-fill',
      txt: 'Observado'
    },
    anulado: {
      cls: 'bg-secondary-subtle text-secondary border',
      icon: 'bi-x-circle-fill',
      txt: 'Anulado (Reembolso)'
    }
  };
  const cfg = map[est] || map.en_garantia;
  return `<span class="badge ${cfg.cls} px-2 py-1"><i class="bi ${cfg.icon} me-1"></i>${cfg.txt}</span>`;
}

/**
 * Abre el Modal de Solicitud de Retiro Bancario (`rpc_solicitar_retiro`)
 */
export function abrirModalSolicitarRetiro({
  resumenBilletera,
  cuentaTipoDefault = 'Yape',
  cuentaNumeroDefault = '984311111',
  onRetiroSolicitado = null
}) {
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const disponible = Number(resumenBilletera?.saldo_disponible_retiro || 0);
  const itemsDisp = Number(resumenBilletera?.items_disponibles || 0);

  if (disponible <= 0 || itemsDisp === 0) {
    showToast(
      'No tienes saldo en estado Disponible para retirar. Completa el Check-Out de tus reservas en curso para liberar fondos en garantía.',
      'warning',
      'Sin Saldo Disponible'
    );
    return;
  }

  const cuerpoHtml = `
    <div class="p-3 rounded-3 bg-success-subtle border border-success-subtle d-flex justify-content-between align-items-center mb-3">
      <div>
        <div class="small fw-bold text-success text-uppercase">Monto Neto Disponible a Desembolsar (85%)</div>
        <div class="small text-secondary">Correspondiente a ${itemsDisp} servicio(s) finalizado(s) con Check-Out conforme</div>
      </div>
      <div class="fs-3 fw-bold text-success">${formatMoneda(disponible, moneda)}</div>
    </div>

    <form id="form-solicitar-retiro-rpc" novalidate>
      <div class="mb-3">
        <label class="form-label small fw-bold">Entidad Financiera o Billetera Móvil en Perú *</label>
        <select class="form-select" id="retiro-select-banco" required>
          ${ENTIDADES_BANCARIAS_PERU.map((b) => `
            <option value="${escapeHtml(b.id)}" ${b.id === cuentaTipoDefault ? 'selected' : ''}>
              ${escapeHtml(b.nombre)}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label small fw-bold" id="retiro-label-cuenta">
          Número de Cuenta / CCI / Celular Yape-Plin *
        </label>
        <input type="text" class="form-control font-monospace" id="retiro-input-numero"
          required minlength="6" maxlength="28"
          value="${escapeHtml(cuentaNumeroDefault)}"
          placeholder="Ingresa tu número de cuenta o celular afiliado">
        <div class="form-text small">
          El Administrador de Paw Patita Cusco verificará la titularidad y registrará el N° de operación bancaria al transferir.
        </div>
      </div>

      <div class="p-3 bg-light rounded-3 border small">
        <div class="d-flex justify-content-between py-1 border-bottom">
          <span>Comisión de transferencia Paw Patita:</span>
          <strong class="text-success">S/ 0.00 (Sin costo adicional)</strong>
        </div>
        <div class="d-flex justify-content-between py-1">
          <span>Plazo máximo de abono bancario:</span>
          <strong>Inmediato / Máx. 24 horas hábiles</strong>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold" id="btn-confirmar-retiro-rpc">
      <i class="bi bi-bank2 me-1"></i>Solicitar Desembolso de ${formatMoneda(disponible, moneda)}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: 'Solicitar Liquidación y Retiro de Fondos',
    icono: 'bi-wallet2',
    cuerpoHtml,
    footerHtml
  });

  const selectBanco = modal.el.querySelector('#retiro-select-banco');
  const inputNumero = modal.el.querySelector('#retiro-input-numero');
  selectBanco?.addEventListener('change', () => {
    const info = ENTIDADES_BANCARIAS_PERU.find((b) => b.id === selectBanco.value);
    if (info && inputNumero) {
      inputNumero.placeholder = info.placeholder;
    }
  });

  modal.el.querySelector('#btn-confirmar-retiro-rpc')?.addEventListener('click', async () => {
    const cuentaTipo = selectBanco.value;
    const cuentaNumero = inputNumero.value.trim();

    if (cuentaNumero.length < 6) {
      showToast('Por favor ingresa un número de cuenta, CCI o celular válido (mínimo 6 dígitos).', 'warning');
      return;
    }

    showSpinner('Enviando solicitud de retiro bancario...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured()) {
        const { error } = await supabase.rpc('rpc_solicitar_retiro', {
          p_cuenta_tipo: cuentaTipo,
          p_cuenta_numero: cuentaNumero
        });
        if (error) throw error;
      }

      const ahoraIso = new Date().toISOString();
      const actualizadas = getLocalLiquidacionesCuidador().map((item) => {
        if (item.estado_liquidacion === 'disponible') {
          return normalizarLiquidacion({
            ...item,
            estado_liquidacion: 'solicitado',
            metodo_desembolso: cuentaTipo,
            cuenta_destino: `${cuentaTipo}: ${cuentaNumero}`,
            fecha_solicitud_retiro: ahoraIso
          });
        }
        return item;
      });
      saveLocalLiquidacionesCuidador(actualizadas);

      await modal.cerrarAsync();
      showToast(
        `Solicitud de retiro por ${formatMoneda(disponible, moneda)} enviada a ${cuentaTipo}: ${cuentaNumero}.`,
        'success',
        'Retiro Solicitado'
      );

      if (typeof onRetiroSolicitado === 'function') {
        onRetiroSolicitado({
          cuenta_tipo: cuentaTipo,
          cuenta_numero: cuentaNumero,
          liquidaciones: actualizadas,
          resumen: calcularResumenBilletera(actualizadas)
        });
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo procesar la solicitud de retiro.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Inicializa o actualiza el gráfico Chart.js calculando dinámicamente la serie mensual desde liquidaciones reales
 */
function renderChartIngresosMensuales(canvasEl, liquidaciones = []) {
  if (!canvasEl || typeof window.Chart === 'undefined') return;

  if (chartIngresosCuidadorInstance) {
    chartIngresosCuidadorInstance.destroy();
    chartIngresosCuidadorInstance = null;
  }

  const nombresMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const hoy = new Date();
  const buckets = [];
  const mapIndex = new Map();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${nombresMes[d.getMonth()]} ${d.getFullYear()}`;
    mapIndex.set(key, buckets.length);
    buckets.push({ key, label, cobrado: 0, enCustodia: 0 });
  }

  (liquidaciones || []).forEach((item) => {
    const rawDate = item.fecha_liquidacion || item.fecha_solicitud_retiro || item.fecha_disponible || item.created_at;
    const d = rawDate ? new Date(rawDate) : hoy;
    const validDate = isNaN(d.getTime()) ? hoy : d;
    const key = `${validDate.getFullYear()}-${String(validDate.getMonth() + 1).padStart(2, '0')}`;
    const idx = mapIndex.has(key) ? mapIndex.get(key) : buckets.length - 1;
    const monto = Number(item.monto_liquidado || 0);
    const est = (item.estado_liquidacion || 'en_garantia').toLowerCase();

    if (est === 'pagado') {
      buckets[idx].cobrado = Number((buckets[idx].cobrado + monto).toFixed(2));
    } else if (['disponible', 'en_garantia', 'solicitado'].includes(est)) {
      buckets[idx].enCustodia = Number((buckets[idx].enCustodia + monto).toFixed(2));
    }
  });

  const ctx = canvasEl.getContext('2d');
  chartIngresosCuidadorInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: 'Neto Cobrado (85% Pagado) S/',
          data: buckets.map((b) => b.cobrado),
          backgroundColor: 'rgba(30, 86, 49, 0.85)',
          borderColor: '#1E5631',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Disponible + En Garantía S/',
          data: buckets.map((b) => b.enCustodia),
          backgroundColor: 'rgba(232, 93, 36, 0.85)',
          borderColor: '#E85D24',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 14, font: { size: 11, family: 'Inter, sans-serif' } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `S/ ${val}`
          }
        }
      }
    }
  });
}

/**
 * Renderizador Principal de la Sección 3: Billetera Digital y Liquidaciones Exactas
 */
export function renderSeccionBilleteraCuidador(container, {
  cuidadorProfile = {},
  resumen = {},
  liquidaciones = [],
  filtroEstado = 'todos',
  onBilleteraActualizada = null
} = {}) {
  if (!container) return;

  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const listaNormalizada = (liquidaciones || []).map(normalizarLiquidacion);
  const metricas = {
    ...calcularResumenBilletera(listaNormalizada),
    ...(resumen || {})
  };

  const filtradas = filtroEstado === 'todos'
    ? listaNormalizada
    : listaNormalizada.filter((l) => l.estado_liquidacion === filtroEstado);

  const cuentaTipoActual = cuidadorProfile.cuenta_cobro_tipo || 'Yape';
  const cuentaNumActual = cuidadorProfile.cuenta_cobro_numero || '984311111';

  container.innerHTML = `
    <!-- Banner Superior de Billetera y Cuenta de Cobro -->
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-warning text-dark fw-bold mb-1">CONCILIACIÓN ESCROW EXACTA (85% CUIDADOR / 15% PLATAFORMA)</span>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-wallet2 text-warning me-2"></i>Billetera Digital y Liquidaciones Bancarias
          </h5>
          <p class="text-secondary small mb-0">
            Tus fondos pasan automáticamente de <strong>Saldo en Garantía</strong> a <strong>Disponible para Retiro</strong> en cuanto completas el Check-Out del servicio.
          </p>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="px-3 py-2 bg-light rounded-3 border small">
            <div class="text-muted" style="font-size:0.7rem;">CUENTA PREFERIDA DE DESEMBOLSO</div>
            <div class="fw-bold text-dark">
              <i class="bi bi-bank me-1 text-primary"></i>${escapeHtml(cuentaTipoActual)}: <span class="font-monospace">${escapeHtml(cuentaNumActual)}</span>
            </div>
          </div>
          <button type="button" class="btn btn-paw fw-bold px-3 py-2" id="btn-abrir-solicitar-retiro"
            ${metricas.saldo_disponible_retiro <= 0 ? 'title="Completa un Check-Out para liberar saldo"' : ''}>
            <i class="bi bi-cash-coin me-1"></i>Solicitar Retiro (${formatMoneda(metricas.saldo_disponible_retiro, moneda)})
          </button>
        </div>
      </div>

      <!-- 4 Tarjetas Financieras Exactas desde v_billetera_cuidador -->
      <div class="row g-3">
        <div class="col-md-6 col-xl-3">
          <div class="wallet-balance-card wallet-card-garantia h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="small fw-bold text-uppercase text-secondary">1. Saldo en Garantía</span>
              <span class="badge bg-warning text-dark">${metricas.items_en_garantia} reserva(s)</span>
            </div>
            <div class="fs-3 fw-bold text-dark mb-1">${formatMoneda(metricas.saldo_en_garantia, moneda)}</div>
            <div class="small text-secondary">
              <i class="bi bi-shield-lock me-1"></i>Custodia en curso o confirmada (se libera al hacer Check-Out).
            </div>
          </div>
        </div>

        <div class="col-md-6 col-xl-3">
          <div class="wallet-balance-card wallet-card-disponible h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="small fw-bold text-uppercase text-success">2. Disponible para Retiro</span>
              <span class="badge bg-success">${metricas.items_disponibles} listo(s)</span>
            </div>
            <div class="fs-3 fw-bold text-success mb-1">${formatMoneda(metricas.saldo_disponible_retiro, moneda)}</div>
            <div class="small text-secondary">
              <i class="bi bi-check2-circle me-1"></i>Servicios finalizados listos para transferir a tu banco o Yape/Plin.
            </div>
          </div>
        </div>

        <div class="col-md-6 col-xl-3">
          <div class="wallet-balance-card wallet-card-proceso h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="small fw-bold text-uppercase text-primary">3. En Proceso de Retiro</span>
              <span class="badge bg-primary">${metricas.items_solicitados} en trámite</span>
            </div>
            <div class="fs-3 fw-bold text-primary mb-1">${formatMoneda(metricas.saldo_en_proceso_retiro, moneda)}</div>
            <div class="small text-secondary">
              <i class="bi bi-hourglass-split me-1"></i>Solicitudes enviadas pendientes de N° operación del Admin.
            </div>
          </div>
        </div>

        <div class="col-md-6 col-xl-3">
          <div class="wallet-balance-card wallet-card-cobrado h-100">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="small fw-bold text-uppercase text-white-50">4. Total Histórico Cobrado</span>
              <span class="badge bg-warning text-dark">${metricas.items_pagados} pagado(s)</span>
            </div>
            <div class="fs-3 fw-bold text-white mb-1">${formatMoneda(metricas.total_historico_cobrado, moneda)}</div>
            <div class="small text-white-50">
              <i class="bi bi-patch-check-fill text-warning me-1"></i>Abonado con comprobante bancario verificado.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico Chart.js de Ingresos Mensuales + Resumen de Regla 85%/15% -->
    <div class="row g-4 mb-4">
      <div class="col-lg-8">
        <div class="card card-paw p-4 border-0 shadow-sm h-100">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="fw-bold mb-0">
              <i class="bi bi-bar-chart-line-fill text-warning me-2"></i>Evolución de Ingresos Netos Mensuales (85% Cuidador)
            </h6>
            <span class="badge bg-light text-dark border">Cusco 2026</span>
          </div>
          <div style="height: 230px; position: relative;">
            <canvas id="chart-billetera-cuidador"></canvas>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card card-paw p-4 border-0 shadow-sm h-100 d-flex flex-column justify-content-between">
          <div>
            <h6 class="fw-bold mb-2">
              <i class="bi bi-bank2 text-success me-2"></i>Entidades Soportadas en Perú
            </h6>
            <p class="small text-secondary mb-3">
              En Paw Patita Cusco v5.0 puedes retirar tus ganancias sin comisiones ocultas hacia:
            </p>
            <div class="d-flex flex-wrap gap-2 mb-3">
              ${ENTIDADES_BANCARIAS_PERU.map((b) => `
                <span class="badge bg-light text-dark border px-2 py-1">
                  <i class="bi bi-check-circle-fill text-success me-1"></i>${escapeHtml(b.id)}
                </span>
              `).join('')}
            </div>
          </div>

          <div class="p-3 rounded-3 bg-light border small">
            <div class="fw-bold text-dark mb-1"><i class="bi bi-info-circle-fill text-warning me-1"></i>¿Cómo se libera mi saldo?</div>
            <div class="text-secondary">
              1. El dueño paga el 100% al reservar (queda en <strong>Garantía</strong>).<br>
              2. Al finalizar el servicio y registrar el <strong>Check-Out</strong>, tu 85% pasa al instante a <strong>Disponible</strong>.<br>
              3. Solicitas el retiro y el Admin registra el <strong>N° de operación bancaria</strong> pasando a <strong>Pagado</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla Completa de Historial de Liquidaciones (0 undefined) -->
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h6 class="fw-bold mb-0">
            <i class="bi bi-receipt-cutoff text-warning me-2"></i>Historial Detallado de Liquidaciones y Desembolsos (${filtradas.length})
          </h6>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <select class="form-select form-select-sm" id="billetera-filtro-estado" style="min-width: 190px;">
            <option value="todos" ${filtroEstado === 'todos' ? 'selected' : ''}>Todos los estados (${listaNormalizada.length})</option>
            <option value="en_garantia" ${filtroEstado === 'en_garantia' ? 'selected' : ''}>En Garantía (${metricas.items_en_garantia})</option>
            <option value="disponible" ${filtroEstado === 'disponible' ? 'selected' : ''}>Disponible para Retiro (${metricas.items_disponibles})</option>
            <option value="solicitado" ${filtroEstado === 'solicitado' ? 'selected' : ''}>En Proceso / Solicitado (${metricas.items_solicitados})</option>
            <option value="pagado" ${filtroEstado === 'pagado' ? 'selected' : ''}>Pagados (${metricas.items_pagados})</option>
          </select>

          <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-exportar-liquidaciones-csv">
            <i class="bi bi-file-earmark-spreadsheet me-1"></i>Exportar CSV
          </button>
        </div>
      </div>

      ${filtradas.length === 0 ? `
        <div class="text-center py-5 bg-light rounded-3 border">
          <i class="bi bi-wallet text-warning fs-1 d-block mb-2"></i>
          <h6 class="fw-bold">No hay movimientos para el filtro seleccionado</h6>
          <p class="text-secondary small mb-0">Tus liquidaciones por reserva aparecerán aquí automáticamente.</p>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th>Código Liquidación</th>
                <th>Reserva / Mascota</th>
                <th>Concepto</th>
                <th class="text-end">Bruto (100%)</th>
                <th class="text-end">Comisión (15%)</th>
                <th class="text-end">Tu Neto (85%)</th>
                <th>Cuenta Destino</th>
                <th>N° Operación Pago</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filtradas.map((item) => `
                <tr>
                  <td class="fw-bold font-monospace text-dark">
                    ${escapeHtml(item.codigo_liquidacion)}
                    <div class="text-muted fw-normal" style="font-size:0.72rem;">
                      ${formatFechaEs(item.fecha_liquidacion || item.fecha_solicitud_retiro || item.fecha_disponible || item.created_at)}
                    </div>
                  </td>
                  <td>
                    <span class="badge bg-dark">${escapeHtml(item.codigo_reserva)}</span>
                    <div class="text-secondary">${escapeHtml(item.mascota_nombre)}</div>
                  </td>
                  <td>
                    <div class="fw-semibold text-dark">${escapeHtml(item.tipo_concepto)}</div>
                    ${item.motivo_rechazo ? `<div class="text-danger" style="font-size:0.73rem;">Nota: ${escapeHtml(item.motivo_rechazo)}</div>` : ''}
                  </td>
                  <td class="text-end text-secondary">${formatMoneda(item.monto_bruto_reserva, moneda)}</td>
                  <td class="text-end text-muted">-${formatMoneda(item.comision_plataforma, moneda)}</td>
                  <td class="text-end fw-bold text-success fs-6">${formatMoneda(item.monto_liquidado, moneda)}</td>
                  <td>
                    <span class="badge bg-light text-dark border font-monospace">${escapeHtml(item.cuenta_destino)}</span>
                  </td>
                  <td class="font-monospace">
                    ${item.num_operacion_desembolso
                      ? `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check2-all me-1"></i>${escapeHtml(item.num_operacion_desembolso)}</span>`
                      : `<span class="text-muted">${item.estado_liquidacion === 'solicitado' ? 'En validación Admin' : '—'}</span>`}
                  </td>
                  <td>${renderBadgeEstadoLiquidacion(item.estado_liquidacion)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  // Renderizar gráfico Chart.js
  const canvasEl = container.querySelector('#chart-billetera-cuidador');
  renderChartIngresosMensuales(canvasEl, listaNormalizada);

  // Evento: Filtrar por estado
  container.querySelector('#billetera-filtro-estado')?.addEventListener('change', (e) => {
    renderSeccionBilleteraCuidador(container, {
      cuidadorProfile,
      resumen: metricas,
      liquidaciones: listaNormalizada,
      filtroEstado: e.target.value,
      onBilleteraActualizada
    });
  });

    // Evento: Exportar CSV
  container.querySelector('#btn-exportar-liquidaciones-csv')?.addEventListener('click', () => {
    const rowsCsv = filtradas.map((l) => ({
      codigo_liquidacion: l.codigo_liquidacion,
      codigo_reserva: l.codigo_reserva,
      mascota: l.mascota_nombre,
      concepto: l.tipo_concepto,
      monto_bruto_pen: l.monto_bruto_reserva,
      comision_15_pen: l.comision_plataforma,
      monto_neto_85_pen: l.monto_liquidado,
      estado: l.estado_liquidacion,
      cuenta_destino: l.cuenta_destino,
      num_operacion_bancaria: l.num_operacion_desembolso || 'Pendiente',
      fecha: l.fecha_liquidacion || l.created_at
    }));
    exportarCsv(rowsCsv, 'billetera_liquidaciones_cuidador_cusco.csv');
    showToast('Reporte contable de billetera exportado a CSV.', 'info');
  });

  // Evento: Abrir Modal Solicitar Retiro
  container.querySelector('#btn-abrir-solicitar-retiro')?.addEventListener('click', () => {
    abrirModalSolicitarRetiro({
      resumenBilletera: metricas,
      cuentaTipoDefault: cuentaTipoActual,
      cuentaNumeroDefault: cuentaNumActual,
      onRetiroSolicitado: (resultado) => {
        cuidadorProfile.cuenta_cobro_tipo = resultado.cuenta_tipo;
        cuidadorProfile.cuenta_cobro_numero = resultado.cuenta_numero;
        if (typeof onBilleteraActualizada === 'function') {
          onBilleteraActualizada(resultado);
        } else {
          renderSeccionBilleteraCuidador(container, {
            cuidadorProfile,
            resumen: resultado.resumen,
            liquidaciones: resultado.liquidaciones,
            filtroEstado,
            onBilleteraActualizada
          });
        }
      }
    });
  });
}

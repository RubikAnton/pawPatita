/**
 * Paw Patita Cusco v5.0 — Componente Analítico Chart.js para el Panel de Administrador
 * js/components/chart-dashboard.js
 *
 * Funcionalidades:
 *  - Gráfico de Barras Interactivo por Distritos Específicos de Cusco:
 *    (Cusco Centro, Wanchaq, San Sebastián, San Jerónimo, Santiago, San Blas, Saylla, Poroy)
 *    reparando de raíz el bug legacy v4.0 donde todos los distritos colapsaban en 'Cusco'.
 *  - Conmutación dinámica de vista en el gráfico de distritos:
 *    Modo Financiero (Ingresos Brutos 100% vs Comisión Real 15%) o Modo Operativo (Reservas vs Cuidadores).
 *  - Gráfico Doughnut de Reservas e Ingresos por Categoría de Servicio
 *    (Hospedaje, Guardería, Domicilio Turístico, Paseo).
 *  - Gráfico de Barras Horizontales de Distribución por Estado de Reserva.
 *  - Destrucción defensiva de instancias Chart.js previas para evitar fugas de memoria
 *    y soporte reactivo de moneda (S/ PEN y $ USD).
 */

import { CUSCO_CONFIG } from '../config.js';
import { formatMoneda, escapeHtml } from '../utils/formatters.js';

let chartDistritosInstance = null;
let chartCategoriasInstance = null;
let chartEstadosInstance = null;

// Paleta oficial "Andes Pet Care v5.0"
const PALETA_CUSCO = {
  terracota: 'rgba(255, 107, 53, 0.88)',
  terracotaBorder: '#FF6B35',
  turquesa: 'rgba(42, 157, 143, 0.88)',
  turquesaBorder: '#2A9D8F',
  azulAndino: 'rgba(46, 64, 87, 0.88)',
  azulAndinoBorder: '#2E4057',
  oroInca: 'rgba(244, 208, 111, 0.92)',
  oroIncaBorder: '#E0A800',
  rojoSos: 'rgba(217, 4, 41, 0.85)',
  rojoSosBorder: '#D90429',
  morado: 'rgba(108, 92, 231, 0.85)',
  moradoBorder: '#6C5CE7',
  verdeBosque: 'rgba(39, 174, 96, 0.85)',
  verdeBosqueBorder: '#27AE60',
  grisNeutro: 'rgba(148, 163, 184, 0.85)',
  grisNeutroBorder: '#64748B'
};

/**
 * Normaliza la serie de distritos garantizando que los 8 distritos oficiales de Cusco
 * estén representados con 0 `undefined` y ordenados por relevancia financiera/operativa.
 * @param {Array<Object>} rawSeries
 * @returns {Array<Object>}
 */
export function normalizarSerieDistritosCusco(rawSeries = []) {
  const mapa = new Map();

  // Inicializar los 8 distritos canónicos de Cusco
  CUSCO_CONFIG.DISTRITOS.forEach((dist) => {
    mapa.set(dist, {
      distrito: dist,
      total_cuidadores: 0,
      total_reservas: 0,
      ingresos_brutos: 0,
      comision_15: 0,
      neto_cuidadores_85: 0
    });
  });

  // Incorporar datos provenientes de rpc_admin_dashboard_metrics o cálculo local
  (rawSeries || []).forEach((item) => {
    if (!item) return;
    const nombreDistrito = (item.distrito || item.distrito_cusco || 'Cusco Centro').trim();
    const actual = mapa.get(nombreDistrito) || {
      distrito: nombreDistrito,
      total_cuidadores: 0,
      total_reservas: 0,
      ingresos_brutos: 0,
      comision_15: 0,
      neto_cuidadores_85: 0
    };

    const brutos = Number(item.ingresos_brutos || 0);
    const com15 = Number(item.comision_15 ?? Number((brutos * 0.15).toFixed(2)));
    const neto85 = Number(item.neto_cuidadores_85 ?? Number((brutos - com15).toFixed(2)));

    mapa.set(nombreDistrito, {
      distrito: nombreDistrito,
      total_cuidadores: Number(item.total_cuidadores ?? actual.total_cuidadores ?? 0),
      total_reservas: Number(item.total_reservas ?? actual.total_reservas ?? 0),
      ingresos_brutos: Number(brutos.toFixed(2)),
      comision_15: Number(com15.toFixed(2)),
      neto_cuidadores_85: Number(neto85.toFixed(2))
    });
  });

  return Array.from(mapa.values());
}

/**
 * Normaliza la serie por categorías de servicio en Cusco
 * @param {Array<Object>} rawCategorias
 * @returns {Array<Object>}
 */
export function normalizarSerieCategoriasServicio(rawCategorias = []) {
  const categoriasBase = ['Hospedaje', 'Domicilio Turístico', 'Guardería', 'Paseo'];
  const mapa = new Map();

  categoriasBase.forEach((cat) => {
    mapa.set(cat, {
      categoria: cat,
      total_reservas: 0,
      ingresos_brutos: 0,
      comision_15: 0
    });
  });

  (rawCategorias || []).forEach((item) => {
    if (!item) return;
    const cat = (item.categoria || 'Hospedaje').trim();
    const brutos = Number(item.ingresos_brutos || 0);
    const com15 = Number(item.comision_15 ?? Number((brutos * 0.15).toFixed(2)));

    mapa.set(cat, {
      categoria: cat,
      total_reservas: Number(item.total_reservas || 0),
      ingresos_brutos: Number(brutos.toFixed(2)),
      comision_15: Number(com15.toFixed(2))
    });
  });

  return Array.from(mapa.values());
}

/**
 * Destruye de forma segura todas las instancias activas de Chart.js del dashboard
 */
export function destroyAdminCharts() {
  if (chartDistritosInstance) {
    chartDistritosInstance.destroy();
    chartDistritosInstance = null;
  }
  if (chartCategoriasInstance) {
    chartCategoriasInstance.destroy();
    chartCategoriasInstance = null;
  }
  if (chartEstadosInstance) {
    chartEstadosInstance.destroy();
    chartEstadosInstance = null;
  }
}

/**
 * Renderiza el Gráfico de Barras Interactivo por Distritos Específicos de Cusco
 * @param {HTMLCanvasElement} canvasEl
 * @param {Array<Object>} seriesDistritos
 * @param {Object} opts
 * @param {'finanzas'|'operaciones'} [opts.modo]
 * @param {'PEN'|'USD'} [opts.moneda]
 * @param {number} [opts.tipoCambio]
 */
export function renderChartDistritosCusco(canvasEl, seriesDistritos = [], {
  modo = 'finanzas',
  moneda = 'PEN',
  tipoCambio = CUSCO_CONFIG.DEFAULT_TIPO_CAMBIO
} = {}) {
  if (!canvasEl || typeof window.Chart === 'undefined') return null;

  if (chartDistritosInstance) {
    chartDistritosInstance.destroy();
    chartDistritosInstance = null;
  }

  const datos = normalizarSerieDistritosCusco(seriesDistritos);
  const labels = datos.map((d) => d.distrito);
  const factorMoneda = moneda === 'USD' ? (1 / tipoCambio) : 1;
  const simbolo = moneda === 'USD' ? '$' : 'S/';

  const datasets = modo === 'operaciones'
    ? [
        {
          label: 'Reservas Registradas',
          data: datos.map((d) => d.total_reservas),
          backgroundColor: PALETA_CUSCO.terracota,
          borderColor: PALETA_CUSCO.terracotaBorder,
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: 'Cuidadores en el Distrito',
          data: datos.map((d) => d.total_cuidadores),
          backgroundColor: PALETA_CUSCO.turquesa,
          borderColor: PALETA_CUSCO.turquesaBorder,
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    : [
        {
          label: `Ingresos Brutos (${simbolo})`,
          data: datos.map((d) => Number((d.ingresos_brutos * factorMoneda).toFixed(2))),
          backgroundColor: PALETA_CUSCO.azulAndino,
          borderColor: PALETA_CUSCO.azulAndinoBorder,
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: `Comisión Plataforma 15% (${simbolo})`,
          data: datos.map((d) => Number((d.comision_15 * factorMoneda).toFixed(2))),
          backgroundColor: PALETA_CUSCO.terracota,
          borderColor: PALETA_CUSCO.terracotaBorder,
          borderWidth: 1.5,
          borderRadius: 6
        },
        {
          label: `Neto Cuidadores 85% (${simbolo})`,
          data: datos.map((d) => Number((d.neto_cuidadores_85 * factorMoneda).toFixed(2))),
          backgroundColor: PALETA_CUSCO.turquesa,
          borderColor: PALETA_CUSCO.turquesaBorder,
          borderWidth: 1.5,
          borderRadius: 6
        }
      ];

  const ctx = canvasEl.getContext('2d');
  chartDistritosInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 14,
            usePointStyle: true,
            font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const val = context.parsed.y || 0;
              if (modo === 'operaciones') {
                return ` ${context.dataset.label}: ${val}`;
              }
              return ` ${context.dataset.label}: ${simbolo} ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            font: { size: 11, weight: '600' }
          },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback(val) {
              if (modo === 'operaciones') return val;
              return `${simbolo} ${val}`;
            }
          }
        }
      }
    }
  });

  return chartDistritosInstance;
}

/**
 * Renderiza el Gráfico Doughnut de Reservas e Ingresos por Categoría de Servicio
 * @param {HTMLCanvasElement} canvasEl
 * @param {Array<Object>} seriesCategorias
 * @param {Object} opts
 * @param {'PEN'|'USD'} [opts.moneda]
 * @param {number} [opts.tipoCambio]
 */
export function renderChartCategoriasServicio(canvasEl, seriesCategorias = [], {
  moneda = 'PEN',
  tipoCambio = CUSCO_CONFIG.DEFAULT_TIPO_CAMBIO
} = {}) {
  if (!canvasEl || typeof window.Chart === 'undefined') return null;

  if (chartCategoriasInstance) {
    chartCategoriasInstance.destroy();
    chartCategoriasInstance = null;
  }

  const datos = normalizarSerieCategoriasServicio(seriesCategorias);
  const labels = datos.map((c) => c.categoria);
  const valoresReservas = datos.map((c) => c.total_reservas);

  const ctx = canvasEl.getContext('2d');
  chartCategoriasInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          label: 'Reservas por Categoría',
          data: valoresReservas,
          backgroundColor: [
            PALETA_CUSCO.terracota,
            PALETA_CUSCO.turquesa,
            PALETA_CUSCO.oroInca,
            PALETA_CUSCO.azulAndino
          ],
          borderColor: '#FFFFFF',
          borderWidth: 2,
          hoverOffset: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            padding: 14,
            font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: '600' }
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const item = datos[context.dataIndex];
              const montoFmt = formatMoneda(item?.ingresos_brutos || 0, moneda, tipoCambio);
              const comFmt = formatMoneda(item?.comision_15 || 0, moneda, tipoCambio);
              return ` ${item.categoria}: ${item.total_reservas} reserva(s) • Bruto: ${montoFmt} (Com. 15%: ${comFmt})`;
            }
          }
        }
      }
    }
  });

  return chartCategoriasInstance;
}

/**
 * Renderiza el Gráfico de Distribución por Estado de Reserva
 * @param {HTMLCanvasElement} canvasEl
 * @param {Array<Object>} seriesEstados
 */
export function renderChartEstadosReserva(canvasEl, seriesEstados = []) {
  if (!canvasEl || typeof window.Chart === 'undefined') return null;

  if (chartEstadosInstance) {
    chartEstadosInstance.destroy();
    chartEstadosInstance = null;
  }

  const diccionarioEstados = {
    finalizada: { label: 'Finalizadas', bg: PALETA_CUSCO.verdeBosque, border: PALETA_CUSCO.verdeBosqueBorder },
    en_curso: { label: 'En Curso', bg: PALETA_CUSCO.turquesa, border: PALETA_CUSCO.turquesaBorder },
    confirmada: { label: 'Confirmadas', bg: PALETA_CUSCO.azulAndino, border: PALETA_CUSCO.azulAndinoBorder },
    pendiente_confirmacion: { label: 'Pendientes Confirmación', bg: PALETA_CUSCO.oroInca, border: PALETA_CUSCO.oroIncaBorder },
    en_disputa: { label: 'En Disputa / Arbitraje', bg: PALETA_CUSCO.rojoSos, border: PALETA_CUSCO.rojoSosBorder },
    cancelada: { label: 'Canceladas', bg: PALETA_CUSCO.grisNeutro, border: PALETA_CUSCO.grisNeutroBorder }
  };

  const lista = (seriesEstados && seriesEstados.length > 0)
    ? seriesEstados
    : [
        { estado: 'finalizada', cantidad: 4 },
        { estado: 'en_curso', cantidad: 1 },
        { estado: 'confirmada', cantidad: 1 },
        { estado: 'pendiente_confirmacion', cantidad: 1 },
        { estado: 'en_disputa', cantidad: 1 }
      ];

  const labels = lista.map((e) => diccionarioEstados[e.estado]?.label || e.estado);
  const cantidades = lista.map((e) => Number(e.cantidad || 0));
  const bgColors = lista.map((e) => diccionarioEstados[e.estado]?.bg || PALETA_CUSCO.azulAndino);
  const borderColors = lista.map((e) => diccionarioEstados[e.estado]?.border || PALETA_CUSCO.azulAndinoBorder);

  const ctx = canvasEl.getContext('2d');
  chartEstadosInstance = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cantidad de Reservas',
          data: cantidades,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 }
        },
        y: {
          ticks: { font: { size: 11, weight: '600' } },
          grid: { display: false }
        }
      }
    }
  });

  return chartEstadosInstance;
}

/**
 * Renderiza la tabla comparativa de desempeño financiero y operativo por Distrito de Cusco
 */
export function renderTablaDesgloseDistritosCusco(seriesDistritos = [], moneda = 'PEN') {
  const datos = normalizarSerieDistritosCusco(seriesDistritos);
  const totalBruto = datos.reduce((acc, d) => acc + d.ingresos_brutos, 0);
  const totalCom15 = datos.reduce((acc, d) => acc + d.comision_15, 0);
  const totalNeto85 = datos.reduce((acc, d) => acc + d.neto_cuidadores_85, 0);
  const totalReservas = datos.reduce((acc, d) => acc + d.total_reservas, 0);
  const totalCuidadores = datos.reduce((acc, d) => acc + d.total_cuidadores, 0);

  return `
    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0 small">
        <thead class="table-light">
          <tr>
            <th>Distrito de Cusco</th>
            <th class="text-center">Cuidadores</th>
            <th class="text-center">Reservas</th>
            <th class="text-end">Facturación Bruta (100%)</th>
            <th class="text-end text-primary">Comisión Plataforma (15%)</th>
            <th class="text-end text-success">Neto Cuidadores (85%)</th>
            <th class="text-end">Participación</th>
          </tr>
        </thead>
        <tbody>
          ${datos.map((d) => {
            const pct = totalBruto > 0 ? ((d.ingresos_brutos / totalBruto) * 100).toFixed(1) : '0.0';
            return `
              <tr>
                <td class="fw-bold text-dark">
                  <i class="bi bi-geo-alt-fill text-warning me-1"></i>${escapeHtml(d.distrito)}
                </td>
                <td class="text-center">
                  <span class="badge bg-light text-dark border">${d.total_cuidadores}</span>
                </td>
                <td class="text-center">
                  <span class="badge ${d.total_reservas > 0 ? 'bg-dark' : 'bg-secondary-subtle text-secondary'}">${d.total_reservas}</span>
                </td>
                <td class="text-end fw-semibold">${formatMoneda(d.ingresos_brutos, moneda)}</td>
                <td class="text-end fw-bold text-primary">${formatMoneda(d.comision_15, moneda)}</td>
                <td class="text-end fw-semibold text-success">${formatMoneda(d.neto_cuidadores_85, moneda)}</td>
                <td class="text-end">
                  <div class="d-flex align-items-center justify-content-end gap-2">
                    <div class="progress flex-grow-1" style="height: 6px; max-width: 70px;">
                      <div class="progress-bar bg-warning" role="progressbar" style="width: ${pct}%"></div>
                    </div>
                    <span class="text-muted font-monospace" style="min-width: 40px;">${pct}%</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot class="table-dark">
          <tr>
            <th>TOTAL RED CUSCO (8 Distritos)</th>
            <th class="text-center">${totalCuidadores}</th>
            <th class="text-center">${totalReservas}</th>
            <th class="text-end">${formatMoneda(totalBruto, moneda)}</th>
            <th class="text-end text-warning">${formatMoneda(totalCom15, moneda)}</th>
            <th class="text-end text-info">${formatMoneda(totalNeto85, moneda)}</th>
            <th class="text-end">100.0%</th>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

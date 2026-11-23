/**
 * Paw Patita Cusco v5.0 — Formateadores y Utilidades de Negocio
 * js/utils/formatters.js
 * 
 * Cálculo dinámico de edad exacta, conversión PEN/USD, formato de fechas en español
 * (zona horaria America/Lima), escape XSS estricto y exportación a CSV.
 */

import { CUSCO_CONFIG } from '../config.js';

/**
 * Escapa caracteres HTML para prevenir ataques XSS al inyectar cadenas dinámicas
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calcula dinámicamente la edad exacta desde fecha_nacimiento (ISO YYYY-MM-DD o Date)
 * @param {string|Date} fechaNacimiento 
 * @returns {{ anios: number, meses: number, texto: string, esCachorro: boolean }}
 */
export function calcularEdadDinamica(fechaNacimiento) {
  if (!fechaNacimiento) {
    return { anios: 0, meses: 0, texto: 'Edad no registrada', esCachorro: false };
  }

  const nacimiento = new Date(fechaNacimiento);
  if (isNaN(nacimiento.getTime())) {
    return { anios: 0, meses: 0, texto: 'Fecha no válida', esCachorro: false };
  }

  const hoy = new Date();
  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();

  if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) {
    anios--;
    meses += 12;
  }

  if (hoy.getDate() < nacimiento.getDate()) {
    meses--;
    if (meses < 0) {
      meses = 11;
      anios--;
    }
  }

  if (anios < 0) {
    return { anios: 0, meses: 0, texto: 'Recién nacido', esCachorro: true };
  }

  let texto = '';
  if (anios === 0) {
    texto = meses === 1 ? '1 mes' : `${meses} meses`;
  } else {
    texto = anios === 1 ? '1 año' : `${anios} años`;
    if (meses > 0) {
      texto += meses === 1 ? ' y 1 mes' : ` y ${meses} meses`;
    }
  }

  const esCachorro = anios < 1;
  return { anios, meses, texto, esCachorro };
}

/**
 * Formatea un monto numérico a moneda (S/ PEN o $ USD)
 * @param {number} monto 
 * @param {string} moneda ('PEN' | 'USD')
 * @param {number} tipoCambio 
 * @returns {string}
 */
export function formatMoneda(monto, moneda = 'PEN', tipoCambio = CUSCO_CONFIG.DEFAULT_TIPO_CAMBIO) {
  const num = Number(monto) || 0;
  if (moneda === 'USD') {
    const enUsd = num / tipoCambio;
    return `$ ${enUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  }
  return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatea una fecha ISO a formato legible en español (Cusco / Lima)
 * @param {string|Date} fechaIso 
 * @param {boolean} incluirHora 
 * @returns {string}
 */
export function formatFechaEs(fechaIso, incluirHora = false) {
  if (!fechaIso) return '—';
  // Fechas puras 'YYYY-MM-DD' se interpretan al mediodía de Lima para evitar el corrimiento UTC (-1 día)
  const esSoloFecha = typeof fechaIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaIso);
  const date = esSoloFecha ? new Date(`${fechaIso}T12:00:00-05:00`) : new Date(fechaIso);
  if (isNaN(date.getTime())) return '—';

  const opciones = {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  if (incluirHora) {
    opciones.hour = '2-digit';
    opciones.minute = '2-digit';
    opciones.hour12 = true;
  }

  return new Intl.DateTimeFormat('es-PE', opciones).format(date);
}

/**
 * Retorna fecha actual en formato YYYY-MM-DD
 */
export function getHoyIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte 'YYYY-MM-DD' en un objeto Date local (sin corrimiento de zona horaria)
 * @param {string|Date} valor
 * @returns {Date|null}
 */
export function parseFechaLocal(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(valor);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Suma días a una fecha y retorna 'YYYY-MM-DD' (hora local)
 * @param {string|Date} base
 * @param {number} dias
 */
export function sumarDiasIso(base, dias) {
  const d = parseFechaLocal(base) || new Date();
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(dias || 0));
  return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, '0')}-${String(r.getDate()).padStart(2, '0')}`;
}

/**
 * Exporta una colección de objetos a archivo CSV descargable
 * @param {Array<Object>} rows 
 * @param {string} filename 
 */
export function exportarCsv(rows, filename = 'exportacion_pawpatita.csv') {
  if (!rows || !rows.length) {
    console.warn('No hay datos para exportar a CSV.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
          cell = cell.replace(/"/g, '""');
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            cell = `"${cell}"`;
          }
          return cell;
        })
        .join(',')
    )
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

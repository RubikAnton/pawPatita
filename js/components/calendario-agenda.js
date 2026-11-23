/**
 * Paw Patita Cusco v5.0 — Calendario Interactivo Mensual/Semanal por Días y Bloques Horarios
 * js/components/calendario-agenda.js
 *
 * Funcionalidades:
 *  - Navegación mensual libre (Mes anterior / Hoy / Mes siguiente) y conmutador de vista Mensual vs. Semanal
 *  - Editor visual de Plantilla Semanal (Lun..Dom) sincronizado con `perfiles_cuidadores.disponibilidad_semanal`
 *  - Configuración granular por fecha en `disponibilidad_cuidadores` soportando los bloques:
 *      * `todo_el_dia` (08:00 - 20:00)
 *      * `manana_08_12` (08:00 - 12:00)
 *      * `tarde_14_18` (14:00 - 18:00)
 *      * `noche_18_22` (18:00 - 22:00)
 *      * `personalizado` (`hora_inicio` - `hora_fin`)
 *  - Control de capacidad máxima simultánea (`cupo_maximo`) y visualización real de `cupos_reservados` (0 `undefined`)
 *  - Bloqueo y liberación segura de fechas/bloques (impide bloquear bloques con reservas activas)
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { formatFechaEs, escapeHtml, getHoyIso, sumarDiasIso } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';

const STORAGE_KEY_AGENDA = 'paw_demo_agenda_cuidador_v5';
const STORAGE_KEY_PLANTILLA = 'paw_demo_plantilla_semanal_v5';

export const CATALOGO_BLOQUES_HORARIOS = [
  {
    codigo: 'todo_el_dia',
    nombre: 'Todo el Día (Jornada Completa)',
    etiquetaCorta: 'Todo el día',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    rangoTexto: '08:00 - 20:00',
    icono: 'bi-sun-fill'
  },
  {
    codigo: 'manana_08_12',
    nombre: 'Turno Mañana',
    etiquetaCorta: '08:00 - 12:00',
    hora_inicio: '08:00:00',
    hora_fin: '12:00:00',
    rangoTexto: '08:00 - 12:00',
    icono: 'bi-sunrise-fill'
  },
  {
    codigo: 'tarde_14_18',
    nombre: 'Turno Tarde',
    etiquetaCorta: '14:00 - 18:00',
    hora_inicio: '14:00:00',
    hora_fin: '18:00:00',
    rangoTexto: '14:00 - 18:00',
    icono: 'bi-cloud-sun-fill'
  },
  {
    codigo: 'noche_18_22',
    nombre: 'Turno Noche',
    etiquetaCorta: '18:00 - 22:00',
    hora_inicio: '18:00:00',
    hora_fin: '22:00:00',
    rangoTexto: '18:00 - 22:00',
    icono: 'bi-moon-stars-fill'
  },
  {
    codigo: 'personalizado',
    nombre: 'Horario Personalizado',
    etiquetaCorta: 'Personalizado',
    hora_inicio: '09:00:00',
    hora_fin: '17:00:00',
    rangoTexto: 'Personalizado',
    icono: 'bi-clock-history'
  }
];

const DIAS_SEMANA_NOMBRES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Genera la semilla local de agenda para los próximos 21 días coherente con `06_seed.sql`
 */
function buildAgendaSeed(idCuidador = '60000000-0000-0000-0000-000000000001', capacidadMax = 4) {
  const hoy = getHoyIso();
  const registros = [];

  for (let offset = -2; offset <= 20; offset++) {
    const fechaIso = sumarDiasIso(hoy, offset);
    const esHoyOManana = offset === 0 || offset === 1;
    const esSolicitudFutura = offset === 4 || offset === 5;
    const esDiaDescanso = offset === 9;

    if (esDiaDescanso) {
      registros.push({
        id: `disp-seed-${fechaIso}-todo`,
        id_cuidador: idCuidador,
        fecha: fechaIso,
        bloque_horario: 'todo_el_dia',
        hora_inicio: '08:00:00',
        hora_fin: '20:00:00',
        cupo_maximo: capacidadMax,
        cupos_reservados: 0,
        estado_bloque: 'bloqueado',
        nota_agenda: 'Día personal / Mantenimiento y desinfección de hogar en Wanchaq'
      });
      continue;
    }

    // Bloque Todo el día
    registros.push({
      id: `disp-seed-${fechaIso}-todo`,
      id_cuidador: idCuidador,
      fecha: fechaIso,
      bloque_horario: 'todo_el_dia',
      hora_inicio: '08:00:00',
      hora_fin: '20:00:00',
      cupo_maximo: capacidadMax,
      cupos_reservados: esHoyOManana ? 1 : 0,
      estado_bloque: esHoyOManana ? 'parcial' : 'disponible',
      nota_agenda: esHoyOManana ? 'Custodia activa de Inti (RES-2026-0102)' : 'Agenda activa Cusco'
    });

    // Bloques granulares por franja horaria
    registros.push({
      id: `disp-seed-${fechaIso}-manana`,
      id_cuidador: idCuidador,
      fecha: fechaIso,
      bloque_horario: 'manana_08_12',
      hora_inicio: '08:00:00',
      hora_fin: '12:00:00',
      cupo_maximo: capacidadMax,
      cupos_reservados: esSolicitudFutura ? 1 : 0,
      estado_bloque: esSolicitudFutura ? 'parcial' : 'disponible',
      nota_agenda: esSolicitudFutura ? 'Guardería matutina Chaska (RES-2026-0103)' : 'Turno Mañana activo'
    });

    registros.push({
      id: `disp-seed-${fechaIso}-tarde`,
      id_cuidador: idCuidador,
      fecha: fechaIso,
      bloque_horario: 'tarde_14_18',
      hora_inicio: '14:00:00',
      hora_fin: '18:00:00',
      cupo_maximo: capacidadMax,
      cupos_reservados: 0,
      estado_bloque: 'disponible',
      nota_agenda: 'Turno Tarde activo'
    });

    registros.push({
      id: `disp-seed-${fechaIso}-noche`,
      id_cuidador: idCuidador,
      fecha: fechaIso,
      bloque_horario: 'noche_18_22',
      hora_inicio: '18:00:00',
      hora_fin: '22:00:00',
      cupo_maximo: Math.max(2, capacidadMax - 1),
      cupos_reservados: 0,
      estado_bloque: 'disponible',
      nota_agenda: 'Turno Noche activo'
    });
  }

  return registros;
}

export function getLocalAgendaCuidador(idCuidador = '60000000-0000-0000-0000-000000000001', capacidadMax = 4) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENDA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizarBloqueAgenda);
    }
  } catch (_) { /* ignore */ }
  const seed = buildAgendaSeed(idCuidador, capacidadMax);
  localStorage.setItem(STORAGE_KEY_AGENDA, JSON.stringify(seed));
  return seed.map(normalizarBloqueAgenda);
}

export function saveLocalAgendaCuidador(list) {
  try {
    localStorage.setItem(STORAGE_KEY_AGENDA, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Normaliza un registro de `disponibilidad_cuidadores` garantizando 0 `undefined`
 */
export function normalizarBloqueAgenda(item) {
  const codigoBloque = item.bloque_horario || 'todo_el_dia';
  const def = CATALOGO_BLOQUES_HORARIOS.find((b) => b.codigo === codigoBloque) || CATALOGO_BLOQUES_HORARIOS[0];
  const cupoMaximo = Math.max(1, Number(item.cupo_maximo ?? item.cupo ?? 4));
  const cuposReservados = Math.max(0, Number(item.cupos_reservados ?? item.ocupados ?? 0));

  let estado = (item.estado_bloque || 'disponible').toLowerCase();
  if (estado !== 'bloqueado') {
    if (cuposReservados >= cupoMaximo) estado = 'lleno';
    else if (cuposReservados > 0) estado = 'parcial';
    else estado = 'disponible';
  }

  const hIni = String(item.hora_inicio || def.hora_inicio).slice(0, 5);
  const hFin = String(item.hora_fin || def.hora_fin).slice(0, 5);

  return {
    id: item.id || `disp-${item.fecha}-${codigoBloque}`,
    id_cuidador: item.id_cuidador || '60000000-0000-0000-0000-000000000001',
    fecha: String(item.fecha || getHoyIso()).slice(0, 10),
    bloque_horario: codigoBloque,
    bloque_nombre: def.nombre,
    etiqueta_corta: codigoBloque === 'personalizado' ? `${hIni} - ${hFin}` : def.etiquetaCorta,
    hora_inicio: `${hIni}:00`,
    hora_fin: `${hFin}:00`,
    rango_horas: `${hIni} - ${hFin}`,
    cupo_maximo: cupoMaximo,
    cupos_reservados: cuposReservados,
    cupos_libres: estado === 'bloqueado' ? 0 : Math.max(0, cupoMaximo - cuposReservados),
    estado_bloque: estado,
    nota_agenda: item.nota_agenda || ''
  };
}

/**
 * Obtiene la disponibilidad del cuidador desde Supabase o fallback local
 */
export async function obtenerDisponibilidadCuidador(idCuidador, capacidadMax = 4) {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('disponibilidad_cuidadores')
        .select('*')
        .eq('id_cuidador', idCuidador)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (!error && Array.isArray(data)) {
        const normalizados = data.map(normalizarBloqueAgenda);
        saveLocalAgendaCuidador(normalizados);
        return normalizados;
      }
    } catch (err) {
      console.warn('Error al consultar disponibilidad del cuidador:', err);
    }
  }
  return getLocalAgendaCuidador(idCuidador, capacidadMax);
}

/**
 * Libera 1 cupo en la agenda local cuando una reserva es rechazada o cancelada
 */
export function liberarCupoAgendaLocal(idCuidador, fechaInicio, fechaFin, bloqueHorario) {
  const lista = getLocalAgendaCuidador(idCuidador);
  const actualizados = lista.map((item) => {
    if (item.fecha >= fechaInicio && item.fecha <= fechaFin && item.bloque_horario === bloqueHorario) {
      const nuevosReservados = Math.max(0, Number(item.cupos_reservados || 0) - 1);
      return normalizarBloqueAgenda({
        ...item,
        cupos_reservados: nuevosReservados
      });
    }
    return item;
  });
  saveLocalAgendaCuidador(actualizados);
  return actualizados;
}

/**
 * Obtiene y guarda la plantilla semanal de días laborables (`Lun`..`Dom`)
 */
export function obtenerPlantillaSemanal(disponibilidadPerfil = null) {
  if (Array.isArray(disponibilidadPerfil) && disponibilidadPerfil.length > 0) {
    return disponibilidadPerfil;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANTILLA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
}

/**
 * Formatea una fecha Date local a `YYYY-MM-DD`
 */
function formatDateToIso(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calcula el resumen visual de un día completo a partir de sus bloques configurados y reservas
 */
function resumirEstadoDia(bloquesDia = [], reservasDia = [], capacidadDefault = 4) {
  const resActivas = reservasDia.filter((r) => !['cancelada', 'rechazada'].includes(r.estado_reserva));

  if (bloquesDia.length === 0) {
    const ocupados = resActivas.length;
    const estado = ocupados >= capacidadDefault ? 'lleno' : (ocupados > 0 ? 'parcial' : 'disponible');
    return {
      estadoGlobal: estado,
      etiquetaEstado: estado === 'lleno' ? 'Cupo Lleno' : (estado === 'parcial' ? 'Parcial' : 'Disponible'),
      totalOcupados: ocupados,
      totalCapacidad: capacidadDefault,
      bloquesActivosCount: 1
    };
  }

  const bloqueTodoDia = bloquesDia.find((b) => b.bloque_horario === 'todo_el_dia');
  const todosBloqueados = bloquesDia.every((b) => b.estado_bloque === 'bloqueado');
  if (todosBloqueados || (bloqueTodoDia && bloqueTodoDia.estado_bloque === 'bloqueado' && bloquesDia.length === 1)) {
    return {
      estadoGlobal: 'bloqueado',
      etiquetaEstado: 'Día Bloqueado',
      totalOcupados: 0,
      totalCapacidad: bloqueTodoDia?.cupo_maximo || capacidadDefault,
      bloquesActivosCount: 0
    };
  }

  // Tomar el bloque principal o el promedio/máximo de ocupación
  const bloquesHabilitados = bloquesDia.filter((b) => b.estado_bloque !== 'bloqueado');
  const maxOcupados = Math.max(
    resActivas.length,
    ...bloquesHabilitados.map((b) => Number(b.cupos_reservados || 0))
  );
  const capReferencia = bloqueTodoDia
    ? bloqueTodoDia.cupo_maximo
    : Math.max(...bloquesHabilitados.map((b) => Number(b.cupo_maximo || capacidadDefault)));

  let estadoGlobal = 'disponible';
  if (maxOcupados >= capReferencia) estadoGlobal = 'lleno';
  else if (maxOcupados > 0) estadoGlobal = 'parcial';

  return {
    estadoGlobal,
    etiquetaEstado: estadoGlobal === 'lleno'
      ? 'Lleno'
      : (estadoGlobal === 'parcial' ? 'Con Reservas' : 'Disponible'),
    totalOcupados: maxOcupados,
    totalCapacidad: capReferencia,
    bloquesActivosCount: bloquesHabilitados.length
  };
}

/**
 * Abre el Modal de Configuración Granular de un Día y sus Bloques Horarios
 */
export function abrirModalConfigurarDiaAgenda({
  fechaIso,
  idCuidador,
  capacidadMaxCuidador = 4,
  bloquesExistentes = [],
  reservasDelDia = [],
  onAgendaActualizada = null
}) {
  const reservasActivas = reservasDelDia.filter((r) => !['cancelada'].includes(r.estado_reserva));

  // Construir estado editable para los 4 bloques estándar + opción de bloque personalizado
  const mapaActual = new Map();
  bloquesExistentes.forEach((b) => {
    mapaActual.set(b.bloque_horario, normalizarBloqueAgenda(b));
  });

  const filasBloques = CATALOGO_BLOQUES_HORARIOS.map((def) => {
    const existente = mapaActual.get(def.codigo);
    const habilitado = existente
      ? existente.estado_bloque !== 'bloqueado'
      : (def.codigo !== 'personalizado');
    const cupoMaximo = existente ? existente.cupo_maximo : capacidadMaxCuidador;
    const cuposReservados = existente ? existente.cupos_reservados : 0;
    const hIni = existente ? existente.hora_inicio.slice(0, 5) : def.hora_inicio.slice(0, 5);
    const hFin = existente ? existente.hora_fin.slice(0, 5) : def.hora_fin.slice(0, 5);

    return {
      ...def,
      id_registro: existente?.id || null,
      habilitado,
      cupo_maximo: cupoMaximo,
      cupos_reservados: cuposReservados,
      hora_inicio_edit: hIni,
      hora_fin_edit: hFin,
      nota_agenda: existente?.nota_agenda || ''
    };
  });

  const notaGeneralDia = bloquesExistentes[0]?.nota_agenda || '';

  const cuerpoHtml = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 rounded-3 bg-light border mb-3">
      <div>
        <div class="small text-muted text-uppercase fw-bold">Fecha Seleccionada en Cusco</div>
        <h5 class="fw-bold text-dark mb-0">
          <i class="bi bi-calendar-event text-warning me-2"></i>${formatFechaEs(fechaIso)} (${escapeHtml(fechaIso)})
        </h5>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-outline-success btn-sm fw-semibold" id="btn-dia-habilitar-todos">
          <i class="bi bi-check2-all me-1"></i>Activar Todos los Bloques
        </button>
        <button type="button" class="btn btn-outline-danger btn-sm fw-semibold" id="btn-dia-bloquear-todo">
          <i class="bi bi-slash-circle me-1"></i>Bloquear Día Completo
        </button>
      </div>
    </div>

    ${reservasActivas.length > 0 ? `
      <div class="alert alert-info border-0 small mb-3">
        <div class="fw-bold mb-1">
          <i class="bi bi-shield-lock-fill me-1"></i>Reservas Asignadas en esta Fecha (${reservasActivas.length}):
        </div>
        <div class="d-flex flex-wrap gap-2">
          ${reservasActivas.map((r) => {
            const etqBloque = CATALOGO_BLOQUES_HORARIOS.find((b) => b.codigo === r.bloque_horario)?.nombre || 'Todo el Día (24h)';
            return `
            <span class="badge bg-white text-dark border px-2 py-1">
              <strong>${escapeHtml(r.codigo_reserva)}</strong>: 🐾 ${escapeHtml(r.mascota_nombre)} (${escapeHtml(r.mascota_paw_id)})
              • <span class="text-primary">${escapeHtml(etqBloque)}</span> [${escapeHtml(r.estado_reserva.toUpperCase())}]
            </span>
          `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <label class="form-label small fw-bold text-secondary mb-0">
          Configuración de Bloques Horarios y Capacidad Simultánea de Mascotas
        </label>
        <span class="badge bg-dark">Capacidad base hogar: ${capacidadMaxCuidador} mascotas</span>
      </div>

      <div class="table-responsive border rounded-3">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th style="width: 34%;">Bloque Horario</th>
              <th style="width: 24%;">Franja (Inicio - Fin)</th>
              <th style="width: 18%;" class="text-center">Reservados</th>
              <th style="width: 24%;">Cupo Máx. Simultáneo</th>
            </tr>
          </thead>
          <tbody>
            ${filasBloques.map((b) => `
              <tr data-bloque-row="${escapeHtml(b.codigo)}" class="${b.habilitado ? '' : 'table-secondary opacity-75'}">
                <td>
                  <div class="form-check form-switch mb-0">
                    <input class="form-check-input toggle-bloque-check" type="checkbox"
                      id="chk-bloque-${escapeHtml(b.codigo)}"
                      data-codigo="${escapeHtml(b.codigo)}"
                      data-reservados="${b.cupos_reservados}"
                      ${b.habilitado ? 'checked' : ''}>
                    <label class="form-check-label fw-bold text-dark" for="chk-bloque-${escapeHtml(b.codigo)}">
                      <i class="bi ${b.icono} text-warning me-1"></i>${escapeHtml(b.nombre)}
                    </label>
                  </div>
                </td>
                <td>
                  ${b.codigo === 'personalizado' ? `
                    <div class="d-flex align-items-center gap-1">
                      <input type="time" class="form-control form-control-sm input-hora-ini" value="${escapeHtml(b.hora_inicio_edit)}">
                      <span>-</span>
                      <input type="time" class="form-control form-control-sm input-hora-fin" value="${escapeHtml(b.hora_fin_edit)}">
                    </div>
                  ` : `
                    <span class="badge bg-light text-dark border font-monospace">${escapeHtml(b.rangoTexto)}</span>
                  `}
                </td>
                <td class="text-center">
                  <span class="badge ${b.cupos_reservados > 0 ? 'bg-primary' : 'bg-secondary-subtle text-secondary'}">
                    ${b.cupos_reservados} ocupado(s)
                  </span>
                </td>
                <td>
                  <div class="input-group input-group-sm" style="max-width: 140px;">
                    <input type="number" class="form-control text-center fw-bold input-cupo-max"
                      min="${Math.max(1, b.cupos_reservados)}" max="10"
                      value="${b.cupo_maximo}" ${b.habilitado ? '' : 'disabled'}>
                    <span class="input-group-text">cupos</span>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-md-8">
        <label class="form-label small fw-bold">Nota Operativa de Agenda para este Día (opcional)</label>
        <input type="text" class="form-control form-control-sm" id="input-nota-dia-agenda"
          maxlength="140" value="${escapeHtml(notaGeneralDia)}"
          placeholder="Ej. Disponible para paseos matutinos en Wanchaq y hospedaje...">
      </div>
      <div class="col-md-4">
        <label class="form-label small fw-bold">Replicar configuración</label>
        <select class="form-select form-select-sm" id="select-replicar-agenda">
          <option value="solo_este_dia" selected>Aplicar solo a ${escapeHtml(fechaIso)}</option>
          <option value="proximos_3_dias">Replicar a los próximos 3 días</option>
          <option value="toda_la_semana">Replicar a los próximos 7 días</option>
        </select>
      </div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold" id="btn-guardar-config-dia">
      <i class="bi bi-calendar2-check-fill me-1"></i>Guardar Bloques y Cupos en Agenda
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Configurar Día y Bloques Horarios — ${fechaIso}`,
    icono: 'bi-clock-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  // Interacción de switches de cada bloque
  modal.el.querySelectorAll('.toggle-bloque-check').forEach((chk) => {
    chk.addEventListener('change', () => {
      const codigo = chk.getAttribute('data-codigo');
      const reservados = Number(chk.getAttribute('data-reservados') || 0);
      if (!chk.checked && reservados > 0) {
        chk.checked = true;
        showToast('No puedes bloquear una franja horaria que ya tiene reservas activas asignadas.', 'warning');
        return;
      }
      const row = modal.el.querySelector(`[data-bloque-row="${codigo}"]`);
      const inputCupo = row?.querySelector('.input-cupo-max');
      if (row) row.classList.toggle('table-secondary', !chk.checked);
      if (row) row.classList.toggle('opacity-75', !chk.checked);
      if (inputCupo) inputCupo.disabled = !chk.checked;
    });
  });

  // Botón Activar Todos los Bloques
  modal.el.querySelector('#btn-dia-habilitar-todos')?.addEventListener('click', () => {
    modal.el.querySelectorAll('.toggle-bloque-check').forEach((chk) => {
      if (chk.getAttribute('data-codigo') !== 'personalizado') {
        chk.checked = true;
        chk.dispatchEvent(new Event('change'));
      }
    });
  });

  // Botón Bloquear Día Completo
  modal.el.querySelector('#btn-dia-bloquear-todo')?.addEventListener('click', () => {
    if (reservasActivas.length > 0) {
      showToast('No puedes bloquear un día que ya cuenta con reservas confirmadas o en curso.', 'warning', 'Agenda Protegida');
      return;
    }
    modal.el.querySelectorAll('.toggle-bloque-check').forEach((chk) => {
      chk.checked = false;
      chk.dispatchEvent(new Event('change'));
    });
    const notaEl = modal.el.querySelector('#input-nota-dia-agenda');
    if (notaEl && !notaEl.value) {
      notaEl.value = 'Día bloqueado por el cuidador (No disponible)';
    }
  });

  // Guardar en Supabase (`disponibilidad_cuidadores`) y sincronizar copia local
  modal.el.querySelector('#btn-guardar-config-dia')?.addEventListener('click', async () => {
    const nota = modal.el.querySelector('#input-nota-dia-agenda').value.trim() || 'Agenda configurada Cusco';
    const modoReplicar = modal.el.querySelector('#select-replicar-agenda').value;

    const diasAplicar = [fechaIso];
    if (modoReplicar === 'proximos_3_dias') {
      diasAplicar.push(sumarDiasIso(fechaIso, 1), sumarDiasIso(fechaIso, 2));
    } else if (modoReplicar === 'toda_la_semana') {
      for (let d = 1; d <= 6; d++) diasAplicar.push(sumarDiasIso(fechaIso, d));
    }

    // Recolectar configuración de las filas del modal
    const bloquesConfigurados = [];
    for (const def of CATALOGO_BLOQUES_HORARIOS) {
      const row = modal.el.querySelector(`[data-bloque-row="${def.codigo}"]`);
      if (!row) continue;
      const chk = row.querySelector('.toggle-bloque-check');
      const habilitado = Boolean(chk?.checked);
      const reservados = Number(chk?.getAttribute('data-reservados') || 0);
      const cupoMax = Math.max(1, Number(row.querySelector('.input-cupo-max')?.value || capacidadMaxCuidador));

      let hIni = def.hora_inicio;
      let hFin = def.hora_fin;
      if (def.codigo === 'personalizado') {
        const rawIni = row.querySelector('.input-hora-ini')?.value || '09:00';
        const rawFin = row.querySelector('.input-hora-fin')?.value || '17:00';
        if (habilitado && rawFin <= rawIni) {
          showToast('En el horario personalizado, la hora de fin debe ser posterior a la hora de inicio.', 'warning');
          return;
        }
        hIni = `${rawIni.slice(0, 5)}:00`;
        hFin = `${rawFin.slice(0, 5)}:00`;
      }

      // Omitir personalizado si no está habilitado y no existía previamente
      if (def.codigo === 'personalizado' && !habilitado && !mapaActual.has('personalizado')) {
        continue;
      }

      bloquesConfigurados.push({
        bloque_horario: def.codigo,
        hora_inicio: hIni,
        hora_fin: hFin,
        cupo_maximo: cupoMax,
        cupos_reservados: reservados,
        estado_bloque: habilitado
          ? (reservados >= cupoMax ? 'lleno' : (reservados > 0 ? 'parcial' : 'disponible'))
          : 'bloqueado',
        nota_agenda: nota
      });
    }

    showSpinner('Guardando disponibilidad en tu agenda...');
    try {
      const supabase = getSupabase();
      const agendaExistente = getLocalAgendaCuidador(idCuidador, capacidadMaxCuidador);
      const mapaReservadosPorFechaBloque = new Map();

      agendaExistente.forEach((item) => {
        if (diasAplicar.includes(item.fecha)) {
          mapaReservadosPorFechaBloque.set(
            `${item.fecha}__${item.bloque_horario}`,
            Number(item.cupos_reservados || 0)
          );
        }
      });

      if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-') && diasAplicar.length > 1) {
        const { data: existentesDb } = await supabase
          .from('disponibilidad_cuidadores')
          .select('fecha, bloque_horario, cupos_reservados')
          .eq('id_cuidador', idCuidador)
          .in('fecha', diasAplicar);

        if (Array.isArray(existentesDb)) {
          existentesDb.forEach((row) => {
            mapaReservadosPorFechaBloque.set(
              `${row.fecha}__${row.bloque_horario}`,
              Number(row.cupos_reservados || 0)
            );
          });
        }
      }

      const payloadUpsert = [];

      diasAplicar.forEach((diaTarget) => {
        bloquesConfigurados.forEach((b) => {
          const reservadosExistentes = diaTarget === fechaIso
            ? b.cupos_reservados
            : Number(mapaReservadosPorFechaBloque.get(`${diaTarget}__${b.bloque_horario}`) || 0);
          const cupoMaximoAjustado = Math.max(b.cupo_maximo, reservadosExistentes, 1);
          const bloqueHabilitado = b.estado_bloque !== 'bloqueado' || reservadosExistentes > 0;
          const estadoAjustado = bloqueHabilitado
            ? (reservadosExistentes >= cupoMaximoAjustado ? 'lleno' : (reservadosExistentes > 0 ? 'parcial' : 'disponible'))
            : 'bloqueado';

          payloadUpsert.push({
            id_cuidador: idCuidador,
            fecha: diaTarget,
            bloque_horario: b.bloque_horario,
            hora_inicio: b.hora_inicio,
            hora_fin: b.hora_fin,
            cupo_maximo: cupoMaximoAjustado,
            cupos_reservados: reservadosExistentes,
            estado_bloque: estadoAjustado,
            nota_agenda: b.nota_agenda
          });
        });
      });

      if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
        const { error } = await supabase
          .from('disponibilidad_cuidadores')
          .upsert(payloadUpsert, {
            onConflict: 'id_cuidador,fecha,bloque_horario,hora_inicio,hora_fin'
          });
        if (error) throw error;
      }

      // Actualizar en almacenamiento local
      const agendaLocal = agendaExistente
        .filter((item) => !diasAplicar.includes(item.fecha));

      payloadUpsert.forEach((nuevo, idx) => {
        agendaLocal.push(normalizarBloqueAgenda({
          id: `disp-${nuevo.fecha}-${nuevo.bloque_horario}-${idx}`,
          ...nuevo
        }));
      });

      agendaLocal.sort((a, b) => a.fecha.localeCompare(b.fecha));
      saveLocalAgendaCuidador(agendaLocal);

      await modal.cerrarAsync();
      showToast(
        diasAplicar.length > 1
          ? `Agenda actualizada para ${diasAplicar.length} días consecutivos.`
          : `Bloques horarios y cupos del día ${fechaIso} actualizados con éxito.`,
        'success',
        'Agenda Horaria Actualizada'
      );

      if (typeof onAgendaActualizada === 'function') {
        onAgendaActualizada(agendaLocal);
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo guardar la configuración horaria.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Renderizador Principal de la Sección 2: Agenda y Cupos (Calendario Mensual + Semanal por Bloques Horarios)
 */
export function renderSeccionCalendarioAgenda(container, {
  idCuidador = '60000000-0000-0000-0000-000000000001',
  capacidadMaxCuidador = 4,
  disponibilidad = [],
  reservas = [],
  plantillaSemanal = null,
  estadoVista = null,
  onCambioAgenda = null
} = {}) {
  if (!container) return;

  const hoyIso = getHoyIso();
  const hoyParts = hoyIso.split('-').map(Number);

  const state = estadoVista || {
    anio: hoyParts[0],
    mes: hoyParts[1] - 1, // 0..11
    modoVista: 'mensual', // 'mensual' | 'semanal'
    fechaFocoSemanal: hoyIso,
    diasLaborables: obtenerPlantillaSemanal(plantillaSemanal)
  };

  // Agrupar bloques por fecha YYYY-MM-DD
  const mapaBloquesPorFecha = new Map();
  (disponibilidad || []).forEach((item) => {
    const b = normalizarBloqueAgenda(item);
    if (!mapaBloquesPorFecha.has(b.fecha)) mapaBloquesPorFecha.set(b.fecha, []);
    mapaBloquesPorFecha.get(b.fecha).push(b);
  });

  // Agrupar reservas por cada día comprendido entre fecha_inicio y fecha_fin
  const mapaReservasPorFecha = new Map();
  (reservas || []).forEach((r) => {
    if (r.estado_reserva === 'cancelada') return;
    let cursor = r.fecha_inicio;
    let guard = 0;
    while (cursor <= r.fecha_fin && guard < 45) {
      if (!mapaReservasPorFecha.has(cursor)) mapaReservasPorFecha.set(cursor, []);
      mapaReservasPorFecha.get(cursor).push(r);
      cursor = sumarDiasIso(cursor, 1);
      guard++;
    }
  });

  // Construir cuadrícula del mes actual (Lunes = 0 .. Domingo = 6)
  const primerDiaMes = new Date(state.anio, state.mes, 1);
  const ultimoDiaMes = new Date(state.anio, state.mes + 1, 0);
  const diasEnMes = ultimoDiaMes.getDate();
  const offsetLunes = (primerDiaMes.getDay() + 6) % 7;

  const celdasMes = [];
  for (let i = 0; i < offsetLunes; i++) {
    celdasMes.push({ vacia: true });
  }
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fechaIso = `${state.anio}-${String(state.mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const bloquesDia = mapaBloquesPorFecha.get(fechaIso) || [];
    const reservasDia = mapaReservasPorFecha.get(fechaIso) || [];
    const resumen = resumirEstadoDia(bloquesDia, reservasDia, capacidadMaxCuidador);
    celdasMes.push({
      vacia: false,
      dia,
      fechaIso,
      esHoy: fechaIso === hoyIso,
      bloquesDia,
      reservasDia,
      resumen
    });
  }

  // Construir los 7 días para la Vista Semanal por Bloques Horarios
  const partesFoco = state.fechaFocoSemanal.split('-').map(Number);
  const dateFoco = new Date(partesFoco[0], partesFoco[1] - 1, partesFoco[2]);
  const offsetDiaSemana = (dateFoco.getDay() + 6) % 7;
  const lunesSemana = new Date(dateFoco);
  lunesSemana.setDate(dateFoco.getDate() - offsetDiaSemana);

  const diasSemanaVista = [];
  for (let d = 0; d < 7; d++) {
    const curr = new Date(lunesSemana);
    curr.setDate(lunesSemana.getDate() + d);
    const iso = formatDateToIso(curr);
    diasSemanaVista.push({
      nombreCorto: DIAS_SEMANA_NOMBRES[d],
      diaMes: curr.getDate(),
      mesCorto: MESES_ES[curr.getMonth()].slice(0, 3),
      fechaIso: iso,
      esHoy: iso === hoyIso,
      bloquesDia: mapaBloquesPorFecha.get(iso) || [],
      reservasDia: mapaReservasPorFecha.get(iso) || []
    });
  }

  container.innerHTML = `
    <!-- Editor Rápido de Plantilla Semanal y Capacidad Base -->
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-sliders2-vertical text-warning me-2"></i>Plantilla Semanal y Capacidad de Custodia
          </h5>
          <p class="text-secondary small mb-0">
            Selecciona tus días habituales de atención en Cusco o haz clic en cualquier fecha del calendario para configurar bloques horarios exactos (<em>08:00-12:00</em>, <em>14:00-18:00</em>, <em>18:00-22:00</em> o <em>Todo el día</em>).
          </p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-dark px-3 py-2">
            <i class="bi bi-house-heart-fill text-warning me-1"></i>Capacidad Máxima: ${capacidadMaxCuidador} mascotas/bloque
          </span>
        </div>
      </div>

      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 bg-light rounded-3 border">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <span class="small fw-bold text-secondary me-1">Días Laborables Activos:</span>
          ${DIAS_SEMANA_NOMBRES.map((diaNom) => {
            const activo = state.diasLaborables.includes(diaNom);
            return `
              <button type="button"
                class="btn btn-sm fw-bold ${activo ? 'btn-paw' : 'btn-outline-secondary'}"
                data-action="toggle-dia-plantilla"
                data-dia="${diaNom}">
                <i class="bi ${activo ? 'bi-check-circle-fill' : 'bi-circle'} me-1"></i>${diaNom}
              </button>
            `;
          }).join('')}
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm fw-semibold" id="btn-guardar-plantilla-semanal">
          <i class="bi bi-floppy-fill me-1"></i>Guardar Plantilla Semanal
        </button>
      </div>
    </div>

    <!-- Calendario Interactivo Mensual / Semanal por Bloques Horarios -->
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom">
        <div class="d-flex align-items-center gap-2">
          <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-agenda-prev" title="Anterior">
            <i class="bi bi-chevron-left"></i>
          </button>
          <h5 class="fw-bold mb-0 px-2 text-dark" id="agenda-titulo-periodo">
            ${state.modoVista === 'mensual'
              ? `${MESES_ES[state.mes]} ${state.anio}`
              : `Semana del ${diasSemanaVista[0].diaMes} ${diasSemanaVista[0].mesCorto} al ${diasSemanaVista[6].diaMes} ${diasSemanaVista[6].mesCorto} ${state.anio}`}
          </h5>
          <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-agenda-next" title="Siguiente">
            <i class="bi bi-chevron-right"></i>
          </button>
          <button type="button" class="btn btn-light border btn-sm fw-semibold ms-1" id="btn-agenda-hoy">
            Hoy (${escapeHtml(hoyIso)})
          </button>
        </div>

        <!-- Leyenda de Estados y Conmutador Mensual/Semanal -->
        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="d-none d-md-flex align-items-center gap-2 me-2 small">
            <span class="badge bg-success-subtle text-success border border-success-subtle">● Disponible</span>
            <span class="badge bg-warning-subtle text-dark border border-warning-subtle">● Parcial (ocupados/cupo)</span>
            <span class="badge bg-danger-subtle text-danger border border-danger-subtle">● Cupo Lleno</span>
            <span class="badge bg-secondary-subtle text-secondary border">● Bloqueado</span>
          </div>

          <div class="btn-group btn-group-sm" role="group" aria-label="Modo de vista del calendario">
            <button type="button" class="btn ${state.modoVista === 'mensual' ? 'btn-dark' : 'btn-outline-dark'}" data-vista-modo="mensual">
              <i class="bi bi-calendar3 me-1"></i>Mensual
            </button>
            <button type="button" class="btn ${state.modoVista === 'semanal' ? 'btn-dark' : 'btn-outline-dark'}" data-vista-modo="semanal">
              <i class="bi bi-calendar-week me-1"></i>Semanal por Bloques
            </button>
          </div>
        </div>
      </div>

      ${state.modoVista === 'mensual' ? `
        <!-- VISTA MENSUAL POR DÍAS -->
        <div class="agenda-calendar-weekdays">
          ${DIAS_SEMANA_NOMBRES.map((d) => `<div class="agenda-weekday-header">${d}</div>`).join('')}
        </div>
        <div class="agenda-calendar-grid">
          ${celdasMes.map((c) => {
            if (c.vacia) {
              return `<div class="agenda-day-cell agenda-day-empty"></div>`;
            }

            const stClass = `agenda-status-${c.resumen.estadoGlobal}`;
            const bloquesConfigurados = c.bloquesDia.filter((b) => b.estado_bloque !== 'bloqueado');

            return `
              <div class="agenda-day-cell ${stClass} ${c.esHoy ? 'agenda-day-today' : ''}"
                data-action="configurar-dia"
                data-fecha="${escapeHtml(c.fechaIso)}"
                role="button"
                tabindex="0"
                title="Clic para configurar bloques horarios del ${c.fechaIso}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="agenda-day-number ${c.esHoy ? 'bg-warning text-dark px-2 rounded-pill' : ''}">
                    ${c.dia}
                  </span>
                  <span class="agenda-cupo-pill">
                    ${c.resumen.estadoGlobal === 'bloqueado'
                      ? '<i class="bi bi-lock-fill"></i> Bloq.'
                      : `${c.resumen.totalOcupados}/${c.resumen.totalCapacidad} cupos`}
                  </span>
                </div>

                <div class="agenda-day-badges">
                  ${c.resumen.estadoGlobal === 'bloqueado' ? `
                    <span class="badge bg-secondary w-100 text-truncate">No disponible</span>
                  ` : bloquesConfigurados.length > 0 ? (
                    bloquesConfigurados.slice(0, 3).map((b) => `
                      <div class="agenda-slot-chip ${b.cupos_reservados > 0 ? 'slot-chip-occupied' : ''}">
                        <span>${escapeHtml(b.etiqueta_corta)}</span>
                        <strong>${b.cupos_reservados}/${b.cupo_maximo}</strong>
                      </div>
                    `).join('')
                  ) : `
                    <div class="agenda-slot-chip">
                      <span>Todo el día</span>
                      <strong>${c.resumen.totalOcupados}/${c.resumen.totalCapacidad}</strong>
                    </div>
                  `}
                </div>

                ${c.reservasDia.length > 0 ? `
                  <div class="mt-1 pt-1 border-top">
                    ${c.reservasDia.slice(0, 2).map((r) => `
                      <div class="badge bg-primary-subtle text-primary d-block text-truncate mb-1" style="font-size:0.68rem;">
                        🐾 ${escapeHtml(r.mascota_nombre)} (${escapeHtml(r.codigo_reserva)})
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- VISTA SEMANAL MATRICIAL POR BLOQUES HORARIOS EXACTOS -->
        <div class="table-responsive">
          <table class="table table-bordered align-middle mb-0 small agenda-weekly-table">
            <thead class="table-light text-center">
              <tr>
                <th style="min-width: 155px;">Bloque Horario</th>
                ${diasSemanaVista.map((d) => `
                  <th class="${d.esHoy ? 'table-warning' : ''}" style="min-width: 120px;">
                    <div class="fw-bold text-dark">${d.nombreCorto} ${d.diaMes} ${d.mesCorto}</div>
                    <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none"
                      data-action="configurar-dia" data-fecha="${escapeHtml(d.fechaIso)}">
                      <i class="bi bi-gear-fill me-1"></i>Editar día
                    </button>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${CATALOGO_BLOQUES_HORARIOS.filter((b) => b.codigo !== 'personalizado').map((def) => `
                <tr>
                  <td class="bg-light">
                    <div class="fw-bold text-dark"><i class="bi ${def.icono} text-warning me-1"></i>${escapeHtml(def.nombre)}</div>
                    <div class="text-muted font-monospace" style="font-size:0.75rem;">${escapeHtml(def.rangoTexto)}</div>
                  </td>
                  ${diasSemanaVista.map((d) => {
                    const bloqueMatch = d.bloquesDia.find((b) => b.bloque_horario === def.codigo);
                    const bloqueTodoBloqueado = d.bloquesDia.length > 0 && d.bloquesDia.every((b) => b.estado_bloque === 'bloqueado');
                    const estado = bloqueTodoBloqueado
                      ? 'bloqueado'
                      : (bloqueMatch ? bloqueMatch.estado_bloque : 'disponible');
                    const ocupados = bloqueMatch ? bloqueMatch.cupos_reservados : 0;
                    const cupoMax = bloqueMatch ? bloqueMatch.cupo_maximo : capacidadMaxCuidador;

                    const badgeCls = estado === 'bloqueado'
                      ? 'bg-secondary-subtle text-secondary'
                      : (estado === 'lleno'
                        ? 'bg-danger-subtle text-danger'
                        : (estado === 'parcial' ? 'bg-warning-subtle text-dark' : 'bg-success-subtle text-success'));

                    return `
                      <td class="text-center agenda-weekly-cell"
                        data-action="configurar-dia"
                        data-fecha="${escapeHtml(d.fechaIso)}"
                        role="button">
                        <span class="badge ${badgeCls} d-block py-2 mb-1">
                          ${estado === 'bloqueado' ? 'Bloqueado' : `Cupos: ${ocupados}/${cupoMax}`}
                        </span>
                        <div class="text-muted" style="font-size:0.7rem;">
                          ${estado === 'bloqueado' ? 'Sin atención' : `${Math.max(0, cupoMax - ocupados)} libre(s)`}
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  // Eventos: Toggle de día en Plantilla Semanal
  container.querySelectorAll('[data-action="toggle-dia-plantilla"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dia = btn.getAttribute('data-dia');
      if (state.diasLaborables.includes(dia)) {
        if (state.diasLaborables.length <= 1) {
          showToast('Debes mantener al menos 1 día laborable activo en tu plantilla semanal.', 'warning');
          return;
        }
        state.diasLaborables = state.diasLaborables.filter((d) => d !== dia);
      } else {
        state.diasLaborables.push(dia);
      }
      renderSeccionCalendarioAgenda(container, {
        idCuidador,
        capacidadMaxCuidador,
        disponibilidad,
        reservas,
        plantillaSemanal: state.diasLaborables,
        estadoVista: state,
        onCambioAgenda
      });
    });
  });

  // Guardar Plantilla Semanal en `perfiles_cuidadores.disponibilidad_semanal`
  container.querySelector('#btn-guardar-plantilla-semanal')?.addEventListener('click', async () => {
    showSpinner('Guardando plantilla semanal en perfil del cuidador...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
        const { error } = await supabase
          .from('perfiles_cuidadores')
          .update({ disponibilidad_semanal: state.diasLaborables })
          .eq('id', idCuidador);
        if (error) throw error;
      }
      localStorage.setItem(STORAGE_KEY_PLANTILLA, JSON.stringify(state.diasLaborables));
      showToast(`Plantilla semanal actualizada (${state.diasLaborables.join(', ')}).`, 'success', 'Plantilla Guardada');
    } catch (err) {
      handleSupabaseError(err, 'No se pudo guardar la plantilla semanal.');
    } finally {
      hideSpinner();
    }
  });

  // Navegación Mes/Semana Anterior, Siguiente y Hoy
  container.querySelector('#btn-agenda-prev')?.addEventListener('click', () => {
    if (state.modoVista === 'mensual') {
      state.mes -= 1;
      if (state.mes < 0) {
        state.mes = 11;
        state.anio -= 1;
      }
    } else {
      state.fechaFocoSemanal = sumarDiasIso(state.fechaFocoSemanal, -7);
      const p = state.fechaFocoSemanal.split('-').map(Number);
      state.anio = p[0];
      state.mes = p[1] - 1;
    }
    renderSeccionCalendarioAgenda(container, {
      idCuidador,
      capacidadMaxCuidador,
      disponibilidad,
      reservas,
      plantillaSemanal: state.diasLaborables,
      estadoVista: state,
      onCambioAgenda
    });
  });

  container.querySelector('#btn-agenda-next')?.addEventListener('click', () => {
    if (state.modoVista === 'mensual') {
      state.mes += 1;
      if (state.mes > 11) {
        state.mes = 0;
        state.anio += 1;
      }
    } else {
      state.fechaFocoSemanal = sumarDiasIso(state.fechaFocoSemanal, 7);
      const p = state.fechaFocoSemanal.split('-').map(Number);
      state.anio = p[0];
      state.mes = p[1] - 1;
    }
    renderSeccionCalendarioAgenda(container, {
      idCuidador,
      capacidadMaxCuidador,
      disponibilidad,
      reservas,
      plantillaSemanal: state.diasLaborables,
      estadoVista: state,
      onCambioAgenda
    });
  });

  container.querySelector('#btn-agenda-hoy')?.addEventListener('click', () => {
    state.anio = hoyParts[0];
    state.mes = hoyParts[1] - 1;
    state.fechaFocoSemanal = hoyIso;
    renderSeccionCalendarioAgenda(container, {
      idCuidador,
      capacidadMaxCuidador,
      disponibilidad,
      reservas,
      plantillaSemanal: state.diasLaborables,
      estadoVista: state,
      onCambioAgenda
    });
  });

  // Conmutar vista Mensual vs Semanal
  container.querySelectorAll('[data-vista-modo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.modoVista = btn.getAttribute('data-vista-modo');
      renderSeccionCalendarioAgenda(container, {
        idCuidador,
        capacidadMaxCuidador,
        disponibilidad,
        reservas,
        plantillaSemanal: state.diasLaborables,
        estadoVista: state,
        onCambioAgenda
      });
    });
  });

  // Clic en cualquier día para abrir el Modal de Configuración Diaria y Horaria
  container.querySelectorAll('[data-action="configurar-dia"]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const fechaIso = cell.getAttribute('data-fecha');
      if (!fechaIso) return;
      abrirModalConfigurarDiaAgenda({
        fechaIso,
        idCuidador,
        capacidadMaxCuidador,
        bloquesExistentes: mapaBloquesPorFecha.get(fechaIso) || [],
        reservasDelDia: mapaReservasPorFecha.get(fechaIso) || [],
        onAgendaActualizada: (nuevaAgenda) => {
          if (typeof onCambioAgenda === 'function') {
            onCambioAgenda(nuevaAgenda);
          } else {
            renderSeccionCalendarioAgenda(container, {
              idCuidador,
              capacidadMaxCuidador,
              disponibilidad: nuevaAgenda,
              reservas,
              plantillaSemanal: state.diasLaborables,
              estadoVista: state,
              onCambioAgenda
            });
          }
        }
      });
    });
  });
}

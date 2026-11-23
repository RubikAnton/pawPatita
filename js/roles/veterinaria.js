/**
 * Paw Patita Cusco v5.0 — Panel de Clínica Veterinaria Aliada
 * js/roles/veterinaria.js
 *
 * Implementa con exactitud matemática y 0 `undefined`:
 *  1. Cabecera Identificatoria Oficial:
 *     - Nombre oficial de la Clínica Veterinaria autenticada, código (`VET-001`), RUC,
 *       distrito y dirección de sede en Cusco, colegiatura CMVP, badge de horario (`24 Horas` / `Extendido` / `Diurno`)
 *       y línea directa de emergencias.
 *  2. Sección 1 — Central S.O.S. Veterinaria (Realtime):
 *     - Bandeja de incidencias derivadas sin ningún `undefined` (código SOS, severidad, mascota + PAW-ID + alergias,
 *       propietario + teléfono, cuidador a cargo + teléfono, ubicación en Cusco, hora exacta y síntomas).
 *     - Suscripción Supabase Realtime a `incidencias_emergencias`.
 *     - Máquina de estados clínica vía modales Bootstrap 5 (cero `prompt()`) invocando `rpc_vet_actualizar_sos`:
 *         * Tomar Caso (`emitida` -> `en_atencion`)
 *         * Estabilizar Paciente (`en_atencion` -> `estabilizada` con diagnóstico preliminar y tratamiento inicial)
 *         * Registrar Diagnóstico y Alta (`en_atencion` | `estabilizada` -> `resuelta` con diagnóstico clínico obligatorio,
 *           tratamiento aplicado, informe de alta y costo referencial en S/).
 *  3. Sección 2 — Validación Oficial de Fichas PAW-ID:
 *     - Listado de mascotas con filtro entre *Pendientes de Validación*, *Historial Auditado (Validadas / Observadas)* y *Todas*.
 *     - Edad real calculada dinámicamente desde `fecha_nacimiento`, datos reales del propietario,
 *       visor de cartilla de vacunación ampliable con zoom interactivo + nueva pestaña y Carné PAW-ID con QR.
 *     - Botones funcionales para **Validar Carné** (otorga sello oficial CMVP con vacunas verificadas y fecha de vigencia)
 *       u **Observar** (con motivo médico obligatorio) llamando a `rpc_vet_dictaminar_ficha`.
 *  4. Sección 3 — Configuración de Sede Clínica Aliada en Cusco:
 *     - Edición de teléfono 24h, horario, tarifa de consulta de urgencia, dirección/distrito y especialidades.
 */

import { getSupabase, isSupabaseConfigured, subscribeRealtime } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import {
  calcularEdadDinamica,
  formatFechaEs,
  formatMoneda,
  escapeHtml,
  getHoyIso,
  sumarDiasIso,
  exportarCsv
} from '../utils/formatters.js';
import {
  showSpinner,
  hideSpinner,
  showToast,
  crearModalDinamico,
  handleSupabaseError
} from '../utils/ui-helpers.js';
import {
  normalizarMascota,
  renderBadgeSanitario,
  abrirModalCarnetPawId,
  MASCOTAS_SEED_OWNER
} from '../components/carnet-digital.js';
import { CLINICAS_CUSCO_SOS, SOS_SEED_OWNER } from '../components/alerta-sos.js';

const STORAGE_KEY_SOS = 'paw_demo_sos_owner_v5';
const STORAGE_KEY_MASCOTAS = 'paw_demo_mascotas_v5';
const STORAGE_KEY_CLINICAS = 'paw_demo_clinicas_v5';
const STORAGE_KEY_VALIDACIONES = 'paw_demo_validaciones_vet_v5';
const STORAGE_KEY_AUDITORIA = 'paw_demo_auditoria_v5';

// Semilla completa de mascotas de Cusco (incluyendo Chaska del turista Martin Dupont)
export const MASCOTAS_SEED_VET = [
  ...MASCOTAS_SEED_OWNER.map((m) => ({
    ...m,
    propietario_nombre: 'Lucía Mendoza Vargas',
    propietario_telefono: '+51 984 234 567',
    propietario_email: 'lucia.mendoza@gmail.com',
    propietario_distrito: 'Wanchaq'
  })),
  {
    id: '80000000-0000-0000-0000-000000000003',
    paw_id: 'PAW-1003',
    id_propietario: '50000000-0000-0000-0000-000000000003',
    propietario_nombre: 'Martin Dupont (Turista - Francia)',
    propietario_telefono: '+33 6 12 34 56 78',
    propietario_email: 'martin.dupont@france.fr',
    propietario_distrito: 'Cusco Centro (Hotel Palacio del Inka)',
    nombre: 'Chaska',
    raza: 'French Poodle',
    fecha_nacimiento: '2022-03-20',
    tamano: 'Pequeño',
    sexo: 'Hembra',
    peso_kg: 5.8,
    esterilizado: true,
    vacunas_al_dia: true,
    fecha_venc_vacunas: '2027-05-20',
    cartilla_vacunas_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    alergias_restricciones: 'Sensible al frío nocturno (usar abrigo en noches de Cusco)',
    medicacion_actual: 'Gotas oftálmicas lubricantes cada noche',
    dieta_alimentacion: 'Alimento hipoalergénico 120g diarios',
    conducta_observaciones: 'Tranquila, acostumbrada a viajar en cabina y hoteles.',
    foto_url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&auto=format&fit=crop&q=80',
    estado_validacion_vet: 'validado',
    id_clinica_validadora: '40000000-0000-0000-0000-000000000002',
    clinica_validadora_nombre: 'Centro Médico Veterinario Qorikancha Pet',
    clinica_validadora_cmvp: 'CMVP-CUSCO-5104',
    observacion_veterinaria: 'Certificado zoosanitario internacional y vacuna antirrábica verificados.',
    fecha_ultima_validacion: '2026-11-18T11:20:00-05:00',
    activa: true
  }
];

export const VALIDACIONES_SEED_VET = [
  {
    id: '85000000-0000-0000-0000-000000000001',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    paw_id: 'PAW-6858',
    mascota_nombre: 'Inti',
    mascota_raza: 'Golden Retriever',
    propietario_nombre: 'Lucía Mendoza Vargas',
    id_clinica: '40000000-0000-0000-0000-000000000001',
    clinica_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    colegiatura_cmvp: 'CMVP-CUSCO-4821',
    medico_vet: 'Dra. Claudia Salazar Cáceres',
    resultado: 'validado',
    vacunas_verificadas: 'Séxtuple Canina, Antirrábica, Bordetella (KC) y Desparasitación Interna/Externa',
    vigencia_hasta: '2027-07-15',
    observaciones_medicas: 'Paciente en excelente condición clínica. Sello CMVP verificado.',
    fecha_validacion: '2026-11-07T10:30:00-05:00'
  },
  {
    id: '85000000-0000-0000-0000-000000000002',
    id_mascota: '80000000-0000-0000-0000-000000000003',
    paw_id: 'PAW-1003',
    mascota_nombre: 'Chaska',
    mascota_raza: 'French Poodle',
    propietario_nombre: 'Martin Dupont',
    id_clinica: '40000000-0000-0000-0000-000000000002',
    clinica_nombre: 'Centro Médico Veterinario Qorikancha Pet',
    colegiatura_cmvp: 'CMVP-CUSCO-5104',
    medico_vet: 'Dr. Marco Polo',
    resultado: 'validado',
    vacunas_verificadas: 'Pasaporte Europeo + Antirrábica Vigente + Antiparasitario',
    vigencia_hasta: '2027-05-20',
    observaciones_medicas: 'Apto para custodia turística en Cusco.',
    fecha_validacion: '2026-11-18T11:20:00-05:00'
  },
  {
    id: '85000000-0000-0000-0000-000000000003',
    id_mascota: '80000000-0000-0000-0000-000000000004',
    paw_id: 'PAW-1004',
    mascota_nombre: 'Wayra',
    mascota_raza: 'Schnauzer Miniatura',
    propietario_nombre: 'Lucía Mendoza Vargas',
    id_clinica: '40000000-0000-0000-0000-000000000001',
    clinica_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    colegiatura_cmvp: 'CMVP-CUSCO-4821',
    medico_vet: 'Dra. Claudia Salazar Cáceres',
    resultado: 'observado',
    vacunas_verificadas: 'Séxtuple presente; falta sello de refuerzo Antirrábico 2026',
    vigencia_hasta: null,
    observaciones_medicas: 'Observación Clínica: El refuerzo anual de vacuna Antirrábica figura vencido. Subir foto del sello actualizado.',
    fecha_validacion: '2026-11-20T16:15:00-05:00'
  }
];

const CLINICA_DEFAULT_DEMO = {
  id: '40000000-0000-0000-0000-000000000001',
  codigo_clinica: 'VET-001',
  ruc: '20601234561',
  nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
  email_institucional: 'emergencias@vetsanfranciscocusco.pe',
  direccion: 'Av. de la Cultura 1420, frente a UNSAAC',
  distrito_cusco: 'Wanchaq',
  latitud: -13.5226,
  longitud: -71.9612,
  telefono_emergencia: '+51 984 711 222',
  horario_atencion: '24 Horas',
  especialidades: ['Emergencias 24h', 'Traumatología', 'UCI Canina', 'Laboratorio Clínico'],
  tarifa_consulta_emergencia: 60.00,
  colegiatura_cmvp: 'CMVP-CUSCO-4821',
  estado_afiliacion: 'activa',
  activa: true
};

// Estado reactivo del Panel Veterinaria
const vetState = {
  activeTab: 'central-sos', // 'central-sos' | 'validar-paw-id' | 'config-sede'
  filtroSosEstado: 'todos', // 'todos' | 'activos' | 'emitida' | 'en_atencion' | 'estabilizada' | 'resuelta'
  filtroPawIdTab: 'pendientes', // 'pendientes' | 'auditados' | 'todos'
  busquedaPawId: '',
  profile: null,
  clinica: { ...CLINICA_DEFAULT_DEMO },
  alertasSos: [],
  mascotas: [],
  historialValidaciones: []
};

/**
 * Registra un evento en la bitácora local de auditoría para trazabilidad en vivo con el Panel Admin
 */
function registrarEventoAuditoriaLocal({
  entidad,
  id_registro,
  accion = 'UPDATE',
  estado_anterior = '—',
  estado_nuevo = '—',
  detalle = ''
}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDITORIA);
    const list = raw ? JSON.parse(raw) : [];
    const actorNombre = vetState.profile?.nombre
      ? `${vetState.profile.nombre} (${vetState.clinica?.nombre || 'Clínica Aliada'})`
      : `Dra. Claudia Salazar (${vetState.clinica?.nombre || 'VET-001'})`;

    list.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entidad,
      id_registro,
      accion,
      estado_anterior,
      estado_nuevo,
      actor_nombre: actorNombre,
      actor_rol: 'veterinaria',
      detalle,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEY_AUDITORIA, JSON.stringify(list.slice(0, 150)));
  } catch (_) { /* ignore */ }
}

/**
 * Normaliza un registro de mascota para la vista médica veterinaria con 0 `undefined`
 */
function normalizarMascotaVeterinaria(m) {
  const base = normalizarMascota(m);
  const esMartin = m.id_propietario === '50000000-0000-0000-0000-000000000003' || m.paw_id === 'PAW-1003';
  const propUsuario = m.perfiles_usuarios || m.propietario || {};

  const propNombre = m.propietario_nombre
    || (propUsuario.nombre ? `${propUsuario.nombre} ${propUsuario.apellido || ''}`.trim() : '')
    || (esMartin ? 'Martin Dupont (Turista)' : 'Lucía Mendoza Vargas');

  const propTel = m.propietario_telefono
    || propUsuario.telefono
    || (esMartin ? '+33 6 12 34 56 78' : '+51 984 234 567');

  const propDistrito = m.propietario_distrito
    || propUsuario.distrito_cusco
    || (esMartin ? 'Cusco Centro' : 'Wanchaq');

  return {
    ...base,
    propietario_nombre: propNombre,
    propietario_telefono: propTel,
    propietario_distrito: propDistrito,
    cartilla_vacunas_url: base.cartilla_vacunas_url
      || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80'
  };
}

/**
 * Normaliza una incidencia S.O.S. para la Central Veterinaria con 0 `undefined`
 */
function normalizarIncidenciaSosVeterinaria(inc) {
  const mascotaMatch = vetState.mascotas.find(
    (m) => m.id === inc.id_mascota || m.paw_id === inc.mascota_paw_id
  ) || normalizarMascotaVeterinaria(MASCOTAS_SEED_VET[0]);

  const clinicaMatch = CLINICAS_CUSCO_SOS.find((c) => c.id === inc.id_clinica_derivada)
    || vetState.clinica
    || CLINICA_DEFAULT_DEMO;

  const estado = (inc.estado_sos || inc.estado || 'emitida').toLowerCase();
  const severidad = (inc.nivel_severidad || inc.severidad || 'moderada').toLowerCase();

  return {
    id: inc.id || `95000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
    codigo_sos: inc.codigo_sos || 'SOS-2026-0101',
    id_reserva: inc.id_reserva || '90000000-0000-0000-0000-000000000002',
    codigo_reserva: inc.codigo_reserva || inc.reservas?.codigo_reserva || 'RES-2026-0102',
    id_mascota: inc.id_mascota || mascotaMatch.id,
    mascota_nombre: inc.mascota_nombre || inc.mascotas?.nombre || mascotaMatch.nombre || 'Inti',
    mascota_paw_id: inc.mascota_paw_id || inc.mascotas?.paw_id || mascotaMatch.paw_id || 'PAW-6858',
    mascota_raza: inc.mascota_raza || inc.mascotas?.raza || mascotaMatch.raza || 'Golden Retriever',
    mascota_edad_texto: mascotaMatch.edad_texto || '3 años y 4 meses',
    mascota_peso_kg: inc.mascota_peso_kg || inc.mascotas?.peso_kg || mascotaMatch.peso_kg || '28.5',
    mascota_alergias: inc.mascota_alergias || inc.mascotas?.alergias_restricciones || mascotaMatch.alergias_restricciones || 'Ninguna reportada',
    mascota_medicacion: inc.mascota_medicacion || inc.mascotas?.medicacion_actual || mascotaMatch.medicacion_actual || 'Ninguna',
    mascota_foto: inc.mascota_foto || inc.mascotas?.foto_url || mascotaMatch.foto_url,
    propietario_nombre: inc.propietario_nombre || mascotaMatch.propietario_nombre || 'Lucía Mendoza Vargas',
    propietario_telefono: inc.propietario_telefono || mascotaMatch.propietario_telefono || '+51 984 234 567',
    cuidador_nombre: inc.cuidador_nombre || 'Valeria Huamán Delgado',
    cuidador_telefono: inc.cuidador_telefono || '+51 984 311 111',
    cuidador_distrito: inc.cuidador_distrito || 'Wanchaq',
    id_clinica_derivada: inc.id_clinica_derivada || clinicaMatch.id,
    clinica_nombre: inc.clinica_nombre || inc.clinicas_veterinarias?.nombre || clinicaMatch.nombre,
    clinica_telefono: inc.clinica_telefono || inc.clinicas_veterinarias?.telefono_emergencia || clinicaMatch.telefono_emergencia,
    clinica_direccion: inc.clinica_direccion || inc.clinicas_veterinarias?.direccion || clinicaMatch.direccion,
    nivel_severidad: severidad,
    tipo_incidencia: inc.tipo_incidencia || 'Urgencia Veterinaria S.O.S.',
    descripcion: inc.descripcion || 'Evaluación médica de urgencia en Cusco.',
    ubicacion_emergencia: inc.ubicacion_emergencia || 'Parque Marianito Ferro, Wanchaq - Cusco',
    estado_sos: estado,
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
 * Carga y sincroniza todas las mascotas de Cusco (fusionando las creadas por el propietario en localStorage)
 */
function getLocalMascotasVet() {
  let ownerPets = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASCOTAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) ownerPets = parsed;
    }
  } catch (_) { /* ignore */ }

  const mapa = new Map();
  MASCOTAS_SEED_VET.forEach((m) => mapa.set(m.id, normalizarMascotaVeterinaria(m)));
  ownerPets.forEach((m) => {
    if (m && m.id) {
      const prev = mapa.get(m.id) || {};
      mapa.set(m.id, normalizarMascotaVeterinaria({ ...prev, ...m }));
    }
  });

  const list = Array.from(mapa.values()).filter((m) => m.activa !== false);
  return list;
}

function saveLocalMascotaActualizada(mascotaActualizada) {
  const norm = normalizarMascotaVeterinaria(mascotaActualizada);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MASCOTAS);
    const list = raw ? JSON.parse(raw) : [...MASCOTAS_SEED_OWNER];
    const idx = list.findIndex((item) => item.id === norm.id || item.paw_id === norm.paw_id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...norm };
    } else {
      list.push(norm);
    }
    localStorage.setItem(STORAGE_KEY_MASCOTAS, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

function getLocalSosVet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizarIncidenciaSosVeterinaria);
      }
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(SOS_SEED_OWNER));
  return SOS_SEED_OWNER.map(normalizarIncidenciaSosVeterinaria);
}

function saveLocalSosVet(list) {
  try {
    localStorage.setItem(STORAGE_KEY_SOS, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

function getLocalValidacionesVet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VALIDACIONES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_VALIDACIONES, JSON.stringify(VALIDACIONES_SEED_VET));
  return [...VALIDACIONES_SEED_VET];
}

function saveLocalValidacionesVet(list) {
  try {
    localStorage.setItem(STORAGE_KEY_VALIDACIONES, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Carga todos los datos de la Clínica Veterinaria Aliada desde Supabase o semilla local sincronizada
 */
async function cargarDatosPanelVeterinaria(profile) {
  const supabase = getSupabase();
  let clinica = { ...CLINICA_DEFAULT_DEMO };

  // Verificar si la clínica fue editada localmente
  try {
    const rawClinicas = localStorage.getItem(STORAGE_KEY_CLINICAS);
    if (rawClinicas) {
      const parsedClinicas = JSON.parse(rawClinicas);
      const match = Array.isArray(parsedClinicas)
        ? parsedClinicas.find((c) => c.id === (profile?.id_clinica_asociada || CLINICA_DEFAULT_DEMO.id))
        : null;
      if (match) clinica = { ...clinica, ...match };
    }
  } catch (_) { /* ignore */ }

  let mascotas = getLocalMascotasVet();
  let alertasSos = null;
  let historialValidaciones = getLocalValidacionesVet();

  if (supabase && isSupabaseConfigured()) {
    try {
      const idClinicaAsociada = profile?.id_clinica_asociada || CLINICA_DEFAULT_DEMO.id;
      const [resClinica, resMascotas, resSos, resVal] = await Promise.all([
        supabase.from('clinicas_veterinarias').select('*').eq('id', idClinicaAsociada).maybeSingle(),
        supabase.from('v_resumen_mascotas').select('*').eq('activa', true).order('created_at', { ascending: false }),
        supabase
          .from('incidencias_emergencias')
          .select('*, mascotas(nombre, paw_id, raza, peso_kg, alergias_restricciones, medicacion_actual, foto_url), clinicas_veterinarias(nombre, telefono_emergencia, direccion), reservas(codigo_reserva)')
          .order('fecha_incidencia', { ascending: false }),
        supabase
          .from('validaciones_veterinarias')
          .select('*, mascotas(nombre, paw_id, raza), clinicas_veterinarias(nombre, colegiatura_cmvp)')
          .order('created_at', { ascending: false })
      ]);

      if (!resClinica.error && resClinica.data) {
        clinica = { ...clinica, ...resClinica.data };
      }
      if (!resMascotas.error && Array.isArray(resMascotas.data) && resMascotas.data.length > 0) {
        mascotas = resMascotas.data.map(normalizarMascotaVeterinaria);
      }
      if (!resSos.error && Array.isArray(resSos.data) && resSos.data.length > 0) {
        vetState.mascotas = mascotas;
        alertasSos = resSos.data.map(normalizarIncidenciaSosVeterinaria);
        saveLocalSosVet(alertasSos);
      }
      if (!resVal.error && Array.isArray(resVal.data) && resVal.data.length > 0) {
        historialValidaciones = resVal.data.map((v) => ({
          id: v.id,
          id_mascota: v.id_mascota,
          paw_id: v.mascotas?.paw_id || 'PAW-ID',
          mascota_nombre: v.mascotas?.nombre || 'Mascota',
          mascota_raza: v.mascotas?.raza || 'Mestizo',
          id_clinica: v.id_clinica,
          clinica_nombre: v.clinicas_veterinarias?.nombre || clinica.nombre,
          colegiatura_cmvp: v.clinicas_veterinarias?.colegiatura_cmvp || clinica.colegiatura_cmvp,
          resultado: v.resultado,
          vacunas_verificadas: v.vacunas_verificadas,
          vigencia_hasta: v.vigencia_hasta,
          observaciones_medicas: v.observaciones_medicas,
          fecha_validacion: v.created_at || v.fecha_validacion
        }));
      }
    } catch (err) {
      console.warn('Usando datos sincronizados locales en Panel Veterinaria:', err);
    }
  }

  vetState.clinica = clinica;
  vetState.mascotas = mascotas;
  vetState.alertasSos = alertasSos || getLocalSosVet();
  vetState.historialValidaciones = historialValidaciones;
}

/**
 * Configura la suscripción Supabase Realtime para nuevas emergencias S.O.S.
 */
function inicializarRealtimeVeterinaria(container) {
  subscribeRealtime('canal-vet-sos-live', 'incidencias_emergencias', '*', async () => {
    await cargarDatosPanelVeterinaria(vetState.profile);
    renderContenidoPanelVeterinaria(container);
    showToast(
      '🚨 Actualización en tiempo real recibida en la Central S.O.S. Veterinaria.',
      'danger',
      'Central S.O.S. Cusco 24h'
    );
  });
}

/**
 *Entrypoint principal montado por `js/router.js` en la ruta `#/veterinaria`
 */
export async function renderPanelVeterinaria(container, profile) {
  if (!container) return;
  vetState.profile = profile || {
    id: '50000000-0000-0000-0000-000000000004',
    nombre: 'Dra. Claudia Salazar Cáceres',
    email: 'vet.sanfrancisco@pawpatitacusco.pe',
    rol: 'veterinaria',
    distrito_cusco: 'Wanchaq',
    id_clinica_asociada: '40000000-0000-0000-0000-000000000001'
  };

  showSpinner('Cargando Central S.O.S. y Bandeja Sanitaria PAW-ID...');
  try {
    await cargarDatosPanelVeterinaria(vetState.profile);
    renderContenidoPanelVeterinaria(container);
    inicializarRealtimeVeterinaria(container);
  } catch (err) {
    handleSupabaseError(err, 'No se pudo cargar el Panel de Clínica Veterinaria.');
  } finally {
    hideSpinner();
  }
}

/**
 * Renderiza el layout completo (Cabecera de Sede + Sidebar + KPIs + Pestaña Activa)
 */
function renderContenidoPanelVeterinaria(container) {
  if (!container) return;

  const c = vetState.clinica || CLINICA_DEFAULT_DEMO;
  const medicoNombre = vetState.profile?.nombre
    ? `${vetState.profile.nombre} ${vetState.profile.apellido || ''}`.trim()
    : 'Dra. Claudia Salazar Cáceres';

  const sosActivos = vetState.alertasSos.filter((s) => s.estado_sos !== 'resuelta');
  const sosResueltos = vetState.alertasSos.filter((s) => s.estado_sos === 'resuelta');
  const mascotasPendientes = vetState.mascotas.filter((m) => m.estado_validacion_vet === 'pendiente');
  const mascotasValidadas = vetState.mascotas.filter((m) => m.estado_validacion_vet === 'validado');
  const mascotasObservadas = vetState.mascotas.filter((m) => m.estado_validacion_vet === 'observado');

  const inicialesClinica = 'SF';

  container.innerHTML = `
    <div class="container">
      <div class="panel-dashboard-shell">
        <!-- SIDEBAR DE CLÍNICA VETERINARIA ALIADA -->
        <aside class="panel-sidebar">
          <div class="panel-sidebar-profile" style="background: linear-gradient(135deg, #1E3A5F 0%, #0F243C 100%);">
            <div class="d-flex align-items-center gap-3 mb-2">
              <div class="panel-avatar-circle" style="background: linear-gradient(135deg, #D90429, #FF6B35);">
                <i class="bi bi-hospital-fill fs-4"></i>
              </div>
              <div class="min-w-0">
                <span class="badge bg-warning text-dark fw-bold mb-1">
                  ${escapeHtml(c.codigo_clinica || 'VET-001')} • ${escapeHtml(c.horario_atencion || '24 Horas')}
                </span>
                <h6 class="fw-bold text-white mb-0 text-truncate" title="${escapeHtml(c.nombre)}">
                  ${escapeHtml(c.nombre)}
                </h6>
                <div class="small text-white-50 text-truncate">
                  <i class="bi bi-geo-alt-fill text-warning me-1"></i>Sede ${escapeHtml(c.distrito_cusco)} — Cusco
                </div>
              </div>
            </div>

            <div class="p-2 rounded-3 mt-2 small" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-white-50">Colegiatura:</span>
                <strong class="text-warning font-monospace">${escapeHtml(c.colegiatura_cmvp)}</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-1">
                <span class="text-white-50">RUC Oficial:</span>
                <strong class="text-white font-monospace">${escapeHtml(c.ruc)}</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center mt-1">
                <span class="text-white-50">Médico Resp.:</span>
                <strong class="text-white">${escapeHtml(medicoNombre)}</strong>
              </div>
            </div>
          </div>

          <nav class="panel-nav-menu" aria-label="Menú Clínica Veterinaria">
            <button type="button" class="panel-nav-btn nav-btn-sos ${vetState.activeTab === 'central-sos' ? 'active' : ''}" data-vet-tab="central-sos">
              <span class="nav-icon-wrap">
                <i class="bi bi-heart-pulse-fill"></i>
                <span>1. Central S.O.S. 24h</span>
              </span>
              <span class="badge ${sosActivos.length > 0 ? 'bg-danger' : 'bg-secondary'} rounded-pill">${sosActivos.length}</span>
            </button>

            <button type="button" class="panel-nav-btn ${vetState.activeTab === 'validar-paw-id' ? 'active' : ''}" data-vet-tab="validar-paw-id">
              <span class="nav-icon-wrap">
                <i class="bi bi-qr-code-scan"></i>
                <span>2. Validar Fichas PAW-ID</span>
              </span>
              <span class="badge ${mascotasPendientes.length > 0 ? 'bg-warning text-dark' : 'bg-success'} rounded-pill">${mascotasPendientes.length}</span>
            </button>

            <button type="button" class="panel-nav-btn ${vetState.activeTab === 'config-sede' ? 'active' : ''}" data-vet-tab="config-sede">
              <span class="nav-icon-wrap">
                <i class="bi bi-sliders2-vertical"></i>
                <span>3. Configuración de Sede</span>
              </span>
            </button>

            <hr class="my-2 d-none d-lg-block">

            <a href="#/catalogo" class="panel-nav-btn text-decoration-none">
              <span class="nav-icon-wrap">
                <i class="bi bi-compass"></i>
                <span>Ver Red & Mapa Cusco</span>
              </span>
              <i class="bi bi-arrow-up-right small"></i>
            </a>
          </nav>
        </aside>

        <!-- ÁREA PRINCIPAL DEL PANEL DE CLÍNICA VETERINARIA -->
        <section class="panel-main-area">
          <!-- CABECERA IDENTIFICATORIA OFICIAL DE LA CLÍNICA EN LA BARRA SUPERIOR -->
          <div class="panel-hero-banner" style="border-left-color: #D90429; background: linear-gradient(125deg, #FFFFFF 0%, #FFF5F5 100%);">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span class="badge bg-danger"><i class="bi bi-hospital-fill me-1"></i>CLÍNICA VETERINARIA ALIADA OFICIAL</span>
                  <span class="badge bg-dark font-monospace">${escapeHtml(c.codigo_clinica)}</span>
                  <span class="badge bg-success"><i class="bi bi-patch-check-fill me-1"></i>${escapeHtml(c.colegiatura_cmvp)}</span>
                  <span class="badge bg-warning text-dark"><i class="bi bi-clock-fill me-1"></i>Atención: ${escapeHtml(c.horario_atencion)}</span>
                </div>
                <h3 class="fw-bold text-dark mb-1">${escapeHtml(c.nombre)}</h3>
                <div class="text-secondary small">
                  <i class="bi bi-geo-alt-fill text-danger me-1"></i><strong>Sede Cusco (${escapeHtml(c.distrito_cusco)}):</strong> ${escapeHtml(c.direccion)}
                  <span class="mx-2">•</span>
                  <i class="bi bi-telephone-fill text-success me-1"></i><strong>Línea S.O.S.:</strong> ${escapeHtml(c.telefono_emergencia)}
                  <span class="mx-2">•</span>
                  <i class="bi bi-person-badge-fill text-primary me-1"></i><strong>Director Médico:</strong> ${escapeHtml(medicoNombre)}
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2">
                <button type="button" class="btn btn-outline-danger btn-sm fw-bold" id="btn-vet-simular-sos">
                  <i class="bi bi-broadcast-pin me-1"></i>Simular Ingreso S.O.S.
                </button>
                <button type="button" class="btn btn-paw-outline btn-sm" id="btn-vet-refrescar">
                  <i class="bi bi-arrow-clockwise me-1"></i>Sincronizar Central
                </button>
              </div>
            </div>
          </div>

          <!-- 4 TARJETAS KPI MÉDICAS Y SANITARIAS -->
          <div class="kpi-grid-owner">
            <div class="kpi-card-paw">
              <div class="kpi-icon-box kpi-rojo"><i class="bi bi-heart-pulse-fill"></i></div>
              <div>
                <div class="kpi-label">Alertas S.O.S. Activas</div>
                <div class="kpi-value text-danger">${sosActivos.length}</div>
                <div class="small text-muted">En triaje o estabilización</div>
              </div>
            </div>

            <div class="kpi-card-paw">
              <div class="kpi-icon-box kpi-turquesa"><i class="bi bi-clipboard2-check-fill"></i></div>
              <div>
                <div class="kpi-label">S.O.S. Dados de Alta</div>
                <div class="kpi-value text-success">${sosResueltos.length}</div>
                <div class="small text-muted">Con informe clínico cerrado</div>
              </div>
            </div>

            <div class="kpi-card-paw">
              <div class="kpi-icon-box kpi-oro"><i class="bi bi-hourglass-split"></i></div>
              <div>
                <div class="kpi-label">PAW-ID Por Validar</div>
                <div class="kpi-value">${mascotasPendientes.length}</div>
                <div class="small text-muted">Cartillas en cola sanitaria</div>
              </div>
            </div>

            <div class="kpi-card-paw">
              <div class="kpi-icon-box kpi-andino"><i class="bi bi-shield-fill-check"></i></div>
              <div>
                <div class="kpi-label">Carnés Auditados CMVP</div>
                <div class="kpi-value">${mascotasValidadas.length + mascotasObservadas.length}</div>
                <div class="small text-muted">${mascotasValidadas.length} validados • ${mascotasObservadas.length} obs.</div>
              </div>
            </div>
          </div>

          <!-- CONTENEDOR DINÁMICO DE LA SUB-SECCIÓN ACTIVA -->
          <div id="vet-tab-workspace"></div>
        </section>
      </div>
    </div>
  `;

  // Navegación entre pestañas
  container.querySelectorAll('[data-vet-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vetState.activeTab = btn.getAttribute('data-vet-tab');
      renderContenidoPanelVeterinaria(container);
    });
  });

  // Botón refrescar
  container.querySelector('#btn-vet-refrescar')?.addEventListener('click', async () => {
    showSpinner('Actualizando Central S.O.S. y Fichas PAW-ID...');
    try {
      await cargarDatosPanelVeterinaria(vetState.profile);
      renderContenidoPanelVeterinaria(container);
      showToast('Central Veterinaria sincronizada con éxito.', 'success');
    } finally {
      hideSpinner();
    }
  });

  // Botón para simular llegada de una nueva emergencia S.O.S. en tiempo real (útil para demostración de triaje desde Emitida)
  container.querySelector('#btn-vet-simular-sos')?.addEventListener('click', () => {
    abrirModalSimularLlegadaSos(container);
  });

  const workspace = container.querySelector('#vet-tab-workspace');
  if (vetState.activeTab === 'central-sos') {
    renderSeccionCentralSosVeterinaria(workspace, container);
  } else if (vetState.activeTab === 'validar-paw-id') {
    renderSeccionValidarPawIdVeterinaria(workspace, container);
  } else if (vetState.activeTab === 'config-sede') {
    renderSeccionConfiguracionSede(workspace, container);
  }
}

/* ==========================================================================
   SECCIÓN 1: CENTRAL S.O.S. VETERINARIA (REALTIME + FLUJO CLÍNICO COMPLETO)
   ========================================================================== */

function renderBadgeEstadoSosVet(estado) {
  const est = (estado || 'emitida').toLowerCase();
  const map = {
    emitida: {
      cls: 'bg-danger text-white',
      icon: 'bi-megaphone-fill',
      label: '1. EMITIDA (Requiere Triaje Inmediato)'
    },
    en_atencion: {
      cls: 'bg-warning text-dark',
      icon: 'bi-heart-pulse-fill',
      label: '2. EN ATENCIÓN MÉDICA'
    },
    estabilizada: {
      cls: 'bg-info text-dark',
      icon: 'bi-shield-plus',
      label: '3. PACIENTE ESTABILIZADO'
    },
    resuelta: {
      cls: 'bg-success text-white',
      icon: 'bi-check-circle-fill',
      label: '4. RESUELTA / ALTA MÉDICA'
    }
  };
  const cfg = map[est] || map.emitida;
  return `<span class="badge ${cfg.cls} px-2 py-1"><i class="bi ${cfg.icon} me-1"></i>${cfg.label}</span>`;
}

function renderStepperClinicoVet(estadoActual) {
  const etapas = [
    { key: 'emitida', label: '1. Alerta Emitida', icon: 'bi-megaphone-fill' },
    { key: 'en_atencion', label: '2. En Atención Vet', icon: 'bi-heart-pulse-fill' },
    { key: 'estabilizada', label: '3. Estabilizada', icon: 'bi-shield-plus' },
    { key: 'resuelta', label: '4. Alta / Resuelta', icon: 'bi-check-circle-fill' }
  ];
  const idxActual = Math.max(0, etapas.findIndex((e) => e.key === estadoActual));

  return `
    <div class="sos-stepper-track my-3">
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

function renderSeccionCentralSosVeterinaria(workspace, rootContainer) {
  if (!workspace) return;
  const moneda = localStorage.getItem('paw_currency') || 'PEN';
  const todas = vetState.alertasSos.map(normalizarIncidenciaSosVeterinaria);

  const filtradas = todas.filter((s) => {
    if (vetState.filtroSosEstado === 'todos') return true;
    if (vetState.filtroSosEstado === 'activos') return s.estado_sos !== 'resuelta';
    return s.estado_sos === vetState.filtroSosEstado;
  });

  workspace.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-danger-subtle text-danger fw-bold mb-1">
            <i class="bi bi-broadcast me-1"></i>CANAL REALTIME CONECTADO • TRIAJE VETERINARIO CUSCO
          </span>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-hospital-fill text-danger me-2"></i>Central S.O.S. Veterinaria — Bandeja de Incidencias Derivadas (${filtradas.length})
          </h5>
          <p class="text-secondary small mb-0">
            Flujo clínico auditable: <strong>Emitida</strong> → <strong>En Atención</strong> → <strong>Estabilizada</strong> → <strong>Resuelta (Alta Médica)</strong>.
          </p>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <select class="form-select form-select-sm" id="vet-filtro-sos-estado" style="min-width: 210px;">
            <option value="todos" ${vetState.filtroSosEstado === 'todos' ? 'selected' : ''}>Todas las incidencias (${todas.length})</option>
            <option value="activos" ${vetState.filtroSosEstado === 'activos' ? 'selected' : ''}>Solo Emergencias Activas (${todas.filter((x) => x.estado_sos !== 'resuelta').length})</option>
            <option value="emitida" ${vetState.filtroSosEstado === 'emitida' ? 'selected' : ''}>1. Emitidas (${todas.filter((x) => x.estado_sos === 'emitida').length})</option>
            <option value="en_atencion" ${vetState.filtroSosEstado === 'en_atencion' ? 'selected' : ''}>2. En Atención (${todas.filter((x) => x.estado_sos === 'en_atencion').length})</option>
            <option value="estabilizada" ${vetState.filtroSosEstado === 'estabilizada' ? 'selected' : ''}>3. Estabilizadas (${todas.filter((x) => x.estado_sos === 'estabilizada').length})</option>
            <option value="resuelta" ${vetState.filtroSosEstado === 'resuelta' ? 'selected' : ''}>4. Resueltas / Alta (${todas.filter((x) => x.estado_sos === 'resuelta').length})</option>
          </select>

          <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-vet-exportar-sos-csv">
            <i class="bi bi-file-earmark-spreadsheet me-1"></i>Exportar S.O.S. CSV
          </button>
        </div>
      </div>

      ${filtradas.length === 0 ? `
        <div class="text-center py-5 bg-light rounded-3 border">
          <i class="bi bi-shield-check text-success fs-1 d-block mb-2"></i>
          <h6 class="fw-bold">No hay incidencias S.O.S. para el filtro seleccionado</h6>
          <p class="text-secondary small mb-0">La Central Realtime está activa y notificará al instante cualquier derivación en Cusco.</p>
        </div>
      ` : filtradas.map((s) => {
        const sevBadge = s.nivel_severidad === 'critica'
          ? 'bg-danger text-white'
          : (s.nivel_severidad === 'moderada' ? 'bg-warning text-dark' : 'bg-info text-dark');

        const cuidTelLimpio = String(s.cuidador_telefono).replace(/[^0-9]/g, '');
        const propTelLimpio = String(s.propietario_telefono).replace(/[^0-9+]/g, '');

        return `
          <div class="p-4 rounded-3 border mb-3 ${s.estado_sos !== 'resuelta' ? 'border-danger bg-danger-subtle bg-opacity-10 shadow-sm' : 'bg-white'}">
            <!-- Encabezado de la Tarjeta S.O.S. -->
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 pb-2 border-bottom">
              <div>
                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span class="badge bg-dark font-monospace fs-6">${escapeHtml(s.codigo_sos)}</span>
                  <span class="badge ${sevBadge} text-uppercase">Severidad: ${escapeHtml(s.nivel_severidad)}</span>
                  ${renderBadgeEstadoSosVet(s.estado_sos)}
                  <span class="badge bg-secondary font-monospace">Reserva: ${escapeHtml(s.codigo_reserva)}</span>
                </div>
                <h5 class="fw-bold text-dark mb-0 mt-2">
                  <i class="bi bi-bandaid-fill text-danger me-1"></i>${escapeHtml(s.tipo_incidencia)}
                </h5>
              </div>

              <div class="text-end small">
                <div class="fw-semibold text-dark">
                  <i class="bi bi-clock-history text-danger me-1"></i>Hora Emisión: ${formatFechaEs(s.fecha_incidencia, true)}
                </div>
                <div class="text-danger fw-bold mt-1">
                  <i class="bi bi-geo-alt-fill me-1"></i>Ubicación en Cusco: ${escapeHtml(s.ubicacion_emergencia)}
                </div>
              </div>
            </div>

            <!-- Stepper de 4 Etapas -->
            ${renderStepperClinicoVet(s.estado_sos)}

            <!-- Cuerpo Clínico en 3 Columnas: Paciente Mascota | Cuidador & Propietario | Síntomas & Dictamen -->
            <div class="row g-3 small">
              <!-- Columna 1: Datos de la Mascota Paciente -->
              <div class="col-lg-4">
                <div class="p-3 bg-white rounded-3 border h-100">
                  <div class="text-muted fw-bold mb-2" style="font-size:0.72rem;">1. PACIENTE CANINO & ANTECEDENTES PAW-ID</div>
                  <div class="d-flex align-items-center gap-3 mb-2">
                    <img src="${escapeHtml(s.mascota_foto)}" alt="${escapeHtml(s.mascota_nombre)}"
                      style="width:58px; height:58px; border-radius:12px; object-fit:cover; border:2px solid var(--pp-primary);"
                      onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'">
                    <div>
                      <span class="paw-id-chip">${escapeHtml(s.mascota_paw_id)}</span>
                      <h6 class="fw-bold text-dark mb-0 mt-1">${escapeHtml(s.mascota_nombre)}</h6>
                      <div class="text-secondary">${escapeHtml(s.mascota_raza)} • ${escapeHtml(s.mascota_edad_texto)} (${escapeHtml(s.mascota_peso_kg)} kg)</div>
                    </div>
                  </div>
                  <div class="p-2 bg-light rounded border mb-2">
                    <div><strong class="text-danger">Alergias / Médicas:</strong> ${escapeHtml(s.mascota_alergias)}</div>
                    <div class="mt-1"><strong>Medicación Actual:</strong> ${escapeHtml(s.mascota_medicacion)}</div>
                  </div>
                  <button type="button" class="btn btn-outline-primary btn-sm w-100" data-vet-sos-carnet="${escapeHtml(s.id_mascota)}" data-paw="${escapeHtml(s.mascota_paw_id)}">
                    <i class="bi bi-qr-code-scan me-1"></i>Abrir Ficha Completa PAW-ID
                  </button>
                </div>
              </div>

              <!-- Columna 2: Cuidador a Cargo, Propietario y Ubicación en Cusco -->
              <div class="col-lg-4">
                <div class="p-3 bg-white rounded-3 border h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div class="text-muted fw-bold mb-2" style="font-size:0.72rem;">2. CUIDADOR A CARGO & PROPIETARIO</div>

                    <div class="mb-2 pb-2 border-bottom">
                      <div class="text-secondary" style="font-size:0.75rem;">Cuidador Responsable en Custodia:</div>
                      <div class="fw-bold text-dark fs-6"><i class="bi bi-person-check-fill text-warning me-1"></i>${escapeHtml(s.cuidador_nombre)}</div>
                      <div class="text-secondary"><i class="bi bi-telephone-fill text-success me-1"></i>Tel: <strong>${escapeHtml(s.cuidador_telefono)}</strong> (${escapeHtml(s.cuidador_distrito)})</div>
                    </div>

                    <div class="mb-2 pb-2 border-bottom">
                      <div class="text-secondary" style="font-size:0.75rem;">Propietario de la Mascota:</div>
                      <div class="fw-bold text-dark"><i class="bi bi-person-heart text-primary me-1"></i>${escapeHtml(s.propietario_nombre)}</div>
                      <div class="text-secondary"><i class="bi bi-telephone-fill text-primary me-1"></i>Tel: <strong>${escapeHtml(s.propietario_telefono)}</strong></div>
                    </div>

                    <div>
                      <div class="text-secondary" style="font-size:0.75rem;">Punto de Emergencia en Cusco:</div>
                      <div class="fw-semibold text-danger"><i class="bi bi-geo-alt-fill me-1"></i>${escapeHtml(s.ubicacion_emergencia)}</div>
                    </div>
                  </div>

                  <div class="d-flex gap-2 mt-2">
                    <a href="https://wa.me/${escapeHtml(cuidTelLimpio)}?text=${encodeURIComponent(`Hola ${s.cuidador_nombre}, somos de ${vetState.clinica.nombre} respecto a la alerta ${s.codigo_sos} de ${s.mascota_nombre}.`)}"
                       target="_blank" rel="noopener noreferrer" class="btn btn-success btn-sm flex-grow-1">
                      <i class="bi bi-whatsapp me-1"></i>WhatsApp Cuidador
                    </a>
                    <a href="tel:${escapeHtml(propTelLimpio)}" class="btn btn-outline-dark btn-sm">
                      <i class="bi bi-telephone-fill me-1"></i>Dueño
                    </a>
                  </div>
                </div>
              </div>

              <!-- Columna 3: Síntomas Reportados, Diagnóstico, Tratamiento y Costo -->
              <div class="col-lg-4">
                <div class="p-3 bg-white rounded-3 border h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div class="text-muted fw-bold mb-2" style="font-size:0.72rem;">3. SÍNTOMAS & EXPEDIENTE MÉDICO S.O.S.</div>
                    <div class="p-2 rounded bg-danger-subtle bg-opacity-25 border border-danger-subtle mb-2">
                      <div class="fw-bold text-danger">Síntomas Reportados:</div>
                      <div class="text-dark">${escapeHtml(s.descripcion)}</div>
                    </div>

                    <div class="mb-1">
                      <strong class="text-success"><i class="bi bi-clipboard2-pulse-fill me-1"></i>Diagnóstico Clínico:</strong>
                      <div class="text-dark">${s.diagnostico_clinico ? escapeHtml(s.diagnostico_clinico) : '<span class="text-muted fst-italic">Pendiente de registro médico</span>'}</div>
                    </div>

                    <div class="mb-1">
                      <strong class="text-primary"><i class="bi bi-capsule-pill me-1"></i>Tratamiento Aplicado:</strong>
                      <div class="text-secondary">${s.tratamiento_aplicado ? escapeHtml(s.tratamiento_aplicado) : '<span class="text-muted fst-italic">En protocolo de atención</span>'}</div>
                    </div>

                    ${s.informe_resolucion ? `
                      <div class="mb-1">
                        <strong class="text-dark"><i class="bi bi-file-earmark-check-fill text-success me-1"></i>Informe de Alta:</strong>
                        <div class="text-success fw-semibold">${escapeHtml(s.informe_resolucion)}</div>
                      </div>
                    ` : ''}
                  </div>

                  <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                    <span class="text-muted">Costo Clínico Referencial:</span>
                    <strong class="fs-6 text-dark">${formatMoneda(s.costo_atencion_ref || vetState.clinica.tarifa_consulta_emergencia || 60, moneda)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Barra de Acciones Clínicas conectadas a rpc_vet_actualizar_sos -->
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 pt-3 border-top">
              <div class="small text-secondary">
                <i class="bi bi-hospital me-1"></i>Sede Asignada: <strong>${escapeHtml(s.clinica_nombre)}</strong>
                ${s.fecha_atencion ? ` • Inicio atención: ${formatFechaEs(s.fecha_atencion, true)}` : ''}
                ${s.fecha_resolucion ? ` • Alta: ${formatFechaEs(s.fecha_resolucion, true)}` : ''}
              </div>

              <div class="d-flex flex-wrap gap-2">
                ${s.estado_sos === 'emitida' ? `
                  <button type="button" class="btn btn-warning fw-bold btn-sm px-3" data-sos-action="en_atencion" data-sos-id="${escapeHtml(s.id)}">
                    <i class="bi bi-heart-pulse-fill me-1"></i>1. Tomar Caso (Pasar a En Atención)
                  </button>
                ` : ''}

                ${['emitida', 'en_atencion'].includes(s.estado_sos) ? `
                  <button type="button" class="btn btn-info fw-bold btn-sm px-3 text-dark" data-sos-action="estabilizada" data-sos-id="${escapeHtml(s.id)}">
                    <i class="bi bi-shield-plus me-1"></i>2. Estabilizar Paciente
                  </button>
                ` : ''}

                ${s.estado_sos !== 'resuelta' ? `
                  <button type="button" class="btn btn-success fw-bold btn-sm px-3" data-sos-action="resuelta" data-sos-id="${escapeHtml(s.id)}">
                    <i class="bi bi-check2-circle me-1"></i>3. Registrar Diagnóstico, Alta y Resolver
                  </button>
                ` : `
                  <button type="button" class="btn btn-outline-secondary btn-sm" data-sos-action="editar_informe" data-sos-id="${escapeHtml(s.id)}">
                    <i class="bi bi-pencil-square me-1"></i>Actualizar Informe Clínico
                  </button>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Listener de filtro de estado SOS
  workspace.querySelector('#vet-filtro-sos-estado')?.addEventListener('change', (e) => {
    vetState.filtroSosEstado = e.target.value;
    renderSeccionCentralSosVeterinaria(workspace, rootContainer);
  });

  // Exportar CSV de atenciones SOS
  workspace.querySelector('#btn-vet-exportar-sos-csv')?.addEventListener('click', () => {
    const rows = todas.map((s) => ({
      codigo_sos: s.codigo_sos,
      estado_sos: s.estado_sos,
      severidad: s.nivel_severidad,
      mascota: s.mascota_nombre,
      paw_id: s.mascota_paw_id,
      propietario: s.propietario_nombre,
      telefono_propietario: s.propietario_telefono,
      cuidador: s.cuidador_nombre,
      telefono_cuidador: s.cuidador_telefono,
      ubicacion_cusco: s.ubicacion_emergencia,
      tipo_incidencia: s.tipo_incidencia,
      diagnostico_clinico: s.diagnostico_clinico || '',
      tratamiento_aplicado: s.tratamiento_aplicado || '',
      informe_resolucion: s.informe_resolucion || '',
      costo_soles: s.costo_atencion_ref,
      fecha_incidencia: s.fecha_incidencia
    }));
    exportarCsv(rows, `central_sos_${vetState.clinica.codigo_clinica}_${getHoyIso()}.csv`);
    showToast('Reporte CSV de emergencias S.O.S. descargado.', 'info');
  });

  // Botón abrir Carné PAW-ID desde tarjeta SOS
  workspace.querySelectorAll('[data-vet-sos-carnet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const petId = btn.getAttribute('data-vet-sos-carnet');
      const pawId = btn.getAttribute('data-paw');
      const mascota = vetState.mascotas.find((m) => m.id === petId || m.paw_id === pawId) || vetState.mascotas[0];
      abrirModalCarnetPawId(
        mascota,
        {
          nombre: mascota.propietario_nombre,
          telefono: mascota.propietario_telefono,
          distrito_cusco: mascota.propietario_distrito
        },
        vetState.alertasSos
      );
    });
  });

  // Botones de acciones clínicas SOS (`en_atencion` -> `estabilizada` -> `resuelta`)
  workspace.querySelectorAll('[data-sos-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accion = btn.getAttribute('data-sos-action');
      const idSos = btn.getAttribute('data-sos-id');
      const incidencia = todas.find((x) => x.id === idSos);
      if (incidencia) {
        abrirModalAccionClinicaSos(incidencia, accion, () => {
          renderContenidoPanelVeterinaria(rootContainer);
        });
      }
    });
  });
}

/**
 * Abre el modal médico para ejecutar `rpc_vet_actualizar_sos`
 * (`en_atencion` | `estabilizada` | `resuelta`)
 */
function abrirModalAccionClinicaSos(incidencia, accionRaw, onUpdated) {
  const s = normalizarIncidenciaSosVeterinaria(incidencia);
  const accion = accionRaw === 'editar_informe' ? 'resuelta' : accionRaw;

  const configModal = {
    en_atencion: {
      titulo: `Tomar Caso S.O.S. ${s.codigo_sos} — Pasar a En Atención`,
      headerClass: 'bg-warning text-dark',
      headerOscuro: false,
      btnText: 'Confirmar Recepción y Pasar a En Atención',
      btnClass: 'btn-warning fw-bold text-dark'
    },
    estabilizada: {
      titulo: `Estabilizar Paciente ${s.mascota_nombre} (${s.codigo_sos})`,
      headerClass: 'bg-info text-dark',
      headerOscuro: false,
      btnText: 'Registrar Estabilización Clínica',
      btnClass: 'btn-info fw-bold text-dark'
    },
    resuelta: {
      titulo: `Diagnóstico Clínico, Tratamiento y Alta Médica (${s.codigo_sos})`,
      headerClass: 'bg-success text-white',
      headerOscuro: true,
      btnText: 'Emitir Alta Médica y Marcar Resuelta',
      btnClass: 'btn-success fw-bold'
    }
  }[accion] || {
    titulo: `Actualizar S.O.S. ${s.codigo_sos}`,
    headerClass: 'bg-dark text-white',
    headerOscuro: true,
    btnText: 'Guardar Actualización',
    btnClass: 'btn-paw'
  };

  const costoSugerido = s.costo_atencion_ref > 0
    ? s.costo_atencion_ref
    : (vetState.clinica?.tarifa_consulta_emergencia || 60.00);

  const cuerpoHtml = `
    <div class="p-3 rounded-3 bg-light border mb-3 small">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
        <div>
          <span class="badge bg-dark font-monospace me-1">${escapeHtml(s.codigo_sos)}</span>
          <strong>Paciente:</strong> ${escapeHtml(s.mascota_nombre)} (${escapeHtml(s.mascota_paw_id)} • ${escapeHtml(s.mascota_raza)})
        </div>
        <span class="badge bg-danger-subtle text-danger text-uppercase">Severidad: ${escapeHtml(s.nivel_severidad)}</span>
      </div>
      <div><strong>Motivo / Síntomas:</strong> ${escapeHtml(s.tipo_incidencia)} — ${escapeHtml(s.descripcion)}</div>
      <div class="text-secondary mt-1">
        <strong>Cuidador:</strong> ${escapeHtml(s.cuidador_nombre)} (${escapeHtml(s.cuidador_telefono)}) •
        <strong>Ubicación:</strong> ${escapeHtml(s.ubicacion_emergencia)}
      </div>
    </div>

    <form id="form-vet-actualizar-sos" novalidate>
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label small fw-bold">
            Diagnóstico Clínico Veterinario ${accion === 'resuelta' ? '* (Obligatorio para Alta Médica)' : '(Preliminar)'}
          </label>
          <textarea class="form-control" id="vet-sos-diagnostico" rows="2" ${accion === 'resuelta' ? 'required minlength="4"' : ''}
            placeholder="Ej. Cuerpo extraño superficial en almohadilla plantar derecha sin compromiso tendinoso...">${escapeHtml(s.diagnostico_clinico || (accion === 'en_atencion' ? 'Paciente ingresado a sala de triaje y evaluación de signos vitales.' : ''))}</textarea>
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold">
            Tratamiento y Procedimiento Médico Aplicado ${accion !== 'en_atencion' ? '*' : ''}
          </label>
          <textarea class="form-control" id="vet-sos-tratamiento" rows="2"
            placeholder="Ej. Extracción aséptica, lavado con clorhexidina al 2%, antiinflamatorio subcutáneo y vendaje protector...">${escapeHtml(s.tratamiento_aplicado || (accion === 'en_atencion' ? 'Monitoreo de frecuencia cardíaca, temperatura y oxigenación.' : ''))}</textarea>
        </div>

        ${accion === 'resuelta' ? `
          <div class="col-md-8">
            <label class="form-label small fw-bold">Informe de Resolución / Recomendaciones de Alta Médica *</label>
            <textarea class="form-control" id="vet-sos-informe" rows="2" required
              placeholder="Ej. Paciente dado de alta en condición estable. Mantener vendaje seco por 24 horas...">${escapeHtml(s.informe_resolucion || 'Alta médica veterinaria conforme. Mascota apta para continuar custodia con reposo relativo.')}</textarea>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-bold">Costo de Atención (S/ PEN) *</label>
            <div class="input-group">
              <span class="input-group-text">S/</span>
              <input type="number" step="0.50" min="0" max="5000" class="form-control fw-bold" id="vet-sos-costo"
                value="${Number(costoSugerido).toFixed(2)}" required>
            </div>
            <div class="form-text small">Tarifa base urgencia sede: S/ ${Number(vetState.clinica?.tarifa_consulta_emergencia || 60).toFixed(2)}</div>
          </div>
        ` : `
          <div class="col-md-6">
            <label class="form-label small fw-bold">Costo Estimado de Atención (S/ PEN)</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text">S/</span>
              <input type="number" step="0.50" min="0" class="form-control" id="vet-sos-costo"
                value="${Number(costoSugerido).toFixed(2)}">
            </div>
          </div>
        `}
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn ${configModal.btnClass}" id="btn-confirmar-sos-rpc">
      <i class="bi bi-check2-circle me-1"></i>${escapeHtml(configModal.btnText)}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: configModal.titulo,
    icono: 'bi-heart-pulse-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg',
    headerClass: configModal.headerClass,
    headerOscuro: configModal.headerOscuro
  });

  modal.el.querySelector('#btn-confirmar-sos-rpc')?.addEventListener('click', async () => {
    const diagnostico = modal.el.querySelector('#vet-sos-diagnostico')?.value.trim() || '';
    const tratamiento = modal.el.querySelector('#vet-sos-tratamiento')?.value.trim() || '';
    const informe = modal.el.querySelector('#vet-sos-informe')?.value.trim() || (
      accion === 'resuelta' ? 'Alta médica veterinaria sin complicaciones.' : null
    );
    const costo = parseFloat(modal.el.querySelector('#vet-sos-costo')?.value) || 0;

    if (accion === 'resuelta' && diagnostico.length < 4) {
      showToast('Para dar de alta un caso S.O.S. es obligatorio registrar el diagnóstico clínico.', 'warning');
      return;
    }

    if (accion === 'estabilizada' && !diagnostico && !tratamiento) {
      showToast('Por favor ingresa el diagnóstico preliminar o tratamiento de estabilización.', 'warning');
      return;
    }

    showSpinner(`Actualizando estado clínico S.O.S. a "${accion}" (rpc_vet_actualizar_sos)...`);
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(s.id).startsWith('sos-')) {
        const { error } = await supabase.rpc('rpc_vet_actualizar_sos', {
          p_id_incidencia: s.id,
          p_accion: accion,
          p_diagnostico: diagnostico || null,
          p_tratamiento: tratamiento || null,
          p_informe: informe || null,
          p_costo: costo
        });
        if (error) {
          console.warn('Fallback local en rpc_vet_actualizar_sos:', error.message);
        }
      }

      const ahoraIso = new Date().toISOString();
      const estadoAnterior = s.estado_sos;

      vetState.alertasSos = vetState.alertasSos.map((item) => {
        if (item.id === s.id || item.codigo_sos === s.codigo_sos) {
          return normalizarIncidenciaSosVeterinaria({
            ...item,
            estado_sos: accion,
            diagnostico_clinico: diagnostico || item.diagnostico_clinico || 'Paciente en evaluación veterinaria',
            tratamiento_aplicado: tratamiento || item.tratamiento_aplicado || 'Protocolo clínico aplicado',
            informe_resolucion: accion === 'resuelta' ? informe : item.informe_resolucion,
            costo_atencion_ref: costo,
            fecha_atencion: item.fecha_atencion || ahoraIso,
            fecha_resolucion: accion === 'resuelta' ? ahoraIso : item.fecha_resolucion
          });
        }
        return item;
      });

      saveLocalSosVet(vetState.alertasSos);

      registrarEventoAuditoriaLocal({
        entidad: 'incidencias_emergencias',
        id_registro: s.codigo_sos,
        accion: 'UPDATE',
        estado_anterior: estadoAnterior,
        estado_nuevo: accion,
        detalle: `Atención S.O.S. (${s.mascota_nombre} - ${s.mascota_paw_id}): ${diagnostico || accion} [Costo: S/ ${costo.toFixed(2)}]`
      });

      await modal.cerrarAsync();
      showToast(
        `Alerta ${s.codigo_sos} (${s.mascota_nombre}) actualizada a estado "${accion.toUpperCase()}".`,
        'success',
        'Central S.O.S. Veterinaria'
      );
      if (typeof onUpdated === 'function') onUpdated();
    } catch (err) {
      handleSupabaseError(err, 'No se pudo actualizar la incidencia S.O.S.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Modal auxiliar para simular la recepción de un nuevo caso S.O.S. en estado `emitida`
 * y demostrar todo el ciclo (`emitida` -> `en_atencion` -> `estabilizada` -> `resuelta`)
 */
function abrirModalSimularLlegadaSos(rootContainer) {
  const mascotaDefault = vetState.mascotas[0] || normalizarMascotaVeterinaria(MASCOTAS_SEED_VET[0]);
  const seq = Math.floor(110 + Math.random() * 880);

  const nueva = normalizarIncidenciaSosVeterinaria({
    id: `95000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
    codigo_sos: `SOS-2026-0${seq}`,
    id_reserva: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    id_mascota: mascotaDefault.id,
    mascota_nombre: mascotaDefault.nombre,
    mascota_paw_id: mascotaDefault.paw_id,
    mascota_raza: mascotaDefault.raza,
    mascota_peso_kg: mascotaDefault.peso_kg,
    mascota_alergias: mascotaDefault.alergias_restricciones,
    mascota_medicacion: mascotaDefault.medicacion_actual,
    mascota_foto: mascotaDefault.foto_url,
    propietario_nombre: mascotaDefault.propietario_nombre,
    propietario_telefono: mascotaDefault.propietario_telefono,
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_telefono: '+51 984 311 111',
    cuidador_distrito: 'Wanchaq',
    id_clinica_derivada: vetState.clinica.id,
    clinica_nombre: vetState.clinica.nombre,
    clinica_telefono: vetState.clinica.telefono_emergencia,
    clinica_direccion: vetState.clinica.direccion,
    nivel_severidad: 'critica',
    tipo_incidencia: 'Mal de Altura / Fatiga Respiratoria Aguda en Cusco',
    descripcion: 'Durante paseo de aclimatación presenta jadeo intenso, mucosas pálidas y debilidad tras subir cuesta en San Blas.',
    ubicacion_emergencia: 'Plazoleta San Blas, Cusco (-13.5148, -71.9742)',
    estado_sos: 'emitida',
    costo_atencion_ref: vetState.clinica.tarifa_consulta_emergencia || 60.00,
    fecha_incidencia: new Date().toISOString()
  });

  vetState.alertasSos.unshift(nueva);
  saveLocalSosVet(vetState.alertasSos);
  vetState.activeTab = 'central-sos';
  vetState.filtroSosEstado = 'todos';

  registrarEventoAuditoriaLocal({
    entidad: 'incidencias_emergencias',
    id_registro: nueva.codigo_sos,
    accion: 'INSERT',
    estado_anterior: '—',
    estado_nuevo: 'emitida',
    detalle: `Nueva alerta S.O.S. derivada a ${vetState.clinica.nombre} para ${nueva.mascota_nombre} (${nueva.mascota_paw_id})`
  });

  renderContenidoPanelVeterinaria(rootContainer);
  showToast(
    `🚨 Nueva alerta crítica ${nueva.codigo_sos} ingresó en estado EMITIDA. Lista para triaje.`,
    'danger',
    'Alerta S.O.S. Recibida'
  );
}

/* ==========================================================================
   SECCIÓN 2: VALIDACIÓN DE FICHAS PAW-ID (`rpc_vet_dictaminar_ficha`)
   ========================================================================== */

function renderSeccionValidarPawIdVeterinaria(workspace, rootContainer) {
  if (!workspace) return;

  const todas = vetState.mascotas.map(normalizarMascotaVeterinaria);
  const pendientesCount = todas.filter((m) => m.estado_validacion_vet === 'pendiente').length;
  const auditadosCount = todas.filter((m) => m.estado_validacion_vet !== 'pendiente').length;

  const query = (vetState.busquedaPawId || '').trim().toLowerCase();
  const filtradas = todas.filter((m) => {
    if (vetState.filtroPawIdTab === 'pendientes' && m.estado_validacion_vet !== 'pendiente') return false;
    if (vetState.filtroPawIdTab === 'auditados' && m.estado_validacion_vet === 'pendiente') return false;
    if (query) {
      const texto = `${m.paw_id} ${m.nombre} ${m.raza} ${m.propietario_nombre} ${m.propietario_distrito}`.toLowerCase();
      return texto.includes(query);
    }
    return true;
  });

  workspace.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm mb-4">
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 border-bottom mb-3">
        <div>
          <span class="badge bg-warning text-dark fw-bold mb-1">
            VERIFICACIÓN SANITARIA OFICIAL • COLEGIATURA ${escapeHtml(vetState.clinica.colegiatura_cmvp)}
          </span>
          <h5 class="fw-bold mb-1">
            <i class="bi bi-qr-code-scan text-warning me-2"></i>Validación Sanitaria de Fichas y Carnés PAW-ID
          </h5>
          <p class="text-secondary small mb-0">
            Revisa la cartilla de vacunación, verifica la edad real calculada y otorga el <strong>Sello Oficial CMVP</strong> o registra una observación médica.
          </p>
        </div>

        <!-- Pestañas de Filtro (Pendientes vs Historial Auditado vs Todas) -->
        <div class="btn-group btn-group-sm" role="group" aria-label="Filtro Fichas PAW-ID">
          <button type="button" class="btn ${vetState.filtroPawIdTab === 'pendientes' ? 'btn-paw' : 'btn-outline-secondary'}" data-paw-tab="pendientes">
            <i class="bi bi-hourglass-split me-1"></i>Pendientes (${pendientesCount})
          </button>
          <button type="button" class="btn ${vetState.filtroPawIdTab === 'auditados' ? 'btn-paw' : 'btn-outline-secondary'}" data-paw-tab="auditados">
            <i class="bi bi-patch-check-fill me-1"></i>Historial Auditado (${auditadosCount})
          </button>
          <button type="button" class="btn ${vetState.filtroPawIdTab === 'todos' ? 'btn-paw' : 'btn-outline-secondary'}" data-paw-tab="todos">
            Todas (${todas.length})
          </button>
        </div>
      </div>

      <!-- Buscador instantáneo -->
      <div class="row g-2 align-items-center mb-3">
        <div class="col-md-7">
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
            <input type="text" class="form-control" id="vet-input-buscar-paw"
              value="${escapeHtml(vetState.busquedaPawId)}"
              placeholder="Buscar por código PAW-ID (ej. PAW-1002, PAW-6858), nombre de mascota, raza o propietario...">
          </div>
        </div>
        <div class="col-md-5 text-md-end small text-secondary">
          Mostrando <strong>${filtradas.length}</strong> ficha(s) sanitaria(s) • Sede validadora: <strong>${escapeHtml(vetState.clinica.nombre)}</strong>
        </div>
      </div>

      ${filtradas.length === 0 ? `
        <div class="text-center py-5 bg-light rounded-3 border">
          <i class="bi bi-clipboard2-check text-success fs-1 d-block mb-2"></i>
          <h6 class="fw-bold">No hay fichas PAW-ID pendientes en esta vista</h6>
          <p class="text-secondary small mb-2">Puedes cambiar a la pestaña "Historial Auditado" o "Todas" para consultar o re-evaluar carnés existentes.</p>
          ${vetState.filtroPawIdTab === 'pendientes' ? `
            <button type="button" class="btn btn-outline-primary btn-sm" id="btn-ver-todas-paw">
              Ver Todas las Fichas PAW-ID (${todas.length})
            </button>
          ` : ''}
        </div>
      ` : `
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th>Código PAW-ID & Mascota</th>
                <th>Edad Real (Dinámica)</th>
                <th>Propietario Responsable</th>
                <th>Estado Sanitario & Vigencia</th>
                <th>Cartilla de Vacunación</th>
                <th>Dictamen Médico / Clínica</th>
                <th class="text-end">Acciones Clínicas</th>
              </tr>
            </thead>
            <tbody>
              ${filtradas.map((m) => `
                <tr>
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <img src="${escapeHtml(m.foto_url)}" alt="${escapeHtml(m.nombre)}"
                        style="width:46px; height:46px; border-radius:10px; object-fit:cover; border:2px solid #E2E8F0;"
                        onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400'">
                      <div>
                        <span class="paw-id-chip">${escapeHtml(m.paw_id)}</span>
                        <div class="fw-bold text-dark mt-1">${escapeHtml(m.nombre)}</div>
                        <div class="text-secondary" style="font-size:0.75rem;">
                          ${escapeHtml(m.raza)} • ${escapeHtml(m.sexo)} • ${escapeHtml(m.peso_kg)} kg
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div class="fw-bold text-dark">${escapeHtml(m.edad_texto)}</div>
                    <div class="text-muted" style="font-size:0.73rem;">Nac: ${formatFechaEs(m.fecha_nacimiento)}</div>
                    ${m.es_cachorro ? '<span class="badge bg-warning-subtle text-dark border mt-1">🐾 Cachorro &lt;1 año</span>' : ''}
                  </td>

                  <td>
                    <div class="fw-semibold text-dark">${escapeHtml(m.propietario_nombre)}</div>
                    <div class="text-secondary" style="font-size:0.75rem;">
                      <i class="bi bi-telephone-fill text-success me-1"></i>${escapeHtml(m.propietario_telefono)}
                    </div>
                    <div class="text-muted" style="font-size:0.73rem;">
                      <i class="bi bi-geo-alt me-1"></i>${escapeHtml(m.propietario_distrito)}
                    </div>
                  </td>

                  <td>
                    <div class="mb-1">${renderBadgeSanitario(m.estado_validacion_vet)}</div>
                    <div class="text-secondary" style="font-size:0.74rem;">
                      Vigencia: <strong>${m.fecha_venc_vacunas ? formatFechaEs(m.fecha_venc_vacunas) : 'Por asignar'}</strong>
                    </div>
                  </td>

                  <td>
                    <div class="d-flex flex-column gap-1">
                      <button type="button" class="btn btn-outline-dark btn-sm" data-vet-ver-cartilla="${escapeHtml(m.id)}">
                        <i class="bi bi-zoom-in me-1 text-warning"></i>Ampliar Cartilla
                      </button>
                      <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none text-primary" data-vet-ver-carnet="${escapeHtml(m.id)}">
                        <i class="bi bi-qr-code me-1"></i>Ver Carné PAW-ID
                      </button>
                    </div>
                  </td>

                  <td style="max-width: 240px;">
                    <div class="fw-semibold text-dark text-truncate" title="${escapeHtml(m.clinica_validadora_nombre)}">
                      ${escapeHtml(m.clinica_validadora_nombre)}
                    </div>
                    <div class="text-secondary small" style="font-size:0.75rem;">
                      ${escapeHtml(m.observacion_veterinaria)}
                    </div>
                  </td>

                  <td class="text-end">
                    <div class="d-flex justify-content-end gap-1 flex-wrap">
                      <button type="button" class="btn btn-success btn-sm fw-bold" data-vet-dictamen="validado" data-pet-id="${escapeHtml(m.id)}"
                        title="Otorgar sello oficial de verificación sanitaria CMVP">
                        <i class="bi bi-patch-check-fill me-1"></i>Validar Carné
                      </button>
                      <button type="button" class="btn btn-outline-danger btn-sm fw-bold" data-vet-dictamen="observado" data-pet-id="${escapeHtml(m.id)}"
                        title="Registrar observación médica obligatoria">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>Observar
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Bitácora Histórica de Dictámenes Emitidos (validaciones_veterinarias) -->
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-journal-medical text-success me-2"></i>Registro Histórico de Dictámenes Médicos (` + '`validaciones_veterinarias`' + `) (${vetState.historialValidaciones.length})
        </h6>
        <span class="badge bg-light text-dark border">Trazabilidad CMVP Cusco</span>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Fecha Dictamen</th>
              <th>Carné PAW-ID / Mascota</th>
              <th>Resultado</th>
              <th>Vacunas Verificadas</th>
              <th>Vigencia Otorgada</th>
              <th>Clínica & Colegiatura CMVP</th>
              <th>Observaciones Médicas</th>
            </tr>
          </thead>
          <tbody>
            ${vetState.historialValidaciones.map((v) => `
              <tr>
                <td class="text-muted">${formatFechaEs(v.fecha_validacion, true)}</td>
                <td>
                  <span class="badge bg-dark font-monospace">${escapeHtml(v.paw_id)}</span>
                  <strong class="ms-1">${escapeHtml(v.mascota_nombre)}</strong>
                </td>
                <td>${renderBadgeSanitario(v.resultado)}</td>
                <td>${escapeHtml(v.vacunas_verificadas || 'Séxtuple y Antirrábica')}</td>
                <td class="fw-semibold">${v.vigencia_hasta ? formatFechaEs(v.vigencia_hasta) : '—'}</td>
                <td>
                  <div class="fw-semibold">${escapeHtml(v.clinica_nombre)}</div>
                  <span class="badge bg-secondary font-monospace">${escapeHtml(v.colegiatura_cmvp)}</span>
                </td>
                <td class="text-secondary">${escapeHtml(v.observaciones_medicas)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Cambio de pestaña de filtro PAW-ID
  workspace.querySelectorAll('[data-paw-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      vetState.filtroPawIdTab = btn.getAttribute('data-paw-tab');
      renderSeccionValidarPawIdVeterinaria(workspace, rootContainer);
    });
  });

  workspace.querySelector('#btn-ver-todas-paw')?.addEventListener('click', () => {
    vetState.filtroPawIdTab = 'todos';
    renderSeccionValidarPawIdVeterinaria(workspace, rootContainer);
  });

  // Buscador de fichas
  const inputBuscar = workspace.querySelector('#vet-input-buscar-paw');
  inputBuscar?.addEventListener('input', (e) => {
    vetState.busquedaPawId = e.target.value;
    renderSeccionValidarPawIdVeterinaria(workspace, rootContainer);
    const el = workspace.querySelector('#vet-input-buscar-paw');
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });

  // Botón Ampliar Cartilla con Zoom Interactivo
  workspace.querySelectorAll('[data-vet-ver-cartilla]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idMascota = btn.getAttribute('data-vet-ver-cartilla');
      const mascota = todas.find((m) => m.id === idMascota);
      if (mascota) {
        abrirVisorCartillaAmpliableVet(mascota, () => {
          renderContenidoPanelVeterinaria(rootContainer);
        });
      }
    });
  });

  // Botón Ver Carné PAW-ID completo con QR
  workspace.querySelectorAll('[data-vet-ver-carnet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idMascota = btn.getAttribute('data-vet-ver-carnet');
      const mascota = todas.find((m) => m.id === idMascota);
      if (mascota) {
        abrirModalCarnetPawId(
          mascota,
          {
            nombre: mascota.propietario_nombre,
            telefono: mascota.propietario_telefono,
            distrito_cusco: mascota.propietario_distrito
          },
          vetState.alertasSos
        );
      }
    });
  });

  // Botones Validar Carné / Observar Ficha (`rpc_vet_dictaminar_ficha`)
  workspace.querySelectorAll('[data-vet-dictamen]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const resultado = btn.getAttribute('data-vet-dictamen');
      const idMascota = btn.getAttribute('data-pet-id');
      const mascota = todas.find((m) => m.id === idMascota);
      if (mascota) {
        abrirModalDictaminarFichaPawId(mascota, resultado, () => {
          renderContenidoPanelVeterinaria(rootContainer);
        });
      }
    });
  });
}

/**
 * Visor de Cartilla de Vacunación Ampliable con Controles de Zoom + Acciones Directas Validar/Observar
 */
function abrirVisorCartillaAmpliableVet(mascota, onDictamenCallback = null) {
  const m = normalizarMascotaVeterinaria(mascota);
  const url = m.cartilla_vacunas_url || m.foto_url;

  const cuerpoHtml = `
    <div class="p-3 bg-light rounded-3 border mb-3 small">
      <div class="row g-2 align-items-center">
        <div class="col-md-8">
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="paw-id-chip">${escapeHtml(m.paw_id)}</span>
            <strong class="fs-6 text-dark">${escapeHtml(m.nombre)}</strong>
            <span class="text-secondary">(${escapeHtml(m.raza)} • <strong>${escapeHtml(m.edad_texto)}</strong>)</span>
            ${renderBadgeSanitario(m.estado_validacion_vet)}
          </div>
          <div class="text-secondary">
            <strong>Propietario:</strong> ${escapeHtml(m.propietario_nombre)} (${escapeHtml(m.propietario_telefono)}) •
            <strong>Alergias:</strong> ${escapeHtml(m.alergias_restricciones)}
          </div>
        </div>
        <div class="col-md-4 text-md-end">
          <div class="btn-group btn-group-sm" role="group" aria-label="Zoom Cartilla">
            <button type="button" class="btn btn-outline-secondary active" data-zoom-level="1">100%</button>
            <button type="button" class="btn btn-outline-secondary" data-zoom-level="1.4">140%</button>
            <button type="button" class="btn btn-outline-secondary" data-zoom-level="1.8">180%</button>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center overflow-auto p-3 bg-dark rounded-3 border" style="max-height: 460px;">
      <img src="${escapeHtml(url)}" id="vet-cartilla-zoom-img"
        alt="Cartilla Sanitaria de ${escapeHtml(m.nombre)}"
        class="img-fluid rounded shadow"
        style="max-height: 410px; transition: transform 0.2s ease; transform-origin: center top;"
        onerror="this.src='https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80'">
    </div>
  `;

  const footerHtml = `
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm me-auto">
      <i class="bi bi-box-arrow-up-right me-1"></i>Abrir en Nueva Pestaña
    </a>
    <button type="button" class="btn btn-outline-danger btn-sm fw-bold" id="btn-visor-observar">
      <i class="bi bi-exclamation-triangle-fill me-1"></i>Observar Cartilla
    </button>
    <button type="button" class="btn btn-success btn-sm fw-bold" id="btn-visor-validar">
      <i class="bi bi-patch-check-fill me-1"></i>Validar Carné CMVP
    </button>
    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
  `;

  const modal = crearModalDinamico({
    titulo: `Visor Clínico de Cartilla de Vacunación — ${m.nombre} (${m.paw_id})`,
    icono: 'bi-file-earmark-medical-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  const imgEl = modal.el.querySelector('#vet-cartilla-zoom-img');
  modal.el.querySelectorAll('[data-zoom-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      modal.el.querySelectorAll('[data-zoom-level]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const scale = parseFloat(btn.getAttribute('data-zoom-level')) || 1;
      if (imgEl) imgEl.style.transform = `scale(${scale})`;
    });
  });

  modal.el.querySelector('#btn-visor-validar')?.addEventListener('click', async () => {
    await modal.cerrarAsync();
    abrirModalDictaminarFichaPawId(m, 'validado', onDictamenCallback);
  });

  modal.el.querySelector('#btn-visor-observar')?.addEventListener('click', async () => {
    await modal.cerrarAsync();
    abrirModalDictaminarFichaPawId(m, 'observado', onDictamenCallback);
  });
}

/**
 * Abre el Modal Oficial para Validar u Observar una Ficha PAW-ID invocando `rpc_vet_dictaminar_ficha`
 */
function abrirModalDictaminarFichaPawId(mascota, resultado = 'validado', onCompleted = null) {
  const m = normalizarMascotaVeterinaria(mascota);
  const esValidar = resultado === 'validado';
  const vigenciaDefault = m.fecha_venc_vacunas && m.fecha_venc_vacunas > getHoyIso()
    ? m.fecha_venc_vacunas
    : sumarDiasIso(getHoyIso(), 365);

  const c = vetState.clinica || CLINICA_DEFAULT_DEMO;

  const cuerpoHtml = `
    <div class="p-3 rounded-3 ${esValidar ? 'bg-success-subtle border border-success-subtle' : 'bg-danger-subtle border border-danger-subtle'} mb-3 small">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <span class="paw-id-chip me-1">${escapeHtml(m.paw_id)}</span>
          <strong class="fs-6 text-dark">${escapeHtml(m.nombre)}</strong>
          <span class="text-secondary">(${escapeHtml(m.raza)} • Edad real: <strong>${escapeHtml(m.edad_texto)}</strong> • ${escapeHtml(m.peso_kg)} kg)</span>
        </div>
        <span class="badge bg-dark font-monospace">${escapeHtml(c.colegiatura_cmvp)}</span>
      </div>
      <div class="mt-1 text-secondary">
        <strong>Propietario:</strong> ${escapeHtml(m.propietario_nombre)} (${escapeHtml(m.propietario_telefono)}) •
        <strong>Clínica Dictaminadora:</strong> ${escapeHtml(c.nombre)}
      </div>
    </div>

    <form id="form-vet-dictaminar-ficha" novalidate>
      ${esValidar ? `
        <div class="mb-3">
          <label class="form-label small fw-bold">Protocolo de Vacunas y Desparasitación Verificadas *</label>
          <div class="row g-2 small mb-2">
            <div class="col-sm-6">
              <div class="form-check">
                <input class="form-check-input vet-chk-vacuna" type="checkbox" value="Séxtuple / Quíntuple Canina" id="chk-vac-1" checked>
                <label class="form-check-label" for="chk-vac-1">Vacuna Séxtuple / Quíntuple Canina</label>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="form-check">
                <input class="form-check-input vet-chk-vacuna" type="checkbox" value="Antirrábica Vigente" id="chk-vac-2" checked>
                <label class="form-check-label" for="chk-vac-2">Vacuna Antirrábica Vigente</label>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="form-check">
                <input class="form-check-input vet-chk-vacuna" type="checkbox" value="Bordetella (KC)" id="chk-vac-3" checked>
                <label class="form-check-label" for="chk-vac-3">Bordetella Bronchiseptica (Tos de Perreras)</label>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="form-check">
                <input class="form-check-input vet-chk-vacuna" type="checkbox" value="Desparasitación Interna y Externa" id="chk-vac-4" checked>
                <label class="form-check-label" for="chk-vac-4">Desparasitación Interna y Externa</label>
              </div>
            </div>
          </div>
          <input type="text" class="form-control form-control-sm" id="vet-input-vacunas-texto"
            value="Séxtuple Canina, Antirrábica Vigente, Bordetella (KC) y Desparasitación Interna/Externa"
            placeholder="Detalle de vacunas verificadas en cartilla">
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">Fecha de Vigencia Sanitaria Otorgada *</label>
            <input type="date" class="form-control" id="vet-input-vigencia" required
              min="${getHoyIso()}" value="${escapeHtml(vigenciaDefault)}">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Sello y Colegiatura Oficial CMVP</label>
            <input type="text" class="form-control bg-light font-monospace" readonly
              value="${escapeHtml(c.colegiatura_cmvp)} — ${escapeHtml(c.nombre)}">
          </div>
        </div>

        <div class="mb-2">
          <label class="form-label small fw-bold">Dictamen y Observaciones Médicas de Conformidad</label>
          <textarea class="form-control" id="vet-input-observaciones" rows="2"
            placeholder="Escribe el dictamen sanitario que aparecerá en el Carné Digital PAW-ID...">${escapeHtml(
              `Vacunas Séxtuple, Antirrábica y KC verificadas conforme por ${c.nombre} (${c.colegiatura_cmvp}). Apto para custodia y paseos en Cusco.`
            )}</textarea>
        </div>
      ` : `
        <div class="mb-3">
          <label class="form-label small fw-bold">Detalle de Vacunas Encontradas / Faltantes *</label>
          <input type="text" class="form-control" id="vet-input-vacunas-texto" required
            value="Cartilla con vacuna pendiente de refuerzo o sello ilegible"
            placeholder="Ej. Falta refuerzo anual de vacuna Antirrábica">
        </div>

        <div class="mb-2">
          <label class="form-label small fw-bold text-danger">
            Motivo Médico Obligatorio de la Observación * (Mínimo 8 caracteres)
          </label>
          <textarea class="form-control border-danger" id="vet-input-observaciones" rows="3" required minlength="8"
            placeholder="Indica claramente al propietario qué vacuna está vencida o qué documento debe volver a subir..."></textarea>
          <div class="form-text small">
            El propietario recibirá esta observación en su panel para subsanar la cartilla de <strong>${escapeHtml(m.nombre)}</strong>.
          </div>
        </div>
      `}
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn ${esValidar ? 'btn-success' : 'btn-danger'} fw-bold px-4" id="btn-confirmar-dictamen-rpc">
      <i class="bi ${esValidar ? 'bi-patch-check-fill' : 'bi-exclamation-triangle-fill'} me-1"></i>
      ${esValidar ? `Otorgar Sello Oficial PAW-ID (${c.colegiatura_cmvp})` : 'Registrar Observación Médica'}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: esValidar
      ? `Validar Carné Sanitario ${m.paw_id} — ${m.nombre}`
      : `Observar Ficha Sanitaria ${m.paw_id} — ${m.nombre}`,
    icono: esValidar ? 'bi-patch-check-fill' : 'bi-exclamation-triangle-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg',
    headerClass: esValidar ? 'bg-success text-white' : 'bg-danger text-white',
    headerOscuro: true
  });

  // Sincronizar checkboxes de vacunas con el campo de texto
  modal.el.querySelectorAll('.vet-chk-vacuna').forEach((chk) => {
    chk.addEventListener('change', () => {
      const seleccionadas = Array.from(modal.el.querySelectorAll('.vet-chk-vacuna:checked')).map((el) => el.value);
      const inputTxt = modal.el.querySelector('#vet-input-vacunas-texto');
      if (inputTxt && seleccionadas.length > 0) {
        inputTxt.value = seleccionadas.join(', ');
      }
    });
  });

  // Ejecutar rpc_vet_dictaminar_ficha
  modal.el.querySelector('#btn-confirmar-dictamen-rpc')?.addEventListener('click', async () => {
    const vacunas = modal.el.querySelector('#vet-input-vacunas-texto')?.value.trim() || 'Séxtuple y Antirrábica';
    const vigencia = esValidar
      ? (modal.el.querySelector('#vet-input-vigencia')?.value || vigenciaDefault)
      : null;
    const observaciones = modal.el.querySelector('#vet-input-observaciones')?.value.trim() || '';

    if (!esValidar && observaciones.length < 8) {
      showToast('Es obligatorio detallar el motivo médico de la observación (mínimo 8 caracteres).', 'warning');
      return;
    }

    const obsFinal = observaciones || `Cartilla verificada conforme por ${c.nombre} (${c.colegiatura_cmvp}).`;

    showSpinner(`Registrando dictamen sanitario "${resultado}" (rpc_vet_dictaminar_ficha)...`);
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(m.id).startsWith('pet-')) {
        const { error } = await supabase.rpc('rpc_vet_dictaminar_ficha', {
          p_id_mascota: m.id,
          p_resultado: resultado,
          p_vacunas: vacunas,
          p_vigencia: vigencia,
          p_observaciones: obsFinal
        });
        if (error) {
          console.warn('Fallback local en rpc_vet_dictaminar_ficha:', error.message);
        }
      }

      const ahoraIso = new Date().toISOString();
      const estadoAnterior = m.estado_validacion_vet;

      const mascotaActualizada = normalizarMascotaVeterinaria({
        ...m,
        estado_validacion_vet: resultado,
        vacunas_al_dia: esValidar,
        fecha_venc_vacunas: vigencia || m.fecha_venc_vacunas,
        id_clinica_validadora: c.id,
        clinica_validadora_nombre: c.nombre,
        clinica_validadora_cmvp: c.colegiatura_cmvp,
        observacion_veterinaria: obsFinal,
        fecha_ultima_validacion: ahoraIso
      });

      vetState.mascotas = vetState.mascotas.map((item) => (
        item.id === m.id || item.paw_id === m.paw_id ? mascotaActualizada : item
      ));
      saveLocalMascotaActualizada(mascotaActualizada);

      const nuevoDictamen = {
        id: `85000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
        id_mascota: m.id,
        paw_id: m.paw_id,
        mascota_nombre: m.nombre,
        mascota_raza: m.raza,
        propietario_nombre: m.propietario_nombre,
        id_clinica: c.id,
        clinica_nombre: c.nombre,
        colegiatura_cmvp: c.colegiatura_cmvp,
        medico_vet: vetState.profile?.nombre || 'Dra. Claudia Salazar Cáceres',
        resultado,
        vacunas_verificadas: vacunas,
        vigencia_hasta: vigencia,
        observaciones_medicas: obsFinal,
        fecha_validacion: ahoraIso
      };
      vetState.historialValidaciones.unshift(nuevoDictamen);
      saveLocalValidacionesVet(vetState.historialValidaciones);

      registrarEventoAuditoriaLocal({
        entidad: 'mascotas',
        id_registro: m.paw_id,
        accion: 'UPDATE',
        estado_anterior: estadoAnterior,
        estado_nuevo: resultado,
        detalle: `Dictamen PAW-ID ${m.paw_id} (${m.nombre}) por ${c.nombre} [${c.colegiatura_cmvp}]: ${obsFinal}`
      });

      await modal.cerrarAsync();
      showToast(
        esValidar
          ? `¡Carné ${m.paw_id} (${m.nombre}) VALIDADO con sello oficial ${c.colegiatura_cmvp}!`
          : `Ficha ${m.paw_id} (${m.nombre}) marcada como OBSERVADA. Se notificó al propietario.`,
        esValidar ? 'success' : 'warning',
        'Validación Sanitaria PAW-ID'
      );

      if (typeof onCompleted === 'function') onCompleted(mascotaActualizada);
    } catch (err) {
      handleSupabaseError(err, 'No se pudo registrar el dictamen sanitario.');
    } finally {
      hideSpinner();
    }
  });
}

/* ==========================================================================
   SECCIÓN 3: CONFIGURACIÓN DE SEDE CLÍNICA ALIADA EN CUSCO
   ========================================================================== */

function renderSeccionConfiguracionSede(workspace, rootContainer) {
  if (!workspace) return;
  const c = vetState.clinica || CLINICA_DEFAULT_DEMO;
  const especialidadesStr = Array.isArray(c.especialidades)
    ? c.especialidades.join(', ')
    : (c.especialidades || 'Emergencias 24h, Traumatología, UCI Canina');

  workspace.innerHTML = `
    <div class="card card-paw p-4 border-0 shadow-sm">
      <div class="pb-3 border-bottom mb-3">
        <span class="badge bg-primary-subtle text-primary fw-bold mb-1">DIRECTORIO DE EMERGENCIAS & MAPA LEAFLET CUSCO</span>
        <h5 class="fw-bold mb-1">
          <i class="bi bi-hospital text-danger me-2"></i>Configuración de Sede Clínica Veterinaria Aliada
        </h5>
        <p class="text-secondary small mb-0">
          Mantén actualizados los horarios de atención, teléfono de emergencias 24h y tarifa de consulta S.O.S. de tu sede en Cusco.
        </p>
      </div>

      <form id="form-vet-config-sede" novalidate>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">Razón Social / Nombre de la Clínica Veterinaria *</label>
            <input type="text" class="form-control" id="cfg-vet-nombre" required value="${escapeHtml(c.nombre)}">
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-bold">RUC (11 dígitos)</label>
            <input type="text" class="form-control bg-light font-monospace" id="cfg-vet-ruc" readonly value="${escapeHtml(c.ruc)}">
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-bold">Colegiatura CMVP Cusco *</label>
            <input type="text" class="form-control font-monospace" id="cfg-vet-cmvp" required value="${escapeHtml(c.colegiatura_cmvp)}">
          </div>

          <div class="col-md-4">
            <label class="form-label small fw-bold">Distrito en Cusco *</label>
            <select class="form-select" id="cfg-vet-distrito">
              ${CUSCO_CONFIG.DISTRITOS.map((d) => `
                <option value="${escapeHtml(d)}" ${d === c.distrito_cusco ? 'selected' : ''}>${escapeHtml(d)}</option>
              `).join('')}
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label small fw-bold">Dirección Exacta de la Sede en Cusco *</label>
            <input type="text" class="form-control" id="cfg-vet-direccion" required value="${escapeHtml(c.direccion)}">
          </div>

          <div class="col-md-4">
            <label class="form-label small fw-bold">Teléfono de Emergencias S.O.S. *</label>
            <input type="text" class="form-control" id="cfg-vet-telefono" required value="${escapeHtml(c.telefono_emergencia)}">
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-bold">Régimen Horario de Atención *</label>
            <select class="form-select" id="cfg-vet-horario">
              <option value="24 Horas" ${c.horario_atencion === '24 Horas' ? 'selected' : ''}>24 Horas (Guardia Permanente S.O.S.)</option>
              <option value="Extendido" ${c.horario_atencion === 'Extendido' ? 'selected' : ''}>Extendido (07:00 - 22:00)</option>
              <option value="Diurno" ${c.horario_atencion === 'Diurno' ? 'selected' : ''}>Diurno (08:00 - 19:00)</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-bold">Tarifa Consulta de Urgencia S.O.S. (S/) *</label>
            <div class="input-group">
              <span class="input-group-text">S/</span>
              <input type="number" step="1" min="20" max="500" class="form-control fw-bold" id="cfg-vet-tarifa"
                value="${Number(c.tarifa_consulta_emergencia || 60).toFixed(2)}" required>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label small fw-bold">Especialidades Clínicas (separadas por coma)</label>
            <input type="text" class="form-control" id="cfg-vet-especialidades"
              value="${escapeHtml(especialidadesStr)}"
              placeholder="Ej. Emergencias 24h, Traumatología, UCI Canina, Oxigenoterapia de Altura">
          </div>
        </div>

        <div class="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button type="submit" class="btn btn-paw fw-bold px-4">
            <i class="bi bi-check2-circle me-1"></i>Guardar Configuración de Sede Clínica
          </button>
        </div>
      </form>
    </div>
  `;

  workspace.querySelector('#form-vet-config-sede')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = workspace.querySelector('#cfg-vet-nombre').value.trim();
    const colegiatura_cmvp = workspace.querySelector('#cfg-vet-cmvp').value.trim();
    const distrito_cusco = workspace.querySelector('#cfg-vet-distrito').value;
    const direccion = workspace.querySelector('#cfg-vet-direccion').value.trim();
    const telefono_emergencia = workspace.querySelector('#cfg-vet-telefono').value.trim();
    const horario_atencion = workspace.querySelector('#cfg-vet-horario').value;
    const tarifa_consulta_emergencia = parseFloat(workspace.querySelector('#cfg-vet-tarifa').value) || 60;
    const especialidades = workspace.querySelector('#cfg-vet-especialidades').value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!nombre || !direccion || !telefono_emergencia) {
      showToast('Completa el nombre, dirección y teléfono de emergencias de la clínica.', 'warning');
      return;
    }

    showSpinner('Actualizando datos de la sede veterinaria en Cusco...');
    try {
      const supabase = getSupabase();
      const payload = {
        nombre,
        colegiatura_cmvp,
        distrito_cusco,
        direccion,
        telefono_emergencia,
        horario_atencion,
        tarifa_consulta_emergencia,
        especialidades
      };

      if (supabase && isSupabaseConfigured()) {
        await supabase.from('clinicas_veterinarias').update(payload).eq('id', c.id);
      }

      vetState.clinica = { ...vetState.clinica, ...payload };

      // Sincronizar también en el listado local compartido con Admin
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CLINICAS);
        if (raw) {
          const list = JSON.parse(raw).map((item) => (
            item.id === c.id ? { ...item, ...payload } : item
          ));
          localStorage.setItem(STORAGE_KEY_CLINICAS, JSON.stringify(list));
        }
      } catch (_) { /* ignore */ }

      renderContenidoPanelVeterinaria(rootContainer);
      showToast('Datos de la sede veterinaria actualizados correctamente.', 'success');
    } catch (err) {
      handleSupabaseError(err, 'No se pudo actualizar la configuración de la clínica.');
    } finally {
      hideSpinner();
    }
  });
}

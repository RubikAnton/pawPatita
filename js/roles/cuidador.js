/**
 * Paw Patita Cusco v5.1 — Panel Operativo del Cuidador Independiente
 * js/roles/cuidador.js
 *
 * Implementa las 4 Secciones Operativas Core + Pestaña de Perfil, Servicios y Reseñas:
 *  1. Sección 1 — Reservas y Clientes:
 *     - KPIs reales (Solicitudes Pendientes, En Curso Hoy, Saldo Disponible para Retiro, Calificación Media)
 *     - Aceptar y Rechazar Reserva con liberación de cupo y reembolso 100%
 *     - Estados en vivo: Check-In con checklist inicial y Check-Out con validación horaria Cusco (America/Lima)
 *       que libera inmediatamente el 85% de garantía a disponible
 *     - Visor completo de Ficha Médica y Carné PAW-ID de la mascota cliente
 *     - Botón directo de WhatsApp (`wa.me`) y disparo de Alerta S.O.S.
 *  2. Sección 2 — Agenda y Cupos (`js/components/calendario-agenda.js`):
 *     - Calendario mensual y semanal interactivo por días y bloques horarios
 *  3. Sección 3 — Billetera Digital y Retiros (`js/components/billetera-cuidador.js`):
 *     - Conciliación exacta de saldos (Garantía, Disponible, En Proceso y Total Histórico Cobrado)
 *  4. Sección 4 — Enviar Fotos y Reportes al Muro:
 *     - Selector estricto de reservas `en_curso`, dropzones directos para hasta 3 fotografías,
 *       tipo de evento, ánimo, ubicación en Cusco y publicación instantánea
 *  5. Sección 5 — Mi Perfil Profesional, Servicios (HU-XXX CRUD) y Respuesta a Reseñas
 */

import { getSupabase, isSupabaseConfigured, subscribeRealtime } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import { formatMoneda, formatFechaEs, escapeHtml, getHoyIso, sumarDiasIso } from '../utils/formatters.js';
import { showSpinner, hideSpinner, showToast, crearModalDinamico, handleSupabaseError } from '../utils/ui-helpers.js';
import { mountFileUploader } from '../components/file-uploader.js';
import {
  normalizarMascota,
  abrirModalCarnetPawId,
  abrirVisorCartillaVacunas,
  MASCOTAS_SEED_OWNER
} from '../components/carnet-digital.js';
import { abrirModalEmitirSos } from '../components/alerta-sos.js';
import { abrirLightboxFotoMuro, REPORTES_MURO_SEED } from '../components/muro-fotos.js';
import {
  obtenerDisponibilidadCuidador,
  liberarCupoAgendaLocal,
  renderSeccionCalendarioAgenda
} from '../components/calendario-agenda.js';
import {
  obtenerDatosBilleteraCuidador,
  sincronizarLiquidacionPorReservaLocal,
  renderSeccionBilleteraCuidador
} from '../components/billetera-cuidador.js';

const STORAGE_KEY_RESERVAS_CUID = 'paw_demo_reservas_cuidador_v5';
const STORAGE_KEY_RESERVAS_OWNER = 'paw_demo_reservas_owner_v5';
const STORAGE_KEY_MURO = 'paw_demo_muro_reportes_v5';
const STORAGE_KEY_SERVICIOS_CUID = 'paw_demo_servicios_cuidador_v5';
const STORAGE_KEY_RESENAS_CUID = 'paw_demo_resenas_cuidador_v5';

// Semilla de reservas asignadas a Valeria Huamán (CUID-001) sincronizada con `06_seed.sql`
export const RESERVAS_SEED_CUIDADOR = [
  {
    id: '90000000-0000-0000-0000-000000000003',
    codigo_reserva: 'RES-2026-0103',
    id_propietario: '50000000-0000-0000-0000-000000000003',
    propietario_nombre: 'Martin Dupont',
    propietario_telefono: '+33 6 12 34 56 78',
    propietario_distrito: 'Cusco Centro (Hotel Palacio del Inka)',
    propietario_es_turista: true,
    contacto_emergencia_nombre: 'Recepción Hotel Palacio del Inka',
    contacto_emergencia_tel: '+51 84 231 961',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_oferta: '70000000-0000-0000-0000-000000000002',
    hu_ecode: 'HU-102',
    categoria_servicio: 'Guardería',
    tipo_servicio: 'Guardería de Día en Magisterio',
    id_mascota: '80000000-0000-0000-0000-000000000003',
    mascota_nombre: 'Chaska',
    mascota_paw_id: 'PAW-1003',
    mascota_raza: 'French Poodle',
    mascota_fecha_nacimiento: '2022-03-20',
    mascota_tamano: 'Pequeño',
    mascota_sexo: 'Hembra',
    mascota_peso_kg: 5.8,
    mascota_foto: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=500&auto=format&fit=crop&q=80',
    mascota_cartilla_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    mascota_alergias: 'Sensible al frío nocturno (usar abrigo en noches de Cusco)',
    mascota_medicacion: 'Gotas oftálmicas lubricantes cada noche',
    mascota_dieta: 'Alimento hipoalergénico 120g diarios',
    mascota_conducta: 'Tranquila, acostumbrada a viajar en cabina y hoteles.',
    mascota_estado_vet: 'validado',
    mascota_clinica_validadora: 'Centro Médico Veterinario Qorikancha Pet',
    fecha_inicio: sumarDiasIso(getHoyIso(), 4),
    fecha_fin: sumarDiasIso(getHoyIso(), 5),
    bloque_horario: 'manana_08_12',
    hora_inicio: '08:00:00',
    hora_fin: '12:00:00',
    dias_calculados: 2,
    tarifa_unitaria: 40.00,
    monto_total: 80.00,
    comision_plataforma: 12.00,
    monto_neto_cuidador: 68.00,
    estado_reserva: 'pendiente_confirmacion',
    notas_propietario: 'Guardería matutina para Chaska mientras visitamos Sacsayhuamán.'
  },
  {
    id: '90000000-0000-0000-0000-000000000002',
    codigo_reserva: 'RES-2026-0102',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    propietario_nombre: 'Lucía Mendoza Vargas',
    propietario_telefono: '+51 984 234 567',
    propietario_distrito: 'Wanchaq',
    propietario_es_turista: false,
    contacto_emergencia_nombre: 'Carlos Mendoza (Hermano)',
    contacto_emergencia_tel: '+51 984 998 877',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_oferta: '70000000-0000-0000-0000-000000000001',
    hu_ecode: 'HU-101',
    categoria_servicio: 'Hospedaje',
    tipo_servicio: 'Hospedaje Familiar Premium 24h',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    mascota_raza: 'Golden Retriever',
    mascota_fecha_nacimiento: '2023-07-15',
    mascota_tamano: 'Grande',
    mascota_sexo: 'Macho',
    mascota_peso_kg: 28.5,
    mascota_foto: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80',
    mascota_cartilla_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    mascota_alergias: 'Alergia leve al pollo procesado (dar solo cordero o salmón)',
    mascota_medicacion: 'Ninguna medicación permanente',
    mascota_dieta: '300g de croquetas de salmón (08:00 AM y 06:00 PM)',
    mascota_conducta: 'Muy cariñoso, sociable con otros perros y acostumbrado a paseos con arnés.',
    mascota_estado_vet: 'validado',
    mascota_clinica_validadora: 'Clínica Veterinaria San Francisco Cusco 24h',
    fecha_inicio: getHoyIso(),
    fecha_fin: sumarDiasIso(getHoyIso(), 1),
    bloque_horario: 'todo_el_dia',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    dias_calculados: 2,
    tarifa_unitaria: 60.00,
    monto_total: 145.00,
    comision_plataforma: 21.75,
    monto_neto_cuidador: 123.25,
    estado_reserva: 'en_curso',
    notas_propietario: 'Incluye baño higiénico antes del retorno.',
    fecha_checkin: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '90000000-0000-0000-0000-000000000011',
    codigo_reserva: 'RES-2026-0111',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    propietario_nombre: 'Lucía Mendoza Vargas',
    propietario_telefono: '+51 984 234 567',
    propietario_distrito: 'Wanchaq',
    propietario_es_turista: false,
    contacto_emergencia_nombre: 'Carlos Mendoza (Hermano)',
    contacto_emergencia_tel: '+51 984 998 877',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_oferta: '70000000-0000-0000-0000-000000000002',
    hu_ecode: 'HU-102',
    categoria_servicio: 'Guardería',
    tipo_servicio: 'Guardería de Día en Magisterio',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    mascota_raza: 'Golden Retriever',
    mascota_fecha_nacimiento: '2023-07-15',
    mascota_tamano: 'Grande',
    mascota_sexo: 'Macho',
    mascota_peso_kg: 28.5,
    mascota_foto: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80',
    mascota_cartilla_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    mascota_alergias: 'Alergia leve al pollo procesado (dar solo cordero o salmón)',
    mascota_medicacion: 'Ninguna medicación permanente',
    mascota_dieta: '300g de croquetas de salmón (08:00 AM y 06:00 PM)',
    mascota_conducta: 'Muy cariñoso, sociable con otros perros.',
    mascota_estado_vet: 'validado',
    mascota_clinica_validadora: 'Clínica Veterinaria San Francisco Cusco 24h',
    fecha_inicio: sumarDiasIso(getHoyIso(), 2),
    fecha_fin: sumarDiasIso(getHoyIso(), 2),
    bloque_horario: 'tarde_14_18',
    hora_inicio: '14:00:00',
    hora_fin: '18:00:00',
    dias_calculados: 1,
    tarifa_unitaria: 40.00,
    monto_total: 40.00,
    comision_plataforma: 6.00,
    monto_neto_cuidador: 34.00,
    estado_reserva: 'confirmada',
    notas_propietario: 'Tarde recreativa en jardín de Magisterio.'
  },
  {
    id: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    id_propietario: '50000000-0000-0000-0000-000000000002',
    propietario_nombre: 'Lucía Mendoza Vargas',
    propietario_telefono: '+51 984 234 567',
    propietario_distrito: 'Wanchaq',
    propietario_es_turista: false,
    contacto_emergencia_nombre: 'Carlos Mendoza (Hermano)',
    contacto_emergencia_tel: '+51 984 998 877',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: 'Valeria Huamán Delgado',
    cuidador_distrito: 'Wanchaq',
    id_oferta: '70000000-0000-0000-0000-000000000001',
    hu_ecode: 'HU-101',
    categoria_servicio: 'Hospedaje',
    tipo_servicio: 'Hospedaje Familiar Premium 24h',
    id_mascota: '80000000-0000-0000-0000-000000000001',
    mascota_nombre: 'Inti',
    mascota_paw_id: 'PAW-6858',
    mascota_raza: 'Golden Retriever',
    mascota_fecha_nacimiento: '2023-07-15',
    mascota_tamano: 'Grande',
    mascota_sexo: 'Macho',
    mascota_peso_kg: 28.5,
    mascota_foto: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80',
    mascota_cartilla_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    mascota_alergias: 'Alergia leve al pollo procesado (dar solo cordero o salmón)',
    mascota_medicacion: 'Ninguna medicación permanente',
    mascota_dieta: '300g de croquetas de salmón (08:00 AM y 06:00 PM)',
    mascota_conducta: 'Muy cariñoso, sociable con otros perros.',
    mascota_estado_vet: 'validado',
    mascota_clinica_validadora: 'Clínica Veterinaria San Francisco Cusco 24h',
    fecha_inicio: sumarDiasIso(getHoyIso(), -10),
    fecha_fin: sumarDiasIso(getHoyIso(), -8),
    bloque_horario: 'todo_el_dia',
    hora_inicio: '08:00:00',
    hora_fin: '20:00:00',
    dias_calculados: 3,
    tarifa_unitaria: 60.00,
    monto_total: 180.00,
    comision_plataforma: 27.00,
    monto_neto_cuidador: 153.00,
    estado_reserva: 'finalizada',
    notas_propietario: 'Cuidar dieta sin pollo de Inti.'
  }
];

export const SERVICIOS_SEED_CUIDADOR = [
  {
    id: '70000000-0000-0000-0000-000000000001',
    hu_ecode: 'HU-101',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    categoria: 'Hospedaje',
    tipo_servicio: 'Hospedaje Familiar Premium 24h',
    descripcion_servicio: 'Alojamiento dentro de casa con jardín seguro en Wanchaq, 3 paseos diarios y reporte fotográfico cada 6 horas.',
    tarifa_diaria_por_perro: 60.00,
    incluye_recojo_hotel: true,
    tarifa_recojo_extra: 0.00,
    disponible: true
  },
  {
    id: '70000000-0000-0000-0000-000000000002',
    hu_ecode: 'HU-102',
    id_cuidador: '60000000-0000-0000-0000-000000000001',
    categoria: 'Guardería',
    tipo_servicio: 'Guardería de Día en Magisterio',
    descripcion_servicio: 'Cuidado diurno de 08:00 a 18:00 mientras trabajas o haces excursiones de medio día por Cusco.',
    tarifa_diaria_por_perro: 40.00,
    incluye_recojo_hotel: false,
    tarifa_recojo_extra: 15.00,
    disponible: true
  }
];

export const RESENAS_SEED_CUIDADOR = [
  {
    id: '96000000-0000-0000-0000-000000000001',
    id_reserva: '90000000-0000-0000-0000-000000000001',
    codigo_reserva: 'RES-2026-0101',
    propietario_nombre: 'Lucía Mendoza Vargas',
    mascota_nombre: 'Inti (PAW-6858)',
    calificacion_estrellas: 5,
    puntualidad_estrellas: 5,
    comunicacion_estrellas: 5,
    cuidado_estrellas: 5,
    comentario: '¡Valeria cuidó a Inti como si fuera de su propia familia! Nos envió fotos preciosas en su jardín de Wanchaq y respetó al 100% su dieta sin pollo.',
    respuesta_cuidador: '¡Muchas gracias Lucía! Inti es un Golden súper noble, será un gusto recibirlo siempre en casa.',
    fecha_respuesta: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '96000000-0000-0000-0000-000000000012',
    id_reserva: '90000000-0000-0000-0000-000000000098',
    codigo_reserva: 'RES-2026-0098',
    propietario_nombre: 'Martin Dupont (Francia)',
    mascota_nombre: 'Chaska (PAW-1003)',
    calificacion_estrellas: 5,
    puntualidad_estrellas: 5,
    comunicacion_estrellas: 5,
    cuidado_estrellas: 5,
    comentario: 'Excelente atención para nuestra Poodle mientras hicimos el tour a Machu Picchu. Fotos puntuales en el muro.',
    respuesta_cuidador: null,
    fecha_respuesta: null,
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  }
];

function getLocalReservasCuidador() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESERVAS_CUID);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_RESERVAS_CUID, JSON.stringify(RESERVAS_SEED_CUIDADOR));
  return [...RESERVAS_SEED_CUIDADOR];
}

function saveLocalReservasCuidador(list) {
  try {
    localStorage.setItem(STORAGE_KEY_RESERVAS_CUID, JSON.stringify(list));
    // Sincronizar también reservas compartidas en la clave del propietario para pruebas E2E cruzadas
    const rawOwner = localStorage.getItem(STORAGE_KEY_RESERVAS_OWNER);
    if (rawOwner) {
      const ownerList = JSON.parse(rawOwner);
      if (Array.isArray(ownerList)) {
        const mapUpdates = new Map(list.map((r) => [r.id, r]));
        const synced = ownerList.map((o) => (
          mapUpdates.has(o.id)
            ? { ...o, estado_reserva: mapUpdates.get(o.id).estado_reserva, motivo_rechazo: mapUpdates.get(o.id).motivo_rechazo }
            : o
        ));
        localStorage.setItem(STORAGE_KEY_RESERVAS_OWNER, JSON.stringify(synced));
      }
    }
  } catch (_) { /* ignore */ }
}

function getLocalServiciosCuidador() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SERVICIOS_CUID);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_SERVICIOS_CUID, JSON.stringify(SERVICIOS_SEED_CUIDADOR));
  return [...SERVICIOS_SEED_CUIDADOR];
}

function saveLocalServiciosCuidador(list) {
  try {
    localStorage.setItem(STORAGE_KEY_SERVICIOS_CUID, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

function getLocalResenasCuidador() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESENAS_CUID);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_RESENAS_CUID, JSON.stringify(RESENAS_SEED_CUIDADOR));
  return [...RESENAS_SEED_CUIDADOR];
}

function saveLocalResenasCuidador(list) {
  try {
    localStorage.setItem(STORAGE_KEY_RESENAS_CUID, JSON.stringify(list));
  } catch (_) { /* ignore */ }
}

/**
 * Normaliza una fila de reserva vista desde el panel del cuidador garantizando 0 `undefined`
 */
function normalizarReservaCuidador(r) {
  const pagoObj = Array.isArray(r.pagos) ? (r.pagos[0] || {}) : (r.pagos || {});
  const montoTotal = Number(r.monto_total ?? pagoObj.monto_bruto ?? 120);
  const comision15 = Number(r.comision_plataforma ?? pagoObj.comision_plataforma ?? (montoTotal * 0.15).toFixed(2));
  const montoNeto85 = Number(r.monto_neto_cuidador ?? r.neto ?? pagoObj.monto_neto_cuidador ?? (montoTotal - comision15).toFixed(2));

  const propObj = r.perfiles_usuarios || {};
  const mascObj = r.mascotas || {};
  const srvObj = r.servicios || {};

  const etiquetaBloqueMap = {
    todo_el_dia: 'Todo el Día (08:00 - 20:00)',
    manana_08_12: 'Mañana (08:00 - 12:00)',
    tarde_14_18: 'Tarde (14:00 - 18:00)',
    noche_18_22: 'Noche (18:00 - 22:00)',
    personalizado: `${String(r.hora_inicio || '08:00').slice(0, 5)} - ${String(r.hora_fin || '18:00').slice(0, 5)}`
  };
  const bloqueCod = r.bloque_horario || 'todo_el_dia';

  return {
    id: r.id || `res-${Date.now()}`,
    codigo_reserva: r.codigo_reserva || 'RES-2026-0100',
    id_propietario: r.id_propietario || '',
    propietario_nombre: r.propietario_nombre || `${propObj.nombre || 'Lucía'} ${propObj.apellido || 'Mendoza'}`.trim(),
    propietario_telefono: r.propietario_telefono || propObj.telefono || '+51 984 234 567',
    propietario_distrito: r.propietario_distrito || propObj.hospedaje_hotel_cusco || propObj.distrito_cusco || 'Wanchaq',
    propietario_es_turista: Boolean(r.propietario_es_turista ?? propObj.es_turista),
    contacto_emergencia_nombre: r.contacto_emergencia_nombre || propObj.contacto_emergencia_nombre || 'Contacto Familiar',
    contacto_emergencia_tel: r.contacto_emergencia_tel || propObj.contacto_emergencia_tel || '+51 984 998 877',
    id_cuidador: r.id_cuidador || '60000000-0000-0000-0000-000000000001',
    cuidador_nombre: r.cuidador_nombre || 'Valeria Huamán Delgado',
    cuidador_distrito: r.cuidador_distrito || 'Wanchaq',
    id_oferta: r.id_oferta || '',
    hu_ecode: r.hu_ecode || srvObj.hu_ecode || 'HU-101',
    categoria_servicio: r.categoria_servicio || srvObj.categoria || 'Hospedaje',
    tipo_servicio: r.tipo_servicio || srvObj.tipo_servicio || 'Hospedaje Familiar Premium 24h',
    id_mascota: r.id_mascota || mascObj.id || '80000000-0000-0000-0000-000000000001',
    mascota_nombre: r.mascota_nombre || mascObj.nombre || 'Inti',
    mascota_paw_id: r.mascota_paw_id || mascObj.paw_id || 'PAW-6858',
    mascota_raza: r.mascota_raza || mascObj.raza || 'Golden Retriever',
    mascota_fecha_nacimiento: r.mascota_fecha_nacimiento || mascObj.fecha_nacimiento || '2023-07-15',
    mascota_tamano: r.mascota_tamano || mascObj.tamano || 'Grande',
    mascota_sexo: r.mascota_sexo || mascObj.sexo || 'Macho',
    mascota_peso_kg: Number(r.mascota_peso_kg ?? mascObj.peso_kg ?? 25),
    mascota_foto: r.mascota_foto || mascObj.foto_url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&auto=format&fit=crop&q=80',
    mascota_cartilla_url: r.mascota_cartilla_url || mascObj.cartilla_vacunas_url || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=700&auto=format&fit=crop&q=80',
    mascota_alergias: r.mascota_alergias || mascObj.alergias_restricciones || 'Ninguna alergia reportada',
    mascota_medicacion: r.mascota_medicacion || mascObj.medicacion_actual || 'Ninguna medicación activa',
    mascota_dieta: r.mascota_dieta || mascObj.dieta_alimentacion || 'Croquetas balanceadas 2 veces al día',
    mascota_conducta: r.mascota_conducta || mascObj.conducta_observaciones || 'Sociable y tranquilo',
    mascota_estado_vet: (r.mascota_estado_vet || mascObj.estado_validacion_vet || 'validado').toLowerCase(),
    mascota_clinica_validadora: r.mascota_clinica_validadora || 'Clínica Veterinaria San Francisco Cusco 24h',
    fecha_inicio: r.fecha_inicio || getHoyIso(),
    fecha_fin: r.fecha_fin || getHoyIso(),
    bloque_horario: bloqueCod,
    bloque_etiqueta: etiquetaBloqueMap[bloqueCod] || etiquetaBloqueMap.todo_el_dia,
    hora_inicio: r.hora_inicio || '08:00:00',
    hora_fin: r.hora_fin || '20:00:00',
    dias_calculados: Number(r.dias_calculados || 1),
    tarifa_unitaria: Number(r.tarifa_unitaria || 60),
    monto_total: montoTotal,
    comision_plataforma: comision15,
    monto_neto_cuidador: montoNeto85,
    estado_reserva: (r.estado_reserva || 'pendiente_confirmacion').toLowerCase(),
    motivo_rechazo: r.motivo_rechazo || null,
    notas_propietario: r.notas_propietario || 'Sin instrucciones adicionales.',
    fecha_checkin: r.fecha_checkin || null,
    fecha_checkout: r.fecha_checkout || null
  };
}

/**
 * Obtiene el perfil profesional del cuidador autenticado (`perfiles_cuidadores`)
 */
async function obtenerPerfilProfesionalCuidador(userProfile) {
  const defaultCuidador = {
    id: '60000000-0000-0000-0000-000000000001',
    codigo_cuidador: 'CUID-001',
    id_usuario: userProfile?.id || '50000000-0000-0000-0000-000000000011',
    nombre: userProfile?.nombre || 'Valeria',
    apellido: userProfile?.apellido || 'Huamán Delgado',
    email: userProfile?.email || 'valeria.cuidadora@pawpatitacusco.pe',
    telefono: userProfile?.telefono || '+51 984 311 111',
    distrito_cusco: userProfile?.distrito_cusco || 'Wanchaq',
    presentacion_corta: 'Especialista en hospedaje familiar cálido y primeros auxilios caninos en Wanchaq',
    descripcion_experiencia: 'Técnica en bienestar animal con 5 años cuidando perritos locales y de turistas que viajan a Machu Picchu. Casa amplia con jardín cercado en Urb. Magisterio.',
    anios_experiencia: 5,
    especialidades: ['Hospedaje Familiar', 'Primeros Auxilios', 'Administración de Medicamentos'],
    idiomas: ['Español', 'Inglés'],
    tipo_vivienda: 'Casa con jardín cercado de 120 m²',
    capacidad_max_mascotas: 4,
    acepta_cachorros: true,
    acepta_medicacion_oral: true,
    reputacion_promedio: 4.95,
    total_resenas: 18,
    estado_postulacion: 'aprobado',
    foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    foto_hogar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80',
    disponibilidad_semanal: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    cuenta_cobro_tipo: 'Yape',
    cuenta_cobro_numero: '984311111'
  };

  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && userProfile?.id && !String(userProfile.id).startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('perfiles_cuidadores')
        .select('*')
        .eq('id_usuario', userProfile.id)
        .maybeSingle();

      if (!error && data) {
        return { ...defaultCuidador, ...data };
      }
    } catch (err) {
      console.warn('Fallback en obtenerPerfilProfesionalCuidador:', err);
    }
  }
  return defaultCuidador;
}

/**
 * Obtiene las reservas asignadas al cuidador desde Supabase o fallback local
 */
async function obtenerReservasCuidador(idCuidador) {
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
    try {
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          mascotas(*),
          servicios(hu_ecode, categoria, tipo_servicio),
          pagos(*),
          perfiles_usuarios!reservas_id_propietario_fkey(nombre, apellido, telefono, distrito_cusco, es_turista, hospedaje_hotel_cusco, contacto_emergencia_nombre, contacto_emergencia_tel)
        `)
        .eq('id_cuidador', idCuidador)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const normalizadas = data.map(normalizarReservaCuidador);
        saveLocalReservasCuidador(normalizadas);
        return normalizadas;
      }
    } catch (err) {
      console.warn('Error al consultar reservas del cuidador:', err);
    }
  }
  return getLocalReservasCuidador().map(normalizarReservaCuidador);
}

/**
 * Obtiene los servicios (`servicios`) y reseñas (`resenas`) del cuidador
 */
async function obtenerServiciosYResenasCuidador(idCuidador) {
  const supabase = getSupabase();
  let servicios = null;
  let resenas = null;

  if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
    try {
      const [resSrv, resRev] = await Promise.all([
        supabase.from('servicios').select('*').eq('id_cuidador', idCuidador).order('tarifa_diaria_por_perro', { ascending: true }),
        supabase
          .from('resenas')
          .select('*, reservas(codigo_reserva, mascotas(nombre, paw_id)), perfiles_usuarios!resenas_id_propietario_fkey(nombre, apellido)')
          .eq('id_cuidador', idCuidador)
          .order('created_at', { ascending: false })
      ]);

      if (!resSrv.error && Array.isArray(resSrv.data)) {
        servicios = resSrv.data;
        saveLocalServiciosCuidador(servicios);
      }
      if (!resRev.error && Array.isArray(resRev.data)) {
        resenas = resRev.data.map((rv) => ({
          id: rv.id,
          id_reserva: rv.id_reserva,
          codigo_reserva: rv.reservas?.codigo_reserva || 'RES-2026',
          propietario_nombre: rv.perfiles_usuarios ? `${rv.perfiles_usuarios.nombre} ${rv.perfiles_usuarios.apellido || ''}`.trim() : 'Propietario Verificado',
          mascota_nombre: rv.reservas?.mascotas ? `${rv.reservas.mascotas.nombre} (${rv.reservas.mascotas.paw_id})` : 'Mascota',
          calificacion_estrellas: Number(rv.calificacion_estrellas || 5),
          puntualidad_estrellas: Number(rv.puntualidad_estrellas || 5),
          comunicacion_estrellas: Number(rv.comunicacion_estrellas || 5),
          cuidado_estrellas: Number(rv.cuidado_estrellas || 5),
          comentario: rv.comentario || '',
          respuesta_cuidador: rv.respuesta_cuidador || null,
          fecha_respuesta: rv.fecha_respuesta || null,
          created_at: rv.created_at
        }));
        saveLocalResenasCuidador(resenas);
      }
    } catch (err) {
      console.warn('Error al consultar servicios y reseñas del cuidador:', err);
    }
  }

  return {
    servicios: servicios !== null ? servicios : getLocalServiciosCuidador(),
    resenas: resenas !== null ? resenas : getLocalResenasCuidador()
  };
}

/**
 * Evalúa si ya llegó la fecha y hora de inicio programada en Cusco (America/Lima, UTC-5)
 * para permitir el Check-Out de la reserva.
 */
function evaluarDisponibilidadCheckoutLima(r) {
  const fIni = String(r.fecha_inicio || getHoyIso()).slice(0, 10);
  const rawHora = String(r.hora_inicio || '08:00:00').trim();
  const hIni = rawHora.length === 5 ? `${rawHora}:00` : rawHora.slice(0, 8);
  const hhmm = hIni.slice(0, 5);
  const inicioLimaMs = new Date(`${fIni}T${hIni}-05:00`).getTime();
  const partes = fIni.split('-');
  const fechaLegible = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fIni;
  const etiquetaLima = `${fechaLegible} a las ${hhmm} (hora Cusco)`;

  if (!isNaN(inicioLimaMs) && inicioLimaMs > Date.now()) {
    return {
      permitido: false,
      etiquetaLima,
      mensaje: `Disponible desde el ${etiquetaLima}`
    };
  }
  return {
    permitido: true,
    etiquetaLima,
    mensaje: ''
  };
}

/**
 * Abre el Visor Médico Dedicado y Carné PAW-ID de la mascota cliente (accesible al cuidador sin error de permisos)
 */
function abrirModalFichaMascotaCliente(reservaRaw) {
  const r = normalizarReservaCuidador(reservaRaw);
  const mascotaSeed = MASCOTAS_SEED_OWNER.find((m) => m.id === r.id_mascota || m.paw_id === r.mascota_paw_id);

  const mascotaNormalizada = normalizarMascota({
    ...(mascotaSeed || {}),
    id: r.id_mascota,
    paw_id: r.mascota_paw_id,
    nombre: r.mascota_nombre,
    raza: r.mascota_raza,
    fecha_nacimiento: r.mascota_fecha_nacimiento,
    tamano: r.mascota_tamano,
    sexo: r.mascota_sexo,
    peso_kg: r.mascota_peso_kg,
    foto_url: r.mascota_foto,
    cartilla_vacunas_url: r.mascota_cartilla_url,
    alergias_restricciones: r.mascota_alergias,
    medicacion_actual: r.mascota_medicacion,
    dieta_alimentacion: r.mascota_dieta,
    conducta_observaciones: r.mascota_conducta,
    estado_validacion_vet: r.mascota_estado_vet,
    clinica_validadora_nombre: r.mascota_clinica_validadora
  });

  const propietarioContext = {
    nombre: r.propietario_nombre,
    apellido: '',
    telefono: r.propietario_telefono,
    distrito_cusco: r.propietario_distrito
  };

  abrirModalCarnetPawId(mascotaNormalizada, propietarioContext, []);
}

/**
 * Confirma una reserva pendiente
 */
async function ejecutarAceptarReservaCuidador(reservaRaw, onSuccess) {
  const r = normalizarReservaCuidador(reservaRaw);
  showSpinner(`Confirmando reserva ${r.codigo_reserva}...`);
  try {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
      const { error } = await supabase.rpc('rpc_cuidador_responder_reserva', {
        p_id_reserva: r.id,
        p_accion: 'aceptar',
        p_motivo: null
      });
      if (error) throw error;
    }

    const actualizadas = getLocalReservasCuidador().map((item) => (
      item.id === r.id ? { ...item, estado_reserva: 'confirmada' } : item
    ));
    saveLocalReservasCuidador(actualizadas);

    showToast(
      `¡Reserva ${r.codigo_reserva} (${r.mascota_nombre}) confirmada! Ya puedes coordinar con ${r.propietario_nombre} por WhatsApp o registrar el Check-In.`,
      'success',
      'Reserva Aceptada'
    );
    if (typeof onSuccess === 'function') onSuccess(actualizadas.map(normalizarReservaCuidador));
  } catch (err) {
    handleSupabaseError(err, 'No se pudo aceptar la reserva.');
  } finally {
    hideSpinner();
  }
}

/**
 * Abre modal con motivo obligatorio para Rechazar Reserva,
 * devolviendo automáticamente el cupo horario en agenda y reembolsando 100% al propietario.
 */
function abrirModalRechazarReservaCuidador(reservaRaw, onSuccess) {
  const r = normalizarReservaCuidador(reservaRaw);
  const moneda = localStorage.getItem('paw_currency') || 'PEN';

  const cuerpoHtml = `
    <div class="alert alert-warning border-0 d-flex align-items-center gap-3 mb-3">
      <i class="bi bi-arrow-counterclockwise fs-2 text-warning-emphasis"></i>
      <div class="small">
        <strong>Devolución Automática de Cupo y Reembolso 100%:</strong><br>
        Al rechazar la solicitud <strong>${escapeHtml(r.codigo_reserva)}</strong> (${escapeHtml(r.mascota_nombre)}),
        se liberará automáticamente el cupo en tu agenda del <strong>${formatFechaEs(r.fecha_inicio)} al ${formatFechaEs(r.fecha_fin)}</strong>
        y el propietario recibirá el reembolso íntegro de <strong>${formatMoneda(r.monto_total, moneda)}</strong>.
      </div>
    </div>

    <div>
      <label class="form-label small fw-bold">Motivo obligatorio del rechazo * (mínimo 5 caracteres)</label>
      <textarea class="form-control" id="input-motivo-rechazo-cuid" rows="3" required minlength="5"
        placeholder="Ej. Cuento con una cita médica familiar en ese horario o mantenimiento en casa..."></textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Volver</button>
    <button type="button" class="btn btn-danger fw-bold" id="btn-confirmar-rechazo-cuid">
      <i class="bi bi-x-circle-fill me-1"></i>Confirmar Rechazo y Liberar Cupo
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Rechazar Solicitud de Reserva ${r.codigo_reserva}`,
    icono: 'bi-calendar-x-fill',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-rechazo-cuid')?.addEventListener('click', async () => {
    const motivo = modal.el.querySelector('#input-motivo-rechazo-cuid').value.trim();
    if (motivo.length < 5) {
      showToast('Debes indicar el motivo del rechazo (mínimo 5 caracteres).', 'warning');
      return;
    }

    showSpinner('Rechazando reserva, liberando cupo en agenda y reembolsando 100%...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
        const { error } = await supabase.rpc('rpc_cuidador_responder_reserva', {
          p_id_reserva: r.id,
          p_accion: 'rechazar',
          p_motivo: motivo
        });
        if (error) throw error;
      }

      const actualizadas = getLocalReservasCuidador().map((item) => (
        item.id === r.id ? { ...item, estado_reserva: 'cancelada', motivo_rechazo: motivo } : item
      ));
      saveLocalReservasCuidador(actualizadas);

      // Liberar cupo en agenda local y anular garantía en billetera
      const nuevaAgenda = liberarCupoAgendaLocal(r.id_cuidador, r.fecha_inicio, r.fecha_fin, r.bloque_horario);
      const nuevasLiq = sincronizarLiquidacionPorReservaLocal(r.id, 'anulado', {
        ...r,
        motivo_rechazo: `Rechazada por cuidador: ${motivo}`
      });

      await modal.cerrarAsync();
      showToast(
        `Reserva ${r.codigo_reserva} rechazada. Se liberó el cupo horario en tu agenda y se reembolsó el 100% al propietario.`,
        'info',
        'Reserva Rechazada'
      );

      if (typeof onSuccess === 'function') {
        onSuccess({
          reservas: actualizadas.map(normalizarReservaCuidador),
          agenda: nuevaAgenda,
          liquidaciones: nuevasLiq
        });
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo rechazar la reserva.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Abre el modal de Check-In con Checklist de Seguridad
 */
function abrirModalCheckinCuidador(reservaRaw, onSuccess) {
  const r = normalizarReservaCuidador(reservaRaw);

  const cuerpoHtml = `
    <div class="p-3 bg-light rounded-3 border mb-3 d-flex align-items-center gap-3">
      <img src="${escapeHtml(r.mascota_foto)}" alt="${escapeHtml(r.mascota_nombre)}"
        class="rounded-3 border" style="width:60px;height:60px;object-fit:cover;">
      <div>
        <div class="fw-bold text-dark">
          Recepción de ${escapeHtml(r.mascota_nombre)} <span class="badge bg-dark">${escapeHtml(r.mascota_paw_id)}</span>
        </div>
        <div class="small text-secondary">
          Reserva <strong>${escapeHtml(r.codigo_reserva)}</strong> • Propietario: ${escapeHtml(r.propietario_nombre)}
        </div>
        <div class="small text-danger fw-semibold">
          <i class="bi bi-heart-pulse me-1"></i>Alergias/Dieta: ${escapeHtml(r.mascota_alergias)}
        </div>
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label small fw-bold text-secondary">
        Protocolo de Verificación Inicial (Checklist de Seguridad en Recepción) *
      </label>
      <div class="list-group small">
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input flex-shrink-0" type="checkbox" id="chk-in-fisico" checked>
          <span><strong>1. Estado físico saludable:</strong> Sin heridas previas, parásitos externos ni signos de dolor agudo.</span>
        </label>
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input flex-shrink-0" type="checkbox" id="chk-in-cartilla" checked>
          <span><strong>2. Carné Digital PAW-ID verificado:</strong> Vacunas al día y teléfono de emergencia confirmado.</span>
        </label>
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input flex-shrink-0" type="checkbox" id="chk-in-alimento" checked>
          <span><strong>3. Ración de alimento, correa/arnés y pertenencias recibidas:</strong> Acorde a su dieta habitual.</span>
        </label>
      </div>
    </div>

    <div>
      <label class="form-label small fw-bold">Observación inicial de recepción (se publicará en el Muro del Propietario)</label>
      <textarea class="form-control" id="input-nota-checkin" rows="2"
        placeholder="Ej. ¡${escapeHtml(r.mascota_nombre)} llegó súper feliz! Recibimos sus croquetas, su manta y arnés de paseo.">¡${escapeHtml(r.mascota_nombre)} llegó súper contento! Completamos el checklist de recepción y ya está adaptándose cómodamente.</textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-success fw-bold" id="btn-confirmar-checkin-rpc">
      <i class="bi bi-box-arrow-in-right me-1"></i>Registrar Check-In e Iniciar Custodia
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Check-In de Custodia — ${r.codigo_reserva} (${r.mascota_nombre})`,
    icono: 'bi-clipboard2-check-fill',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-checkin-rpc')?.addEventListener('click', async () => {
    const chkFisico = modal.el.querySelector('#chk-in-fisico').checked;
    const chkCartilla = modal.el.querySelector('#chk-in-cartilla').checked;
    const chkAlimento = modal.el.querySelector('#chk-in-alimento').checked;
    const nota = modal.el.querySelector('#input-nota-checkin').value.trim();

    if (!chkFisico || !chkCartilla) {
      showToast('Debes verificar el estado físico de la mascota y su Carné PAW-ID para iniciar el Check-In.', 'warning');
      return;
    }

    const checklistPayload = {
      estado_fisico_ok: chkFisico,
      cartilla_verificada: chkCartilla,
      alimento_recibido: chkAlimento,
      observacion_recepcion: nota
    };

    showSpinner('Registrando ingreso de la mascota y publicando aviso en el Muro en Vivo...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
        const { error } = await supabase.rpc('rpc_cuidador_checkin', {
          p_id_reserva: r.id,
          p_checklist: checklistPayload
        });
        if (error) throw error;
      }

      const ahoraIso = new Date().toISOString();
      const actualizadas = getLocalReservasCuidador().map((item) => (
        item.id === r.id
          ? { ...item, estado_reserva: 'en_curso', checklist_checkin: checklistPayload, fecha_checkin: ahoraIso }
          : item
      ));
      saveLocalReservasCuidador(actualizadas);

      // Registrar reporte automático de Check-In en el Muro local
      agregarReporteMuroLocal({
        id_reserva: r.id,
        codigo_reserva: r.codigo_reserva,
        id_cuidador: r.id_cuidador,
        cuidador_nombre: r.cuidador_nombre,
        mascota_id: r.id_mascota,
        mascota_nombre: r.mascota_nombre,
        mascota_paw_id: r.mascota_paw_id,
        tipo_evento: 'Check-In',
        estado_animo_mascota: 'Feliz y adaptándose',
        ubicacion_referencial: `${r.cuidador_distrito}, Cusco`,
        nota_estado: nota || 'Check-In completado satisfactoriamente con protocolo de seguridad.',
        fotos: [
          {
            foto_url: r.mascota_foto,
            origen_almacenamiento: 'supabase_storage',
            descripcion_foto: `Recepción Check-In de ${r.mascota_nombre}`
          }
        ]
      });

      await modal.cerrarAsync();
      showToast(
        `Check-In registrado con éxito. La reserva ${r.codigo_reserva} está ahora En Curso.`,
        'success',
        'Custodia en Curso'
      );

      if (typeof onSuccess === 'function') {
        onSuccess(actualizadas.map(normalizarReservaCuidador));
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo completar el Check-In.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Abre el modal de Check-Out con Checklist Final y validación temporal Cusco (America/Lima),
 * liberando inmediatamente el 85% del cuidador de `en_garantia` a `disponible` para retiro.
 */
function abrirModalCheckoutCuidador(reservaRaw, onSuccess) {
  const r = normalizarReservaCuidador(reservaRaw);
  const infoCheckout = evaluarDisponibilidadCheckoutLima(r);
  if (!infoCheckout.permitido) {
    showToast(
      `No puedes registrar el Check-Out antes de la fecha y hora de inicio programada (${infoCheckout.etiquetaLima}).`,
      'warning',
      'Check-Out No Disponible Aún'
    );
    return;
  }

  const moneda = localStorage.getItem('paw_currency') || 'PEN';

  const cuerpoHtml = `
    <div class="alert alert-success border-0 d-flex align-items-center gap-3 mb-3">
      <i class="bi bi-unlock-fill fs-2 text-success"></i>
      <div class="small">
        <strong>Liberación Inmediata de Pago Protegido en Garantía (85%):</strong><br>
        Al confirmar el Check-Out de <strong>${escapeHtml(r.mascota_nombre)} (${escapeHtml(r.codigo_reserva)})</strong>,
        tu pago neto de <strong>${formatMoneda(r.monto_neto_cuidador, moneda)}</strong> pasará instantáneamente de
        <em>Saldo en Garantía</em> a <strong>Saldo Disponible para Retiro</strong> en tu billetera digital.
      </div>
    </div>

    <div class="mb-3">
      <label class="form-label small fw-bold text-secondary">
        Protocolo de Cierre y Entrega Conforme (Checklist de Check-Out) *
      </label>
      <div class="list-group small">
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input flex-shrink-0" type="checkbox" id="chk-out-conforme" checked>
          <span><strong>1. Mascota entregada sana y salva a su propietario:</strong> Sin lesiones ni novedades médicas pendientes.</span>
        </label>
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input flex-shrink-0" type="checkbox" id="chk-out-pertenencias" checked>
          <span><strong>2. Devolución completa de pertenencias:</strong> Correa, arnés, manta, juguetes y alimento restante entregados.</span>
        </label>
        <label class="list-group-item d-flex align-items-center gap-2">
          <input class="form-check-input flex-shrink-0" type="checkbox" id="chk-out-muro" checked>
          <span><strong>3. Reporte final compartido en el Muro en Vivo:</strong> El propietario fue informado del cierre del servicio.</span>
        </label>
      </div>
    </div>

    <div>
      <label class="form-label small fw-bold">Mensaje de cierre y despedida para el Muro del Propietario</label>
      <textarea class="form-control" id="input-nota-checkout" rows="2">¡Check-Out completado! ${escapeHtml(r.mascota_nombre)} fue entregado sano, limpio y súper feliz a ${escapeHtml(r.propietario_nombre)}. ¡Gracias por confiar en nosotros!</textarea>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold" id="btn-confirmar-checkout-rpc">
      <i class="bi bi-patch-check-fill me-1"></i>Completar Check-Out y Liberar ${formatMoneda(r.monto_neto_cuidador, moneda)}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: `Check-Out Final y Liberación de Fondos — ${r.codigo_reserva}`,
    icono: 'bi-check2-circle',
    cuerpoHtml,
    footerHtml
  });

  modal.el.querySelector('#btn-confirmar-checkout-rpc')?.addEventListener('click', async () => {
    const validacionActual = evaluarDisponibilidadCheckoutLima(r);
    if (!validacionActual.permitido) {
      showToast(
        `No puedes registrar el Check-Out antes de la fecha y hora de inicio programada (${validacionActual.etiquetaLima}).`,
        'warning'
      );
      return;
    }

    const chkConforme = modal.el.querySelector('#chk-out-conforme').checked;
    const chkPertenencias = modal.el.querySelector('#chk-out-pertenencias').checked;
    const chkMuro = modal.el.querySelector('#chk-out-muro').checked;
    const nota = modal.el.querySelector('#input-nota-checkout').value.trim();

    if (!chkConforme || !chkPertenencias) {
      showToast('Por favor confirma la entrega saludable de la mascota y sus pertenencias.', 'warning');
      return;
    }

    const checklistPayload = {
      entrega_conforme: chkConforme,
      pertenencias_devueltas: chkPertenencias,
      sin_incidencias: chkMuro,
      nota_cierre: nota
    };

    showSpinner('Finalizando custodia y liberando garantía a Saldo Disponible...');
    try {
      const supabase = getSupabase();
      if (supabase && isSupabaseConfigured() && !String(r.id).startsWith('res-')) {
        const { error } = await supabase.rpc('rpc_cuidador_checkout', {
          p_id_reserva: r.id,
          p_checklist: checklistPayload
        });
        if (error) throw error;
      }

      const ahoraIso = new Date().toISOString();
      const actualizadas = getLocalReservasCuidador().map((item) => (
        item.id === r.id
          ? { ...item, estado_reserva: 'finalizada', checklist_checkout: checklistPayload, fecha_checkout: ahoraIso }
          : item
      ));
      saveLocalReservasCuidador(actualizadas);

      // Liberar el 85% de 'en_garantia' -> 'disponible' en la billetera local
      const nuevasLiquidaciones = sincronizarLiquidacionPorReservaLocal(r.id, 'disponible', r);

      // Agregar reporte de Check-Out al muro
      agregarReporteMuroLocal({
        id_reserva: r.id,
        codigo_reserva: r.codigo_reserva,
        id_cuidador: r.id_cuidador,
        cuidador_nombre: r.cuidador_nombre,
        mascota_id: r.id_mascota,
        mascota_nombre: r.mascota_nombre,
        mascota_paw_id: r.mascota_paw_id,
        tipo_evento: 'Check-Out',
        estado_animo_mascota: 'Excelente y tranquilo',
        ubicacion_referencial: `${r.cuidador_distrito}, Cusco`,
        nota_estado: nota || 'Check-Out completado. Mascota entregada sana y feliz a su propietario.',
        fotos: [
          {
            foto_url: r.mascota_foto,
            origen_almacenamiento: 'supabase_storage',
            descripcion_foto: `Check-Out conforme de ${r.mascota_nombre}`
          }
        ]
      });

      await modal.cerrarAsync();
      showToast(
        `¡Check-Out completado! Se liberaron ${formatMoneda(r.monto_neto_cuidador, moneda)} a tu Saldo Disponible para Retiro.`,
        'success',
        'Fondos Liberados a Billetera',
        6500
      );

      if (typeof onSuccess === 'function') {
        onSuccess({
          reservas: actualizadas.map(normalizarReservaCuidador),
          liquidaciones: nuevasLiquidaciones
        });
      }
    } catch (err) {
      handleSupabaseError(err, 'No se pudo completar el Check-Out.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Sincroniza un nuevo reporte y sus fotos en el almacenamiento local del Muro en Vivo (`paw_demo_muro_reportes_v5`)
 */
function agregarReporteMuroLocal(datos) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MURO);
    const lista = raw ? JSON.parse(raw) : [...REPORTES_MURO_SEED];
    const nuevoId = datos.id || `94000000-0000-0000-0000-${String(Date.now()).slice(-12)}`;

    const nuevoReporte = {
      id: nuevoId,
      id_reserva: datos.id_reserva,
      codigo_reserva: datos.codigo_reserva || 'RES-2026-0102',
      id_cuidador: datos.id_cuidador || '60000000-0000-0000-0000-000000000001',
      cuidador_nombre: datos.cuidador_nombre || 'Valeria Huamán Delgado',
      cuidador_foto: datos.cuidador_foto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
      mascota_id: datos.mascota_id || '80000000-0000-0000-0000-000000000001',
      mascota_nombre: datos.mascota_nombre || 'Inti',
      mascota_paw_id: datos.mascota_paw_id || 'PAW-6858',
      tipo_evento: datos.tipo_evento || 'Paseo y Recreación',
      estado_animo_mascota: datos.estado_animo_mascota || 'Feliz y activo',
      ubicacion_referencial: datos.ubicacion_referencial || 'Wanchaq, Cusco',
      nota_estado: datos.nota_estado || '',
      visto_por_propietario: false,
      fecha_reporte: new Date().toISOString(),
      fotos_reporte: (datos.fotos || []).map((f, idx) => ({
        id: `foto-${Date.now()}-${idx}`,
        foto_url: f.foto_url,
        origen_almacenamiento: f.origen_almacenamiento || 'supabase_storage',
        descripcion_foto: f.descripcion_foto || datos.nota_estado,
        orden: idx + 1
      }))
    };

    lista.unshift(nuevoReporte);
    localStorage.setItem(STORAGE_KEY_MURO, JSON.stringify(lista));
    return nuevoReporte;
  } catch (_) {
    return null;
  }
}

function obtenerReportesEnviadosPorCuidador(idCuidador) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MURO);
    const lista = raw ? JSON.parse(raw) : [...REPORTES_MURO_SEED];
    return lista.filter((r) => !idCuidador || r.id_cuidador === idCuidador);
  } catch (_) {
    return [...REPORTES_MURO_SEED];
  }
}

/**
 * Convierte un archivo de imagen local a DataURL como fallback si Storage no está conectado
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Renderiza el badge visual de estado de reserva
 */
function renderBadgeEstadoReserva(estado) {
  const est = (estado || 'pendiente_confirmacion').toLowerCase();
  const map = {
    pendiente_confirmacion: { cls: 'status-pendiente', icon: 'bi-hourglass-split', txt: 'Por Confirmar' },
    confirmada: { cls: 'status-confirmada', icon: 'bi-check-circle-fill', txt: 'Confirmada (Lista Check-In)' },
    en_curso: { cls: 'status-activo', icon: 'bi-play-circle-fill', txt: 'En Custodia Ahora' },
    finalizada: { cls: 'status-finalizada', icon: 'bi-patch-check-fill', txt: 'Finalizada (Fondos Liberados)' },
    cancelada: { cls: 'status-cancelada', icon: 'bi-x-circle-fill', txt: 'Cancelada / Rechazada' },
    en_disputa: { cls: 'status-sos', icon: 'bi-shield-exclamation', txt: 'En Arbitraje' }
  };
  const cfg = map[est] || map.pendiente_confirmacion;
  return `<span class="badge-status ${cfg.cls}"><i class="bi ${cfg.icon} me-1"></i>${cfg.txt}</span>`;
}

/**
 * Abre el modal CRUD para Crear o Editar una Oferta de Servicio del Cuidador (`servicios`)
 */
function abrirModalServicioCuidador(servicioExistente = null, idCuidador, onSaved) {
  const esEdicion = Boolean(servicioExistente && servicioExistente.id);
  const s = esEdicion ? servicioExistente : {
    hu_ecode: `HU-${115 + Math.floor(Math.random() * 80)}`,
    categoria: 'Paseo',
    tipo_servicio: '',
    descripcion_servicio: '',
    tarifa_diaria_por_perro: 45.00,
    incluye_recojo_hotel: true,
    tarifa_recojo_extra: 0.00,
    disponible: true
  };

  const cuerpoHtml = `
    <form id="form-crud-servicio-cuid" novalidate>
      <div class="row g-3">
        <div class="col-md-5">
          <label class="form-label small fw-bold">Categoría de Servicio *</label>
          <select class="form-select" id="srv-categoria">
            ${CUSCO_CONFIG.SERVICIOS_CATEGORIAS.map((cat) => `
              <option value="${escapeHtml(cat.id)}" ${s.categoria === cat.id ? 'selected' : ''}>
                ${escapeHtml(cat.id)} — ${escapeHtml(cat.nombre)}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="col-md-7">
          <label class="form-label small fw-bold">Título Comercial del Servicio *</label>
          <input type="text" class="form-control" id="srv-titulo" required maxlength="90"
            value="${escapeHtml(s.tipo_servicio)}"
            placeholder="Ej. Hospedaje Familiar con Jardín en Wanchaq">
        </div>

        <div class="col-12">
          <label class="form-label small fw-bold">Descripción Detallada de la Oferta *</label>
          <textarea class="form-control" id="srv-descripcion" rows="2" required maxlength="280"
            placeholder="Detalla qué incluye tu servicio, frecuencia de paseos y reportes en el Muro...">${escapeHtml(s.descripcion_servicio)}</textarea>
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Tarifa por Día/Sesión (S/ PEN) *</label>
          <input type="number" step="1" min="15" max="350" class="form-control fw-bold" id="srv-tarifa"
            required value="${Number(s.tarifa_diaria_por_perro || 45)}">
          <div class="form-text small">Recibirás el 85% neto en tu billetera.</div>
        </div>

        <div class="col-md-4">
          <label class="form-label small fw-bold">Recargo Recojo en Hotel (S/)</label>
          <input type="number" step="1" min="0" max="80" class="form-control" id="srv-tarifa-recojo"
            value="${Number(s.tarifa_recojo_extra || 0)}">
          <div class="form-text small">0 si está incluido gratis.</div>
        </div>

        <div class="col-md-4 d-flex flex-column justify-content-center gap-2 pt-2">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="srv-incluye-recojo" ${s.incluye_recojo_hotel ? 'checked' : ''}>
            <label class="form-check-label small fw-semibold" for="srv-incluye-recojo">Ofrece Recojo en Hotel</label>
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="srv-disponible" ${s.disponible !== false ? 'checked' : ''}>
            <label class="form-check-label small fw-semibold text-success" for="srv-disponible">Oferta Publicada Activa</label>
          </div>
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
    <button type="button" class="btn btn-paw fw-bold" id="btn-guardar-servicio-cuid">
      <i class="bi bi-check2-circle me-1"></i>${esEdicion ? 'Actualizar Oferta' : 'Publicar Nuevo Servicio'}
    </button>
  `;

  const modal = crearModalDinamico({
    titulo: esEdicion ? `Editar Oferta ${s.hu_ecode}` : 'Crear Nueva Modalidad de Servicio en Cusco',
    icono: 'bi-briefcase-fill',
    cuerpoHtml,
    footerHtml,
    tamano: 'modal-lg'
  });

  modal.el.querySelector('#btn-guardar-servicio-cuid')?.addEventListener('click', async () => {
    const categoria = modal.el.querySelector('#srv-categoria').value;
    const tipoServicio = modal.el.querySelector('#srv-titulo').value.trim();
    const descripcion = modal.el.querySelector('#srv-descripcion').value.trim();
    const tarifa = Math.max(15, Number(modal.el.querySelector('#srv-tarifa').value || 45));
    const tarifaRecojo = Math.max(0, Number(modal.el.querySelector('#srv-tarifa-recojo').value || 0));
    const incluyeRecojo = modal.el.querySelector('#srv-incluye-recojo').checked;
    const disponible = modal.el.querySelector('#srv-disponible').checked;

    if (tipoServicio.length < 4 || descripcion.length < 8) {
      showToast('Por favor completa el título comercial y la descripción del servicio.', 'warning');
      return;
    }

    const payload = {
      id_cuidador: idCuidador,
      categoria,
      tipo_servicio: tipoServicio,
      descripcion_servicio: descripcion,
      tarifa_diaria_por_perro: tarifa,
      incluye_recojo_hotel: incluyeRecojo,
      tarifa_recojo_extra: tarifaRecojo,
      disponible
    };

    showSpinner('Guardando modalidad de servicio en catálogo de Cusco...');
    try {
      const supabase = getSupabase();
      let saved = null;
      if (supabase && isSupabaseConfigured() && idCuidador && !String(idCuidador).startsWith('mock-')) {
        if (esEdicion) {
          const { data, error } = await supabase.from('servicios').update(payload).eq('id', s.id).select().single();
          if (error) throw error;
          saved = data;
        } else {
          const { data, error } = await supabase.from('servicios').insert([payload]).select().single();
          if (error) throw error;
          saved = data;
        }
      }

      const lista = getLocalServiciosCuidador();
      if (esEdicion) {
        const idx = lista.findIndex((item) => item.id === s.id);
        const actualizado = { ...s, ...payload, ...(saved || {}) };
        if (idx >= 0) lista[idx] = actualizado;
        else lista.push(actualizado);
      } else {
        lista.push({
          id: saved?.id || `70000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
          hu_ecode: saved?.hu_ecode || s.hu_ecode,
          ...payload,
          ...(saved || {})
        });
      }
      saveLocalServiciosCuidador(lista);

      await modal.cerrarAsync();
      showToast('Catálogo de servicios del cuidador actualizado.', 'success');
      if (typeof onSaved === 'function') onSaved(lista);
    } catch (err) {
      handleSupabaseError(err, 'No se pudo guardar el servicio.');
    } finally {
      hideSpinner();
    }
  });
}

/**
 * Renderizador Principal del Panel Operativo del Cuidador (`#/cuidador`)
 */
export async function renderPanelCuidador(container, userProfile) {
  if (!container) return;

  let activeTab = 'reservas'; // 'reservas' | 'agenda' | 'billetera' | 'muro' | 'servicios'
  let filtroEstadoReserva = 'todas';
  let cuidadorProfile = null;
  let reservas = [];
  let disponibilidad = [];
  let billeteraDatos = { resumen: {}, liquidaciones: [] };
  let servicios = [];
  let resenas = [];
  let reservaPreseleccionadaMuro = null;

  showSpinner('Cargando tu Panel Operativo de Cuidador en Cusco...');
  try {
    cuidadorProfile = await obtenerPerfilProfesionalCuidador(userProfile);
    const [resList, dispList, billData, srvRev] = await Promise.all([
      obtenerReservasCuidador(cuidadorProfile.id),
      obtenerDisponibilidadCuidador(cuidadorProfile.id, cuidadorProfile.capacidad_max_mascotas),
      obtenerDatosBilleteraCuidador(cuidadorProfile.id),
      obtenerServiciosYResenasCuidador(cuidadorProfile.id)
    ]);
    reservas = resList;
    disponibilidad = dispList;
    billeteraDatos = billData;
    servicios = srvRev.servicios;
    resenas = srvRev.resenas;
  } finally {
    hideSpinner();
  }

  // Suscripciones Realtime a nuevas solicitudes de reserva y pagos de liquidaciones
  subscribeRealtime('canal-cuidador-reservas', 'reservas', '*', async () => {
    reservas = await obtenerReservasCuidador(cuidadorProfile.id);
    showToast('🐾 Actualización en tiempo real en tus Reservas asignadas.', 'info', 'Reservas en Vivo');
    if (activeTab === 'reservas') renderWorkspace();
  });

  subscribeRealtime('canal-cuidador-liquidaciones', 'liquidaciones_cuidadores', '*', async () => {
    billeteraDatos = await obtenerDatosBilleteraCuidador(cuidadorProfile.id);
    showToast('💰 Actualización en tu Billetera Digital.', 'success', 'Billetera Cuidador');
    if (activeTab === 'billetera') renderWorkspace();
  });

  function renderLayout() {
    const iniciales = `${(cuidadorProfile.nombre || 'V').charAt(0)}${(cuidadorProfile.apellido || 'H').charAt(0)}`.toUpperCase();
    const pendientesCount = reservas.filter((r) => r.estado_reserva === 'pendiente_confirmacion').length;
    const enCursoCount = reservas.filter((r) => r.estado_reserva === 'en_curso').length;
    const moneda = localStorage.getItem('paw_currency') || 'PEN';

    container.innerHTML = `
      <div class="container">
        <div class="panel-dashboard-shell">
          <!-- SIDEBAR DEL CUIDADOR APROBADO -->
          <aside class="panel-sidebar">
            <div class="panel-sidebar-profile">
              <div class="d-flex align-items-center gap-3 mb-2">
                <img src="${escapeHtml(cuidadorProfile.foto_url)}" alt="${escapeHtml(cuidadorProfile.nombre)}"
                  class="panel-avatar-circle"
                  onerror="this.outerHTML='<div class=\\'panel-avatar-circle\\'>${escapeHtml(iniciales)}</div>'">
                <div class="min-w-0">
                  <h6 class="fw-bold text-white mb-0 text-truncate">${escapeHtml(cuidadorProfile.nombre)} ${escapeHtml(cuidadorProfile.apellido)}</h6>
                  <div class="small text-white-50 text-truncate">${escapeHtml(cuidadorProfile.email)}</div>
                  <div class="small text-warning fw-bold">
                    <i class="bi bi-star-fill me-1"></i>${Number(cuidadorProfile.reputacion_promedio || 4.95).toFixed(2)} (${cuidadorProfile.total_resenas || resenas.length} reseñas)
                  </div>
                </div>
              </div>
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-1 mt-2 pt-2 border-top border-secondary">
                <span class="badge-origen-usuario badge-origen-local">
                  <i class="bi bi-patch-check-fill"></i>Cuidador Verificado • ${escapeHtml(cuidadorProfile.distrito_cusco)}
                </span>
                <span class="badge bg-warning text-dark fw-bold">${escapeHtml(cuidadorProfile.codigo_cuidador)}</span>
              </div>
            </div>

            <nav class="panel-nav-menu" aria-label="Menú Operativo del Cuidador">
              <button type="button" class="panel-nav-btn ${activeTab === 'reservas' ? 'active' : ''}" data-tab="reservas">
                <span class="nav-icon-wrap"><i class="bi bi-inboxes-fill"></i>1. Reservas y Clientes</span>
                ${pendientesCount > 0
                  ? `<span class="badge rounded-pill bg-warning text-dark">${pendientesCount} nueva(s)</span>`
                  : `<span class="badge rounded-pill bg-secondary">${reservas.length}</span>`}
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'agenda' ? 'active' : ''}" data-tab="agenda">
                <span class="nav-icon-wrap"><i class="bi bi-calendar-range-fill"></i>2. Agenda y Bloques</span>
                <span class="badge rounded-pill bg-secondary">${cuidadorProfile.capacidad_max_mascotas} cupos</span>
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'billetera' ? 'active' : ''}" data-tab="billetera">
                <span class="nav-icon-wrap"><i class="bi bi-wallet2"></i>3. Billetera y Retiros</span>
                <span class="badge rounded-pill bg-success">${formatMoneda(billeteraDatos.resumen.saldo_disponible_retiro || 0, moneda)}</span>
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'muro' ? 'active' : ''}" data-tab="muro">
                <span class="nav-icon-wrap"><i class="bi bi-camera-fill"></i>4. Enviar Fotos al Muro</span>
                ${enCursoCount > 0 ? `<span class="badge rounded-pill bg-primary">${enCursoCount} activa</span>` : ''}
              </button>

              <button type="button" class="panel-nav-btn ${activeTab === 'servicios' ? 'active' : ''}" data-tab="servicios">
                <span class="nav-icon-wrap"><i class="bi bi-sliders"></i>Mi Perfil, Servicios & Reseñas</span>
              </button>

              <button type="button" class="panel-nav-btn nav-btn-sos mt-1" id="sidebar-cuid-btn-sos">
                <span class="nav-icon-wrap"><i class="bi bi-exclamation-octagon-fill"></i>Emitir S.O.S. Veterinario</span>
                <span class="badge rounded-pill bg-danger">24h</span>
              </button>
            </nav>
          </aside>

          <!-- ÁREA DE TRABAJO PRINCIPAL -->
          <section class="panel-main-area" id="cuidador-workspace"></section>
        </div>
      </div>
    `;

    container.querySelectorAll('.panel-nav-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderLayout();
      });
    });

    container.querySelector('#sidebar-cuid-btn-sos')?.addEventListener('click', () => {
      abrirModalEmitirSos({
        reservas,
        distritoPropietario: cuidadorProfile.distrito_cusco
      });
    });

    renderWorkspace();
  }

  function renderWorkspace() {
    const ws = container.querySelector('#cuidador-workspace');
    if (!ws) return;

    if (activeTab === 'reservas') {
      renderTabReservasYClientes(ws);
    } else if (activeTab === 'agenda') {
      renderSeccionCalendarioAgenda(ws, {
        idCuidador: cuidadorProfile.id,
        capacidadMaxCuidador: cuidadorProfile.capacidad_max_mascotas,
        disponibilidad,
        reservas,
        plantillaSemanal: cuidadorProfile.disponibilidad_semanal,
        onCambioAgenda: (nuevaAgenda) => {
          disponibilidad = nuevaAgenda;
          renderWorkspace();
        }
      });
    } else if (activeTab === 'billetera') {
      renderSeccionBilleteraCuidador(ws, {
        cuidadorProfile,
        resumen: billeteraDatos.resumen,
        liquidaciones: billeteraDatos.liquidaciones,
        onBilleteraActualizada: (res) => {
          billeteraDatos = { resumen: res.resumen, liquidaciones: res.liquidaciones };
          renderLayout();
        }
      });
    } else if (activeTab === 'muro') {
      renderTabPublicarMuroFotos(ws);
    } else if (activeTab === 'servicios') {
      renderTabServiciosYResenas(ws);
    }
  }

  /**
   * SECCIÓN 1: RESERVAS Y CLIENTES
   */
  function renderTabReservasYClientes(ws) {
    const moneda = localStorage.getItem('paw_currency') || 'PEN';
    const pendientes = reservas.filter((r) => r.estado_reserva === 'pendiente_confirmacion');
    const enCurso = reservas.filter((r) => r.estado_reserva === 'en_curso');
    const confirmadas = reservas.filter((r) => r.estado_reserva === 'confirmada');

    const reservasFiltradas = filtroEstadoReserva === 'todas'
      ? reservas
      : reservas.filter((r) => r.estado_reserva === filtroEstadoReserva);

    ws.innerHTML = `
      <!-- Banner Operativo del Cuidador -->
      <div class="panel-hero-banner d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <span class="badge bg-warning text-dark fw-bold mb-1">CENTRO DE OPERACIONES DEL CUIDADOR — ${escapeHtml(cuidadorProfile.distrito_cusco.toUpperCase())}</span>
          <h4 class="fw-bold mb-1 text-dark">Hola, ${escapeHtml(cuidadorProfile.nombre)} 👋</h4>
          <p class="text-secondary small mb-0">
            Acepta o rechaza solicitudes, verifica el Carné PAW-ID de tus huéspedes caninos y registra el Check-In / Check-Out para liberar tu saldo del 85%.
          </p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-paw btn-sm fw-bold" id="hero-btn-ir-muro">
            <i class="bi bi-camera-fill me-1"></i>Enviar Foto al Muro
          </button>
          <button type="button" class="btn btn-outline-dark btn-sm fw-bold" id="hero-btn-ir-agenda">
            <i class="bi bi-calendar3 me-1"></i>Configurar Bloques Horarios
          </button>
        </div>
      </div>

      <!-- 4 KPIs Exactos de la Sección 1 -->
      <div class="kpi-grid-owner">
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-oro"><i class="bi bi-bell-fill"></i></div>
          <div>
            <div class="kpi-value">${pendientes.length}</div>
            <div class="kpi-label">Solicitudes Pendientes</div>
          </div>
        </div>
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-terracota"><i class="bi bi-play-circle-fill"></i></div>
          <div>
            <div class="kpi-value">${enCurso.length} <span class="fs-6 text-muted fw-normal">(+${confirmadas.length} conf.)</span></div>
            <div class="kpi-label">En Custodia Hoy</div>
          </div>
        </div>
        <div class="kpi-card-paw" role="button" id="kpi-card-ir-billetera" title="Ir a Billetera">
          <div class="kpi-icon-box kpi-turquesa"><i class="bi bi-wallet2"></i></div>
          <div>
            <div class="kpi-value text-success">${formatMoneda(billeteraDatos.resumen.saldo_disponible_retiro || 0, moneda)}</div>
            <div class="kpi-label">Disponible para Retiro</div>
          </div>
        </div>
        <div class="kpi-card-paw">
          <div class="kpi-icon-box kpi-andino"><i class="bi bi-star-fill text-warning"></i></div>
          <div>
            <div class="kpi-value">${Number(cuidadorProfile.reputacion_promedio || 4.95).toFixed(2)} ★</div>
            <div class="kpi-label">Calificación (${cuidadorProfile.total_resenas || resenas.length} reseñas)</div>
          </div>
        </div>
      </div>

      <!-- Listado de Reservas y Clientes -->
      <div class="card card-paw p-4 border-0 shadow-sm">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom">
          <div>
            <h5 class="fw-bold mb-0">
              <i class="bi bi-calendar2-heart-fill text-warning me-2"></i>Mis Reservas y Mascotas Clientes (${reservasFiltradas.length})
            </h5>
          </div>
          <div class="d-flex flex-wrap gap-1">
            ${[
              { id: 'todas', label: `Todas (${reservas.length})` },
              { id: 'pendiente_confirmacion', label: `Por Confirmar (${pendientes.length})` },
              { id: 'confirmada', label: `Confirmadas (${confirmadas.length})` },
              { id: 'en_curso', label: `En Curso (${enCurso.length})` },
              { id: 'finalizada', label: 'Finalizadas' }
            ].map((f) => `
              <button type="button"
                class="btn btn-sm ${filtroEstadoReserva === f.id ? 'btn-dark fw-bold' : 'btn-outline-secondary'}"
                data-filter-res="${f.id}">
                ${escapeHtml(f.label)}
              </button>
            `).join('')}
          </div>
        </div>

        ${reservasFiltradas.length === 0 ? `
          <div class="text-center py-5 bg-light rounded-3 border">
            <i class="bi bi-inbox text-warning fs-1 d-block mb-2"></i>
            <h6 class="fw-bold">No hay reservas en este estado</h6>
            <p class="text-secondary small mb-0">Mantén tu agenda actualizada para recibir nuevas solicitudes en Cusco.</p>
          </div>
        ` : reservasFiltradas.map((r) => {
          const telWa = String(r.propietario_telefono || '').replace(/[^0-9]/g, '');
          const waMsg = encodeURIComponent(
            `Hola ${r.propietario_nombre}, soy ${cuidadorProfile.nombre}, tu cuidador(a) de Paw Patita Cusco para la reserva ${r.codigo_reserva} de ${r.mascota_nombre} (${r.mascota_paw_id}).`
          );
          const puedeWhatsApp = ['confirmada', 'en_curso'].includes(r.estado_reserva);

          return `
            <article class="reserva-item-card" data-reserva-id="${escapeHtml(r.id)}">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2 pb-2 border-bottom">
                <div class="d-flex align-items-center gap-3">
                  <img src="${escapeHtml(r.mascota_foto)}" alt="${escapeHtml(r.mascota_nombre)}"
                    class="rounded-3 border" style="width:62px;height:62px;object-fit:cover;"
                    onerror="this.src='https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80'">
                  <div>
                    <div class="d-flex align-items-center flex-wrap gap-2">
                      <span class="badge bg-dark font-monospace">${escapeHtml(r.codigo_reserva)}</span>
                      <span class="paw-id-chip"><i class="bi bi-qr-code me-1"></i>${escapeHtml(r.mascota_paw_id)}</span>
                      <span class="badge bg-warning-subtle text-dark border">${escapeHtml(r.hu_ecode)} • ${escapeHtml(r.categoria_servicio)}</span>
                      ${r.propietario_es_turista ? '<span class="badge bg-info-subtle text-primary"><i class="bi bi-airplane-fill me-1"></i>Cliente Turista</span>' : ''}
                    </div>
                    <h6 class="fw-bold text-dark mb-0 mt-1">
                      🐾 ${escapeHtml(r.mascota_nombre)} <span class="text-secondary fw-normal small">(${escapeHtml(r.mascota_raza)} • ${escapeHtml(r.mascota_tamano)})</span>
                    </h6>
                    <div class="small text-secondary">
                      <i class="bi bi-person-fill text-warning me-1"></i>Dueño: <strong>${escapeHtml(r.propietario_nombre)}</strong>
                      • <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(r.propietario_distrito)}
                    </div>
                  </div>
                </div>

                <div class="text-end">
                  ${renderBadgeEstadoReserva(r.estado_reserva)}
                  <div class="mt-2">
                    <span class="small text-muted d-block" style="font-size:0.72rem;">TU GANANCIA NETA (85%)</span>
                    <span class="fs-5 fw-bold text-success">${formatMoneda(r.monto_neto_cuidador, moneda)}</span>
                    <span class="small text-muted d-block" style="font-size:0.72rem;">Total bruto: ${formatMoneda(r.monto_total, moneda)}</span>
                  </div>
                </div>
              </div>

              <!-- Detalles Horarios, Médicos y Notas -->
              <div class="row g-2 small mb-3">
                <div class="col-md-4">
                  <div class="p-2 bg-light rounded-2 border h-100">
                    <div class="text-muted" style="font-size:0.7rem;">FECHAS Y BLOQUE HORARIO</div>
                    <div class="fw-bold text-dark">
                      <i class="bi bi-calendar-week text-warning me-1"></i>${formatFechaEs(r.fecha_inicio)} al ${formatFechaEs(r.fecha_fin)} (${r.dias_calculados}d)
                    </div>
                    <div class="text-primary fw-semibold">
                      <i class="bi bi-clock me-1"></i>${escapeHtml(r.bloque_etiqueta)}
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="p-2 bg-light rounded-2 border h-100">
                    <div class="text-muted" style="font-size:0.7rem;">ALERTA MÉDICA / DIETA PAW-ID</div>
                    <div class="fw-semibold text-danger text-truncate" title="${escapeHtml(r.mascota_alergias)}">
                      <i class="bi bi-shield-plus me-1"></i>${escapeHtml(r.mascota_alergias)}
                    </div>
                    <div class="text-secondary text-truncate" title="${escapeHtml(r.mascota_dieta)}">
                      Dieta: ${escapeHtml(r.mascota_dieta)}
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="p-2 bg-light rounded-2 border h-100">
                    <div class="text-muted" style="font-size:0.7rem;">INSTRUCCIONES DEL PROPIETARIO</div>
                    <div class="text-dark">${escapeHtml(r.notas_propietario)}</div>
                    ${r.motivo_rechazo ? `<div class="text-danger fw-semibold mt-1">Motivo cancelación: ${escapeHtml(r.motivo_rechazo)}</div>` : ''}
                  </div>
                </div>
              </div>

              <!-- Barra de Acciones Operativas según Máquina de Estados -->
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
                <div class="d-flex flex-wrap gap-2">
                  <button type="button" class="btn btn-outline-dark btn-sm fw-semibold"
                    data-action="ver-paw-id-cliente" data-id="${escapeHtml(r.id)}">
                    <i class="bi bi-qr-code-scan text-warning me-1"></i>Ver Carné PAW-ID Validado
                  </button>

                  ${r.mascota_cartilla_url ? `
                    <button type="button" class="btn btn-outline-secondary btn-sm"
                      data-action="ver-cartilla-cliente" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-file-earmark-medical me-1"></i>Cartilla Vacunas
                    </button>
                  ` : ''}

                  ${puedeWhatsApp ? `
                    <a href="https://wa.me/${escapeHtml(telWa)}?text=${waMsg}" target="_blank" rel="noopener noreferrer"
                      class="btn btn-success btn-sm fw-semibold">
                      <i class="bi bi-whatsapp me-1"></i>WhatsApp Propietario
                    </a>
                  ` : ''}
                </div>

                <div class="d-flex flex-wrap gap-2">
                  ${r.estado_reserva === 'pendiente_confirmacion' ? `
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold"
                      data-action="rechazar-reserva" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-x-circle me-1"></i>Rechazar Reserva
                    </button>
                    <button type="button" class="btn btn-paw btn-sm fw-bold px-3"
                      data-action="aceptar-reserva" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-check2-circle me-1"></i>Aceptar Reserva
                    </button>
                  ` : ''}

                  ${r.estado_reserva === 'confirmada' ? `
                    <button type="button" class="btn btn-success btn-sm fw-bold px-3"
                      data-action="checkin-reserva" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-box-arrow-in-right me-1"></i>Iniciar Check-In (Checklist)
                    </button>
                  ` : ''}

                  ${r.estado_reserva === 'en_curso' ? (() => {
                    const infoCheckout = evaluarDisponibilidadCheckoutLima(r);
                    return `
                    <button type="button" class="btn btn-outline-primary btn-sm fw-bold"
                      data-action="enviar-foto-reserva" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-camera-fill me-1"></i>Publicar Foto en Muro
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm fw-bold"
                      data-action="sos-reserva" data-id="${escapeHtml(r.id)}">
                      <i class="bi bi-hospital-fill me-1"></i>S.O.S.
                    </button>
                    ${infoCheckout.permitido ? `
                      <button type="button" class="btn btn-paw btn-sm fw-bold px-3"
                        data-action="checkout-reserva" data-id="${escapeHtml(r.id)}">
                        <i class="bi bi-patch-check-fill me-1"></i>Finalizar Check-Out (Liberar ${formatMoneda(r.monto_neto_cuidador, moneda)})
                      </button>
                    ` : `
                      <button type="button" class="btn btn-secondary btn-sm fw-bold px-3 opacity-75"
                        disabled title="${escapeHtml(infoCheckout.mensaje)}">
                        <i class="bi bi-clock-history me-1"></i>Check-Out (${escapeHtml(infoCheckout.mensaje)})
                      </button>
                    `}
                  `;
                  })() : ''}
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    // Accesos rápidos del banner y KPIs
    ws.querySelector('#hero-btn-ir-muro')?.addEventListener('click', () => {
      activeTab = 'muro';
      renderLayout();
    });
    ws.querySelector('#hero-btn-ir-agenda')?.addEventListener('click', () => {
      activeTab = 'agenda';
      renderLayout();
    });
    ws.querySelector('#kpi-card-ir-billetera')?.addEventListener('click', () => {
      activeTab = 'billetera';
      renderLayout();
    });

    // Filtros de estado
    ws.querySelectorAll('[data-filter-res]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filtroEstadoReserva = btn.getAttribute('data-filter-res');
        renderTabReservasYClientes(ws);
      });
    });

    const findRes = (id) => reservas.find((item) => item.id === id);

    // Acción: Ver Carné PAW-ID Validado
    ws.querySelectorAll('[data-action="ver-paw-id-cliente"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = findRes(btn.getAttribute('data-id'));
        if (res) abrirModalFichaMascotaCliente(res);
      });
    });

    // Acción: Ver Cartilla de Vacunas
    ws.querySelectorAll('[data-action="ver-cartilla-cliente"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = findRes(btn.getAttribute('data-id'));
        if (res) {
          abrirVisorCartillaVacunas({
            paw_id: res.mascota_paw_id,
            nombre: res.mascota_nombre,
            fecha_nacimiento: res.mascota_fecha_nacimiento,
            cartilla_vacunas_url: res.mascota_cartilla_url,
            estado_validacion_vet: res.mascota_estado_vet,
            clinica_validadora_nombre: res.mascota_clinica_validadora
          });
        }
      });
    });

    // Acción: Aceptar Reserva
    ws.querySelectorAll('[data-action="aceptar-reserva"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = findRes(btn.getAttribute('data-id'));
        if (!res) return;
        ejecutarAceptarReservaCuidador(res, (nuevasReservas) => {
          reservas = nuevasReservas;
          renderLayout();
        });
      });
    });

    // Acción: Rechazar Reserva
    ws.querySelectorAll('[data-action="rechazar-reserva"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = findRes(btn.getAttribute('data-id'));
        if (!res) return;
        abrirModalRechazarReservaCuidador(res, async ({ reservas: nuevasRes, agenda: nuevaAg }) => {
          reservas = nuevasRes;
          disponibilidad = nuevaAg;
          billeteraDatos = await obtenerDatosBilleteraCuidador(cuidadorProfile.id);
          renderLayout();
        });
      });
    });

    // Acción: Check-In con Checklist
    ws.querySelectorAll('[data-action="checkin-reserva"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = findRes(btn.getAttribute('data-id'));
        if (!res) return;
        abrirModalCheckinCuidador(res, (nuevasReservas) => {
          reservas = nuevasReservas;
          renderLayout();
        });
      });
    });

    // Acción: Check-Out con Checklist y liberación de garantía
    ws.querySelectorAll('[data-action="checkout-reserva"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = findRes(btn.getAttribute('data-id'));
        if (!res) return;
        abrirModalCheckoutCuidador(res, async ({ reservas: nuevasRes }) => {
          reservas = nuevasRes;
          billeteraDatos = await obtenerDatosBilleteraCuidador(cuidadorProfile.id);
          renderLayout();
        });
      });
    });

    // Acción: Ir a Enviar Foto al Muro para esta reserva
    ws.querySelectorAll('[data-action="enviar-foto-reserva"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        reservaPreseleccionadaMuro = btn.getAttribute('data-id');
        activeTab = 'muro';
        renderLayout();
      });
    });

    // Acción: Emitir S.O.S. para esta reserva
    ws.querySelectorAll('[data-action="sos-reserva"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        abrirModalEmitirSos({
          reservas,
          preselectedReservaId: btn.getAttribute('data-id'),
          distritoPropietario: cuidadorProfile.distrito_cusco
        });
      });
    });
  }

  /**
   * SECCIÓN 4: ENVIAR FOTOS Y REPORTES AL MURO PRIVADO DEL PROPIETARIO
   */
  function renderTabPublicarMuroFotos(ws) {
    const reservasEnCurso = reservas.filter((r) => r.estado_reserva === 'en_curso');
    const sinReservasEnCurso = reservasEnCurso.length === 0;
    const preselected = reservasEnCurso.find((r) => r.id === reservaPreseleccionadaMuro) || reservasEnCurso[0] || null;
    const historialEnviados = obtenerReportesEnviadosPorCuidador(cuidadorProfile.id);

    ws.innerHTML = `
      <div class="row g-4">
        <!-- Columna Izquierda: Formulario Rápido de Publicación al Muro -->
        <div class="col-lg-6">
          <div class="card card-paw p-4 border-0 shadow-sm h-100">
            <div class="mb-3 pb-2 border-bottom">
              <span class="badge bg-warning text-dark fw-bold mb-1">CONEXIÓN REALTIME CON EL PANEL DEL PROPIETARIO</span>
              <h5 class="fw-bold mb-1">
                <i class="bi bi-camera-reels-fill text-warning me-2"></i>Publicar Fotos y Reporte en el Muro
              </h5>
              <p class="text-secondary small mb-0">
                Envía hasta 3 fotografías por reporte desde tu cámara o galería para que el propietario siga en tiempo real el bienestar de su mascota.
              </p>
            </div>

            ${sinReservasEnCurso ? `
              <div class="alert alert-warning border-0 d-flex align-items-center gap-3 mb-3">
                <i class="bi bi-info-circle-fill fs-3 text-warning-emphasis"></i>
                <div class="small">
                  <strong>No tienes reservas En Curso en este momento:</strong><br>
                  Solo puedes enviar fotos al Muro cuando tengas una reserva activa <strong>En Curso</strong> (después de registrar el Check-In).
                </div>
              </div>
            ` : ''}

            <form id="form-publicar-muro-cuidador" novalidate>
              <fieldset ${sinReservasEnCurso ? 'disabled' : ''}>
                <div class="mb-3">
                  <label class="form-label small fw-bold">1. Selecciona la Reserva Activa En Curso *</label>
                  <select class="form-select" id="muro-cuid-select-reserva" required>
                    ${sinReservasEnCurso ? `
                      <option value="">Sin reservas En Curso disponibles</option>
                    ` : reservasEnCurso.map((r) => `
                      <option value="${escapeHtml(r.id)}" ${r.id === preselected?.id ? 'selected' : ''}>
                        ${escapeHtml(r.codigo_reserva)} — 🐾 ${escapeHtml(r.mascota_nombre)} (${escapeHtml(r.mascota_paw_id)}) • Dueño: ${escapeHtml(r.propietario_nombre)} [EN CURSO]
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="row g-2 mb-3">
                  <div class="col-sm-6">
                    <label class="form-label small fw-bold">2. Tipo de Actividad / Evento *</label>
                    <select class="form-select form-select-sm" id="muro-cuid-select-evento">
                      <option value="Paseo y Recreación">🐕 Paseo y Recreación</option>
                      <option value="Alimentación">🥣 Alimentación e Hidratación</option>
                      <option value="Descanso y Siesta">😴 Descanso y Siesta</option>
                      <option value="Juegos y Socialización">🎾 Juegos y Socialización</option>
                      <option value="Medicación / Higiene">💊 Medicación / Baño Higiénico</option>
                      <option value="Reporte General">📸 Reporte de Bienestar General</option>
                    </select>
                  </div>

                  <div class="col-sm-6">
                    <label class="form-label small fw-bold">3. Estado de Ánimo de la Mascota *</label>
                    <select class="form-select form-select-sm" id="muro-cuid-select-animo">
                      <option value="Feliz y moviendo la cola">😊 Feliz y moviendo la cola</option>
                      <option value="Activo y juguetón">⚡ Activo y juguetón</option>
                      <option value="Con buen apetito">🍖 Con buen apetito</option>
                      <option value="Tranquilo y relajado">😌 Tranquilo y relajado</option>
                      <option value="Durmiendo plácidamente">💤 Durmiendo plácidamente</option>
                    </select>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold">4. Ubicación Referencial en Cusco *</label>
                  <input type="text" class="form-control form-control-sm" id="muro-cuid-input-ubicacion" required
                    value="Parque Marianito Ferro - ${escapeHtml(cuidadorProfile.distrito_cusco)}, Cusco"
                    placeholder="Ej. Urb. Magisterio - Wanchaq, Cusco">
                </div>

                <!-- Dropzones de hasta 3 Fotografías (Cámara o Galería) -->
                <div class="p-3 bg-light rounded-3 border mb-3">
                  <label class="form-label small fw-bold mb-2">
                    <i class="bi bi-images text-warning me-1"></i>5. Subir Fotografías de Evidencia (Hasta 3 imágenes)
                  </label>

                  <div class="row g-2">
                    <div class="col-12">
                      <div id="uploader-muro-foto-1"></div>
                    </div>
                    <div class="col-md-6">
                      <div id="uploader-muro-foto-2"></div>
                    </div>
                    <div class="col-md-6">
                      <div id="uploader-muro-foto-3"></div>
                    </div>
                  </div>

                  <!-- Botones de fotos rápidas de demostración en Cusco -->
                  <div class="d-flex flex-wrap align-items-center gap-1 mt-2 pt-2 border-top">
                    <span class="small text-muted me-1" style="font-size:0.72rem;">Fotos demo rápidas:</span>
                    <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2" style="font-size:0.72rem;"
                      data-demo-foto="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80">
                      + Paseo soleado
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2" style="font-size:0.72rem;"
                      data-demo-foto="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800&auto=format&fit=crop&q=80">
                      + Hora de comer
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2" style="font-size:0.72rem;"
                      data-demo-foto="https://images.unsplash.com/photo-1534361960057-19889db9621e?w=800&auto=format&fit=crop&q=80">
                      + Siesta en jardín
                    </button>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label small fw-bold">6. Nota de Estado y Bienestar para el Dueño * (mín. 5 caracteres)</label>
                  <textarea class="form-control" id="muro-cuid-input-nota" rows="3" required minlength="5"
                    placeholder="Cuenta cómo estuvo su ánimo, alimentación, hidratación y paseo en Cusco..."></textarea>
                </div>

                <button type="submit" class="btn btn-paw w-100 fw-bold py-2" ${sinReservasEnCurso ? 'disabled' : ''}>
                  <i class="bi bi-send-check-fill me-1"></i>Publicar Instantáneamente en el Muro del Propietario
                </button>
              </fieldset>
            </form>
          </div>
        </div>

        <!-- Columna Derecha: Historial en Vivo de Reportes Publicados -->
        <div class="col-lg-6">
          <div class="card card-paw p-4 border-0 shadow-sm h-100">
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h6 class="fw-bold mb-0">
                <i class="bi bi-clock-history text-warning me-2"></i>Últimos Reportes Enviados al Muro (${historialEnviados.length})
              </h6>
              <span class="badge bg-success-subtle text-success">Sincronizado</span>
            </div>

            <div class="overflow-auto" style="max-height: 590px;">
              ${historialEnviados.map((rep) => `
                <div class="p-3 rounded-3 border bg-white mb-3">
                  <div class="d-flex justify-content-between align-items-start flex-wrap gap-1 mb-1">
                    <div>
                      <span class="badge bg-dark">${escapeHtml(rep.codigo_reserva || 'RES-2026')}</span>
                      <span class="badge bg-warning text-dark">${escapeHtml(rep.mascota_nombre)} (${escapeHtml(rep.mascota_paw_id)})</span>
                      <span class="badge bg-primary-subtle text-primary">${escapeHtml(rep.tipo_evento)}</span>
                    </div>
                    <span class="small text-muted">${formatFechaEs(rep.fecha_reporte, true)}</span>
                  </div>
                  <div class="small text-success fw-semibold mb-1">
                    <i class="bi bi-emoji-smile me-1"></i>${escapeHtml(rep.estado_animo_mascota)} •
                    <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(rep.ubicacion_referencial)}
                  </div>
                  <p class="small text-dark bg-light p-2 rounded border-start border-3 border-warning mb-2">
                    ${escapeHtml(rep.nota_estado)}
                  </p>
                  ${Array.isArray(rep.fotos_reporte) && rep.fotos_reporte.length > 0 ? `
                    <div class="d-flex flex-wrap gap-2">
                      ${rep.fotos_reporte.map((f) => `
                        <img src="${escapeHtml(f.foto_url)}" alt="Foto reporte"
                          class="rounded border" style="width:78px;height:78px;object-fit:cover;cursor:zoom-in;"
                          data-action="preview-foto-enviada"
                          data-url="${escapeHtml(f.foto_url)}"
                          data-desc="${escapeHtml(rep.nota_estado)}"
                          onerror="this.src='https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&auto=format&fit=crop&q=80'">
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    const muroUploaders = [
      mountFileUploader(ws.querySelector('#uploader-muro-foto-1'), {
        label: 'Fotografía Principal (Obligatoria)',
        accept: 'image/*',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.MURO,
        folder: 'reportes',
        compact: true
      }),
      mountFileUploader(ws.querySelector('#uploader-muro-foto-2'), {
        label: 'Fotografía 2 (Opcional)',
        accept: 'image/*',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.MURO,
        folder: 'reportes',
        compact: true
      }),
      mountFileUploader(ws.querySelector('#uploader-muro-foto-3'), {
        label: 'Fotografía 3 (Opcional)',
        accept: 'image/*',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.MURO,
        folder: 'reportes',
        compact: true
      })
    ];

    // Botones de fotos demo rápidas
    ws.querySelectorAll('[data-demo-foto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (sinReservasEnCurso) return;
        const url = btn.getAttribute('data-demo-foto');
        const slotLibre = muroUploaders.find((u) => !u.hasValue()) || muroUploaders[0];
        slotLibre.setValue(url);
      });
    });

    // Lightbox en el historial derecho
    ws.querySelectorAll('[data-action="preview-foto-enviada"]').forEach((img) => {
      img.addEventListener('click', () => {
        abrirLightboxFotoMuro(img.getAttribute('data-url'), img.getAttribute('data-desc'), {
          cuidador_nombre: `${cuidadorProfile.nombre} ${cuidadorProfile.apellido}`,
          fecha_reporte: new Date().toISOString()
        });
      });
    });

    // Submit del formulario de publicación al Muro
    ws.querySelector('#form-publicar-muro-cuidador')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sinReservasEnCurso) {
        showToast('Solo puedes publicar en el Muro cuando tengas una reserva activa En Curso.', 'warning');
        return;
      }

      const idReserva = ws.querySelector('#muro-cuid-select-reserva').value;
      const resObj = reservasEnCurso.find((r) => r.id === idReserva);
      if (!resObj || resObj.estado_reserva !== 'en_curso') {
        showToast('Selecciona una reserva activa En Curso para publicar en el Muro.', 'warning');
        return;
      }

      const tipoEvento = ws.querySelector('#muro-cuid-select-evento').value;
      const estadoAnimo = ws.querySelector('#muro-cuid-select-animo').value;
      const ubicacion = ws.querySelector('#muro-cuid-input-ubicacion').value.trim() || `${cuidadorProfile.distrito_cusco}, Cusco`;
      const notaEstado = ws.querySelector('#muro-cuid-input-nota').value.trim();

      if (notaEstado.length < 5) {
        showToast('Por favor escribe una nota de estado sobre la mascota (mínimo 5 caracteres).', 'warning');
        return;
      }

      showSpinner('Subiendo fotografías y publicando reporte en el Muro Privado del Propietario...');
      try {
        const urlsSubidas = (await Promise.all(muroUploaders.map((u) => u.uploadIfPending()))).filter(Boolean);

        if (urlsSubidas.length === 0) {
          showToast('Debes adjuntar al menos 1 fotografía de evidencia para publicar el reporte.', 'warning');
          hideSpinner();
          return;
        }

        const fotosResueltas = urlsSubidas.slice(0, 3).map((urlFinal, idx) => ({
          foto_url: urlFinal,
          origen_almacenamiento: 'supabase_storage',
          descripcion_foto: `${tipoEvento} — ${resObj?.mascota_nombre || 'Mascota'}`,
          orden: idx + 1
        }));

        // Insertar en Supabase (`reportes_seguimiento` + `fotos_reporte`)
        const supabase = getSupabase();
        let idReporteDb = null;

        if (supabase && isSupabaseConfigured() && !String(idReserva).startsWith('res-')) {
          const { data: repData, error: repErr } = await supabase
            .from('reportes_seguimiento')
            .insert([{
              id_reserva: idReserva,
              id_cuidador: cuidadorProfile.id,
              tipo_evento: tipoEvento,
              estado_animo_mascota: estadoAnimo,
              ubicacion_referencial: ubicacion,
              nota_estado: notaEstado,
              visto_por_propietario: false
            }])
            .select()
            .single();

          if (repErr) throw repErr;
          idReporteDb = repData.id;

          const rowsFotos = fotosResueltas.map((f, idx) => ({
            id_reporte: idReporteDb,
            foto_url: f.foto_url,
            origen_almacenamiento: 'supabase_storage',
            descripcion_foto: f.descripcion_foto,
            orden: idx + 1
          }));
          const { error: fotosErr } = await supabase.from('fotos_reporte').insert(rowsFotos);
          if (fotosErr) throw fotosErr;
        }

        // Sincronizar con `paw_demo_muro_reportes_v5` para visualización instantánea
        agregarReporteMuroLocal({
          id: idReporteDb,
          id_reserva: idReserva,
          codigo_reserva: resObj?.codigo_reserva || 'RES-2026-0102',
          id_cuidador: cuidadorProfile.id,
          cuidador_nombre: `${cuidadorProfile.nombre} ${cuidadorProfile.apellido}`,
          cuidador_foto: cuidadorProfile.foto_url,
          mascota_id: resObj?.id_mascota,
          mascota_nombre: resObj?.mascota_nombre || 'Inti',
          mascota_paw_id: resObj?.mascota_paw_id || 'PAW-6858',
          tipo_evento: tipoEvento,
          estado_animo_mascota: estadoAnimo,
          ubicacion_referencial: ubicacion,
          nota_estado: notaEstado,
          fotos: fotosResueltas
        });

        showToast(
          `📸 Reporte con ${fotosResueltas.length} foto(s) publicado instantáneamente en el Muro Privado de ${resObj?.propietario_nombre || 'su propietario'}.`,
          'success',
          'Publicado en el Muro en Vivo'
        );

        renderTabPublicarMuroFotos(ws);
      } catch (err) {
        handleSupabaseError(err, 'No se pudo publicar el reporte en el muro.');
      } finally {
        hideSpinner();
      }
    });
  }

  /**
   * SECCIÓN 5: MI PERFIL PROFESIONAL, CRUD DE SERVICIOS Y RESPUESTA A RESEÑAS
   */
  function renderTabServiciosYResenas(ws) {
    const moneda = localStorage.getItem('paw_currency') || 'PEN';

    ws.innerHTML = `
      <!-- Fotografías Oficiales de Perfil y Hogar Anfitrión del Cuidador -->
      <div class="card card-paw p-4 border-0 shadow-sm mb-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
          <div>
            <h5 class="fw-bold mb-1">
              <i class="bi bi-person-bounding-box text-warning me-2"></i>Fotografías de Perfil y Hogar Anfitrión en Cusco
            </h5>
            <p class="text-secondary small mb-0">
              Mantén actualizadas tu foto de perfil y la fotografía de tu hogar/jardín que ven los propietarios en el catálogo.
            </p>
          </div>
          <span class="badge bg-dark">${escapeHtml(cuidadorProfile.codigo_cuidador)}</span>
        </div>

        <form id="form-fotos-perfil-cuidador" novalidate>
          <div class="row g-3">
            <div class="col-md-6">
              <div class="p-3 bg-light rounded-3 border h-100">
                <div id="uploader-cuid-panel-avatar"></div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="p-3 bg-light rounded-3 border h-100">
                <div id="uploader-cuid-panel-hogar"></div>
              </div>
            </div>
          </div>
          <div class="text-end mt-3">
            <button type="submit" class="btn btn-paw btn-sm fw-bold px-3">
              <i class="bi bi-floppy-fill me-1"></i>Guardar Fotografías de Perfil y Hogar
            </button>
          </div>
        </form>
      </div>

      <!-- Mis Modalidades de Servicio y Tarifas (HU-XXX) -->
      <div class="card card-paw p-4 border-0 shadow-sm mb-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3 pb-3 border-bottom">
          <div>
            <h5 class="fw-bold mb-1">
              <i class="bi bi-briefcase-fill text-warning me-2"></i>Mis Ofertas de Servicio y Tarifas en Cusco (${servicios.length})
            </h5>
            <p class="text-secondary small mb-0">
              Gestiona tus modalidades publicadas en el catálogo público (Paseo, Hospedaje, Guardería, Domicilio Turístico).
            </p>
          </div>
          <button type="button" class="btn btn-paw btn-sm fw-bold" id="btn-nuevo-servicio-cuid">
            <i class="bi bi-plus-circle-fill me-1"></i>Crear Nueva Oferta de Servicio
          </button>
        </div>

        <div class="row g-3">
          ${servicios.map((srv) => `
            <div class="col-md-6">
              <div class="p-3 rounded-3 border bg-white h-100 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-dark font-monospace">${escapeHtml(srv.hu_ecode || 'HU-100')}</span>
                    <span class="badge ${srv.disponible !== false ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                      ${srv.disponible !== false ? '● Activo en Catálogo' : '○ Pausado'}
                    </span>
                  </div>
                  <h6 class="fw-bold text-dark mb-1">${escapeHtml(srv.tipo_servicio)}</h6>
                  <div class="badge bg-warning-subtle text-dark border mb-2">${escapeHtml(srv.categoria)}</div>
                  <p class="small text-secondary mb-2">${escapeHtml(srv.descripcion_servicio)}</p>
                </div>

                <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                  <div>
                    <span class="fs-5 fw-bold text-dark">${formatMoneda(srv.tarifa_diaria_por_perro, moneda)}</span>
                    <span class="small text-muted">/ día</span>
                    ${srv.incluye_recojo_hotel ? '<span class="badge bg-info-subtle text-primary ms-1">Recojo Hotel</span>' : ''}
                  </div>
                  <button type="button" class="btn btn-outline-primary btn-sm"
                    data-action="editar-servicio-cuid" data-id="${escapeHtml(srv.id)}">
                    <i class="bi bi-pencil-square me-1"></i>Editar
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Reseñas Verificadas y Respuesta Pública del Cuidador -->
      <div class="card card-paw p-4 border-0 shadow-sm">
        <h5 class="fw-bold mb-3">
          <i class="bi bi-chat-quote-fill text-warning me-2"></i>Reseñas Verificadas de Propietarios (${resenas.length})
        </h5>

        ${resenas.map((rv) => `
          <div class="p-3 rounded-3 border bg-white mb-3">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <div>
                <strong class="text-dark">${escapeHtml(rv.propietario_nombre)}</strong>
                <span class="badge bg-dark ms-1">${escapeHtml(rv.codigo_reserva)}</span>
                <span class="badge bg-light text-dark border ms-1">🐾 ${escapeHtml(rv.mascota_nombre)}</span>
              </div>
              <div class="text-warning fw-bold">
                ${'★'.repeat(Number(rv.calificacion_estrellas || 5))}
                <span class="text-muted small fw-normal ms-1">${formatFechaEs(rv.created_at)}</span>
              </div>
            </div>
            <p class="small text-dark mb-2">"${escapeHtml(rv.comentario)}"</p>

            ${rv.respuesta_cuidador ? `
              <div class="p-2 bg-light rounded border-start border-3 border-success small">
                <div class="fw-bold text-success"><i class="bi bi-reply-fill me-1"></i>Tu respuesta pública:</div>
                <div class="text-secondary">${escapeHtml(rv.respuesta_cuidador)}</div>
              </div>
            ` : `
              <div class="input-group input-group-sm mt-2">
                <input type="text" class="form-control" id="input-resp-resena-${escapeHtml(rv.id)}"
                  placeholder="Escribe una respuesta pública de agradecimiento...">
                <button class="btn btn-paw fw-semibold" type="button"
                  data-action="responder-resena" data-id="${escapeHtml(rv.id)}">
                  <i class="bi bi-send me-1"></i>Responder
                </button>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    `;

    const upAvatarCuid = mountFileUploader(ws.querySelector('#uploader-cuid-panel-avatar'), {
      label: 'Fotografía de Perfil del Cuidador',
      accept: 'image/*',
      bucket: CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES,
      folder: 'cuidadores/perfiles',
      initialValue: cuidadorProfile.foto_url || ''
    });

    const upHogarCuid = mountFileUploader(ws.querySelector('#uploader-cuid-panel-hogar'), {
      label: 'Fotografía de tu Hogar / Jardín de Custodia',
      accept: 'image/*',
      bucket: CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES,
      folder: 'cuidadores/hogares',
      initialValue: cuidadorProfile.foto_hogar_url || ''
    });

    ws.querySelector('#form-fotos-perfil-cuidador')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      showSpinner('Guardando fotografías de perfil y hogar del cuidador...');
      try {
        const [nuevaFotoPerfil, nuevaFotoHogar] = await Promise.all([
          upAvatarCuid.uploadIfPending(),
          upHogarCuid.uploadIfPending()
        ]);

        const supabase = getSupabase();
        if (supabase && isSupabaseConfigured() && cuidadorProfile.id && !String(cuidadorProfile.id).startsWith('mock-')) {
          const { error } = await supabase
            .from('perfiles_cuidadores')
            .update({
              foto_url: nuevaFotoPerfil || cuidadorProfile.foto_url,
              foto_hogar_url: nuevaFotoHogar || cuidadorProfile.foto_hogar_url || null
            })
            .eq('id', cuidadorProfile.id);
          if (error) throw error;
        }

        if (nuevaFotoPerfil) cuidadorProfile.foto_url = nuevaFotoPerfil;
        if (nuevaFotoHogar) cuidadorProfile.foto_hogar_url = nuevaFotoHogar;
        showToast('Fotografías de perfil y hogar actualizadas con éxito.', 'success');
        renderLayout();
      } catch (err) {
        handleSupabaseError(err, 'No se pudieron actualizar las fotografías del perfil.');
      } finally {
        hideSpinner();
      }
    });

    ws.querySelector('#btn-nuevo-servicio-cuid')?.addEventListener('click', () => {
      abrirModalServicioCuidador(null, cuidadorProfile.id, (nuevos) => {
        servicios = nuevos;
        renderTabServiciosYResenas(ws);
      });
    });

    ws.querySelectorAll('[data-action="editar-servicio-cuid"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const srv = servicios.find((s) => s.id === btn.getAttribute('data-id'));
        if (srv) {
          abrirModalServicioCuidador(srv, cuidadorProfile.id, (nuevos) => {
            servicios = nuevos;
            renderTabServiciosYResenas(ws);
          });
        }
      });
    });

    ws.querySelectorAll('[data-action="responder-resena"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idRev = btn.getAttribute('data-id');
        const inputEl = ws.querySelector(`#input-resp-resena-${idRev}`);
        const texto = inputEl?.value.trim();
        if (!texto || texto.length < 3) {
          showToast('Escribe una respuesta breve para publicar.', 'warning');
          return;
        }

        showSpinner('Publicando respuesta en tu perfil público...');
        try {
          const supabase = getSupabase();
          const ahoraIso = new Date().toISOString();
          if (supabase && isSupabaseConfigured() && !String(idRev).startsWith('rev-')) {
            const { error } = await supabase
              .from('resenas')
              .update({ respuesta_cuidador: texto, fecha_respuesta: ahoraIso })
              .eq('id', idRev);
            if (error) throw error;
          }
          resenas = resenas.map((r) => (
            r.id === idRev ? { ...r, respuesta_cuidador: texto, fecha_respuesta: ahoraIso } : r
          ));
          saveLocalResenasCuidador(resenas);
          showToast('Respuesta publicada en tu perfil del catálogo.', 'success');
          renderTabServiciosYResenas(ws);
        } catch (err) {
          handleSupabaseError(err, 'No se pudo publicar la respuesta a la reseña.');
        } finally {
          hideSpinner();
        }
      });
    });
  }

  renderLayout();
}

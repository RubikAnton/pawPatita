/**
 * Paw Patita Cusco v5.0 — Vista Pública Segura del Carné Digital PAW-ID
 * js/public/paw-id-publico.js
 * 
 * Vista de emergencia invocada al escanear el código QR del carné (#/paw-id/:paw_id).
 * Invoca el RPC `rpc_obtener_paw_id_publico` en PostgreSQL / Supabase, exponiendo
 * foto, estado sanitario, vacunas, datos médicos críticos y botones de llamada/WhatsApp,
 * ocultando estrictamente el DNI y la dirección privada del propietario.
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { escapeHtml, calcularEdadDinamica, formatFechaEs } from '../utils/formatters.js';
import { t, applyTranslations } from '../i18n.js';

// Datos semilla de respaldo para pruebas locales o escaneo sin conexión Supabase activa
const MASCOTA_SEED_PUBLIC = {
  paw_id: 'PAW-6858',
  nombre: 'Inti',
  raza: 'Golden Retriever',
  fecha_nacimiento: '2023-04-15',
  edad_formateada: '3 años y 7 meses',
  tamano: 'Grande',
  sexo: 'Macho',
  peso_kg: 28.5,
  esterilizado: true,
  vacunas_al_dia: true,
  fecha_venc_vacunas: '2027-05-10',
  alergias_restricciones: 'Alérgico al pollo crudo y picaduras de pulgas.',
  medicacion_actual: 'Ninguna medicación continua.',
  conducta_observaciones: 'Muy amigable con personas y niños. Puede ponerse nervioso con pirotecnia.',
  foto_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&auto=format&fit=crop&q=80',
  estado_validacion_vet: 'validado',
  clinica_validadora_nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
  clinica_validadora_cmvp: 'CMVP-CUSCO-4821',
  observacion_veterinaria: 'Examen clínico general óptimo. Vacunación séxtuple y antirrábica vigentes.',
  fecha_ultima_validacion: '2026-10-12',
  propietario_nombre: 'Lucía Mendoza Vargas',
  propietario_telefono: '+51 984 711 222',
  propietario_distrito: 'Wanchaq, Cusco',
  contacto_emergencia_nombre: 'Carlos Mendoza',
  contacto_emergencia_tel: '+51 984 999 888'
};

/**
 * Consulta la ficha médica segura desde Supabase vía RPC
 * @param {string} pawId 
 */
async function consultarPawIdPublico(pawId) {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    console.info('Consultando ficha PAW-ID en modo demostración/semilla:', pawId);
    if (pawId.toUpperCase().includes('6858') || pawId.toUpperCase().includes('ROCKY')) {
      return { exito: true, mascota: MASCOTA_SEED_PUBLIC };
    }
    // Generar datos dinámicos amigables si se escanea otro ID en demo
    return {
      exito: true,
      mascota: {
        ...MASCOTA_SEED_PUBLIC,
        paw_id: pawId.toUpperCase(),
        nombre: 'Mascota Registrada',
        raza: 'Mestizo Andino'
      }
    };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_obtener_paw_id_publico', {
      p_paw_id: pawId.trim()
    });

    if (error) {
      console.warn('Fallo al invocar rpc_obtener_paw_id_publico:', error);
      return { exito: false, mensaje: error.message };
    }

    return data;
  } catch (err) {
    console.error('Error de red al consultar PAW-ID:', err);
    return { exito: false, mensaje: 'Error de conexión con la central médica de Paw Patita.' };
  }
}

/**
 * Renderiza la vista pública de la Ficha PAW-ID en el contenedor principal
 * @param {HTMLElement} container 
 * @param {string} pawId 
 */
export async function renderPawIdPublico(container, pawId) {
  if (!container) return;

  container.innerHTML = `
    <div class="container py-5 text-center">
      <div class="spinner-border text-warning" role="status"></div>
      <p class="text-muted small mt-2">Verificando identidad médica en la Red Paw Patita Cusco...</p>
    </div>
  `;

  const respuesta = await consultarPawIdPublico(pawId);

  if (!respuesta.exito || !respuesta.mascota) {
    container.innerHTML = `
      <div class="container py-5 text-center">
        <div class="card card-paw p-4 max-w-lg mx-auto border-0 shadow-sm" style="max-width: 520px;">
          <div class="rounded-circle bg-danger bg-opacity-10 d-inline-flex p-3 mx-auto mb-3 text-danger fs-1">
            <i class="bi bi-shield-x"></i>
          </div>
          <h4 class="fw-bold text-dark mb-2">Carné PAW-ID No Encontrado</h4>
          <span class="badge bg-secondary fs-6 px-3 py-1 mb-3">${escapeHtml(pawId)}</span>
          <p class="text-secondary small mb-4">
            ${escapeHtml(respuesta.mensaje || 'El código escaneado no corresponde a un carné activo o ha sido archivado.')}
          </p>
          <div class="d-flex justify-content-center gap-2">
            <a href="#/" class="btn btn-paw-outline">Volver al Inicio</a>
            <a href="#/catalogo" class="btn btn-paw">Explorar Cuidadores</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const m = respuesta.mascota;

  // Cálculo de edad exacta o fallback
  let edadTexto = m.edad_formateada;
  if (!edadTexto && m.fecha_nacimiento) {
    const calc = calcularEdadDinamica(m.fecha_nacimiento);
    edadTexto = calc.texto;
  }
  edadTexto = edadTexto || 'Edad no especificada';

  // Badge de Validación Sanitaria
  let badgeSanitarioHtml = '';
  const estadoVet = (m.estado_validacion_vet || 'pendiente').toLowerCase();

  if (estadoVet === 'validado') {
    badgeSanitarioHtml = `
      <span class="badge badge-sanitario-validado px-3 py-2 rounded-pill fw-bold">
        <i class="bi bi-shield-check text-success me-1"></i> Sanitariamente Validado
      </span>
    `;
  } else if (estadoVet === 'observado') {
    badgeSanitarioHtml = `
      <span class="badge badge-sanitario-observado px-3 py-2 rounded-pill fw-bold">
        <i class="bi bi-exclamation-triangle-fill text-danger me-1"></i> Observación Sanitaria Activa
      </span>
    `;
  } else {
    badgeSanitarioHtml = `
      <span class="badge badge-sanitario-pendiente px-3 py-2 rounded-pill fw-bold">
        <i class="bi bi-hourglass-split text-warning me-1"></i> Validación Veterinaria Pendiente
      </span>
    `;
  }

  // Enlace directo de WhatsApp con mensaje predeterminado
  const telLimpio = m.propietario_telefono?.replace(/[^0-9]/g, '') || '';
  const mensajeWa = encodeURIComponent(
    `Hola ${m.propietario_nombre}, acabo de escanear la placa PAW-ID (${m.paw_id}) de tu mascota ${m.nombre} en Cusco. ¿Necesitas ayuda o está contigo?`
  );
  const waUrl = `https://wa.me/${telLimpio.startsWith('51') ? telLimpio : '51' + telLimpio}?text=${mensajeWa}`;

  container.innerHTML = `
    <div class="container py-4">
      <div class="paw-id-public-card">
        <!-- Banner de Emergencia / Mascota Extraviada -->
        <div class="paw-id-banner-emergencia">
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold small text-white"><i class="bi bi-paw-fill me-1"></i> PAW-ID CUSCO</span>
            <span class="badge bg-white text-danger fw-bold">FICHA DE EMERGENCIA</span>
          </div>
          <h4 class="fw-bold mb-0 mt-2 text-white" data-i18n="paw_id.banner_title">¿Encontraste a esta mascota?</h4>
          <p class="small mb-0 opacity-90 text-white" data-i18n="paw_id.banner_subtitle">Comunícate de inmediato con su dueño o con el contacto de auxilio.</p>
        </div>

        <div class="paw-id-body">
          <!-- Cabecera de la Mascota -->
          <div class="paw-id-pet-header">
            <img src="${escapeHtml(m.foto_url || 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&auto=format&fit=crop&q=80')}"
                 alt="${escapeHtml(m.nombre)}"
                 class="paw-id-foto-grande"
                 onerror="this.src='https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&auto=format&fit=crop&q=80'">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                <h3 class="fw-bold mb-0 text-dark">${escapeHtml(m.nombre)}</h3>
                <span class="badge bg-dark fs-6">${escapeHtml(m.paw_id)}</span>
              </div>
              <div class="text-secondary small mb-2">
                ${escapeHtml(m.raza || 'Mestizo')} • ${escapeHtml(m.sexo || 'Macho')} • ${escapeHtml(edadTexto)}
              </div>
              <div>${badgeSanitarioHtml}</div>
            </div>
          </div>

          <!-- Botones de Contacto Directo de Emergencia -->
          <div class="d-grid gap-2 mb-4">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-contacto-emergencia btn-contacto-whatsapp shadow-sm">
              <i class="bi bi-whatsapp fs-5"></i> <span data-i18n="paw_id.btn_wa">Escribir por WhatsApp al Propietario</span>
            </a>
            <a href="tel:${escapeHtml(m.propietario_telefono?.replace(/\s+/g, '') || '')}" class="btn-contacto-emergencia btn-contacto-tel shadow-sm">
              <i class="bi bi-telephone-fill fs-5"></i> <span data-i18n="paw_id.btn_tel">Llamar al Dueño</span> (${escapeHtml(m.propietario_telefono || 'No disponible')})
            </a>
          </div>

          <!-- Cuadrícula de Información Física y Médica -->
          <div class="paw-id-info-grid">
            <div class="paw-id-info-item">
              <span class="paw-id-label">Tamaño / Peso</span>
              <span class="paw-id-valor">${escapeHtml(m.tamano || 'Mediano')} (${escapeHtml(m.peso_kg || 15)} kg)</span>
            </div>
            <div class="paw-id-info-item">
              <span class="paw-id-label">Esterilizado</span>
              <span class="paw-id-valor">${m.esterilizado ? 'Sí (Operado)' : 'No'}</span>
            </div>
            <div class="paw-id-info-item">
              <span class="paw-id-label">Vacunación</span>
              <span class="paw-id-valor text-success">
                <i class="bi bi-check-circle-fill me-1"></i>${m.vacunas_al_dia ? 'Al día' : 'Pendiente'}
              </span>
            </div>
            <div class="paw-id-info-item">
              <span class="paw-id-label">Vigencia Vacunas</span>
              <span class="paw-id-valor">${m.fecha_venc_vacunas ? formatFechaEs(m.fecha_venc_vacunas) : 'Vigente'}</span>
            </div>
          </div>

          <!-- Alertas Médicas y Cuidados Especiales -->
          ${(m.alergias_restricciones || m.medicacion_actual) ? `
            <div class="paw-id-alerta-medica">
              <div class="fw-bold text-danger mb-1">
                <i class="bi bi-exclamation-octagon-fill me-1"></i> Alergias y Medicación Crítica
              </div>
              ${m.alergias_restricciones ? `<div class="small text-dark mb-1"><strong>Alergias:</strong> ${escapeHtml(m.alergias_restricciones)}</div>` : ''}
              ${m.medicacion_actual ? `<div class="small text-dark"><strong>Medicación:</strong> ${escapeHtml(m.medicacion_actual)}</div>` : ''}
            </div>
          ` : ''}

          <!-- Conducta y Comportamiento -->
          <div class="p-3 border rounded bg-light small mb-3">
            <strong class="text-dark d-block mb-1"><i class="bi bi-info-circle me-1"></i> Conducta y Temperamento</strong>
            <p class="text-muted mb-0">
              ${escapeHtml(m.conducta_observaciones || 'Mascota amigable y dócil. Acercarse con calma y sin movimientos bruscos.')}
            </p>
          </div>

          <!-- Sello de Clínica Validadora -->
          ${m.clinica_validadora_nombre ? `
            <div class="p-3 border rounded border-success bg-white small mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="text-success"><i class="bi bi-patch-check-fill me-1"></i> Ficha Validada por Clínica Colegiada</strong>
                <span class="badge bg-light text-dark border">${escapeHtml(m.clinica_validadora_cmvp || 'CMVP')}</span>
              </div>
              <div class="text-dark fw-semibold">${escapeHtml(m.clinica_validadora_nombre)}</div>
              ${m.observacion_veterinaria ? `<div class="text-muted small mt-1"><em>"${escapeHtml(m.observacion_veterinaria)}"</em></div>` : ''}
            </div>
          ` : ''}

          <!-- Contacto Secundario de Emergencia -->
          ${m.contacto_emergencia_tel ? `
            <div class="border-top pt-3 d-flex justify-content-between align-items-center text-muted small">
              <span>Contacto de Auxilio: <strong>${escapeHtml(m.contacto_emergencia_nombre || 'Familiar')}</strong></span>
              <a href="tel:${escapeHtml(m.contacto_emergencia_tel?.replace(/\s+/g, '') || '')}" class="btn btn-outline-secondary btn-sm">
                <i class="bi bi-telephone"></i> ${escapeHtml(m.contacto_emergencia_tel)}
              </a>
            </div>
          ` : ''}

          <!-- Nota de Privacidad -->
          <div class="text-center text-muted small mt-4 pt-2 border-top">
            <i class="bi bi-shield-shaded me-1"></i> Por seguridad, el DNI y la dirección domiciliaria del propietario están protegidos bajo la Ley N° 29733.
          </div>
        </div>
      </div>
    </div>
  `;

  applyTranslations(container);
}

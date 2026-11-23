/**
 * Paw Patita Cusco v5.0 — Landing Page Pública
 * js/public/landing.js
 * 
 * Sección Hero con CTA claro, propuesta de valor para dueños locales y turistas en Cusco,
 * estadísticas de impacto, testimonios reales, directorio de clínicas aliadas de urgencia 24h,
 * temporadas turísticas y política escalonada de cancelaciones.
 */

import { getSupabase, isSupabaseConfigured, resolveMediaUrl } from '../supabase-client.js';
import { formatMoneda, escapeHtml } from '../utils/formatters.js';
import { t, applyTranslations } from '../i18n.js';

// Fallbacks SVG inline temáticos para clínicas y mascotas (cero fallos de red offline)
const SVG_CLINICA_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250' fill='%23FAF7F2'><rect width='400' height='250' fill='%23F3EDE2'/><circle cx='200' cy='105' r='42' fill='%231E5631'/><path d='M193 82 h14 v46 h-14 z M177 98 h46 v14 h-46 z' fill='white'/><text x='200' y='180' font-family='sans-serif' font-size='15' font-weight='bold' fill='%23111827' text-anchor='middle'>Clínica Veterinaria Aliada 24h</text><text x='200' y='205' font-family='sans-serif' font-size='12' fill='%23E85D24' text-anchor='middle'>Paw Patita Cusco v5.1</text></svg>";
const SVG_PET_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' fill='%23FAF7F2'><rect width='400' height='300' fill='%23F3EDE2'/><circle cx='200' cy='120' r='50' fill='%23E85D24'/><text x='200' y='138' font-size='42' text-anchor='middle'>🐾</text><text x='200' y='205' font-family='sans-serif' font-size='16' font-weight='bold' fill='%23111827' text-anchor='middle'>Mascota Feliz en Cusco</text><text x='200' y='230' font-family='sans-serif' font-size='12' fill='%231E5631' text-anchor='middle'>Paw Patita Cusco v5.1</text></svg>";

// Datos semilla de clínicas aliadas para visualización garantizada y modo offline/demo
const CLINICAS_SEED = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    codigo_clinica: 'VET-001',
    nombre: 'Clínica Veterinaria San Francisco Cusco 24h',
    direccion: 'Av. de la Cultura 1420, frente a UNSAAC',
    distrito_cusco: 'Wanchaq',
    telefono_emergencia: '+51 984 711 222',
    horario_atencion: '24 Horas',
    especialidades: ['Emergencias 24h', 'Traumatología', 'UCI Canina', 'Laboratorio'],
    tarifa_consulta_emergencia: 60.00,
    colegiatura_cmvp: 'CMVP-CUSCO-4821',
    foto_fachada_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '40000000-0000-0000-0000-000000000002',
    codigo_clinica: 'VET-002',
    nombre: 'Centro Médico Veterinario Qorikancha Pet',
    direccion: 'Av. El Sol 815, Centro Histórico',
    distrito_cusco: 'Cusco Centro',
    telefono_emergencia: '+51 984 822 333',
    horario_atencion: '24 Horas',
    especialidades: ['Emergencias 24h', 'Oxigenoterapia de Altura', 'Ecografía'],
    tarifa_consulta_emergencia: 65.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5104',
    foto_fachada_url: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '40000000-0000-0000-0000-000000000003',
    codigo_clinica: 'VET-003',
    nombre: 'Veterinaria Los Andes & Spa Canino',
    direccion: 'Av. Cusco 512, Paradero Enaco',
    distrito_cusco: 'San Sebastián',
    telefono_emergencia: '+51 984 933 444',
    horario_atencion: 'Extendido (07:00 - 22:00)',
    especialidades: ['Cirugía General', 'Vacunación Internacional', 'Dermatología'],
    tarifa_consulta_emergencia: 50.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5390',
    foto_fachada_url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '40000000-0000-0000-0000-000000000004',
    codigo_clinica: 'VET-004',
    nombre: 'Hospital Veterinario Valle Sur Cusco',
    direccion: 'Av. Manco Cápac 310, Plaza San Jerónimo',
    distrito_cusco: 'San Jerónimo',
    telefono_emergencia: '+51 984 644 555',
    horario_atencion: '24 Horas',
    especialidades: ['Emergencias 24h', 'Hospitalización', 'Cardiología'],
    tarifa_consulta_emergencia: 55.00,
    colegiatura_cmvp: 'CMVP-CUSCO-5612',
    foto_fachada_url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80'
  }
];

const TESTIMONIOS = [
  {
    autor: 'Lucía Mendoza Vargas',
    origen: 'Propietario Local • Wanchaq, Cusco',
    mascota: 'Toby (Golden Retriever, 3 años)',
    texto: 'Dejar a Toby mientras trabajo en la universidad solía ser una preocupación constante. Con Valeria recibo fotos en tiempo real y el carné PAW-ID me dio total tranquilidad médica.',
    estrellas: 5,
    foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
  },
  {
    autor: 'Martin Dupont',
    origen: 'Turista • Lyon, Francia',
    mascota: 'Rocky (Jack Russell, 2 años)',
    texto: 'Viajamos a Cusco con nuestro perro pero no podíamos llevarlo a Machu Picchu. Diego cuidó a Rocky directamente en nuestro hotel con recojo incluido y un trato 100% bilingüe y cariñoso.',
    estrellas: 5,
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  },
  {
    autor: 'Camila Rojas Yábar',
    origen: 'Cuidadora Certificada • San Sebastián',
    mascota: 'Especialista en hospedaje familiar',
    texto: 'Paw Patita me permite brindar hospedaje familiar seguro con ingresos justos (85% neto) y el respaldo de clínicas 24h si ocurre cualquier eventualidad.',
    estrellas: 5,
    foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'
  }
];

/**
 * Obtiene las clínicas activas desde Supabase con fallback
 */
async function obtenerClinicasActivas() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return CLINICAS_SEED;
  }

  try {
    const { data, error } = await supabase
      .from('clinicas_veterinarias')
      .select('*')
      .eq('activa', true)
      .order('distrito_cusco', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Usando clínicas locales de respaldo:', error);
      return CLINICAS_SEED;
    }
    return data;
  } catch (err) {
    console.error('Error al consultar clínicas:', err);
    return CLINICAS_SEED;
  }
}

/**
 * Renderiza la Landing Page completa en el contenedor principal
 * @param {HTMLElement} container 
 */
export async function renderLanding(container) {
  if (!container) return;

  const currentCurrency = localStorage.getItem('paw_currency') || 'PEN';

  container.innerHTML = `
    <!-- HERO SECTION ANDINO EDITORIAL (2 COLUMNAS) -->
    <section class="hero-andes-cusco py-5">
      <div class="container py-4">
        <div class="row align-items-center g-5">
          <!-- Columna Izquierda: Propuesta de Valor y CTAs -->
          <div class="col-lg-7">
            <span class="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold mb-3 shadow-sm d-inline-flex align-items-center">
              <i class="bi bi-geo-alt-fill text-danger me-2"></i>
              <span data-i18n="landing.badge_red">Red de Cuidado Familiar & Central S.O.S. en Cusco</span>
            </span>
            <h1 class="display-5 fw-bold text-dark mb-3" style="letter-spacing: -0.02em; line-height: 1.18;" data-i18n="landing.hero_title">
              Cuidado Familiar y Amor Real para tu Mascota en Cusco
            </h1>
            <p class="lead text-secondary mb-4" data-i18n="landing.hero_lead">
              Conectamos a cuidadores independientes verificados con propietarios locales y turistas.
              Con carné digital <strong>PAW-ID</strong>, cobertura de emergencias con clínicas aliadas 24h y fotos en vivo durante todo el servicio.
            </p>
            <div class="d-flex gap-3 flex-wrap mb-4">
              <a href="#/catalogo" class="btn btn-paw btn-lg shadow">
                <i class="bi bi-compass me-1"></i> <span data-i18n="landing.btn_catalogo">Explorar Catálogo de Cuidadores</span>
              </a>
              <button class="btn btn-paw-outline btn-lg" data-bs-toggle="modal" data-bs-target="#modal-postular-cuidador">
                <i class="bi bi-heart-fill me-1"></i> <span data-i18n="landing.btn_postular_cuid">Postular como Cuidador</span>
              </button>
              <button class="btn btn-outline-secondary btn-lg" data-bs-toggle="modal" data-bs-target="#modal-postular-clinica">
                <i class="bi bi-hospital me-1"></i> <span data-i18n="landing.btn_afiliar_clinica">Afiliar Clínica Veterinaria</span>
              </button>
            </div>

            <!-- Badges de Confianza Andina -->
            <div class="row g-2 pt-2 text-secondary small">
              <div class="col-sm-6">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-shield-check text-success fs-5"></i>
                  <span data-i18n="landing.trust_police">Antecedentes Policiales Verificados</span>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-qr-code text-primary fs-5"></i>
                  <span data-i18n="landing.trust_pawid">Carné PAW-ID Escaneable</span>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-hospital text-danger fs-5"></i>
                  <span data-i18n="landing.trust_vets">Red Médica 24h en Cusco</span>
                </div>
              </div>
              <div class="col-sm-6">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-lock text-warning fs-5"></i>
                  <span data-i18n="landing.trust_escrow">Pago Protegido en Garantía (15% / 85%)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Composición Fotográfica Andes & Mascotas -->
          <div class="col-lg-5">
            <div class="position-relative p-2">
              <div class="card border-0 shadow-xl overflow-hidden" style="border-radius: var(--pp-radius-xl, 24px); border: 3px solid var(--pp-border-warm, #E7DDD0);">
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80"
                     alt="Mascotas felices en Cusco"
                     class="img-fluid w-100"
                     style="height: 380px; object-fit: cover;"
                     onerror="this.onerror=null; this.src='${SVG_PET_FALLBACK}';">
                <div class="card-img-overlay d-flex flex-column justify-content-between p-3" style="background: linear-gradient(to top, rgba(11,17,32,0.7) 0%, transparent 60%);">
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-light text-dark shadow-sm">
                      <i class="bi bi-geo-alt-fill text-danger me-1"></i> Valle Sagrado & Cusco
                    </span>
                    <span class="badge bg-success shadow-sm">
                      <i class="bi bi-check-circle-fill me-1"></i> 100% Amor Familiar
                    </span>
                  </div>
                  <div class="text-white">
                    <div class="d-flex align-items-center gap-2 mb-1">
                      <span class="badge bg-warning text-dark fw-bold">PAW-ID Activo</span>
                      <small class="opacity-90">Custodia Verificada</small>
                    </div>
                    <h5 class="fw-bold mb-0 text-white">Inti & Toby en Cusco</h5>
                  </div>
                </div>
              </div>

              <!-- Tarjeta Flotante: Adaptación y Altura -->
              <div class="position-absolute bottom-0 start-0 translate-middle-y bg-white p-3 rounded shadow-lg border d-none d-sm-flex align-items-center gap-3 ms-n3" style="border-radius: var(--pp-radius-md, 12px); max-width: 250px; z-index: 5;">
                <div class="rounded-circle bg-warning bg-opacity-25 p-2 text-warning fs-4">
                  <i class="bi bi-heart-pulse-fill text-danger"></i>
                </div>
                <div>
                  <strong class="d-block text-dark small">Oxigenación & Altura</strong>
                  <span class="small text-muted" style="font-size: 0.75rem;">Protocolo veterinario Cusco 3,400 msnm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ESTADÍSTICAS RÁPIDAS CUSCO -->
    <section class="bg-light py-4 border-bottom">
      <div class="container">
        <div class="row g-3 text-center">
          <div class="col-6 col-md-3">
            <div class="h3 fw-bold text-primary mb-0">100%</div>
            <div class="small text-muted">Cuidadores Verificados</div>
          </div>
          <div class="col-6 col-md-3">
            <div class="h3 fw-bold text-success mb-0">6 Distritos</div>
            <div class="small text-muted">Cusco Centro a San Jerónimo</div>
          </div>
          <div class="col-6 col-md-3">
            <div class="h3 fw-bold text-danger mb-0">24 / 7</div>
            <div class="small text-muted">Central S.O.S. en Vivo</div>
          </div>
          <div class="col-6 col-md-3">
            <div class="h3 fw-bold text-secondary mb-0">15%</div>
            <div class="small text-muted">Comisión Justa y Transparente</div>
          </div>
        </div>
      </div>
    </section>

    <!-- PROPUESTA DE VALOR DUAL: LOCALES Y TURISTAS -->
    <section class="container py-5">
      <div class="text-center mb-5">
        <h2 class="fw-bold mb-2">Diseñado para la Realidad Única de Cusco</h2>
        <p class="text-muted col-lg-7 mx-auto">
          Ya sea que vivas en Wanchaq o estés visitando Machu Picchu y el Valle Sagrado, garantizamos la mejor experiencia de cuidado ético.
        </p>
      </div>

      <div class="row g-4">
        <!-- Para Familias Locales -->
        <div class="col-lg-6">
          <div class="card card-paw h-100 p-4 border-0 shadow-sm">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="rounded-circle bg-warning bg-opacity-25 p-3 text-warning fs-3">
                <i class="bi bi-house-heart-fill"></i>
              </div>
              <div>
                <span class="badge bg-warning text-dark mb-1">Para Familias Cusqueñas</span>
                <h4 class="fw-bold mb-0">Cuidado Cercano y Familiar</h4>
              </div>
            </div>
            <ul class="list-unstyled d-flex flex-column gap-2 text-secondary small mb-4">
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> Cuidadores independientes en tu propio distrito (San Sebastián, Wanchaq, Santiago).</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> Reportes continuos en el <strong>Muro en Vivo</strong> con fotos y estado de ánimo.</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>Carné Digital PAW-ID</strong> que certifica vacunas y controles médicos con clínicas locales.</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> Sin sobrecostos: tarifas justas acordadas por día y por bloque horario.</li>
            </ul>
            <a href="#/catalogo" class="btn btn-paw-outline mt-auto">Buscar en mi Distrito</a>
          </div>
        </div>

        <!-- Para Turistas y Visitantes -->
        <div class="col-lg-6">
          <div class="card card-paw h-100 p-4 border-0 shadow-sm">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="rounded-circle bg-info bg-opacity-25 p-3 text-info fs-3">
                <i class="bi bi-airplane-fill"></i>
              </div>
              <div>
                <span class="badge bg-info text-white mb-1">Para Viajeros y Turistas</span>
                <h4 class="fw-bold mb-0">Disfruta Cusco sin Preocupaciones</h4>
              </div>
            </div>
            <ul class="list-unstyled d-flex flex-column gap-2 text-secondary small mb-4">
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> <strong>Cuidado en Hotel o Airbnb:</strong> Los cuidadores pueden recoger a tu mascota en tu hospedaje.</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> Visita <strong>Machu Picchu, Sacsayhuamán y Vinicunca</strong> sabiendo que tu mascota está segura.</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> Cuidadores bilingües (Inglés / Español) y protocolo de adaptación a la altura.</li>
              <li><i class="bi bi-check-circle-fill text-success me-2"></i> Pagos con conversión en USD y garantía de cancelación flexible.</li>
            </ul>
            <a href="#/catalogo" class="btn btn-paw mt-auto">Ver Cuidadores para Turistas</a>
          </div>
        </div>
      </div>
    </section>

    <!-- CARNÉ DIGITAL PAW-ID & PROTOCOLO SOS -->
    <section class="bg-white py-5 border-top border-bottom">
      <div class="container">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <span class="badge bg-danger text-white px-3 py-1 rounded-pill mb-2">Tecnología & Seguridad</span>
            <h2 class="fw-bold mb-3">Carné Digital PAW-ID y Central S.O.S. en Tiempo Real</h2>
            <p class="text-secondary mb-4">
              Cada mascota registrada en Paw Patita cuenta con su identificador único <code>PAW-XXXX</code> y un carné con código QR. Si tu mascota se extravía o sufre un accidente, cualquier veterinaria o transeúnte puede escanear el carné y contactarte de inmediato sin exponer tus datos privados.
            </p>
            <div class="d-flex flex-column gap-3">
              <div class="d-flex gap-3 align-items-start">
                <i class="bi bi-qr-code-scan fs-3 text-primary"></i>
                <div>
                  <h6 class="fw-bold mb-1" data-i18n="landing.qr_title">Escaneo QR Inmediato</h6>
                  <p class="small text-muted mb-0" data-i18n="landing.qr_desc">Ruta pública segura por código QR con foto, raza, alergias y botón directo a WhatsApp.</p>
                </div>
              </div>
              <div class="d-flex gap-3 align-items-start">
                <i class="bi bi-hospital fs-3 text-danger"></i>
                <div>
                  <h6 class="fw-bold mb-1" data-i18n="landing.sos_title">Derivación S.O.S. a la Clínica más Cercana</h6>
                  <p class="small text-muted mb-0" data-i18n="landing.sos_desc">Geolocalización automática de clínicas 24h activas en Cusco para atención médica urgente.</p>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-6 text-center">
            <div class="card card-paw p-4 border-0 shadow-lg d-inline-block text-start" style="max-width: 440px;">
              <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <span class="fw-bold text-dark"><i class="bi bi-paw-fill text-warning me-1"></i> PAW-ID Digital</span>
                <span class="badge bg-success" data-i18n="paw_id.validado">Sanitariamente Validado</span>
              </div>
              <div class="d-flex gap-3 align-items-center mb-3">
                <img src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=150&auto=format&fit=crop&q=80"
                     alt="Inti"
                     class="rounded-circle border"
                     style="width: 70px; height: 70px; object-fit: cover;"
                     onerror="this.onerror=null; this.src='${SVG_PET_FALLBACK}';">
                <div>
                  <h5 class="fw-bold mb-0">Inti</h5>
                  <div class="small text-muted">Golden Retriever • 3 años</div>
                  <code class="text-primary fw-bold">PAW-6858</code>
                </div>
              </div>
              <div class="small bg-light p-2 rounded mb-3">
                <div><strong>Clínica Validadora:</strong> San Francisco Cusco 24h</div>
                <div><strong>Vacunas:</strong> Al día (Vigencia 2027)</div>
              </div>
              <a href="#/paw-id/PAW-6858" class="btn btn-outline-dark btn-sm w-100">
                <i class="bi bi-eye me-1"></i> Simular Escaneo de Código QR
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DIRECTORIO DE CLÍNICAS VETERINARIAS ALIADAS 24H -->
    <section class="container py-5">
      <div class="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-2">
        <div>
          <span class="badge bg-danger text-white px-3 py-1 rounded-pill mb-2">Red de Urgencias Cusco</span>
          <h2 class="fw-bold mb-1">Clínicas Veterinarias Aliadas</h2>
          <p class="text-muted mb-0">Nuestra red oficial de atención médica presencial y emergencias S.O.S. en Cusco.</p>
        </div>
        <button class="btn btn-paw-outline" data-bs-toggle="modal" data-bs-target="#modal-postular-clinica">
          <i class="bi bi-hospital me-1"></i> ¿Tienes una veterinaria? Postula aquí
        </button>
      </div>

      <div class="row g-4" id="landing-clinicas-grid">
        <!-- Renderizado dinámicamente -->
        <div class="col-12 text-center py-4">
          <div class="spinner-border text-danger" role="status"></div>
        </div>
      </div>
    </section>

    <!-- TEMPORADAS Y POLÍTICA DE CANCELACIONES -->
    <section class="bg-light py-5 border-top">
      <div class="container">
        <div class="row g-4">
          <div class="col-lg-6">
            <div class="card card-paw h-100 p-4 border-0 shadow-sm">
              <h5 class="fw-bold text-dark mb-3">
                <i class="bi bi-calendar-event text-warning me-2"></i>Temporadas Turísticas en Cusco
              </h5>
              <p class="small text-muted">
                Durante festividades de alta afluencia se aplican recargos moderados aprobados en plataforma para garantizar cuidadores dedicados:
              </p>
              <ul class="list-group list-group-flush small">
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                  <span><strong>Fiestas del Cusco e Inti Raymi</strong> (Junio)</span>
                  <span class="badge bg-warning text-dark">+20%</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                  <span><strong>Fiestas Patrias Perú</strong> (Julio - Agosto)</span>
                  <span class="badge bg-warning text-dark">+15%</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                  <span><strong>Navidad y Año Nuevo en los Andes</strong> (Diciembre)</span>
                  <span class="badge bg-warning text-dark">+25%</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent px-0">
                  <span><strong>Temporada de Lluvias</strong> (Enero - Febrero)</span>
                  <span class="badge bg-info text-white">+10% (Secado especial)</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="card card-paw h-100 p-4 border-0 shadow-sm">
              <h5 class="fw-bold text-dark mb-3">
                <i class="bi bi-shield-lock text-success me-2"></i>Política Escalonada de Cancelación
              </h5>
              <p class="small text-muted">
                Transparencia total para proteger el tiempo del cuidador y el presupuesto del propietario:
              </p>
              <div class="d-flex flex-column gap-2 small">
                <div class="p-2 border rounded bg-white d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Más de 48 horas de anticipación:</strong>
                    <div class="text-muted">Reembolso del 100% al propietario.</div>
                  </div>
                  <span class="badge bg-success">100% Reembolso</span>
                </div>
                <div class="p-2 border rounded bg-white d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Entre 24 y 48 horas de anticipación:</strong>
                    <div class="text-muted">70% reembolso • 15% cuidador • 15% plataforma.</div>
                  </div>
                  <span class="badge bg-warning text-dark">70% Reembolso</span>
                </div>
                <div class="p-2 border rounded bg-white d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Menos de 24 horas de anticipación:</strong>
                    <div class="text-muted">50% reembolso • 35% cuidador • 15% plataforma.</div>
                  </div>
                  <span class="badge bg-danger">50% Reembolso</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIOS REALES -->
    <section class="container py-5">
      <div class="text-center mb-5">
        <span class="badge bg-warning text-dark px-3 py-1 rounded-pill mb-2">Comunidad Paw Patita</span>
        <h2 class="fw-bold mb-2">Historias Reales de Cuidado en Cusco</h2>
        <p class="text-muted">La voz de propietarios y cuidadores que ya confían en nuestra red.</p>
      </div>

      <div class="row g-4">
        ${TESTIMONIOS.map(t => `
          <div class="col-md-4">
            <div class="card card-paw h-100 p-4 border-0 shadow-sm d-flex flex-column">
              <div class="d-flex align-items-center gap-3 mb-3">
                <img src="${escapeHtml(t.foto)}" alt="${escapeHtml(t.autor)}" class="rounded-circle" style="width: 52px; height: 52px; object-fit: cover;">
                <div>
                  <h6 class="fw-bold mb-0 text-dark">${escapeHtml(t.autor)}</h6>
                  <div class="small text-muted">${escapeHtml(t.origen)}</div>
                </div>
              </div>
              <div class="text-warning mb-2">
                ${'<i class="bi bi-star-fill me-1"></i>'.repeat(t.estrellas)}
              </div>
              <p class="small text-secondary fst-italic mb-3 flex-grow-1">
                "${escapeHtml(t.texto)}"
              </p>
              <div class="small text-muted border-top pt-2">
                <i class="bi bi-suit-heart-fill text-danger me-1"></i> ${escapeHtml(t.mascota)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- BANNER CTA INFERIOR ANDES & HUELLAS CUSCO -->
    <section class="cta-andes-banner py-5 text-center text-white">
      <div class="container py-4">
        <h2 class="display-6 fw-bold mb-3 text-white" data-i18n="landing.cta_title">¿Listo para encontrar al cuidador ideal para tu mascota?</h2>
        <p class="lead mb-4 mx-auto col-lg-8" style="color: #E2F1E8 !important;" data-i18n="landing.cta_lead">
          Explora los perfiles aprobados en tu distrito o postula hoy para unirte a la red de cuidadores más confiable de Cusco.
        </p>
        <div class="d-flex justify-content-center gap-3 flex-wrap">
          <a href="#/catalogo" class="btn btn-paw btn-lg shadow fw-bold">
            <i class="bi bi-compass me-1"></i> <span data-i18n="landing.cta_btn_catalogo">Ver Catálogo Completo</span>
          </a>
          <button class="btn btn-outline-light btn-lg fw-bold" data-bs-toggle="modal" data-bs-target="#modal-registro-propietario">
            <i class="bi bi-person-plus-fill me-1"></i> <span data-i18n="landing.cta_btn_register">Crear Cuenta de Propietario</span>
          </button>
        </div>
      </div>
    </section>
  `;

  // Aplicar traducciones bilingües en landing
  applyTranslations(container);

  // Cargar clínicas dinámicamente
  cargarClinicasGrid(currentCurrency);
}

/**
 * Carga e inyecta la grilla de clínicas aliadas
 */
async function cargarClinicasGrid(currentCurrency) {
  const gridEl = document.getElementById('landing-clinicas-grid');
  if (!gridEl) return;

  const clinicasRaw = await obtenerClinicasActivas();
  const clinicas = await Promise.all(
    clinicasRaw.map(async (c, idx) => {
      const seedFallback = CLINICAS_SEED[idx % CLINICAS_SEED.length]?.foto_fachada_url || SVG_CLINICA_FALLBACK;
      const resolvedFoto = c.foto_fachada_url ? await resolveMediaUrl(c.foto_fachada_url) : null;
      return {
        ...c,
        foto_fachada_resuelta: resolvedFoto || seedFallback
      };
    })
  );

  gridEl.innerHTML = clinicas.map(c => `
    <div class="col-md-6 col-lg-3">
      <div class="card card-paw h-100 border-0 shadow-sm overflow-hidden d-flex flex-column">
        <div style="height: 120px; overflow: hidden; background: #E2E8F0; position: relative;">
          <img src="${escapeHtml(c.foto_fachada_resuelta)}"
               alt="${escapeHtml(c.nombre)}"
               style="width: 100%; height: 100%; object-fit: cover;"
               onerror="this.onerror=null; this.src='${SVG_CLINICA_FALLBACK}';">
          <span class="badge ${c.horario_atencion?.includes('24') ? 'bg-danger' : 'bg-secondary'} position-absolute top-0 end-0 m-2 shadow-sm">
            ${escapeHtml(c.horario_atencion || 'Atención Regular')}
          </span>
        </div>
        <div class="p-3 d-flex flex-column flex-grow-1">
          <span class="badge bg-light text-dark border align-self-start mb-2 small">
            <i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(c.distrito_cusco || 'Cusco')}
          </span>
          <h6 class="fw-bold mb-1 text-dark">${escapeHtml(c.nombre)}</h6>
          <p class="small text-muted mb-2">${escapeHtml(c.direccion)}</p>
          
          <div class="d-flex flex-wrap gap-1 mb-3">
            ${(c.especialidades || []).slice(0, 2).map(e => `
              <span class="badge bg-light text-secondary border small" style="font-size: 0.7rem;">${escapeHtml(e)}</span>
            `).join('')}
          </div>

          <div class="mt-auto border-top pt-2 d-flex justify-content-between align-items-center">
            <div>
              <div class="small text-muted" style="font-size: 0.7rem;">Urgencia desde:</div>
              <strong class="text-danger small">${formatMoneda(c.tarifa_consulta_emergencia || 50, currentCurrency)}</strong>
            </div>
            <a href="tel:${escapeHtml(c.telefono_emergencia?.replace(/\s+/g, '') || '')}" class="btn btn-outline-danger btn-sm">
              <i class="bi bi-telephone-fill me-1"></i> Llamar
            </a>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Paw Patita Cusco v5.2 — Centro de Ayuda & FAQ Contextual por Rol (Heurística Nielsen H10)
 * js/components/help-modal.js
 *
 * Provee guías rápidas bilingües (ES / EN) adaptadas al contexto del usuario:
 *  - Propietarios & Turistas
 *  - Cuidadores Independientes
 *  - Clínicas Veterinarias Aliadas
 *  - Política S.O.S. & Cobros Clínicos
 *  - Seguridad & Privacidad PAW-ID
 *
 * Delegación global en `[data-help-role]` para abrir desde Navbar, Footer y Sidebars.
 */

import { getCurrentLang } from '../i18n.js';

let helpModalEl = null;
let helpModalInstance = null;
let currentHelpLang = null;
let helpDelegationBound = false;

function detectarRolDesdeRuta() {
  const hash = (window.location.hash || '#/').split('?')[0];
  if (hash.startsWith('#/propietario')) return 'propietario';
  if (hash.startsWith('#/cuidador')) return 'cuidador';
  if (hash.startsWith('#/veterinaria')) return 'veterinaria';
  if (hash.startsWith('#/admin')) return 'sos';
  if (hash.startsWith('#/paw-id')) return 'pawid';
  return 'propietario';
}

function normalizarTabAyuda(rol = 'publico') {
  const r = String(rol || 'publico').toLowerCase();
  if (r === 'auto' || r === 'publico') return detectarRolDesdeRuta();
  if (['propietario', 'cuidador', 'veterinaria', 'sos', 'pawid'].includes(r)) return r;
  if (r === 'administrador' || r === 'admin') return 'sos';
  return 'propietario';
}

function buildAccordionItems(prefix, items) {
  return `
    <div class="accordion accordion-flush border rounded-3 overflow-hidden" id="acc-help-${prefix}">
      ${items.map((item, idx) => `
        <div class="accordion-item">
          <h2 class="accordion-header" id="head-${prefix}-${idx}">
            <button class="accordion-button ${idx === 0 ? '' : 'collapsed'} fw-semibold small py-3" type="button"
              data-bs-toggle="collapse" data-bs-target="#col-${prefix}-${idx}"
              aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="col-${prefix}-${idx}">
              <i class="bi ${item.icon} text-warning me-2"></i>${item.q}
            </button>
          </h2>
          <div id="col-${prefix}-${idx}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}"
            aria-labelledby="head-${prefix}-${idx}" data-bs-parent="#acc-help-${prefix}">
            <div class="accordion-body small text-secondary lh-base bg-white">
              ${item.a}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getHelpModalHtml(lang = 'ES') {
  const isEn = lang === 'EN';

  const tabs = [
    {
      id: 'propietario',
      icon: 'bi-person-heart',
      label: isEn ? 'Owners & Travelers' : 'Propietarios & Turistas',
      intro: isEn
        ? 'Quick guide to registering pets, booking verified caregivers in Cusco, and enjoying tourist hotel pick-up.'
        : 'Guía rápida para registrar tus mascotas, reservar cuidadores verificados en Cusco y coordinar recojo en hotel.',
      items: isEn ? [
        {
          icon: 'bi-calendar2-check-fill',
          q: 'How does the 4-step booking & protected escrow payment work?',
          a: '1) Pick an approved caregiver, service, and your pet’s PAW-ID. 2) Choose dates and time blocks (24h Boarding automatically covers full-day custody). 3) Review the transparent quote (15% platform / 85% caregiver) in PEN or USD. 4) Pay via Yape, Plin, Bank Transfer, or Card. Your payment stays <strong>100% protected in escrow</strong> until the caregiver completes formal Check-Out.'
        },
        {
          icon: 'bi-airplane-fill',
          q: 'I am visiting Cusco as a tourist — can caregivers pick up my pet at my hotel?',
          a: 'Yes! Enable the <strong>Tourist / Visitor toggle</strong> during registration or inside <em>My Profile</em> to record your hotel or Airbnb in Cusco. In the Catalog, filter by <em>With hotel / Airbnb pick-up</em> and enter your international mobile number with country code (e.g. <code>+15551234567</code>).'
        },
        {
          icon: 'bi-arrow-counterclockwise',
          q: 'What is the tiered cancellation & refund policy?',
          a: '<strong>More than 48h prior:</strong> 100% refund. <strong>24h to 48h prior:</strong> 70% refund (15% caregiver, 15% platform). <strong>Less than 24h prior:</strong> 50% refund (35% caregiver, 15% platform). If a booking has not yet been confirmed, cancellation is 100% refundable.'
        },
        {
          icon: 'bi-camera-reels-fill',
          q: 'How do I receive photo updates during the stay?',
          a: 'Once Check-In is completed, your caregiver uploads live photos, mood notes, and Cusco reference locations to your private <strong>Live Photo Wall</strong>.'
        }
      ] : [
        {
          icon: 'bi-calendar2-check-fill',
          q: '¿Cómo funciona la reserva en 4 pasos y el Pago Protegido en Garantía?',
          a: '1) Elige un cuidador verificado, su servicio y la ficha PAW-ID de tu mascota. 2) Selecciona fechas y bloque horario (Hospedaje cubre 24 horas completas). 3) Revisa la cotización transparente (85% cuidador / 15% plataforma) en S/ PEN o $ USD. 4) Registra tu pago con Yape, Plin, Transferencia o Tarjeta. Tu dinero queda <strong>protegido en garantía</strong> hasta el Check-Out conforme.'
        },
        {
          icon: 'bi-airplane-fill',
          q: 'Estoy de turismo en Cusco, ¿pueden recoger a mi mascota en mi hotel o Airbnb?',
          a: 'Sí. Activa el interruptor <strong>Turista / Visitante en Cusco</strong> al registrarte o en <em>Mi Perfil</em> para indicar tu alojamiento. En el Catálogo usa el filtro <em>Con recojo en hotel / Airbnb</em> y registra tu teléfono con código de país (ej. <code>+15551234567</code>).'
        },
        {
          icon: 'bi-arrow-counterclockwise',
          q: '¿Cómo se calculan los reembolsos por cancelación?',
          a: '<strong>Más de 48 horas antes:</strong> 100% de reembolso. <strong>Entre 24h y 48h:</strong> 70% de reembolso (15% cuidador, 15% plataforma). <strong>Menos de 24h:</strong> 50% de reembolso (35% cuidador, 15% plataforma). Las solicitudes aún pendientes de confirmación devuelven el 100%.'
        },
        {
          icon: 'bi-camera-reels-fill',
          q: '¿Dónde veo las fotos de mi mascota durante el cuidado?',
          a: 'Una vez iniciado el Check-In, el cuidador publica fotos, estado de ánimo y ubicación referencial en Cusco dentro de tu pestaña privada <strong>Muro de Fotos en Vivo</strong>.'
        }
      ]
    },
    {
      id: 'cuidador',
      icon: 'bi-house-heart-fill',
      label: isEn ? 'Caregivers' : 'Cuidadores',
      intro: isEn
        ? 'Operational workflow for approved independent caregivers in Cusco: bookings, calendar, 85% wallet, and active custody rules.'
        : 'Flujo operativo para cuidadores independientes verificados en Cusco: reservas, agenda, billetera 85% y custodia activa.',
      items: isEn ? [
        {
          icon: 'bi-shield-check',
          q: 'How is my caregiver application approved?',
          a: 'Submit your DNI/CE, Police and Judicial background certificates, proof of address in Cusco, and profile/home photos. While under review your account remains <strong>Pending</strong>; once approved by Administration you appear automatically in the public Catalog.'
        },
        {
          icon: 'bi-calendar-range-fill',
          q: 'How do I manage my 7-day calendar and slot capacity?',
          a: 'Open <strong>2. Agenda & Blocks</strong> to block specific dates or adjust morning/afternoon/night/full-day capacity. On phones and tablets, swipe horizontally across the 7-day grid.'
        },
        {
          icon: 'bi-wallet2',
          q: 'When are my 85% earnings released for withdrawal?',
          a: 'Funds move automatically from <strong>In Escrow</strong> to <strong>Available for Withdrawal</strong> the moment you complete the formal <strong>Check-Out</strong> checklist. Withdraw with zero hidden fees to <strong>Yape/Plin</strong> (9 digits starting with 9), <strong>CCI</strong> (20 digits), or Peruvian bank accounts.'
        },
        {
          icon: 'bi-exclamation-octagon-fill',
          q: 'When can a caregiver trigger an S.O.S. emergency alert?',
          a: 'Strictly for pets currently in <strong>In-Progress active custody</strong> (after Check-In is recorded). Completed or unstarted bookings cannot trigger a caregiver S.O.S. alert.'
        }
      ] : [
        {
          icon: 'bi-shield-check',
          q: '¿Cómo se aprueba mi postulación como cuidador?',
          a: 'Adjunta tu DNI/CE, antecedentes policiales (PNP), antecedentes penales (PJ), recibo de domicilio en Cusco y fotos de perfil/hogar. Mientras el equipo verifica tus documentos tu cuenta queda <strong>Pendiente</strong>; al aprobarse apareces de inmediato en el Catálogo.'
        },
        {
          icon: 'bi-calendar-range-fill',
          q: '¿Cómo administro mi calendario de 7 días y cupos?',
          a: 'En <strong>2. Agenda y Bloques</strong> puedes bloquear fechas o ajustar tus cupos por bloque horario. En móviles o tablets, desliza horizontalmente la cuadrícula para ver de lunes a domingo sin recortes.'
        },
        {
          icon: 'bi-wallet2',
          q: '¿Cuándo se libera mi ganancia neta del 85% para retirar?',
          a: 'Tus fondos pasan de <strong>Saldo en Garantía</strong> a <strong>Disponible para Retiro</strong> al instante en que completas el <strong>Check-Out</strong>. Puedes solicitar desembolso sin comisión extra hacia <strong>Yape/Plin</strong> (9 dígitos empezando en 9), <strong>CCI</strong> (20 dígitos) o cuenta BCP/Interbank/BBVA.'
        },
        {
          icon: 'bi-exclamation-octagon-fill',
          q: '¿Cuándo puedo emitir una Alerta S.O.S. como cuidador?',
          a: 'Únicamente cuando la mascota se encuentra bajo tu <strong>custodia activa En Curso</strong> (tras haber registrado el Check-In). No es posible abrir alertas S.O.S. sobre reservas finalizadas ni futuras.'
        }
      ]
    },
    {
      id: 'veterinaria',
      icon: 'bi-hospital-fill',
      label: isEn ? 'Vet Clinics' : 'Clínicas Veterinarias',
      intro: isEn
        ? 'Clinical triage workflow for CMVP-certified allied clinics in Cusco: 24/7 S.O.S. alerts and PAW-ID health validation.'
        : 'Guía clínica para veterinarias colegiadas aliadas en Cusco: Central S.O.S. 24h y validación sanitaria PAW-ID.',
      items: isEn ? [
        {
          icon: 'bi-heart-pulse-fill',
          q: 'How does the 4-stage S.O.S. clinical workflow operate?',
          a: 'Every incoming alert follows four auditable states: <strong>1. Issued → 2. In Care → 3. Stabilized → 4. Resolved (Discharge)</strong>. Recording a clinical diagnosis and referential medical cost updates the owner and administrator in real time.'
        },
        {
          icon: 'bi-qr-code-scan',
          q: 'How do clinics validate or observe a pet’s PAW-ID card?',
          a: 'In <strong>2. Validate PAW-ID Cards</strong>, inspect the uploaded vaccination booklet (image or PDF). Grant the official <strong>CMVP Validated Seal</strong> with expiry date, or mark it as <strong>Observed</strong> specifying which booster vaccine is missing.'
        },
        {
          icon: 'bi-receipt-cutoff',
          q: 'How are S.O.S. clinical fees tracked after discharge?',
          a: 'When you enter a referential medical fee greater than S/ 0, the case automatically moves to <strong>Payment Pending</strong>. You can monitor on each S.O.S. card when the owner reports payment and when Administration reconciles it.'
        }
      ] : [
        {
          icon: 'bi-heart-pulse-fill',
          q: '¿Cómo funciona el flujo clínico de 4 etapas en la Central S.O.S.?',
          a: 'Cada alerta sigue 4 estados auditables: <strong>1. Emitida → 2. En Atención → 3. Estabilizada → 4. Resuelta (Alta Médica)</strong>. Al registrar el diagnóstico, tratamiento y costo clínico, se notifica al instante al Propietario y al Administrador.'
        },
        {
          icon: 'bi-qr-code-scan',
          q: '¿Cómo validamos u observamos la cartilla sanitaria PAW-ID?',
          a: 'En <strong>2. Validar Fichas PAW-ID</strong> revisa la foto o PDF de la cartilla de vacunas. Puedes otorgar el <strong>Sello Oficial CMVP</strong> indicando la vigencia sanitaria, o marcar <strong>Observado</strong> detallando qué refuerzo falta subsanar.'
        },
        {
          icon: 'bi-receipt-cutoff',
          q: '¿Cómo se da seguimiento al cobro de una atención S.O.S.?',
          a: 'Al registrar un costo clínico mayor a S/ 0, el cargo pasa automáticamente a <strong>Pendiente de Pago</strong>. En cada tarjeta S.O.S. verás en tiempo real cuando el propietario reporta su pago y cuando Administración lo concilia.'
        }
      ]
    },
    {
      id: 'sos',
      icon: 'bi-exclamation-triangle-fill',
      label: isEn ? 'S.O.S. Policy & Billing' : 'Política S.O.S. & Cobros',
      intro: isEn
        ? 'Clear rules on emergency dispatch in Cusco (3,400 m altitude) and end-to-end clinical charge traceability.'
        : 'Reglas transparentes sobre emergencias veterinarias en Cusco (3,400 msnm) y trazabilidad de cargos clínicos.',
      items: isEn ? [
        {
          icon: 'bi-broadcast-pin',
          q: 'How does automatic 24h clinic routing work?',
          a: 'When an S.O.S. alert is issued, Paw Patita auto-suggests the closest active 24h allied veterinary clinic in Cusco, shares the pet’s PAW-ID allergies/medications, and notifies Owner, Caregiver, Clinic, and Administrator simultaneously.'
        },
        {
          icon: 'bi-cash-coin',
          q: 'How does the Owner settle an S.O.S. clinical charge?',
          a: 'Inside <strong>S.O.S. Alerts 24h</strong>, the Owner sees a financial summary (Pending vs Reconciled in PEN/USD) and clicks <strong>Settle Clinical Charge</strong> to submit payment method (Yape, Plin, Transfer, Card, or Direct at Clinic) and operation code. Administration then marks it <strong>Reconciled</strong> or <strong>Waived</strong>.'
        },
        {
          icon: 'bi-bell-fill',
          q: 'How does the live Notification Bell work?',
          a: 'Notifications are strictly private to your signed-in account. Opening the bell or clicking <em>Mark as read</em> clears the red unread badge immediately and syncs read status across sessions.'
        }
      ] : [
        {
          icon: 'bi-broadcast-pin',
          q: '¿Cómo opera la derivación inmediata a clínicas 24h en Cusco?',
          a: 'Al emitir una alerta S.O.S., el sistema sugiere la clínica veterinaria 24h aliada más cercana al distrito, comparte las alergias y medicación del PAW-ID y notifica simultáneamente a Clínica, Propietario, Cuidador y Administrador.'
        },
        {
          icon: 'bi-cash-coin',
          q: '¿Cómo regulariza el Propietario un cargo clínico S.O.S.?',
          a: 'En la pestaña <strong>Alertas S.O.S. 24h</strong> el Propietario visualiza su resumen financiero (Saldo Pendiente vs Conciliado en PEN/USD) y pulsa <strong>Regularizar Cargo Clínico</strong> registrando su método de pago y código de operación. Luego el Administrador concilia o exonera el cargo con constancia.'
        },
        {
          icon: 'bi-bell-fill',
          q: '¿Cómo funciona la campanita de notificaciones?',
          a: 'Cada cuenta recibe exclusivamente sus propias notificaciones. Al abrir la campanita o pulsar <em>Marcar leídas</em>, el contador rojo se limpia de inmediato y queda registrado como leído.'
        }
      ]
    },
    {
      id: 'pawid',
      icon: 'bi-qr-code-scan',
      label: isEn ? 'PAW-ID Security' : 'Seguridad PAW-ID',
      intro: isEn
        ? 'Privacy-by-design digital pet identity compliant with Peruvian Personal Data Protection Law No. 29733.'
        : 'Identidad digital sanitaria diseñada con privacidad por defecto conforme a la Ley N° 29733 del Perú.',
      items: isEn ? [
        {
          icon: 'bi-shield-lock-fill',
          q: 'What personal data is hidden when someone scans the PAW-ID QR?',
          a: 'Under <strong>Law No. 29733</strong>, the public QR collar card <strong>NEVER displays your DNI/Passport number or exact street address</strong>. It only shows your pet’s photo, critical allergies, vaccination status, referential Cusco district, and voluntary WhatsApp/call rescue buttons.'
        },
        {
          icon: 'bi-printer-fill',
          q: 'Can I print or save the PAW-ID card as a PDF?',
          a: 'Yes! Open your pet’s PAW-ID card in <strong>My Pets & PAW-ID</strong> and click <strong>Print / Save PDF</strong>. The layout automatically formats cleanly for collar tags or travel folders.'
        },
        {
          icon: 'bi-check2-circle',
          q: 'What formats are required for phone numbers and ID documents?',
          a: '<strong>Peruvian mobile:</strong> 9 digits starting with 9 (e.g. <code>984123456</code>). <strong>International travelers:</strong> leading <code>+</code> + country code (e.g. <code>+15551234567</code>). <strong>DNI:</strong> 8 digits. <strong>RUC:</strong> 11 digits. <strong>CE / Passport:</strong> alphanumeric.'
        }
      ] : [
        {
          icon: 'bi-shield-lock-fill',
          q: '¿Qué datos privados se ocultan al escanear el código QR del collar?',
          a: 'En cumplimiento de la <strong>Ley N° 29733</strong>, la ficha pública PAW-ID <strong>NUNCA expone tu número de DNI/Pasaporte ni tu dirección domiciliaria exacta</strong>. Solo muestra foto, alergias críticas, estado de vacunas, distrito referencial y botones de contacto rápido de rescate.'
        },
        {
          icon: 'bi-printer-fill',
          q: '¿Puedo imprimir o guardar el Carné PAW-ID en PDF?',
          a: 'Sí. Abre el carné de tu mascota en <strong>Mis Mascotas & PAW-ID</strong> y haz clic en <strong>Imprimir / Guardar PDF</strong> para generar una credencial limpia lista para collar o carpeta de viaje.'
        },
        {
          icon: 'bi-check2-circle',
          q: '¿Qué formatos exactos aceptan los formularios de registro?',
          a: '<strong>Celular Perú:</strong> 9 dígitos empezando en 9 (ej. <code>984123456</code>). <strong>Turistas internacionales:</strong> <code>+</code> seguido de código de país (ej. <code>+15551234567</code>). <strong>DNI:</strong> 8 dígitos exactos. <strong>RUC:</strong> 11 dígitos. <strong>CE / Pasaporte:</strong> alfanumérico.'
        }
      ]
    }
  ];

  return `
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content shadow-lg border-0" style="border-radius: var(--pp-radius-lg, 18px); overflow: hidden;">
        <div class="modal-header text-white" style="background: linear-gradient(135deg, var(--pp-secondary, #111827) 0%, #1F2937 100%); border-bottom: 3.5px solid var(--pp-primary, #E85D24); flex-shrink: 0;">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-life-preserver text-warning fs-4"></i>
            <div>
              <h5 class="modal-title fw-bold mb-0 text-white" id="modal-help-title">
                ${isEn ? 'Help Center & Frequently Asked Questions' : 'Centro de Ayuda y Preguntas Frecuentes'}
              </h5>
              <small class="text-white-50">${isEn ? 'Contextual quick guides by role • Paw Patita Cusco v5.2' : 'Guías prácticas contextuales por rol • Paw Patita Cusco v5.2'}</small>
            </div>
          </div>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="${isEn ? 'Close' : 'Cerrar'}"></button>
        </div>

        <div class="bg-light px-3 pt-2 border-bottom" style="flex-shrink: 0; overflow-x: auto;">
          <ul class="nav nav-tabs border-0 flex-nowrap" id="help-tabs-nav" role="tablist" style="white-space: nowrap;">
            ${tabs.map((tab, idx) => `
              <li class="nav-item" role="presentation">
                <button class="nav-link ${idx === 0 ? 'active' : ''} fw-bold text-dark small"
                  id="help-tab-btn-${tab.id}" data-bs-toggle="tab" data-bs-target="#help-pane-${tab.id}"
                  type="button" role="tab" aria-controls="help-pane-${tab.id}" aria-selected="${idx === 0 ? 'true' : 'false'}">
                  <i class="bi ${tab.icon} text-warning me-1"></i>${tab.label}
                </button>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="modal-body p-4" style="background-color: var(--pp-bg-body, #FAF7F2);">
          <div class="tab-content" id="help-tabs-content">
            ${tabs.map((tab, idx) => `
              <div class="tab-pane fade ${idx === 0 ? 'show active' : ''}" id="help-pane-${tab.id}"
                role="tabpanel" aria-labelledby="help-tab-btn-${tab.id}">
                <div class="alert alert-light border d-flex align-items-start gap-2 small mb-3">
                  <i class="bi bi-lightbulb-fill text-warning fs-5"></i>
                  <div class="text-secondary">${tab.intro}</div>
                </div>
                ${buildAccordionItems(tab.id, tab.items)}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="modal-footer bg-light border-top py-2 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2" style="flex-shrink: 0;">
          <div class="small text-muted">
            <i class="bi bi-file-earmark-text text-primary me-1"></i>
            <a href="javascript:void(0)" class="fw-semibold text-decoration-underline" data-legal-tab="terminos">
              ${isEn ? 'Read Terms & Privacy Policy v5.2' : 'Ver Términos y Política de Privacidad v5.2'}
            </a>
          </div>
          <button type="button" class="btn btn-paw btn-sm px-4 fw-semibold" data-bs-dismiss="modal">
            ${isEn ? 'Got it, Close' : 'Entendido, Cerrar'}
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Inicializa el modal global de Ayuda & FAQ (Heurística H10) y su delegación de eventos
 */
export function initHelpModal() {
  const lang = getCurrentLang();
  helpModalEl = document.getElementById('modal-help-global');

  if (!helpModalEl) {
    helpModalEl = document.createElement('div');
    helpModalEl.className = 'modal fade';
    helpModalEl.id = 'modal-help-global';
    helpModalEl.tabIndex = -1;
    helpModalEl.setAttribute('aria-labelledby', 'modal-help-title');
    helpModalEl.setAttribute('aria-hidden', 'true');
    helpModalEl.style.zIndex = '1085';
    helpModalEl.innerHTML = getHelpModalHtml(lang);
    currentHelpLang = lang;
    document.body.appendChild(helpModalEl);

    helpModalEl.addEventListener('show.bs.modal', () => {
      helpModalEl.style.zIndex = '1085';
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 0) {
          backdrops[backdrops.length - 1].style.zIndex = '1080';
        }
      }, 10);
    });

    helpModalEl.addEventListener('hidden.bs.modal', () => {
      setTimeout(() => {
        if (document.querySelectorAll('.modal.show').length > 0) {
          document.body.classList.add('modal-open');
        }
      }, 50);
    });
  } else if (currentHelpLang !== lang) {
    helpModalEl.innerHTML = getHelpModalHtml(lang);
    currentHelpLang = lang;
  }

  if (window.bootstrap?.Modal) {
    helpModalInstance = window.bootstrap.Modal.getOrCreateInstance(helpModalEl, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
  }

  if (!helpDelegationBound) {
    helpDelegationBound = true;
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-help-role]');
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        const roleAttr = trigger.getAttribute('data-help-role') || 'publico';
        abrirModalAyuda(roleAttr);
      }
    });
  }
}

/**
 * Abre el Centro de Ayuda & FAQ en la pestaña contextual del rol indicado
 * @param {'publico'|'auto'|'propietario'|'cuidador'|'veterinaria'|'administrador'|'sos'|'pawid'} rol
 */
export function abrirModalAyuda(rol = 'publico') {
  const lang = getCurrentLang();
  if (!helpModalEl) {
    initHelpModal();
  } else if (currentHelpLang !== lang) {
    helpModalEl.innerHTML = getHelpModalHtml(lang);
    currentHelpLang = lang;
  }

  const targetTab = normalizarTabAyuda(rol);
  const tabBtn = document.getElementById(`help-tab-btn-${targetTab}`);
  if (tabBtn && window.bootstrap?.Tab) {
    window.bootstrap.Tab.getOrCreateInstance(tabBtn).show();
  } else if (tabBtn) {
    tabBtn.click();
  }

  if (!helpModalInstance && window.bootstrap?.Modal) {
    helpModalInstance = window.bootstrap.Modal.getOrCreateInstance(helpModalEl);
  }
  helpModalInstance?.show();
}

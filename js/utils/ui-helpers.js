/**
 * Paw Patita Cusco v5.0 — Asistentes de Interfaz y Experiencia de Usuario
 * js/utils/ui-helpers.js
 * 
 * Toasts accesibles, Spinner global con apagado garantizado, modales dinámicos
 * de confirmación y formulario (cero prompt/alert/confirm nativos).
 */

import { escapeHtml } from './formatters.js';

let activeSpinnerCount = 0;

/**
 * Muestra el spinner global con mensaje informativo
 * @param {string} mensaje 
 */
export function showSpinner(mensaje = 'Cargando información segura...') {
  activeSpinnerCount++;
  const overlay = document.getElementById('global-spinner-overlay');
  const msgEl = document.getElementById('spinner-message');
  if (overlay) {
    if (msgEl) msgEl.textContent = mensaje;
    overlay.classList.remove('d-none');
    overlay.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Oculta el spinner global con decremento de contador (evita cierres prematuros en tareas concurrentes)
 * @param {boolean} forceReset 
 */
export function hideSpinner(forceReset = false) {
  if (forceReset) {
    activeSpinnerCount = 0;
  } else {
    activeSpinnerCount = Math.max(0, activeSpinnerCount - 1);
  }

  if (activeSpinnerCount === 0) {
    const overlay = document.getElementById('global-spinner-overlay');
    if (overlay) {
      overlay.classList.add('d-none');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }
}

/**
 * Sistema centralizado de Toasts en español
 * @param {string} mensaje 
 * @param {'success'|'danger'|'warning'|'info'} tipo 
 * @param {string} titulo 
 * @param {number} delayMs 
 */
export function showToast(mensaje, tipo = 'info', titulo = null, delayMs = 4500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    danger: 'bi-exclamation-octagon-fill text-danger',
    warning: 'bi-exclamation-triangle-fill text-warning',
    info: 'bi-info-circle-fill text-info'
  };

  const defaultTitles = {
    success: 'Operación Exitosa',
    danger: 'Atención / Error',
    warning: 'Advertencia',
    info: 'Información Paw Patita'
  };

  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const titleText = titulo || defaultTitles[tipo] || 'Notificación';

  const toastHtml = `
    <div id="${toastId}" class="toast toast-paw bg-white" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delayMs}">
      <div class="toast-header border-bottom">
        <i class="bi ${iconMap[tipo]} me-2 fs-5"></i>
        <strong class="me-auto text-dark">${escapeHtml(titleText)}</strong>
        <small class="text-muted">ahora</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Cerrar"></button>
      </div>
      <div class="toast-body fs-6 text-secondary">
        ${escapeHtml(mensaje)}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  if (window.bootstrap?.Toast) {
    const bsToast = new window.bootstrap.Toast(toastEl);
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  } else {
    // Fallback si Bootstrap no cargó aún
    setTimeout(() => toastEl.remove(), delayMs);
  }
}

/**
 * Muestra un modal dinámico de confirmación accesible (Reemplazo moderno de confirm())
 * @param {Object} options 
 * @param {string} options.titulo 
 * @param {string} options.mensaje 
 * @param {string} options.confirmText 
 * @param {string} options.cancelText 
 * @param {'danger'|'primary'|'warning'} options.tipo 
 * @returns {Promise<boolean>}
 */
export function showConfirmModal({
  titulo = 'Confirmar Acción',
  mensaje = '¿Estás seguro de continuar con esta operación?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  tipo = 'primary'
}) {
  return new Promise((resolve) => {
    const modalId = `modal-confirm-${Date.now()}`;
    const btnClass = tipo === 'danger' ? 'btn-danger' : (tipo === 'warning' ? 'btn-warning' : 'btn-paw');

    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" style="border-radius: var(--pp-radius-lg);">
            <div class="modal-header ${tipo === 'danger' ? 'bg-danger text-white' : 'bg-light'}">
              <h5 class="modal-title" id="${modalId}-label">
                <i class="bi ${tipo === 'danger' ? 'bi-shield-exclamation' : 'bi-question-circle'} me-2"></i>
                ${escapeHtml(titulo)}
              </h5>
              <button type="button" class="btn-close ${tipo === 'danger' ? 'btn-close-white' : ''}" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body p-4 fs-6 text-secondary">
              ${escapeHtml(mensaje)}
            </div>
            <div class="modal-footer bg-light border-0">
              <button type="button" class="btn btn-outline-secondary" id="${modalId}-btn-cancel" data-bs-dismiss="modal">
                ${escapeHtml(cancelText)}
              </button>
              <button type="button" class="btn ${btnClass}" id="${modalId}-btn-ok">
                ${escapeHtml(confirmText)}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById(modalId);
    const bsModal = new window.bootstrap.Modal(modalEl);

    const btnOk = document.getElementById(`${modalId}-btn-ok`);
    const btnCancel = document.getElementById(`${modalId}-btn-cancel`);

    let userConfirmed = false;

    btnOk.addEventListener('click', () => {
      userConfirmed = true;
      bsModal.hide();
    });

    btnCancel.addEventListener('click', () => {
      userConfirmed = false;
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      modalEl.remove();
      resolve(userConfirmed);
    });

    bsModal.show();
  });
}

/**
 * Crea y muestra un modal Bootstrap dinámico reutilizable (Fase 5+).
 * Se autodestruye del DOM al cerrarse.
 * @param {Object} opts
 * @param {string} opts.titulo
 * @param {string} [opts.icono]
 * @param {string} [opts.cuerpoHtml]
 * @param {string} [opts.footerHtml]
 * @param {string} [opts.tamano] ('modal-sm' | 'modal-lg' | 'modal-xl' | '')
 * @param {string} [opts.headerClass]
 * @param {boolean} [opts.headerOscuro]
 * @param {boolean} [opts.estatico]
 * @param {function} [opts.onHidden]
 */
export function crearModalDinamico({
  titulo = 'Paw Patita Cusco',
  icono = 'bi-heart-pulse',
  cuerpoHtml = '',
  footerHtml = '',
  tamano = 'modal-lg',
  headerClass = 'bg-light',
  headerOscuro = false,
  estatico = false,
  scrollable = true,
  onHidden = null
} = {}) {
  const id = `pp-modal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const html = `
    <div class="modal fade pp-modal" id="${id}" tabindex="-1" aria-labelledby="${id}-title" aria-hidden="true"
      ${estatico ? 'data-bs-backdrop="static" data-bs-keyboard="false"' : ''}>
      <div class="modal-dialog ${tamano} modal-dialog-centered ${scrollable ? 'modal-dialog-scrollable' : ''}">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header ${headerClass}">
            <h5 class="modal-title fw-bold" id="${id}-title"><i class="bi ${icono} me-2"></i>${escapeHtml(titulo)}</h5>
            <button type="button" class="btn-close ${headerOscuro ? 'btn-close-white' : ''}" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">${cuerpoHtml}</div>
          <div class="modal-footer ${footerHtml ? '' : 'd-none'}">${footerHtml}</div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  const instance = new window.bootstrap.Modal(el);
  let hiddenResolvers = [];

  el.addEventListener('hidden.bs.modal', () => {
    try {
      if (typeof onHidden === 'function') onHidden();
    } finally {
      hiddenResolvers.forEach((r) => r());
      hiddenResolvers = [];
      instance.dispose();
      el.remove();
    }
  });

  instance.show();

  const body = el.querySelector('.modal-body');
  const footer = el.querySelector('.modal-footer');
  return {
    id,
    el,
    body,
    footer,
    instance,
    setBody(htmlBody) { body.innerHTML = htmlBody; },
    setFooter(htmlFooter) {
      footer.innerHTML = htmlFooter || '';
      footer.classList.toggle('d-none', !htmlFooter);
    },
    cerrar() { instance.hide(); },
    cerrarAsync() {
      return new Promise((resolve) => {
        if (!document.body.contains(el)) { resolve(); return; }
        hiddenResolvers.push(resolve);
        instance.hide();
      });
    }
  };
}

/**
 * Traduce y gestiona errores devueltos por Supabase (PostgreSQL, Auth o RPC)
 * a mensajes claros en español para el usuario
 * @param {Error|Object} err 
 * @param {string} fallbackMsg 
 */
export function handleSupabaseError(err, fallbackMsg = 'Ocurrió un error inesperado al procesar la solicitud.') {
  console.error('Paw Patita Error Handler:', err);
  if (!err) {
    showToast(fallbackMsg, 'danger');
    return;
  }

  let mensaje = err.message || err.error_description || fallbackMsg;

  // Diccionario de traducción de errores comunes
  if (mensaje.includes('Invalid login credentials')) {
    mensaje = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
  } else if (mensaje.includes('Email not confirmed')) {
    mensaje = 'Por favor verifica tu correo electrónico antes de iniciar sesión.';
  } else if (mensaje.includes('User already registered')) {
    mensaje = 'Este correo electrónico ya se encuentra registrado.';
  } else if (mensaje.includes('Password should be at least')) {
    mensaje = 'La contraseña debe tener al menos 6 caracteres.';
  } else if (mensaje.includes('duplicate key value') || mensaje.includes('unique constraint')) {
    mensaje = 'Ya existe un registro con este identificador, documento o correo.';
  } else if (mensaje.includes('JWT expired')) {
    mensaje = 'Tu sesión ha caducado. Por favor inicia sesión nuevamente.';
  }

  showToast(mensaje, 'danger', 'Atención');
}

/**
 * Paw Patita Cusco v5.0 — Entrypoint de la Aplicación Frontend Modular
 * js/app.js
 * 
 * Orquestador principal: inicializa Supabase Auth, Router, listeners de formularios
 * de Login, Registro Propietario, Postulaciones y campana de notificaciones Realtime.
 */

import { initAuthSession, loginWithEmail, logout, requestPasswordReset, updatePassword, onAuthStateChanged } from './auth/auth.js';
import { registrarPropietario, postularCuidador, postularClinicaVeterinaria } from './auth/postulaciones.js';
import { initRouter, navigateTo, handleRouteChange, getDefaultRoleRoute } from './router.js';
import { subscribeRealtime } from './supabase-client.js';
import { CUSCO_CONFIG } from './config.js';
import { showToast, showSpinner, hideSpinner } from './utils/ui-helpers.js';
import { escapeHtml } from './utils/formatters.js';
import { initLegalModal } from './components/legal-modal.js';
import { getCurrentLang, setLanguage, applyTranslations, t } from './i18n.js';

let appCurrency = localStorage.getItem('paw_currency') || 'PEN';
let appLanguage = getCurrentLang();
let unreadNotificationsCount = 0;

/**
 * Actualiza el Navbar según el estado de autenticación y rol
 */
function updateNavbar(session) {
  const { user, profile } = session;
  const navAuthContainer = document.getElementById('navbar-auth-section');
  const roleNavContainer = document.getElementById('navbar-role-links');
  const bellContainer = document.getElementById('navbar-notification-bell');

  if (!navAuthContainer) return;

  if (user && profile && profile.estado_cuenta === 'activo') {
    // 1. Mostrar campana de notificaciones
    if (bellContainer) bellContainer.classList.remove('d-none');

    // 2. Links específicos de rol
    if (roleNavContainer) {
      const roleRoute = getDefaultRoleRoute(profile.rol);
      roleNavContainer.innerHTML = `
        <li class="nav-item">
          <a class="nav-link fw-bold text-primary" href="${roleRoute}" data-route="${roleRoute}">
            <i class="bi bi-speedometer2 me-1"></i> <span data-i18n="nav.mi_panel">${t('nav.mi_panel')}</span> (${escapeHtml(profile.rol)})
          </a>
        </li>
      `;
    }

    // 3. Menú de usuario autenticado
    navAuthContainer.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-pill-control dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-person-circle text-warning fs-5"></i>
          <span>${escapeHtml(profile.nombre || 'Mi Cuenta')}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="border-radius: var(--pp-radius-md);">
          <li class="px-3 py-2 border-bottom">
            <div class="fw-bold text-dark">${escapeHtml(profile.nombre)}</div>
            <div class="small text-muted">${escapeHtml(profile.email || '')}</div>
            <span class="badge bg-warning text-dark mt-1 text-uppercase">${escapeHtml(profile.rol)}</span>
          </li>
          <li><a class="dropdown-item py-2" href="${getDefaultRoleRoute(profile.rol)}"><i class="bi bi-grid me-2"></i><span data-i18n="nav.mi_panel">${t('nav.mi_panel')}</span></a></li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <button class="dropdown-item py-2 text-danger fw-bold" id="btn-logout-trigger">
              <i class="bi bi-box-arrow-right me-2"></i><span data-i18n="nav.cerrar_sesion">${t('nav.cerrar_sesion')}</span>
            </button>
          </li>
        </ul>
      </div>
    `;

    document.getElementById('btn-logout-trigger')?.addEventListener('click', () => logout());
  } else {
    // Modo Visitante no autenticado
    if (bellContainer) bellContainer.classList.add('d-none');
    if (roleNavContainer) roleNavContainer.innerHTML = '';

    navAuthContainer.innerHTML = `
      <button class="btn btn-paw-outline btn-sm me-2" data-bs-toggle="modal" data-bs-target="#modal-login">
        <i class="bi bi-box-arrow-in-right me-1"></i> <span data-i18n="nav.login">${t('nav.login')}</span>
      </button>
      <button class="btn btn-paw btn-sm" data-bs-toggle="modal" data-bs-target="#modal-registro-propietario">
        <i class="bi bi-person-plus-fill me-1"></i> <span data-i18n="nav.registro">${t('nav.registro')}</span>
      </button>
    `;
  }
}

/**
 * Inicializa la campana de notificaciones y la suscripción Realtime a emergencias SOS (INSERT y UPDATE)
 */
function initRealtimeAlerts() {
  const badgeEl = document.getElementById('notif-badge-count');
  const listEl = document.getElementById('notifications-list');

  subscribeRealtime('canal-sos-emergencias', 'incidencias_emergencias', '*', (payload) => {
    const evType = payload.eventType || 'UPDATE';
    const rec = payload.new || {};
    unreadNotificationsCount++;
    if (badgeEl) {
      badgeEl.textContent = unreadNotificationsCount;
      badgeEl.classList.remove('d-none');
    }

    const estadoLabel = (rec.estado_sos || 'emitida').toUpperCase();
    if (evType === 'INSERT') {
      showToast(
        `🚨 ¡ALERTA S.O.S. en Cusco! Mascota en situación ${rec.nivel_severidad || 'Urgente'}.`,
        'danger',
        'Emergencia Veterinaria',
        8000
      );
    } else {
      showToast(
        `🏥 Actualización S.O.S. (${rec.codigo_sos || 'Cusco'}): Estado clínico actualizado a ${estadoLabel}.`,
        rec.estado_sos === 'resuelta' ? 'success' : 'info',
        'Seguimiento Clínico S.O.S.',
        6500
      );
    }

    if (listEl) {
      const tituloNotif = evType === 'INSERT'
        ? 'ALERTA S.O.S. RECIBIDA'
        : `ACTUALIZACIÓN S.O.S. • ${escapeHtml(estadoLabel)}`;
      const detalleNotif = rec.diagnostico_clinico
        || rec.tratamiento_aplicado
        || rec.descripcion
        || rec.descripcion_emergencia
        || 'Estado de emergencia veterinaria actualizado en tiempo real';

      const itemHtml = `
        <div class="notification-item alert-urgent">
          <div class="fw-bold ${rec.estado_sos === 'resuelta' ? 'text-success' : 'text-danger'}">
            <i class="bi bi-exclamation-octagon-fill me-1"></i> ${tituloNotif}
          </div>
          <div class="small">${escapeHtml(detalleNotif)}</div>
          <small class="text-muted">En tiempo real</small>
        </div>
      `;
      listEl.insertAdjacentHTML('afterbegin', itemHtml);
    }
  });
}

/**
 * Configura el toggle accesible de visibilidad de contraseña ("Ojito")
 * en todos los campos type="password" estáticos y dinámicos del sistema
 */
function setupPasswordToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-pwd-btn, [data-toggle-password]');
    if (!btn) return;

    const targetId = btn.getAttribute('data-toggle-password');
    const wrapper = btn.closest('.input-password-wrapper');
    const input = (targetId && document.getElementById(targetId)) || wrapper?.querySelector('input');
    if (!input) return;

    const showPlain = input.type === 'password';
    input.type = showPlain ? 'text' : 'password';
    btn.setAttribute('aria-pressed', showPlain ? 'true' : 'false');
    btn.setAttribute('title', showPlain ? 'Ocultar contraseña' : 'Mostrar contraseña');

    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-eye', !showPlain);
      icon.classList.toggle('bi-eye-slash', showPlain);
    }
  });
}

/**
 * Configura los botones de Accesos Demo Rápidos (4 roles)
 */
function setupDemoButtons() {
  document.querySelectorAll('.btn-demo-badge').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const email = btn.getAttribute('data-email');
      const pass = btn.getAttribute('data-pass');
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      if (emailInput && passInput) {
        emailInput.value = email;
        passInput.value = pass;
        emailInput.focus();
      }
    });
  });
}

/**
 * Configura los event listeners para todos los formularios Auth
 */
function setupFormListeners() {
  // 1. Formulario de Login
  const loginForm = document.getElementById('form-login');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const res = await loginWithEmail(email, pass);
    if (res.success && res.profile) {
      const modalEl = document.getElementById('modal-login');
      if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      navigateTo(getDefaultRoleRoute(res.profile.rol));
    }
  });

  // 2. Formulario de Olvidé mi Contraseña
  const forgotForm = document.getElementById('form-forgot-password');
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const res = await requestPasswordReset(email);
    if (res.success) {
      const modalEl = document.getElementById('modal-forgot-password');
      if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
      }
    }
  });

  // 3. Formulario de Registro Propietario
  const regPropForm = document.getElementById('form-registro-propietario');
  const toggleTurista = document.getElementById('reg-prop-turista-check');
  const turistaFields = document.getElementById('reg-prop-turista-fields');

  toggleTurista?.addEventListener('change', (e) => {
    if (e.target.checked) {
      turistaFields?.classList.remove('d-none');
    } else {
      turistaFields?.classList.add('d-none');
    }
  });

  regPropForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombre: document.getElementById('reg-prop-nombre').value,
      apellido: document.getElementById('reg-prop-apellido').value,
      email: document.getElementById('reg-prop-email').value,
      password: document.getElementById('reg-prop-password').value,
      telefono: document.getElementById('reg-prop-tel').value,
      tipoDocumento: document.getElementById('reg-prop-tipodoc').value,
      numDocumento: document.getElementById('reg-prop-numdoc').value,
      distrito: document.getElementById('reg-prop-distrito').value,
      direccion: document.getElementById('reg-prop-direccion').value,
      esTurista: toggleTurista?.checked || false,
      paisOrigen: document.getElementById('reg-prop-pais')?.value || 'Perú',
      idioma: document.getElementById('reg-prop-idioma')?.value || 'ES',
      hotel: document.getElementById('reg-prop-hotel')?.value || '',
      contactoNombre: document.getElementById('reg-prop-contacto-nombre')?.value || '',
      contactoTel: document.getElementById('reg-prop-contacto-tel')?.value || '',
      aceptaTyc: document.getElementById('reg-prop-tyc').checked
    };

    const res = await registrarPropietario(data);
    if (res.success) {
      const modalEl = document.getElementById('modal-registro-propietario');
      if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      regPropForm.reset();
    }
  });

  // 4. Formulario de Postulación como Cuidador
  const postCuidForm = document.getElementById('form-postular-cuidador');
  postCuidForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombre: document.getElementById('post-cuid-nombre').value,
      apellido: document.getElementById('post-cuid-apellido').value,
      email: document.getElementById('post-cuid-email').value,
      password: document.getElementById('post-cuid-password').value,
      telefono: document.getElementById('post-cuid-tel').value,
      tipoDocumento: document.getElementById('post-cuid-tipodoc').value,
      numDocumento: document.getElementById('post-cuid-numdoc').value,
      distrito: document.getElementById('post-cuid-distrito').value,
      direccion: document.getElementById('post-cuid-direccion').value,
      experiencia: document.getElementById('post-cuid-exp').value,
      vivienda: document.getElementById('post-cuid-vivienda').value,
      capacidad: document.getElementById('post-cuid-capacidad').value,
      tarifaInicial: document.getElementById('post-cuid-tarifa').value,
      docIdentidadUrl: document.getElementById('post-cuid-doc-url')?.value || '',
      declaracionJurada: document.getElementById('post-cuid-declaracion').checked,
      aceptaTyc: document.getElementById('post-cuid-tyc').checked
    };

    const res = await postularCuidador(data);
    if (res.success) {
      const modalEl = document.getElementById('modal-postular-cuidador');
      if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      postCuidForm.reset();
    }
  });

  // 5. Formulario de Postulación de Clínica Veterinaria
  const postVetForm = document.getElementById('form-postular-clinica');
  postVetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nombreClinica: document.getElementById('post-vet-nombre').value,
      ruc: document.getElementById('post-vet-ruc').value,
      email: document.getElementById('post-vet-email').value,
      password: document.getElementById('post-vet-password').value,
      telefonoEmergencia: document.getElementById('post-vet-tel').value,
      distrito: document.getElementById('post-vet-distrito').value,
      direccion: document.getElementById('post-vet-direccion').value,
      horario: document.getElementById('post-vet-horario').value,
      tarifaEmergencia: document.getElementById('post-vet-tarifa').value,
      colegiaturaCmvp: document.getElementById('post-vet-cmvp').value,
      nombreResponsable: document.getElementById('post-vet-responsable').value,
      dniResponsable: document.getElementById('post-vet-dni-responsable').value,
      aceptaTyc: document.getElementById('post-vet-tyc').checked
    };

    const res = await postularClinicaVeterinaria(data);
    if (res.success) {
      const modalEl = document.getElementById('modal-postular-clinica');
      if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      postVetForm.reset();
    }
  });

  // 6. Formulario de Reset Password (cuando se renderiza en #app-content)
  document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'form-reset-password') {
      e.preventDefault();
      const p1 = document.getElementById('input-new-pwd').value;
      const p2 = document.getElementById('input-confirm-pwd').value;
      if (p1 !== p2) {
        showToast('Las contraseñas no coinciden.', 'warning');
        return;
      }
      await updatePassword(p1);
    }
  });

  // 7. Controles de Moneda e Idioma
  document.getElementById('btn-toggle-currency')?.addEventListener('click', () => {
    appCurrency = appCurrency === 'PEN' ? 'USD' : 'PEN';
    localStorage.setItem('paw_currency', appCurrency);
    const btn = document.getElementById('btn-toggle-currency');
    if (btn) {
      btn.innerHTML = `<i class="bi bi-cash-stack"></i> ${appCurrency === 'PEN' ? 'S/ PEN' : '$ USD'}`;
    }
    showToast(t('common.moneda_cambiada', { val: appCurrency }), 'info');
    handleRouteChange();
  });

  document.getElementById('btn-toggle-lang')?.addEventListener('click', () => {
    appLanguage = (appLanguage === 'ES') ? 'EN' : 'ES';
    setLanguage(appLanguage);
    const btn = document.getElementById('btn-toggle-lang');
    if (btn) {
      btn.innerHTML = `<i class="bi bi-translate"></i> ${appLanguage}`;
    }
    applyTranslations(document);
    showToast(t('common.idioma_cambiado'), 'info');
    handleRouteChange();
  });
}

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🐾 Iniciando Paw Patita Cusco v5.1 Frontend Shell...');

  // 1. Inicializar Modal Legal Global
  initLegalModal();

  // 2. Hidratar preferencias de Moneda e Idioma en el Navbar
  const btnCurrency = document.getElementById('btn-toggle-currency');
  if (btnCurrency) {
    btnCurrency.innerHTML = `<i class="bi bi-cash-stack"></i> ${appCurrency === 'PEN' ? 'S/ PEN' : '$ USD'}`;
  }

  const btnLang = document.getElementById('btn-toggle-lang');
  if (btnLang) {
    btnLang.innerHTML = `<i class="bi bi-translate"></i> ${appLanguage}`;
  }
  setLanguage(appLanguage);
  applyTranslations(document);

  // 3. Configurar listeners de autenticación y vistas
  setupPasswordToggles();
  setupDemoButtons();
  setupFormListeners();
  onAuthStateChanged((session) => {
    updateNavbar(session);
    applyTranslations(document.getElementById('navbarMainContent'));
  });
  await initAuthSession();
  initRouter();
  initRealtimeAlerts();
});

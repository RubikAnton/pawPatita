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
import { getSupabase, isSupabaseConfigured, subscribeRealtime, unsubscribeRealtime } from './supabase-client.js';
import { CUSCO_CONFIG } from './config.js';
import { showToast, showSpinner, hideSpinner } from './utils/ui-helpers.js';
import { escapeHtml } from './utils/formatters.js';
import { attachFormValidation, validateFormNow, resetFormValidation } from './utils/validators.js';
import { initLegalModal } from './components/legal-modal.js';
import { initHelpModal } from './components/help-modal.js';
import { getCurrentLang, setLanguage, applyTranslations, t } from './i18n.js';

let appCurrency = localStorage.getItem('paw_currency') || 'PEN';
let appLanguage = getCurrentLang();
let unreadNotificationsCount = 0;
let activeNotifUserId = null;
let activeNotifChannelName = null;
let activeNotifEmail = null;
let currentNotifications = [];
let notificationsUseSupabase = false;

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

function getDemoNotifsStorageKey(emailOrId) {
  const safeKey = String(emailOrId || 'anon').trim().toLowerCase();
  return `paw_notifs_${safeKey}`;
}

function loadDemoNotifications(emailOrId) {
  try {
    const raw = localStorage.getItem(getDemoNotifsStorageKey(emailOrId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch (_) {
    return [];
  }
}

function saveDemoNotifications(emailOrId, list) {
  try {
    localStorage.setItem(
      getDemoNotifsStorageKey(emailOrId),
      JSON.stringify((list || []).slice(0, 20))
    );
  } catch (_) { /* ignore storage error */ }
}

function formatNotifTimestamp(isoDate) {
  if (!isoDate) return 'Reciente';
  try {
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return 'Reciente';
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return 'Reciente';
  }
}

function renderNotificationsUI() {
  const badgeEl = document.getElementById('notif-badge-count');
  const listEl = document.getElementById('notifications-list');

  const unread = currentNotifications.filter((n) => !n.leida).length;
  unreadNotificationsCount = unread;

  if (badgeEl) {
    if (unread > 0) {
      badgeEl.textContent = unread > 99 ? '99+' : String(unread);
      badgeEl.classList.remove('d-none');
    } else {
      badgeEl.textContent = '0';
      badgeEl.classList.add('d-none');
    }
  }

  if (listEl) {
    if (!currentNotifications.length) {
      listEl.innerHTML = '<div class="p-3 text-center text-muted small">No tienes notificaciones pendientes.</div>';
      return;
    }

    listEl.innerHTML = currentNotifications.map((n) => {
      const isSos = n.tipo === 'sos';
      const isUnread = !n.leida;
      const itemClasses = [
        'notification-item',
        isUnread ? 'unread' : '',
        isSos ? 'alert-urgent' : ''
      ].filter(Boolean).join(' ');
      const iconCls = isSos
        ? 'bi-exclamation-octagon-fill text-danger'
        : n.tipo === 'pago'
          ? 'bi-cash-coin text-success'
          : n.tipo === 'reserva'
            ? 'bi-calendar-check text-primary'
            : 'bi-bell-fill text-warning';

      return `
        <div class="${itemClasses}" data-notif-id="${escapeHtml(n.id || '')}">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="fw-bold small ${isSos ? 'text-danger' : 'text-dark'}">
              <i class="bi ${iconCls} me-1"></i>${escapeHtml(n.titulo || 'Notificación')}
            </div>
            ${isUnread ? '<span class="badge bg-primary rounded-pill" style="font-size:0.65rem;">Nueva</span>' : ''}
          </div>
          <div class="small mt-1 text-secondary">${escapeHtml(n.mensaje || '')}</div>
          <small class="text-muted d-block mt-1">${escapeHtml(formatNotifTimestamp(n.created_at))}</small>
        </div>
      `;
    }).join('');
  }
}

/**
 * Reinicia por completo el estado de notificaciones, badge y canal Realtime activo
 */
export function resetNotificationsState() {
  if (activeNotifChannelName) {
    unsubscribeRealtime(activeNotifChannelName);
  }
  activeNotifUserId = null;
  activeNotifChannelName = null;
  activeNotifEmail = null;
  currentNotifications = [];
  notificationsUseSupabase = false;
  unreadNotificationsCount = 0;

  const bellContainer = document.getElementById('navbar-notification-bell');
  if (bellContainer) bellContainer.classList.add('d-none');
  renderNotificationsUI();
}

/**
 * Marca todas las notificaciones del usuario autenticado como leídas (UI + BD/Local)
 */
async function markAllNotificationsAsRead() {
  if (!activeNotifUserId && !activeNotifEmail) return;

  const hadUnread = currentNotifications.some((n) => !n.leida) || unreadNotificationsCount > 0;
  currentNotifications = currentNotifications.map((n) => ({ ...n, leida: true }));
  unreadNotificationsCount = 0;
  renderNotificationsUI();

  if (!hadUnread) return;

  if (notificationsUseSupabase && activeNotifUserId) {
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('notificaciones')
          .update({ leida: true })
          .eq('id_usuario_destino', activeNotifUserId)
          .eq('leida', false);
        if (error) {
          console.warn('No se pudieron marcar las notificaciones como leídas:', error.message);
        }
      } catch (err) {
        console.warn('Excepción al marcar notificaciones como leídas:', err);
      }
    }
  } else if (activeNotifEmail) {
    saveDemoNotifications(activeNotifEmail, currentNotifications);
  }
}

/**
 * Sincroniza la campanita de notificaciones exclusivamente con el usuario autenticado
 * (consulta `public.notificaciones` + canal Realtime filtrado por `id_usuario_destino`)
 */
export async function syncUserNotifications(user, profile) {
  if (!user || !user.id || (profile && profile.estado_cuenta !== 'activo')) {
    resetNotificationsState();
    return;
  }

  // Evitar re-suscribir si el mismo usuario ya está sincronizado
  if (activeNotifUserId === user.id) {
    return;
  }

  if (activeNotifChannelName) {
    unsubscribeRealtime(activeNotifChannelName);
    activeNotifChannelName = null;
  }

  const targetUserId = user.id;
  const targetEmail = (user.email || profile?.email || user.id).trim().toLowerCase();
  activeNotifUserId = targetUserId;
  activeNotifEmail = targetEmail;
  currentNotifications = [];
  renderNotificationsUI();

  const bellContainer = document.getElementById('navbar-notification-bell');
  if (bellContainer) bellContainer.classList.remove('d-none');

  const supabase = getSupabase();
  let hasSupabaseSession = false;
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data: sessData } = await supabase.auth.getSession();
      hasSupabaseSession = Boolean(sessData?.session?.user?.id === targetUserId);
    } catch (_) {
      hasSupabaseSession = false;
    }
  }

  if (activeNotifUserId !== targetUserId) return;

  if (hasSupabaseSession) {
    notificationsUseSupabase = true;
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('id_usuario_destino', targetUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (activeNotifUserId !== targetUserId) return;

      if (!error && Array.isArray(data)) {
        currentNotifications = data.filter((r) => r.id_usuario_destino === targetUserId);
      } else {
        currentNotifications = [];
      }
    } catch (err) {
      console.warn('No se pudieron cargar las notificaciones del usuario:', err);
      currentNotifications = [];
    }

    if (activeNotifUserId !== targetUserId) return;
    renderNotificationsUI();

    const channelName = `canal-notifs-${targetUserId}`;
    activeNotifChannelName = channelName;
    subscribeRealtime(
      channelName,
      'notificaciones',
      '*',
      (payload) => {
        if (activeNotifUserId !== targetUserId) return;
        const evType = payload?.eventType || '';
        const rec = payload?.new || payload?.old || {};
        if (!rec.id_usuario_destino || rec.id_usuario_destino !== targetUserId) return;

        if (evType === 'INSERT') {
          const withoutDup = currentNotifications.filter((item) => item.id !== rec.id);
          currentNotifications = [rec, ...withoutDup].slice(0, 20);
          renderNotificationsUI();
          showToast(
            rec.mensaje || rec.titulo || 'Tienes una nueva notificación.',
            rec.tipo === 'sos' ? 'danger' : 'info',
            rec.titulo || 'Notificación',
            rec.tipo === 'sos' ? 7500 : 5000
          );
        } else if (evType === 'UPDATE') {
          currentNotifications = currentNotifications.map((item) => (
            item.id === rec.id ? { ...item, ...rec } : item
          ));
          renderNotificationsUI();
        } else if (evType === 'DELETE') {
          currentNotifications = currentNotifications.filter((item) => item.id !== rec.id);
          renderNotificationsUI();
        }
      },
      `id_usuario_destino=eq.${targetUserId}`
    );
  } else {
    notificationsUseSupabase = false;
    activeNotifChannelName = null;
    currentNotifications = loadDemoNotifications(targetEmail);
    renderNotificationsUI();
  }
}

function setupNotificationCenterListeners() {
  const bellContainer = document.getElementById('navbar-notification-bell');
  bellContainer?.addEventListener('shown.bs.dropdown', () => {
    markAllNotificationsAsRead();
  });

  document.getElementById('btn-mark-all-notifs-read')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    markAllNotificationsAsRead();
  });

  window.addEventListener('paw:auth-changed', (e) => {
    if (!e?.detail?.user) {
      resetNotificationsState();
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
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      const pass = btn.getAttribute('data-pass');
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');
      const loginForm = document.getElementById('form-login');
      if (emailInput && passInput) {
        emailInput.value = email;
        passInput.value = pass;
        if (loginForm) resetFormValidation(loginForm);
        emailInput.focus();
      }
    });
  });
}

/**
 * Configura los event listeners y motor central de validación para todos los formularios Auth
 */
function setupFormListeners() {
  // 1. Formulario de Login
  const loginForm = document.getElementById('form-login');
  attachFormValidation(loginForm);
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateFormNow(loginForm).valid) return;
    const email = document.getElementById('login-email').value.trim();
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
  attachFormValidation(forgotForm);
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateFormNow(forgotForm).valid) return;
    const email = document.getElementById('forgot-email').value.trim();
    const res = await requestPasswordReset(email);
    if (res.success) {
      const modalEl = document.getElementById('modal-forgot-password');
      if (modalEl && window.bootstrap?.Modal) {
        window.bootstrap.Modal.getInstance(modalEl)?.hide();
      }
      forgotForm.reset();
    }
  });

  // 3. Formulario de Registro Propietario
  const regPropForm = document.getElementById('form-registro-propietario');
  attachFormValidation(regPropForm);
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
    if (!validateFormNow(regPropForm).valid) return;
    const data = {
      nombre: document.getElementById('reg-prop-nombre').value.trim(),
      apellido: document.getElementById('reg-prop-apellido').value.trim(),
      email: document.getElementById('reg-prop-email').value.trim(),
      password: document.getElementById('reg-prop-password').value,
      telefono: document.getElementById('reg-prop-tel').value.trim(),
      tipoDocumento: document.getElementById('reg-prop-tipodoc').value,
      numDocumento: document.getElementById('reg-prop-numdoc').value.trim(),
      distrito: document.getElementById('reg-prop-distrito').value,
      direccion: document.getElementById('reg-prop-direccion').value.trim(),
      esTurista: toggleTurista?.checked || false,
      paisOrigen: document.getElementById('reg-prop-pais')?.value.trim() || 'Perú',
      idioma: document.getElementById('reg-prop-idioma')?.value || 'ES',
      hotel: document.getElementById('reg-prop-hotel')?.value.trim() || '',
      contactoNombre: document.getElementById('reg-prop-contacto-nombre')?.value.trim() || '',
      contactoTel: document.getElementById('reg-prop-contacto-tel')?.value.trim() || '',
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
  attachFormValidation(postCuidForm);
  postCuidForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateFormNow(postCuidForm).valid) return;
    const data = {
      nombre: document.getElementById('post-cuid-nombre').value.trim(),
      apellido: document.getElementById('post-cuid-apellido').value.trim(),
      email: document.getElementById('post-cuid-email').value.trim(),
      password: document.getElementById('post-cuid-password').value,
      telefono: document.getElementById('post-cuid-tel').value.trim(),
      tipoDocumento: document.getElementById('post-cuid-tipodoc').value,
      numDocumento: document.getElementById('post-cuid-numdoc').value.trim(),
      distrito: document.getElementById('post-cuid-distrito').value,
      direccion: document.getElementById('post-cuid-direccion').value.trim(),
      experiencia: document.getElementById('post-cuid-exp').value,
      vivienda: document.getElementById('post-cuid-vivienda').value,
      capacidad: document.getElementById('post-cuid-capacidad').value,
      tarifaInicial: document.getElementById('post-cuid-tarifa').value,
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
  attachFormValidation(postVetForm);
  postVetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateFormNow(postVetForm).valid) return;
    const data = {
      nombreClinica: document.getElementById('post-vet-nombre').value.trim(),
      ruc: document.getElementById('post-vet-ruc').value.trim(),
      email: document.getElementById('post-vet-email').value.trim(),
      password: document.getElementById('post-vet-password').value,
      telefonoEmergencia: document.getElementById('post-vet-tel').value.trim(),
      distrito: document.getElementById('post-vet-distrito').value,
      direccion: document.getElementById('post-vet-direccion').value.trim(),
      horario: document.getElementById('post-vet-horario').value,
      tarifaEmergencia: document.getElementById('post-vet-tarifa').value,
      colegiaturaCmvp: document.getElementById('post-vet-cmvp').value.trim(),
      nombreResponsable: document.getElementById('post-vet-responsable').value.trim(),
      dniResponsable: document.getElementById('post-vet-dni-responsable').value.trim(),
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
      attachFormValidation(e.target);
      if (!validateFormNow(e.target).valid) return;
      const p1 = document.getElementById('input-new-pwd').value;
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
  console.log('🐾 Iniciando Paw Patita Cusco v5.2 Frontend Shell...');

  // 1. Inicializar Modal Legal Global y Centro de Ayuda FAQ (H10)
  initLegalModal();
  initHelpModal();

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

  // 3. Configurar listeners de autenticación, notificaciones y vistas
  setupPasswordToggles();
  setupDemoButtons();
  setupFormListeners();
  setupNotificationCenterListeners();
  onAuthStateChanged((session) => {
    updateNavbar(session);
    applyTranslations(document.getElementById('navbarMainContent'));
    syncUserNotifications(session?.user, session?.profile);
  });
  await initAuthSession();
  initRouter();
});

/**
 * Paw Patita Cusco v5.0 — Enrutador SPA Basado en Hash
 * js/router.js
 * 
 * Gestiona la navegación de la SPA (`#/`, `#/catalogo`, `#/login`, `#/propietario`,
 * `#/cuidador`, `#/veterinaria`, `#/admin`, `#/paw-id/:id`, `#/reset-password`)
 * con guardias de seguridad por rol autenticado.
 */

import { getSessionData } from './auth/auth.js';
import { showToast } from './utils/ui-helpers.js';
import { escapeHtml } from './utils/formatters.js';
import { renderLanding } from './public/landing.js';
import { renderCatalogo, aplicarFiltros } from './public/catalogo.js';
import { renderPawIdPublico } from './public/paw-id-publico.js';
import { renderPanelPropietario } from './roles/propietario.js';
import { renderPanelCuidador } from './roles/cuidador.js';
import { renderPanelVeterinaria } from './roles/veterinaria.js';
import { renderPanelAdministrador } from './roles/administrador.js';

const routes = {
  '#/': { title: 'Paw Patita Cusco — Cuidado Familiar & SOS 24h', public: true },
  '#/catalogo': { title: 'Catálogo de Cuidadores en Cusco', public: true },
  '#/login': { title: 'Iniciar Sesión / Acceso Demo', public: true },
  '#/reset-password': { title: 'Restablecer Contraseña', public: true },
  '#/paw-id': { title: 'Ficha Digital PAW-ID', public: true, dynamic: true },
  '#/propietario': { title: 'Panel Propietario', role: 'propietario' },
  '#/cuidador': { title: 'Panel Cuidador', role: 'cuidador' },
  '#/veterinaria': { title: 'Central SOS & Clínica Aliada', role: 'veterinaria' },
  '#/admin': { title: 'Administración General Paw Patita', role: 'administrador' }
};

/**
 * Obtiene la ruta actual normalizada desde el hash
 */
export function getCurrentHash() {
  const hash = window.location.hash || '#/';
  return hash.split('?')[0]; // Ignorar query params para matching
}

/**
 * Navega a una ruta específica
 * @param {string} hash 
 */
export function navigateTo(hash) {
  if (window.location.hash === hash) {
    handleRouteChange();
  } else {
    window.location.hash = hash;
  }
}

/**
 * Maneja el cambio de ruta evaluando guardias de rol y montando la vista
 */
export async function handleRouteChange() {
  const currentHash = getCurrentHash();
  const { user, profile } = getSessionData();

  // 1. Manejo de ruta dinámica #/paw-id/:id
  if (currentHash.startsWith('#/paw-id/')) {
    const pawId = currentHash.replace('#/paw-id/', '').trim();
    document.title = `Ficha PAW-ID ${pawId} — Paw Patita Cusco`;
    const container = document.getElementById('app-content');
    renderPawIdPublico(container, pawId);
    updateNavbarActiveState('#/catalogo');
    return;
  }

  const routeConfig = routes[currentHash] || routes['#/'];
  document.title = routeConfig.title;

  // 2. Guardia de Seguridad por Rol
  if (routeConfig.role) {
    if (!user || !profile) {
      showToast('Debes iniciar sesión para acceder a este panel.', 'warning', 'Acceso Restringido');
      navigateTo('#/login');
      return;
    }

    if (profile.rol !== routeConfig.role && profile.rol !== 'administrador') {
      showToast(`No tienes permisos para acceder al panel de ${routeConfig.role}.`, 'danger', 'Acceso Denegado');
      navigateTo(getDefaultRoleRoute(profile.rol));
      return;
    }
  }

  // 3. Renderizado de Vista
  renderRouteView(currentHash, profile);
  updateNavbarActiveState(currentHash);
}

/**
 * Determina la ruta por defecto según el rol del usuario
 */
export function getDefaultRoleRoute(rol) {
  switch (rol) {
    case 'propietario': return '#/propietario';
    case 'cuidador': return '#/cuidador';
    case 'veterinaria': return '#/veterinaria';
    case 'administrador': return '#/admin';
    default: return '#/';
  }
}

/**
 * Actualiza la clase active en los enlaces del navbar
 */
function updateNavbarActiveState(hash) {
  document.querySelectorAll('.nav-link[data-route]').forEach(link => {
    const route = link.getAttribute('data-route');
    if (route === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Renderiza el esqueleto de la vista en #app-content
 * (Los módulos completos de Fase 4, 5, 6, 7 y 8 montarán sus componentes en estos contenedores)
 */
function renderRouteView(hash, profile) {
  const container = document.getElementById('app-content');
  if (!container) return;

  switch (hash) {
    case '#/':
      renderLanding(container);
      break;

    case '#/catalogo':
      renderCatalogo(container);
      break;

    case '#/login':
      container.innerHTML = `
        <div class="container py-5">
          <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
              <div class="card card-paw p-4 border-0 shadow-sm text-center">
                <i class="bi bi-box-arrow-in-right text-warning fs-1 mb-2"></i>
                <h3 class="fw-bold mb-3">Iniciar Sesión</h3>
                <p class="text-secondary small mb-4">Ingresa con tu correo o utiliza un acceso demo rápido de evaluación.</p>
                <button class="btn btn-paw w-100 mb-3" data-bs-toggle="modal" data-bs-target="#modal-login">
                  <i class="bi bi-key-fill me-1"></i> Abrir Ventana de Inicio de Sesión
                </button>
                <div class="text-secondary small">
                  ¿Aún no tienes cuenta? 
                  <a href="javascript:void(0)" data-bs-toggle="modal" data-bs-target="#modal-registro-propietario" class="fw-bold">
                    Regístrate como Propietario
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      // Abrir modal automáticamente en ruta #/login
      const loginModalEl = document.getElementById('modal-login');
      if (loginModalEl && window.bootstrap?.Modal) {
        const bsModal = window.bootstrap.Modal.getOrCreateInstance(loginModalEl);
        bsModal.show();
      }
      break;

    case '#/reset-password':
      container.innerHTML = `
        <div class="container py-5">
          <div class="row justify-content-center">
            <div class="col-md-6 col-lg-5">
              <div class="card card-paw p-4 border-0 shadow-sm">
                <div class="text-center mb-4">
                  <i class="bi bi-shield-lock-fill text-warning fs-1"></i>
                  <h3 class="fw-bold mt-2">Nueva Contraseña</h3>
                  <p class="text-secondary small">Ingresa tu nueva contraseña para acceder a Paw Patita Cusco.</p>
                </div>
                <form id="form-reset-password">
                  <div class="mb-3">
                    <label class="form-label small fw-bold">Nueva Contraseña</label>
                    <input type="password" id="input-new-pwd" class="form-control" required minlength="6" placeholder="Mínimo 6 caracteres">
                  </div>
                  <div class="mb-4">
                    <label class="form-label small fw-bold">Confirmar Nueva Contraseña</label>
                    <input type="password" id="input-confirm-pwd" class="form-control" required minlength="6" placeholder="Repite la contraseña">
                  </div>
                  <button type="submit" class="btn btn-paw w-100">
                    <i class="bi bi-check-circle me-1"></i> Guardar Nueva Contraseña
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      `;
      break;

    case '#/propietario':
      renderPanelPropietario(container, profile);
      break;

    case '#/cuidador':
      renderPanelCuidador(container, profile);
      break;

    case '#/veterinaria':
      renderPanelVeterinaria(container, profile);
      break;

    case '#/admin':
      renderPanelAdministrador(container, profile);
      break;

    default:
      container.innerHTML = `
        <div class="container py-5 text-center">
          <h2 class="display-4 fw-bold text-warning mb-3">404</h2>
          <p class="lead text-secondary mb-4">La página que estás buscando no existe en Paw Patita Cusco.</p>
          <a href="#/" class="btn btn-paw">Volver al Inicio</a>
        </div>
      `;
      break;
  }
}

function renderPawIdPlaceholder(pawId) {
  const container = document.getElementById('app-content');
  if (!container) return;
  container.innerHTML = `
    <div class="container py-5 text-center">
      <div class="card card-paw p-4 max-w-lg mx-auto border-0 shadow-sm" style="max-width: 500px;">
        <i class="bi bi-qr-code text-warning fs-1 mb-2"></i>
        <h3 class="fw-bold mb-2">Ficha de Emergencia PAW-ID</h3>
        <span class="badge bg-secondary mb-3 fs-6">${escapeHtml(pawId)}</span>
        <p class="text-secondary small mb-4">
          Esta ruta pública de emergencia está lista para invocar <code>rpc_obtener_paw_id_publico</code> en la Fase 4.
        </p>
        <a href="#/" class="btn btn-paw-outline">Ir a la Portada</a>
      </div>
    </div>
  `;
}

/**
 * Inicializa el listener del enrutador hash
 */
export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

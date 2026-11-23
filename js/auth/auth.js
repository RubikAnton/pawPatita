/**
 * Paw Patita Cusco v5.0 — Módulo de Autenticación y Estado de Sesión
 * js/auth/auth.js
 * 
 * Gestiona el inicio de sesión, cierre de sesión, recuperación de contraseña,
 * bloqueo estricto para cuentas no activas ('pendiente', 'rechazado', 'suspendido')
 * y notificación de cambios de estado a la Navbar y al Router.
 */

import { getSupabase, isSupabaseConfigured } from '../supabase-client.js';
import { showSpinner, hideSpinner, showToast, handleSupabaseError, showConfirmModal } from '../utils/ui-helpers.js';

let currentUser = null;
let currentProfile = null;
const authStateListeners = new Set();

/**
 * Suscribe un callback a cambios de estado de autenticación
 * @param {function({ user: Object|null, profile: Object|null }): void} listener 
 */
export function onAuthStateChanged(listener) {
  authStateListeners.add(listener);
  // Notificar estado actual si ya existe
  if (currentUser || currentProfile) {
    listener({ user: currentUser, profile: currentProfile });
  }
}

function notifyAuthStateListeners() {
  authStateListeners.forEach((fn) => {
    try {
      fn({ user: currentUser, profile: currentProfile });
    } catch (e) {
      console.error('Error en listener de authState:', e);
    }
  });
}

/**
 * Obtiene el usuario y perfil autenticado actualmente
 */
export function getSessionData() {
  return { user: currentUser, profile: currentProfile };
}

/**
 * Carga el perfil desde perfiles_usuarios para un usuario auth dado
 * @param {string} userId 
 */
export async function fetchUserProfile(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('perfiles_usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error al obtener perfil de usuario:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Excepción al consultar perfil:', err);
    return null;
  }
}

/**
 * Inicia sesión con email y contraseña, verificando estado_cuenta
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ success: boolean, profile?: Object, error?: string }>}
 */
export async function loginWithEmail(email, password) {
  showSpinner('Verificando credenciales de acceso...');
  const supabase = getSupabase();

  try {
    if (!supabase || !isSupabaseConfigured()) {
      // Modo Mock de Demostración si Supabase aún no tiene URL real
      console.warn('⚠️ Supabase no configurado: evaluando credenciales en modo demostración local.');
      const demoRoles = {
        'lucia.mendoza@gmail.com': {
          id: '50000000-0000-0000-0000-000000000002',
          codigo_usuario: 'USR-002',
          rol: 'propietario',
          nombre: 'Lucía',
          apellido: 'Mendoza Vargas',
          telefono: '+51 984 234 567',
          es_turista: false,
          tipo_documento: 'DNI',
          num_documento: '72849102',
          pais_origen: 'Perú',
          idioma_preferido: 'ES',
          direccion: 'Urb. Magisterio Primera Etapa K-12',
          distrito_cusco: 'Wanchaq',
          hospedaje_hotel_cusco: '',
          contacto_emergencia_nombre: 'Carlos Mendoza (Hermano)',
          contacto_emergencia_tel: '+51 984 998 877',
          estado_cuenta: 'activo'
        },
        'valeria.cuidadora@pawpatitacusco.pe': {
          id: '50000000-0000-0000-0000-000000000011',
          codigo_usuario: 'USR-011',
          rol: 'cuidador',
          nombre: 'Valeria',
          apellido: 'Huamán Delgado',
          telefono: '+51 984 311 111',
          tipo_documento: 'DNI',
          num_documento: '71029384',
          distrito_cusco: 'Wanchaq',
          estado_cuenta: 'activo'
        },
        'vet.sanfrancisco@pawpatitacusco.pe': {
          id: '50000000-0000-0000-0000-000000000004',
          codigo_usuario: 'USR-004',
          rol: 'veterinaria',
          nombre: 'Dra. Claudia',
          apellido: 'Salazar Cáceres',
          telefono: '+51 984 711 222',
          tipo_documento: 'DNI',
          num_documento: '41928374',
          distrito_cusco: 'Wanchaq',
          id_clinica_asociada: '40000000-0000-0000-0000-000000000001',
          estado_cuenta: 'activo'
        },
        'admin@pawpatitacusco.pe': {
          id: '50000000-0000-0000-0000-000000000001',
          codigo_usuario: 'USR-001',
          rol: 'administrador',
          nombre: 'Rodrigo',
          apellido: 'Quispe Monzón',
          telefono: '+51 984 100 100',
          tipo_documento: 'DNI',
          num_documento: '44112233',
          distrito_cusco: 'Cusco Centro',
          estado_cuenta: 'activo'
        }
      };

      const found = demoRoles[email.trim().toLowerCase()];
      if (found && password === 'PawPatita2026!') {
        currentUser = { id: found.id, email: email.trim().toLowerCase() };
        currentProfile = {
          ...found,
          email: email.trim().toLowerCase()
        };
        try {
          localStorage.setItem('paw_demo_session_v5', JSON.stringify({ user: currentUser, profile: currentProfile }));
        } catch (_) { /* ignore storage error */ }
        notifyAuthStateListeners();
        showToast(`¡Bienvenido(a), ${found.nombre}! Sesión iniciada con éxito.`, 'success');
        return { success: true, profile: currentProfile };
      }
      throw new Error('Credenciales inválidas para el entorno demo. Usa una de las 4 cuentas rápidas con clave PawPatita2026!');
    }

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });

    if (authErr) throw authErr;

    const profile = await fetchUserProfile(authData.user.id);
    if (!profile) {
      throw new Error('No se encontró el perfil de usuario asociado en la plataforma.');
    }

    // DIRECTIVA OBLIGATORIA: Bloqueo estricto si estado_cuenta != 'activo'
    if (profile.estado_cuenta !== 'activo') {
      await supabase.auth.signOut();
      currentUser = null;
      currentProfile = null;
      notifyAuthStateListeners();

      let motivoTexto = 'Tu cuenta se encuentra en revisión por el equipo administrativo de Paw Patita Cusco.';
      if (profile.estado_cuenta === 'rechazado') {
        motivoTexto = 'Tu postulación o cuenta no ha sido aprobada. Comunícate con soporte para más detalles.';
      } else if (profile.estado_cuenta === 'suspendido') {
        motivoTexto = 'Tu cuenta ha sido suspendida temporalmente por seguridad o incumplimiento de términos.';
      }

      showConfirmModal({
        titulo: 'Estado de Cuenta: ' + profile.estado_cuenta.toUpperCase(),
        mensaje: `${motivoTexto}\n\nPodrás ingresar tan pronto tu estado sea ACTIVO.`,
        confirmText: 'Entendido',
        cancelText: 'Cerrar',
        tipo: 'warning'
      });

      return { success: false, error: 'Cuenta no activa' };
    }

    currentUser = authData.user;
    currentProfile = profile;
    notifyAuthStateListeners();
    showToast(`¡Bienvenido(a) a Paw Patita, ${profile.nombre || 'Usuario'}!`, 'success');
    return { success: true, profile };
  } catch (err) {
    handleSupabaseError(err);
    return { success: false, error: err.message };
  } finally {
    hideSpinner();
  }
}

/**
 * Cierra la sesión activa y limpia el estado local
 */
export async function logout() {
  showSpinner('Cerrando sesión de forma segura...');
  const supabase = getSupabase();
  try {
    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    currentUser = null;
    currentProfile = null;
    try { localStorage.removeItem('paw_demo_session_v5'); } catch (_) { /* ignore */ }
    notifyAuthStateListeners();
    showToast('Has cerrado sesión correctamente.', 'info');
    window.location.hash = '#/';
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  } finally {
    hideSpinner();
  }
}

/**
 * Solicita enlace de restablecimiento de contraseña vía email
 * @param {string} email 
 */
export async function requestPasswordReset(email) {
  showSpinner('Enviando enlace de recuperación a tu correo...');
  const supabase = getSupabase();

  try {
    if (!supabase || !isSupabaseConfigured()) {
      showToast('Enlace de recuperación simulado enviado a ' + email, 'info');
      return { success: true };
    }

    const redirectUrl = `${window.location.origin}${window.location.pathname}#/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl
    });

    if (error) throw error;

    showToast('Te hemos enviado un correo con las instrucciones para restablecer tu contraseña.', 'success', 'Correo Enviado');
    return { success: true };
  } catch (err) {
    handleSupabaseError(err);
    return { success: false, error: err.message };
  } finally {
    hideSpinner();
  }
}

/**
 * Actualiza la contraseña del usuario cuando vuelve desde el enlace del email
 * @param {string} newPassword 
 */
export async function updatePassword(newPassword) {
  showSpinner('Actualizando tu contraseña...');
  const supabase = getSupabase();

  try {
    if (!supabase || !isSupabaseConfigured()) {
      showToast('Contraseña actualizada con éxito (modo demo).', 'success');
      window.location.hash = '#/login';
      return { success: true };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showToast('Tu contraseña ha sido actualizada con éxito. Inicia sesión con tu nueva clave.', 'success');
    window.location.hash = '#/login';
    return { success: true };
  } catch (err) {
    handleSupabaseError(err);
    return { success: false, error: err.message };
  } finally {
    hideSpinner();
  }
}

export function updateLocalSessionProfile(partialProfile) {
  if (!currentProfile) return null;
  currentProfile = { ...currentProfile, ...partialProfile };
  try {
    if (localStorage.getItem('paw_demo_session_v5')) {
      localStorage.setItem('paw_demo_session_v5', JSON.stringify({ user: currentUser, profile: currentProfile }));
    }
  } catch (_) { /* ignore */ }
  notifyAuthStateListeners();
  return currentProfile;
}

/**
 * Inicializa la verificación de sesión persistente al arrancar la aplicación
 */
export async function initAuthSession() {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    try {
      const saved = localStorage.getItem('paw_demo_session_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.user && parsed?.profile?.estado_cuenta === 'activo') {
          currentUser = parsed.user;
          currentProfile = parsed.profile;
        }
      }
    } catch (_) { /* ignore */ }
    notifyAuthStateListeners();
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      const profile = await fetchUserProfile(session.user.id);
      if (profile && profile.estado_cuenta === 'activo') {
        currentProfile = profile;
      } else {
        await supabase.auth.signOut();
        currentUser = null;
        currentProfile = null;
      }
    }
  } catch (err) {
    console.warn('No se pudo restaurar la sesión previa:', err);
  } finally {
    notifyAuthStateListeners();
  }
}

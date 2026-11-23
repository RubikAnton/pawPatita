/**
 * Paw Patita Cusco v5.0 — Formularios Públicos de Registro y Postulación
 * js/auth/postulaciones.js
 * 
 * Gestiona:
 * 1. Registro de Propietario Unificado (Local / Turista con toggle dinámico).
 * 2. Postulación como Cuidador Independiente (Declaración Jurada + Docs).
 * 3. Postulación como Clínica Veterinaria Aliada (RUC 11 dígitos, CMVP, constancia).
 */

import { getSupabase, isSupabaseConfigured, uploadOrResolveMedia } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import { showSpinner, hideSpinner, showToast, handleSupabaseError, showConfirmModal } from '../utils/ui-helpers.js';

/**
 * Registra a un nuevo Propietario Unificado
 * @param {Object} data 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function registrarPropietario(data) {
  showSpinner('Creando tu cuenta de Propietario en Paw Patita Cusco...');
  const supabase = getSupabase();

  try {
    if (!data.aceptaTyc) {
      throw new Error('Debes aceptar los Términos y Condiciones v5.0 para registrarte.');
    }

    if (!supabase || !isSupabaseConfigured()) {
      showToast('Registro simulado con éxito (modo demo). Inicia sesión con lucia.mendoza@gmail.com', 'success');
      return { success: true };
    }

    // 1. Registro en Supabase Auth con metadatos
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          rol: 'propietario',
          nombre: data.nombre.trim(),
          apellido: data.apellido?.trim() || '',
          telefono: data.telefono?.trim() || '',
          tipo_documento: data.tipoDocumento || 'DNI',
          num_documento: data.numDocumento.trim(),
          es_turista: Boolean(data.esTurista),
          pais_origen: data.paisOrigen || 'Perú',
          idioma_preferido: data.idioma || 'ES',
          distrito_cusco: data.distrito || 'Cusco Centro',
          direccion: data.direccion || '',
          hospedaje_hotel_cusco: data.hotel || null,
          contacto_emergencia_nombre: data.contactoNombre || null,
          contacto_emergencia_tel: data.contactoTel || null,
          estado_cuenta: 'activo',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    showToast('¡Registro exitoso! Ya puedes iniciar sesión con tu correo y contraseña.', 'success', 'Bienvenido a Paw Patita');
    return { success: true };
  } catch (err) {
    handleSupabaseError(err);
    return { success: false, error: err.message };
  } finally {
    hideSpinner();
  }
}

/**
 * Registra la Postulación de un Cuidador Independiente
 * Deja al usuario en estado_cuenta = 'pendiente' hasta la aprobación del Administrador
 * @param {Object} data 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function postularCuidador(data) {
  showSpinner('Procesando tu postulación como Cuidador Paw Patita...');
  const supabase = getSupabase();

  try {
    if (!data.aceptaTyc || !data.declaracionJurada) {
      throw new Error('Debes aceptar los Términos y marcar la Declaración Jurada de veracidad.');
    }

    // Procesar archivos / URLs de verificación
    let docIdentidadUrl = data.docIdentidadUrl || '';
    let docPolicialUrl = data.docPolicialUrl || '';
    let docPenalUrl = data.docPenalUrl || '';
    let docDomicilioUrl = data.docDomicilioUrl || '';

    if (data.fileIdentidad) {
      const res = await uploadOrResolveMedia(data.fileIdentidad, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS);
      if (res.url) docIdentidadUrl = res.url;
    }
    if (data.filePolicial) {
      const res = await uploadOrResolveMedia(data.filePolicial, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS);
      if (res.url) docPolicialUrl = res.url;
    }

    if (!supabase || !isSupabaseConfigured()) {
      showConfirmModal({
        titulo: 'Postulación Registrada (Modo Demo)',
        mensaje: 'Tu solicitud como cuidador ha sido recibida con éxito. El equipo administrador revisará tus antecedentes para activar tu cuenta.',
        confirmText: 'Entendido',
        cancelText: 'Cerrar',
        tipo: 'primary'
      });
      return { success: true };
    }

    // 1. Registro en Auth con rol 'cuidador' y estado_cuenta 'pendiente'
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          rol: 'cuidador',
          nombre: data.nombre.trim(),
          apellido: data.apellido?.trim() || '',
          telefono: data.telefono?.trim() || '',
          tipo_documento: data.tipoDocumento || 'DNI',
          num_documento: data.numDocumento.trim(),
          distrito_cusco: data.distrito || 'Wanchaq',
          direccion: data.direccion || '',
          estado_cuenta: 'pendiente',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    // 2. Registro complementario en antecedentes_cuidadores si hay sesión
    if (authData.user) {
      await supabase.from('antecedentes_cuidadores').insert({
        id_usuario: authData.user.id,
        declaracion_jurada_veracidad: true,
        doc_identidad_url: docIdentidadUrl || 'https://i.postimg.cc/placeholder-dni.png',
        doc_policial_url: docPolicialUrl || 'https://i.postimg.cc/placeholder-policial.png',
        doc_penal_url: docPenalUrl || null,
        doc_domicilio_url: docDomicilioUrl || null,
        estado_verificacion: 'pendiente'
      });
    }

    showConfirmModal({
      titulo: '¡Postulación Recibida con Éxito!',
      mensaje: 'Muchas gracias por postular a la red de cuidadores de Paw Patita Cusco. Tu perfil y documentos están en revisión por nuestro equipo administrativo. Te notificaremos a tu correo en cuanto seas aprobado.',
      confirmText: 'Aceptar',
      cancelText: 'Cerrar',
      tipo: 'primary'
    });

    return { success: true };
  } catch (err) {
    handleSupabaseError(err);
    return { success: false, error: err.message };
  } finally {
    hideSpinner();
  }
}

/**
 * Registra la Postulación de una Clínica Veterinaria Aliada
 * Queda en estado_afiliacion = 'pendiente' y estado_cuenta = 'pendiente'
 * @param {Object} data 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function postularClinicaVeterinaria(data) {
  showSpinner('Registrando la solicitud de tu Clínica Veterinaria...');
  const supabase = getSupabase();

  try {
    if (!data.aceptaTyc) {
      throw new Error('Debes aceptar los Términos de Afiliación de Clínicas Aliadas.');
    }

    if (!data.ruc || data.ruc.trim().length !== 11) {
      throw new Error('El RUC institucional debe tener exactamente 11 dígitos.');
    }

    if (!data.colegiaturaCmvp) {
      throw new Error('El N° de Colegiatura CMVP del médico veterinario es obligatorio.');
    }

    if (!supabase || !isSupabaseConfigured()) {
      showConfirmModal({
        titulo: 'Solicitud de Clínica Recibida (Modo Demo)',
        mensaje: `La postulación para "${data.nombreClinica}" ha sido enviada. El administrador verificará el RUC y CMVP antes de activar el acceso.`,
        confirmText: 'Entendido',
        cancelText: 'Cerrar',
        tipo: 'primary'
      });
      return { success: true };
    }

    // 1. Crear usuario en Auth para el médico/clínica
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          rol: 'veterinaria',
          nombre: data.nombreResponsable?.trim() || 'Médico Veterinario',
          apellido: data.apellidoResponsable?.trim() || '',
          telefono: data.telefonoEmergencia?.trim() || '',
          tipo_documento: 'DNI',
          num_documento: data.dniResponsable?.trim() || '00000000',
          distrito_cusco: data.distrito || 'Cusco Centro',
          direccion: data.direccion || '',
          estado_cuenta: 'pendiente',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    // 2. Registrar en la tabla clinicas_veterinarias con estado_afiliacion = 'pendiente'
    const { error: clinicErr } = await supabase.from('clinicas_veterinarias').insert({
      ruc: data.ruc.trim(),
      nombre: data.nombreClinica.trim(),
      email_institucional: data.email.trim(),
      direccion: data.direccion.trim(),
      distrito_cusco: data.distrito || 'Cusco Centro',
      telefono_emergencia: data.telefonoEmergencia.trim(),
      horario_atencion: data.horario || '24 Horas',
      especialidades: data.especialidades || ['Emergencias 24h', 'Cirugía General'],
      tarifa_consulta_emergencia: Number(data.tarifaEmergencia) || 60.00,
      colegiatura_cmvp: data.colegiaturaCmvp.trim(),
      estado_afiliacion: 'pendiente',
      activa: false
    });

    if (clinicErr) {
      console.warn('Nota de inserción en clinicas_veterinarias:', clinicErr.message);
    }

    showConfirmModal({
      titulo: '¡Solicitud de Afiliación Registrada!',
      mensaje: `La clínica "${data.nombreClinica}" ha sido postulada con éxito. Nuestro equipo verificará la vigencia en CMVP y SUNAT para habilitar su acceso a la Central SOS de Cusco.`,
      confirmText: 'Entendido',
      cancelText: 'Cerrar',
      tipo: 'primary'
    });

    return { success: true };
  } catch (err) {
    handleSupabaseError(err);
    return { success: false, error: err.message };
  } finally {
    hideSpinner();
  }
}

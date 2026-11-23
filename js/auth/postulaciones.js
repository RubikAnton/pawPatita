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

    // 1. Registro en Auth con rol 'cuidador', estado_cuenta 'pendiente' y metadatos completos para el trigger
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          rol: 'cuidador',
          auto_create_perfil: true,
          nombre: data.nombre.trim(),
          apellido: data.apellido?.trim() || '',
          telefono: data.telefono?.trim() || '',
          tipo_documento: data.tipoDocumento || 'DNI',
          num_documento: data.numDocumento.trim(),
          distrito_cusco: data.distrito || 'Wanchaq',
          direccion: data.direccion || '',
          anios_experiencia: Number(data.experiencia) || 2,
          tipo_vivienda: data.vivienda || 'Casa con patio cercado',
          capacidad_max_mascotas: Number(data.capacidad) || 3,
          tarifa_inicial: Number(data.tarifaInicial) || 35,
          doc_identidad_url: docIdentidadUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
          doc_policial_url: docPolicialUrl || 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
          doc_penal_url: docPenalUrl || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
          doc_domicilio_url: docDomicilioUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
          estado_cuenta: 'pendiente',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    // 2. Registro complementario en perfiles_cuidadores + antecedentes_cuidadores si hay sesión activa
    if (authData?.user && authData?.session) {
      let idCuidador = null;
      const { data: existingCuid } = await supabase
        .from('perfiles_cuidadores')
        .select('id')
        .eq('id_usuario', authData.user.id)
        .maybeSingle();

      if (existingCuid?.id) {
        idCuidador = existingCuid.id;
      } else {
        const { data: newCuid } = await supabase
          .from('perfiles_cuidadores')
          .insert({
            id_usuario: authData.user.id,
            presentacion_corta: `Cuidador independiente postulante en ${data.distrito || 'Wanchaq'}`,
            descripcion_experiencia: `Experiencia de ${data.experiencia || 2} años en cuidado canino familiar.`,
            anios_experiencia: Number(data.experiencia) || 2,
            tipo_vivienda: data.vivienda || 'Casa con patio cercado',
            capacidad_max_mascotas: Number(data.capacidad) || 3,
            estado_postulacion: 'pendiente',
            cuenta_cobro_tipo: 'Yape',
            cuenta_cobro_numero: data.telefono?.trim() || ''
          })
          .select('id')
          .maybeSingle();
        idCuidador = newCuid?.id || null;
      }

      if (idCuidador) {
        await supabase.from('antecedentes_cuidadores').upsert({
          id_cuidador: idCuidador,
          doc_identidad_url: docIdentidadUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700',
          doc_antecedentes_policiales_url: docPolicialUrl || 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700',
          doc_antecedentes_penales_url: docPenalUrl || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700',
          doc_domicilio_url: docDomicilioUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700',
          declaracion_jurada: true,
          estado_verificacion: 'pendiente'
        }, { onConflict: 'id_cuidador' });
      }
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

    // 1. Crear usuario en Auth para el médico/clínica con metadatos de clínica para el trigger
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          rol: 'veterinaria',
          auto_create_perfil: true,
          nombre: data.nombreResponsable?.trim() || 'Médico Veterinario',
          apellido: data.apellidoResponsable?.trim() || '',
          telefono: data.telefonoEmergencia?.trim() || '',
          tipo_documento: 'DNI',
          num_documento: data.dniResponsable?.trim() || '00000000',
          distrito_cusco: data.distrito || 'Cusco Centro',
          direccion: data.direccion || '',
          ruc: data.ruc.trim(),
          nombre_clinica: data.nombreClinica.trim(),
          horario_atencion: data.horario || '24 Horas',
          tarifa_consulta_emergencia: Number(data.tarifaEmergencia) || 60.00,
          colegiatura_cmvp: data.colegiaturaCmvp.trim(),
          estado_cuenta: 'pendiente',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    // 2. Asegurar registro en clinicas_veterinarias y vínculo id_clinica_asociada si no lo creó el trigger
    const { data: existingClinic } = await supabase
      .from('clinicas_veterinarias')
      .select('id')
      .eq('ruc', data.ruc.trim())
      .maybeSingle();

    let idClinica = existingClinic?.id || null;
    if (!idClinica) {
      const { data: newClinic, error: clinicErr } = await supabase
        .from('clinicas_veterinarias')
        .insert({
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
        })
        .select('id')
        .maybeSingle();

      if (clinicErr) {
        console.warn('Nota de inserción en clinicas_veterinarias:', clinicErr.message);
      } else {
        idClinica = newClinic?.id || null;
      }
    }

    if (idClinica && authData?.user && authData?.session) {
      await supabase
        .from('perfiles_usuarios')
        .update({ id_clinica_asociada: idClinica })
        .eq('id', authData.user.id);
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

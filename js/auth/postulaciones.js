/**
 * Paw Patita Cusco v5.1 — Formularios Públicos de Registro y Postulación
 * js/auth/postulaciones.js
 *
 * Gestiona:
 * 1. Registro de Propietario Unificado (Local / Turista con toggle dinámico).
 * 2. Postulación como Cuidador Independiente (Dropzones para foto perfil, hogar y 4 documentos legales).
 * 3. Postulación como Clínica Veterinaria Aliada (RUC 11 dígitos, CMVP, fachada y constancia en Storage).
 */

import { getSupabase, isSupabaseConfigured, uploadFileToStorage } from '../supabase-client.js';
import { CUSCO_CONFIG } from '../config.js';
import { showSpinner, hideSpinner, showToast, handleSupabaseError, showConfirmModal } from '../utils/ui-helpers.js';
import { mountFileUploader } from '../components/file-uploader.js';

let cuidadorUploaders = null;
let clinicaUploaders = null;

/**
 * Inicializa los widgets Dropzone en los modales públicos de Postulación de Cuidador y Clínica
 */
export function initPostulacionesUploaders() {
  if (document.getElementById('uploader-cuid-foto-perfil') && !cuidadorUploaders) {
    cuidadorUploaders = {
      fotoPerfil: mountFileUploader('#uploader-cuid-foto-perfil', {
        label: 'Tu Foto de Perfil',
        accept: 'image/*',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES,
        folder: 'postulaciones/cuidadores',
        compact: true,
        helpText: 'JPG/PNG • Máx. 5 MB'
      }),
      fotoHogar: mountFileUploader('#uploader-cuid-foto-hogar', {
        label: 'Foto de tu Hogar / Patio',
        accept: 'image/*',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES,
        folder: 'postulaciones/hogares',
        compact: true,
        helpText: 'JPG/PNG • Máx. 5 MB'
      }),
      docDni: mountFileUploader('#uploader-cuid-doc-dni', {
        label: '1. DNI o Carné de Extranjería',
        accept: 'image/*,application/pdf',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS,
        folder: 'postulaciones/dni',
        compact: true
      }),
      docPolicial: mountFileUploader('#uploader-cuid-doc-policial', {
        label: '2. Antecedentes Policiales (PNP)',
        accept: 'image/*,application/pdf',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS,
        folder: 'postulaciones/policiales',
        compact: true
      }),
      docPenal: mountFileUploader('#uploader-cuid-doc-penal', {
        label: '3. Antecedentes Penales (PJ)',
        accept: 'image/*,application/pdf',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS,
        folder: 'postulaciones/penales',
        compact: true
      }),
      docDomicilio: mountFileUploader('#uploader-cuid-doc-domicilio', {
        label: '4. Recibo Agua/Luz (Domicilio Cusco)',
        accept: 'image/*,application/pdf',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS,
        folder: 'postulaciones/domicilio',
        compact: true
      })
    };
  }

  if (document.getElementById('uploader-vet-foto-fachada') && !clinicaUploaders) {
    clinicaUploaders = {
      fotoFachada: mountFileUploader('#uploader-vet-foto-fachada', {
        label: 'Foto de Fachada de la Clínica',
        accept: 'image/*',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES,
        folder: 'postulaciones/clinicas',
        compact: true,
        helpText: 'JPG/PNG • Máx. 5 MB'
      }),
      constancia: mountFileUploader('#uploader-vet-constancia', {
        label: 'Constancia CMVP / Ficha RUC',
        accept: 'image/*,application/pdf',
        bucket: CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS,
        folder: 'postulaciones/constancias',
        compact: true,
        helpText: 'Imagen o PDF • Máx. 10 MB'
      })
    };
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPostulacionesUploaders());
  } else {
    initPostulacionesUploaders();
  }
}

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
      throw new Error('Debes aceptar los Términos y Condiciones para registrarte.');
    }

    if (!supabase || !isSupabaseConfigured()) {
      showToast('Registro simulado con éxito (modo demo). Inicia sesión con lucia.mendoza@gmail.com', 'success');
      return { success: true };
    }

    const { error: authErr } = await supabase.auth.signUp({
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
  showSpinner('Procesando tu postulación y subiendo expediente seguro...');
  const supabase = getSupabase();

  try {
    initPostulacionesUploaders();

    if (!data.aceptaTyc || !data.declaracionJurada) {
      throw new Error('Debes aceptar los Términos y marcar la Declaración Jurada de veracidad.');
    }

    // 1. Subir archivos pendientes de los dropzones o archivos directos antes del signUp
    let fotoPerfilUrl = data.fotoPerfilUrl || '';
    let fotoHogarUrl = data.fotoHogarUrl || '';
    let docIdentidadUrl = data.docIdentidadUrl || '';
    let docPolicialUrl = data.docPolicialUrl || '';
    let docPenalUrl = data.docPenalUrl || '';
    let docDomicilioUrl = data.docDomicilioUrl || '';

    if (cuidadorUploaders) {
      const [upPerfil, upHogar, upDni, upPol, upPen, upDom] = await Promise.all([
        cuidadorUploaders.fotoPerfil.uploadIfPending(),
        cuidadorUploaders.fotoHogar.uploadIfPending(),
        cuidadorUploaders.docDni.uploadIfPending(),
        cuidadorUploaders.docPolicial.uploadIfPending(),
        cuidadorUploaders.docPenal.uploadIfPending(),
        cuidadorUploaders.docDomicilio.uploadIfPending()
      ]);
      if (upPerfil) fotoPerfilUrl = upPerfil;
      if (upHogar) fotoHogarUrl = upHogar;
      if (upDni) docIdentidadUrl = upDni;
      if (upPol) docPolicialUrl = upPol;
      if (upPen) docPenalUrl = upPen;
      if (upDom) docDomicilioUrl = upDom;
    }

    if (data.fileFotoPerfil) {
      const res = await uploadFileToStorage(data.fileFotoPerfil, CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES, 'postulaciones/cuidadores');
      fotoPerfilUrl = res.storageRef || res.url;
    }
    if (data.fileFotoHogar) {
      const res = await uploadFileToStorage(data.fileFotoHogar, CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES, 'postulaciones/hogares');
      fotoHogarUrl = res.storageRef || res.url;
    }
    if (data.fileIdentidad) {
      const res = await uploadFileToStorage(data.fileIdentidad, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS, 'postulaciones/dni');
      docIdentidadUrl = res.storageRef;
    }
    if (data.filePolicial) {
      const res = await uploadFileToStorage(data.filePolicial, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS, 'postulaciones/policiales');
      docPolicialUrl = res.storageRef;
    }
    if (data.filePenal) {
      const res = await uploadFileToStorage(data.filePenal, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS, 'postulaciones/penales');
      docPenalUrl = res.storageRef;
    }
    if (data.fileDomicilio) {
      const res = await uploadFileToStorage(data.fileDomicilio, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS, 'postulaciones/domicilio');
      docDomicilioUrl = res.storageRef;
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

    const finalDocIdentidad = docIdentidadUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700';
    const finalDocPolicial = docPolicialUrl || 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700';
    const finalDocPenal = docPenalUrl || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=700';
    const finalDocDomicilio = docDomicilioUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=700';

    // 2. Registro en Auth enviando todas las referencias en options.data para handle_new_auth_user()
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
          foto_url: fotoPerfilUrl || null,
          foto_hogar_url: fotoHogarUrl || null,
          doc_identidad_url: finalDocIdentidad,
          doc_policial_url: finalDocPolicial,
          doc_antecedentes_policiales_url: finalDocPolicial,
          doc_penal_url: finalDocPenal,
          doc_antecedentes_penales_url: finalDocPenal,
          doc_domicilio_url: finalDocDomicilio,
          estado_cuenta: 'pendiente',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    // 3. Sincronización complementaria únicamente si existe sesión autenticada activa
    if (authData?.user && authData?.session) {
      const { data: existingCuid } = await supabase
        .from('perfiles_cuidadores')
        .select('id')
        .eq('id_usuario', authData.user.id)
        .maybeSingle();

      if (existingCuid?.id) {
        await supabase
          .from('perfiles_cuidadores')
          .update({
            foto_url: fotoPerfilUrl || undefined,
            foto_hogar_url: fotoHogarUrl || undefined
          })
          .eq('id', existingCuid.id);

        await supabase.from('antecedentes_cuidadores').upsert({
          id_cuidador: existingCuid.id,
          doc_identidad_url: finalDocIdentidad,
          doc_antecedentes_policiales_url: finalDocPolicial,
          doc_antecedentes_penales_url: finalDocPenal,
          doc_domicilio_url: finalDocDomicilio,
          declaracion_jurada: true,
          estado_verificacion: 'pendiente'
        }, { onConflict: 'id_cuidador' });
      }
    }

    if (cuidadorUploaders) {
      Object.values(cuidadorUploaders).forEach((u) => u.clear());
    }

    showConfirmModal({
      titulo: '¡Postulación Recibida con Éxito!',
      mensaje: 'Muchas gracias por postular a la red de cuidadores de Paw Patita Cusco. Tu perfil, fotografías y documentos están en revisión por nuestro equipo administrativo. Te notificaremos a tu correo en cuanto seas aprobado.',
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
  showSpinner('Registrando la solicitud y documentos de tu Clínica Veterinaria...');
  const supabase = getSupabase();

  try {
    initPostulacionesUploaders();

    if (!data.aceptaTyc) {
      throw new Error('Debes aceptar los Términos de Afiliación de Clínicas Aliadas.');
    }

    if (!data.ruc || data.ruc.trim().length !== 11) {
      throw new Error('El RUC institucional debe tener exactamente 11 dígitos.');
    }

    if (!data.colegiaturaCmvp) {
      throw new Error('El N° de Colegiatura CMVP del médico veterinario es obligatorio.');
    }

    // 1. Subir fachada y constancia CMVP/RUC antes del signUp
    let fotoFachadaUrl = data.fotoFachadaUrl || '';
    let constanciaUrl = data.constanciaUrl || '';

    if (clinicaUploaders) {
      const [upFachada, upConstancia] = await Promise.all([
        clinicaUploaders.fotoFachada.uploadIfPending(),
        clinicaUploaders.constancia.uploadIfPending()
      ]);
      if (upFachada) fotoFachadaUrl = upFachada;
      if (upConstancia) constanciaUrl = upConstancia;
    }

    if (data.fileFachada) {
      const res = await uploadFileToStorage(data.fileFachada, CUSCO_CONFIG.STORAGE_BUCKETS.PERFILES, 'postulaciones/clinicas');
      fotoFachadaUrl = res.storageRef || res.url;
    }
    if (data.fileConstancia) {
      const res = await uploadFileToStorage(data.fileConstancia, CUSCO_CONFIG.STORAGE_BUCKETS.DOCUMENTOS, 'postulaciones/constancias');
      constanciaUrl = res.storageRef;
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

    // 2. Crear usuario en Auth enviando todos los datos en options.data.
    // El trigger handle_new_auth_user() inserta automáticamente la fila en clinicas_veterinarias
    // (evitando el doble INSERT cuando no existe sesión activa).
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
          direccion: data.direccion?.trim() || '',
          ruc: data.ruc.trim(),
          nombre_clinica: data.nombreClinica.trim(),
          horario_atencion: data.horario || '24 Horas',
          especialidades: data.especialidades || ['Emergencias 24h', 'Medicina General'],
          tarifa_consulta_emergencia: Number(data.tarifaEmergencia) || 60.00,
          colegiatura_cmvp: data.colegiaturaCmvp.trim(),
          foto_fachada_url: fotoFachadaUrl || null,
          constancia_url: constanciaUrl || null,
          estado_cuenta: 'pendiente',
          tyc_version_aceptada: CUSCO_CONFIG.TYC_VERSION
        }
      }
    });

    if (authErr) throw authErr;

    // 3. Solo actualizar si existe sesión autenticada activa (nunca hacer un segundo INSERT como anon)
    if (authData?.user && authData?.session) {
      const { data: existingClinic } = await supabase
        .from('clinicas_veterinarias')
        .select('id')
        .eq('ruc', data.ruc.trim())
        .maybeSingle();

      if (existingClinic?.id) {
        if (fotoFachadaUrl || constanciaUrl) {
          await supabase
            .from('clinicas_veterinarias')
            .update({
              foto_fachada_url: fotoFachadaUrl || undefined,
              constancia_url: constanciaUrl || undefined
            })
            .eq('id', existingClinic.id);
        }
        await supabase
          .from('perfiles_usuarios')
          .update({ id_clinica_asociada: existingClinic.id })
          .eq('id', authData.user.id);
      }
    }

    if (clinicaUploaders) {
      Object.values(clinicaUploaders).forEach((u) => u.clear());
    }

    showConfirmModal({
      titulo: '¡Solicitud de Afiliación Registrada!',
      mensaje: `La clínica "${data.nombreClinica}" ha sido postulada con éxito. Nuestro equipo verificará la constancia CMVP y vigencia SUNAT para habilitar su acceso a la Central S.O.S. de Cusco.`,
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

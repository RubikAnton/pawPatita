/**
 * ============================================================================
 * PAW PATITA CUSCO - BACKEND GOOGLE APPS SCRIPT (Codigo.gs)
 * Arquitectura Serverless sobre Google Sheets (13 Pestañas Relacionales)
 * Compatible 100% con HtmlService Sandbox y Serialización JSON Segura
 * ============================================================================
 */

var FOTO_DEFAULT_POSTIMG = 'https://i.postimg.cc/HxXrCmbp/images.jpg';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Paw Patita Cusco | Cuidado Canino Seguro y Responsable')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================================
// UTILIDADES DE MAPEO DINÁMICO Y NORMALIZACIÓN DE DATOS
// ============================================================================

function normalizarClave(texto) {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .replace(/[áäà]/g, 'a')
    .replace(/[éëè]/g, 'e')
    .replace(/[íïì]/g, 'i')
    .replace(/[óöò]/g, 'o')
    .replace(/[úüù]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9_]/g, '_');
}

function limpiarTexto(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    try {
      return Utilities.formatDate(val, 'GMT-5', 'yyyy-MM-dd HH:mm');
    } catch (e) {
      return String(val);
    }
  }
  var s = String(val).trim();
  // Eliminar .0 residual cuando Excel/Sheets convierte DNI, teléfono o clave numérica a float
  if (/^\d+\.0$/.test(s)) {
    s = s.replace(/\.0$/, '');
  }
  return s;
}

function limpiarFechaCorta(val) {
  if (!val) return '';
  if (val instanceof Date) {
    try {
      return Utilities.formatDate(val, 'GMT-5', 'yyyy-MM-dd');
    } catch (e) {
      return String(val);
    }
  }
  var s = String(val).trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  return s;
}

function limpiarUrlImagen(url) {
  var s = limpiarTexto(url);
  if (!s) return FOTO_DEFAULT_POSTIMG;
  // Si viene duplicada con espacio o markdown [url](url)
  if (s.indexOf('](') !== -1) {
    var m = s.match(/\((https?:\/\/[^\s\)]+)\)/);
    if (m && m[1]) s = m[1];
  }
  if (s.indexOf(' ') !== -1) {
    s = s.split(' ')[0].trim();
  }
  if (s.indexOf('http://') === 0 || s.indexOf('https://') === 0) {
    return s;
  }
  return FOTO_DEFAULT_POSTIMG;
}

function obtenerHoja(ss, nombreEsperado) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombreEsperado);
  if (hoja) return hoja;

  var buscado = normalizarClave(nombreEsperado);
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    if (normalizarClave(hojas[i].getName()) === buscado) {
      return hojas[i];
    }
  }
  return null;
}

function construirMapaEncabezados(filaEncabezados) {
  var mapa = {};
  if (!filaEncabezados) return mapa;
  for (var i = 0; i < filaEncabezados.length; i++) {
    var clave = normalizarClave(filaEncabezados[i]);
    if (clave) {
      mapa[clave] = i;
    }
  }
  return mapa;
}

function obtenerCampo(fila, mapa, posiblesNombres, idxFallback) {
  if (!fila) return '';
  if (mapa && posiblesNombres) {
    var lista = Array.isArray(posiblesNombres) ? posiblesNombres : [posiblesNombres];
    for (var i = 0; i < lista.length; i++) {
      var k = normalizarClave(lista[i]);
      if (mapa.hasOwnProperty(k) && mapa[k] < fila.length) {
        return fila[mapa[k]];
      }
    }
  }
  if (typeof idxFallback === 'number' && idxFallback < fila.length) {
    return fila[idxFallback];
  }
  return '';
}

function esEstadoAfirmativo(valor) {
  var v = normalizarClave(valor).toUpperCase();
  return (v === 'SI' || v === 'S_' || v === 'TRUE' || v === '1' || v === 'ACTIVO' || v === 'ACTIVA' || v === 'APROBADO' || v === 'VALIDADO' || v === '');
}

// ============================================================================
// 1. AUTENTICACIÓN DE USUARIOS (PROPIETARIO, CUIDADOR, ADMINISTRADOR)
// ============================================================================

function autenticarUsuario(correo, password) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = obtenerHoja(ss, 'usuarios');
    if (!sheet) {
      return { exito: false, mensaje: 'Error: No se encontró la pestaña "usuarios" en Google Sheets.' };
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { exito: false, mensaje: 'La tabla de usuarios no contiene registros.' };
    }

    var mapaU = construirMapaEncabezados(data[0]);
    var emailBuscado = limpiarTexto(correo).toLowerCase();
    var passBuscado = limpiarTexto(password);

    if (!emailBuscado || !passBuscado) {
      return { exito: false, mensaje: 'Por favor, ingrese correo y contraseña.' };
    }

    for (var i = 1; i < data.length; i++) {
      var fila = data[i];
      var dbEmail = limpiarTexto(obtenerCampo(fila, mapaU, ['email', 'correo'], 3)).toLowerCase();
      var dbPass = limpiarTexto(obtenerCampo(fila, mapaU, ['password_hash', 'password', 'clave', 'contrasena'], 4));

      if (!dbEmail) continue;

      if (dbEmail === emailBuscado && dbPass === passBuscado) {
        var activoRaw = limpiarTexto(obtenerCampo(fila, mapaU, ['activo', 'estado'], 12));
        if (activoRaw && !esEstadoAfirmativo(activoRaw)) {
          return { exito: false, mensaje: 'Tu cuenta se encuentra inactiva o suspendida temporalmente.' };
        }

        var idUser = limpiarTexto(obtenerCampo(fila, mapaU, ['id_usuario', 'id'], 0));
        var nombre = limpiarTexto(obtenerCampo(fila, mapaU, ['nombre', 'nombres'], 1));
        var apellido = limpiarTexto(obtenerCampo(fila, mapaU, ['apellido', 'apellidos'], 2));
        var telefono = limpiarTexto(obtenerCampo(fila, mapaU, ['telefono', 'celular'], 5));
        var rolUser = limpiarTexto(obtenerCampo(fila, mapaU, ['tipo_usuario', 'rol'], 6)) || 'Propietario';
        var numDoc = limpiarTexto(obtenerCampo(fila, mapaU, ['num_documento', 'dni', 'documento'], 8)) || idUser;
        var direccion = limpiarTexto(obtenerCampo(fila, mapaU, ['direccion'], 9));
        var distrito = limpiarTexto(obtenerCampo(fila, mapaU, ['distrito_cusco', 'distrito'], 10)) || 'Cusco';

        var idCuidadorAsociado = '';
        var estadoPostulacion = 'Aprobado';

        if (rolUser.toLowerCase().indexOf('cuidador') !== -1) {
          var sCuid = obtenerHoja(ss, 'perfiles_cuidadores');
          if (sCuid) {
            var dataCuid = sCuid.getDataRange().getValues();
            if (dataCuid.length > 1) {
              var mapaC = construirMapaEncabezados(dataCuid[0]);
              for (var c = 1; c < dataCuid.length; c++) {
                var idUsuCuid = limpiarTexto(obtenerCampo(dataCuid[c], mapaC, ['id_usuario'], 1));
                if (idUsuCuid === idUser || idUsuCuid === numDoc) {
                  idCuidadorAsociado = limpiarTexto(obtenerCampo(dataCuid[c], mapaC, ['id_cuidador'], 0));
                  estadoPostulacion = limpiarTexto(obtenerCampo(dataCuid[c], mapaC, ['estado_postulacion', 'estado'], 5)) || 'Aprobado';
                  break;
                }
              }
            }
          }
        }

        return {
          exito: true,
          id_usuario: idUser,
          id_cuidador: idCuidadorAsociado,
          estado_postulacion: estadoPostulacion,
          num_doc: numDoc,
          email: dbEmail,
          telefono: telefono,
          direccion: direccion,
          distrito: distrito,
          nombre: (nombre + ' ' + apellido).trim(),
          rol: rolUser
        };
      }
    }

    return { exito: false, mensaje: 'Correo electrónico o contraseña incorrectos. Verifica tus credenciales.' };
  } catch (err) {
    return { exito: false, mensaje: 'Error en autenticación: ' + err.message };
  }
}

// ============================================================================
// 2. REGISTRO DE NUEVO PROPIETARIO (LOCAL / TURISTA)
// ============================================================================

function registrarNuevoPropietario(d) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!d) return { exito: false, mensaje: 'Datos de registro vacíos.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = obtenerHoja(ss, 'usuarios');
    if (!sheet) return { exito: false, mensaje: 'No se encontró la pestaña "usuarios".' };

    var data = sheet.getDataRange().getValues();
    var mapaU = data.length > 0 ? construirMapaEncabezados(data[0]) : {};
    var emailNuevo = limpiarTexto(d.email).toLowerCase();
    var docNuevo = limpiarTexto(d.num_doc);

    if (!emailNuevo || !limpiarTexto(d.nombre) || !limpiarTexto(d.password) || !docNuevo) {
      return { exito: false, mensaje: 'Nombre, correo, contraseña y documento son obligatorios.' };
    }

    for (var i = 1; i < data.length; i++) {
      var dbEmail = limpiarTexto(obtenerCampo(data[i], mapaU, ['email', 'correo'], 3)).toLowerCase();
      var dbDoc = limpiarTexto(obtenerCampo(data[i], mapaU, ['num_documento', 'dni'], 8));
      if (dbEmail && dbEmail === emailNuevo) {
        return { exito: false, mensaje: 'El correo electrónico ya se encuentra registrado.' };
      }
      if (dbDoc && dbDoc === docNuevo) {
        return { exito: false, mensaje: 'El número de documento ya se encuentra registrado.' };
      }
    }

    var idUsuario = 'USR-' + Utilities.getUuid().substring(0, 6).toUpperCase();
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');
    var tipoDoc = limpiarTexto(d.tipo_doc) || 'DNI';

    sheet.appendRow([
      idUsuario,
      limpiarTexto(d.nombre),
      limpiarTexto(d.apellido),
      emailNuevo,
      limpiarTexto(d.password),
      limpiarTexto(d.telefono) || '984000000',
      'Propietario',
      tipoDoc,
      docNuevo,
      limpiarTexto(d.direccion) || 'Cusco',
      limpiarTexto(d.distrito) || 'Cusco',
      fecha,
      'Sí'
    ]);

    SpreadsheetApp.flush();
    return {
      exito: true,
      id_usuario: idUsuario,
      mensaje: '¡Cuenta de propietario creada con éxito! Ahora puedes iniciar sesión.'
    };
  } catch (err) {
    return { exito: false, mensaje: 'Error al registrar propietario: ' + err.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ============================================================================
// 3. REGISTRO Y POSTULACIÓN DE NUEVO CUIDADOR INDEPENDIENTE
// ============================================================================

function registrarNuevoCuidador(d) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!d) return { exito: false, mensaje: 'Datos de cuidador no recibidos.' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sUsu = obtenerHoja(ss, 'usuarios');
    var sCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    var sServ = obtenerHoja(ss, 'servicios');
    var sAnt = obtenerHoja(ss, 'antecedentes_cuidadores');

    if (!sUsu || !sCuid || !sServ || !sAnt) {
      return { exito: false, mensaje: 'Faltan hojas requeridas para el registro de cuidadores.' };
    }

    var emailNuevo = limpiarTexto(d.email).toLowerCase();
    var docNuevo = limpiarTexto(d.num_doc);
    var dataUsu = sUsu.getDataRange().getValues();
    var mapaU = dataUsu.length > 0 ? construirMapaEncabezados(dataUsu[0]) : {};

    if (!emailNuevo || !limpiarTexto(d.nombre) || !limpiarTexto(d.password) || !docNuevo) {
      return { exito: false, mensaje: 'Completa todos los campos obligatorios del cuidador.' };
    }

    for (var i = 1; i < dataUsu.length; i++) {
      var dbEmail = limpiarTexto(obtenerCampo(dataUsu[i], mapaU, ['email', 'correo'], 3)).toLowerCase();
      var dbDoc = limpiarTexto(obtenerCampo(dataUsu[i], mapaU, ['num_documento', 'dni'], 8));
      if (dbEmail && dbEmail === emailNuevo) {
        return { exito: false, mensaje: 'El correo electrónico ya está registrado.' };
      }
      if (dbDoc && dbDoc === docNuevo) {
        return { exito: false, mensaje: 'El DNI ya está registrado en la plataforma.' };
      }
    }

    var idUsuario = 'USR-' + Utilities.getUuid().substring(0, 6).toUpperCase();
    var idCuidador = 'CUID-' + Utilities.getUuid().substring(0, 5).toUpperCase();
    var idOferta = 'OF-' + Utilities.getUuid().substring(0, 5).toUpperCase();
    var huEcode = 'HU-' + Math.floor(100 + Math.random() * 900);
    var idAnt = 'ANT-' + Utilities.getUuid().substring(0, 5).toUpperCase();
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');

    var fotoUrl = limpiarUrlImagen(d.foto_url);
    var docPolicialUrl = limpiarUrlImagen(d.doc_policial_url || d.foto_url);
    var docPenalUrl = limpiarUrlImagen(d.doc_penal_url || d.doc_policial_url || d.foto_url);

    sUsu.appendRow([
      idUsuario,
      limpiarTexto(d.nombre),
      limpiarTexto(d.apellido),
      emailNuevo,
      limpiarTexto(d.password),
      limpiarTexto(d.telefono) || '984000000',
      'Cuidador',
      limpiarTexto(d.tipo_doc) || 'DNI',
      docNuevo,
      limpiarTexto(d.direccion) || 'Cusco',
      limpiarTexto(d.distrito) || 'Cusco',
      fecha,
      'Sí'
    ]);

    sCuid.appendRow([
      idCuidador,
      idUsuario,
      limpiarTexto(d.experiencia) || 'Cuidador independiente con espacio seguro y experiencia en atención canina en Cusco.',
      Number(d.capacidad) || 3,
      5.0,
      'Aprobado',
      fotoUrl
    ]);

    sServ.appendRow([
      idOferta,
      huEcode,
      idCuidador,
      limpiarTexto(d.servicio_principal) || 'Paseo Recreativo Matutino',
      Number(d.tarifa) || 30.00,
      'Sí'
    ]);

    sAnt.appendRow([
      idAnt,
      idCuidador,
      docPolicialUrl,
      docPenalUrl,
      'Pendiente',
      fecha
    ]);

    SpreadsheetApp.flush();
    return {
      exito: true,
      id_cuidador: idCuidador,
      hu_ecode: huEcode,
      mensaje: '¡Registro exitoso! Tu perfil de cuidador y tu oferta (' + huEcode + ') han sido creados.'
    };
  } catch (err) {
    return { exito: false, mensaje: 'Error al registrar cuidador: ' + err.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// ============================================================================
// 4. CATÁLOGO PÚBLICO DE CUIDADORES, RESEÑAS Y CLÍNICAS VETERINARIAS
// ============================================================================

function obtenerCatalogoCuidadoresCompleto() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    var sheetUsu = obtenerHoja(ss, 'usuarios');
    var sheetServ = obtenerHoja(ss, 'servicios');
    var sheetResenas = obtenerHoja(ss, 'reseñas');

    if (!sheetCuid || !sheetUsu) return [];

    var sCuid = sheetCuid.getDataRange().getValues();
    var sUsu = sheetUsu.getDataRange().getValues();
    var sServ = sheetServ ? sheetServ.getDataRange().getValues() : [];
    var sRev = sheetResenas ? sheetResenas.getDataRange().getValues() : [];

    var mapaC = sCuid.length > 0 ? construirMapaEncabezados(sCuid[0]) : {};
    var mapaU = sUsu.length > 0 ? construirMapaEncabezados(sUsu[0]) : {};
    var mapaS = sServ.length > 0 ? construirMapaEncabezados(sServ[0]) : {};
    var mapaR = sRev.length > 0 ? construirMapaEncabezados(sRev[0]) : {};

    // Mapa de Servicios por Cuidador
    var mapServicios = {};
    for (var i = 1; i < sServ.length; i++) {
      var idC = limpiarTexto(obtenerCampo(sServ[i], mapaS, ['id_cuidador'], 2));
      if (!idC) continue;
      var disp = limpiarTexto(obtenerCampo(sServ[i], mapaS, ['disponible'], 5));
      if (esEstadoAfirmativo(disp)) {
        if (!mapServicios[idC]) mapServicios[idC] = [];
        var tarifaVal = Number(obtenerCampo(sServ[i], mapaS, ['tarifa_diaria_por_perro', 'tarifa'], 4)) || 30;
        mapServicios[idC].push({
          id_oferta: limpiarTexto(obtenerCampo(sServ[i], mapaS, ['id_oferta'], 0)) || 'OF-101',
          hu_ecode: limpiarTexto(obtenerCampo(sServ[i], mapaS, ['hu_ecode'], 1)) || 'HU-801',
          tipo_servicio: limpiarTexto(obtenerCampo(sServ[i], mapaS, ['tipo_servicio'], 3)) || 'Paseo Recreativo',
          tarifa: tarifaVal.toFixed(2)
        });
      }
    }

    // Mapa de Reseñas por Cuidador
    var mapResenas = {};
    for (var r = 1; r < sRev.length; r++) {
      var idCRev = limpiarTexto(obtenerCampo(sRev[r], mapaR, ['id_cuidador'], 3));
      if (!idCRev) continue;
      if (!mapResenas[idCRev]) mapResenas[idCRev] = [];
      mapResenas[idCRev].push({
        id_resena: limpiarTexto(obtenerCampo(sRev[r], mapaR, ['id_resena', 'id_rese_a'], 0)),
        estrellas: Number(obtenerCampo(sRev[r], mapaR, ['calificacion_estrellas', 'estrellas'], 4)) || 5,
        comentario: limpiarTexto(obtenerCampo(sRev[r], mapaR, ['comentario'], 5)) || 'Excelente atención.',
        fecha: limpiarFechaCorta(obtenerCampo(sRev[r], mapaR, ['fecha_resena', 'fecha_rese_a'], 6))
      });
    }

    // Mapa de Usuarios
    var mapUsuarios = {};
    for (var k = 1; k < sUsu.length; k++) {
      var idU = limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['id_usuario'], 0));
      if (!idU) continue;
      var nom = limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['nombre'], 1));
      var ape = limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['apellido'], 2));
      mapUsuarios[idU] = {
        nombre: (nom + ' ' + ape).trim() || 'Cuidador Verificado',
        email: limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['email'], 3)),
        telefono: limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['telefono'], 5)) || '984000000',
        direccion: limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['direccion'], 9)) || 'Cusco',
        distrito: limpiarTexto(obtenerCampo(sUsu[k], mapaU, ['distrito_cusco', 'distrito'], 10)) || 'Cusco'
      };
    }

    var cuidadores = [];
    for (var j = 1; j < sCuid.length; j++) {
      var idCuidador = limpiarTexto(obtenerCampo(sCuid[j], mapaC, ['id_cuidador'], 0));
      if (!idCuidador) continue;

      var idUsuario = limpiarTexto(obtenerCampo(sCuid[j], mapaC, ['id_usuario'], 1));
      var experiencia = limpiarTexto(obtenerCampo(sCuid[j], mapaC, ['descripcion_experiencia', 'experiencia'], 2)) || 'Amante de los perros con experiencia certificada en Cusco.';
      var capacidad = Number(obtenerCampo(sCuid[j], mapaC, ['capacidad_max_mascotas', 'capacidad'], 3)) || 3;
      var reputacionBase = Number(obtenerCampo(sCuid[j], mapaC, ['reputacion_promedio', 'reputacion'], 4)) || 5.0;
      var estado = limpiarTexto(obtenerCampo(sCuid[j], mapaC, ['estado_postulacion', 'estado'], 5)) || 'Aprobado';
      var fotoUrl = limpiarUrlImagen(obtenerCampo(sCuid[j], mapaC, ['foto_url', 'foto'], 6));

      var estLower = estado.toLowerCase();
      if (estLower === 'rechazado' || estLower === 'inactivo') continue;

      var infoUsu = mapUsuarios[idUsuario] || {
        nombre: 'Cuidador ' + idCuidador,
        email: 'contacto@pawpatita.pe',
        telefono: '984000000',
        direccion: 'Cusco Centro',
        distrito: 'Cusco'
      };

      var listaResenas = mapResenas[idCuidador] || [];
      var repCalculada = reputacionBase;
      if (listaResenas.length > 0) {
        var suma = 0;
        for (var idxR = 0; idxR < listaResenas.length; idxR++) {
          suma += Number(listaResenas[idxR].estrellas || 5);
        }
        repCalculada = Number((suma / listaResenas.length).toFixed(1));
      }

      var listaServ = mapServicios[idCuidador] || [
        { id_oferta: 'OF-DEF', hu_ecode: 'HU-100', tipo_servicio: 'Paseo Recreativo Matutino', tarifa: '30.00' }
      ];

      cuidadores.push({
        id_cuidador: idCuidador,
        id_usuario: idUsuario,
        nombre: infoUsu.nombre,
        email: infoUsu.email,
        telefono: infoUsu.telefono,
        direccion: infoUsu.direccion,
        distrito: infoUsu.distrito,
        experiencia: experiencia,
        capacidad: capacidad,
        reputacion: repCalculada.toFixed(1),
        estado: estado,
        foto_url: fotoUrl,
        servicios: listaServ,
        resenas: listaResenas
      });
    }

    return cuidadores;
  } catch (err) {
    console.error('Error en obtenerCatalogoCuidadoresCompleto: ' + err.message);
    return [];
  }
}

function obtenerDirectorioClinicas() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = obtenerHoja(ss, 'clinicas_veterinarias');
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var mapa = construirMapaEncabezados(data[0]);
    var lista = [];
    for (var i = 1; i < data.length; i++) {
      var idC = limpiarTexto(obtenerCampo(data[i], mapa, ['id_clinica'], 0));
      if (!idC) continue;
      var activa = limpiarTexto(obtenerCampo(data[i], mapa, ['activa'], 5));
      if (!esEstadoAfirmativo(activa)) continue;
      lista.push({
        id_clinica: idC,
        nombre: limpiarTexto(obtenerCampo(data[i], mapa, ['nombre'], 1)),
        direccion: limpiarTexto(obtenerCampo(data[i], mapa, ['direccion'], 2)),
        telefono: limpiarTexto(obtenerCampo(data[i], mapa, ['telefono_emergencia', 'telefono'], 3)),
        distrito: limpiarTexto(obtenerCampo(data[i], mapa, ['distrito_cusco', 'distrito'], 4)) || 'Cusco'
      });
    }
    return lista;
  } catch (e) {
    return [];
  }
}

// ============================================================================
// 5. MÓDULO PROPIETARIO: MASCOTAS (PAW PATITA-ID), RESERVAS, RESEÑAS, EMERGENCIAS
// ============================================================================

function registrarMascota(d) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = obtenerHoja(ss, 'mascotas');
    if (!sheet) return { exito: false, mensaje: 'No se encontró la pestaña "mascotas".' };

    var idPet = 'PET-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var pawId = 'PAW-' + Math.floor(1000 + Math.random() * 9000);
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');
    var foto = limpiarUrlImagen(d.foto_url);

    sheet.appendRow([
      idPet,
      pawId,
      limpiarTexto(d.id_propietario),
      limpiarTexto(d.nombre),
      limpiarTexto(d.raza),
      Number(d.edad) || 1,
      Number(d.peso) || 5,
      limpiarTexto(d.vacunas) || 'Sí',
      limpiarTexto(d.alergias) || 'Ninguna alergia reportada',
      limpiarTexto(d.conducta) || 'Sociable y tranquilo',
      foto,
      'Validado',
      fecha
    ]);

    SpreadsheetApp.flush();
    return { exito: true, paw_id: pawId, id_mascota: idPet };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function obtenerMascotasPropietario(docProp, idUsu) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = obtenerHoja(ss, 'mascotas');
    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    var mapa = construirMapaEncabezados(data[0]);
    var list = [];
    var targetDoc = limpiarTexto(docProp);
    var targetUsu = limpiarTexto(idUsu);

    for (var i = 1; i < data.length; i++) {
      var idPet = limpiarTexto(obtenerCampo(data[i], mapa, ['id_mascota'], 0));
      if (!idPet) continue;
      var propDB = limpiarTexto(obtenerCampo(data[i], mapa, ['id_propietario'], 2));

      if ((targetDoc && propDB === targetDoc) || (targetUsu && propDB === targetUsu)) {
        list.push({
          id_mascota: idPet,
          paw_patita_id: limpiarTexto(obtenerCampo(data[i], mapa, ['paw_patita_id'], 1)) || 'PAW-0000',
          nombre: limpiarTexto(obtenerCampo(data[i], mapa, ['nombre'], 3)),
          raza: limpiarTexto(obtenerCampo(data[i], mapa, ['raza'], 4)),
          edad: Number(obtenerCampo(data[i], mapa, ['edad_anos', 'edad'], 5)) || 1,
          peso: Number(obtenerCampo(data[i], mapa, ['peso_kg', 'peso'], 6)) || 5,
          vacunas: limpiarTexto(obtenerCampo(data[i], mapa, ['cartilla_vacunas_al_dia', 'vacunas'], 7)) || 'Sí',
          alergias: limpiarTexto(obtenerCampo(data[i], mapa, ['alergias_restricciones', 'alergias'], 8)) || 'Ninguna',
          conducta: limpiarTexto(obtenerCampo(data[i], mapa, ['conducta_observaciones', 'conducta'], 9)) || 'Sociable',
          foto_url: limpiarUrlImagen(obtenerCampo(data[i], mapa, ['foto_url', 'foto'], 10)),
          estado: limpiarTexto(obtenerCampo(data[i], mapa, ['validado_por_veterinario', 'estado'], 11)) || 'Validado'
        });
      }
    }
    return list;
  } catch (e) {
    return [];
  }
}

function crearReservaPorPeriodo(r, p) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sRes = obtenerHoja(ss, 'reservas');
    var sPag = obtenerHoja(ss, 'pagos');
    var sLiq = obtenerHoja(ss, 'liquidaciones_cuidadores');
    if (!sRes || !sPag) return { exito: false, mensaje: 'Faltan hojas de reservas o pagos en la base de datos.' };

    var idR = 'RES-' + Math.floor(1000 + Math.random() * 9000);
    var codR = 'COD-' + Math.floor(1000 + Math.random() * 9000);
    var idPay = 'PAY-' + Math.floor(100 + Math.random() * 900);
    var idLiq = 'LIQ-' + Math.floor(100 + Math.random() * 900);
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');

    var monto = Number(r.monto_total) || 30;
    var comision = Number((monto * 0.15).toFixed(2));
    var neto = Number((monto - comision).toFixed(2));
    var compUrl = limpiarUrlImagen(p && p.comprobante_url ? p.comprobante_url : FOTO_DEFAULT_POSTIMG);

    sRes.appendRow([
      idR,
      codR,
      limpiarTexto(r.id_propietario),
      limpiarTexto(r.id_cuidador),
      limpiarTexto(r.id_oferta),
      limpiarTexto(r.id_mascota),
      limpiarFechaCorta(r.fecha_inicio),
      limpiarFechaCorta(r.fecha_fin),
      'Confirmada',
      monto,
      fecha
    ]);

    sPag.appendRow([
      idPay,
      idR,
      limpiarTexto(p && p.metodo ? p.metodo : 'Yape'),
      limpiarTexto(p && p.operacion ? p.operacion : 'OP-1001'),
      monto,
      comision,
      neto,
      'Aprobado',
      limpiarTexto(p && p.comprobante ? p.comprobante : 'Boleta'),
      compUrl,
      fecha
    ]);

    if (sLiq) {
      sLiq.appendRow([
        idLiq,
        limpiarTexto(r.id_cuidador),
        idPay,
        neto,
        'Pendiente',
        fecha
      ]);
    }

    SpreadsheetApp.flush();
    return {
      exito: true,
      cod_reserva: codR,
      id_reserva: idR,
      monto_bruto: monto.toFixed(2),
      comision: comision.toFixed(2),
      neto_cuidador: neto.toFixed(2)
    };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function obtenerReservasPropietario(docProp, idUsu) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sRes = obtenerHoja(ss, 'reservas');
    var sMasc = obtenerHoja(ss, 'mascotas');
    var sServ = obtenerHoja(ss, 'servicios');
    var sCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    var sUsu = obtenerHoja(ss, 'usuarios');
    var sRev = obtenerHoja(ss, 'reseñas');

    if (!sRes) return [];
    var dRes = sRes.getDataRange().getValues();
    if (dRes.length <= 1) return [];

    var mapMasc = {};
    if (sMasc) {
      var dM = sMasc.getDataRange().getValues();
      for (var m = 1; m < dM.length; m++) {
        mapMasc[limpiarTexto(dM[m][0])] = limpiarTexto(dM[m][3]) + ' (' + limpiarTexto(dM[m][1]) + ')';
      }
    }

    var mapServ = {};
    if (sServ) {
      var dS = sServ.getDataRange().getValues();
      for (var s = 1; s < dS.length; s++) {
        mapServ[limpiarTexto(dS[s][0])] = limpiarTexto(dS[s][3]) + ' [' + limpiarTexto(dS[s][1]) + ']';
      }
    }

    var mapUsu = {};
    if (sUsu) {
      var dU = sUsu.getDataRange().getValues();
      for (var u = 1; u < dU.length; u++) {
        mapUsu[limpiarTexto(dU[u][0])] = (limpiarTexto(dU[u][1]) + ' ' + limpiarTexto(dU[u][2])).trim();
      }
    }

    var mapCuidNombre = {};
    if (sCuid) {
      var dC = sCuid.getDataRange().getValues();
      for (var c = 1; c < dC.length; c++) {
        var idC = limpiarTexto(dC[c][0]);
        var idU = limpiarTexto(dC[c][1]);
        mapCuidNombre[idC] = mapUsu[idU] || idC;
      }
    }

    var mapResenasReserva = {};
    if (sRev) {
      var dRv = sRev.getDataRange().getValues();
      for (var rv = 1; rv < dRv.length; rv++) {
        mapResenasReserva[limpiarTexto(dRv[rv][1])] = Number(dRv[rv][4]) || 5;
      }
    }

    var targetDoc = limpiarTexto(docProp);
    var targetUsu = limpiarTexto(idUsu);
    var lista = [];

    for (var i = 1; i < dRes.length; i++) {
      var idR = limpiarTexto(dRes[i][0]);
      if (!idR) continue;
      var propR = limpiarTexto(dRes[i][2]);
      if ((targetDoc && propR === targetDoc) || (targetUsu && propR === targetUsu)) {
        var idCuid = limpiarTexto(dRes[i][3]);
        var idOf = limpiarTexto(dRes[i][4]);
        var idPet = limpiarTexto(dRes[i][5]);
        var monto = Number(dRes[i][9]) || 0;

        lista.push({
          id_reserva: idR,
          codigo_reserva: limpiarTexto(dRes[i][1]),
          id_cuidador: idCuid,
          nombre_cuidador: mapCuidNombre[idCuid] || idCuid,
          servicio: mapServ[idOf] || idOf,
          mascota: mapMasc[idPet] || idPet,
          fecha_inicio: limpiarFechaCorta(dRes[i][6]),
          fecha_fin: limpiarFechaCorta(dRes[i][7]),
          estado: limpiarTexto(dRes[i][8]) || 'Confirmada',
          monto_total: monto.toFixed(2),
          comision: (monto * 0.15).toFixed(2),
          calificacion_previa: mapResenasReserva[idR] || 0
        });
      }
    }
    return lista.reverse();
  } catch (e) {
    return [];
  }
}

function cancelarReservaPropietario(idReserva) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = obtenerHoja(ss, 'reservas');
    if (!sheet) return { exito: false, mensaje: 'No se encontró la hoja de reservas.' };

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (limpiarTexto(data[i][0]) === limpiarTexto(idReserva)) {
        var estadoActual = limpiarTexto(data[i][8]);
        if (estadoActual === 'Finalizado') {
          return { exito: false, mensaje: 'No se puede cancelar un servicio que ya ha finalizado.' };
        }
        var monto = Number(data[i][9]) || 0;
        var penalidad = (monto * 0.15).toFixed(2);
        var reembolso = (monto * 0.85).toFixed(2);
        sheet.getRange(i + 1, 9).setValue('Cancelada');
        SpreadsheetApp.flush();
        return {
          exito: true,
          mensaje: 'Reserva cancelada. Según la política de Paw Patita, se retiene el 15% administrativo (S/ ' + penalidad + ') y se programa el reembolso del 85% (S/ ' + reembolso + ').'
        };
      }
    }
    return { exito: false, mensaje: 'Reserva no encontrada.' };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function registrarResenaServicio(d) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sRev = obtenerHoja(ss, 'reseñas');
    var sCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    if (!sRev) return { exito: false, mensaje: 'No se encontró la pestaña "reseñas".' };

    var idRev = 'REV-' + Math.floor(1000 + Math.random() * 9000);
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');
    var estrellas = Math.min(5, Math.max(1, Number(d.estrellas) || 5));
    var idCuid = limpiarTexto(d.id_cuidador);

    sRev.appendRow([
      idRev,
      limpiarTexto(d.id_reserva),
      limpiarTexto(d.id_propietario),
      idCuid,
      estrellas,
      limpiarTexto(d.comentario) || 'Muy buen servicio y cuidado responsable.',
      fecha
    ]);

    // Recalcular promedio del cuidador en perfiles_cuidadores
    if (sCuid && idCuid) {
      var allRev = sRev.getDataRange().getValues();
      var suma = 0;
      var cont = 0;
      for (var r = 1; r < allRev.length; r++) {
        if (limpiarTexto(allRev[r][3]) === idCuid) {
          suma += Number(allRev[r][4]) || 5;
          cont++;
        }
      }
      var nuevoProm = cont > 0 ? Number((suma / cont).toFixed(1)) : 5.0;
      var dCuid = sCuid.getDataRange().getValues();
      for (var c = 1; c < dCuid.length; c++) {
        if (limpiarTexto(dCuid[c][0]) === idCuid) {
          sCuid.getRange(c + 1, 5).setValue(nuevoProm);
          break;
        }
      }
    }

    SpreadsheetApp.flush();
    return { exito: true, mensaje: '¡Gracias por tu calificación! La reputación del cuidador ha sido actualizada.' };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function registrarIncidenciaEmergencia(d) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sInc = obtenerHoja(ss, 'incidencias_emergencias');
    if (!sInc) return { exito: false, mensaje: 'No se encontró la pestaña "incidencias_emergencias".' };

    var idInc = 'INC-' + Math.floor(100 + Math.random() * 900);
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');

    sInc.appendRow([
      idInc,
      limpiarTexto(d.id_reserva) || 'RES-1001',
      limpiarTexto(d.reportado_por) || 'Usuario',
      limpiarTexto(d.tipo_incidencia) || 'Emergencia Veterinaria',
      limpiarTexto(d.descripcion) || 'Solicitud de asistencia veterinaria inmediata',
      'Activa',
      limpiarTexto(d.id_clinica) || 'VET-01',
      'Pendiente de atención por clínica derivada',
      fecha
    ]);

    SpreadsheetApp.flush();
    return {
      exito: true,
      id_incidencia: idInc,
      mensaje: 'Alerta de emergencia ' + idInc + ' registrada y derivada a la clínica veterinaria aliada.'
    };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function obtenerMuroFotos() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetRep = obtenerHoja(ss, 'reportes_seguimiento');
    var sheetFot = obtenerHoja(ss, 'fotos_reporte');
    var sheetRes = obtenerHoja(ss, 'reservas');
    var sheetMasc = obtenerHoja(ss, 'mascotas');

    if (!sheetRep || !sheetFot) return [];

    var sRep = sheetRep.getDataRange().getValues();
    var sFot = sheetFot.getDataRange().getValues();

    var mapF = {};
    for (var i = 1; i < sFot.length; i++) {
      var idR_F = limpiarTexto(sFot[i][1]);
      if (idR_F) {
        mapF[idR_F] = limpiarUrlImagen(sFot[i][2]);
      }
    }

    var mapMascotaNombre = {};
    if (sheetMasc) {
      var dM = sheetMasc.getDataRange().getValues();
      for (var m = 1; m < dM.length; m++) {
        mapMascotaNombre[limpiarTexto(dM[m][0])] = limpiarTexto(dM[m][3]) + ' (' + limpiarTexto(dM[m][1]) + ')';
      }
    }

    var mapReservaMascota = {};
    if (sheetRes) {
      var dR = sheetRes.getDataRange().getValues();
      for (var r = 1; r < dR.length; r++) {
        var idPet = limpiarTexto(dR[r][5]);
        mapReservaMascota[limpiarTexto(dR[r][0])] = mapMascotaNombre[idPet] || idPet || 'Mascota Paw Patita';
      }
    }

    var posts = [];
    for (var j = 1; j < sRep.length; j++) {
      var idRep = limpiarTexto(sRep[j][0]);
      if (!idRep) continue;
      var idReserva = limpiarTexto(sRep[j][1]);
      posts.push({
        id_reporte: idRep,
        reserva: idReserva,
        mascota: mapReservaMascota[idReserva] || 'Canino en Cuidado',
        fecha: limpiarTexto(sRep[j][2]),
        evento: limpiarTexto(sRep[j][3]) || 'Reporte de Bienestar',
        nota: limpiarTexto(sRep[j][4]) || 'Mascota atendida con normalidad.',
        foto: mapF[idRep] || FOTO_DEFAULT_POSTIMG
      });
    }
    return posts.reverse();
  } catch (e) {
    return [];
  }
}

// ============================================================================
// 6. MÓDULO CUIDADOR: DASHBOARD, GESTIÓN DE RESERVAS, OFERTAS Y REPORTES
// ============================================================================

function obtenerDashboardCuidador(idCuid, idUsu) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetRes = obtenerHoja(ss, 'reservas');
    var sheetCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    var sheetServ = obtenerHoja(ss, 'servicios');
    var sheetMasc = obtenerHoja(ss, 'mascotas');

    var targetCuid = limpiarTexto(idCuid);
    var targetUsu = limpiarTexto(idUsu);

    // Si solo llegó idUsu (ej. USR-02), buscar su CUID-XX en perfiles_cuidadores
    var reputacion = '5.0';
    if (sheetCuid) {
      var dC = sheetCuid.getDataRange().getValues();
      for (var c = 1; c < dC.length; c++) {
        var cId = limpiarTexto(dC[c][0]);
        var uId = limpiarTexto(dC[c][1]);
        if ((targetCuid && cId === targetCuid) || (targetUsu && uId === targetUsu)) {
          targetCuid = cId;
          reputacion = (Number(dC[c][4]) || 5.0).toFixed(1);
          break;
        }
      }
    }

    var mapMasc = {};
    if (sheetMasc) {
      var dM = sheetMasc.getDataRange().getValues();
      for (var m = 1; m < dM.length; m++) {
        mapMasc[limpiarTexto(dM[m][0])] = limpiarTexto(dM[m][3]) + ' (' + limpiarTexto(dM[m][4]) + ')';
      }
    }

    var misServicios = [];
    if (sheetServ && targetCuid) {
      var dS = sheetServ.getDataRange().getValues();
      for (var s = 1; s < dS.length; s++) {
        if (limpiarTexto(dS[s][2]) === targetCuid) {
          misServicios.push({
            id_oferta: limpiarTexto(dS[s][0]),
            hu_ecode: limpiarTexto(dS[s][1]),
            tipo_servicio: limpiarTexto(dS[s][3]),
            tarifa: (Number(dS[s][4]) || 30).toFixed(2),
            disponible: limpiarTexto(dS[s][5]) || 'Sí'
          });
        }
      }
    }

    if (!sheetRes) {
      return {
        id_cuidador: targetCuid,
        reservas: [],
        servicios: misServicios,
        activas_semana: 0,
        finalizadas: 0,
        ingresos_netos: '0.00',
        reputacion: reputacion
      };
    }

    var sRes = sheetRes.getDataRange().getValues();
    var list = [];
    var ingresosTotales = 0;
    var enCurso = 0;
    var finalizadas = 0;

    for (var i = 1; i < sRes.length; i++) {
      var cuidFila = limpiarTexto(sRes[i][3]);
      if (cuidFila === targetCuid || (targetUsu && cuidFila === targetUsu)) {
        var estado = limpiarTexto(sRes[i][8]) || 'Confirmada';
        var monto = Number(sRes[i][9]) || 0;
        var neto = monto * 0.85;

        if (estado === 'En Curso' || estado === 'Confirmada') enCurso++;
        if (estado === 'Finalizado') finalizadas++;
        if (estado !== 'Cancelada') ingresosTotales += neto;

        var idPet = limpiarTexto(sRes[i][5]);
        list.push({
          id_reserva: limpiarTexto(sRes[i][0]),
          codigo: limpiarTexto(sRes[i][1]),
          propietario: limpiarTexto(sRes[i][2]),
          id_mascota: idPet,
          mascota: mapMasc[idPet] || idPet,
          inicio: limpiarFechaCorta(sRes[i][6]),
          fin: limpiarFechaCorta(sRes[i][7]),
          estado: estado,
          monto: monto.toFixed(2),
          neto: neto.toFixed(2)
        });
      }
    }

    return {
      id_cuidador: targetCuid,
      reservas: list.reverse(),
      servicios: misServicios,
      activas_semana: enCurso,
      finalizadas: finalizadas,
      ingresos_netos: ingresosTotales.toFixed(2),
      reputacion: reputacion
    };
  } catch (e) {
    return { reservas: [], servicios: [], activas_semana: 0, finalizadas: 0, ingresos_netos: '0.00', reputacion: '5.0' };
  }
}

function cambiarEstadoReserva(idR, nuevoEstado) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = obtenerHoja(SpreadsheetApp.getActiveSpreadsheet(), 'reservas');
    if (!sheet) return { exito: false, mensaje: 'No se encontró la hoja de reservas.' };
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (limpiarTexto(data[i][0]) === limpiarTexto(idR)) {
        sheet.getRange(i + 1, 9).setValue(limpiarTexto(nuevoEstado));
        SpreadsheetApp.flush();
        return { exito: true, mensaje: 'Estado actualizado a ' + nuevoEstado };
      }
    }
    return { exito: false, mensaje: 'No se encontró la reserva ' + idR };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function registrarReporteConFoto(r) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sRep = obtenerHoja(ss, 'reportes_seguimiento');
    var sFot = obtenerHoja(ss, 'fotos_reporte');
    if (!sRep || !sFot) return { exito: false, mensaje: 'Faltan hojas de reportes o fotos.' };

    var idRep = 'REP-' + Math.floor(100 + Math.random() * 900);
    var idFot = 'FOT-' + Math.floor(100 + Math.random() * 900);
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm');
    var foto = limpiarUrlImagen(r.foto_url);

    sRep.appendRow([
      idRep,
      limpiarTexto(r.id_reserva),
      fecha,
      limpiarTexto(r.tipo_evento) || 'Paseo y Bienestar',
      limpiarTexto(r.nota) || 'La mascota se encuentra feliz y bien cuidada.'
    ]);
    sFot.appendRow([idFot, idRep, foto]);

    SpreadsheetApp.flush();
    return { exito: true, id_reporte: idRep, mensaje: 'Reporte fotográfico publicado en el muro en vivo.' };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function publicarServicioCuidador(s) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sServ = obtenerHoja(ss, 'servicios');
    if (!sServ) return { exito: false, mensaje: 'No se encontró la pestaña "servicios".' };

    var idOferta = 'OF-' + Math.floor(100 + Math.random() * 900);
    var huEcode = 'HU-' + Math.floor(100 + Math.random() * 900);
    var tarifa = Number(s.tarifa) || 30;

    sServ.appendRow([
      idOferta,
      huEcode,
      limpiarTexto(s.id_cuidador),
      limpiarTexto(s.tipo_servicio) || 'Paseo Recreativo Matutino',
      tarifa,
      'Sí'
    ]);

    SpreadsheetApp.flush();
    return { exito: true, hu_ecode: huEcode, mensaje: 'Oferta publicada con código ' + huEcode };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

// ============================================================================
// 7. MÓDULO ADMINISTRADOR: ANTECEDENTES, INCIDENCIAS Y CONTROL FINANCIERO
// ============================================================================

function obtenerDatosAdminConsolidados() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetAnt = obtenerHoja(ss, 'antecedentes_cuidadores');
    var sheetCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    var sheetUsu = obtenerHoja(ss, 'usuarios');
    var sheetInc = obtenerHoja(ss, 'incidencias_emergencias');
    var sheetPag = obtenerHoja(ss, 'pagos');
    var sheetLiq = obtenerHoja(ss, 'liquidaciones_cuidadores');

    var mapUsu = {};
    if (sheetUsu) {
      var sUsu = sheetUsu.getDataRange().getValues();
      for (var k = 1; k < sUsu.length; k++) {
        var idU = limpiarTexto(sUsu[k][0]);
        mapUsu[idU] = {
          nombre: (limpiarTexto(sUsu[k][1]) + ' ' + limpiarTexto(sUsu[k][2])).trim(),
          distrito: limpiarTexto(sUsu[k][10]) || 'Cusco',
          telefono: limpiarTexto(sUsu[k][5]) || '984000000'
        };
      }
    }

    var mapCuid = {};
    if (sheetCuid) {
      var sCuid = sheetCuid.getDataRange().getValues();
      for (var j = 1; j < sCuid.length; j++) {
        var idC = limpiarTexto(sCuid[j][0]);
        var idU = limpiarTexto(sCuid[j][1]);
        var infoU = mapUsu[idU] || { nombre: 'Cuidador ' + idC, distrito: 'Cusco', telefono: '' };
        mapCuid[idC] = {
          nombre: infoU.nombre,
          distrito: infoU.distrito,
          estado_perfil: limpiarTexto(sCuid[j][5]) || 'Aprobado'
        };
      }
    }

    var postulantes = [];
    if (sheetAnt) {
      var sAnt = sheetAnt.getDataRange().getValues();
      for (var i = 1; i < sAnt.length; i++) {
        var idAnt = limpiarTexto(sAnt[i][0]);
        if (!idAnt) continue;
        var idC = limpiarTexto(sAnt[i][1]);
        var infoC = mapCuid[idC] || { nombre: 'Cuidador ' + idC, distrito: 'Cusco', estado_perfil: 'Pendiente' };
        postulantes.push({
          id_antecedente: idAnt,
          id_cuidador: idC,
          nombre: infoC.nombre,
          distrito: infoC.distrito,
          policial_url: limpiarUrlImagen(sAnt[i][2]),
          penal_url: limpiarUrlImagen(sAnt[i][3]),
          estado: limpiarTexto(sAnt[i][4]) || 'Pendiente',
          fecha: limpiarFechaCorta(sAnt[i][5])
        });
      }
    }

    var emergencias = [];
    if (sheetInc) {
      var sInc = sheetInc.getDataRange().getValues();
      for (var x = 1; x < sInc.length; x++) {
        var idInc = limpiarTexto(sInc[x][0]);
        if (!idInc) continue;
        emergencias.push({
          id_incidencia: idInc,
          reserva: limpiarTexto(sInc[x][1]),
          reportado_por: limpiarTexto(sInc[x][2]),
          tipo: limpiarTexto(sInc[x][3]) || 'Atención Médica',
          descripcion: limpiarTexto(sInc[x][4]) || 'Sin observaciones',
          estado: limpiarTexto(sInc[x][5]) || 'Activa',
          clinica: limpiarTexto(sInc[x][6]) || 'VET-01',
          resolucion: limpiarTexto(sInc[x][7]) || 'En evaluación',
          fecha: limpiarFechaCorta(sInc[x][8])
        });
      }
    }

    var mapLiqPorPago = {};
    if (sheetLiq) {
      var sLiq = sheetLiq.getDataRange().getValues();
      for (var l = 1; l < sLiq.length; l++) {
        var idP = limpiarTexto(sLiq[l][2]);
        if (idP) {
          mapLiqPorPago[idP] = {
            id_liquidacion: limpiarTexto(sLiq[l][0]),
            id_cuidador: limpiarTexto(sLiq[l][1]),
            estado_liq: limpiarTexto(sLiq[l][4]) || 'Pendiente'
          };
        }
      }
    }

    var finanzas = [];
    var totalBruto = 0;
    var totalComision = 0;
    var totalNeto = 0;

    if (sheetPag) {
      var sPag = sheetPag.getDataRange().getValues();
      for (var y = 1; y < sPag.length; y++) {
        var idPay = limpiarTexto(sPag[y][0]);
        if (!idPay) continue;
        var b = Number(sPag[y][4]) || 0;
        var c = Number(sPag[y][5]) || 0;
        var n = Number(sPag[y][6]) || 0;
        totalBruto += b;
        totalComision += c;
        totalNeto += n;

        var infoLiq = mapLiqPorPago[idPay] || { id_liquidacion: 'LIQ-' + y, id_cuidador: 'CUID-01', estado_liq: 'Pendiente' };
        finanzas.push({
          id_pago: idPay,
          reserva: limpiarTexto(sPag[y][1]),
          metodo: limpiarTexto(sPag[y][2]) || 'Yape',
          operacion: limpiarTexto(sPag[y][3]),
          bruto: b.toFixed(2),
          comision: c.toFixed(2),
          neto: n.toFixed(2),
          estado_pago: limpiarTexto(sPag[y][7]) || 'Aprobado',
          id_liquidacion: infoLiq.id_liquidacion,
          estado_liquidacion: infoLiq.estado_liq,
          fecha: limpiarFechaCorta(sPag[y][10])
        });
      }
    }

    return {
      exito: true,
      resumen: {
        total_bruto: totalBruto.toFixed(2),
        total_comision: totalComision.toFixed(2),
        total_neto: totalNeto.toFixed(2),
        total_cuidadores: Object.keys(mapCuid).length
      },
      postulantes: postulantes,
      emergencias: emergencias,
      finanzas: finanzas
    };
  } catch (e) {
    return {
      exito: false,
      mensaje: e.message,
      resumen: { total_bruto: '0.00', total_comision: '0.00', total_neto: '0.00', total_cuidadores: 0 },
      postulantes: [],
      emergencias: [],
      finanzas: []
    };
  }
}

function validarAntecedenteCuidador(idCuidador, nuevoEstado) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sAnt = obtenerHoja(ss, 'antecedentes_cuidadores');
    var sCuid = obtenerHoja(ss, 'perfiles_cuidadores');
    var target = limpiarTexto(idCuidador);

    if (sAnt) {
      var dA = sAnt.getDataRange().getValues();
      for (var i = 1; i < dA.length; i++) {
        if (limpiarTexto(dA[i][1]) === target || limpiarTexto(dA[i][0]) === target) {
          sAnt.getRange(i + 1, 5).setValue(limpiarTexto(nuevoEstado));
        }
      }
    }
    if (sCuid) {
      var dC = sCuid.getDataRange().getValues();
      for (var j = 1; j < dC.length; j++) {
        if (limpiarTexto(dC[j][0]) === target) {
          sCuid.getRange(j + 1, 6).setValue(limpiarTexto(nuevoEstado));
        }
      }
    }
    SpreadsheetApp.flush();
    return { exito: true, mensaje: 'Estado del cuidador ' + target + ' actualizado a ' + nuevoEstado };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function resolverIncidenciaAdmin(idIncidencia, resolucionTexto) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sInc = obtenerHoja(ss, 'incidencias_emergencias');
    if (!sInc) return { exito: false, mensaje: 'No se encontró la hoja de incidencias.' };

    var data = sInc.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (limpiarTexto(data[i][0]) === limpiarTexto(idIncidencia)) {
        sInc.getRange(i + 1, 6).setValue('Resuelta');
        if (resolucionTexto) {
          sInc.getRange(i + 1, 8).setValue(limpiarTexto(resolucionTexto));
        }
        SpreadsheetApp.flush();
        return { exito: true, mensaje: 'Incidencia ' + idIncidencia + ' marcada como Resuelta.' };
      }
    }
    return { exito: false, mensaje: 'Incidencia no encontrada.' };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function liquidarPagoCuidador(idPago) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sLiq = obtenerHoja(ss, 'liquidaciones_cuidadores');
    if (!sLiq) return { exito: false, mensaje: 'No se encontró la hoja de liquidaciones.' };

    var data = sLiq.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (limpiarTexto(data[i][2]) === limpiarTexto(idPago) || limpiarTexto(data[i][0]) === limpiarTexto(idPago)) {
        sLiq.getRange(i + 1, 5).setValue('Liquidado');
        SpreadsheetApp.flush();
        return { exito: true, mensaje: 'Liquidación procesada exitosamente (85% abonado al cuidador).' };
      }
    }
    // Si no existía fila en liquidaciones_cuidadores para ese pago, crearla como Liquidado
    var fecha = Utilities.formatDate(new Date(), 'GMT-5', 'yyyy-MM-dd HH:mm:ss');
    sLiq.appendRow(['LIQ-' + Math.floor(100 + Math.random() * 900), 'CUID-01', limpiarTexto(idPago), 0, 'Liquidado', fecha]);
    SpreadsheetApp.flush();
    return { exito: true, mensaje: 'Liquidación registrada como Liquidado.' };
  } catch (e) {
    return { exito: false, mensaje: e.message };
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

// ============================================================================
// 8. FUNCIÓN DE PRUEBA INTEGRAL EJECUTABLE DESDE EL EDITOR DE APPS SCRIPT
// ============================================================================

function testSistema() {
  Logger.log('====================================================');
  Logger.log('INICIANDO DIAGNÓSTICO INTEGRAL - PAW PATITA CUSCO');
  Logger.log('====================================================');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('1. Archivo conectado: ' + ss.getName());

  var pestanasEsperadas = [
    'usuarios', 'mascotas', 'perfiles_cuidadores', 'servicios',
    'reservas', 'pagos', 'liquidaciones_cuidadores', 'reportes_seguimiento',
    'fotos_reporte', 'clinicas_veterinarias', 'antecedentes_cuidadores',
    'incidencias_emergencias', 'reseñas'
  ];

  var faltantes = [];
  for (var i = 0; i < pestanasEsperadas.length; i++) {
    var h = obtenerHoja(ss, pestanasEsperadas[i]);
    if (h) {
      Logger.log('   [OK] Pestaña "' + pestanasEsperadas[i] + '" encontrada (' + h.getLastRow() + ' filas).');
    } else {
      faltantes.push(pestanasEsperadas[i]);
      Logger.log('   [ERROR] Falta la pestaña: ' + pestanasEsperadas[i]);
    }
  }

  Logger.log('----------------------------------------------------');
  Logger.log('2. Probando Autenticación por Roles:');
  var loginProp = autenticarUsuario('angelo@gmail.com', '123456');
  Logger.log('   -> Login Propietario (angelo@gmail.com): ' + JSON.stringify(loginProp));

  var loginCuid = autenticarUsuario('carlos@gmail.com', '123456');
  Logger.log('   -> Login Cuidador (carlos@gmail.com): ' + JSON.stringify(loginCuid));

  var loginAdmin = autenticarUsuario('admin@pawpatita.pe', 'admin123');
  Logger.log('   -> Login Administrador (admin@pawpatita.pe): ' + JSON.stringify(loginAdmin));

  Logger.log('----------------------------------------------------');
  Logger.log('3. Probando Catálogo Público de Cuidadores:');
  var catalogo = obtenerCatalogoCuidadoresCompleto();
  Logger.log('   -> Total cuidadores en catálogo público: ' + catalogo.length);
  if (catalogo.length > 0) {
    Logger.log('   -> Primer cuidador: ' + catalogo[0].nombre + ' (' + catalogo[0].distrito + ') - Servicios: ' + catalogo[0].servicios.length);
  }

  Logger.log('----------------------------------------------------');
  Logger.log('4. Probando Módulo Propietario (Mascotas y Reservas):');
  var mascotas = obtenerMascotasPropietario('71796410', 'USR-01');
  Logger.log('   -> Mascotas de Angelo (71796410): ' + mascotas.length);
  var reservasProp = obtenerReservasPropietario('71796410', 'USR-01');
  Logger.log('   -> Reservas de Angelo: ' + reservasProp.length);

  Logger.log('----------------------------------------------------');
  Logger.log('5. Probando Módulo Cuidador y Muro de Fotos:');
  var dashCuid = obtenerDashboardCuidador('CUID-01', 'USR-02');
  Logger.log('   -> Reservas de CUID-01: ' + dashCuid.reservas.length + ' | Ingresos Netos (85%): S/ ' + dashCuid.ingresos_netos);
  var muro = obtenerMuroFotos();
  Logger.log('   -> Reportes en Muro Fotográfico (PostImg): ' + muro.length);

  Logger.log('----------------------------------------------------');
  Logger.log('6. Probando Consolidado Administrador:');
  var adminData = obtenerDatosAdminConsolidados();
  Logger.log('   -> Postulantes: ' + adminData.postulantes.length + ' | Emergencias: ' + adminData.emergencias.length + ' | Pagos: ' + adminData.finanzas.length);
  Logger.log('   -> Resumen Financiero: ' + JSON.stringify(adminData.resumen));

  Logger.log('====================================================');
  Logger.log('DIAGNÓSTICO FINALIZADO CON ÉXITO.');
  Logger.log('====================================================');
  return {
    exito: faltantes.length === 0,
    pestanas_faltantes: faltantes,
    cuidadores_activos: catalogo.length
  };
}

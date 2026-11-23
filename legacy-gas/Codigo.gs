/**
 * ============================================================================
 * PAW PATITA CUSCO v4.0 - BACKEND GOOGLE APPS SCRIPT (Codigo.gs)
 * Arquitectura en capas sobre Google Sheets (22 pestañas, 3FN):
 *   1. Utilidades + 2. Repositorio (mapeo dinámico por encabezados)
 *   3. Sesión/RBAC + 4. Auditoría y notificaciones
 *   5. Motores de negocio (agenda, tarifas, cupones, cancelaciones)
 *   6. API pública / Propietario / Cuidador / Veterinaria / Administrador
 *   7. Pruebas: testSistemaCompleto() y testFlujoCompletoConEscritura()
 * Compatible con HtmlService y con el motor Rhino/V8 (JavaScript ES5 estándar).
 * ============================================================================
 */

var TZ = 'America/Lima';
var COMISION = 0.15;
var TIPO_CAMBIO = 3.75;
var SALT = 'PAW::';
var SESION_TTL = 21600;
var HORA_INICIO_SERVICIO = 8;
var EXTRA_BANO = 25;
var FOTO_DEFAULT_POSTIMG = 'https://i.postimg.cc/HxXrCmbp/images.jpg';
var DIAS_SEM = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
var DIAS_LABORABLES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
var ESTADOS_OCUPAN = ['Pendiente Confirmación', 'Confirmada', 'En Curso'];
var CATEGORIAS = ['Paseo', 'Hospedaje', 'Guardería', 'Domicilio Turístico'];
var TRANSICIONES = {
  'Pendiente Confirmación': ['Confirmada', 'Cancelada'],
  'Confirmada': ['En Curso', 'Cancelada'],
  'En Curso': ['Finalizada', 'En Disputa'],
  'Finalizada': ['En Disputa'],
  'En Disputa': ['Finalizada', 'Cancelada'],
  'Cancelada': []
};

// Pestañas y columnas mínimas que el backend necesita (validadas por testSistemaCompleto)
var ESQUEMA_REQUERIDO = {
  'usuarios': ['id_usuario', 'email', 'password_hash', 'tipo_usuario', 'subtipo_propietario', 'num_documento', 'estado_cuenta', 'id_clinica_asociada'],
  'mascotas': ['id_mascota', 'paw_patita_id', 'id_propietario', 'estado_validacion_vet', 'foto_url'],
  'perfiles_cuidadores': ['id_cuidador', 'id_usuario', 'capacidad_max_mascotas', 'estado_postulacion', 'disponibilidad_semanal'],
  'servicios': ['id_oferta', 'hu_ecode', 'id_cuidador', 'categoria', 'tarifa_diaria_por_perro', 'disponible'],
  'reservas': ['id_reserva', 'id_propietario', 'id_cuidador', 'id_oferta', 'id_mascota', 'fecha_inicio', 'fecha_fin', 'monto_total', 'estado_reserva'],
  'pagos': ['id_pago', 'id_reserva', 'monto_bruto', 'comision_plataforma', 'monto_neto_cuidador', 'monto_reembolsado', 'estado_pago'],
  'liquidaciones_cuidadores': ['id_liquidacion', 'id_cuidador', 'id_pago', 'id_reserva', 'monto_liquidado', 'estado_liquidacion'],
  'reportes_seguimiento': ['id_reporte', 'id_reserva', 'id_cuidador', 'nota_estado'],
  'fotos_reporte': ['id_foto', 'id_reporte', 'foto_url'],
  'clinicas_veterinarias': ['id_clinica', 'nombre', 'estado_afiliacion', 'activa'],
  'antecedentes_cuidadores': ['id_antecedente', 'id_cuidador', 'estado_verificacion'],
  'incidencias_emergencias': ['id_incidencia', 'id_reserva', 'id_mascota', 'estado_alerta', 'id_clinica_derivada'],
  'reseñas': ['id_resena', 'id_reserva', 'id_cuidador', 'calificacion_estrellas'],
  'disponibilidad_cuidadores': ['id_disp', 'id_cuidador', 'fecha', 'estado_dia', 'cupo_maximo_dia', 'cupos_reservados'],
  'validaciones_veterinarias': ['id_validacion', 'id_mascota', 'id_clinica', 'resultado'],
  'cancelaciones_reembolsos': ['id_cancelacion', 'id_reserva', 'id_pago', 'tipo_caso', 'estado_tramite'],
  'cupones_promocionales': ['id_cupon', 'codigo', 'tipo_descuento', 'valor_descuento', 'segmento_objetivo', 'activo'],
  'temporadas_tarifas': ['id_temporada', 'fecha_inicio', 'fecha_fin', 'factor_multiplicador', 'activa'],
  'terminos_condiciones': ['id_tyc', 'version', 'alcance', 'estado'],
  'aceptaciones_tyc': ['id_aceptacion', 'id_usuario', 'id_tyc', 'contexto'],
  'auditoria_estados': ['id_auditoria', 'entidad', 'id_registro', 'estado_nuevo', 'fecha_hora'],
  'notificaciones': ['id_notificacion', 'id_usuario_destino', 'tipo', 'leida']
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Paw Patita Cusco | Cuidado Canino Seguro y Responsable')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================================
// 1. UTILIDADES
// ============================================================================

function normalizarClave(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .trim().toLowerCase()
    .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9_]/g, '_');
}

function limpiar(val) {
  if (val === null || val === undefined) { return ''; }
  if (val instanceof Date) {
    var s = Utilities.formatDate(val, TZ, 'yyyy-MM-dd HH:mm:ss');
    return s.substring(11) === '00:00:00' ? s.substring(0, 10) : s;
  }
  if (typeof val === 'number') { return val; }
  if (typeof val === 'boolean') { return val ? 'Sí' : 'No'; }
  return String(val).trim();
}

function num(v, def) {
  var n = parseFloat(String(v).replace(',', '.'));
  if (isNaN(n)) { return (def === undefined) ? 0 : def; }
  return n;
}

function redondear(x) { return Math.round((x + 1e-9) * 100) / 100; }
function ahoraStr() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function hoyStr() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function fechaCorta(v) { var s = String(limpiar(v)); return s.length >= 10 ? s.substring(0, 10) : s; }
function mdDe(s) { s = String(limpiar(s)); return s.length >= 10 ? s.substring(5, 10) : s.substring(0, 5); }

function hashPassword(clave) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + String(clave), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i]; if (b < 0) { b += 256; }
    var h = b.toString(16); if (h.length < 2) { h = '0' + h; }
    hex += h;
  }
  return hex;
}

function esFechaValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) { return false; }
  var p = String(s).split('-');
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return d.getUTCFullYear() === Number(p[0]) && d.getUTCMonth() === Number(p[1]) - 1 && d.getUTCDate() === Number(p[2]);
}
function utcDia(s) { var p = String(s).split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function diffDias(a, b) { return Math.round((utcDia(b) - utcDia(a)) / 86400000); }
function sumarDias(s, n) {
  var d = new Date(utcDia(s) + n * 86400000);
  var m = String(d.getUTCMonth() + 1); if (m.length < 2) { m = '0' + m; }
  var dd = String(d.getUTCDate()); if (dd.length < 2) { dd = '0' + dd; }
  return d.getUTCFullYear() + '-' + m + '-' + dd;
}
function diaSemana(s) { return DIAS_SEM[new Date(utcDia(s)).getUTCDay()]; }
function inicioServicioMs(fechaIni) { var p = String(fechaIni).split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), HORA_INICIO_SERVICIO + 5, 0, 0); }
function msDeFechaHora(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s));
  if (!m) { return 0; }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) + 5, Number(m[5]), Number(m[6] || 0));
}
function mesActual() { return hoyStr().substring(0, 7); }
function esUrl(s) { return /^https?:\/\/[^\s]+$/i.test(String(s || '')); }
function urlImagen(u) {
  var s = String(limpiar(u));
  if (s.indexOf('](') !== -1) { var m = s.match(/\((https?:\/\/[^\s\)]+)\)/); if (m && m[1]) { s = m[1]; } }
  return esUrl(s) ? s : FOTO_DEFAULT_POSTIMG;
}
function nombreDe(u) { return u ? (String(u.nombre || '') + ' ' + String(u.apellido || '')).replace(/^\s+|\s+$/g, '') : ''; }
function unico(arr) { var o = {}, r = []; for (var i = 0; i < arr.length; i++) { if (!o[arr[i]]) { o[arr[i]] = true; r.push(arr[i]); } } return r; }
function listaCsv(s) { var p = String(s || '').split(','), r = []; for (var i = 0; i < p.length; i++) { var t = p[i].replace(/^\s+|\s+$/g, ''); if (t) { r.push(t); } } return r; }

function fallar(msg, codigo) { var e = new Error(msg); e.esNegocio = true; e.codigo = codigo || ''; throw e; }
function exigir(cond, msg) { if (!cond) { fallar(msg); } }

// ============================================================================
// 2. REPOSITORIO (mapeo dinámico por encabezados, sin índices numéricos fijos)
// ============================================================================

var _memo = {};

function obtenerHoja(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(nombre);
  if (h) { return h; }
  var buscado = normalizarClave(nombre);
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) { if (normalizarClave(hojas[i].getName()) === buscado) { return hojas[i]; } }
  return null;
}

function leerTabla(nombre) {
  if (_memo[nombre]) { return _memo[nombre]; }
  var hoja = obtenerHoja(nombre);
  if (!hoja) { throw new Error('No existe la pestaña "' + nombre + '" en el libro.'); }
  var vals = hoja.getDataRange().getValues();
  var keys = [];
  var enc = vals.length > 0 ? vals[0] : [];
  for (var j = 0; j < enc.length; j++) { keys.push(normalizarClave(enc[j])); }
  var rows = [];
  for (var i = 1; i < vals.length; i++) {
    var o = { _fila: i + 1 }, vacia = true;
    for (var k = 0; k < keys.length; k++) {
      var v = limpiar(vals[i][k]);
      o[keys[k]] = v;
      if (v !== '') { vacia = false; }
    }
    if (!vacia) { rows.push(o); }
  }
  var t = { nombre: nombre, hoja: hoja, keys: keys, rows: rows };
  _memo[nombre] = t;
  return t;
}

function formatoCelda(v) {
  if (typeof v === 'string' && v !== '' && (/^[\d\-:\.\s\/]+$/.test(v) || /^[=+\-@]/.test(v))) { return '@'; }
  return 'General';
}

function insertarFila(nombre, obj) {
  var t = leerTabla(nombre);
  var fila = [], fmts = [];
  for (var j = 0; j < t.keys.length; j++) {
    var k = t.keys[j];
    var v = obj.hasOwnProperty(k) ? obj[k] : '';
    if (v === null || v === undefined) { v = ''; }
    fila.push(v); fmts.push(formatoCelda(v));
  }
  for (var kk in obj) {
    if (obj.hasOwnProperty(kk) && t.keys.indexOf(kk) === -1) { Logger.log('ADVERTENCIA: columna inexistente ' + nombre + '.' + kk); }
  }
  var n = t.hoja.getLastRow() + 1;
  var rango = t.hoja.getRange(n, 1, 1, fila.length);
  rango.setNumberFormats([fmts]);
  rango.setValues([fila]);
  delete _memo[nombre];
  return n;
}

function actualizarFila(nombre, fila, patch) {
  var t = leerTabla(nombre);
  for (var k in patch) {
    if (!patch.hasOwnProperty(k)) { continue; }
    var col = t.keys.indexOf(k) + 1;
    if (col < 1) { Logger.log('ADVERTENCIA: columna inexistente ' + nombre + '.' + k); continue; }
    var v = patch[k]; if (v === null || v === undefined) { v = ''; }
    var c = t.hoja.getRange(fila, col);
    c.setNumberFormat(formatoCelda(v));
    c.setValue(v);
  }
  delete _memo[nombre];
}

function actualizarPor(nombre, colId, valId, patch) {
  var r = buscarPor(nombre, colId, valId);
  if (!r) { throw new Error('No se encontró ' + nombre + '.' + colId + '=' + valId); }
  actualizarFila(nombre, r._fila, patch);
  return r;
}

function buscarPor(nombre, col, valor) {
  var rows = leerTabla(nombre).rows;
  var v = String(valor);
  for (var i = 0; i < rows.length; i++) { if (String(rows[i][col]) === v) { return rows[i]; } }
  return null;
}
function filtrar(nombre, fn) {
  var rows = leerTabla(nombre).rows, out = [];
  for (var i = 0; i < rows.length; i++) { if (fn(rows[i])) { out.push(rows[i]); } }
  return out;
}
function filtrarPor(nombre, col, valor) { var v = String(valor); return filtrar(nombre, function (r) { return String(r[col]) === v; }); }
function mapaPor(nombre, col) {
  var rows = leerTabla(nombre).rows, m = {};
  for (var i = 0; i < rows.length; i++) { m[String(rows[i][col])] = rows[i]; }
  return m;
}

function borrarFilas(nombre, predicado) {
  var t = leerTabla(nombre), borradas = 0;
  for (var i = t.rows.length - 1; i >= 0; i--) {
    if (predicado(t.rows[i])) { t.hoja.deleteRow(t.rows[i]._fila); borradas++; }
  }
  delete _memo[nombre];
  return borradas;
}

function siguienteId(prefijo, nombre, colId, pad) {
  var rows = leerTabla(nombre).rows, max = 0;
  for (var i = 0; i < rows.length; i++) {
    var id = String(rows[i][colId] || '');
    if (id.indexOf(prefijo) === 0) { var n = parseInt(id.substring(prefijo.length), 10); if (!isNaN(n) && n > max) { max = n; } }
  }
  var s = String(max + 1);
  while (s.length < pad) { s = '0' + s; }
  return prefijo + s;
}

function codigoAleatorioUnico(prefijo, nombre, col, digitos) {
  var rows = leerTabla(nombre).rows, usados = {};
  for (var i = 0; i < rows.length; i++) { usados[String(rows[i][col])] = true; }
  for (var intento = 0; intento < 60; intento++) {
    var n = Math.floor(Math.pow(10, digitos - 1) + Math.random() * 9 * Math.pow(10, digitos - 1));
    var c = prefijo + n;
    if (!usados[c]) { return c; }
  }
  return siguienteId(prefijo, nombre, col, digitos);
}

function cacheGet(k) { try { var v = CacheService.getScriptCache().get('C_' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function cachePut(k, v, ttl) { try { var s = JSON.stringify(v); if (s.length < 90000) { CacheService.getScriptCache().put('C_' + k, s, ttl); } } catch (e) { } }
function invalidarCache() { try { CacheService.getScriptCache().removeAll(['C_catalogo', 'C_info']); } catch (e) { } }

/** Ejecuta una operación de escritura con LockService, recarga limpia y respuesta uniforme. */
function escribir(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) {
    return { exito: false, mensaje: 'El sistema está procesando otras solicitudes. Intenta nuevamente en unos segundos.' };
  }
  try {
    _memo = {};
    var r = fn();
    invalidarCache();
    SpreadsheetApp.flush();
    return r;
  } catch (err) {
    return respuestaError(err);
  } finally {
    try { lock.releaseLock(); } catch (e2) { }
  }
}
function lectura(fn) {
  try { _memo = {}; return fn(); } catch (err) { return respuestaError(err); }
}
function respuestaError(err) {
  var msg = err && err.message ? err.message : String(err);
  if (!(err && err.esNegocio)) { Logger.log('ERROR: ' + (err && err.stack ? err.stack : msg)); msg = 'Ocurrió un error inesperado: ' + msg; }
  return { exito: false, mensaje: msg, sesion_expirada: msg === 'SESION_EXPIRADA' };
}

// ============================================================================
// 3. SESIÓN Y RBAC (SHA-256 + token en CacheService)
// ============================================================================

function perfilUsuario(u) {
  var p = {
    id_usuario: u.id_usuario, nombre: u.nombre, apellido: u.apellido, nombre_completo: nombreDe(u), email: u.email,
    telefono: String(u.telefono), rol: u.tipo_usuario, tipo: u.tipo_usuario, subtipo: u.subtipo_propietario, pais: u.pais_origen,
    idioma: u.idioma_preferido || 'ES', distrito: u.distrito_cusco, direccion: u.direccion, hotel: u.hospedaje_hotel_cusco,
    contacto_nombre: u.contacto_emergencia_nombre, contacto_tel: String(u.contacto_emergencia_tel), tyc_version: u.tyc_version_aceptada,
    estado_cuenta: u.estado_cuenta
  };
  if (u.tipo_usuario === 'Cuidador') {
    var c = buscarPor('perfiles_cuidadores', 'id_usuario', u.id_usuario);
    if (c) { p.id_cuidador = c.id_cuidador; p.estado_postulacion = c.estado_postulacion; p.motivo_estado = c.motivo_estado; }
  }
  if (u.tipo_usuario === 'Veterinaria') {
    var cl = buscarPor('clinicas_veterinarias', 'id_clinica', u.id_clinica_asociada);
    p.id_clinica = u.id_clinica_asociada; p.clinica_nombre = cl ? cl.nombre : '';
  }
  return p;
}

function apiLogin(email, password) {
  return lectura(function () {
    email = String(limpiar(email)).toLowerCase();
    exigir(email && password, 'Ingresa tu correo electrónico y tu contraseña.');
    var cache = CacheService.getScriptCache();
    var kf = 'F_' + email;
    var fallos = parseInt(cache.get(kf) || '0', 10);
    exigir(fallos < 5, 'Demasiados intentos fallidos. Espera 5 minutos e inténtalo nuevamente.');
    var u = null, rows = leerTabla('usuarios').rows;
    for (var i = 0; i < rows.length; i++) { if (String(rows[i].email).toLowerCase() === email) { u = rows[i]; break; } }
    if (!u || u.password_hash !== hashPassword(password)) {
      cache.put(kf, String(fallos + 1), 300);
      fallar('El correo o la contraseña no coinciden. Verifica tus datos o usa los accesos rápidos.');
    }
    exigir(u.estado_cuenta !== 'Pendiente', 'Tu cuenta está pendiente de aprobación por el administrador de la red.');
    exigir(u.estado_cuenta !== 'Suspendido', 'Tu cuenta está suspendida. Contacta al administrador.');
    cache.remove(kf);
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').substring(0, 8);
    cache.put('S_' + token, JSON.stringify({ id_usuario: u.id_usuario, rol: u.tipo_usuario }), SESION_TTL);
    return { exito: true, token: token, usuario: perfilUsuario(u) };
  });
}

function apiLogout(token) {
  try { CacheService.getScriptCache().remove('S_' + token); } catch (e) { }
  return { exito: true };
}

function sesionDe(token) {
  if (!token) { return null; }
  var raw = CacheService.getScriptCache().get('S_' + token);
  if (!raw) { return null; }
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function requerirSesion(token, roles) {
  var s = sesionDe(token);
  if (!s) { fallar('SESION_EXPIRADA', 'SESION'); }
  var u = buscarPor('usuarios', 'id_usuario', s.id_usuario);
  if (!u || u.estado_cuenta === 'Suspendido' || u.tipo_usuario !== s.rol) { fallar('SESION_EXPIRADA', 'SESION'); }
  if (roles && roles.indexOf(s.rol) === -1) { fallar('No tienes permiso para realizar esta operación.'); }
  try { CacheService.getScriptCache().put('S_' + token, JSON.stringify(s), SESION_TTL); } catch (e) { }
  s.usuario = u;
  return s;
}

function apiVerificarSesion(token) {
  return lectura(function () {
    var s = requerirSesion(token, null);
    return { exito: true, usuario: perfilUsuario(s.usuario) };
  });
}

// ============================================================================
// 4. AUDITORÍA, NOTIFICACIONES Y TÉRMINOS Y CONDICIONES
// ============================================================================

function auditar(entidad, id, antes, despues, ses, detalle) {
  insertarFila('auditoria_estados', {
    id_auditoria: siguienteId('AUD-', 'auditoria_estados', 'id_auditoria', 5), entidad: entidad, id_registro: id,
    estado_anterior: antes || '', estado_nuevo: despues || '', actor_id_usuario: ses ? ses.id_usuario : 'SISTEMA',
    actor_rol: ses ? ses.rol : 'Sistema', detalle_motivo: detalle || '', fecha_hora: ahoraStr()
  });
}

function notificar(idUsuario, tipo, titulo, mensaje, ref) {
  if (!idUsuario) { return; }
  insertarFila('notificaciones', {
    id_notificacion: siguienteId('NOT-', 'notificaciones', 'id_notificacion', 4), id_usuario_destino: idUsuario, tipo: tipo,
    titulo: titulo, mensaje: mensaje, id_referencia: ref || '', leida: 'No', fecha_creacion: ahoraStr()
  });
}
function notificarAdmins(tipo, titulo, mensaje, ref) {
  var a = filtrar('usuarios', function (u) { return u.tipo_usuario === 'Administrador' && u.estado_cuenta === 'Activo'; });
  for (var i = 0; i < a.length; i++) { notificar(a[i].id_usuario, tipo, titulo, mensaje, ref); }
}
function notificarClinica(idClinica, tipo, titulo, mensaje, ref) {
  var a = filtrar('usuarios', function (u) { return u.tipo_usuario === 'Veterinaria' && u.id_clinica_asociada === idClinica && u.estado_cuenta === 'Activo'; });
  for (var i = 0; i < a.length; i++) { notificar(a[i].id_usuario, tipo, titulo, mensaje, ref); }
}
function notificarTodasLasClinicas(tipo, titulo, mensaje, ref) {
  var a = filtrar('usuarios', function (u) { return u.tipo_usuario === 'Veterinaria' && u.estado_cuenta === 'Activo'; });
  for (var i = 0; i < a.length; i++) { notificar(a[i].id_usuario, tipo, titulo, mensaje, ref); }
}

function tycVigente(alcance) {
  var l = filtrar('terminos_condiciones', function (t) { return t.alcance === alcance && t.estado === 'Vigente'; });
  return l.length ? l[l.length - 1] : null;
}

function aceptarTyc(idUsuario, alcances, contexto, ref) {
  var general = null;
  for (var i = 0; i < alcances.length; i++) {
    var t = tycVigente(alcances[i]);
    if (!t) { continue; }
    if (alcances[i] === 'General') { general = t; }
    insertarFila('aceptaciones_tyc', {
      id_aceptacion: siguienteId('ACE-', 'aceptaciones_tyc', 'id_aceptacion', 4), id_usuario: idUsuario, id_tyc: t.id_tyc,
      version_tyc: t.version, contexto: contexto, id_referencia: ref || '', fecha_aceptacion: ahoraStr()
    });
  }
  return general ? general.version : 'v4.0';
}

function apiNotificaciones(token) {
  return lectura(function () {
    var s = requerirSesion(token, null);
    var mias = filtrarPor('notificaciones', 'id_usuario_destino', s.id_usuario);
    mias.sort(function (a, b) { return a.fecha_creacion < b.fecha_creacion ? 1 : -1; });
    var no_leidas = 0, lista = [];
    for (var i = 0; i < mias.length; i++) { if (mias[i].leida !== 'Sí') { no_leidas++; } }
    for (var j = 0; j < mias.length && j < 40; j++) {
      lista.push({ id: mias[j].id_notificacion, tipo: mias[j].tipo, titulo: mias[j].titulo, mensaje: mias[j].mensaje, ref: mias[j].id_referencia, leida: mias[j].leida === 'Sí', fecha: mias[j].fecha_creacion });
    }
    return { exito: true, no_leidas: no_leidas, lista: lista };
  });
}

function apiNotificacionesLeer(token, ids) {
  return escribir(function () {
    var s = requerirSesion(token, null);
    var mias = filtrar('notificaciones', function (n) { return n.id_usuario_destino === s.id_usuario && n.leida !== 'Sí' && (!ids || ids === 'todas' || ids.indexOf(n.id_notificacion) !== -1); });
    for (var i = 0; i < mias.length; i++) { actualizarFila('notificaciones', mias[i]._fila, { leida: 'Sí' }); }
    return { exito: true, marcadas: mias.length };
  });
}

// ============================================================================
// 5. MOTORES DE NEGOCIO
// ============================================================================

// ---------- 5.1 Agenda y cupos (anti-overbooking) ----------

function fechasOcupadas(ini, fin) {
  var out = [], f = ini, tope = (diffDias(ini, fin) <= 0) ? sumarDias(ini, 1) : fin;
  var guard = 0;
  while (f < tope && guard < 400) { out.push(f); f = sumarDias(f, 1); guard++; }
  return out;
}

function ocupacionCuidador(idCuid, excluirReserva) {
  var res = filtrar('reservas', function (r) {
    return r.id_cuidador === idCuid && ESTADOS_OCUPAN.indexOf(r.estado_reserva) !== -1 && r.id_reserva !== excluirReserva;
  });
  var mapa = {};
  for (var i = 0; i < res.length; i++) {
    var fs = fechasOcupadas(fechaCorta(res[i].fecha_inicio), fechaCorta(res[i].fecha_fin));
    for (var j = 0; j < fs.length; j++) { if (!mapa[fs[j]]) { mapa[fs[j]] = []; } mapa[fs[j]].push(res[i]); }
  }
  return mapa;
}

function overridesAgenda(idCuid) {
  var l = filtrarPor('disponibilidad_cuidadores', 'id_cuidador', idCuid), m = {};
  for (var i = 0; i < l.length; i++) { m[fechaCorta(l[i].fecha)] = l[i]; }
  return m;
}

function estadoDiaAgenda(perfil, fecha, ocup, ov) {
  var o = ov[fecha], capBase = Math.max(1, num(perfil.capacidad_max_mascotas, 1));
  if (o && o.estado_dia === 'Bloqueado') { return { estado: 'Bloqueado', cupo: 0, ocupados: 0, libres: 0, nota: o.nota_agenda || '' }; }
  if (listaCsv(perfil.disponibilidad_semanal).indexOf(diaSemana(fecha)) === -1) { return { estado: 'Descanso', cupo: 0, ocupados: 0, libres: 0, nota: '' }; }
  var cupo = (o && num(o.cupo_maximo_dia) > 0) ? num(o.cupo_maximo_dia) : capBase;
  var oc = ocup[fecha] ? ocup[fecha].length : 0;
  var libres = Math.max(0, cupo - oc);
  return { estado: libres <= 0 ? 'Lleno' : (oc > 0 ? 'Parcial' : 'Disponible'), cupo: cupo, ocupados: oc, libres: libres, nota: o ? (o.nota_agenda || '') : '' };
}

function verificarDisponibilidad(idCuid, ini, fin, excluirReserva) {
  var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', idCuid);
  if (!perfil) { return { ok: false, motivos: ['El cuidador no existe.'] }; }
  var ocup = ocupacionCuidador(idCuid, excluirReserva), ov = overridesAgenda(idCuid), motivos = [];
  var fs = fechasOcupadas(ini, fin), hoy = hoyStr();
  for (var i = 0; i < fs.length; i++) {
    if (fs[i] < hoy) { motivos.push('No se pueden reservar fechas pasadas (' + fs[i] + ').'); break; }
    var e = estadoDiaAgenda(perfil, fs[i], ocup, ov);
    if (e.estado === 'Bloqueado') { motivos.push(fs[i] + ': el cuidador bloqueó esta fecha' + (e.nota ? ' (' + e.nota + ')' : '') + '.'); }
    else if (e.estado === 'Descanso') { motivos.push(fs[i] + ' (' + diaSemana(fs[i]) + '): día de descanso del cuidador.'); }
    else if (e.estado === 'Lleno') { motivos.push(fs[i] + ': cupos completos (' + e.cupo + '/' + e.cupo + ').'); }
    if (motivos.length >= 3) { break; }
  }
  return { ok: motivos.length === 0, motivos: motivos };
}

function sincronizarAgenda(idCuid, fechas) {
  var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', idCuid);
  if (!perfil) { return; }
  var ocup = ocupacionCuidador(idCuid, ''), ov = overridesAgenda(idCuid), cap = Math.max(1, num(perfil.capacidad_max_mascotas, 1));
  for (var i = 0; i < fechas.length; i++) {
    var f = fechas[i], n = ocup[f] ? ocup[f].length : 0, fila = ov[f];
    if (fila) {
      if (fila.estado_dia === 'Bloqueado') { continue; }
      var cupo = num(fila.cupo_maximo_dia) > 0 ? num(fila.cupo_maximo_dia) : cap;
      actualizarFila('disponibilidad_cuidadores', fila._fila, { cupos_reservados: n, cupo_maximo_dia: cupo, estado_dia: n >= cupo ? 'Lleno' : (n > 0 ? 'Parcial' : 'Disponible') });
    } else if (n > 0) {
      insertarFila('disponibilidad_cuidadores', {
        id_disp: siguienteId('DSP-', 'disponibilidad_cuidadores', 'id_disp', 4), id_cuidador: idCuid, fecha: f,
        estado_dia: n >= cap ? 'Lleno' : 'Parcial', cupo_maximo_dia: cap, cupos_reservados: n, nota_agenda: ''
      });
    }
  }
}

function agendaMes(idCuid, mes, conDetalle) {
  var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', idCuid);
  if (!perfil) { fallar('El cuidador no existe.'); }
  exigir(/^\d{4}-\d{2}$/.test(String(mes)), 'Mes inválido.');
  var ocup = ocupacionCuidador(idCuid, ''), ov = overridesAgenda(idCuid), hoy = hoyStr();
  var p = String(mes).split('-'), y = Number(p[0]), m = Number(p[1]);
  var ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate(), dias = [];
  for (var d = 1; d <= ultimo; d++) {
    var f = mes + '-' + (d < 10 ? '0' + d : d);
    var e = estadoDiaAgenda(perfil, f, ocup, ov);
    var item = { fecha: f, dia: d, dsem: diaSemana(f), estado: e.estado, cupo: e.cupo, ocupados: e.ocupados, libres: e.libres, nota: e.nota, pasado: f < hoy };
    if (conDetalle && ocup[f]) {
      var mc = mapaPor('mascotas', 'id_mascota');
      item.reservas = [];
      for (var k = 0; k < ocup[f].length; k++) {
        var rr = ocup[f][k];
        item.reservas.push({ codigo: rr.codigo_reserva, id_reserva: rr.id_reserva, estado: rr.estado_reserva, mascota: mc[rr.id_mascota] ? mc[rr.id_mascota].nombre : rr.id_mascota });
      }
    }
    dias.push(item);
  }
  return { exito: true, mes: mes, primer_dia_semana: new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), dias: dias, plantilla: perfil.disponibilidad_semanal, capacidad: num(perfil.capacidad_max_mascotas, 1) };
}

// ---------- 5.2 Tarifas dinámicas, cupones y cotización ----------

function resolverTemporada(fecha) {
  var md = String(fecha).substring(5, 10), rows = leerTabla('temporadas_tarifas').rows, regular = null;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.activa === 'No') { continue; }
    var factor = num(r.factor_multiplicador, 1);
    if (factor === 1) { if (!regular) { regular = r; } continue; }
    var a = mdDe(r.fecha_inicio), b = mdDe(r.fecha_fin);
    var en = (a <= b) ? (md >= a && md <= b) : (md >= a || md <= b);
    if (en) { return { id_temporada: r.id_temporada, nombre: r.nombre_temporada, factor: factor }; }
  }
  return { id_temporada: regular ? regular.id_temporada : 'TMP-00', nombre: regular ? regular.nombre_temporada : 'Temporada Regular', factor: 1 };
}

function validarCupon(codigo, segmento, subtotal) {
  var cod = String(codigo || '').replace(/\s/g, '').toUpperCase();
  var c = null, rows = leerTabla('cupones_promocionales').rows;
  for (var i = 0; i < rows.length; i++) { if (String(rows[i].codigo).toUpperCase() === cod) { c = rows[i]; break; } }
  var hoy = hoyStr();
  if (!c) { fallar('El cupón "' + cod + '" no existe.'); }
  if (c.activo === 'No') { fallar('El cupón "' + cod + '" está desactivado.'); }
  if (fechaCorta(c.fecha_inicio) > hoy) { fallar('El cupón aún no está vigente (inicia el ' + fechaCorta(c.fecha_inicio) + ').'); }
  if (fechaCorta(c.fecha_fin) < hoy) { fallar('El cupón "' + cod + '" venció el ' + fechaCorta(c.fecha_fin) + '.'); }
  if (num(c.usos_maximos) > 0 && num(c.usos_actuales) >= num(c.usos_maximos)) { fallar('El cupón "' + cod + '" ya alcanzó su límite de usos.'); }
  if (c.segmento_objetivo !== 'Todos' && c.segmento_objetivo !== segmento) { fallar('El cupón "' + cod + '" es exclusivo para clientes ' + (c.segmento_objetivo === 'Turista' ? 'turistas' : 'locales') + '.'); }
  if (subtotal < num(c.monto_minimo)) { fallar('El cupón "' + cod + '" requiere una compra mínima de S/ ' + redondear(num(c.monto_minimo)).toFixed(2) + '.'); }
  var desc = c.tipo_descuento === 'Porcentaje' ? redondear(subtotal * num(c.valor_descuento) / 100) : Math.min(num(c.valor_descuento), subtotal);
  return { cupon: c, descuento: redondear(desc) };
}

function calcularCotizacion(usuario, q) {
  exigir(q && q.id_oferta, 'Selecciona un servicio.');
  var of = buscarPor('servicios', 'id_oferta', q.id_oferta);
  exigir(of && of.disponible === 'Sí', 'El servicio seleccionado no está disponible.');
  var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', of.id_cuidador);
  exigir(perfil && perfil.estado_postulacion === 'Aprobado', 'El cuidador no está habilitado para recibir reservas.');
  var ini = String(q.fecha_inicio || ''), fin = String(q.fecha_fin || '');
  exigir(esFechaValida(ini) && esFechaValida(fin), 'Selecciona fechas de ingreso y salida válidas.');
  exigir(fin >= ini, 'La fecha de salida no puede ser anterior a la fecha de ingreso.');
  var dias = Math.max(1, diffDias(ini, fin));
  var tarifa = num(of.tarifa_diaria_por_perro);
  var base = redondear(dias * tarifa);
  var temp = resolverTemporada(ini);
  var ajuste = redondear(base * (temp.factor - 1));
  var extras = q.extras || {}, extrasMonto = 0, det = [];
  if (extras.recojo_hotel && of.incluye_recojo_hotel === 'Sí') { var rc = num(of.tarifa_recojo_extra); extrasMonto += rc; det.push('Recojo en hotel (S/ ' + rc.toFixed(2) + ')'); }
  if (extras.bano || q.incluye_bano) { extrasMonto += EXTRA_BANO; det.push('Baño higiénico (S/ ' + EXTRA_BANO.toFixed(2) + ')'); }
  extrasMonto = redondear(extrasMonto);
  var subT = redondear(base + ajuste + extrasMonto);
  var segmento = usuario.subtipo_propietario === 'Turista' ? 'Turista' : 'Local';
  var cupon = null, descuento = 0, cuponError = '';
  if (q.cupon_codigo && String(q.cupon_codigo).replace(/\s/g, '')) {
    try { var vc = validarCupon(q.cupon_codigo, segmento, subT); cupon = vc.cupon; descuento = vc.descuento; }
    catch (e) { if (e.esNegocio) { cuponError = e.message; } else { throw e; } }
  }
  var total = redondear(Math.max(10, subT - descuento));
  var comision = redondear(total * COMISION);
  var neto = redondear(total - comision);
  var cuUsr = buscarPor('usuarios', 'id_usuario', perfil.id_usuario);
  var disp = verificarDisponibilidad(of.id_cuidador, ini, fin, '');
  return {
    id_oferta: of.id_oferta, id_cuidador: of.id_cuidador, hu_ecode: of.hu_ecode, servicio: of.tipo_servicio, cuidador_nombre: nombreDe(cuUsr),
    dias: dias, tarifa: tarifa, subtotal_base: base, id_temporada: temp.id_temporada, temporada: temp.nombre, factor: temp.factor,
    ajuste_temporada: ajuste, extras_detalle: det.join('; '), extras_monto: extrasMonto, subtotal_temporada: subT,
    cupon: cupon ? { id_cupon: cupon.id_cupon, codigo: cupon.codigo, descripcion: cupon.descripcion } : null, descuento: descuento, descuento_cupon: descuento, cupon_error: cuponError,
    total: total, comision: comision, neto: neto, total_usd: redondear(total / TIPO_CAMBIO), tipo_cambio: TIPO_CAMBIO,
    disponibilidad: disp, segmento: segmento
  };
}

// ---------- 5.3 Cancelaciones escalonadas y reembolsos ----------

function calcularCancelacion(reserva, ahoraMs) {
  var horas = (inicioServicioMs(fechaCorta(reserva.fecha_inicio)) - ahoraMs) / 3600000;
  horas = Math.round(horas * 10) / 10;
  var total = num(reserva.monto_total), pct, regla, plat = 0, comp = 0, reem, tramo;
  if (reserva.estado_reserva === 'Pendiente Confirmación') {
    pct = 100; tramo = 'Sin confirmar'; regla = 'Reserva aún no confirmada por el cuidador: reembolso 100%';
  } else if (horas > 48) {
    pct = 100; tramo = '>48h'; regla = 'Más de 48 horas de anticipación: reembolso 100%';
  } else if (horas >= 24) {
    pct = 70; tramo = '24-48h'; regla = 'Entre 24 y 48 horas: reembolso 70% y penalidad 30% (15% plataforma + 15% cuidador)';
  } else {
    pct = 0; tramo = '<24h'; regla = 'Menos de 24 horas: sin reembolso (85% cuidador + 15% plataforma)';
  }
  reem = redondear(total * pct / 100);
  if (pct === 70) { plat = redondear(total * COMISION); comp = redondear(total - reem - plat); }
  else if (pct === 0) { plat = redondear(total * COMISION); comp = redondear(total - plat); }
  return {
    horas: horas, tramo: tramo, regla: regla, porcentaje_reembolso: pct, total: total, reembolso: reem,
    penalidad_total: redondear(total - reem), penalidad_plataforma: plat, compensacion_cuidador: comp
  };
}

function ejecutarCancelacion(res, pago, calc, ses, tipoCaso, motivo) {
  var antes = res.estado_reserva, ahora = ahoraStr();
  actualizarFila('reservas', res._fila, { estado_reserva: 'Cancelada' });
  var patchPago = {
    monto_reembolsado: calc.reembolso, comision_plataforma: calc.penalidad_plataforma, monto_neto_cuidador: calc.compensacion_cuidador,
    penalidad_retenida: calc.penalidad_total,
    estado_pago: calc.porcentaje_reembolso >= 100 ? 'Reembolsado Total' : (calc.reembolso > 0 ? 'Reembolsado Parcial' : 'Aprobado')
  };
  if (pago) { actualizarFila('pagos', pago._fila, patchPago); }
  var liq = pago ? buscarPor('liquidaciones_cuidadores', 'id_pago', pago.id_pago) : null;
  if (liq) {
    if (calc.compensacion_cuidador > 0) {
      actualizarFila('liquidaciones_cuidadores', liq._fila, { monto_liquidado: calc.compensacion_cuidador, tipo_concepto: 'Compensación Cancelación', estado_liquidacion: 'Disponible', fecha_disponible: ahora });
    } else {
      actualizarFila('liquidaciones_cuidadores', liq._fila, { monto_liquidado: 0, estado_liquidacion: 'Anulado' });
    }
  }
  var idCan = siguienteId('CAN-', 'cancelaciones_reembolsos', 'id_cancelacion', 3);
  insertarFila('cancelaciones_reembolsos', {
    id_cancelacion: idCan, id_reserva: res.id_reserva, id_pago: pago ? pago.id_pago : '', solicitado_por: ses.id_usuario, tipo_caso: tipoCaso,
    horas_anticipacion: calc.horas, regla_aplicada: calc.regla, motivo: motivo, porcentaje_reembolso: calc.porcentaje_reembolso,
    monto_reembolso: calc.reembolso, monto_penalidad_plataforma: calc.penalidad_plataforma, monto_compensacion_cuidador: calc.compensacion_cuidador,
    estado_tramite: 'Pendiente Revisión', fecha_solicitud: ahora
  });
  sincronizarAgenda(res.id_cuidador, fechasOcupadas(fechaCorta(res.fecha_inicio), fechaCorta(res.fecha_fin)));
  auditar('Reserva', res.id_reserva, antes, 'Cancelada', ses, tipoCaso + ': ' + calc.regla + (motivo ? ' | Motivo: ' + motivo : ''));
  var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', res.id_cuidador);
  if (perfil) { notificar(perfil.id_usuario, 'Cancelacion', 'Reserva cancelada', res.codigo_reserva + ' fue cancelada. ' + (calc.compensacion_cuidador > 0 ? 'Recibirás una compensación de S/ ' + calc.compensacion_cuidador.toFixed(2) + '.' : ''), res.id_reserva); }
  notificar(res.id_propietario, 'Cancelacion', 'Cancelación registrada', res.codigo_reserva + ': ' + calc.regla + '. Reembolso: S/ ' + calc.reembolso.toFixed(2) + '.', idCan);
  notificarAdmins('Cancelacion', 'Reembolso por procesar', res.codigo_reserva + ' (' + tipoCaso + '): reembolso S/ ' + calc.reembolso.toFixed(2) + '.', idCan);
  return idCan;
}

function transicionPermitida(actual, nuevo) {
  var p = TRANSICIONES[actual] || [];
  return p.indexOf(nuevo) !== -1;
}

// ---------- 5.4 Vistas enriquecidas de reservas ----------

function contextoReservas() {
  var canc = {}, rows = leerTabla('cancelaciones_reembolsos').rows;
  for (var i = 0; i < rows.length; i++) { canc[rows[i].id_reserva] = rows[i]; }
  return {
    usuarios: mapaPor('usuarios', 'id_usuario'), cuidadores: mapaPor('perfiles_cuidadores', 'id_cuidador'), servicios: mapaPor('servicios', 'id_oferta'),
    mascotas: mapaPor('mascotas', 'id_mascota'), pagos: mapaPor('pagos', 'id_reserva'), resenas: mapaPor('reseñas', 'id_reserva'), cancelaciones: canc
  };
}

function vistaReserva(r, ctx, rol) {
  var cu = ctx.cuidadores[r.id_cuidador] || {}, cuUsr = ctx.usuarios[cu.id_usuario] || {}, of = ctx.servicios[r.id_oferta] || {};
  var m = ctx.mascotas[r.id_mascota] || {}, pg = ctx.pagos[r.id_reserva] || {}, prop = ctx.usuarios[r.id_propietario] || {};
  var rs = ctx.resenas[r.id_reserva], cn = ctx.cancelaciones[r.id_reserva], est = r.estado_reserva;
  var hace72 = r.fecha_checkout && (new Date().getTime() - msDeFechaHora(r.fecha_checkout)) <= 72 * 3600000;
  var activa = est === 'Confirmada' || est === 'En Curso';
  var v = {
    id_reserva: r.id_reserva, codigo: r.codigo_reserva, estado: est, fecha_inicio: fechaCorta(r.fecha_inicio), fecha_fin: fechaCorta(r.fecha_fin),
    dias: num(r.dias_calculados), id_cuidador: r.id_cuidador, cuidador_nombre: nombreDe(cuUsr), cuidador_foto: urlImagen(cu.foto_url), cuidador_distrito: cuUsr.distrito_cusco || '',
    id_oferta: r.id_oferta, servicio: of.tipo_servicio || '', hu_ecode: of.hu_ecode || '', id_mascota: r.id_mascota, mascota_nombre: m.nombre || '',
    paw_id: m.paw_patita_id || '', mascota_foto: urlImagen(m.foto_url), id_propietario: r.id_propietario, propietario_nombre: nombreDe(prop), modalidad: r.modalidad_cliente,
    tarifa: num(r.tarifa_unitaria), subtotal_base: num(r.subtotal_base), ajuste_temporada: num(r.ajuste_temporada), descuento: num(r.descuento_cupon), extras_detalle: r.extras_detalle,
    extras_monto: num(r.extras_monto), total: num(r.monto_total), moneda_ref: r.moneda_referencial, notas: r.notas_propietario, fecha_solicitud: r.fecha_solicitud,
    fecha_checkin: r.fecha_checkin, fecha_checkout: r.fecha_checkout, estado_pago: pg.estado_pago || '', metodo_pago: pg.metodo_pago || '', num_operacion: pg.num_operacion || '',
    num_comprobante: pg.num_comprobante || '', fecha_pago: pg.fecha_pago || '', comision: num(pg.comision_plataforma), neto: num(pg.monto_neto_cuidador), reembolsado: num(pg.monto_reembolsado),
    calificada: !!rs, estrellas: rs ? num(rs.calificacion_estrellas) : 0,
    puede_cancelar: est === 'Pendiente Confirmación' || est === 'Confirmada', puede_disputar: est === 'En Curso' || (est === 'Finalizada' && !!hace72),
    puede_resenar: est === 'Finalizada' && !rs, puede_sos: activa,
    cancelacion: cn ? { id: cn.id_cancelacion, tipo: cn.tipo_caso, regla: cn.regla_aplicada, porcentaje: num(cn.porcentaje_reembolso), reembolso: num(cn.monto_reembolso), estado: cn.estado_tramite, motivo: cn.motivo } : null
  };
  if (rol === 'Propietario' && activa) { v.cuidador_tel = String(cuUsr.telefono || ''); }
  if (rol === 'Cuidador' && activa) { v.propietario_tel = String(prop.telefono || ''); v.hotel = prop.hospedaje_hotel_cusco || ''; }
  return v;
}

// ============================================================================
// 6. API PÚBLICA (catálogo, información, registro)
// ============================================================================

function construirCatalogo() {
  var usuarios = mapaPor('usuarios', 'id_usuario'), ants = {}, servs = {}, revs = {};
  var a = leerTabla('antecedentes_cuidadores').rows, s = leerTabla('servicios').rows, r = leerTabla('reseñas').rows, i;
  for (i = 0; i < a.length; i++) { ants[a[i].id_cuidador] = a[i]; }
  for (i = 0; i < s.length; i++) {
    if (s[i].disponible !== 'Sí') { continue; }
    if (!servs[s[i].id_cuidador]) { servs[s[i].id_cuidador] = []; }
    servs[s[i].id_cuidador].push({
      id_oferta: s[i].id_oferta, hu_ecode: s[i].hu_ecode, categoria: s[i].categoria, tipo_servicio: s[i].tipo_servicio, descripcion: s[i].descripcion_servicio,
      tarifa: num(s[i].tarifa_diaria_por_perro), recojo: s[i].incluye_recojo_hotel === 'Sí', tarifa_recojo: num(s[i].tarifa_recojo_extra)
    });
  }
  for (i = 0; i < r.length; i++) {
    if (r[i].visible === 'No') { continue; }
    if (!revs[r[i].id_cuidador]) { revs[r[i].id_cuidador] = []; }
    var dueno = usuarios[r[i].id_propietario];
    revs[r[i].id_cuidador].push({
      estrellas: num(r[i].calificacion_estrellas), puntualidad: num(r[i].puntualidad_estrellas), comunicacion: num(r[i].comunicacion_estrellas), cuidado: num(r[i].cuidado_estrellas),
      comentario: r[i].comentario, respuesta: r[i].respuesta_cuidador, fecha: fechaCorta(r[i].fecha_resena), autor: dueno ? dueno.nombre : 'Propietario'
    });
  }
  var perfiles = leerTabla('perfiles_cuidadores').rows, out = [];
  for (i = 0; i < perfiles.length; i++) {
    var p = perfiles[i], u = usuarios[p.id_usuario], ant = ants[p.id_cuidador];
    if (!u || u.estado_cuenta !== 'Activo' || p.estado_postulacion !== 'Aprobado' || !ant || ant.estado_verificacion !== 'Aprobado') { continue; }
    var lista = servs[p.id_cuidador] || [];
    if (!lista.length) { continue; }
    var tmin = 9999;
    for (var k = 0; k < lista.length; k++) { if (lista[k].tarifa < tmin) { tmin = lista[k].tarifa; } }
    out.push({
      id_cuidador: p.id_cuidador, nombre: nombreDe(u), distrito: u.distrito_cusco, experiencia: p.descripcion_experiencia, especialidades: listaCsv(p.especialidades),
      idiomas: listaCsv(p.idiomas), vivienda: p.tipo_vivienda, capacidad: num(p.capacidad_max_mascotas, 1), reputacion: num(p.reputacion_promedio, 5), total_resenas: num(p.total_resenas),
      foto_url: urlImagen(p.foto_url), foto_hogar_url: urlImagen(p.foto_hogar_url), disponibilidad: p.disponibilidad_semanal, servicios: lista, tarifa_min: tmin, resenas: (revs[p.id_cuidador] || []).slice(0, 8)
    });
  }
  return out;
}

function apiCatalogoPublico() {
  return lectura(function () {
    var c = cacheGet('catalogo');
    if (!c) { c = construirCatalogo(); cachePut('catalogo', c, 120); }
    return { exito: true, cuidadores: c };
  });
}

function apiInfoPublica() {
  return lectura(function () {
    var c = cacheGet('info');
    if (c) { return c; }
    var clin = filtrar('clinicas_veterinarias', function (x) { return x.activa === 'Sí' && x.estado_afiliacion === 'Activa'; }), cl = [], i;
    for (i = 0; i < clin.length; i++) {
      cl.push({ id_clinica: clin[i].id_clinica, nombre: clin[i].nombre, direccion: clin[i].direccion, telefono: String(clin[i].telefono_emergencia), distrito: clin[i].distrito_cusco, horario: clin[i].horario_atencion, especialidades: clin[i].especialidades, tarifa: num(clin[i].tarifa_consulta_emergencia) });
    }
    var temps = filtrar('temporadas_tarifas', function (t) { return t.activa !== 'No' && num(t.factor_multiplicador, 1) !== 1; }), tm = [];
    for (i = 0; i < temps.length; i++) { tm.push({ id: temps[i].id_temporada, nombre: temps[i].nombre_temporada, inicio: mdDe(temps[i].fecha_inicio), fin: mdDe(temps[i].fecha_fin), factor: num(temps[i].factor_multiplicador, 1), descripcion: temps[i].descripcion }); }
    var tc = filtrar('terminos_condiciones', function (t) { return t.estado === 'Vigente'; }), ty = [];
    for (i = 0; i < tc.length; i++) { ty.push({ id: tc[i].id_tyc, version: tc[i].version, alcance: tc[i].alcance, titulo: tc[i].titulo, contenido: tc[i].contenido_resumen }); }
    var res = {
      exito: true, clinicas: cl, temporadas: tm, temporada_actual: resolverTemporada(hoyStr()), tyc: ty, tipo_cambio: TIPO_CAMBIO, comision: COMISION, extra_bano: EXTRA_BANO,
      politica: [
        { tramo: 'Más de 48 horas', reembolso: 100, penalidad: 0, detalle: 'Reembolso total. Se liberan los cupos del cuidador.' },
        { tramo: 'Entre 24 y 48 horas', reembolso: 70, penalidad: 30, detalle: 'Penalidad 30%: 15% plataforma + 15% cuidador.' },
        { tramo: 'Menos de 24 horas', reembolso: 0, penalidad: 100, detalle: 'Sin reembolso: 15% plataforma + 85% cuidador.' },
        { tramo: 'Rechazo del cuidador / fuerza mayor', reembolso: 100, penalidad: 0, detalle: 'Reembolso íntegro (fuerza mayor validada por el administrador).' }
      ]
    };
    cachePut('info', res, 120);
    return res;
  });
}

function apiCuidadoresDisponibles(ini, fin) {
  return lectura(function () {
    exigir(esFechaValida(ini) && esFechaValida(fin) && fin >= ini, 'Fechas inválidas.');
    var cat = cacheGet('catalogo') || construirCatalogo(), ids = [];
    for (var i = 0; i < cat.length; i++) { if (verificarDisponibilidad(cat[i].id_cuidador, ini, fin, '').ok) { ids.push(cat[i].id_cuidador); } }
    return { exito: true, ids: ids };
  });
}

function apiAgendaPublica(idCuidador, mes) {
  return lectura(function () { return agendaMes(idCuidador, mes || mesActual(), false); });
}

function validarDatosPersona(d) {
  exigir(d, 'Datos de registro vacíos.');
  exigir(limpiar(d.nombre) && limpiar(d.apellido), 'Escribe tus nombres y apellidos completos.');
  exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email || '')), 'Ingresa un correo electrónico válido (ejemplo: usuario@gmail.com).');
  exigir(String(d.password || '').length >= 6, 'La contraseña debe tener al menos 6 caracteres.');
  exigir(String(limpiar(d.num_doc)).length >= 6, 'Ingresa un número de documento válido (mínimo 6 caracteres).');
  exigir(d.acepta_tyc === true, 'Debes aceptar los Términos y Condiciones para registrarte.');
  var email = String(d.email).toLowerCase(), doc = String(limpiar(d.num_doc)), us = leerTabla('usuarios').rows;
  for (var i = 0; i < us.length; i++) {
    exigir(String(us[i].email).toLowerCase() !== email, 'Este correo electrónico ya está registrado. Intenta iniciar sesión.');
    exigir(String(us[i].num_documento) !== doc, 'Este número de documento ya se encuentra registrado.');
  }
}

function apiRegistrarPropietario(d) {
  return escribir(function () {
    validarDatosPersona(d);
    var sub = d.subtipo === 'Turista' ? 'Turista' : 'Local';
    if (sub === 'Turista') { exigir(limpiar(d.pais), 'Indica tu país de origen.'); exigir(limpiar(d.hotel), 'Indica el hotel o alojamiento donde te hospedas en Cusco.'); }
    var id = siguienteId('USR-', 'usuarios', 'id_usuario', 2), ahora = ahoraStr();
    var ver = aceptarTyc(id, ['General', 'Propietario'], 'Registro', id);
    insertarFila('usuarios', {
      id_usuario: id, nombre: limpiar(d.nombre), apellido: limpiar(d.apellido), email: String(d.email).toLowerCase(), password_hash: hashPassword(d.password),
      telefono: limpiar(d.telefono) || '', tipo_usuario: 'Propietario', subtipo_propietario: sub, tipo_documento: sub === 'Local' ? 'DNI' : (limpiar(d.tipo_doc) || 'Pasaporte'),
      num_documento: limpiar(d.num_doc), pais_origen: sub === 'Local' ? 'Perú' : limpiar(d.pais), idioma_preferido: d.idioma === 'EN' ? 'EN' : 'ES',
      direccion: limpiar(d.direccion) || 'Cusco', distrito_cusco: limpiar(d.distrito) || 'Cusco', hospedaje_hotel_cusco: limpiar(d.hotel), contacto_emergencia_nombre: limpiar(d.contacto_nombre),
      contacto_emergencia_tel: limpiar(d.contacto_tel), id_clinica_asociada: '', tyc_version_aceptada: ver, estado_cuenta: 'Activo', fecha_registro: ahora
    });
    auditar('Usuario', id, '', 'Activo', { id_usuario: id, rol: 'Propietario' }, 'Registro de propietario ' + sub);
    notificar(id, 'Sistema', '¡Bienvenido a Paw Patita Cusco!', 'Registra a tu mascota para obtener su PAW PATITA-ID y solicitar la validación veterinaria.', id);
    return { exito: true, id_usuario: id, mensaje: '¡Cuenta de propietario creada con éxito! Ya puedes iniciar sesión.' };
  });
}

function apiRegistrarCuidador(d) {
  return escribir(function () {
    validarDatosPersona(d);
    exigir(limpiar(d.experiencia), 'Cuéntanos tu experiencia con mascotas y tu espacio de cuidado.');
    exigir(esUrl(d.doc_identidad_url) && esUrl(d.doc_policial_url) && esUrl(d.doc_penal_url), 'Adjunta los enlaces (https://...) de tu documento de identidad y de tus antecedentes policiales y penales.');
    var cat = limpiar(d.categoria) || 'Paseo';
    exigir(CATEGORIAS.indexOf(cat) !== -1, 'Selecciona una categoría de servicio válida.');
    var tarifa = num(d.tarifa, 0);
    exigir(tarifa >= 10, 'La tarifa diaria mínima es S/ 10.00.');
    var dias = listaCsv(d.disponibilidad_semanal), ok = [];
    for (var i = 0; i < dias.length; i++) { if (DIAS_LABORABLES.indexOf(dias[i]) !== -1) { ok.push(dias[i]); } }
    if (!ok.length) { ok = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']; }
    var idU = siguienteId('USR-', 'usuarios', 'id_usuario', 2), idC = siguienteId('CUID-', 'perfiles_cuidadores', 'id_cuidador', 2);
    var idO = siguienteId('OF-', 'servicios', 'id_oferta', 3), hu = siguienteId('HU-', 'servicios', 'hu_ecode', 3);
    var idA = siguienteId('ANT-', 'antecedentes_cuidadores', 'id_antecedente', 2), ahora = ahoraStr();
    var ver = aceptarTyc(idU, ['General', 'Cuidador'], 'Postulación', idC);
    insertarFila('usuarios', {
      id_usuario: idU, nombre: limpiar(d.nombre), apellido: limpiar(d.apellido), email: String(d.email).toLowerCase(), password_hash: hashPassword(d.password), telefono: limpiar(d.telefono),
      tipo_usuario: 'Cuidador', subtipo_propietario: 'N/A', tipo_documento: limpiar(d.tipo_doc) || 'DNI', num_documento: limpiar(d.num_doc), pais_origen: 'Perú', idioma_preferido: 'ES',
      direccion: limpiar(d.direccion) || 'Cusco', distrito_cusco: limpiar(d.distrito) || 'Cusco', tyc_version_aceptada: ver, estado_cuenta: 'Activo', fecha_registro: ahora
    });
    insertarFila('perfiles_cuidadores', {
      id_cuidador: idC, id_usuario: idU, descripcion_experiencia: limpiar(d.experiencia), especialidades: limpiar(d.especialidades), idiomas: limpiar(d.idiomas) || 'ES', tipo_vivienda: limpiar(d.vivienda) || 'Casa',
      capacidad_max_mascotas: Math.min(10, Math.max(1, Math.round(num(d.capacidad, 3)))), reputacion_promedio: 5, total_resenas: 0, estado_postulacion: 'Pendiente', motivo_estado: 'En revisión de antecedentes',
      foto_url: urlImagen(d.foto_url), foto_hogar_url: urlImagen(d.foto_hogar_url), disponibilidad_semanal: ok.join(','), cuenta_cobro_tipo: limpiar(d.cuenta_tipo) || 'Yape', cuenta_cobro_numero: limpiar(d.cuenta_numero) || limpiar(d.telefono)
    });
    insertarFila('servicios', {
      id_oferta: idO, hu_ecode: hu, id_cuidador: idC, categoria: cat, tipo_servicio: limpiar(d.tipo_servicio) || cat, descripcion_servicio: limpiar(d.descripcion_servicio) || 'Servicio de cuidado canino responsable en Cusco.',
      tarifa_diaria_por_perro: tarifa, incluye_recojo_hotel: 'No', tarifa_recojo_extra: 0, disponible: 'Sí'
    });
    insertarFila('antecedentes_cuidadores', {
      id_antecedente: idA, id_cuidador: idC, doc_identidad_url: limpiar(d.doc_identidad_url), doc_antecedentes_policiales_url: limpiar(d.doc_policial_url),
      doc_antecedentes_penales_url: limpiar(d.doc_penal_url), estado_verificacion: 'Pendiente', fecha_carga: ahora
    });
    auditar('Cuidador', idC, '', 'Pendiente', { id_usuario: idU, rol: 'Cuidador' }, 'Postulación recibida');
    notificar(idU, 'Aprobacion', 'Postulación recibida', 'El administrador revisará tus antecedentes. Te avisaremos cuando tu perfil sea aprobado.', idC);
    notificarAdmins('Aprobacion', 'Nueva postulación de cuidador', nombreDe({ nombre: d.nombre, apellido: d.apellido }) + ' espera la verificación de antecedentes.', idC);
    return { exito: true, id_cuidador: idC, hu_ecode: hu, mensaje: '¡Postulación registrada! Tu perfil quedó en estado Pendiente hasta que el administrador valide tus antecedentes.' };
  });
}

// ============================================================================
// 7. MÓDULO PROPIETARIO
// ============================================================================

function vistaMascota(m) {
  return {
    id_mascota: m.id_mascota, paw_id: m.paw_patita_id, nombre: m.nombre, raza: m.raza, tamano: m.tamano, sexo: m.sexo, edad: num(m.edad_anos), peso: num(m.peso_kg), esterilizado: m.esterilizado,
    vacunas_al_dia: m.cartilla_vacunas_al_dia, venc_vacunas: fechaCorta(m.fecha_venc_vacunas), cartilla_url: m.cartilla_vacunas_url, alergias: m.alergias_restricciones, medicacion: m.medicacion_actual,
    dieta: m.dieta_alimentacion, conducta: m.conducta_observaciones, foto_url: urlImagen(m.foto_url), estado_validacion: m.estado_validacion_vet, id_clinica: m.id_clinica_validadora, observacion: m.observacion_veterinaria
  };
}

function apiPropMascotas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Propietario']);
    var cl = mapaPor('clinicas_veterinarias', 'id_clinica'), l = filtrarPor('mascotas', 'id_propietario', s.id_usuario), out = [];
    for (var i = 0; i < l.length; i++) { var v = vistaMascota(l[i]); v.clinica_nombre = cl[v.id_clinica] ? cl[v.id_clinica].nombre : ''; out.push(v); }
    return { exito: true, mascotas: out };
  });
}

function apiPropGuardarMascota(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario']);
    exigir(d && limpiar(d.nombre) && limpiar(d.raza), 'Escribe el nombre y la raza de tu mascota.');
    var edad = num(d.edad_anos, 1), peso = num(d.peso_kg, 5);
    exigir(edad >= 0 && edad <= 30, 'La edad debe estar entre 0 y 30 años.');
    exigir(peso >= 0.5 && peso <= 120, 'El peso debe estar entre 0.5 y 120 kg.');
    var datos = {
      nombre: limpiar(d.nombre), raza: limpiar(d.raza), tamano: limpiar(d.tamano) || 'Mediano', sexo: limpiar(d.sexo) || 'Macho', edad_anos: edad, peso_kg: peso, esterilizado: d.esterilizado === 'Sí' ? 'Sí' : 'No',
      cartilla_vacunas_al_dia: d.vacunas_al_dia === 'Sí' ? 'Sí' : 'No', fecha_venc_vacunas: esFechaValida(d.venc_vacunas) ? d.venc_vacunas : '', cartilla_vacunas_url: esUrl(d.cartilla_url) ? d.cartilla_url : FOTO_DEFAULT_POSTIMG,
      alergias_restricciones: limpiar(d.alergias) || 'Ninguna', medicacion_actual: limpiar(d.medicacion) || 'Ninguna', dieta_alimentacion: limpiar(d.dieta) || 'Alimento balanceado', conducta_observaciones: limpiar(d.conducta) || 'Sociable',
      foto_url: urlImagen(d.foto_url)
    };
    if (d.id_mascota) {
      var m = buscarPor('mascotas', 'id_mascota', d.id_mascota);
      exigir(m && m.id_propietario === s.id_usuario, 'No puedes editar esta mascota.');
      var cambioMedico = datos.cartilla_vacunas_al_dia !== m.cartilla_vacunas_al_dia || datos.fecha_venc_vacunas !== fechaCorta(m.fecha_venc_vacunas) || datos.cartilla_vacunas_url !== m.cartilla_vacunas_url || datos.alergias_restricciones !== m.alergias_restricciones || datos.medicacion_actual !== m.medicacion_actual;
      var patch = datos, msg = 'Ficha actualizada.';
      if (cambioMedico && m.estado_validacion_vet !== 'Pendiente') {
        patch.estado_validacion_vet = 'Pendiente'; patch.observacion_veterinaria = ''; patch.id_clinica_validadora = '';
        msg = 'Ficha actualizada. Por cambios en datos médicos, volvió a validación veterinaria.';
        auditar('Mascota', m.id_mascota, m.estado_validacion_vet, 'Pendiente', s, 'Cambio de datos médicos');
        notificarTodasLasClinicas('ValidacionVet', 'Ficha por validar', m.nombre + ' (' + m.paw_patita_id + ') fue actualizada y requiere validación.', m.id_mascota);
      }
      actualizarFila('mascotas', m._fila, patch);
      return { exito: true, id_mascota: m.id_mascota, paw_id: m.paw_patita_id, mensaje: msg };
    }
    var idM = 'PET-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
    var paw = codigoAleatorioUnico('PAW-', 'mascotas', 'paw_patita_id', 4);
    datos.id_mascota = idM; datos.paw_patita_id = paw; datos.id_propietario = s.id_usuario; datos.estado_validacion_vet = 'Pendiente';
    datos.id_clinica_validadora = ''; datos.observacion_veterinaria = ''; datos.fecha_registro = ahoraStr();
    insertarFila('mascotas', datos);
    auditar('Mascota', idM, '', 'Pendiente', s, 'Ficha creada ' + paw);
    notificarTodasLasClinicas('ValidacionVet', 'Nueva ficha por validar', datos.nombre + ' (' + paw + ') espera validación veterinaria.', idM);
    return { exito: true, id_mascota: idM, paw_id: paw, mensaje: '¡Ficha creada con el código ' + paw + '! Una clínica aliada la validará pronto.' };
  });
}

function apiPropHistorialMascota(token, idMascota) {
  return lectura(function () {
    var s = requerirSesion(token, ['Propietario']);
    var m = buscarPor('mascotas', 'id_mascota', idMascota);
    exigir(m && m.id_propietario === s.id_usuario, 'No tienes acceso a esta ficha.');
    var cl = mapaPor('clinicas_veterinarias', 'id_clinica'), vals = filtrarPor('validaciones_veterinarias', 'id_mascota', idMascota), incs = filtrarPor('incidencias_emergencias', 'id_mascota', idMascota), ev = [], i;
    for (i = 0; i < vals.length; i++) {
      ev.push({ tipo: 'Validación', fecha: vals[i].fecha_validacion, titulo: 'Validación veterinaria: ' + vals[i].resultado, clinica: cl[vals[i].id_clinica] ? cl[vals[i].id_clinica].nombre : '', detalle: 'Vacunas: ' + (vals[i].vacunas_verificadas || '-') + (vals[i].vigencia_hasta ? ' | Vigencia hasta ' + fechaCorta(vals[i].vigencia_hasta) : '') + ' | ' + (vals[i].observaciones_medicas || '') });
    }
    for (i = 0; i < incs.length; i++) {
      ev.push({ tipo: 'S.O.S.', fecha: incs[i].fecha_incidencia, titulo: incs[i].tipo_incidencia + ' (' + incs[i].nivel_severidad + ') - ' + incs[i].estado_alerta, clinica: cl[incs[i].id_clinica_derivada] ? cl[incs[i].id_clinica_derivada].nombre : '', detalle: (incs[i].diagnostico_clinico ? 'Diagnóstico: ' + incs[i].diagnostico_clinico + '. ' : '') + (incs[i].tratamiento_aplicado ? 'Tratamiento: ' + incs[i].tratamiento_aplicado + '. ' : '') + (incs[i].informe_resolucion || incs[i].descripcion) });
    }
    ev.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    return { exito: true, mascota: vistaMascota(m), eventos: ev };
  });
}

function apiPropResumen(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Propietario']);
    var mas = filtrarPor('mascotas', 'id_propietario', s.id_usuario), val = 0, pen = 0, i;
    for (i = 0; i < mas.length; i++) { if (mas[i].estado_validacion_vet === 'Validado') { val++; } else if (mas[i].estado_validacion_vet === 'Pendiente') { pen++; } }
    var ctx = contextoReservas(), res = filtrarPor('reservas', 'id_propietario', s.id_usuario), act = [], hoy = hoyStr();
    for (i = 0; i < res.length; i++) { if (ESTADOS_OCUPAN.indexOf(res[i].estado_reserva) !== -1) { act.push(vistaReserva(res[i], ctx, 'Propietario')); } }
    act.sort(function (a, b) { return a.fecha_inicio > b.fecha_inicio ? 1 : -1; });
    var ids = {}; for (i = 0; i < res.length; i++) { ids[res[i].id_reserva] = true; }
    var sos = filtrar('incidencias_emergencias', function (x) { return ids[x.id_reserva] && x.estado_alerta !== 'Resuelta'; });
    return { exito: true, mascotas_total: mas.length, mascotas_validadas: val, mascotas_pendientes: pen, reservas_activas: act.length, proximas: act.slice(0, 3), sos_activos: sos.length, hoy: hoy };
  });
}

function apiPropCotizar(token, q) {
  return lectura(function () {
    var usuario, query;
    if (typeof token === 'object' && token !== null && !q) {
      query = token;
      usuario = { subtipo_propietario: query.es_turista ? 'Turista' : 'Local' };
    } else {
      var s = requerirSesion(token, ['Propietario', 'Administrador']);
      usuario = s.usuario;
      query = q;
    }
    var c = calcularCotizacion(usuario, query);
    c.exito = true;
    return c;
  });
}

function solapaReserva(idMascota, ini, fin, excluir) {
  var finEf = diffDias(ini, fin) <= 0 ? sumarDias(ini, 1) : fin;
  var l = filtrar('reservas', function (x) { return x.id_mascota === idMascota && ESTADOS_OCUPAN.indexOf(x.estado_reserva) !== -1 && x.id_reserva !== excluir; });
  for (var i = 0; i < l.length; i++) {
    var a = fechaCorta(l[i].fecha_inicio), b = fechaCorta(l[i].fecha_fin);
    if (diffDias(a, b) <= 0) { b = sumarDias(a, 1); }
    if (ini < b && a < finEf) { return l[i]; }
  }
  return null;
}

function apiPropCrearReserva(token, r, p) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario']), u = s.usuario;
    exigir(r && p, 'Datos de reserva incompletos.');
    exigir(r.acepta_tyc === true, 'Debes aceptar los Términos y Condiciones y la política de cancelación para reservar.');
    var m = buscarPor('mascotas', 'id_mascota', r.id_mascota);
    exigir(m && m.id_propietario === u.id_usuario, 'Selecciona una de tus mascotas.');
    exigir(m.estado_validacion_vet === 'Validado', 'La ficha de ' + m.nombre + ' aún no está validada por una clínica veterinaria aliada.');
    exigir(!(m.fecha_venc_vacunas && fechaCorta(m.fecha_venc_vacunas) < hoyStr()), 'Las vacunas de ' + m.nombre + ' están vencidas. Actualiza su ficha.');
    var cot = calcularCotizacion(u, r);
    exigir(cot.disponibilidad.ok, 'El cuidador no tiene disponibilidad: ' + cot.disponibilidad.motivos.join(' '));
    exigir(!cot.cupon_error, cot.cupon_error);
    exigir(!solapaReserva(m.id_mascota, r.fecha_inicio, r.fecha_fin, ''), m.nombre + ' ya tiene una reserva activa en esas fechas.');
    var metodo = String(p.metodo || '');
    exigir(['Yape', 'Plin', 'Tarjeta', 'Transferencia'].indexOf(metodo) !== -1, 'Selecciona un medio de pago válido.');
    var numOp = String(limpiar(p.numero_operacion) || ''), l4 = '';
    if (metodo === 'Tarjeta') {
      l4 = String(p.ultimos_4 || '');
      exigir(/^\d{4}$/.test(l4), 'Ingresa un número de tarjeta válido.');
      exigir(l4 !== '0000', 'La tarjeta fue rechazada por el banco emisor (simulación). Intenta con otra tarjeta.');
      numOp = 'OP-' + Math.floor(100000 + Math.random() * 900000);
    } else {
      exigir(numOp.length >= 4, 'Ingresa el código de aprobación o número de operación del pago.');
    }
    var of = buscarPor('servicios', 'id_oferta', r.id_oferta), perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', of.id_cuidador), ahora = ahoraStr();
    var idR = siguienteId('RES-', 'reservas', 'id_reserva', 4), cod = codigoAleatorioUnico('COD-', 'reservas', 'codigo_reserva', 4);
    var idP = siguienteId('PAY-', 'pagos', 'id_pago', 3), idL = siguienteId('LIQ-', 'liquidaciones_cuidadores', 'id_liquidacion', 3);
    var ver = aceptarTyc(u.id_usuario, ['General', 'Reserva'], 'Reserva', idR);
    insertarFila('reservas', {
      id_reserva: idR, codigo_reserva: cod, id_propietario: u.id_usuario, modalidad_cliente: cot.segmento, id_cuidador: of.id_cuidador, id_oferta: of.id_oferta, id_mascota: m.id_mascota,
      fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, dias_calculados: cot.dias, tarifa_unitaria: cot.tarifa, subtotal_base: cot.subtotal_base, id_temporada: cot.id_temporada, ajuste_temporada: cot.ajuste_temporada,
      id_cupon: cot.cupon ? cot.cupon.id_cupon : '', descuento_cupon: cot.descuento, extras_detalle: cot.extras_detalle, extras_monto: cot.extras_monto, monto_total: cot.total, moneda_referencial: cot.segmento === 'Turista' ? 'USD' : 'PEN',
      estado_reserva: 'Pendiente Confirmación', tyc_version_aceptada: ver, notas_propietario: limpiar(r.notas), fecha_solicitud: ahora
    });
    var numComp = 'B001-' + ('000000' + (leerTabla('pagos').rows.length + 101)).slice(-6);
    insertarFila('pagos', {
      id_pago: idP, id_reserva: idR, metodo_pago: metodo, pasarela_simulacion: 'Simulada v4', num_operacion: numOp, ultimos_4_digitos: l4, monto_bruto: cot.total, comision_porcentaje: COMISION * 100,
      comision_plataforma: cot.comision, monto_neto_cuidador: cot.neto, monto_reembolsado: 0, penalidad_retenida: 0, estado_pago: 'Aprobado', tipo_comprobante: p.tipo_comprobante === 'Factura' ? 'Factura' : 'Boleta',
      num_comprobante: numComp, comprobante_url: FOTO_DEFAULT_POSTIMG, fecha_pago: ahora
    });
    insertarFila('liquidaciones_cuidadores', {
      id_liquidacion: idL, id_cuidador: of.id_cuidador, id_pago: idP, id_reserva: idR, tipo_concepto: 'Servicio Finalizado', monto_liquidado: cot.neto,
      cuenta_destino: (perfil.cuenta_cobro_tipo ? perfil.cuenta_cobro_tipo + ' ' + perfil.cuenta_cobro_numero : ''), estado_liquidacion: 'En Garantía'
    });
    if (cot.cupon) { var cp = buscarPor('cupones_promocionales', 'id_cupon', cot.cupon.id_cupon); actualizarFila('cupones_promocionales', cp._fila, { usos_actuales: num(cp.usos_actuales) + 1 }); }
    sincronizarAgenda(of.id_cuidador, fechasOcupadas(r.fecha_inicio, r.fecha_fin));
    auditar('Reserva', idR, '', 'Pendiente Confirmación', s, 'Reserva creada y pago ' + metodo + ' aprobado (S/ ' + cot.total.toFixed(2) + ')');
    notificar(perfil.id_usuario, 'Reserva', 'Nueva solicitud de reserva', nombreDe(u) + ' solicitó ' + cod + ' del ' + r.fecha_inicio + ' al ' + r.fecha_fin + ' para ' + m.nombre + '. Acepta o rechaza la solicitud.', idR);
    notificar(u.id_usuario, 'Pago', 'Pago aprobado', 'Tu pago de S/ ' + cot.total.toFixed(2) + ' fue aprobado. Esperando la confirmación del cuidador (' + cod + ').', idR);
    return {
      exito: true, id_reserva: idR, codigo: cod, cotizacion: cot, mensaje: '¡Reserva ' + cod + ' registrada! El cuidador debe confirmarla.',
      comprobante: { numero: numComp, tipo: p.tipo_comprobante === 'Factura' ? 'Factura' : 'Boleta', metodo: metodo, operacion: numOp, fecha: ahora, cliente: nombreDe(u), documento: String(u.num_documento), total: cot.total }
    };
  });
}

function apiPropReservas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Propietario']);
    var ctx = contextoReservas(), l = filtrarPor('reservas', 'id_propietario', s.id_usuario), out = [];
    l.sort(function (a, b) { return a.fecha_solicitud < b.fecha_solicitud ? 1 : -1; });
    for (var i = 0; i < l.length; i++) { out.push(vistaReserva(l[i], ctx, 'Propietario')); }
    return { exito: true, reservas: out };
  });
}

function reservaPropia(ses, idReserva) {
  var r = buscarPor('reservas', 'id_reserva', idReserva);
  exigir(r && r.id_propietario === ses.id_usuario, 'La reserva no existe o no te pertenece.');
  return r;
}

function apiPropPrevCancelacion(token, idReserva) {
  return lectura(function () {
    var s = requerirSesion(token, ['Propietario']), r = reservaPropia(s, idReserva);
    exigir(r.estado_reserva === 'Pendiente Confirmación' || r.estado_reserva === 'Confirmada', 'Esta reserva ya no puede cancelarse (estado: ' + r.estado_reserva + ').');
    var c = calcularCancelacion(r, new Date().getTime());
    c.exito = true; c.codigo = r.codigo_reserva;
    return c;
  });
}

function apiPropCancelar(token, idReserva, motivo) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario']), r = reservaPropia(s, idReserva);
    exigir(String(motivo || '').replace(/\s/g, '').length >= 3, 'Indica el motivo de la cancelación.');
    exigir(r.estado_reserva === 'Pendiente Confirmación' || r.estado_reserva === 'Confirmada', 'Esta reserva ya no puede cancelarse (estado: ' + r.estado_reserva + ').');
    var calc = calcularCancelacion(r, new Date().getTime()), pago = buscarPor('pagos', 'id_reserva', r.id_reserva);
    var idCan = ejecutarCancelacion(r, pago, calc, s, 'Cancelación', limpiar(motivo));
    return { exito: true, id_cancelacion: idCan, calculo: calc, mensaje: 'Reserva cancelada. ' + calc.regla + '. Reembolso a procesar: S/ ' + calc.reembolso.toFixed(2) + '.' };
  });
}

function apiAbrirDisputa(token, idReserva, motivo) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario', 'Cuidador']);
    exigir(String(motivo || '').replace(/\s/g, '').length >= 10, 'Describe el motivo de la disputa (mínimo 10 caracteres).');
    var r = buscarPor('reservas', 'id_reserva', idReserva), esProp = false;
    exigir(r, 'La reserva no existe.');
    if (s.rol === 'Propietario') { esProp = r.id_propietario === s.id_usuario; }
    else { var pc = buscarPor('perfiles_cuidadores', 'id_usuario', s.id_usuario); esProp = !!pc && pc.id_cuidador === r.id_cuidador; }
    exigir(esProp, 'La reserva no existe o no te pertenece.');
    var hace72 = r.fecha_checkout && (new Date().getTime() - msDeFechaHora(r.fecha_checkout)) <= 72 * 3600000;
    exigir(r.estado_reserva === 'En Curso' || (r.estado_reserva === 'Finalizada' && hace72), 'Solo puedes abrir disputas en servicios En Curso o dentro de las 72 horas posteriores a su finalización.');
    var antes = r.estado_reserva, pago = buscarPor('pagos', 'id_reserva', idReserva);
    actualizarFila('reservas', r._fila, { estado_reserva: 'En Disputa' });
    if (pago) {
      actualizarFila('pagos', pago._fila, { estado_pago: 'En Disputa' });
      var liq = buscarPor('liquidaciones_cuidadores', 'id_pago', pago.id_pago);
      if (liq && (liq.estado_liquidacion === 'Disponible' || liq.estado_liquidacion === 'Solicitado')) { actualizarFila('liquidaciones_cuidadores', liq._fila, { estado_liquidacion: 'En Garantía', fecha_solicitud_retiro: '' }); }
    }
    var idCan = siguienteId('CAN-', 'cancelaciones_reembolsos', 'id_cancelacion', 3);
    insertarFila('cancelaciones_reembolsos', {
      id_cancelacion: idCan, id_reserva: idReserva, id_pago: pago ? pago.id_pago : '', solicitado_por: s.id_usuario, tipo_caso: 'Disputa', horas_anticipacion: 0,
      regla_aplicada: 'Disputa abierta por ' + (s.rol === 'Propietario' ? 'el propietario' : 'el cuidador'), motivo: limpiar(motivo), porcentaje_reembolso: 0, monto_reembolso: 0,
      monto_penalidad_plataforma: 0, monto_compensacion_cuidador: 0, estado_tramite: 'Pendiente Revisión', fecha_solicitud: ahoraStr()
    });
    auditar('Reserva', idReserva, antes, 'En Disputa', s, motivo);
    notificarAdmins('Cancelacion', 'Disputa abierta', r.codigo_reserva + ': ' + limpiar(motivo), idCan);
    var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', r.id_cuidador);
    notificar(s.rol === 'Propietario' ? perfil.id_usuario : r.id_propietario, 'Cancelacion', 'Disputa abierta', 'Se abrió una disputa en la reserva ' + r.codigo_reserva + '. El administrador la resolverá.', idCan);
    return { exito: true, id_cancelacion: idCan, mensaje: 'Disputa registrada. El administrador revisará el caso y los fondos quedan retenidos.' };
  });
}

function apiPropResena(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario']);
    exigir(d, 'Datos incompletos.');
    var r = reservaPropia(s, d.id_reserva);
    exigir(r.estado_reserva === 'Finalizada', 'Solo puedes calificar servicios finalizados.');
    exigir(!buscarPor('reseñas', 'id_reserva', r.id_reserva), 'Ya calificaste esta reserva.');
    var pu = Math.round(num(d.puntualidad, 0)), co = Math.round(num(d.comunicacion, 0)), cu = Math.round(num(d.cuidado, 0));
    exigir(pu >= 1 && pu <= 5 && co >= 1 && co <= 5 && cu >= 1 && cu <= 5, 'Califica puntualidad, comunicación y cuidado con 1 a 5 estrellas.');
    exigir(String(d.comentario || '').replace(/\s/g, '').length >= 5, 'Escribe un breve comentario sobre el servicio.');
    var prom = Math.min(5, Math.max(1, Math.round((pu + co + cu) / 3)));
    var idRev = siguienteId('REV-', 'reseñas', 'id_resena', 4);
    insertarFila('reseñas', {
      id_resena: idRev, id_reserva: r.id_reserva, id_propietario: s.id_usuario, id_cuidador: r.id_cuidador, calificacion_estrellas: prom, puntualidad_estrellas: pu, comunicacion_estrellas: co,
      cuidado_estrellas: cu, comentario: limpiar(d.comentario), respuesta_cuidador: '', visible: 'Sí', fecha_resena: ahoraStr()
    });
    recalcularReputacion(r.id_cuidador);
    var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', r.id_cuidador);
    notificar(perfil.id_usuario, 'Reserva', 'Nueva reseña', 'Recibiste ' + prom + ' estrellas en ' + r.codigo_reserva + '.', idRev);
    auditar('Reseña', idRev, '', 'Publicada', s, prom + ' estrellas');
    return { exito: true, mensaje: '¡Gracias por tu calificación! La reputación del cuidador fue actualizada.' };
  });
}

function recalcularReputacion(idCuid) {
  var l = filtrar('reseñas', function (x) { return x.id_cuidador === idCuid && x.visible !== 'No'; }), suma = 0;
  for (var i = 0; i < l.length; i++) { suma += num(l[i].calificacion_estrellas); }
  var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', idCuid);
  if (perfil && l.length) { actualizarFila('perfiles_cuidadores', perfil._fila, { reputacion_promedio: Math.round(suma / l.length * 10) / 10, total_resenas: l.length }); }
}

function armarPostsMuro(reservas) {
  var ids = {}, i;
  for (i = 0; i < reservas.length; i++) { ids[reservas[i].id_reserva] = reservas[i]; }
  var reps = filtrar('reportes_seguimiento', function (x) { return !!ids[x.id_reserva]; });
  var fotos = {}, ft = leerTabla('fotos_reporte').rows;
  for (i = 0; i < ft.length; i++) { if (!fotos[ft[i].id_reporte]) { fotos[ft[i].id_reporte] = []; } fotos[ft[i].id_reporte].push(urlImagen(ft[i].foto_url)); }
  var mc = mapaPor('mascotas', 'id_mascota'), pc = mapaPor('perfiles_cuidadores', 'id_cuidador'), us = mapaPor('usuarios', 'id_usuario'), posts = [];
  reps.sort(function (a, b) { return a.fecha_hora < b.fecha_hora ? 1 : -1; });
  for (i = 0; i < reps.length; i++) {
    var rs = ids[reps[i].id_reserva], cu = pc[reps[i].id_cuidador] || {};
    posts.push({
      id_reporte: reps[i].id_reporte, id_reserva: rs.id_reserva, codigo: rs.codigo_reserva, mascota: mc[rs.id_mascota] ? mc[rs.id_mascota].nombre : '', cuidador: nombreDe(us[cu.id_usuario]),
      fecha: reps[i].fecha_hora, evento: reps[i].tipo_evento, animo: reps[i].estado_animo_mascota, ubicacion: reps[i].ubicacion_referencial, nota: reps[i].nota_estado,
      fotos: fotos[reps[i].id_reporte] || [], nuevo: reps[i].visto_por_propietario !== 'Sí'
    });
  }
  return posts;
}

function apiPropMuro(token) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario']);
    var posts = armarPostsMuro(filtrarPor('reservas', 'id_propietario', s.id_usuario));
    var rows = leerTabla('reportes_seguimiento').rows, mios = {};
    for (var i = 0; i < posts.length; i++) { mios[posts[i].id_reporte] = posts[i].nuevo; }
    for (var j = 0; j < rows.length; j++) { if (mios[rows[j].id_reporte]) { actualizarFila('reportes_seguimiento', rows[j]._fila, { visto_por_propietario: 'Sí' }); } }
    return { exito: true, posts: posts };
  });
}

// ---------- S.O.S. (propietario y cuidador) ----------

function apiSosContexto(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Propietario', 'Cuidador']), l, i;
    var ctx = contextoReservas(), cid = '';
    if (s.rol === 'Propietario') { l = filtrarPor('reservas', 'id_propietario', s.id_usuario); }
    else { var pc = buscarPor('perfiles_cuidadores', 'id_usuario', s.id_usuario); cid = pc ? pc.id_cuidador : '-'; l = filtrarPor('reservas', 'id_cuidador', cid); }
    var activas = [], ids = {};
    for (i = 0; i < l.length; i++) { ids[l[i].id_reserva] = true; if (l[i].estado_reserva === 'En Curso' || l[i].estado_reserva === 'Confirmada') { activas.push(vistaReserva(l[i], ctx, s.rol)); } }
    var cl = filtrar('clinicas_veterinarias', function (x) { return x.activa === 'Sí' && x.estado_afiliacion === 'Activa'; }), clin = [], mapaCl = {};
    for (i = 0; i < cl.length; i++) { mapaCl[cl[i].id_clinica] = cl[i]; clin.push({ id_clinica: cl[i].id_clinica, nombre: cl[i].nombre, telefono: String(cl[i].telefono_emergencia), distrito: cl[i].distrito_cusco, horario: cl[i].horario_atencion, direccion: cl[i].direccion }); }
    var incs = filtrar('incidencias_emergencias', function (x) { return ids[x.id_reserva]; }), out = [];
    incs.sort(function (a, b) { return a.fecha_incidencia < b.fecha_incidencia ? 1 : -1; });
    for (i = 0; i < incs.length; i++) {
      var rr = ctx.mascotas[incs[i].id_mascota] || {};
      out.push({
        id: incs[i].id_incidencia, id_reserva: incs[i].id_reserva, mascota: rr.nombre || '', severidad: incs[i].nivel_severidad, tipo: incs[i].tipo_incidencia, descripcion: incs[i].descripcion, estado: incs[i].estado_alerta,
        clinica: mapaCl[incs[i].id_clinica_derivada] ? mapaCl[incs[i].id_clinica_derivada].nombre : incs[i].id_clinica_derivada, diagnostico: incs[i].diagnostico_clinico, tratamiento: incs[i].tratamiento_aplicado,
        informe: incs[i].informe_resolucion, costo: num(incs[i].costo_atencion_ref), fecha: incs[i].fecha_incidencia, fecha_resolucion: incs[i].fecha_resolucion
      });
    }
    return { exito: true, reservas_activas: activas, clinicas: clin, incidencias: out };
  });
}

function apiCrearSOS(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Propietario', 'Cuidador']);
    exigir(d && d.id_reserva, 'Selecciona la reserva afectada.');
    var r = buscarPor('reservas', 'id_reserva', d.id_reserva), propia = false;
    exigir(r, 'La reserva no existe.');
    if (s.rol === 'Propietario') { propia = r.id_propietario === s.id_usuario; }
    else { var pc = buscarPor('perfiles_cuidadores', 'id_usuario', s.id_usuario); propia = !!pc && pc.id_cuidador === r.id_cuidador; }
    exigir(propia, 'Solo puedes activar el S.O.S. en tus propias reservas.');
    exigir(r.estado_reserva === 'En Curso' || r.estado_reserva === 'Confirmada', 'El S.O.S. solo está disponible en reservas Confirmadas o En Curso.');
    exigir(['Leve', 'Moderada', 'Crítica'].indexOf(d.nivel_severidad) !== -1, 'Selecciona el nivel de severidad.');
    exigir(String(d.descripcion || '').replace(/\s/g, '').length >= 8, 'Describe los síntomas o la situación (mínimo 8 caracteres).');
    var cl = buscarPor('clinicas_veterinarias', 'id_clinica', d.id_clinica);
    exigir(cl && cl.activa === 'Sí' && cl.estado_afiliacion === 'Activa', 'Selecciona una clínica aliada activa.');
    var m = buscarPor('mascotas', 'id_mascota', r.id_mascota), id = siguienteId('INC-', 'incidencias_emergencias', 'id_incidencia', 2);
    insertarFila('incidencias_emergencias', {
      id_incidencia: id, id_reserva: r.id_reserva, id_mascota: r.id_mascota, reportado_por_usuario: s.id_usuario, nivel_severidad: d.nivel_severidad, tipo_incidencia: limpiar(d.tipo_incidencia) || 'Emergencia veterinaria',
      descripcion: limpiar(d.descripcion), estado_alerta: 'Activa', id_clinica_derivada: cl.id_clinica, fecha_incidencia: ahoraStr()
    });
    auditar('Incidencia', id, '', 'Activa', s, d.nivel_severidad + ': ' + limpiar(d.descripcion));
    var titulo = 'S.O.S. ' + d.nivel_severidad + ': ' + (m ? m.nombre : '');
    notificarClinica(cl.id_clinica, 'SOS', titulo, id + ' - ' + limpiar(d.descripcion), id);
    notificarAdmins('SOS', titulo, id + ' derivada a ' + cl.nombre, id);
    var perfil = buscarPor('perfiles_cuidadores', 'id_cuidador', r.id_cuidador);
    if (s.rol === 'Propietario') { notificar(perfil.id_usuario, 'SOS', titulo, 'El propietario activó el S.O.S. en ' + r.codigo_reserva + '.', id); }
    else { notificar(r.id_propietario, 'SOS', titulo, 'El cuidador activó el S.O.S. en ' + r.codigo_reserva + '. Derivado a ' + cl.nombre + '.', id); }
    return { exito: true, id_incidencia: id, clinica: cl.nombre, telefono: String(cl.telefono_emergencia), mensaje: 'Alerta S.O.S. ' + id + ' enviada a ' + cl.nombre + '. Llama al ' + cl.telefono_emergencia + ' si es crítico.' };
  });
}

// ============================================================================
// 8. MÓDULO CUIDADOR INDEPENDIENTE
// ============================================================================

function cuidadorDe(ses) {
  var pc = buscarPor('perfiles_cuidadores', 'id_usuario', ses.id_usuario);
  exigir(pc, 'No se encontró tu perfil de cuidador.');
  return pc;
}
function exigirCuidadorAprobado(pc) {
  exigir(pc.estado_postulacion === 'Aprobado', 'Tu perfil aún no está aprobado por el administrador (estado: ' + pc.estado_postulacion + ').');
}
function reservaDeCuidador(pc, idReserva) {
  var r = buscarPor('reservas', 'id_reserva', idReserva);
  exigir(r && r.id_cuidador === pc.id_cuidador, 'La reserva no existe o no está asignada a tu perfil.');
  return r;
}
function liqsDeCuidador(idCuid) { return filtrarPor('liquidaciones_cuidadores', 'id_cuidador', idCuid); }
function totalesBilletera(idCuid) {
  var l = liqsDeCuidador(idCuid), t = { en_garantia: 0, disponible: 0, solicitado: 0, retirado: 0 };
  for (var i = 0; i < l.length; i++) {
    var m = num(l[i].monto_liquidado), e = l[i].estado_liquidacion;
    if (e === 'En Garantía') { t.en_garantia += m; } else if (e === 'Disponible') { t.disponible += m; } else if (e === 'Solicitado') { t.solicitado += m; } else if (e === 'Liquidado') { t.retirado += m; }
  }
  for (var k in t) { if (t.hasOwnProperty(k)) { t[k] = redondear(t[k]); } }
  return t;
}

function apiCuidDashboard(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), i;
    var ant = null, as = filtrarPor('antecedentes_cuidadores', 'id_cuidador', pc.id_cuidador);
    if (as.length) { ant = as[as.length - 1]; }
    var ctx = contextoReservas(), res = filtrarPor('reservas', 'id_cuidador', pc.id_cuidador);
    var pend = 0, curso = 0, fin = 0, proximas = [], meses = {}, rechazos = 0;
    var canc = leerTabla('cancelaciones_reembolsos').rows;
    var mios = {}; for (i = 0; i < res.length; i++) { mios[res[i].id_reserva] = true; }
    for (i = 0; i < canc.length; i++) { if (mios[canc[i].id_reserva] && canc[i].tipo_caso === 'Rechazo Cuidador') { rechazos++; } }
    var pagos = mapaPor('pagos', 'id_reserva');
    for (i = 0; i < res.length; i++) {
      var e = res[i].estado_reserva;
      if (e === 'Pendiente Confirmación') { pend++; } else if (e === 'En Curso') { curso++; } else if (e === 'Finalizada') { fin++; }
      if (e === 'Confirmada' || e === 'En Curso' || e === 'Pendiente Confirmación') { proximas.push(vistaReserva(res[i], ctx, 'Cuidador')); }
      if (e !== 'Cancelada' && pagos[res[i].id_reserva]) {
        var mes = fechaCorta(res[i].fecha_inicio).substring(0, 7);
        meses[mes] = (meses[mes] || 0) + num(pagos[res[i].id_reserva].monto_neto_cuidador);
      }
    }
    proximas.sort(function (a, b) { return a.fecha_inicio > b.fecha_inicio ? 1 : -1; });
    var claves = []; for (var mk in meses) { if (meses.hasOwnProperty(mk)) { claves.push(mk); } }
    claves.sort();
    var grafico = []; for (i = Math.max(0, claves.length - 6); i < claves.length; i++) { grafico.push({ mes: claves[i], neto: redondear(meses[claves[i]]) }); }
    var tot = totalesBilletera(pc.id_cuidador);
    return {
      exito: true, id_cuidador: pc.id_cuidador, estado_postulacion: pc.estado_postulacion, motivo_estado: pc.motivo_estado, estado_antecedentes: ant ? ant.estado_verificacion : 'Pendiente', obs_antecedentes: ant ? ant.observaciones_admin : '',
      reputacion: num(pc.reputacion_promedio, 5), total_resenas: num(pc.total_resenas), capacidad: num(pc.capacidad_max_mascotas, 1), pendientes: pend, en_curso: curso, finalizadas: fin,
      tasa_aceptacion: res.length ? Math.round(100 * (res.length - rechazos) / res.length) : 100, saldo: tot, grafico: grafico, proximas: proximas.slice(0, 5), temporada: resolverTemporada(hoyStr())
    };
  });
}

function apiCuidReservas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    var ctx = contextoReservas(), l = filtrarPor('reservas', 'id_cuidador', pc.id_cuidador), out = [];
    l.sort(function (a, b) { return a.fecha_solicitud < b.fecha_solicitud ? 1 : -1; });
    for (var i = 0; i < l.length; i++) { out.push(vistaReserva(l[i], ctx, 'Cuidador')); }
    return { exito: true, reservas: out };
  });
}

function apiCuidResponderReserva(token, idReserva, accion, motivo) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigirCuidadorAprobado(pc);
    var r = reservaDeCuidador(pc, idReserva);
    exigir(r.estado_reserva === 'Pendiente Confirmación', 'La solicitud ya no está pendiente (estado: ' + r.estado_reserva + ').');
    if (accion === 'aceptar') {
      var ver = verificarDisponibilidad(pc.id_cuidador, fechaCorta(r.fecha_inicio), fechaCorta(r.fecha_fin), r.id_reserva);
      exigir(ver.ok || fechaCorta(r.fecha_inicio) < hoyStr(), 'No puedes aceptar: ' + ver.motivos.join(' '));
      actualizarFila('reservas', r._fila, { estado_reserva: 'Confirmada' });
      auditar('Reserva', r.id_reserva, r.estado_reserva, 'Confirmada', s, 'Aceptada por el cuidador');
      notificar(r.id_propietario, 'Reserva', 'Reserva confirmada', 'Tu reserva ' + r.codigo_reserva + ' fue aceptada por el cuidador.', r.id_reserva);
      return { exito: true, mensaje: 'Reserva ' + r.codigo_reserva + ' confirmada.' };
    }
    exigir(accion === 'rechazar', 'Acción no válida.');
    exigir(String(motivo || '').replace(/\s/g, '').length >= 3, 'Indica el motivo del rechazo.');
    var calc = calcularCancelacion(r, new Date().getTime()), pago = buscarPor('pagos', 'id_reserva', r.id_reserva);
    ejecutarCancelacion(r, pago, calc, s, 'Rechazo Cuidador', limpiar(motivo));
    return { exito: true, mensaje: 'Reserva rechazada. Se reembolsará el 100% al propietario.' };
  });
}

function apiCuidCheckIn(token, idReserva) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigirCuidadorAprobado(pc);
    var r = reservaDeCuidador(pc, idReserva);
    exigir(transicionPermitida(r.estado_reserva, 'En Curso'), 'Solo las reservas Confirmadas pueden iniciar (estado actual: ' + r.estado_reserva + ').');
    exigir(fechaCorta(r.fecha_inicio) <= hoyStr(), 'El check-in se habilita desde la fecha de ingreso (' + fechaCorta(r.fecha_inicio) + ').');
    actualizarFila('reservas', r._fila, { estado_reserva: 'En Curso', fecha_checkin: ahoraStr() });
    auditar('Reserva', r.id_reserva, r.estado_reserva, 'En Curso', s, 'Check-In realizado');
    notificar(r.id_propietario, 'Reserva', 'Servicio iniciado', 'El cuidador recibió a tu mascota (' + r.codigo_reserva + '). Pronto verás fotos en el muro.', r.id_reserva);
    return { exito: true, mensaje: 'Check-In registrado. ¡Recuerda enviar reportes con fotos!' };
  });
}

function apiCuidCheckOut(token, idReserva) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    var r = reservaDeCuidador(pc, idReserva);
    exigir(transicionPermitida(r.estado_reserva, 'Finalizada') && r.estado_reserva === 'En Curso', 'Solo las reservas En Curso pueden finalizarse (estado actual: ' + r.estado_reserva + ').');
    var ahora = ahoraStr();
    actualizarFila('reservas', r._fila, { estado_reserva: 'Finalizada', fecha_checkout: ahora });
    var pago = buscarPor('pagos', 'id_reserva', r.id_reserva);
    if (pago) {
      var liq = buscarPor('liquidaciones_cuidadores', 'id_pago', pago.id_pago);
      if (liq && liq.estado_liquidacion === 'En Garantía') { actualizarFila('liquidaciones_cuidadores', liq._fila, { estado_liquidacion: 'Disponible', fecha_disponible: ahora }); }
    }
    sincronizarAgenda(r.id_cuidador, fechasOcupadas(fechaCorta(r.fecha_inicio), fechaCorta(r.fecha_fin)));
    auditar('Reserva', r.id_reserva, 'En Curso', 'Finalizada', s, 'Check-Out realizado; saldo liberado a billetera');
    notificar(r.id_propietario, 'Reserva', 'Servicio finalizado', 'Tu mascota fue entregada (' + r.codigo_reserva + '). ¡Califica el servicio!', r.id_reserva);
    notificar(s.id_usuario, 'Pago', 'Saldo disponible', 'Se liberó el saldo de ' + r.codigo_reserva + ' a tu billetera.', r.id_reserva);
    return { exito: true, mensaje: 'Servicio finalizado. El saldo de la reserva ya está disponible en tu billetera.' };
  });
}

function apiCuidFichaMascota(token, idReserva) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), r = reservaDeCuidador(pc, idReserva);
    exigir(r.estado_reserva !== 'Cancelada', 'La reserva fue cancelada; la ficha ya no está disponible.');
    var m = buscarPor('mascotas', 'id_mascota', r.id_mascota), p = buscarPor('usuarios', 'id_usuario', r.id_propietario);
    return {
      exito: true, mascota: vistaMascota(m), propietario: { nombre: nombreDe(p), telefono: String(p.telefono), idioma: p.idioma_preferido, tipo: p.subtipo_propietario, pais: p.pais_origen, hotel: p.hospedaje_hotel_cusco, contacto: p.contacto_emergencia_nombre, contacto_tel: String(p.contacto_emergencia_tel) },
      notas: r.notas_propietario
    };
  });
}

// ---------- Agenda ----------

function upsertAgenda(idCuid, fecha, patch) {
  var fila = overridesAgenda(idCuid)[fecha];
  if (fila) { actualizarFila('disponibilidad_cuidadores', fila._fila, patch); return; }
  var base = { id_disp: siguienteId('DSP-', 'disponibilidad_cuidadores', 'id_disp', 4), id_cuidador: idCuid, fecha: fecha, estado_dia: 'Disponible', cupo_maximo_dia: 0, cupos_reservados: 0, nota_agenda: '' };
  for (var k in patch) { if (patch.hasOwnProperty(k)) { base[k] = patch[k]; } }
  insertarFila('disponibilidad_cuidadores', base);
}

function apiCuidAgenda(token, mes) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    return agendaMes(pc.id_cuidador, mes || mesActual(), true);
  });
}

function apiCuidGuardarPlantilla(token, diasStr) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), dias = listaCsv(diasStr), ok = [];
    for (var i = 0; i < DIAS_LABORABLES.length; i++) { if (dias.indexOf(DIAS_LABORABLES[i]) !== -1) { ok.push(DIAS_LABORABLES[i]); } }
    exigir(ok.length > 0, 'Debes mantener al menos un día de la semana disponible.');
    actualizarFila('perfiles_cuidadores', pc._fila, { disponibilidad_semanal: ok.join(',') });
    return { exito: true, plantilla: ok.join(','), mensaje: 'Plantilla semanal actualizada (' + ok.join(', ') + ').' };
  });
}

function apiCuidAjustarFecha(token, fecha, accion, cupo, nota) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigir(esFechaValida(fecha) && fecha >= hoyStr(), 'Selecciona una fecha válida a partir de hoy.');
    var ocup = ocupacionCuidador(pc.id_cuidador, ''), n = ocup[fecha] ? ocup[fecha].length : 0, cap = Math.max(1, num(pc.capacidad_max_mascotas, 1));
    if (accion === 'bloquear') {
      exigir(n === 0, 'No puedes bloquear una fecha con ' + n + ' reserva(s) activa(s). Cancélalas o rechaza las solicitudes primero.');
      upsertAgenda(pc.id_cuidador, fecha, { estado_dia: 'Bloqueado', cupo_maximo_dia: 0, cupos_reservados: 0, nota_agenda: limpiar(nota) || 'Descanso / vacaciones' });
      auditar('Agenda', pc.id_cuidador + '@' + fecha, 'Disponible', 'Bloqueado', s, limpiar(nota));
      return { exito: true, mensaje: 'Fecha ' + fecha + ' bloqueada.' };
    }
    if (accion === 'liberar') {
      upsertAgenda(pc.id_cuidador, fecha, { estado_dia: n >= cap ? 'Lleno' : (n > 0 ? 'Parcial' : 'Disponible'), cupo_maximo_dia: cap, cupos_reservados: n, nota_agenda: '' });
      return { exito: true, mensaje: 'Fecha ' + fecha + ' habilitada nuevamente.' };
    }
    exigir(accion === 'cupo', 'Acción no válida.');
    var c = Math.round(num(cupo, 0));
    exigir(c >= Math.max(1, n) && c <= 10, 'El cupo debe estar entre ' + Math.max(1, n) + ' y 10 mascotas.');
    upsertAgenda(pc.id_cuidador, fecha, { estado_dia: n >= c ? 'Lleno' : (n > 0 ? 'Parcial' : 'Disponible'), cupo_maximo_dia: c, cupos_reservados: n, nota_agenda: limpiar(nota) });
    return { exito: true, mensaje: 'Cupo del ' + fecha + ' ajustado a ' + c + '.' };
  });
}

// ---------- Perfil público, ofertas y antecedentes ----------

function apiCuidPerfil(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), u = s.usuario;
    var as = filtrarPor('antecedentes_cuidadores', 'id_cuidador', pc.id_cuidador), ant = as.length ? as[as.length - 1] : null;
    var sv = filtrarPor('servicios', 'id_cuidador', pc.id_cuidador), servicios = [];
    for (var i = 0; i < sv.length; i++) {
      servicios.push({ id_oferta: sv[i].id_oferta, hu_ecode: sv[i].hu_ecode, categoria: sv[i].categoria, tipo_servicio: sv[i].tipo_servicio, descripcion: sv[i].descripcion_servicio, tarifa: num(sv[i].tarifa_diaria_por_perro), recojo: sv[i].incluye_recojo_hotel === 'Sí', tarifa_recojo: num(sv[i].tarifa_recojo_extra), disponible: sv[i].disponible === 'Sí' });
    }
    return {
      exito: true,
      perfil: { id_cuidador: pc.id_cuidador, nombre: nombreDe(u), distrito: u.distrito_cusco, estado: pc.estado_postulacion, motivo: pc.motivo_estado, experiencia: pc.descripcion_experiencia, especialidades: pc.especialidades, idiomas: pc.idiomas, vivienda: pc.tipo_vivienda, capacidad: num(pc.capacidad_max_mascotas, 1), foto_url: urlImagen(pc.foto_url), foto_hogar_url: urlImagen(pc.foto_hogar_url), cuenta_tipo: pc.cuenta_cobro_tipo, cuenta_numero: String(pc.cuenta_cobro_numero), reputacion: num(pc.reputacion_promedio, 5), total_resenas: num(pc.total_resenas) },
      antecedentes: ant ? { estado: ant.estado_verificacion, observaciones: ant.observaciones_admin, fecha_carga: ant.fecha_carga, fecha_revision: ant.fecha_revision, identidad: ant.doc_identidad_url, policial: ant.doc_antecedentes_policiales_url, penal: ant.doc_antecedentes_penales_url } : null,
      servicios: servicios
    };
  });
}

function apiCuidGuardarPerfil(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigir(d && limpiar(d.experiencia), 'Escribe tu biografía y experiencia.');
    var cap = Math.round(num(d.capacidad, 1));
    exigir(cap >= 1 && cap <= 10, 'La capacidad máxima debe estar entre 1 y 10 mascotas.');
    actualizarFila('perfiles_cuidadores', pc._fila, {
      descripcion_experiencia: limpiar(d.experiencia), especialidades: limpiar(d.especialidades), idiomas: limpiar(d.idiomas) || 'ES', tipo_vivienda: limpiar(d.vivienda), capacidad_max_mascotas: cap,
      foto_url: urlImagen(d.foto_url), foto_hogar_url: urlImagen(d.foto_hogar_url), cuenta_cobro_tipo: ['Yape', 'Plin', 'CCI'].indexOf(d.cuenta_tipo) !== -1 ? d.cuenta_tipo : pc.cuenta_cobro_tipo, cuenta_cobro_numero: limpiar(d.cuenta_numero) || pc.cuenta_cobro_numero
    });
    return { exito: true, mensaje: 'Perfil público actualizado.' };
  });
}

function apiCuidReenviarAntecedentes(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigir(pc.estado_postulacion === 'Observado' || pc.estado_postulacion === 'Rechazado' || pc.estado_postulacion === 'Pendiente', 'Tu perfil no requiere recarga de documentos.');
    exigir(d && esUrl(d.doc_identidad_url) && esUrl(d.doc_policial_url) && esUrl(d.doc_penal_url), 'Adjunta los tres enlaces (https://...) de tus documentos.');
    var as = filtrarPor('antecedentes_cuidadores', 'id_cuidador', pc.id_cuidador), ahora = ahoraStr();
    var patch = { doc_identidad_url: d.doc_identidad_url, doc_antecedentes_policiales_url: d.doc_policial_url, doc_antecedentes_penales_url: d.doc_penal_url, estado_verificacion: 'Pendiente', observaciones_admin: '', fecha_carga: ahora, fecha_revision: '' };
    if (as.length) { actualizarFila('antecedentes_cuidadores', as[as.length - 1]._fila, patch); }
    else { patch.id_antecedente = siguienteId('ANT-', 'antecedentes_cuidadores', 'id_antecedente', 2); patch.id_cuidador = pc.id_cuidador; insertarFila('antecedentes_cuidadores', patch); }
    actualizarFila('perfiles_cuidadores', pc._fila, { estado_postulacion: 'Pendiente', motivo_estado: 'Documentos reenviados, en revisión' });
    auditar('Cuidador', pc.id_cuidador, pc.estado_postulacion, 'Pendiente', s, 'Documentos reenviados');
    notificarAdmins('Aprobacion', 'Documentos reenviados', nombreDe(s.usuario) + ' reenvió sus antecedentes para revisión.', pc.id_cuidador);
    return { exito: true, mensaje: 'Documentos enviados. El administrador volverá a revisarlos.' };
  });
}

function apiCuidGuardarServicio(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigir(d && CATEGORIAS.indexOf(d.categoria) !== -1, 'Selecciona una categoría de servicio.');
    exigir(limpiar(d.tipo_servicio), 'Escribe el nombre de la modalidad de cuidado.');
    var tarifa = num(d.tarifa, 0);
    exigir(tarifa >= 10 && tarifa <= 500, 'La tarifa diaria debe estar entre S/ 10 y S/ 500.');
    var rec = d.recojo ? 'Sí' : 'No', trec = rec === 'Sí' ? Math.max(0, num(d.tarifa_recojo, 0)) : 0;
    var datos = { categoria: d.categoria, tipo_servicio: limpiar(d.tipo_servicio), descripcion_servicio: limpiar(d.descripcion) || 'Servicio de cuidado canino responsable.', tarifa_diaria_por_perro: tarifa, incluye_recojo_hotel: rec, tarifa_recojo_extra: trec, disponible: d.disponible === false ? 'No' : 'Sí' };
    if (d.id_oferta) {
      var o = buscarPor('servicios', 'id_oferta', d.id_oferta);
      exigir(o && o.id_cuidador === pc.id_cuidador, 'No puedes editar esta oferta.');
      actualizarFila('servicios', o._fila, datos);
      return { exito: true, hu_ecode: o.hu_ecode, mensaje: 'Oferta ' + o.hu_ecode + ' actualizada.' };
    }
    datos.id_oferta = siguienteId('OF-', 'servicios', 'id_oferta', 3); datos.hu_ecode = siguienteId('HU-', 'servicios', 'hu_ecode', 3); datos.id_cuidador = pc.id_cuidador;
    insertarFila('servicios', datos);
    return { exito: true, hu_ecode: datos.hu_ecode, mensaje: 'Nueva modalidad publicada con el código ' + datos.hu_ecode + '.' };
  });
}

function apiCuidToggleServicio(token, idOferta) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), o = buscarPor('servicios', 'id_oferta', idOferta);
    exigir(o && o.id_cuidador === pc.id_cuidador, 'No puedes modificar esta oferta.');
    var nuevo = o.disponible === 'Sí' ? 'No' : 'Sí';
    actualizarFila('servicios', o._fila, { disponible: nuevo });
    return { exito: true, disponible: nuevo === 'Sí', mensaje: 'Oferta ' + o.hu_ecode + (nuevo === 'Sí' ? ' activada.' : ' pausada.') };
  });
}

// ---------- Reportes fotográficos ----------

function apiCuidReporte(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigir(d, 'Datos incompletos.');
    var r = reservaDeCuidador(pc, d.id_reserva);
    exigir(r.estado_reserva === 'En Curso', 'Solo puedes publicar reportes en reservas En Curso.');
    exigir(String(d.nota || '').replace(/\s/g, '').length >= 5, 'Escribe un mensaje de bienestar para el propietario.');
    var urls = [], src = d.fotos || [], i;
    for (i = 0; i < src.length && urls.length < 3; i++) { if (esUrl(src[i])) { urls.push(String(src[i])); } }
    exigir(urls.length > 0, 'Adjunta al menos un enlace directo de foto (PostImg, https://i.postimg.cc/...).');
    var id = siguienteId('REP-', 'reportes_seguimiento', 'id_reporte', 2), ahora = ahoraStr();
    insertarFila('reportes_seguimiento', {
      id_reporte: id, id_reserva: r.id_reserva, id_cuidador: pc.id_cuidador, fecha_hora: ahora.substring(0, 16), tipo_evento: limpiar(d.tipo_evento) || 'Paseo y Bienestar',
      estado_animo_mascota: limpiar(d.animo) || 'Tranquilo', ubicacion_referencial: limpiar(d.ubicacion), nota_estado: limpiar(d.nota), visto_por_propietario: 'No'
    });
    for (i = 0; i < urls.length; i++) {
      insertarFila('fotos_reporte', { id_foto: siguienteId('FOT-', 'fotos_reporte', 'id_foto', 4), id_reporte: id, foto_url: urls[i], descripcion_foto: limpiar(d.tipo_evento), fecha_subida: ahora });
    }
    var m = buscarPor('mascotas', 'id_mascota', r.id_mascota);
    notificar(r.id_propietario, 'Reserva', 'Nuevo reporte de ' + (m ? m.nombre : 'tu mascota'), limpiar(d.nota), id);
    return { exito: true, id_reporte: id, mensaje: 'Reporte publicado en el muro en vivo del propietario.' };
  });
}

function apiCuidReportes(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    return { exito: true, posts: armarPostsMuro(filtrarPor('reservas', 'id_cuidador', pc.id_cuidador)) };
  });
}

function apiCuidResponderResena(token, idResena, texto) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), r = buscarPor('reseñas', 'id_resena', idResena);
    exigir(r && r.id_cuidador === pc.id_cuidador, 'La reseña no existe.');
    exigir(String(texto || '').replace(/\s/g, '').length >= 3, 'Escribe tu respuesta.');
    actualizarFila('reseñas', r._fila, { respuesta_cuidador: limpiar(texto) });
    return { exito: true, mensaje: 'Respuesta publicada.' };
  });
}

function apiCuidResenas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s), us = mapaPor('usuarios', 'id_usuario');
    var l = filtrarPor('reseñas', 'id_cuidador', pc.id_cuidador), out = [];
    for (var i = 0; i < l.length; i++) { out.push({ id: l[i].id_resena, estrellas: num(l[i].calificacion_estrellas), puntualidad: num(l[i].puntualidad_estrellas), comunicacion: num(l[i].comunicacion_estrellas), cuidado: num(l[i].cuidado_estrellas), comentario: l[i].comentario, respuesta: l[i].respuesta_cuidador, fecha: fechaCorta(l[i].fecha_resena), autor: us[l[i].id_propietario] ? us[l[i].id_propietario].nombre : '' }); }
    out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    return { exito: true, resenas: out };
  });
}

// ---------- Billetera ----------

function apiCuidBilletera(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    var res = mapaPor('reservas', 'id_reserva'), l = liqsDeCuidador(pc.id_cuidador), movs = [];
    l.sort(function (a, b) { return a.id_liquidacion < b.id_liquidacion ? 1 : -1; });
    for (var i = 0; i < l.length; i++) {
      var r = res[l[i].id_reserva] || {};
      movs.push({ id: l[i].id_liquidacion, codigo: r.codigo_reserva || '', concepto: l[i].tipo_concepto, monto: num(l[i].monto_liquidado), estado: l[i].estado_liquidacion, cuenta: l[i].cuenta_destino, operacion: l[i].num_operacion_desembolso, fecha_disponible: l[i].fecha_disponible, fecha_retiro: l[i].fecha_solicitud_retiro, fecha_liquidacion: l[i].fecha_liquidacion });
    }
    var tot = totalesBilletera(pc.id_cuidador);
    return { exito: true, totales: tot, billetera: { saldo_disponible: tot.disponible, saldo_en_garantia: tot.en_garantia, total_retirado: tot.retirado, liquidaciones: movs }, movimientos: movs, cuenta_tipo: pc.cuenta_cobro_tipo, cuenta_numero: String(pc.cuenta_cobro_numero), temporada: resolverTemporada(hoyStr()), comision: COMISION };
  });
}

function apiCuidSolicitarRetiro(token, cuentaTipo, cuentaNumero) {
  return escribir(function () {
    var s = requerirSesion(token, ['Cuidador']), pc = cuidadorDe(s);
    exigir(['Yape', 'Plin', 'CCI'].indexOf(cuentaTipo) !== -1, 'Selecciona el tipo de cuenta de cobro.');
    exigir(String(cuentaNumero || '').replace(/\s/g, '').length >= 6, 'Ingresa un número de cuenta o celular válido.');
    var disp = filtrar('liquidaciones_cuidadores', function (x) { return x.id_cuidador === pc.id_cuidador && x.estado_liquidacion === 'Disponible' && num(x.monto_liquidado) > 0; }), total = 0, ahora = ahoraStr();
    exigir(disp.length > 0, 'No tienes saldo disponible para retirar.');
    var destino = cuentaTipo + ' ' + String(cuentaNumero).replace(/\s/g, '');
    for (var i = 0; i < disp.length; i++) {
      total += num(disp[i].monto_liquidado);
      actualizarFila('liquidaciones_cuidadores', disp[i]._fila, { estado_liquidacion: 'Solicitado', fecha_solicitud_retiro: ahora, cuenta_destino: destino });
      auditar('Liquidación', disp[i].id_liquidacion, 'Disponible', 'Solicitado', s, 'Retiro solicitado a ' + destino);
    }
    total = redondear(total);
    actualizarFila('perfiles_cuidadores', pc._fila, { cuenta_cobro_tipo: cuentaTipo, cuenta_cobro_numero: String(cuentaNumero).replace(/\s/g, '') });
    notificarAdmins('Pago', 'Retiro solicitado', nombreDe(s.usuario) + ' solicitó retirar S/ ' + total.toFixed(2) + ' a ' + destino + '.', pc.id_cuidador);
    return { exito: true, monto: total, mensaje: 'Retiro de S/ ' + total.toFixed(2) + ' solicitado. El administrador lo procesará pronto.' };
  });
}

// ============================================================================
// 9. MÓDULO CLÍNICA VETERINARIA ALIADA
// ============================================================================

function clinicaDe(ses) {
  exigir(ses.usuario.id_clinica_asociada, 'Tu cuenta no está vinculada a una clínica.');
  var c = buscarPor('clinicas_veterinarias', 'id_clinica', ses.usuario.id_clinica_asociada);
  exigir(c, 'La clínica asociada no existe.');
  exigir(c.activa === 'Sí' && c.estado_afiliacion === 'Activa', 'Tu clínica no está activa en la red (estado: ' + c.estado_afiliacion + ').');
  return c;
}

function vistaIncidencia(x, mc, rs, us, pc) {
  var m = mc[x.id_mascota] || {}, r = rs[x.id_reserva] || {}, prop = us[r.id_propietario] || {}, cu = pc[r.id_cuidador] || {}, cuU = us[cu.id_usuario] || {};
  return {
    id: x.id_incidencia, id_reserva: x.id_reserva, codigo: r.codigo_reserva || '', id_mascota: x.id_mascota, mascota: m.nombre || '', paw_id: m.paw_patita_id || '', raza: m.raza || '', peso: num(m.peso_kg), alergias: m.alergias_restricciones || '',
    medicacion: m.medicacion_actual || '', foto: urlImagen(m.foto_url), severidad: x.nivel_severidad, tipo: x.tipo_incidencia, descripcion: x.descripcion, estado: x.estado_alerta, id_clinica: x.id_clinica_derivada,
    propietario: nombreDe(prop), propietario_tel: String(prop.telefono || ''), cuidador: nombreDe(cuU), cuidador_tel: String(cuU.telefono || ''), diagnostico: x.diagnostico_clinico, tratamiento: x.tratamiento_aplicado,
    informe: x.informe_resolucion, costo: num(x.costo_atencion_ref), fecha: x.fecha_incidencia, fecha_atencion: x.fecha_atencion, fecha_resolucion: x.fecha_resolucion
  };
}
function pesoSeveridad(s) { return s === 'Crítica' ? 0 : (s === 'Moderada' ? 1 : 2); }

function apiVetDashboard(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Veterinaria']), c = clinicaDe(s), mes = mesActual();
    var incs = filtrarPor('incidencias_emergencias', 'id_clinica_derivada', c.id_clinica), act = 0, crit = 0, res = 0, i;
    for (i = 0; i < incs.length; i++) {
      if (incs[i].estado_alerta !== 'Resuelta') { act++; if (incs[i].nivel_severidad === 'Crítica') { crit++; } }
      else if (String(incs[i].fecha_resolucion).substring(0, 7) === mes) { res++; }
    }
    var pend = filtrar('mascotas', function (m) { return m.estado_validacion_vet === 'Pendiente'; }).length;
    var vals = filtrar('validaciones_veterinarias', function (v) { return v.id_clinica === c.id_clinica && String(v.fecha_validacion).substring(0, 7) === mes; }).length;
    return { exito: true, clinica: { id_clinica: c.id_clinica, nombre: c.nombre, direccion: c.direccion, telefono: String(c.telefono_emergencia), horario: c.horario_atencion, especialidades: c.especialidades, tarifa: num(c.tarifa_consulta_emergencia), distrito: c.distrito_cusco }, sos_activos: act, criticos: crit, fichas_pendientes: pend, validadas_mes: vals, resueltos_mes: res };
  });
}

function apiVetFichas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Veterinaria']);
    clinicaDe(s);
    var us = mapaPor('usuarios', 'id_usuario'), l = filtrar('mascotas', function (m) { return m.estado_validacion_vet === 'Pendiente'; }), out = [];
    for (var i = 0; i < l.length; i++) {
      var v = vistaMascota(l[i]), p = us[l[i].id_propietario] || {};
      v.propietario = nombreDe(p); v.propietario_tel = String(p.telefono || ''); out.push(v);
    }
    return { exito: true, fichas: out };
  });
}

function apiVetValidarFicha(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Veterinaria']), c = clinicaDe(s);
    exigir(d && d.id_mascota, 'Selecciona una ficha.');
    var m = buscarPor('mascotas', 'id_mascota', d.id_mascota);
    exigir(m && m.estado_validacion_vet === 'Pendiente', 'La ficha no está pendiente de validación.');
    exigir(d.resultado === 'Validado' || d.resultado === 'Observado', 'Selecciona el dictamen (Validado u Observado).');
    var obs = limpiar(d.observaciones) || '', vigencia = '';
    if (d.resultado === 'Validado') {
      exigir(String(d.vacunas || '').replace(/\s/g, '').length >= 3, 'Indica las vacunas verificadas.');
      exigir(esFechaValida(d.vigencia) && d.vigencia > hoyStr(), 'Indica la fecha de vigencia de las vacunas (posterior a hoy).');
      vigencia = d.vigencia;
    } else { exigir(obs.length >= 5, 'Describe las observaciones o vacunas faltantes para que el propietario corrija la ficha.'); }
    var idV = siguienteId('VAL-', 'validaciones_veterinarias', 'id_validacion', 2);
    insertarFila('validaciones_veterinarias', { id_validacion: idV, id_mascota: m.id_mascota, id_clinica: c.id_clinica, id_usuario_vet: s.id_usuario, resultado: d.resultado, vacunas_verificadas: limpiar(d.vacunas), vigencia_hasta: vigencia, observaciones_medicas: obs, fecha_validacion: ahoraStr() });
    var patch = { estado_validacion_vet: d.resultado, id_clinica_validadora: c.id_clinica, observacion_veterinaria: obs };
    if (d.resultado === 'Validado') { patch.fecha_venc_vacunas = vigencia; patch.cartilla_vacunas_al_dia = 'Sí'; }
    actualizarFila('mascotas', m._fila, patch);
    auditar('Mascota', m.id_mascota, 'Pendiente', d.resultado, s, c.nombre + (obs ? ': ' + obs : ''));
    notificar(m.id_propietario, 'ValidacionVet', d.resultado === 'Validado' ? '¡Ficha validada!' : 'Ficha observada', m.nombre + ' (' + m.paw_patita_id + '): ' + (d.resultado === 'Validado' ? 'validada por ' + c.nombre + ' hasta ' + vigencia + '.' : obs), m.id_mascota);
    return { exito: true, id_validacion: idV, mensaje: 'Dictamen registrado: ' + m.nombre + ' ' + (d.resultado === 'Validado' ? 'validada oficialmente.' : 'observada.') };
  });
}

function apiVetSOS(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Veterinaria']), c = clinicaDe(s);
    var mc = mapaPor('mascotas', 'id_mascota'), rs = mapaPor('reservas', 'id_reserva'), us = mapaPor('usuarios', 'id_usuario'), pc = mapaPor('perfiles_cuidadores', 'id_cuidador');
    var l = filtrarPor('incidencias_emergencias', 'id_clinica_derivada', c.id_clinica), out = [];
    for (var i = 0; i < l.length; i++) { out.push(vistaIncidencia(l[i], mc, rs, us, pc)); }
    out.sort(function (a, b) {
      var ra = a.estado === 'Resuelta' ? 1 : 0, rb = b.estado === 'Resuelta' ? 1 : 0;
      if (ra !== rb) { return ra - rb; }
      if (pesoSeveridad(a.severidad) !== pesoSeveridad(b.severidad)) { return pesoSeveridad(a.severidad) - pesoSeveridad(b.severidad); }
      return a.fecha < b.fecha ? 1 : -1;
    });
    return { exito: true, casos: out, incidencias: out };
  });
}

function incidenciaDeClinica(c, id) {
  var x = buscarPor('incidencias_emergencias', 'id_incidencia', id);
  exigir(x && x.id_clinica_derivada === c.id_clinica, 'La alerta no existe o no fue derivada a tu clínica.');
  return x;
}

function apiVetTomarCaso(token, idInc) {
  return escribir(function () {
    var s = requerirSesion(token, ['Veterinaria']), c = clinicaDe(s), x = incidenciaDeClinica(c, idInc);
    exigir(x.estado_alerta === 'Activa', 'El caso ya fue tomado (estado: ' + x.estado_alerta + ').');
    actualizarFila('incidencias_emergencias', x._fila, { estado_alerta: 'En Atención Clínica', atendido_por_vet_usuario: s.id_usuario, fecha_atencion: ahoraStr() });
    auditar('Incidencia', idInc, 'Activa', 'En Atención Clínica', s, c.nombre);
    var r = buscarPor('reservas', 'id_reserva', x.id_reserva), pcu = r ? buscarPor('perfiles_cuidadores', 'id_cuidador', r.id_cuidador) : null;
    if (r) { notificar(r.id_propietario, 'SOS', 'Tu alerta está en atención', c.nombre + ' tomó el caso ' + idInc + '.', idInc); }
    if (pcu) { notificar(pcu.id_usuario, 'SOS', 'Alerta en atención', c.nombre + ' tomó el caso ' + idInc + '.', idInc); }
    notificarAdmins('SOS', 'Alerta en atención clínica', idInc + ' fue tomada por ' + c.nombre + '.', idInc);
    return { exito: true, mensaje: 'Caso ' + idInc + ' tomado. Estado: En Atención Clínica.' };
  });
}

function apiVetActualizarCaso(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Veterinaria']), c = clinicaDe(s);
    exigir(d && d.id_incidencia, 'Selecciona un caso.');
    var x = incidenciaDeClinica(c, d.id_incidencia), antes = x.estado_alerta;
    exigir(antes === 'En Atención Clínica' || antes === 'Estabilizada', 'Primero debes tomar el caso (estado actual: ' + antes + ').');
    var trat = limpiar(d.tratamiento) || '', diag = limpiar(d.diagnostico) || '', inf = limpiar(d.informe) || '', costo = Math.max(0, num(d.costo, 0));
    var patch;
    if (d.accion === 'estabilizar') {
      exigir(antes === 'En Atención Clínica', 'El caso ya fue estabilizado.');
      exigir(trat.length >= 5, 'Registra el triage o tratamiento inicial aplicado.');
      patch = { estado_alerta: 'Estabilizada', tratamiento_aplicado: trat };
    } else {
      exigir(d.accion === 'resolver', 'Acción no válida.');
      exigir(diag.length >= 5 && trat.length >= 5 && inf.length >= 5, 'Completa diagnóstico, tratamiento e informe de alta.');
      patch = { estado_alerta: 'Resuelta', diagnostico_clinico: diag, tratamiento_aplicado: trat, informe_resolucion: inf, costo_atencion_ref: costo, fecha_resolucion: ahoraStr() };
    }
    actualizarFila('incidencias_emergencias', x._fila, patch);
    auditar('Incidencia', x.id_incidencia, antes, patch.estado_alerta, s, diag || trat);
    var r = buscarPor('reservas', 'id_reserva', x.id_reserva), pcu = r ? buscarPor('perfiles_cuidadores', 'id_cuidador', r.id_cuidador) : null;
    var msg = patch.estado_alerta === 'Resuelta' ? 'Caso resuelto: ' + diag : 'Mascota estabilizada: ' + trat;
    if (r) { notificar(r.id_propietario, 'SOS', 'Actualización clínica ' + x.id_incidencia, msg, x.id_incidencia); }
    if (pcu) { notificar(pcu.id_usuario, 'SOS', 'Actualización clínica ' + x.id_incidencia, msg, x.id_incidencia); }
    if (patch.estado_alerta === 'Resuelta') { notificarAdmins('SOS', 'Alerta resuelta', x.id_incidencia + ' fue resuelta por ' + c.nombre + '.', x.id_incidencia); }
    return { exito: true, estado: patch.estado_alerta, mensaje: patch.estado_alerta === 'Resuelta' ? 'Caso resuelto y registrado en el historial médico.' : 'Caso marcado como Estabilizado.' };
  });
}

function apiVetGuardarPerfil(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Veterinaria']), c = clinicaDe(s);
    exigir(d && String(d.telefono || '').replace(/\s/g, '').length >= 6, 'Ingresa un teléfono de emergencia válido.');
    actualizarFila('clinicas_veterinarias', c._fila, { horario_atencion: d.horario === '24 Horas' ? '24 Horas' : 'Diurno', telefono_emergencia: limpiar(d.telefono), especialidades: limpiar(d.especialidades), tarifa_consulta_emergencia: Math.max(0, num(d.tarifa, 0)), direccion: limpiar(d.direccion) || c.direccion });
    invalidarCache();
    return { exito: true, mensaje: 'Perfil de la clínica actualizado.' };
  });
}


// ============================================================================
// 10. MÓDULO ADMINISTRADOR DE RED
// ============================================================================

function apiAdminDashboard(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var u = leerTabla('usuarios').rows;
    var r = leerTabla('reservas').rows;
    var p = leerTabla('pagos').rows;
    var c = leerTabla('perfiles_cuidadores').rows;
    var l = leerTabla('liquidaciones_cuidadores').rows;
    var inc = leerTabla('incidencias_emergencias').rows;
    var can = leerTabla('cancelaciones_reembolsos').rows;

    var totalUsuarios = u.length;
    var totalReservas = r.length;
    var reservasActivas = 0;
    var ingresosBrutos = 0;
    var comisionTotal = 0;
    var reembolsosTotales = 0;

    for (var i = 0; i < r.length; i++) {
      var est = r[i].estado_reserva;
      if (est === 'Pendiente Confirmación' || est === 'Confirmada' || est === 'En Curso') {
        reservasActivas++;
      }
      if (est === 'Confirmada' || est === 'En Curso' || est === 'Finalizada') {
        ingresosBrutos += num(r[i].monto_total, 0);
      }
    }

    for (var j = 0; j < p.length; j++) {
      if (p[j].estado_pago === 'Completado' || p[j].estado_pago === 'Parcialmente Reembolsado') {
        comisionTotal += num(p[j].comision_plataforma, 0);
        reembolsosTotales += num(p[j].monto_reembolsado, 0);
      }
    }

    var postulantesPendientes = 0;
    for (var k = 0; k < c.length; k++) {
      if (c[k].estado_postulacion === 'Pendiente') { postulantesPendientes++; }
    }

    var sosActivos = 0;
    for (var m = 0; m < inc.length; m++) {
      if (inc[m].estado_alerta === 'Activa' || inc[m].estado_alerta === 'En Atención Clínica') {
        sosActivos++;
      }
    }

    var retirosPendientes = 0;
    var montoRetirosPendientes = 0;
    for (var n = 0; n < l.length; n++) {
      if (l[n].estado_liquidacion === 'Solicitado') {
        retirosPendientes++;
        montoRetirosPendientes += num(l[n].monto_liquidado, 0);
      }
    }

    var cancelacionesPendientes = 0;
    for (var q = 0; q < can.length; q++) {
      if (can[q].estado_reembolso === 'Pendiente' || can[q].estado_reembolso === 'En Revisión') {
        cancelacionesPendientes++;
      }
    }

    // Datos agregados para Chart.js
    var porDistrito = {};
    for (var d = 0; d < u.length; d++) {
      var dist = u[d].distrito || 'Cusco';
      if (!porDistrito[dist]) { porDistrito[dist] = 0; }
      porDistrito[dist]++;
    }

    var porCategoria = { 'Paseo': 0, 'Hospedaje': 0, 'Guardería': 0, 'Domicilio Turístico': 0 };
    var servicios = leerTabla('servicios').rows;
    var srvMap = {};
    for (var sv = 0; sv < servicios.length; sv++) {
      srvMap[servicios[sv].id_oferta] = servicios[sv].categoria;
    }
    for (var ri = 0; ri < r.length; ri++) {
      var cat = srvMap[r[ri].id_oferta] || 'Paseo';
      if (typeof porCategoria[cat] === 'number') {
        porCategoria[cat]++;
      }
    }

    return {
      kpis: {
        totalUsuarios: totalUsuarios,
        totalReservas: totalReservas,
        reservasActivas: reservasActivas,
        ingresosBrutos: ingresosBrutos,
        comisionTotal: comisionTotal,
        reembolsosTotales: reembolsosTotales,
        postulantesPendientes: postulantesPendientes,
        sosActivos: sosActivos,
        retirosPendientes: retirosPendientes,
        montoRetirosPendientes: montoRetirosPendientes,
        cancelacionesPendientes: cancelacionesPendientes
      },
      charts: {
        distritos: porDistrito,
        categorias: porCategoria
      }
    };
  });
}

function apiAdminPostulantes(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var cuidadores = filtrar('perfiles_cuidadores', function (pc) {
      return pc.estado_postulacion === 'Pendiente';
    });
    var lista = [];
    for (var i = 0; i < cuidadores.length; i++) {
      var c = cuidadores[i];
      var u = buscarPor('usuarios', 'id_usuario', c.id_usuario);
      var ant = buscarPor('antecedentes_cuidadores', 'id_cuidador', c.id_cuidador);
      lista.push({
        id_cuidador: c.id_cuidador,
        id_usuario: c.id_usuario,
        nombre: u ? nombreDe(u) : 'Cuidador',
        email: u ? u.email : '',
        telefono: u ? u.telefono : '',
        distrito: u ? u.distrito : '',
        num_documento: u ? u.num_documento : '',
        biografia: c.biografia_detallada,
        anios_experiencia: c.anios_experiencia,
        capacidad_max: c.capacidad_max_mascotas,
        antecedente: ant ? {
          id_antecedente: ant.id_antecedente,
          policial: ant.enlace_comprobante_policial_postimg,
          domicilio: ant.enlace_comprobante_domicilio_postimg,
          estado: ant.estado_verificacion
        } : null
      });
    }
    return { postulantes: lista };
  });
}

function apiAdminAprobarCuidador(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && d.id_cuidador, 'Selecciona un cuidador.');
    var pc = buscarPor('perfiles_cuidadores', 'id_cuidador', d.id_cuidador);
    exigir(pc, 'El cuidador no existe.');
    var u = buscarPor('usuarios', 'id_usuario', pc.id_usuario);
    var antes = pc.estado_postulacion;
    var accion = d.accion; // 'aprobar' o 'rechazar'

    if (accion === 'aprobar') {
      actualizarFila('perfiles_cuidadores', pc._fila, { estado_postulacion: 'Aprobado', motivo_rechazo: '' });
      if (u) { actualizarFila('usuarios', u._fila, { estado_cuenta: 'Activo' }); }
      var ant = buscarPor('antecedentes_cuidadores', 'id_cuidador', pc.id_cuidador);
      if (ant) {
        actualizarFila('antecedentes_cuidadores', ant._fila, {
          estado_verificacion: 'Aprobado',
          observaciones_verificacion: 'Aprobado por el administrador.',
          fecha_verificacion: ahoraStr()
        });
      }
      auditar('Cuidador', pc.id_cuidador, antes, 'Aprobado', s, 'Postulación aprobada formalmente');
      notificar(pc.id_usuario, 'Aprobacion', '¡Postulación Aprobada!', 'Bienvenido a Paw Patita Cusco. Tu perfil ahora es público y puedes recibir reservas.', pc.id_cuidador);
      return { exito: true, mensaje: 'Cuidador ' + pc.id_cuidador + ' aprobado con éxito.' };
    } else if (accion === 'rechazar') {
      var mot = limpiar(d.motivo) || 'Antecedentes no verificados o documentación incompleta.';
      actualizarFila('perfiles_cuidadores', pc._fila, { estado_postulacion: 'Rechazado', motivo_rechazo: mot });
      var antRech = buscarPor('antecedentes_cuidadores', 'id_cuidador', pc.id_cuidador);
      if (antRech) {
        actualizarFila('antecedentes_cuidadores', antRech._fila, {
          estado_verificacion: 'Rechazado',
          observaciones_verificacion: mot,
          fecha_verificacion: ahoraStr()
        });
      }
      auditar('Cuidador', pc.id_cuidador, antes, 'Rechazado', s, mot);
      notificar(pc.id_usuario, 'Aprobacion', 'Postulación observada', 'Tu postulación fue rechazada: ' + mot + '. Puedes reenviar tus documentos desde tu perfil.', pc.id_cuidador);
      return { exito: true, mensaje: 'Postulación rechazada. Se notificó al cuidador con el motivo especificado.' };
    } else {
      fallar('Acción no permitida (debe ser aprobar o rechazar).');
    }
  });
}

function apiAdminClinicas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var clinicas = leerTabla('clinicas_veterinarias').rows;
    var inc = leerTabla('incidencias_emergencias').rows;
    var lista = [];
    for (var i = 0; i < clinicas.length; i++) {
      var c = clinicas[i];
      var atendidas = 0;
      for (var j = 0; j < inc.length; j++) {
        if (inc[j].id_clinica_derivada === c.id_clinica) { atendidas++; }
      }
      lista.push({
        id_clinica: c.id_clinica,
        nombre: c.nombre,
        ruc: c.ruc,
        direccion: c.direccion,
        distrito: c.distrito,
        telefono_emergencia: c.telefono_emergencia,
        horario_atencion: c.horario_atencion,
        especialidades: c.especialidades,
        tarifa_consulta: c.tarifa_consulta_emergencia,
        foto_url: c.foto_fachada_url,
        estado_afiliacion: c.estado_afiliacion,
        activa: c.activa,
        casos_atendidos: atendidas
      });
    }
    return { clinicas: lista };
  });
}

function apiAdminGuardarClinica(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && limpiar(d.nombre), 'Ingresa el nombre de la clínica.');
    exigir(limpiar(d.telefono_emergencia), 'Ingresa el teléfono de emergencia.');
    var idClinica = d.id_clinica;
    if (idClinica) {
      var c = buscarPor('clinicas_veterinarias', 'id_clinica', idClinica);
      exigir(c, 'Clínica no encontrada.');
      actualizarFila('clinicas_veterinarias', c._fila, {
        nombre: limpiar(d.nombre),
        ruc: limpiar(d.ruc) || c.ruc,
        direccion: limpiar(d.direccion) || c.direccion,
        distrito: d.distrito || c.distrito,
        telefono_emergencia: limpiar(d.telefono_emergencia),
        horario_atencion: d.horario_atencion || c.horario_atencion,
        especialidades: limpiar(d.especialidades) || c.especialidades,
        tarifa_consulta_emergencia: num(d.tarifa_consulta, c.tarifa_consulta_emergencia),
        foto_fachada_url: limpiar(d.foto_url) || c.foto_fachada_url,
        activa: d.activa !== undefined ? (d.activa ? true : false) : c.activa
      });
      auditar('Clinica', idClinica, 'Edición', 'Actualizada', s, 'Datos actualizados por Admin');
      return { exito: true, mensaje: 'Clínica actualizada correctamente.' };
    } else {
      var nuevoId = siguienteId('VET-', 'clinicas_veterinarias', 'id_clinica', 3);
      insertarFila('clinicas_veterinarias', {
        id_clinica: nuevoId,
        nombre: limpiar(d.nombre),
        ruc: limpiar(d.ruc) || '20000000001',
        direccion: limpiar(d.direccion) || 'Cusco',
        distrito: d.distrito || 'Cusco',
        telefono_emergencia: limpiar(d.telefono_emergencia),
        horario_atencion: d.horario_atencion || '24 Horas',
        especialidades: limpiar(d.especialidades) || 'Medicina General',
        tarifa_consulta_emergencia: num(d.tarifa_consulta, 60),
        foto_fachada_url: limpiar(d.foto_url) || FOTO_DEFAULT_POSTIMG,
        estado_afiliacion: 'Afiliada',
        activa: true
      });
      auditar('Clinica', nuevoId, 'Nueva', 'Afiliada', s, 'Clínica creada por Admin');
      return { exito: true, id_clinica: nuevoId, mensaje: 'Nueva clínica afiliada con éxito.' };
    }
  });
}

function apiAdminCancelaciones(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var cans = leerTabla('cancelaciones_reembolsos').rows;
    var lista = [];
    for (var i = 0; i < cans.length; i++) {
      var c = cans[i];
      var r = buscarPor('reservas', 'id_reserva', c.id_reserva);
      var u = buscarPor('usuarios', 'id_usuario', c.solicitado_por_usuario);
      lista.push({
        id_cancelacion: c.id_cancelacion,
        id_reserva: c.id_reserva,
        codigo_reserva: r ? r.codigo_reserva : c.id_reserva,
        solicitante: u ? nombreDe(u) : c.solicitado_por_usuario,
        motivo: c.motivo_cancelacion,
        horas_anticipacion: c.horas_anticipacion_al_inicio,
        regla: c.regla_aplicada,
        porcentaje_reembolso: c.porcentaje_reembolso,
        porcentaje_penalidad: c.porcentaje_penalidad,
        monto_reembolso: c.monto_reembolso_estimado,
        monto_penalidad: c.monto_penalidad_estimado,
        estado: c.estado_reembolso,
        fecha_solicitud: c.fecha_solicitud,
        fecha_resolucion: c.fecha_resolucion
      });
    }
    return { cancelaciones: lista };
  });
}

function apiAdminProcesarReembolso(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && d.id_cancelacion, 'Selecciona una solicitud.');
    var c = buscarPor('cancelaciones_reembolsos', 'id_cancelacion', d.id_cancelacion);
    exigir(c, 'Cancelación no encontrada.');
    exigir(c.estado_reembolso === 'Pendiente' || c.estado_reembolso === 'En Revisión', 'El reembolso ya fue procesado.');
    var r = buscarPor('reservas', 'id_reserva', c.id_reserva);
    var p = r ? buscarPor('pagos', 'id_reserva', r.id_reserva) : null;
    var accion = d.accion; // 'aprobar' o 'rechazar'

    if (accion === 'aprobar') {
      var montoReembolso = num(c.monto_reembolso_estimado, 0);
      actualizarFila('cancelaciones_reembolsos', c._fila, {
        estado_reembolso: 'Completado',
        fecha_resolucion: ahoraStr()
      });
      if (p) {
        var yaReembolsado = num(p.monto_reembolso, 0);
        var nuevoReembolso = yaReembolsado + montoReembolso;
        var nuevoEstadoPago = nuevoReembolso >= num(p.monto_bruto, 0) ? 'Reembolsado' : 'Parcialmente Reembolsado';
        actualizarFila('pagos', p._fila, {
          monto_reembolsado: nuevoReembolso,
          estado_pago: nuevoEstadoPago
        });
      }
      if (r && r.estado_reserva !== 'Cancelada') {
        actualizarFila('reservas', r._fila, { estado_reserva: 'Cancelada' });
      }
      auditar('Cancelacion', c.id_cancelacion, c.estado_reembolso, 'Completado', s, 'Reembolso ejecutado por Admin');
      if (r) {
        notificar(r.id_propietario, 'Cancelacion', 'Reembolso Aprobado', 'Tu reembolso de S/ ' + montoReembolso.toFixed(2) + ' para la reserva ' + r.codigo_reserva + ' ha sido ejecutado.', c.id_cancelacion);
      }
      return { exito: true, mensaje: 'Reembolso de S/ ' + montoReembolso.toFixed(2) + ' ejecutado y registrado.' };
    } else if (accion === 'rechazar') {
      var motivo = limpiar(d.motivo) || 'No cumple con las políticas de reembolso.';
      actualizarFila('cancelaciones_reembolsos', c._fila, {
        estado_reembolso: 'Rechazado',
        fecha_resolucion: ahoraStr()
      });
      auditar('Cancelacion', c.id_cancelacion, c.estado_reembolso, 'Rechazado', s, motivo);
      if (r) {
        notificar(r.id_propietario, 'Cancelacion', 'Reembolso Denegado', 'La solicitud de reembolso para ' + r.codigo_reserva + ' fue rechazada: ' + motivo, c.id_cancelacion);
      }
      return { exito: true, mensaje: 'Solicitud de reembolso rechazada.' };
    } else {
      fallar('Acción no permitida.');
    }
  });
}

function apiAdminLiquidaciones(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var liqs = leerTabla('liquidaciones_cuidadores').rows;
    var lista = [];
    for (var i = 0; i < liqs.length; i++) {
      var l = liqs[i];
      var pc = buscarPor('perfiles_cuidadores', 'id_cuidador', l.id_cuidador);
      var u = pc ? buscarPor('usuarios', 'id_usuario', pc.id_usuario) : null;
      lista.push({
        id_liquidacion: l.id_liquidacion,
        id_cuidador: l.id_cuidador,
        cuidador_nombre: u ? nombreDe(u) : l.id_cuidador,
        cuenta_tipo: pc ? pc.cuenta_cobro_tipo : 'Yape',
        cuenta_numero: pc ? pc.cuenta_cobro_numero : '',
        id_pago: l.id_pago,
        id_reserva: l.id_reserva,
        monto_liquidado: l.monto_liquidado,
        estado: l.estado_liquidacion,
        fecha_solicitud: l.fecha_solicitud,
        fecha_pago: l.fecha_pago,
        num_operacion: l.numero_operacion_pago
      });
    }
    return { liquidaciones: lista };
  });
}

function apiAdminLiquidar(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && d.id_liquidacion, 'Selecciona una liquidación.');
    var l = buscarPor('liquidaciones_cuidadores', 'id_liquidacion', d.id_liquidacion);
    exigir(l, 'Liquidación no encontrada.');
    exigir(l.estado_liquidacion === 'Solicitado' || l.estado_liquidacion === 'Pendiente', 'La liquidación ya fue procesada.');
    var pc = buscarPor('perfiles_cuidadores', 'id_cuidador', l.id_cuidador);
    var accion = d.accion; // 'pagar' o 'rechazar'

    if (accion === 'pagar') {
      var op = limpiar(d.num_operacion) || ('OP-' + Math.floor(Math.random() * 900000 + 100000));
      actualizarFila('liquidaciones_cuidadores', l._fila, {
        estado_liquidacion: 'Pagado',
        fecha_pago: ahoraStr(),
        numero_operacion_pago: op
      });
      auditar('Liquidacion', l.id_liquidacion, l.estado_liquidacion, 'Pagado', s, 'Transferencia OP: ' + op);
      if (pc) {
        notificar(pc.id_usuario, 'Pago', '¡Transferencia Exitosa!', 'Se transfirieron S/ ' + num(l.monto_liquidado, 0).toFixed(2) + ' a tu cuenta (' + op + ').', l.id_liquidacion);
      }
      return { exito: true, mensaje: 'Liquidación ' + l.id_liquidacion + ' marcada como Pagada con Op: ' + op };
    } else if (accion === 'rechazar') {
      var motivo = limpiar(d.motivo) || 'Cuenta no válida o datos inconsistentes.';
      actualizarFila('liquidaciones_cuidadores', l._fila, {
        estado_liquidacion: 'Rechazado'
      });
      auditar('Liquidacion', l.id_liquidacion, l.estado_liquidacion, 'Rechazado', s, motivo);
      if (pc) {
        notificar(pc.id_usuario, 'Pago', 'Liquidación observada', 'Tu solicitud de retiro de S/ ' + num(l.monto_liquidado, 0).toFixed(2) + ' fue rechazada: ' + motivo, l.id_liquidacion);
      }
      return { exito: true, mensaje: 'Liquidación rechazada y notificada al cuidador.' };
    } else {
      fallar('Acción no permitida.');
    }
  });
}

function apiAdminCupones(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var cups = leerTabla('cupones_promocionales').rows;
    return { cupones: cups };
  });
}

function apiAdminGuardarCupon(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && limpiar(d.codigo), 'Ingresa el código del cupón.');
    var cod = limpiar(d.codigo).toUpperCase();
    var idCupon = d.id_cupon;
    if (idCupon) {
      var cup = buscarPor('cupones_promocionales', 'id_cupon', idCupon);
      exigir(cup, 'Cupón no encontrado.');
      actualizarFila('cupones_promocionales', cup._fila, {
        codigo: cod,
        porcentaje_descuento: num(d.porcentaje_descuento, 0),
        monto_descuento_fijo: num(d.monto_descuento_fijo, 0),
        fecha_inicio: d.fecha_inicio || cup.fecha_inicio,
        fecha_fin: d.fecha_fin || cup.fecha_fin,
        usos_maximos: Math.floor(num(d.usos_maximos, 50)),
        segmento_objetivo: d.segmento_objetivo || 'Todos',
        activo: d.activo !== undefined ? (d.activo ? true : false) : cup.activo
      });
      auditar('Cupon', idCupon, 'Edición', 'Actualizado', s, cod);
      return { exito: true, mensaje: 'Cupón ' + cod + ' actualizado.' };
    } else {
      var nuevoId = siguienteId('CUP-', 'cupones_promocionales', 'id_cupon', 3);
      insertarFila('cupones_promocionales', {
        id_cupon: nuevoId,
        codigo: cod,
        porcentaje_descuento: num(d.porcentaje_descuento, 0),
        monto_descuento_fijo: num(d.monto_descuento_fijo, 0),
        fecha_inicio: d.fecha_inicio || hoyIso(),
        fecha_fin: d.fecha_fin || '2026-12-31',
        usos_maximos: Math.floor(num(d.usos_maximos, 50)),
        usos_actuales: 0,
        segmento_objetivo: d.segmento_objetivo || 'Todos',
        activo: true
      });
      auditar('Cupon', nuevoId, 'Nuevo', 'Activo', s, cod);
      return { exito: true, id_cupon: nuevoId, mensaje: 'Cupón ' + cod + ' creado.' };
    }
  });
}

function apiAdminTemporadas(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var temps = leerTabla('temporadas_tarifas').rows;
    return { temporadas: temps };
  });
}

function apiAdminGuardarTemporada(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && limpiar(d.nombre_temporada), 'Ingresa el nombre de la temporada.');
    var idTemp = d.id_temporada;
    if (idTemp) {
      var t = buscarPor('temporadas_tarifas', 'id_temporada', idTemp);
      exigir(t, 'Temporada no encontrada.');
      actualizarFila('temporadas_tarifas', t._fila, {
        nombre_temporada: limpiar(d.nombre_temporada),
        fecha_inicio: d.fecha_inicio || t.fecha_inicio,
        fecha_fin: d.fecha_fin || t.fecha_fin,
        factor_multiplicador: num(d.factor_multiplicador, 1.0),
        motivo_festivo: limpiar(d.motivo_festivo) || t.motivo_festivo,
        activa: d.activa !== undefined ? (d.activa ? true : false) : t.activa
      });
      auditar('Temporada', idTemp, 'Edición', 'Actualizada', s, d.nombre_temporada);
      return { exito: true, mensaje: 'Temporada ' + d.nombre_temporada + ' actualizada.' };
    } else {
      var nuevoId = siguienteId('TEMP-', 'temporadas_tarifas', 'id_temporada', 3);
      insertarFila('temporadas_tarifas', {
        id_temporada: nuevoId,
        nombre_temporada: limpiar(d.nombre_temporada),
        fecha_inicio: d.fecha_inicio || hoyIso(),
        fecha_fin: d.fecha_fin || hoyIso(),
        factor_multiplicador: num(d.factor_multiplicador, 1.2),
        motivo_festivo: limpiar(d.motivo_festivo) || 'Temporada turística Cusco',
        activa: true
      });
      auditar('Temporada', nuevoId, 'Nueva', 'Activa', s, d.nombre_temporada);
      return { exito: true, id_temporada: nuevoId, mensaje: 'Temporada ' + d.nombre_temporada + ' creada.' };
    }
  });
}

function apiAdminTyc(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var tycs = leerTabla('terminos_condiciones').rows;
    return { tyc: tycs };
  });
}

function apiAdminGuardarTyc(token, d) {
  return escribir(function () {
    var s = requerirSesion(token, ['Administrador']);
    exigir(d && limpiar(d.version), 'Ingresa la versión (ej. v4.1).');
    exigir(limpiar(d.titulo), 'Ingresa el título.');
    exigir(limpiar(d.contenido_resumen), 'Ingresa el contenido resumen.');
    var nuevoId = siguienteId('TYC-', 'terminos_condiciones', 'id_terminos', 3);

    // Desactivar versiones previas si esta se activa
    if (d.activo) {
      var antiguas = leerTabla('terminos_condiciones').rows;
      for (var i = 0; i < antiguas.length; i++) {
        if (antiguas[i].activo) {
          actualizarFila('terminos_condiciones', antiguas[i]._fila, { activo: false });
        }
      }
    }

    insertarFila('terminos_condiciones', {
      id_terminos: nuevoId,
      version: limpiar(d.version),
      fecha_vigencia: d.fecha_vigencia || hoyIso(),
      titulo: limpiar(d.titulo),
      contenido_resumen: limpiar(d.contenido_resumen),
      url_documento_completo: limpiar(d.url_documento_completo) || 'https://pawpatita.pe/terminos',
      activo: d.activo !== undefined ? (d.activo ? true : false) : true
    });
    auditar('TyC', nuevoId, 'Nueva', 'Publicada', s, d.version);
    return { exito: true, id_terminos: nuevoId, mensaje: 'Nueva versión de Términos ' + d.version + ' guardada.' };
  });
}

function apiAdminAuditoria(token, filtro) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var logs = leerTabla('auditoria_estados').rows;
    var res = [];
    var limit = 80;
    for (var i = logs.length - 1; i >= 0 && res.length < limit; i--) {
      var item = logs[i];
      if (filtro && filtro.entidad && item.entidad !== filtro.entidad) { continue; }
      res.push(item);
    }
    return { logs: res };
  });
}

function apiAdminSos(token) {
  return lectura(function () {
    var s = requerirSesion(token, ['Administrador']);
    var incs = leerTabla('incidencias_emergencias').rows;
    var lista = [];
    for (var i = 0; i < incs.length; i++) {
      var inc = incs[i];
      var m = buscarPor('mascotas', 'id_mascota', inc.id_mascota);
      var r = buscarPor('reservas', 'id_reserva', inc.id_reserva);
      var cl = buscarPor('clinicas_veterinarias', 'id_clinica', inc.id_clinica_derivada);
      var rep = buscarPor('usuarios', 'id_usuario', inc.reportado_por_usuario);
      lista.push({
        id_incidencia: inc.id_incidencia,
        id_reserva: inc.id_reserva,
        codigo_reserva: r ? r.codigo_reserva : inc.id_reserva,
        mascota_nombre: m ? m.nombre : 'Mascota',
        paw_id: m ? m.paw_patita_id : '',
        reportado_por: rep ? nombreDe(rep) : inc.reportado_por_usuario,
        descripcion: inc.descripcion_incidencia,
        gravedad: inc.gravedad,
        clinica_nombre: cl ? cl.nombre : inc.id_clinica_derivada,
        estado: inc.estado_alerta,
        diagnostico: inc.diagnostico_clinico,
        costo_atencion: inc.costo_atencion_ref,
        fecha_registro: inc.fecha_registro,
        fecha_resolucion: inc.fecha_resolucion
      });
    }
    return { incidencias: lista };
  });
}

// ============================================================================
// 11. SUITE DE PRUEBAS AUTOMATIZADAS (GAS & NODE MOCK)
// ============================================================================

function testSistemaCompleto() {
  var log = [];
  function afirmar(cond, desc) {
    if (!cond) {
      log.push('FALLA: ' + desc);
      throw new Error('Prueba fallida: ' + desc);
    }
    log.push('OK: ' + desc);
  }

  try {
    // 1. Esquema de pestañas requeridas
    var tablasReq = Object.keys(ESQUEMA_REQUERIDO);
    for (var i = 0; i < tablasReq.length; i++) {
      var nom = tablasReq[i];
      var t = leerTabla(nom);
      afirmar(t && t.keys && t.keys.length > 0, 'Pestaña ' + nom + ' accesible con encabezados');
      var cols = ESQUEMA_REQUERIDO[nom];
      for (var c = 0; c < cols.length; c++) {
        var colNorm = normalizarClave(cols[c]);
        afirmar(t.keys.indexOf(colNorm) !== -1, 'Columna ' + nom + '.' + cols[c] + ' existe');
      }
    }

    // 2. Seguridad y hashes
    var uAdmin = buscarPor('usuarios', 'email', 'admin@pawpatita.pe');
    afirmar(uAdmin && uAdmin.tipo_usuario === 'Administrador', 'Usuario Admin activo encontrado');
    afirmar(uAdmin.password_hash === hashPassword('admin123'), 'Hash de contraseña Admin coincide con SHA256(PAW::admin123)');

    var uProp = buscarPor('usuarios', 'email', 'angelo@gmail.com');
    afirmar(uProp && uProp.subtipo_propietario === 'Local', 'Propietario local encontrado');

    var uTur = buscarPor('usuarios', 'email', 'sofia.turista@gmail.com');
    afirmar(uTur && uTur.subtipo_propietario === 'Turista', 'Propietario turista encontrado');

    // 3. Catálogo público
    var cat = apiCatalogoPublico();
    afirmar(cat && cat.cuidadores && cat.cuidadores.length > 0, 'Catálogo público retorna cuidadores aprobados');

    // 4. Cotizador de tarifas
    var cot = apiPropCotizar({
      id_oferta: 'OF-101',
      fecha_inicio: '2026-06-23',
      fecha_fin: '2026-06-25',
      incluye_bano: true,
      cupon_codigo: 'MACHUPICCHU15',
      es_turista: true
    });
    afirmar(cot && cot.total > 0, 'Cotizador calcula monto total con temporada Inti Raymi');
    afirmar(cot.dias === 2, 'Cálculo de días correcto (2 días)');
    afirmar(cot.factor > 1.0, 'Factor de temporada aplicado para Inti Raymi');
    afirmar(cot.descuento > 0, 'Descuento de cupón aplicado');

    // 5. Motor de cancelaciones
    var resPrueba = { fecha_inicio: '2026-12-01', estado_reserva: 'Confirmada', monto_total: 100 };
    var tIni = inicioServicioMs('2026-12-01');
    var calc100 = calcularCancelacion(resPrueba, tIni - 72 * 3600000);
    afirmar(calc100.porcentaje_reembolso === 100 && calc100.reembolso === 100, 'Cancelación >48h devuelve 100%');
    var calc70 = calcularCancelacion(resPrueba, tIni - 30 * 3600000);
    afirmar(calc70.porcentaje_reembolso === 70 && calc70.reembolso === 70, 'Cancelación 24-48h devuelve 70%');
    var calc0 = calcularCancelacion(resPrueba, tIni - 10 * 3600000);
    afirmar(calc0.porcentaje_reembolso === 0 && calc0.reembolso === 0, 'Cancelación <24h devuelve 0%');

    // 6. Autenticación RPC
    var sesAdmin = apiLogin('admin@pawpatita.pe', 'admin123');
    afirmar(sesAdmin && sesAdmin.token && (sesAdmin.usuario.tipo === 'Administrador' || sesAdmin.usuario.rol === 'Administrador'), 'apiLogin exitoso para Administrador');

    var sesCuid = apiLogin('carlos@gmail.com', '123456');
    afirmar(sesCuid && sesCuid.token && (sesCuid.usuario.tipo === 'Cuidador' || sesCuid.usuario.rol === 'Cuidador'), 'apiLogin exitoso para Cuidador');

    // 7. Dashboard Admin
    var dash = apiAdminDashboard(sesAdmin.token);
    afirmar(dash && dash.kpis && dash.kpis.totalUsuarios > 0, 'apiAdminDashboard retorna KPIs consolidados');

    Logger.log('=== TEST SISTEMA COMPLETO: EXITOSO ===');
    return { exito: true, mensaje: 'Todas las pruebas pasaron satisfactoriamente (' + log.length + ' aserciones).', log: log };
  } catch (err) {
    Logger.log('=== TEST SISTEMA COMPLETO: ERROR === ' + err.message);
    return { exito: false, error: err.message, log: log };
  }
}

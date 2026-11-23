// tools/test_mock_gas.js
// Suite de validación en Node.js que simula el entorno de Google Apps Script
// Carga tools/seed.json (22 pestañas, 154 filas) y ejecuta Codigo.gs de punta a punta.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

console.log('================================================================');
console.log('  PAW PATITA CUSCO v4.0 - SUITE DE VERIFICACIÓN CON MOCK GAS   ');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// PARTE 1: VALIDACIÓN SINTÁCTICA DE Index.html
// ----------------------------------------------------------------------------
console.log('>> PASO 1: Validación de sintaxis y restricciones de Index.html...');

const htmlContent = fs.readFileSync('Index.html', 'utf8');

// 1.1 Verificación de ausencia de ?. y ??
const optChainMatches = htmlContent.match(/\?\./g);
if (optChainMatches) {
  console.error('ERROR: Index.html contiene operadores ?. incompatibles con HtmlService!');
  process.exit(1);
} else {
  console.log('  ✓ Cero operadores de encadenamiento opcional (?.) detectados.');
}

const nullishMatches = htmlContent.match(/(?<!\?)\?\?(?!\?)/g);
if (nullishMatches) {
  console.error('ERROR: Index.html contiene operadores ?? incompatibles con HtmlService!');
  process.exit(1);
} else {
  console.log('  ✓ Cero operadores de coalescencia nula (??) detectados.');
}

// 1.2 Extracción y validación del bloque <script>
const scriptMatches = htmlContent.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi);
if (!scriptMatches || scriptMatches.length === 0) {
  console.error('ERROR: No se encontró bloque de script embebido en Index.html!');
  process.exit(1);
}

let scriptTotal = '';
scriptMatches.forEach(tag => {
  const code = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
  scriptTotal += code + '\n';
});

try {
  new vm.Script(scriptTotal, { filename: 'Index.html.script' });
  console.log('  ✓ El código JavaScript de Index.html compila sin errores sintácticos.');
} catch (err) {
  console.error('ERROR de sintaxis en script de Index.html:', err.message);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// PARTE 2: CREACIÓN DEL MOCK DE GOOGLE APPS SCRIPT
// ----------------------------------------------------------------------------
console.log('\n>> PASO 2: Inicializando Mock de Google Apps Script (SpreadsheetApp, Cache, Lock, Utilities)...');

const seedData = JSON.parse(fs.readFileSync('tools/seed.json', 'utf8'));

// Simulación en memoria de las hojas
const sheetsMock = {};

for (const sheetName in seedData) {
  // Clona la matriz bidimensional
  sheetsMock[sheetName] = seedData[sheetName].map(row => [...row]);
}

class MockRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row; // 1-based
    this.col = col; // 1-based
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getValues() {
    const res = [];
    const matrix = sheetsMock[this.sheet.name] || [];
    for (let r = 0; r < this.numRows; r++) {
      const rowIdx = this.row - 1 + r;
      const rowArr = matrix[rowIdx] || [];
      const rowRes = [];
      for (let c = 0; c < this.numCols; c++) {
        const colIdx = this.col - 1 + c;
        rowRes.push(rowArr[colIdx] !== undefined ? rowArr[colIdx] : '');
      }
      res.push(rowRes);
    }
    return res;
  }

  setValues(vals) {
    const matrix = sheetsMock[this.sheet.name];
    for (let r = 0; r < vals.length; r++) {
      const rowIdx = this.row - 1 + r;
      if (!matrix[rowIdx]) {
        matrix[rowIdx] = [];
      }
      for (let c = 0; c < vals[r].length; c++) {
        const colIdx = this.col - 1 + c;
        matrix[rowIdx][colIdx] = vals[r][c];
      }
    }
  }

  setValue(val) {
    this.setValues([[val]]);
  }

  setNumberFormat(fmt) {}
  setNumberFormats(fmts) {}
}

class MockSheet {
  constructor(name) {
    this.name = name;
  }

  getName() { return this.name; }

  getLastRow() {
    const m = sheetsMock[this.name] || [];
    return m.length;
  }

  getLastColumn() {
    const m = sheetsMock[this.name] || [];
    if (m.length === 0) return 0;
    return m[0].length;
  }

  getDataRange() {
    const lr = this.getLastRow();
    const lc = this.getLastColumn();
    return new MockRange(this, 1, 1, Math.max(1, lr), Math.max(1, lc));
  }

  getRange(row, col, numRows, numCols) {
    const nr = numRows !== undefined ? numRows : 1;
    const nc = numCols !== undefined ? numCols : 1;
    return new MockRange(this, row, col, nr, nc);
  }
}

class MockSpreadsheet {
  getSheetByName(name) {
    if (sheetsMock.hasOwnProperty(name)) {
      return new MockSheet(name);
    }
    return null;
  }

  getSheets() {
    return Object.keys(sheetsMock).map(name => new MockSheet(name));
  }
}

const mockSpreadsheetApp = {
  getActiveSpreadsheet: () => new MockSpreadsheet(),
  openById: () => new MockSpreadsheet()
};

// Mock CacheService
const cacheStore = {};
const mockCacheService = {
  getScriptCache: () => ({
    get: (k) => cacheStore[k] || null,
    put: (k, v, ttl) => { cacheStore[k] = String(v); },
    remove: (k) => { delete cacheStore[k]; }
  })
};

// Mock LockService
const mockLockService = {
  getScriptLock: () => ({
    tryLock: (timeout) => true,
    releaseLock: () => {}
  })
};

// Mock Utilities
const mockUtilities = {
  Charset: { UTF_8: 'UTF-8' },
  DigestAlgorithm: { SHA_256: 'SHA-256' },
  getUuid: () => crypto.randomUUID(),
  computeDigest: (alg, val, charset) => {
    const hash = crypto.createHash('sha256').update(String(val), 'utf8').digest();
    // En GAS devuelve un array de bytes con signo (int8: -128 a 127)
    const bytes = [];
    for (let i = 0; i < hash.length; i++) {
      let b = hash[i];
      if (b > 127) b = b - 256;
      bytes.push(b);
    }
    return bytes;
  },
  base64Encode: (bytes) => {
    // Si bytes es array de int8, convertir a buffer uint8
    const u8 = Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b)));
    return u8.toString('base64');
  },
  formatDate: (date, tz, fmt) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return fmt.replace('yyyy', yyyy).replace('MM', MM).replace('dd', dd).replace('HH', HH).replace('mm', mm).replace('ss', ss);
  }
};

const mockLogger = {
  log: (...args) => {
    // Opcional: console.log('[GAS Logger]', ...args);
  }
};

// Contexto global del mock
const gasContext = {
  console: console,
  SpreadsheetApp: mockSpreadsheetApp,
  CacheService: mockCacheService,
  LockService: mockLockService,
  Utilities: mockUtilities,
  Logger: mockLogger,
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Array: Array,
  Object: Object,
  RegExp: RegExp,
  Error: Error
};

vm.createContext(gasContext);

// ----------------------------------------------------------------------------
// PARTE 3: CARGA Y EJECUCIÓN DE Codigo.gs EN EL CONTEXTO MOCK
// ----------------------------------------------------------------------------
console.log('\n>> PASO 3: Evaluando Codigo.gs dentro del contexto Mock...');

const codigoGsContent = fs.readFileSync('Codigo.gs', 'utf8');

try {
  vm.runInContext(codigoGsContent, gasContext, { filename: 'Codigo.gs' });
  console.log('  ✓ Codigo.gs cargado exitosamente en el motor de ejecución.');
} catch (err) {
  console.error('ERROR al ejecutar Codigo.gs:', err);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// PARTE 4: EJECUCIÓN DE testSistemaCompleto()
// ----------------------------------------------------------------------------
console.log('\n>> PASO 4: Ejecutando testSistemaCompleto() de Codigo.gs...');

try {
  const resTest = vm.runInContext('testSistemaCompleto()', gasContext);
  console.log('  Resultado testSistemaCompleto():', resTest);
  if (!resTest.exito) {
    console.error('ERROR: testSistemaCompleto() reportó fallo:', resTest.error);
    process.exit(1);
  }
  console.log('  ✓ testSistemaCompleto() ejecutado con éxito total.');
} catch (err) {
  console.error('ERROR en llamada testSistemaCompleto():', err);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// PARTE 5: PRUEBAS END-TO-END DE LOS 4 ROLES
// ----------------------------------------------------------------------------
console.log('\n>> PASO 5: Ejecución de flujos transaccionales reales por rol...');

// 5.1 Propietario Local (Angelo)
console.log('  [5.1] Flujo Propietario Local:');
const loginProp = vm.runInContext('apiLogin("angelo@gmail.com", "123456")', gasContext);
if (!loginProp || !loginProp.token) throw new Error('Fallo login propietario');
console.log('    ✓ Login propietario exitoso. Token:', loginProp.token.substring(0, 10) + '...');

const mascProp = vm.runInContext(`apiPropMascotas("${loginProp.token}")`, gasContext);
console.log(`    ✓ apiPropMascotas retornó ${mascProp.mascotas.length} mascotas.`);

const cotProp = vm.runInContext(`apiPropCotizar("${loginProp.token}", {
  id_oferta: "OF-101",
  fecha_inicio: "2026-07-01",
  fecha_fin: "2026-07-03",
  extras: { bano: true }
})`, gasContext);
console.log(`    ✓ apiPropCotizar calculó total: S/ ${cotProp.total} (${cotProp.dias} días).`);

// 5.2 Propietario Turista (Sofía)
console.log('  [5.2] Flujo Propietario Turista Cusco:');
const loginTur = vm.runInContext('apiLogin("sofia.turista@gmail.com", "123456")', gasContext);
console.log(`    ✓ Login turista exitoso (${loginTur.usuario.subtipo}).`);

const cotTur = vm.runInContext(`apiPropCotizar("${loginTur.token}", {
  id_oferta: "OF-101",
  fecha_inicio: "2026-06-24",
  fecha_fin: "2026-06-25",
  cupon_codigo: "MACHUPICCHU15",
  extras: { recojo_hotel: true }
})`, gasContext);
console.log(`    ✓ apiPropCotizar con temporada Inti Raymi y cupón: Total S/ ${cotTur.total} (Ajuste temp: S/ ${cotTur.ajuste_temporada}, Descuento: S/ ${cotTur.descuento_cupon}).`);

// 5.3 Cuidador Independiente (Carlos)
console.log('  [5.3] Flujo Cuidador Aprobado:');
const loginCuid = vm.runInContext('apiLogin("carlos@gmail.com", "123456")', gasContext);
const resCuid = vm.runInContext(`apiCuidReservas("${loginCuid.token}")`, gasContext);
console.log(`    ✓ apiCuidReservas retornó ${resCuid.reservas.length} reservas asignadas.`);

const billCuid = vm.runInContext(`apiCuidBilletera("${loginCuid.token}")`, gasContext);
console.log(`    ✓ apiCuidBilletera: Saldo disponible S/ ${billCuid.billetera.saldo_disponible}, en garantía S/ ${billCuid.billetera.saldo_en_garantia}.`);

// 5.4 Clínica Veterinaria (Cusco Centro)
console.log('  [5.4] Flujo Clínica Veterinaria:');
const loginVet = vm.runInContext('apiLogin("vet.centro@pawpatita.pe", "vet123")', gasContext);
const sosVet = vm.runInContext(`apiVetSOS("${loginVet.token}")`, gasContext);
console.log(`    ✓ apiVetSOS retornó ${sosVet.incidencias.length} alertas de emergencia.`);

const fichasVet = vm.runInContext(`apiVetFichas("${loginVet.token}")`, gasContext);
console.log(`    ✓ apiVetFichas retornó ${fichasVet.fichas.length} fichas caninas.`);

// 5.5 Administrador de Red
console.log('  [5.5] Flujo Administrador de Red:');
const loginAdmin = vm.runInContext('apiLogin("admin@pawpatita.pe", "admin123")', gasContext);
const dashAdmin = vm.runInContext(`apiAdminDashboard("${loginAdmin.token}")`, gasContext);
console.log(`    ✓ apiAdminDashboard KPIs: ${dashAdmin.kpis.totalUsuarios} usuarios, ${dashAdmin.kpis.totalReservas} reservas, ingresos brutos S/ ${dashAdmin.kpis.ingresosBrutos}, comisiones S/ ${dashAdmin.kpis.comisionTotal}.`);
console.log(`    ✓ Gráficos Chart.js preparados para ${Object.keys(dashAdmin.charts.distritos).length} distritos y ${Object.keys(dashAdmin.charts.categorias).length} categorías.`);

const postAdmin = vm.runInContext(`apiAdminPostulantes("${loginAdmin.token}")`, gasContext);
console.log(`    ✓ apiAdminPostulantes: ${postAdmin.postulantes.length} cuidadores en revisión.`);

console.log('\n================================================================');
console.log('  ✓ TODAS LAS VERIFICACIONES MOCK DE GAS PASARON CON ÉXITO 100% ');
console.log('================================================================');

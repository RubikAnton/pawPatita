# Blueprint Maestro de Pulido Comercial y Rigor UX — Paw Patita Cusco v5.2

> **Proyecto:** Paw Patita Cusco (`v5.1` → `v5.2 — Calidad Comercial, Responsive Total y Rigor IHC 20/20`)  
> **Despliegue Producción (GitHub Pages):** `https://nasdigog-glitch.github.io/paw-patita-cusco/`  
> **Repositorio Git:** `https://github.com/RubikAnton/pawPatita.git` (rama `main`)  
> **Backend Supabase:** `https://evephdzpoonavggwoejs.supabase.co`  
> **Arquitectura:** Static SPA Vanilla ES Modules (`index.html`, `css/*.css`, `js/**/*.js`, `supabase/*.sql`) — Cero bundler, deploy directo en GitHub Pages.  
> **Fecha de Auditoría:** 23 de Noviembre de 2026  

---

## REGLAS DE ORO PARA TODOS LOS CHATS DE EJECUCIÓN

1. **PROHIBIDO LEER `legacy-gas/` O `BD-PAWPATITAS-v3.xlsx`:** Todo el diagnóstico forense, ubicaciones exactas de archivo/selector/función/SQL y contratos técnicos están autocontenidos en este documento.
2. **NO MENCIONAR JERGA TÉCNICA EN LA UI:** Prohibido exponer `rpc_`, `JSONB`, `PostImg`, `GoTrue`, `PostgreSQL`, `Leaflet`, `Chart.js`, `old_record` o rutas `.sql` en mensajes visibles al usuario final.
3. **CERO TRAGUEO SILENCIOSO DE ERRORES:** Cuando `isSupabaseConfigured()` sea `true`, ninguna mutación (`.rpc()`, `.insert()`, `.update()`, `.upsert()`) puede ignorar `{ error }` con un `console.warn` y fingir éxito en memoria.
4. **VERIFICACIÓN OBLIGATORIA:** Tras cada sub-fase, validar sintaxis con `node --check`, barrer expresiones prohibidas con grep y marcar los ítems completados `[x]` en este plan.
5. **POLÍTICA DE MODELOS (CUOTA DISPONIBLE):**
   - **EXCLUIDOS (`0%` cuota):** Claude / GPT y **Gemini 4 Argon** (**NO USAR**).
   - **PERMITIDOS ÚNICAMENTE:** **`Gemini 4 Hydrogen`**, **`Gemini 4 Neon`** y **`Gemini 3.8 Flash`**.

---

## SECCIÓN 1: DIAGNÓSTICO TÉCNICO FORENSE DE PRODUCCIÓN Y SOLUCIONES INTEGRALES

### 1. Responsive Total, Cortes Visuales y Scroll en Modales, Sidebars y Calendario (Crítico UI/UX)

#### 1A. Modal "Ver Perfil" del Cuidador (`#modal-perfil-cuidador`) y Modales Públicos/Auth Altos
- **Causa Raíz Exacta:**
  - `index.html:720-728`: `#modal-perfil-cuidador` usa `<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">` y dentro de `.modal-content` (que tiene `overflow: hidden` inline y en `css/main.css:782-787`) coloca un contenedor intermedio `<div id="modal-perfil-cuidador-content">`.
  - `js/public/catalogo.js:953-1061` (`window.abrirModalPerfil`) inyecta `.modal-perfil-header`, `.modal-body` y `.modal-footer` **dentro** de `#modal-perfil-cuidador-content`. Como `#modal-perfil-cuidador-content` es un `<div>` con `display: block` normal, rompe la cadena flex directa de Bootstrap `.modal-dialog-scrollable > .modal-content > .modal-body`. En consecuencia, `.modal-body` no se encoge ni activa `overflow-y: auto`, y `.modal-content { overflow: hidden; }` **recorta de golpe** la sección *"Espacio de Estadía en Cusco"*, las fotos del hogar, reseñas y tarifas sin permitir hacer scroll. Además falta `#modalPerfilCuidadorTitle` (`aria-labelledby` en `index.html:720`) y `.modal-perfil-header` (`css/catalogo.css:574-599`) carece de `flex-shrink: 0`.
  - Adicionalmente, en el barrido proactivo se detectó que `#modal-login` (`index.html:197`), `#modal-registro-propietario` (`index.html:307`), `#modal-postular-cuidador` (`index.html:445`, muy largo por los 6 dropzones) y `#modal-postular-clinica` (`index.html:603`) **no tienen `modal-dialog-scrollable`** ni restricción `max-height: 90vh` flex con `.auth-body` scrollable en `css/auth.css:8-26`. En pantallas de `768px` o móviles `360px`, los botones de envío inferiores quedan cerca o fuera del viewport visible si la altura interior excede la ventana.
- **Solución Integral:**
  - En `css/main.css` y `css/catalogo.css`:
    - Imponer `.modal-dialog-scrollable .modal-content { max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }` (con `@supports (max-height: 90dvh)` → `max-height: 90dvh`).
    - Hacer que `#modal-perfil-cuidador-content` actúe como wrapper flex completo (`display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; max-height: 90vh; overflow: hidden;`).
    - En `.modal-perfil-header` y `.modal-footer`: añadir `flex-shrink: 0;`.
    - En `.modal-dialog-scrollable .modal-body` y `#modal-perfil-cuidador-content .modal-body`: aplicar `flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgba(232,93,36,0.45) transparent;` más barra WebKit estilizada (`::-webkit-scrollbar` 6px cálida).
  - En `js/public/catalogo.js:953`: añadir `id="modalPerfilCuidadorTitle"` al título del cuidador para accesibilidad ARIA y asegurar botón de cierre/pie visible siempre abajo mientras el cuerpo central hace scroll fluido.
  - En `index.html` + `css/auth.css`: añadir `modal-dialog-scrollable` a `#modal-login`, `#modal-registro-propietario`, `#modal-postular-cuidador` y `#modal-postular-clinica`, y dotar a `.auth-body` (o `.modal-body`) de `flex: 1 1 auto; min-height: 0; overflow-y: auto;`, con `.auth-header { flex-shrink: 0; }`.

#### 1B. Sidebar / Menú Lateral de los 4 Paneles (Propietario, Cuidador, Veterinaria, Administrador)
- **Causa Raíz Exacta:**
  - `css/paneles.css:12-42`: `.panel-dashboard-shell` define `grid-template-columns: 280px 1fr` (sin `minmax(0, 1fr)` en el área principal) y `.panel-sidebar` fija `overflow: hidden` (`L33`).
  - `css/paneles.css:109-132`: `.panel-nav-btn` impone `width: 100%; white-space: nowrap; padding: 0.75rem 1rem; font-size: 0.92rem;` sin `min-width: 0`. Su hijo `.nav-icon-wrap` tampoco tiene `min-width: 0; flex: 1 1 auto;`.
  - Los 4 paneles (`js/roles/propietario.js:785-833`, `js/roles/cuidador.js:1372-1419`, `js/roles/veterinaria.js:534-596`, `js/roles/administrador.js:1429-1489`) usan `<h6 class="... text-truncate">` y `<div class="... text-truncate">` para nombre y correo, más etiquetas largas como `"Mis Mascotas & PAW-ID"`, `"Mi Perfil (Local/Turista)"`, `"Explorar Catálogo Cusco"`, `"Mi Perfil, Servicios & Reseñas"`, `"2. Cuidadores & Clínicas"`, etc. Combinado con `overflow: hidden` y `white-space: nowrap`, corta textos como *"Lucía Mendoza Va..."*, *"lucia.mendoza@gmai..."* y *"Explorar Catálogo Cusc..."*.
  - En `< 991.98px` (`768px` y `360px`), `.panel-nav-menu` se vuelve una tira horizontal comprimida donde los botones y badges pierden legibilidad.
- **Solución Integral (`css/paneles.css` + role layouts):**
  - En escritorio (`>= 992px`): cambiar `.panel-dashboard-shell` a `grid-template-columns: minmax(295px, 315px) minmax(0, 1fr); gap: 1.5rem;` (y `grid-template-columns: minmax(280px, 300px) minmax(0, 1fr);` entre `992px` y `1199px`).
  - En cabecera de perfil del sidebar: quitar `.text-truncate` de nombre y correo en los 4 roles (`propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js`) y aplicar clases CSS limpias: nombre con `overflow-wrap: break-word; line-height: 1.25;` (permite 2 líneas limpias sin elipsis arbitraria) y correo con `overflow-wrap: anywhere; word-break: break-word; font-size: 0.76rem;`.
  - En `.panel-nav-btn` y `.nav-icon-wrap`:
    - `.panel-nav-btn { min-width: 0; gap: 0.55rem; padding: 0.72rem 0.9rem; font-size: 0.88rem; white-space: normal; text-align: left; align-items: center; overflow-wrap: break-word; }`
    - `.nav-icon-wrap { min-width: 0; flex: 1 1 auto; display: flex; align-items: center; gap: 0.65rem; }`
    - Badges dentro de `.panel-nav-btn`: `flex-shrink: 0; white-space: nowrap;`.
  - En tablet (`768px`) y móvil (`360px`, `<= 991.98px`): reemplazar la tira horizontal apretada por un **Drawer / Acordeón Colapsable Fluido** en la cabecera del `.panel-sidebar` (botón `"Menú del Panel"` con ícono hamburguesa/sección activa que despliega limpiamente los ítems en lista vertical completa de ancho 100%, sin recortar una sola letra).

#### 1C. Calendario Mensual del Cuidador (`js/components/calendario-agenda.js` + `css/paneles.css`)
- **Causa Raíz Exacta:**
  - `js/components/calendario-agenda.js:901-963` renderiza `<div class="agenda-calendar-weekdays">` y `<div class="agenda-calendar-grid">` directamente dentro de `.card` sin ningún contenedor de desplazamiento horizontal.
  - `css/paneles.css:791-823` usa `grid-template-columns: repeat(7, 1fr);` sin `min-width` en las columnas, mientras `.agenda-slot-chip` (`08:00 - 12:00` + `1/4`) y `.agenda-cupo-pill` empujan el ancho intrínseco de las 7 columnas más allá del ancho del card (`~680px–820px` en laptops `1366px` con sidebar al lado).
  - `css/main.css:145` aplica `#app-content { overflow-x: hidden; }`, recortando los días de viernes, sábado y domingo por la derecha sin ofrecer scrollbar horizontal; y a `< 768px` (`css/paneles.css:809-819`) colapsa la semana de 7 días a 2 columnas ocultando los encabezados `Lun..Dom`.
- **Solución Integral:**
  - En `js/components/calendario-agenda.js`: envolver `.agenda-calendar-weekdays` y `.agenda-calendar-grid` dentro de `<div class="agenda-calendar-scroll"><div class="agenda-calendar-matrix">...</div></div>` e incluir una sutil guía responsive (`"Desliza horizontalmente para ver los 7 días de la semana →"` visible en `< 1200px`).
  - En `css/paneles.css`:
    - `.agenda-calendar-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; padding-bottom: 0.5rem; scrollbar-width: thin; }`
    - `.agenda-calendar-matrix { min-width: 810px; }` (así las 7 columnas mantienen al menos `110px–115px` c/u incluso en `360px`, `768px` y `1366px` sin romperse ni ocultarse).
    - `.agenda-calendar-weekdays` y `.agenda-calendar-grid`: `grid-template-columns: repeat(7, minmax(110px, 1fr)); gap: 0.45rem;`.
    - `.agenda-day-cell`: `min-width: 0; padding: 0.5rem;` y `.agenda-slot-chip`: `font-size: 0.69rem; padding: 0.18rem 0.35rem;` manteniendo legibilidad perfecta y **eliminando** el quiebre destructivo de `repeat(2, 1fr)` en móvil.

#### 1D. Barrido Global Multi-Dispositivo (`360px`, `768px`, `1366px`)
- **Navbar (`index.html:82-113` + `css/main.css`):** Asegurar que en `360px` al abrir el menú collapse, `#btn-toggle-currency`, `#btn-toggle-lang`, `#navbar-notification-bell` y `#navbar-auth-section` hagan `flex-wrap: wrap; gap: 0.5rem;` sin desbordar horizontalmente (`body { overflow-x: clip; }`).
- **Dropdown Notificaciones (`css/main.css:309-351`):** Evitar ancho fijo `width: 350px` que se corta en pantalla `360px`; usar `width: min(350px, calc(100vw - 1.5rem));`.
- **Hero, Collage, Catálogo y Mapa (`js/public/landing.js`, `catalogo.js`, `css/catalogo.css`):** Verificar que columnas dentro de grid/flex tengan `min-width: 0`, mapa Leaflet tenga altura adaptativa (`min-height: 300px` en móvil, `420px` en desktop) sin bloquear el scroll táctil de la página, y filtros de catálogo apilen limpiamente en `360px` y `768px`.
- **Tablas y Gráficos en los 4 Roles:** Garantizar `.table-responsive` en **todas** las tablas (`veterinaria.js`, `administrador.js`, `billetera-cuidador.js`, `calendario-agenda.js`), `min-width: 0` en columnas que alojan `<canvas>` de Chart.js (`administrador.js`, `billetera-cuidador.js`), y tarjetas PAW-ID imprimibles (`css/catalogo.css`) adaptables con `max-width: 100%; overflow: hidden;` en vista previa móvil sin afectar `@media print` (`css/print.css`).
- **Toast Container y Wizard Steps (`css/main.css`, `js/components/wizard-reserva.js`):** Limitar `.toast-container` / `.toast` a `max-width: calc(100vw - 1.5rem)` y permitir wrap limpio en los 4 pasos del Wizard en `360px`.

---

### 2. Internacionalización (`ES / EN`) Completa en Landing, Catálogo y Textos Públicos

- **Causa Raíz Exacta:**
  1. `js/i18n.js` ya define claves `landing.stats_*`, `landing.local_*`, `landing.tourist_*`, `landing.pawid_*`, `landing.vets_*`, `catalogo.*`, pero `js/public/landing.js:244-389` y `js/public/catalogo.js:399-1060` **no tienen atributos `data-i18n` colocados** en la gran mayoría de elementos.
  2. `js/public/landing.js:151` usa `data-i18n="landing.hero_lead"`, pero `applyTranslations()` usa `.textContent`, lo que borra el énfasis `<strong>PAW-ID</strong>` si no usa `data-i18n-html`.
  3. Faltan claves `ES/EN` y `data-i18n*` en:
     - `index.html:85-107` (títulos de currency/lang/bell, `"Notificaciones en Vivo"`, `"No tienes notificaciones pendientes."`, botón marcar leídas).
     - `index.html:197-716` (formularios dentro de `#modal-login`, `#modal-forgot-password`, `#modal-registro-propietario`, `#modal-postular-cuidador`, `#modal-postular-clinica`: títulos, labels, placeholders `data-i18n-placeholder`, opciones informativas, botones).
     - `js/public/landing.js`: badges flotantes del Hero (`L208-232`), tarjetas Dual Value Propietario/Turista y bullets completos (`L286-315`), card preview `"Inti — PAW-6858"` (`L349-371`), Temporadas Cusco & Política Escalonada de Cancelación (`L405-462`), Testimonios (`L472-496`), badges de clínicas (`"Atención Regular"`, `"Urgencia desde:"`, `"Llamar"` en `L557, 575, 579`).
     - `js/public/catalogo.js` (`L399-554, 759-888, 954-1060`) & `js/public/mapa-cusco.js` (`L185-189, 250-254`): cabecera, filtros laterales, cards de cuidadores, popup del mapa, estado vacío y **100% del Modal "Ver Perfil del Cuidador"** (*"Espacio de Estadía en Cusco"*, *"Tarifas de Servicios"*, *"Disponibilidad"*, *"Reseñas"*, *"Reservar Ahora"*).
     - `js/public/paw-id-publico.js` (`L139-272`): cabecera de emergencia, tamaño/peso/vacunas/esterilizado/alergias y nota legal Ley N° 29733.
     - `js/components/legal-modal.js:1-321`: se genera una única vez en `DOMContentLoaded` en español fijo; al cambiar a `EN`, el Modal Legal permanece 100% en español.
- **Solución Integral:**
  - Ampliar `DICTIONARY.ES` y `DICTIONARY.EN` en `js/i18n.js` agregando las secciones completas `nav`, `auth`, `reg_prop`, `post_cuid`, `post_vet`, `landing`, `catalogo`, `perfil_cuidador`, `pawid_pub`, `legal`, `validators`, `sos`, `help`.
  - En `js/public/landing.js`, `js/public/catalogo.js`, `js/public/mapa-cusco.js`, `js/public/paw-id-publico.js` e `index.html`: agregar `data-i18n`, `data-i18n-html` (ej. `L151`), `data-i18n-placeholder` y `data-i18n-title`, además de usar `t(...)` en plantillas generadas dinámicamente.
  - En `js/components/legal-modal.js`: renderizar dinámicamente el cuerpo de las 3 pestañas según `getCurrentLang()` al invocar `abrirModalLegal(tab)` y al cambiar de idioma desde `setLanguage()`.

---

### 3. Validación Estricta de Campos en Todos los Formularios

- **Causa Raíz Exacta:**
  - Ausencia de un motor único de validación (`validators.js`):
    1. `index.html:317, 459, 617` (`#form-registro-propietario`, `#form-postular-cuidador`, `#form-postular-clinica`) y `#form-forgot-password` (`L287`) no tienen `novalidate`, mezclando burbujas HTML5 nativas inconsistentes con validación parcial en JS.
    2. `js/auth/postulaciones.js:107-156` (`registrarPropietario`) prácticamente solo bloquea `aceptaTyc`; `#reg-prop-tel` (`L393`), `#reg-prop-contacto-tel` (`L423`) y `#reg-prop-numdoc` aceptan texto libre (`abc`) sin validar dígitos ni longitud. Lo mismo ocurre en `postularCuidador` (`L164-324`: `#post-cuid-tel`, `#post-cuid-numdoc`, email) y `postularClinicaVeterinaria` (`L332-461`: `#post-vet-ruc` no bloquea letras en tiempo real; `#post-vet-tel` y `#post-vet-dni-responsable` aceptan letras; `#post-vet-responsable` acepta números).
    3. `js/roles/propietario.js:1119-1281` (`#form-perfil-propietario`): `#prof-telefono`, `#prof-emerg-tel`, `#prof-num-doc` usan `type="text"` sin restricción ni validación al guardar.
    4. `js/components/carnet-digital.js:352-510` (`#form-crud-mascota`): solo verifica presencia básica de 3 campos, permitiendo `peso_kg <= 0`, `fecha_nacimiento` futura o nombres numéricos.
    5. `js/components/wizard-reserva.js:730-744, 990-1000`: `#wiz-ultimos-4` acepta letras y no valida 4 dígitos exactos; `#wiz-num-operacion` necesita validación estricta en transferencias/billeteras y el checkbox de Términos (`#wiz-acepta-tyc`) debe bloquear con aviso visual claro.
    6. `js/components/billetera-cuidador.js:410-462` (`#form-solicitar-retiro-rpc`): `#retiro-input-numero` acepta letras (`cuentaNumero.length < 6`), sin exigir **9 dígitos empezando en 9** para Yape/Plin ni **20 dígitos numéricos** para CCI.
    7. `js/roles/cuidador.js:1172-1254` (`#form-crud-servicio-cuid`), `js/roles/veterinaria.js:1114-1257` (`#form-vet-actualizar-sos`), `L1692-1730` (`#form-vet-dictaminar-ficha`), `L1922-2035` (`#form-vet-config-sede` con `#cfg-vet-telefono` libre), `js/roles/administrador.js:2481-2602` (`#form-admin-crear-clinica` con `#new-clin-telefono` y `#new-clin-ruc` débiles), `L2836` (`#form-admin-arbitraje-rpc`), `L3437` (`#form-admin-parametros`), `js/components/alerta-sos.js:269` (`#form-emitir-sos`) y `js/router.js:179` (`#form-reset-password`) carecen de feedback inline uniforme en tiempo real.
- **Solución Integral — Nuevo Módulo `js/utils/validators.js`:**
  - Crear reglas centralizadas, reutilizables y bilingües (`ES / EN`):
    - **Teléfonos (`type="tel"`, `inputmode="numeric"`, atributo `data-validate="phone"`):** en evento `input`, filtrar todo carácter que no sea dígito (permitiendo `+` únicamente en posición `0` para formato internacional de turistas). En `blur` y `submit`: exigir `^9\d{8}$` (9 dígitos en Perú empezando por `9`) o formato internacional válido `^\+[1-9]\d{7,14}$`.
    - **Documentos (`data-validate="dni | ce | pasaporte | ruc | doc-selector"`):**
      - `DNI`: solo dígitos (`inputmode="numeric"`), exactamente 8 dígitos (`^\d{8}$`).
      - `CE`: `^[A-Za-z0-9]{9,12}$`.
      - `Pasaporte`: `^[A-Za-z0-9]{6,12}$`.
      - `RUC`: solo dígitos (`inputmode="numeric"`), exactamente 11 dígitos (`^(10|15|17|20)\d{9}$`, o `^\d{11}$` con aviso claro).
    - **Emails (`data-validate="email"`):** regex estricto `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`.
    - **Nombres y Apellidos (`data-validate="person-name"`):** impedir números (`/^[^\d]{2,80}$/` con mínimo 2 letras reales).
    - **Finanzas / Retiros / Pagos:** Yape/Plin (`^9\d{8}$`), CCI (`^\d{20}$`), últimos 4 dígitos tarjeta (`^\d{4}$`), código operación (`^[A-Za-z0-9-]{6,30}$`), montos numéricos con rangos min/max.
    - **Términos y Condiciones / Declaración Jurada Obligatoria (`data-validate="required-check"`):** si no está marcado al hacer `submit`, bloquear envío, marcar `.is-invalid`, mostrar mensaje claro debajo del checkbox + toast explicativo y desplazar foco al checkbox (estandarizado en Registro Propietario, Postulación Cuidador, Postulación Clínica, Wizard Paso 4).
  - Aplicar `attachFormValidation(formEl)` en tiempo real (`input` / `blur` / `change`) y `validateFormNow(formEl)` en `submit` para **todos los formularios públicos y privados del sistema**.

---

### 4. Lenguaje Neutro Consistente (`"Cuidador"` y `"Propietario"`)

- **Ocurrencias Verificadas por Auditoría Grep:**
  1. `index.html:219`: `<strong data-i18n="auth.demo_cuid">🏡 Cuidadora Aprobada</strong>` → **`🏡 Cuidador Aprobado`**
  2. `js/i18n.js:49`: `'auth.demo_cuid': '🏡 Cuidadora Aprobada'` → **`'🏡 Cuidador Aprobado'`**
  3. `js/config.js:82`: `nombre: 'Valeria Huamán (Cuidadora Aprobada)'` → **`'Valeria Huamán (Cuidador Aprobado)'`**
  4. `js/config.js:85`: `badge: 'Cuidadora Activa'` → **`'Cuidador Activo'`**
  5. `js/public/landing.js:93`: `origen: 'Cuidadora Certificada • San Sebastián'` → **`'Cuidador Certificado • San Sebastián'`**
  6. `js/public/catalogo.js:246`: `'Adiestradora canina básica y cuidadora con 6 años...'` → **`'Especialista en adiestramiento canino y cuidador certificado con 6 años de experiencia en Santiago.'`**
  7. `supabase/06_seed.sql:148` y `supabase/07_fix_auth_and_audit.sql:286`: `-- 2. Propietaria Local Cusco (Demo Propietario)` → **`-- 2. Propietario Local Cusco (Demo Propietario)`**
- **Nota Crítica de Estabilidad:** **NO cambiar** el correo literal `valeria.cuidadora@pawpatitacusco.pe` ni `auth.users` para no invalidar las credenciales demo en producción ni los tests existentes. En cualquier etiqueta visual o rol de catálogo/auth usar estrictamente género neutro `"Cuidador"` / `"Propietario"` (y `"Caregiver"` / `"Owner"` en `EN`).

---

### 5. Restricción de Emisión de Alertas S.O.S. por el Cuidador (Solo Mascotas en Custodia Activa `en_curso`)

- **Causa Raíz Exacta:**
  - `js/roles/cuidador.js:1435-1440` (botón S.O.S. del sidebar) y `L1834-1842` pasan el arreglo completo `reservas` a `abrirModalEmitirSos()`.
  - `js/components/alerta-sos.js:240-242` filtra las reservas seleccionables con `['en_curso', 'confirmada', 'pendiente_confirmacion', 'finalizada'].includes(r.estado_reserva)`, permitiendo que un cuidador seleccione mascotas cuya reserva ya **finalizó** o aún está pendiente.
  - En backend, `supabase/08_pulido_v5_1.sql:219-325` (`rpc_emitir_sos`) tampoco valida el estado `en_curso` cuando el invocante tiene rol `'cuidador'`.
- **Solución Integral (Frontend + Backend SQL):**
  - **Frontend (`js/roles/cuidador.js` + `js/components/alerta-sos.js`):**
    - Añadir parámetro explícito `roleContext: 'cuidador' | 'propietario'`, `soloEnCurso: true` cuando el cuidador abre S.O.S.
    - Filtrar estrictamente `r.estado_reserva === 'en_curso'`.
    - En tabla/tarjetas de reservas del cuidador (`cuidador.js`), mostrar el botón de acción rápida `S.O.S.` **únicamente** en filas con `estado_reserva === 'en_curso'`.
    - Si el cuidador pulsa S.O.S. en el sidebar sin tener ninguna mascota `en_curso`, NO permitir seleccionar reservas finalizadas ni futuras: mostrar un modal/aviso claro indicando: *"No tienes mascotas en custodia activa en este momento. La alerta S.O.S. de cuidador solo puede emitirse durante un servicio En Curso (tras registrar el Check-In)."* (y sugerir ir a **"1. Solicitudes & Check-In"** si tiene servicios confirmados por iniciar).
  - **Backend (`supabase/09_pulido_v5_2.sql` + sync `supabase/03_rpc_business.sql`):**
    - En `public.rpc_emitir_sos`, obtener `v_rol := public.get_my_role();` y validar pertenencia (`auth.uid() IN (v_res.id_propietario, v_res.cuidador_user_id) OR v_rol = 'administrador'`). Si `v_rol = 'cuidador'` y `v_res.estado_reserva != 'en_curso'`, ejecutar `RAISE EXCEPTION 'La alerta S.O.S. del cuidador solo aplica para mascotas actualmente En Curso bajo custodia activa.'`.

---

### 6. Trazabilidad Financiera de Emergencias S.O.S. (Cobro / Cargo Clínico al Propietario)

- **Causa Raíz Exacta:**
  - `supabase/01_schema.sql:588`: `incidencias_emergencias` tiene `costo_atencion_ref numeric(10,2) DEFAULT 0.00`, pero **carece** de estado de cobro (`estado_cobro_sos`), registro de regularización/comprobante (`metodo_pago_sos`, `comprobante_pago_sos`, `fecha_pago_sos`, `observacion_cobro_sos`) y RPCs para cerrar el ciclo financiero.
  - `supabase/08_pulido_v5_1.sql:150` guarda `costo_atencion_ref`, pero las notificaciones al propietario solo mencionan el texto referencial sin enlace a regularización ni saldo pendiente.
  - En UI: `js/components/alerta-sos.js:575-577` muestra un texto plano pequeño (`Costo clínico referencial: S/ 60.00`) sin distinguir si el cargo está **Pendiente de Pago**, **Regularizado por Propietario** o **Conciliado**, ni ofrecer flujo de pago/constancia; `js/roles/propietario.js` no tiene resumen financiero de cargos S.O.S. en su panel; y `js/roles/administrador.js:3370-3420` (tabla *Central Global S.O.S.*) **ni siquiera muestra** `costo_atencion_ref` ni permite conciliar pagos clínicos.
- **Solución Integral (SQL + Propietario + Veterinaria + Admin):**
  - **SQL (`supabase/09_pulido_v5_2.sql` + sync `01_schema.sql` & `03_rpc_business.sql`):**
    - Añadir columnas idempotentes en `public.incidencias_emergencias`:
      - `estado_cobro_sos text NOT NULL DEFAULT 'sin_cargo' CHECK (estado_cobro_sos IN ('sin_cargo', 'pendiente_pago', 'reportado_propietario', 'conciliado', 'exonerado'))`
      - `metodo_pago_sos text`, `comprobante_pago_sos text`, `fecha_pago_sos timestamptz`, `observacion_cobro_sos text`.
    - Backfill seguro en `09_pulido_v5_2.sql`: cualquier S.O.S. existente con `costo_atencion_ref > 0` y estado `'sin_cargo'` pasa a `'pendiente_pago'` (y si ya existe en seed resuelto antiguo, reflejar `'conciliado'` o `'pendiente_pago'` coherente: ej. `SOS-2026-0101` `'pendiente_pago'` S/ 60.00 y `SOS-2026-0102` `'conciliado'` S/ 50.00).
    - Actualizar `rpc_vet_actualizar_sos`: cuando `COALESCE(p_costo, i.costo_atencion_ref, 0) > 0` y `i.estado_cobro_sos = 'sin_cargo'`, transicionar automáticamente a `estado_cobro_sos = 'pendiente_pago'`; incluir `estado_cobro_sos` en el JSONB retornado y en el mensaje de notificación al propietario.
    - Crear `public.rpc_propietario_regularizar_sos(p_id_incidencia uuid, p_metodo_pago text, p_comprobante text, p_observacion text DEFAULT NULL)`: valida propietario de la mascota/reserva + `costo_atencion_ref > 0`, marca `estado_cobro_sos = 'reportado_propietario'`, guarda método/comprobante/fecha, y notifica a la Clínica Veterinaria y a los Administradores.
    - Crear `public.rpc_admin_conciliar_cobro_sos(p_id_incidencia uuid, p_accion text, p_observacion text DEFAULT NULL)`: exclusivo Administrador (`'conciliar'` → `'conciliado'`; `'exonerar'` → `'exonerado'`), notifica a Propietario y Clínica.
  - **Panel Propietario (`js/components/alerta-sos.js` + `js/roles/propietario.js`):**
    - Agregar en la vista S.O.S. el bloque **"Historial Médico y Cargos Clínicos S.O.S."** con 3 KPIs (Casos S.O.S., Saldo Clínico Pendiente, Total Regularizado/Conciliado) y banner alerta en el Resumen si existe cargo pendiente (`> 0`).
    - Mostrar en cada tarjeta S.O.S. con costo `> 0`: clínica tratante, diagnóstico, tratamiento, monto exacto (`PEN / USD`), badge semántico (`Cargo Clínico S.O.S. Pendiente` / `Pago Reportado en Revisión` / `Liquidado y Conciliado`) y botón **"Regularizar Cargo Clínico"** con modal validado (Método Yape/Plin/Tarjeta/Transferencia, N.º Operación y/o constancia) conectado a `rpc_propietario_regularizar_sos`.
  - **Panel Veterinaria (`js/roles/veterinaria.js`):**
    - Mostrar badge de estado de cobro clínico (`Pendiente`, `Reportado por Propietario`, `Conciliado`) en cada tarjeta de S.O.S.
  - **Panel Administrador (`js/roles/administrador.js` Sección 5):**
    - Agregar columna **"Cargo Clínico y Cobro"** en la tabla *Central Global S.O.S.* mostrando `costo_atencion_ref`, estado de cobro, método/comprobante reportado y botón **"Conciliar / Exonerar Cargo"** conectado a `rpc_admin_conciliar_cobro_sos`.

---

### 7. Campanita de Notificaciones: Limpieza al Revisar y Aislamiento Estricto por Usuario/Rol

- **Causa Raíz Exacta (4 Fallos Encadenados):**
  1. **Política RLS demasiado permisiva (`supabase/04_rls_policies.sql:523-530`):** `notificaciones_select_propias` y `notificaciones_update_leida` usan `id_usuario_destino = auth.uid() OR public.get_my_role() = 'administrador'`. Cuando inicia sesión un Administrador, cualquier `SELECT` o canal Realtime sobre `public.notificaciones` recibe notificaciones destinadas a **otros roles/usuarios** (e incluso el admin termina recibiendo duplicados si además los RPCs le insertan filas propias).
  2. **Suscripción global errónea en `js/app.js:94-146` (`initRealtimeAlerts`):**
     - Se ejecuta una sola vez en `DOMContentLoaded` (`L404`) antes de existir sesión autenticada.
     - Se suscribe sin filtro a `incidencias_emergencias` (`'*'`), en lugar de cargar desde `public.notificaciones` filtrado por `id_usuario_destino = user.id` y escuchar Realtime de `public.notificaciones` con `filter: id_usuario_destino=eq.${user.id}`.
     - Nunca recarga notificaciones pendientes al iniciar sesión ni limpia el contador/lista al cerrar sesión o cambiar de usuario demo.
  3. **Badge rojo inmortal:** No existe ningún listener sobre el evento `shown.bs.dropdown` de `#navbar-notification-bell` ni botón *"Marcar todas como leídas"*; jamás se actualiza `leida = true` en BD ni se oculta `#notif-badge-count`.
  4. **Fuga de canales y caché entre cambios de cuenta (`js/auth/auth.js:266-284`):** `logout()` no llama a `clearAllRealtimeSubscriptions()` (`js/supabase-client.js:614`), ni purga los estados singleton (`adminState` en `administrador.js:901`, `vetState` en `veterinaria.js:178`, `filtrosActivos` en `catalogo.js:350`). Además `propietario.js:745,751`, `cuidador.js:1344,1350` y `veterinaria.js:468` suscriben canales Realtime sin `filter:` de entidad/usuario.
- **Solución Integral (SQL + `auth.js` + `app.js` + Roles):**
  - **SQL (`supabase/09_pulido_v5_2.sql` + sync `04_rls_policies.sql`):**
    - Restringir RLS de `public.notificaciones` estrictamente a `id_usuario_destino = auth.uid()` tanto en `SELECT` como en `UPDATE` (eliminando `OR public.get_my_role() = 'administrador'`, pues los RPCs ya insertan notificaciones específicas para cada administrador en su propio `id_usuario_destino`, y la actividad global se audita en `auditoria_estados`).
  - **Frontend (`js/app.js` + `js/auth/auth.js` + `index.html`):**
    - Crear `syncUserNotifications(user)` y `resetNotificationsState()` en `js/app.js` (y exponer callback limpio tras login/logout sin dependencias circulares vía evento `'paw:auth-changed'`).
    - Al iniciar sesión: ejecutar `SELECT * FROM public.notificaciones WHERE id_usuario_destino = user.id ORDER BY created_at DESC LIMIT 20`, calcular `unreadCount = rows.filter(r => !r.leida).length`, mostrar `#notif-badge-count` **solo si `unreadCount > 0`**, y suscribir `canal-notificaciones-${user.id}` a `public.notificaciones` (`INSERT` + `UPDATE`) con `filter: id_usuario_destino=eq.${user.id}`.
    - En `index.html:100-108`: mejorar cabecera del dropdown con `"Notificaciones"` (`data-i18n`) + botón compacto `"Marcar todas como leídas"` (reemplazando el badge técnico `"Realtime"`).
    - Al abrir la campanita (`shown.bs.dropdown` en `#navbar-notification-bell`) o pulsar *"Marcar todas como leídas"*: actualizar inmediatamente la UI (`unreadCount = 0`, `#notif-badge-count.classList.add('d-none')`, quitar resaltado de no leídas) y ejecutar `supabase.from('notificaciones').update({ leida: true }).eq('id_usuario_destino', user.id).eq('leida', false)`. En modo demo sin sesión real de Supabase, aislar la lista en `localStorage` por `email` del usuario activo.
    - En `auth.js` (`logout()` y al inicio de `loginWithEmail()`): invocar obligatoriamente `clearAllRealtimeSubscriptions()`, disparar `'paw:auth-changed'` para resetear `adminState`/`vetState`/campana y evitar cualquier notificación cruzada al cambiar de cuenta sin recargar la página.
    - En `propietario.js`, `cuidador.js` y `veterinaria.js`: añadir filtros explícitos en `subscribeRealtime(..., filter)` (`id_cuidador=eq.${cuidadorProfile.id}`, `id_clinica_derivada=eq.${clinicaId}`, etc.) y descartar en callback cualquier payload que no pertenezca al usuario activo.

---

### 8. Hallazgos Proactivos Adicionales Detectados en Auditoría de Código

| # | Severidad | Archivo / Línea | Defecto Detectado | Solución en v5.2 |
|---|---|---|---|---|
| **PA-1** | **ALTA** | `js/auth/auth.js:266-284`; `administrador.js:901`; `veterinaria.js:178` | `logout()` no limpia suscripciones Realtime previas ni reinicia `adminState` / `vetState` en memoria al cambiar de cuenta demo sin F5. | Llamar `clearAllRealtimeSubscriptions()` + evento `'paw:auth-changed'` para purgar singletons y listeners previos. |
| **PA-2** | **ALTA** | `index.html:197,307,445,603`; `css/auth.css:8-26` | Modales de Login, Registro Propietario y Postulaciones (especialmente Cuidador con 6 dropzones) carecen de `modal-dialog-scrollable` y `.auth-body` flex-scrollable. | Agregar `modal-dialog-scrollable` y contenedor `.auth-body` con `overflow-y: auto; flex: 1 1 auto; min-height: 0;`. |
| **PA-3** | **MEDIA** | `js/app.js:290` | Lectura huérfana de `#post-cuid-doc-url` inexistente en DOM actual (`postulaciones.js` ya usa dropzones). | Limpiar listener duplicado de `app.js` y centralizar en `postulaciones.js` + `validators.js`. |
| **PA-4** | **MEDIA** | `index.html:103` | Badge técnico rojo `"Realtime"` visible dentro de la cabecera del dropdown de la campanita. | Reemplazar por indicador humano `"En vivo"` + botón `"Marcar todas como leídas"`. |
| **PA-5** | **MEDIA** | `js/config.js:114` | `TYC_VERSION` sigue marcado como `'5.0'` cuando la plataforma avanza a `'5.2'`. | Actualizar `TYC_VERSION: '5.2'` y alinear textos visibles de versión. |
| **PA-6** | **MEDIA** | `docs/05_EVALUACION_HEURISTICAS_NIELSEN.md` | Documento desactualizado de la época `Google Apps Script` (`Index.html`, `postimages.org`). | Reescribir con la arquitectura real v5.2 (Supabase + Vanilla ES Modules + Responsive + `validators.js` + `help-modal.js`) y reflejar matriz en `README.md`. |
| **PA-7** | **BAJA** | `index.html:110` / vistas privadas | Falta un centro rápido de **Ayuda y Preguntas Frecuentes (FAQ)** contextual por rol y guía de campo `.form-text` para cumplir al 100% la Heurística H10. | Crear `js/components/help-modal.js` bilingüe (`ES/EN`) accesible desde Navbar, Footer y Sidebars. |

---

## SECCIÓN 2: EVALUACIÓN Y CUMPLIMIENTO DE LAS 10 HEURÍSTICAS DE JAKOB NIELSEN (`20 / 20`)

| N.º | Heurística de Usabilidad | Puntaje Actual v5.1 | Brechas Detectadas en Producción | Mejoras Obligatorias para v5.2 | Meta v5.2 |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **H1** | **Visibilidad del estado del sistema** | `1 / 2` | El badge rojo de la campanita no desaparece al revisar notificaciones; falta visibilidad clara del estado de pago/cobro S.O.S. tras atención clínica. | Limpieza inmediata del badge al abrir/leer (`leida = true` en BD), indicador de estado cobro S.O.S. en Propietario/Vet/Admin, spinners descriptivos y progreso en subida Storage. | **2 / 2** |
| **H2** | **Correspondencia sistema–mundo real** | `1 / 2` | Etiqueta de género inconsistente (`"Cuidadora Aprobada"`), badge técnico `"Realtime"` en campanita y fragmentos en español al activar inglés (`EN`). | Unificación neutra 100% (`"Cuidador"`/`"Propietario"`), traducción `ES / EN` total de Landing/Catálogo/Modales públicos y lenguaje 100% natural del sector cuidado canino en Cusco. | **2 / 2** |
| **H3** | **Control y libertad del usuario** | `1 / 2` | Scroll roto en Modal "Ver Perfil" del cuidador impide recorrer todo el perfil/fotos/tarifas; calendario mensual recortado sin scroll horizontal; falta botón *"Limpiar filtros"* visible cuando hay resultados vacíos. | Scroll fluido (`max-height: 90vh`, `overflow-y: auto`) en todos los modales, scroll horizontal limpio en calendario 7 días, drawer móvil reversible, botón *"Volver / Cancelar"* y reset rápido de filtros. | **2 / 2** |
| **H4** | **Consistencia y estándares** | `1 / 2` | Mezcla de burbujas nativas HTML5 vs validaciones JS personalizadas; idioma `ES/EN` parcial; nombres neutros inconsistentes (`"Cuidadora"` vs `"Propietario"`). | `novalidate` + motor único `validators.js` en todos los formularios, jerarquía uniforme de botones/colores Cusco y bilingüismo coherente en todo el flujo público. | **2 / 2** |
| **H5** | **Prevención de errores** | `0 / 2` | Teléfonos aceptan texto (`abc`), DNI/RUC/CCI sin control numérico estricto, cuidador puede abrir S.O.S. sobre reservas finalizadas y correos/nombres sin regex en postulaciones. | Validación preventiva en tiempo real (`input`/`blur`) y `submit` bloqueando caracteres inválidos, obligatoriedad uniforme de TyC, bloqueo de S.O.S. cuidador a `en_curso` (UI + SQL), y confirmaciones críticas. | **2 / 2** |
| **H6** | **Reconocimiento antes que recuerdo** | `1 / 2` | Sidebars truncan nombres, correos y opciones del menú (`Lucía Mendoza Va...`); calendario oculta columnas Fri–Sun; propietario debe adivinar si un S.O.S. con costo tiene pago pendiente. | Sidebars sin recortes (`wrap` limpio, emails visibles), calendario 7 días con encabezados siempre visibles, tarjetas S.O.S. con desglose completo de clínica/diagnóstico/monto/estado. | **2 / 2** |
| **H7** | **Flexibilidad y eficiencia de uso** | `1.5 / 2` | Faltan atajos `"Marcar todas como leídas"`, `"Limpiar filtros"` rápido y navegación ágil de sidebar en móviles `360px`–`768px`. | Dropdown con *"Marcar todas como leídas"*, drawer colapsable rápido en móvil, accesos demo 1-clic corregidos y filtros reactivos instantáneos. | **2 / 2** |
| **H8** | **Diseño estético y minimalista** | `1 / 2` | Textos cortados con `...`, modales truncados abruptamente, desbordamientos horizontales en calendario y controles en móvil `360px`. | Maquetado limpio multi-dispositivo (`360px`, `768px`, `1366px`) sin overflows ni cortes, scrollbars estilizados sutiles y jerarquía visual cálida andina intacta. | **2 / 2** |
| **H9** | **Ayuda a reconocer, diagnosticar y recuperarse de errores** | `1 / 2` | Mensajes genéricos (`"Completa los campos"`) sin explicar formato exacto esperado en teléfono, DNI/RUC o por qué el S.O.S. de cuidador no tiene opciones si no hay custodia activa. | Mensajes inline `.invalid-feedback` específicos y bilingües (*"Ingresa 9 dígitos empezando por 9, o formato +código país"*), foco automático en primer error y estado vacío instructivo en S.O.S. cuidador. | **2 / 2** |
| **H10** | **Ayuda y documentación** | `1 / 2` | Existe Modal Legal v5.1, pero falta guía rápida contextual/FAQ por rol (`ES/EN`) y textos guía `.form-text` de formato debajo de campos clave. | Crear **`js/components/help-modal.js`** (Guía Rápida & FAQ para Propietario Local/Turista, Cuidador, Veterinaria) accesible desde Navbar/Footer/Sidebars + `.form-text` claro en formularios. | **2 / 2** |
| **TOTAL** | **Calificación Global Auditada** | **9.5 / 20** | **Requiere Pulido Integral v5.2** | **Cumplimiento Completo Certificado en v5.2** | **20 / 20** |

---

## SECCIÓN 3: ESTRATEGIA DE EJECUCIÓN MODULAR (3 SUB-FASES LIMPIAS)

Para ejecutar v5.2 sin saturar la ventana de contexto ni introducir regresiones, el trabajo se divide en **3 sub-fases atómicas y secuenciales**:

1. **Sub-Fase 5.2A — Blindaje SQL/RLS, Notificaciones Aisladas + Auto-Lectura, Restricción S.O.S. Cuidador y Trazabilidad Financiera Backend:**
   - Migración idempotente **`supabase/09_pulido_v5_2.sql`** (+ sincronización de `01_schema.sql`, `03_rpc_business.sql`, `04_rls_policies.sql`, `06_seed.sql`, `07_fix_auth_and_audit.sql`).
   - Seguridad/Realtime/Notificaciones en `js/auth/auth.js`, `js/app.js`, `index.html` (dropdown campanita), filtros Realtime en `propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js` (reset singletons en `'paw:auth-changed'`), `js/config.js`.
2. **Sub-Fase 5.2B — Responsive Total (`360px`/`768px`/`1366px`), Scroll Modales/Sidebars/Calendario, Lenguaje Neutro y `i18n ES/EN` 100% Público:**
   - Corrección integral CSS (`main.css`, `auth.css`, `catalogo.css`, `paneles.css`) + wrappers en `calendario-agenda.js`, `catalogo.js`, `index.html`, sidebars sin truncamiento + mobile drawer en los 4 roles.
   - Purga de `"Cuidadora"`/`"Propietaria"` y cobertura `ES/EN` al 100% en `js/i18n.js`, `index.html`, `landing.js`, `catalogo.js`, `mapa-cusco.js`, `paw-id-publico.js` y `legal-modal.js`.
3. **Sub-Fase 5.2C — Motor Central de Validación (`validators.js`), UI Financiera S.O.S. (Propietario/Vet/Admin) + Ayuda H10 (`help-modal.js`), QA Multi-Dispositivo, Docs (`README.md`, Nielsen, Bitácora) y Deploy:**
   - Creación de `js/utils/validators.js` e integración en **todos** los formularios del sistema (`postulaciones.js`, `propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js`, `carnet-digital.js`, `wizard-reserva.js`, `billetera-cuidador.js`, `alerta-sos.js`, `router.js`, `app.js`).
   - UI completa de cargos clínicos S.O.S. + bloqueo UI de S.O.S. cuidador a `en_curso`.
   - Creación de `js/components/help-modal.js` (H10), verificación `node --check`, inspección visual/DOM `360px`/`768px`/`1366px`, actualización de `docs/05_EVALUACION_HEURISTICAS_NIELSEN.md`, `README.md` (con Matriz Nielsen 20/20), `BITACORA_EJECUCION_V5.md`, `PLAN_PULIDO_V5_2.md`, `git commit` y `git push origin main`.

---

## SECCIÓN 4: TABLA DE ASIGNACIÓN DE MODELOS Y NIVELES DE RAZONAMIENTO

> **Regla estricta de cuota:** NO utilizar modelos Claude / GPT (`0%`) ni Gemini 4 Argon (`0%`). Seleccionar únicamente entre **`Gemini 4 Hydrogen`**, **`Gemini 4 Neon`** y **`Gemini 3.8 Flash`**.

| Sub-Fase | Complejidad y Superficie | Modelo Principal Recomendado | Nivel de Razonamiento | Alternativa Válida (Mismo Pool) | Justificación Técnica |
|---|---|---|---|---|---|
| **5.2A — SQL/RLS v5.2, S.O.S. Cuidador, Cobro S.O.S. Backend & Notificaciones/Auth** | **Alta** (Políticas RLS `notificaciones`, RPCs transaccionales `incidencias_emergencias`, ciclo de vida Supabase Realtime sin fugas entre roles) | **`Gemini 4 Hydrogen`** | **`High`** | `Gemini 4 Neon` (`High`) | Máxima precisión lógica para SQL idempotente, reglas `CHECK`/RLS y aislamiento estricto de canales Realtime en cambios de sesión sin recarga. |
| **5.2B — Responsive Total (`360/768/1366`), Scroll Modales/Sidebars/Calendario, Lenguaje Neutro & `i18n ES/EN` 100%** | **Media-Alta** (Reestructuración CSS Grid/Flex multi-viewport, drawer móvil en 4 roles y traducción integral pública) | **`Gemini 3.8 Flash`** | **`Medium`** *(o `High` si se hace auditoría visual completa)* | `Gemini 4 Hydrogen` (`Medium`) | Excelente velocidad y eficiencia de tokens para maquetado CSS preciso, limpieza multi-archivo de etiquetas HTML y expansión masiva de `js/i18n.js`. |
| **5.2C — `validators.js` Transversal, UI Financiera S.O.S., `help-modal.js` (H10), QA E2E, Docs & Push** | **Muy Alta** (Orquestación transversal de todos los formularios, flujos financieros Propietario↔Vet↔Admin, QA multi-dispositivo, Docs y Git Deploy) | **`Gemini 4 Neon`** | **`High`** | `Gemini 4 Hydrogen` (`High`) | Mayor capacidad arquitectónica para integrar validaciones estrictas en los 4 roles sin romper lógica existente, validar heurísticas 20/20, documentar y desplegar en `main`. |

---

## SECCIÓN 5: CHECKLISTS DETALLADOS DE EJECUCIÓN (`- [ ]`)

### Checklist Sub-Fase 5.2A — Backend SQL v5.2, Aislamiento Notificaciones/Sesión y Reglas S.O.S. Backend
- [x] Crear **`supabase/09_pulido_v5_2.sql`** 100% idempotente ejecutable sobre producción sin pérdida de datos:
  - [x] Añadir columnas de cobro S.O.S. a `public.incidencias_emergencias`: `estado_cobro_sos`, `metodo_pago_sos`, `comprobante_pago_sos`, `fecha_pago_sos`, `observacion_cobro_sos` + backfill seguro de registros existentes con `costo_atencion_ref > 0`.
  - [x] Actualizar `public.rpc_emitir_sos`: validar autorización del invocante (`propietario` / `cuidador` de la reserva o `administrador`) y **bloquear con excepción clara si `get_my_role() = 'cuidador'` y `v_res.estado_reserva != 'en_curso'`**.
  - [x] Actualizar `public.rpc_vet_actualizar_sos`: asignar `estado_cobro_sos = 'pendiente_pago'` automáticamente cuando `costo_atencion_ref > 0` y no esté regularizado/conciliado; retornar `estado_cobro_sos` en el JSONB y mencionar cargo en notificación al propietario.
  - [x] Crear `public.rpc_propietario_regularizar_sos` (propietario reporta método/comprobante -> `'reportado_propietario'` y notifica a Vet + Admin) + `GRANT EXECUTE ... TO authenticated`.
  - [x] Crear `public.rpc_admin_conciliar_cobro_sos` (admin concilia/exonera -> `'conciliado'`/`'exonerado'` y notifica a Propietario + Vet) + `GRANT EXECUTE ... TO authenticated`.
  - [x] Endurecer RLS en `public.notificaciones` (`notificaciones_select_propias` y `notificaciones_update_leida`): restringir estrictamente a `id_usuario_destino = auth.uid()` (quitar `OR public.get_my_role() = 'administrador'`).
  - [x] Verificar `REPLICA IDENTITY DEFAULT` / publicación `supabase_realtime` activa para `notificaciones` e `incidencias_emergencias`.
- [x] Sincronizar los cambios SQL anteriores en `supabase/01_schema.sql`, `supabase/03_rpc_business.sql` y `supabase/04_rls_policies.sql`.
- [x] Unificar comentarios neutros en `supabase/06_seed.sql:148` y `supabase/07_fix_auth_and_audit.sql:286` (`Propietaria` → `Propietario`).
- [x] Corregir aislamiento de sesión/Realtime y campanita de notificaciones en frontend:
  - [x] `js/auth/auth.js`: en `logout()` y antes de iniciar nueva sesión en `loginWithEmail()`, invocar `clearAllRealtimeSubscriptions()`, resetear la campanita y emitir evento `'paw:auth-changed'`.
  - [x] `index.html:100-108` + `js/app.js`: cargar notificaciones propias desde `public.notificaciones` filtrado por `id_usuario_destino = eq.${user.id}`, suscribir Realtime por usuario autenticado (NO antes de autenticarse ni abierto a toda la tabla `incidencias_emergencias`), mostrar badge `#notif-badge-count` **solo si `unread > 0`**, marcar `leida = true` en BD y poner contador en `0` al abrir la campanita (`shown.bs.dropdown`) o pulsar **"Marcar todas como leídas"**, reemplazar badge técnico `"Realtime"` por etiqueta `"En vivo"` + botón limpiar leídas, y mantener aislamiento offline por email demo.
  - [x] Escuchar `'paw:auth-changed'` y filtrar canales Realtime por entidad/usuario en `js/roles/propietario.js`, `js/roles/cuidador.js`, `js/roles/veterinaria.js` y `js/roles/administrador.js` (purgando `adminState`, `vetState`, `reservas` en memoria al cerrar sesión).
  - [x] Actualizar `TYC_VERSION: '5.2'` en `js/config.js:114` y limpiar menciones de género en `js/config.js:82,85` (`"Cuidadora"` → `"Cuidador"` manteniendo el correo `valeria.cuidadora@pawpatitacusco.pe`).
- [x] Verificar sintaxis con `node --check` en todos los JS editados y SQL idempotente.

---

### Checklist Sub-Fase 5.2B — Responsive Total (`360px`/`768px`/`1366px`), Scroll Modales/Sidebars/Calendario, Lenguaje Neutro & `ES/EN` Completo
- [x] Corregir scroll fluido en Modal "Ver Perfil" del cuidador y todos los modales altos:
  - [x] `css/main.css` + `css/catalogo.css`: asegurar `.modal-content` flex con `max-height: 90vh`, `#modal-perfil-cuidador-content` como flex column (`min-height: 0; flex: 1 1 auto`), `.modal-perfil-header` y `.modal-footer` `flex-shrink: 0`, `.modal-body` con `overflow-y: auto` fluido y scrollbar estilizado.
  - [x] `js/public/catalogo.js`: agregar `id="modalPerfilCuidadorTitle"` y verificar visualización completa de *"Espacio de Estadía en Cusco"*, fotos, reseñas y tarifas en `360px`, `768px` y `1366px`.
  - [x] `index.html` + `css/auth.css`: agregar `modal-dialog-scrollable` y `.auth-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }` en `#modal-login`, `#modal-registro-propietario`, `#modal-postular-cuidador` y `#modal-postular-clinica`.
- [x] Eliminar cortes horizontales en los Sidebars de los 4 paneles:
  - [x] `css/paneles.css`: actualizar `.panel-dashboard-shell` (`minmax(295px, 315px) minmax(0, 1fr)` en `lg/xl`), quitar `white-space: nowrap` en `.panel-nav-btn`, aplicar `min-width: 0; flex: 1 1 auto; white-space: normal; word-break: break-word` en `.nav-icon-wrap`/texto y `flex-shrink: 0` en badges.
  - [x] `propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js`: quitar `.text-truncate` de nombres y emails en la cabecera del sidebar permitiendo salto limpio y `overflow-wrap: anywhere` en correos (cero `"Lucía Mendoza Va..."` ni `"lucia.mendoza@gmai..."`).
  - [x] En `< 992px` (`360px` y `768px`): implementar toggle colapsable / drawer fluido del menú lateral para que todas las opciones sean legibles al 100% sin scroll lateral forzado.
- [x] Corregir Calendario Mensual del Cuidador (`js/components/calendario-agenda.js` + `css/paneles.css`):
  - [x] Envolver `.agenda-calendar-weekdays` y `.agenda-calendar-grid` en `.agenda-calendar-scroll` (`overflow-x: auto`) + `.agenda-calendar-matrix` (`min-width: 810px;`) con `repeat(7, minmax(110px, 1fr))` y celdas/chips compactos, manteniendo los 7 días visibles y alineados en `360px`, `768px` y `1366px`.
- [x] Barrido global anti-desbordamiento multi-dispositivo (`360px`, `768px`, `1366px`):
  - [x] Navbar controles en `360px`, dropdown notificaciones `min(350px, calc(100vw - 1.5rem))`, tarjetas hero, catálogo/mapa Leaflet, `.table-responsive` en todas las tablas, `min-width: 0` en grids de Chart.js, Wizard steps y vista previa móvil de tarjeta PAW-ID, toasts `<= calc(100vw - 1.5rem)`.
- [x] Unificar Lenguaje Neutro en UI Pública:
  - [x] Corregir `index.html:219` (`"🏡 Cuidador Aprobado"`), `js/i18n.js:49`, `js/public/landing.js:93` (`"Cuidador Certificado • San Sebastián"`), `js/public/catalogo.js:246` (eliminar `"Adiestradora ... cuidadora"` → neutro). Verificar 0 ocurrencias de `"Cuidadora"`/`"Propietaria"` fuera de `valeria.cuidadora@pawpatitacusco.pe`.
- [x] Completar `i18n ES / EN` al 100% en todo el flujo público (`js/i18n.js`, `index.html`, `landing.js`, `catalogo.js`, `mapa-cusco.js`, `paw-id-publico.js`, `legal-modal.js`, `app.js`):
  - [x] Soportar `data-i18n-html` limpio sin perder `<strong>PAW-ID</strong>` en Hero.
  - [x] Traducir el 100% de: Navbar + dropdown notificaciones, Modales Login/Olvido/Registro/Postulación, Landing (Hero, stats, Dual Value cards + bullets, PAW-ID preview, Clínicas + badges + Llamar, Temporadas + Cancelación, Testimonios, CTA), Catálogo (filtros, cards, popup mapa, Modal Perfil completo), PAW-ID Público y Modal Legal 3 pestañas reactivo al idioma.
- [x] Verificar sintaxis con `node --check` y probar cambio en vivo `ES ↔ EN` + captura de anchos `360px`, `768px`, `1366px`.

---

### Checklist Sub-Fase 5.2C — Validación Estricta (`validators.js`), UI Trazabilidad S.O.S., Nielsen `20/20` (H1–H10 + FAQ), QA, Docs y Push
- [x] Crear **`js/utils/validators.js`** con reglas estrictas, sanitización en vivo `input`/`blur`, feedback `.is-invalid` + `.invalid-feedback` bilingüe (`ES/EN`), validación on-submit y `.form-text` explicativo:
  - [x] Teléfonos (`type="tel"`, `inputmode="numeric"`): bloquear letras al teclear; exigir `^9\d{8}$` (Perú 9 dígitos empezando en 9) o `^\+[1-9]\d{7,14}$` (internacional turistas).
  - [x] Documentos: `DNI` exacto `^\d{8}$`, `CE` `9–12` alfanumérico, `Pasaporte` `6–12` alfanumérico, `RUC` exacto 11 dígitos numéricos (`^\d{11}$` / `^(10|15|17|20)\d{9}$`).
  - [x] Emails regex estricto, nombres sin dígitos sueltos, contraseñas `>= 8` caracteres, montos/pesos con límites válidos, Yape/Plin 9 dígitos empezando en 9, CCI 20 dígitos, tarjeta últimos 4 dígitos.
  - [x] Bloqueo estandarizado por checkboxes obligatorios de Términos / Declaración Jurada con aviso visual y scroll al campo faltante.
- [x] Conectar `validators.js` + `novalidate` en **todos los formularios del sistema**:
  - [x] Públicos/Auth: `#form-login`, `#form-forgot-password`, `#form-registro-propietario`, `#form-postular-cuidador`, `#form-postular-clinica`, `#form-reset-password` (`router.js`), limpiar `#post-cuid-doc-url` muerto en `app.js:290`.
  - [x] Componentes: `#form-crud-mascota` (`carnet-digital.js`), Wizard Pasos 1–4 (`wizard-reserva.js`), `#form-solicitar-retiro-rpc` (`billetera-cuidador.js`), `#form-emitir-sos` (`alerta-sos.js`).
  - [x] Roles: `#form-perfil-propietario` (`propietario.js`), `#form-crud-servicio-cuid`, `#form-publicar-muro-cuidador` y `#form-fotos-perfil-cuidador` (`cuidador.js`), `#form-vet-actualizar-sos`, `#form-vet-dictaminar-ficha` y `#form-vet-config-sede` (`veterinaria.js`), `#form-admin-crear-clinica`, `#form-admin-arbitraje-rpc` y `#form-admin-parametros` (`administrador.js`).
- [x] Completar Regla S.O.S. Cuidador en UI (`cuidador.js` + `alerta-sos.js`):
  - [x] Filtrar estrictamente `estado_reserva === 'en_curso'` en modal y botones de tabla del cuidador.
  - [x] Mostrar mensaje claro e instructivo si no existen mascotas `en_curso` (cero mascotas finalizadas seleccionables).
- [x] Completar Trazabilidad Financiera de Emergencias S.O.S. en UI (`alerta-sos.js` + `propietario.js` + `veterinaria.js` + `administrador.js`):
  - [x] Panel Propietario: Resumen médico y financiero S.O.S. (pendiente vs liquidado), badge/alerta por cargo clínico `> 0`, detalle de clínica/diagnóstico/monto y modal **"Regularizar Cargo Clínico"** (`rpc_propietario_regularizar_sos`).
  - [x] Panel Veterinaria: mostrar badge de estado de cobro clínico (`Pendiente`, `Reportado`, `Conciliado`) en casos S.O.S.
  - [x] Panel Administrador: mostrar monto y estado de cobro en tabla *Central Global S.O.S.* y botón **"Conciliar / Exonerar Cargo"** (`rpc_admin_conciliar_cobro_sos`).
- [x] Completar Heurística H10 y Certificación Nielsen `20/20`:
  - [x] Crear **`js/components/help-modal.js`** (Centro de Ayuda & FAQ contextual por rol en `ES/EN`) accesible desde Navbar/Footer/Sidebars (`index.html`, `app.js`, role sidebars).
  - [x] Verificar cada heurística **H1–H10** alcanzando `2 / 2` (`20 / 20` total).
- [x] QA Forense Final E2E:
  - [x] `node --check` sobre el 100% de módulos JS.
  - [x] Barrido grep: 0 fugas de jerga técnica (`rpc_`, `jsonb`, `PostImg`), 0 `"Cuidadora"`/`"Propietaria"` en etiquetas de UI, 0 textos sin traducir en vistas públicas `EN`.
  - [x] Verificación visual/funcional en servidor local (preferentemente automatizada headless o browser subagent) en `360px`, `768px` y `1366px` recorriendo Landing, Catálogo, Modal Perfil Cuidador, Registro Propietario (validaciones), Propietario (S.O.S. cargos + campanita + sidebar), Cuidador (calendario 7 días + bloqueo S.O.S. sin `en_curso`), Veterinaria y Administrador.
- [x] Cierre Documental y Despliegue:
  - [x] Actualizar `docs/05_EVALUACION_HEURISTICAS_NIELSEN.md` con arquitectura real v5.2 y puntaje `20/20`.
  - [x] Actualizar `README.md` incluyendo mejoras v5.2, guía con `supabase/09_pulido_v5_2.sql` y la **Matriz de Cumplimiento de las 10 Heurísticas de Jakob Nielsen (`20/20`)**.
  - [x] Registrar el cierre completo de **v5.2** en `BITACORA_EJECUCION_V5.md` y marcar al 100% `[x]` este `PLAN_PULIDO_V5_2.md`.
  - [x] Ejecutar `git status`, `git add`, `git commit` descriptivo de **v5.2** y **`git push origin main`**.

---

## SECCIÓN 6: PROMPTS AUTOCONTENIDOS LISTOS PARA EJECUTAR (CHATS LIMPIOS)

### PROMPT SUB-FASE 5.2A — SQL/RLS v5.2, Regla S.O.S. Cuidador, Trazabilidad Cobro S.O.S. Backend & Notificaciones Aisladas + Auto-Lectura

> **Modelo sugerido:** `Gemini 4 Hydrogen` (`High`) — *Alternativa: `Gemini 4 Neon` (`High`).*

```markdown
Actúa como Arquitecto Principal PostgreSQL / Supabase y Especialista de Seguridad Full-Stack ejecutando la **Sub-Fase 5.2A** de **Paw Patita Cusco v5.2**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_2.md` (Sección 1: Puntos 4, 5, 6, 7 y Hallazgos PA-1, PA-4, PA-5; Sección 5: Checklist 5.2A).
3. Alcance estricto: trabaja únicamente sobre backend SQL (`supabase/`), ciclo Auth/Realtime/Notificaciones (`js/auth/auth.js`, `js/app.js`, `js/config.js`, `index.html` bloque `#navbar-notification-bell`, y listeners Realtime/purga de sesión en `js/roles/*.js`), además de marcar los checks `[x]` de 5.2A en `PLAN_PULIDO_V5_2.md`. **NO modifiques estilos CSS de layout ni expandas `i18n.js` en esta sub-fase (eso va en 5.2B).**
4. Todo script nuevo en `supabase/09_pulido_v5_2.sql` debe ser **100% idempotente** (`CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`) y no destruir datos reales de producción (`https://evephdzpoonavggwoejs.supabase.co`).
5. NUNCA cambies el correo literal de login `valeria.cuidadora@pawpatitacusco.pe` ni invalides contraseñas demo existentes; cambia únicamente etiquetas visibles o comentarios.

### ARCHIVOS A INSPECCIONAR (SOLO SECCIONES RELEVANTES)
- `supabase/01_schema.sql` (`incidencias_emergencias`, `notificaciones`)
- `supabase/04_rls_policies.sql` (`notificaciones_select_propias`, `notificaciones_update_leida`)
- `supabase/08_pulido_v5_1.sql` (`rpc_vet_actualizar_sos`, `rpc_emitir_sos`)
- `supabase/06_seed.sql` (L148 y S.O.S. L688–718), `supabase/07_fix_auth_and_audit.sql` (L286)
- `js/supabase-client.js` (`subscribeRealtime`, `clearAllRealtimeSubscriptions`)
- `js/auth/auth.js`, `js/app.js`, `js/config.js`, `index.html` (L82–115)
- Secciones de suscripción Realtime y estado inicial en `js/roles/propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js`

### TAREAS EXACTAS A EJECUTAR
1. **Crear `supabase/09_pulido_v5_2.sql` (Idempotente para Producción):**
   - **Bloque A — Trazabilidad Financiera S.O.S.:**
     - `ALTER TABLE public.incidencias_emergencias ADD COLUMN IF NOT EXISTS`:
       - `estado_cobro_sos text NOT NULL DEFAULT 'sin_cargo'` (con `CHECK (estado_cobro_sos IN ('sin_cargo', 'pendiente_pago', 'reportado_propietario', 'conciliado', 'exonerado'))` aplicado de forma idempotente).
       - `metodo_pago_sos text`, `comprobante_pago_sos text`, `fecha_pago_sos timestamptz`, `observacion_cobro_sos text`.
     - Backfill seguro: si `COALESCE(costo_atencion_ref, 0) > 0` y `estado_cobro_sos = 'sin_cargo'`, actualizar `'SOS-2026-0102'` (si está resuelta histórica) a `'conciliado'` y el resto con monto pendiente a `'pendiente_pago'`.
     - Actualizar `public.rpc_vet_actualizar_sos`: mantener firma, `FOR UPDATE OF i;`, calcular automáticamente `estado_cobro_sos` a `'pendiente_pago'` cuando `COALESCE(p_costo, i.costo_atencion_ref, 0) > 0` y el estado previo sea `'sin_cargo'`, incluir `'estado_cobro_sos'` en la notificación del propietario (si hay costo) y en el JSONB devuelto.
     - Crear `public.rpc_propietario_regularizar_sos(p_id_incidencia uuid, p_metodo_pago text, p_comprobante text, p_observacion text DEFAULT NULL)`: valida que el invocante sea propietario de la mascota/reserva, `costo_atencion_ref > 0`, cambia `estado_cobro_sos = 'reportado_propietario'`, guarda método/comprobante/fecha, e inserta notificación para los médicos vinculados a la clínica derivada y para todos los administradores.
     - Crear `public.rpc_admin_conciliar_cobro_sos(p_id_incidencia uuid, p_accion text, p_observacion text DEFAULT NULL)`: exclusivo `'administrador'`, acepta `'conciliar'` (`'conciliado'`) o `'exonerar'` (`'exonerado'`), guarda fecha/observación e inserta notificación para propietario y clínica.
   - **Bloque B — Restricción S.O.S. del Cuidador (`en_curso` obligatorio):**
     - Actualizar `public.rpc_emitir_sos`: obtener `v_rol := public.get_my_role();`, verificar que el usuario tenga relación legítima con la reserva (`auth.uid() IN (v_res.id_propietario, v_res.cuidador_user_id) OR v_rol = 'administrador'`) y, si `v_rol = 'cuidador'`, exigir `v_res.estado_reserva = 'en_curso'` (de lo contrario `RAISE EXCEPTION 'Solo puedes emitir una alerta S.O.S. para mascotas que estén actualmente En Curso bajo tu custodia activa.'`).
   - **Bloque C — Aislamiento Estricto de `public.notificaciones`:**
     - Reemplazar políticas `notificaciones_select_propias` y `notificaciones_update_leida` eliminando `OR public.get_my_role() = 'administrador'`: usar estrictamente `USING (id_usuario_destino = auth.uid())` y `WITH CHECK (id_usuario_destino = auth.uid())`.
   - **Bloque D — Grants:** `GRANT EXECUTE` para `rpc_propietario_regularizar_sos` y `rpc_admin_conciliar_cobro_sos` hacia `authenticated`.
2. **Sincronizar SQL base:** Reflejar esos mismos cambios en `supabase/01_schema.sql`, `supabase/03_rpc_business.sql`, `supabase/04_rls_policies.sql`, y corregir `-- 2. Propietario Local Cusco` en `supabase/06_seed.sql:148` y `supabase/07_fix_auth_and_audit.sql:286`.
3. **Reparar Campanita de Notificaciones, Aislamiento Realtime y Ciclo Auth:**
   - En `index.html:100-108`: reemplazar `<span class="badge bg-danger rounded-pill">Realtime</span>` por etiqueta limpia `"En vivo"` y agregar botón compacto `#btn-mark-all-notifs-read` (*"Marcar leídas"*).
   - En `js/app.js`:
     - Reemplazar `initRealtimeAlerts()` (global antes del login sobre `incidencias_emergencias`) por un centro de notificaciones estrictamente vinculado al usuario autenticado (`syncUserNotifications(user)` y `resetNotificationsState()`):
       - Sin sesión: ocultar campanita, `unreadCount = 0`, limpiar `#notifications-list` y cerrar canal.
       - Con sesión: consultar `public.notificaciones` con `.eq('id_usuario_destino', user.id).order('created_at', { ascending: false }).limit(20)`; suscribir `canal-notifs-${user.id}` a `public.notificaciones` (`*`, `filter: id_usuario_destino=eq.${user.id}`) descartando defensivamente filas de otro `id_usuario_destino`; mostrar `#notif-badge-count` **únicamente si `unread > 0`**.
       - En demo local (sin Supabase o fallback): aislar las notificaciones locales por clave `paw_notifs_${user.email}` para no mezclar entre roles.
       - Al abrir `#navbar-notification-bell` (`shown.bs.dropdown`) o hacer clic en `#btn-mark-all-notifs-read`: ocultar de inmediato `#notif-badge-count` (`0`) y ejecutar `.update({ leida: true }).eq('id_usuario_destino', user.id).eq('leida', false)` en `public.notificaciones`.
   - En `js/auth/auth.js`: tanto en `logout()` como al iniciar un nuevo `loginWithEmail()`, invocar `clearAllRealtimeSubscriptions()`, limpiar el estado de notificaciones y despachar `window.dispatchEvent(new CustomEvent('paw:auth-changed', { detail: { user: ... } }))`.
   - En `js/roles/propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js`:
     - Escuchar `'paw:auth-changed'` para limpiar `adminState`, `vetState`, `reservas` y caches en memoria al cerrar sesión o cambiar de cuenta.
     - Añadir filtros explícitos en `subscribeRealtime` donde aplique (`id_cuidador=eq.${cuidadorProfile.id}`, `id_clinica_derivada=eq.${clinicaId}`, etc.) verificando pertenencia al usuario actual dentro del callback.
   - En `js/config.js`: actualizar `TYC_VERSION: '5.2'` (`L114`) y corregir `Cuidadora Aprobada`/`Cuidadora Activa` (`L82, L85`) a `Cuidador Aprobado`/`Cuidador Activo` (manteniendo el email `valeria.cuidadora@pawpatitacusco.pe`).
4. **Verificación y Checklist:**
   - Correr `node --check` sobre todos los JS modificados.
   - Marcar `[x]` todos los ítems de la **Sub-Fase 5.2A** en `PLAN_PULIDO_V5_2.md` y documentar brevemente en `BITACORA_EJECUCION_V5.md` recordando ejecutar `supabase/09_pulido_v5_2.sql` en Supabase SQL Editor.
```

---

### PROMPT SUB-FASE 5.2B — Responsive Total (`360px`/`768px`/`1366px`), Scroll Modales/Sidebars/Calendario, Lenguaje Neutro & `i18n ES/EN` 100%

> **Modelo sugerido:** `Gemini 3.8 Flash` (`Medium` o `High`) — *Alternativa: `Gemini 4 Hydrogen` (`Medium`).*

```markdown
Actúa como Product Designer Senior e Ingeniero CSS/UI Multi-Dispositivo ejecutando la **Sub-Fase 5.2B** de **Paw Patita Cusco v5.2**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_2.md` (Sección 1: Puntos 1, 2, 4 y Hallazgos PA-2; Sección 5: Checklist 5.2B).
3. NO modifiques `supabase/*.sql` ni rompas la lógica de `notificaciones`/`auth.js` implementada en 5.2A.
4. No alteres la dirección de correo demo `valeria.cuidadora@pawpatitacusco.pe`; unifica todas las etiquetas visibles de rol a género neutro (**`"Cuidador"` / `"Propietario"`** en ES, **`"Caregiver"` / `"Owner"`** en EN).
5. Asegúrate de que **NO haya texto cortado ni desbordamientos horizontales inesperados** al probar en `360px`, `768px` y `1366px`.

### ARCHIVOS A EDITAR
- `index.html`
- `css/main.css`, `css/auth.css`, `css/catalogo.css`, `css/paneles.css`
- `js/i18n.js`, `js/app.js`
- `js/public/landing.js`, `js/public/catalogo.js`, `js/public/mapa-cusco.js`, `js/public/paw-id-publico.js`
- `js/components/legal-modal.js`, `js/components/calendario-agenda.js`
- `js/roles/propietario.js`, `js/roles/cuidador.js`, `js/roles/veterinaria.js`, `js/roles/administrador.js` (exclusivamente markup de cabecera/menú del sidebar + drawer móvil para eliminar recortes)

### TAREAS EXACTAS A EJECUTAR
1. **Reparar Scroll en Modal "Ver Perfil" del Cuidador y Modales Altos (`css/main.css`, `css/auth.css`, `css/catalogo.css`, `index.html`, `js/public/catalogo.js`):**
   - Garantizar `.modal-dialog-scrollable .modal-content { max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }` (con `90dvh` donde sea soportado).
   - En `#modal-perfil-cuidador-content`: aplicar `display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; max-height: 90vh; overflow: hidden;`. Fijar `flex-shrink: 0` en `.modal-perfil-header` y `.modal-footer`, y en `.modal-body` aplicar `flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin;` + barra WebKit estilizada (`::-webkit-scrollbar`). Verificar que *"Espacio de Estadía en Cusco"*, galería, reseñas y tarifas puedan recorrerse suavemente hasta el final en `360px`, `768px` y `1366px`. Agregar `id="modalPerfilCuidadorTitle"` al título en `catalogo.js`.
   - En `index.html` + `css/auth.css`: añadir `modal-dialog-scrollable` a `#modal-login`, `#modal-registro-propietario`, `#modal-postular-cuidador` y `#modal-postular-clinica`, convirtiendo `.auth-body` / `.modal-body` en el panel interno scrollable con `.auth-header` fijo (`flex-shrink: 0`).
2. **Eliminar Cortes Visuales en Sidebars de los 4 Paneles (`css/paneles.css` + los 4 roles):**
   - En `css/paneles.css`:
     - `.panel-dashboard-shell`: en `>= 992px`, usar `grid-template-columns: minmax(295px, 315px) minmax(0, 1fr); gap: 1.5rem;`.
     - `.panel-nav-btn`: quitar `white-space: nowrap`; establecer `min-width: 0; white-space: normal; text-align: left; word-break: break-word; overflow-wrap: break-word; gap: 0.55rem; line-height: 1.25;`.
     - `.nav-icon-wrap`: `min-width: 0; flex: 1 1 auto; display: flex; align-items: center; gap: 0.65rem;`.
     - Badges dentro del botón lateral: `flex-shrink: 0; white-space: nowrap;`.
     - Cabecera usuario sidebar: permitir nombre en 2 líneas limpias sin `.text-truncate` (`overflow-wrap: break-word`) y correo con `overflow-wrap: anywhere; word-break: break-word;` (cero `"Lucía Mendoza Va..."` ni `"lucia.mendoza@gmai..."`).
   - En los 4 archivos de rol (`propietario.js`, `cuidador.js`, `veterinaria.js`, `administrador.js`): quitar `.text-truncate` del nombre/correo en la tarjeta lateral e incorporar un toggle **Menú Colapsable / Drawer Fluido para Tablet/Móvil (`< 992px`)** en `.panel-sidebar` para navegar todas las opciones completas en `360px` y `768px` sin cortes ni apretujamiento.
3. **Reparar Calendario Mensual del Cuidador (`js/components/calendario-agenda.js` + `css/paneles.css`):**
   - Envolver `.agenda-calendar-weekdays` y `.agenda-calendar-grid` dentro de `<div class="agenda-calendar-scroll"><div class="agenda-calendar-matrix">...</div></div>` e incluir texto guía discreto en pantalla pequeña (*"Desliza horizontalmente para ver los 7 días →"*).
   - En `css/paneles.css`: `.agenda-calendar-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 0.5rem; }`, `.agenda-calendar-matrix { min-width: 810px; }`, `.agenda-calendar-weekdays` y `.agenda-calendar-grid` con `grid-template-columns: repeat(7, minmax(110px, 1fr))`, celdas con `min-width: 0` y chips compactos; eliminar la regla destructiva `@media (max-width: 767.98px)` que ocultaba encabezados `Lun..Dom` y convertía el calendario a 2 columnas.
4. **Barrido Global Multi-Dispositivo (`360px`, `768px`, `1366px`):**
   - Asegurar `body { overflow-x: clip; }`, controles navbar flexibles sin desbordar `360px`, `.notifications-dropdown { width: min(350px, calc(100vw - 1.5rem)); }`, `.toast { max-width: calc(100vw - 1.5rem); }`, `.table-responsive` en toda tabla ancha, `min-width: 0` en contenedores padres de Chart.js/grid, mapa Leaflet estable en `360px` y pasos del Wizard responsivos.
5. **Lenguaje Neutro Consistente (`"Cuidador"` / `"Propietario"`):**
   - Actualizar `index.html:219` (`🏡 Cuidador Aprobado`), `js/i18n.js:49`, `js/public/landing.js:93` (`Cuidador Certificado • San Sebastián`) y `js/public/catalogo.js:246` (redacción neutra). Verificar mediante grep **0 ocurrencias** de `Cuidadora` o `Propietaria` en textos visibles de la UI.
6. **Internacionalización `ES / EN` al 100% en Landing, Catálogo, Modales y Vistas Públicas:**
   - Ampliar `DICTIONARY.ES` y `DICTIONARY.EN` en `js/i18n.js` cubriendo: Navbar completo + dropdown notificaciones, Footer completo, Hero + badges fotográficos + estadísticas, tarjetas Dual Value + todas sus viñetas, PAW-ID preview, Clínicas + etiquetas *"Atención Regular / Urgencia desde / Llamar"*, Temporadas + Política Escalonada de Cancelación, Testimonios, Banner CTA, Catálogo completo + filtros + popups mapa + **Modal "Ver Perfil del Cuidador"** completo, Vista Pública PAW-ID, Modales de Login / Recuperar / Registro Propietario / Postulación Cuidador / Postulación Clínica (títulos, labels, placeholders y hints), y Modal Legal Global de 3 pestañas (`legal-modal.js` reactivo a `getCurrentLang()`).
   - Usar `data-i18n-html` en `js/public/landing.js:151` para conservar `<strong>PAW-ID</strong>`, y asegurar en `js/app.js` que cambiar `ES ↔ EN` actualice tanto elementos con `data-i18n*` como vistas y modales abiertos.
7. **Verificación y Checklist:**
   - Ejecutar `node --check` en todos los JS editados y grep de `Cuidadora`/`Propietaria`.
   - Verificar (iniciando servidor local temporal si deseas con herramienta disponible) el renderizado y scroll en `360px`, `768px` y `1366px` y la traducción completa a `EN`.
   - Marcar `[x]` los ítems de la **Sub-Fase 5.2B** en `PLAN_PULIDO_V5_2.md` y actualizar `BITACORA_EJECUCION_V5.md`.
```

---

### PROMPT SUB-FASE 5.2C — Validación Estricta (`validators.js`), UI Trazabilidad S.O.S., Nielsen `20/20` (+ FAQ H10), QA, Docs y Deploy

> **Modelo sugerido:** `Gemini 4 Neon` (`High`) — *Alternativa: `Gemini 4 Hydrogen` (`High`).*

```markdown
Actúa como Arquitecto Principal Full-Stack, Especialista IHC y Auditor QA Forense ejecutando la **Sub-Fase 5.2C (Cierre y Despliegue)** de **Paw Patita Cusco v5.2**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_2.md` (Sección 1: Puntos 3, 5, 6 y Hallazgos PA-3..PA-7; Sección 2: Heurísticas Nielsen H1–H10; Sección 5: Checklist 5.2C).
3. NO modifiques `supabase/*.sql` (ya cerrado en 5.2A) ni rompas los arreglos CSS/i18n de 5.2B.
4. CERO jerga técnica en UI (`rpc_`, `jsonb`, `PostImg`, `GoTrue`), CERO error-swallowing cuando Supabase está activo, y CERO caracteres inválidos aceptados en teléfonos/DNI/RUC/emails.

### ARCHIVOS A CREAR / EDITAR
- **Crear:** `js/utils/validators.js`, `js/components/help-modal.js`
- **Editar:** `index.html`, `js/app.js`, `js/router.js`, `js/i18n.js` (mensajes de validación/FAQ/S.O.S. financiero), `js/auth/postulaciones.js`, `js/components/alerta-sos.js`, `js/components/carnet-digital.js`, `js/components/wizard-reserva.js`, `js/components/billetera-cuidador.js`, `js/roles/propietario.js`, `js/roles/cuidador.js`, `js/roles/veterinaria.js`, `js/roles/administrador.js`
- **Documentación & Cierre:** `docs/05_EVALUACION_HEURISTICAS_NIELSEN.md`, `README.md`, `BITACORA_EJECUCION_V5.md`, `PLAN_PULIDO_V5_2.md`

### TAREAS EXACTAS A EJECUTAR
1. **Motor Central de Validación Estricta en Tiempo Real y Envío (`js/utils/validators.js`):**
   - Crear helpers reutilizables compatibles `ES/EN`:
     - Sanitización en evento `input` para teléfonos (`type="tel"`, `inputmode="numeric"`): permitir solo dígitos (y `+` en posición `0`). Validar `^9\d{8}$` (Perú 9 dígitos empezando en 9) o `^\+[1-9]\d{7,14}$` (turistas internacionales).
     - Documentos: `DNI` (`inputmode="numeric"`, exacto 8 dígitos), `CE` (9–12 alfanuméricos), `Pasaporte` (6–12 alfanuméricos), `RUC` (`inputmode="numeric"`, exacto 11 dígitos).
     - Email regex estricto `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`.
     - Nombres/Apellidos: bloquear dígitos numéricos sueltos; longitud mínima `>= 2`.
     - Cuentas de cobro (`Yape/Plin` `^9\d{8}$`, `CCI` `^\d{20}$`), tarjeta últimos 4 dígitos (`^\d{4}$`), código operación (`^[A-Za-z0-9-]{6,30}$`), peso mascota (`0.3–100`), rangos numéricos en parámetros/tarifas y contraseñas (`>= 8` + confirmación en `#form-reset-password`).
     - Checkboxes obligatorios de **Términos y Condiciones / Declaración Jurada**: estandarizar el bloqueo de envío en TODOS los formularios donde existan, marcando `.is-invalid`, mostrando aviso comprensible debajo y moviendo el foco si falta marcar.
   - Conectar `validators.js` + `novalidate` + `.form-text` descriptivo en **todos los formularios del sistema**: `#form-login`, `#form-forgot-password`, `#form-registro-propietario`, `#form-postular-cuidador`, `#form-postular-clinica`, `#form-reset-password`, `#form-perfil-propietario`, `#form-crud-mascota`, Wizard Pasos 1–4, `#form-crud-servicio-cuid`, `#form-publicar-muro-cuidador`, `#form-fotos-perfil-cuidador`, `#form-solicitar-retiro-rpc`, `#form-emitir-sos`, `#form-vet-actualizar-sos`, `#form-vet-dictaminar-ficha`, `#form-vet-config-sede`, `#form-admin-crear-clinica`, `#form-admin-arbitraje-rpc`, `#form-admin-parametros`. Limpiar referencia muerta `#post-cuid-doc-url` en `js/app.js:290`.
2. **Restricción UI S.O.S. del Cuidador (`js/roles/cuidador.js` + `js/components/alerta-sos.js`):**
   - En `cuidador.js` (botón sidebar y acciones de tabla): pasar `soloEnCurso: true` / `roleContext: 'cuidador'` a `abrirModalEmitirSos()`. Mostrar botón S.O.S. de fila únicamente en reservas `estado_reserva === 'en_curso'`.
   - En `alerta-sos.js`: cuando `soloEnCurso === true`, filtrar estrictamente `r.estado_reserva === 'en_curso'`; si no hay ninguna, mostrar estado vacío amigable explicando que la alerta S.O.S. de cuidador solo aplica a mascotas en custodia activa tras Check-In.
3. **Trazabilidad Financiera de Emergencias S.O.S. en UI (`alerta-sos.js`, `propietario.js`, `veterinaria.js`, `administrador.js`):**
   - **Propietario:** en `renderSeccionAlertasSos` y en Resumen del Propietario, mostrar banner/KPIs de **"Historial Médico y Cargos Clínicos S.O.S."** (monto pendiente `PEN/USD`, total regularizado/conciliado), tarjetas con detalle de clínica/diagnóstico/tratamiento/estado (`Pendiente de Pago`, `Pago Reportado`, `Conciliado`) y modal validado **"Regularizar Cargo Clínico"** invocado sobre `rpc_propietario_regularizar_sos`.
   - **Veterinaria:** mostrar badge de estado del cobro clínico en cada alerta S.O.S. (`Pendiente`, `Regularizado`, `Conciliado`).
   - **Administrador:** añadir columna **"Cargo Clínico S.O.S."** en Sección 5 (*Central Global S.O.S.*) mostrando monto, estado/comprobante y acción **"Conciliar / Exonerar Cargo"** invocando `rpc_admin_conciliar_cobro_sos`.
4. **Centro de Ayuda & FAQ Contextual por Rol — Heurística H10 (`js/components/help-modal.js`):**
   - Crear `initHelpModal()` / `abrirModalAyuda(rol = 'publico')` bilingüe (`ES/EN`) con guías prácticas breves por rol (*Propietarios & Turistas, Cuidadores, Clínicas Veterinarias, Política S.O.S. & Cobros, Seguridad PAW-ID*) y enlazarlo desde Navbar, Footer y Sidebars.
5. **QA Integral Multi-Dispositivo, Heurísticas Nielsen `20/20`, Documentación y Despliegue:**
   - Ejecutar `node --check` en el 100% de archivos JS y verificar grep de 0 fugas técnicas, 0 `"Cuidadora"`/`"Propietaria"` y 100% `ES/EN` público.
   - Iniciar servidor local (`python -m http.server`) y verificar visual/funcionalmente en `360px`, `768px` y `1366px` todos los hallazgos: modal perfil cuidador scroll completo, sidebars 4 roles sin recortes, calendario 7 días con scroll horizontal limpio, `EN` completo público, validaciones estrictas (teléfono rechaza texto, TyC bloquea), S.O.S. cuidador solo `en_curso`, trazabilidad cobro S.O.S. Propietario↔Admin y campanita de notificaciones limpiando el contador y aislada por usuario. Detener servidor local al terminar.
   - Reescribir **`docs/05_EVALUACION_HEURISTICAS_NIELSEN.md`** reflejando v5.2 (`20 / 20`).
   - Actualizar **`README.md`** con las mejoras v5.2, mención a `supabase/09_pulido_v5_2.sql` y una sección completa con la **Matriz de Cumplimiento de las 10 Heurísticas de Jakob Nielsen (`20/20`)**.
   - Registrar cierre oficial **v5.2** en **`BITACORA_EJECUCION_V5.md`** (incluyendo recordatorio de correr `supabase/09_pulido_v5_2.sql` en Supabase SQL Editor) y marcar todos los checkboxes `[x]` en **`PLAN_PULIDO_V5_2.md`**.
   - Ejecutar `git status`, `git add`, `git commit -m "feat(v5.2): responsive total, i18n completo, validacion estricta, aislamiento notificaciones, SOS financiero y Nielsen 20/20"` y **`git push origin main`**.
```

---

## REGISTRO DE PROGRESO GLOBAL v5.2

- [x] **Sub-Fase 5.2A:** Backend SQL v5.2 (`09_pulido_v5_2.sql` + sync `01`/`03`/`04`/`06`/`07`), Regla S.O.S. Cuidador, Cobro S.O.S. Backend y Aislamiento + Auto-Lectura de Notificaciones (`auth.js`, `app.js`, roles).
- [x] **Sub-Fase 5.2B:** Responsive Total (`360px`/`768px`/`1366px`), Scroll Modales/Sidebars/Calendario, Lenguaje Neutro y `i18n ES/EN` 100% Público.
- [x] **Sub-Fase 5.2C:** Validación Estricta (`validators.js`), UI Trazabilidad S.O.S., Centro Ayuda H10 (`help-modal.js`), Certificación Nielsen `20/20`, QA E2E, `README.md`/`BITACORA_EJECUCION_V5.md` y Deploy GitHub Pages (`git push origin main`).

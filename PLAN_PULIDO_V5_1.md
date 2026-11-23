# Blueprint Maestro de Pulido y Consolidación — Paw Patita Cusco v5.1

> **Proyecto:** Paw Patita Cusco (`v5.0` → `v5.1 — Edición "Andes & Huellas Cusco"`)  
> **Despliegue Producción:** `https://nasdigog-glitch.github.io/paw-patita-cusco/`  
> **Backend Supabase:** `https://evephdzpoonavggwoejs.supabase.co`  
> **Arquitectura:** Static SPA Vanilla ES Modules (`index.html`, `css/*.css`, `js/**/*.js`, `supabase/*.sql`) — Cero bundler, deploy directo en GitHub Pages.  
> **Regla de Oro para Todos los Chats de Ejecución:** **NUNCA leer `legacy-gas/` ni `BD-PAWPATITAS-v3.xlsx`.** Este documento contiene el diagnóstico forense completo, líneas exactas, contratos de funciones y el plan paso a paso autocontenido.

---

## Mapa de Nomenclatura Real del Repositorio (Referencia Rápida)

Para evitar que agentes posteriores creen archivos duplicados o busquen rutas inexistentes, esta es la correspondencia real del proyecto:

| Concepto / Referencia | Archivo Real en el Repositorio | Acción en v5.1 |
|---|---|---|
| Tokens de diseño CSS (`tokens.css`) | Actualmente embebidos en `css/main.css` (L7–L94) | **Crear `css/tokens.css`** y cargarlo antes de `css/main.css` en `index.html` |
| Estilos principales (`styles.css`) | `css/main.css`, `css/auth.css`, `css/catalogo.css`, `css/paneles.css`, `css/print.css` | Actualizar todos manteniendo la estructura modular |
| Cliente Supabase & Storage (`storage.js`) | `js/supabase-client.js` | Potenciar con compresión client-side, URLs firmadas para buckets privados y detección de URLs `postimg` rotas + **crear `js/components/file-uploader.js`** |
| Helpers UI (`ui.js`) | `js/utils/ui-helpers.js` | Limpiar jerga (`GoTrue`, rutas `.sql`), mejorar apilamiento de modales |
| Modal Legal Global (`legalModal.js`) | No existe aún | **Crear `js/components/legal-modal.js`** (delegación global `[data-legal-tab]`) |
| Motor bilingüe ES/EN | No existe aún | **Crear `js/i18n.js`** + conectar al conmutador en `js/app.js` |
| Modal S.O.S. (`sosModal.js`) | `js/components/alerta-sos.js` | Corregir `p_ubicacion`, icono roto, fallback `data.length > 0` y jerga |
| Script de migración SQL v5.1 | Último existente: `supabase/07_fix_auth_and_audit.sql` | **Crear `supabase/08_pulido_v5_1.sql`** (idempotente para producción) y sincronizar `02`–`06` para instalaciones limpias |

---

## SECCIÓN 1: DIAGNÓSTICO FORENSE DETALLADO (BLOQUES 1 AL 8 + HALLAZGOS PROACTIVOS)

### Bloque 1: Identidad Visual Auténtica ("Andes & Huellas Cusco") y Corrección Crítica de Contraste

#### Causas Raíz Exactas
1. **Footer prácticamente ilegible (contraste ~1.3:1 sobre `#020617`):**
   - `css/main.css:823-839`: `.footer-paw` usa `background-color: var(--pp-secondary-dark)` (`#020617`) y `color: #CBD5E1`, pero los textos descriptivos, distritos y barra legal inferior en `index.html:130, 133, 166, 175, 177` tienen la clase Bootstrap `.text-muted` (que impone `color: rgba(33, 37, 41, 0.75) !important` — gris carbón oscuro sobre fondo negro-azul).
   - `css/main.css:830`: `.footer-paw a` usa `#94A3B8` (contraste bajo para enlaces pequeños).
2. **Encabezados y párrafos oscuros sobre banners oscuros/coloreados (bug de especificidad CSS):**
   - `css/main.css:125-128` declara `h1, h2, h3, h4, h5, h6 { color: var(--pp-secondary); }` (`#0F172A`) y `css/main.css:137-138` declara `p { color: var(--pp-text-main); }` (`#1E293B`).
   - Porque las reglas de etiqueta directa vencen a la herencia de `.text-white` del contenedor padre, en el **Banner CTA inferior** (`js/public/landing.js:428-443`, que además usa un degradado apagado `#FF6B35 → #2E4057`), tanto `<h2>` como `<p>` se renderizan en **texto oscuro casi ilegible** sobre el fondo degradado.
   - El mismo bug afecta a `.paw-id-banner-emergencia` en `js/public/paw-id-publico.js:172-173` (título y subtítulo oscuros sobre fondo rojo de emergencia).
3. **Estética clínica genérica sin identidad cusqueña:**
   - `css/main.css:35` fija `--pp-bg-body: #F8FAFC` (blanco azulado frío) y `js/public/landing.js:134` envuelve el Hero en `bg-white border-bottom` plano y centrado, sin composición fotográfica cálida de mascotas en Cusco ni motivos textiles/andinos.

#### Solución Definitiva
- **Extraer y renovar tokens en `css/tokens.css`** (cargado en `index.html` antes de `css/main.css`):
  - Fondos cálidos andinos: `--pp-bg-body: #FAF7F2`, `--pp-bg-sand: #F3EDE2`, `--pp-bg-surface: #FFFFFF`, `--pp-border-warm: #E7DDD0`.
  - Paleta de marca: Terracota Andino `--pp-primary: #E85D24` (hover `#C84B17`, deep `#9A3412`), Verde Bosque Montaña `--pp-forest: #1E5631` (dark `#143D23`), Dorado Inti `--pp-gold: #D99B26` (soft `#FEF3C7`), Azul-Noche Profundo `--pp-secondary: #111827` (dark `#0B1120`).
- **Identidad "Andes & Huellas Cusco" en `css/main.css`, `css/auth.css`, `css/catalogo.css`, `css/paneles.css`, `css/print.css` y `js/public/landing.js`:**
  - Añadir franja decorativa textil cusqueña superior (`.andean-textile-ribbon`, 5px–6px con patrón geométrico SVG/CSS en `#E85D24`, `#D99B26`, `#1E5631`, `#9A3412`) en topbar y separadores de sección.
  - Rediseñar el Hero (`js/public/landing.js:134-185`) en formato editorial cálido de 2 columnas con fondo crema andino (`linear-gradient(135deg, #FAF7F2 0%, #F3EDE2 60%, #FDEBD0 100%)`), marca de agua SVG sutil de silueta de montañas andinas (Ausangate/Sacsayhuamán) + huellas, y collage fotográfico cálido de mascotas felices en entornos cusqueños (imágenes Unsplash verificadas + fallback SVG).
  - Corregir especificidad global: `.text-white h1, .text-white h2, .text-white h3, .text-white h4, .text-white h5, .text-white h6, .text-white p, .cta-andes-banner h2, .cta-andes-banner p, .paw-id-banner-emergencia h4, .paw-id-banner-emergencia p { color: #FFFFFF !important; }`.
  - **Banner CTA Inferior (`landing.js:428-443`):** Cambiar a clase `.cta-andes-banner` con fondo rico Verde Bosque Montaña (`linear-gradient(135deg, #1E5631 0%, #143D23 65%, #0F291A 100%)`) con borde superior Dorado Inti (`#D99B26`), tipografía `#FFFFFF` puro, subtítulo `#E2F1E8`, botón primario en Terracota Andino `#E85D24` (`#FFFFFF`) y secundario outline blanco sólido.
  - **Footer Global (`index.html:122-180` + `css/main.css:823-855`):** Eliminar todas las clases `.text-muted` dentro de `.footer-paw` y definir reglas explícitas WCAG AAA (`> 7:1`): fondo `#0B1120`, títulos `#FFFFFF`, párrafos y lista de distritos `#E2E8F0`, metadatos `#CBD5E1`, enlaces legales y navegación en `#FDBA74` con `:hover { color: #FFFFFF; text-decoration: underline; }`.

---

### Bloque 2: Términos de Servicio, Políticas de Privacidad y Declaración Jurada Clicables en Todo el Sistema

#### Causas Raíz Exactas
1. **Footer con texto muerto:** `index.html:177` muestra `<div>Términos de Servicio v5.0 • Políticas de Privacidad Cusco</div>` como texto plano sin `<a>` ni `<button>`.
2. **Registro de Propietario roto:** `index.html:421` usa `<a href="#/" class="fw-bold">Términos y Condiciones v5.0</a>`, lo que redirige a la portada en lugar de abrir los términos.
3. **Postulación de Cuidador sin enlaces:** `index.html:548` (Declaración Jurada) e `index.html:557` (Código de Conducta y comisión 15%) son texto plano.
4. **Postulación de Clínica sin enlace:** `index.html:666` (Términos de Afiliación Veterinaria) es texto plano.
5. **Wizard de Reserva Paso 4 sin enlace:** `js/components/wizard-reserva.js:694` (*"Acepto los Términos de Custodia v5.0 y la Política Escalonada de Cancelación"*) es texto plano.

#### Solución Definitiva
- **Crear `js/components/legal-modal.js`** e inicializarlo una sola vez en `js/app.js` (`initLegalModal()`).
- **Delegación global de eventos:** Un listener en `document` intercepta cualquier clic en `[data-legal-tab]` (`e.preventDefault()`, `e.stopPropagation()` cuando esté dentro de un `<label>` de checkbox para no alterar el check accidentalmente) y abre `abrirModalLegal(tab = 'terminos')`.
- **Apilamiento seguro sobre modales padre:** Como el enlace también vive dentro de modales Bootstrap abiertos (Registro, Postulaciones, Wizard Paso 4), el modal legal debe usar `z-index: 1085` (backdrop `1080`) y al cerrarse verificar `document.querySelectorAll('.modal.show').length > 0` para preservar `body.classList.add('modal-open')` sin congelar el scroll del modal padre.
- **3 Pestañas Navegables Completas (Marco Legal Peruano):**
  1. `terminos`: **Términos y Condiciones de Uso (Paw Patita Cusco v5.1)** — Rol de intermediación tecnológica, obligaciones de Propietarios y Cuidadores, validación sanitaria PAW-ID, tarifas transparentes, comisión 15% plataforma / 85% cuidador, retención en garantía hasta Check-Out, política escalonada de cancelaciones (`> 48h`: 100%, `24–48h`: 70%, `< 24h`: 50%, disputa congelada a arbitraje), protección animal (Ley N° 30407) y protocolo S.O.S.
  2. `privacidad`: **Política de Privacidad y Protección de Datos Personales** — Cumplimiento expreso de la **Ley N° 29733** y su Reglamento (D.S. N° 003-2013-JUS), finalidad de datos, almacenamiento cifrado de documentos de identidad, uso de geolocalización estrictamente limitado a emergencias S.O.S. y mapa referencial, privacidad del Carné QR público (ocultamiento de DNI y dirección exacta del propietario) y ejercicio de derechos **ARCO** (Acceso, Rectificación, Cancelación y Oposición) con correo oficial de contacto.
  3. `declaracion`: **Declaración Jurada de Idoneidad y Antecedentes** — Compromiso vinculante bajo responsabilidad civil y penal (Art. 411 del Código Penal Peruano) sobre ausencia de antecedentes penales, policiales y denuncias por maltrato animal, veracidad de documentos (DNI, PNP, PJ, domicilio / RUC y colegiatura CMVP) y sujeción a auditorías y suspensión inmediata.
- **Conexiones Obligatorias (`data-legal-tab`):**
  - Footer (`index.html:177`): enlaces clicables `data-legal-tab="terminos"`, `data-legal-tab="privacidad"` y `data-legal-tab="declaracion"`.
  - Registro Propietario (`index.html:421`): `data-legal-tab="terminos"` y `data-legal-tab="privacidad"`.
  - Postulación Cuidador (`index.html:548, 557`): `data-legal-tab="declaracion"` y `data-legal-tab="terminos"`.
  - Postulación Clínica (`index.html:666`): `data-legal-tab="terminos"` y `data-legal-tab="declaracion"`.
  - Wizard Reserva Paso 4 (`js/components/wizard-reserva.js:694`): `data-legal-tab="terminos"`.

---

### Bloque 3: Eliminación Total de `PostImg` y Migración a Subida Directa en Supabase Storage (Imágenes + PDFs)

#### Causas Raíz Exactas
1. **Banner azul *"free image hosting - image not found"* en las 4 clínicas de la Landing (y docs/cartillas):**
   - `supabase/06_seed.sql:85, 94, 103, 112, 121` contiene URLs ficticias caídas de PostImg (`https://i.postimg.cc/8cZ7xK2p/vet-cusco-1.jpg`..`5.jpg` y `cmvp-cert-1..5.jpg`).
   - También hay enlaces `i.postimg.cc/8cZ7xK2p/...` en `06_seed.sql:416-419` (4 docs de cuidadores) y `06_seed.sql:501, 512, 523, 534, 546-548` (cartillas de mascotas), además de seeds locales en `js/public/landing.js:23-62`, `js/roles/veterinaria.js`, `js/roles/administrador.js` y `js/components/carnet-digital.js`.
   - **Por qué falló `onerror` en `landing.js:466`:** PostImg devuelve una imagen PNG real de error con **HTTP 200 OK**, por lo que el navegador considera la carga exitosa y **NUNCA dispara el evento `onerror`**.
2. **Bug crítico en `js/supabase-client.js:113-115` (Buckets privados devuelven URL pública rota):**
   - `uploadOrResolveMedia()` SIEMPRE invoca `storage.from(bucket).getPublicUrl(path)` incluso para `documentos-verificacion` y `comprobantes-pago`, que son **privados** (`public = false` en `supabase/05_storage_buckets.sql:25, 27`). Cualquier enlace generado para DNI/antecedentes/comprobantes falla con error 400/404 al abrirlo en el panel de Administración.
3. **Violación de CHECK constraint en `fotos_reporte` (`js/supabase-client.js:80, 117`):**
   - `uploadOrResolveMedia()` retorna `origen: 'storage'`, mientras que `supabase/01_schema.sql:560` exige `origen_almacenamiento IN ('postimg', 'supabase_storage', 'externo')`.
4. **Sin compresión de imágenes ni validación real de MIME/tamaño en `js/supabase-client.js`:**
   - El JSDoc promete compresión client-side, pero el código sube el `File` crudo sin validar extensión, tamaño ni comprimir imágenes pesadas de cámara móvil.
5. **Políticas RLS de Storage demasiado restrictivas para postulantes y falta de `application/pdf` en cartillas (`supabase/05_storage_buckets.sql`):**
   - `perfiles` (`05_storage_buckets.sql:45-50`) exige `auth.role() = 'authenticated'`, bloqueando la subida de foto de fachada/perfil/hogar durante el registro público cuando Supabase requiere confirmación de correo (`session = null`, rol `anon`).
   - `mascotas-fotos` (`05_storage_buckets.sql:22`) no lista `application/pdf`, impidiendo subir cartillas de vacunación en PDF si se suben a ese bucket; y `documentos-verificacion` debe permitir lectura firmada por el dueño del archivo, veterinarias (para cartillas/fichas si aplica) y administradores (`public.get_my_role() = 'administrador'`).
6. **Formularios sin subida directa o sin soporte PDF:**
   - **Postulación Cuidador (`index.html:538-539`, `js/auth/postulaciones.js:88-100`):** Solo tiene un `<input type="url">` para PostImg; faltan dropzones para `foto_perfil`, `foto_hogar` y los 4 documentos legales (`DNI`, `Antecedentes Policiales`, `Antecedentes Penales`, `Comprobante Domicilio` en `image/*,application/pdf`). Además `postulaciones.js:88-100` ignora `filePenal` y `fileDomicilio`, y `handle_new_auth_user()` (`02_functions_triggers.sql` y `07_fix_auth_and_audit.sql`) no guarda `foto_url`, `foto_hogar_url`, `foto_fachada_url`, `constancia_url` enviados en metadata.
   - **Postulación Clínica (`index.html:585-673`, `js/auth/postulaciones.js:210-323`):** Faltan dropzones para `foto_fachada_url` (`image/*`) y `constancia_url` CMVP/RUC (`image/*,application/pdf`).
   - **Alta Directa Clínica Admin (`js/roles/administrador.js:2309-2469`):** Faltan dropzones para `foto_fachada_url` y `constancia_url` (aunque `rpc_admin_crear_clinica_directa` ya los soporta en `03_rpc_business.sql:1952-1953`).
   - **Perfil Sede Clínica (`js/roles/veterinaria.js:1946-2009`):** Faltan dropzones para actualizar foto de fachada y constancia CMVP.
   - **Mascotas Crear/Editar (`js/components/carnet-digital.js:412-431`):** Pide URL PostImg primero y `#pet-cartilla-file` solo tiene `accept="image/*"` (falta `,application/pdf`). Los visores en `carnet-digital.js:830-863` y `veterinaria.js:1609-1687` solo renderizan `<img>` y fallan con PDFs.
   - **Muro en Vivo Cuidador (`js/roles/cuidador.js:1855-1889`):** Promueve enlaces PostImg en lugar de dropzone directo móvil/PC.
   - **Perfil Propietario (`js/roles/propietario.js:1095-1193`) y Perfil Cuidador (`js/roles/cuidador.js`):** Falta subida directa de avatar / foto de hogar.

#### Solución Definitiva
- **SQL (`supabase/08_pulido_v5_1.sql` + sync `05_storage_buckets.sql` & `06_seed.sql`):**
  - Actualizar `storage.buckets` asegurando `allowed_mime_types`:
    - `perfiles`: `ARRAY['image/jpeg', 'image/png', 'image/webp']` (`file_size_limit = 5242880`).
    - `mascotas-fotos`: `ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']` (`file_size_limit = 10485760`) para fotos + cartillas PDF.
    - `muro-fotos`: `ARRAY['image/jpeg', 'image/png', 'image/webp']` (`file_size_limit = 5242880`).
    - `documentos-verificacion`: `ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']` (`file_size_limit = 10485760`, privado).
    - `comprobantes-pago`: `ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']` (`file_size_limit = 10485760`, privado).
  - Políticas RLS de Storage: permitir INSERT en `perfiles` y `documentos-verificacion` bajo prefijo `postulaciones/` tanto a `authenticated` como a `anon` (para registro público) y permitir SELECT en `documentos-verificacion` y `comprobantes-pago` al propietario de la carpeta, al `administrador` y a `veterinaria` (cuando corresponda a cartillas/constancias).
  - En `08_pulido_v5_1.sql`: ejecutar `UPDATE public.clinicas_veterinarias SET foto_fachada_url = ...` reemplazando cualquier URL que contenga `postimg.cc` / `postimages.org` por fotografías veterinarias reales válidas de Unsplash (verificadas HTTP 200) y limpiar referencias `postimg.cc` en `mascotas.cartilla_vacunas_url`, `clinicas_veterinarias.constancia_url` y `antecedentes_cuidadores`.
  - Actualizar `handle_new_auth_user()` en `08_pulido_v5_1.sql` (y `02_functions_triggers.sql`) para persistir `foto_url`, `foto_hogar_url`, `foto_fachada_url`, `constancia_url` y los 4 documentos de `antecedentes_cuidadores` si vienen en `raw_user_meta_data`.
- **Capa Storage & Utilidades (`js/supabase-client.js`):**
  - `compressImageFile(file, { maxWidth: 1600, quality: 0.82 })`: comprime vía `<canvas>` a WebP/JPEG si `file.type.startsWith('image/')`; deja intacto `application/pdf`.
  - `uploadFileToStorage(file, bucket, folder, { onProgress })`: valida MIME y tamaño (`5 MB` imágenes, `10 MB` PDFs), sube a Supabase Storage y retorna `{ url, storageRef, bucket, path, mimeType, origen: 'supabase_storage' }`. Para buckets privados guarda `storage://<bucket>/<path>` (y `url` firmada temporal para vista previa inmediata).
  - `resolveMediaUrl(urlOrRef, expiresIn = 3600)`: si comienza con `storage://`, invoca `supabase.storage.from(bucket).createSignedUrl(path, expiresIn)`. Si contiene `postimg.cc` o `postimages.org`, lo descarta como roto y retorna `null` para disparar fallback SVG.
  - `getFallbackSvgDataUri(tipo = 'clinica' | 'mascota' | 'avatar' | 'hogar')`: retorna data-URI SVG temático andino de alta nitidez (nunca depende de red externa).
- **Widget Dropzone Reutilizable (`js/components/file-uploader.js`):**
  - Componente declarativo `mountFileUploader(container, opts)` con: zona arrastrar/soltar o clic (cámara/galería móvil y PC), barra de progreso visual, previsualización de miniatura (`<img>`) o tarjeta PDF (`bi-file-earmark-pdf-fill` + nombre y tamaño), botón quitar/cambiar, y **acordeón colapsado secundario opcional** (*"¿Prefieres pegar un enlace externo? (Opcional)"*) para casos excepcionales sin mencionar `PostImg`.
  - Helper `abrirVisorDocumento(urlOrRef, titulo)`: resuelve `storage://` vía `resolveMediaUrl()`, detecta si es PDF (`.pdf` o MIME) para renderizar `<iframe class="w-100" style="height:68vh">` + botón *"Abrir / Descargar PDF"*, o `<img>` con zoom si es imagen. Integrar en Carné PAW-ID, Panel Veterinaria y Panel Administrador (Expediente Cuidador 4 docs + Constancia CMVP).

---

### Bloque 4: Bug Crítico de Persistencia en Alertas S.O.S. (Veterinaria ↔ Propietario ↔ Admin)

#### Causas Raíz Exactas (3 Fallos Encadenados)
1. **CAUSA RAÍZ #1 — Error fatal de PostgreSQL `0A000` en `rpc_vet_actualizar_sos` (`supabase/03_rpc_business.sql:1495-1500`):**
   ```sql
   SELECT i.*, r.id_propietario
   INTO v_sos
   FROM public.incidencias_emergencias i
   LEFT JOIN public.reservas r ON r.id = i.id_reserva
   WHERE i.id = p_id_incidencia
   FOR UPDATE;
   ```
   En PostgreSQL, `FOR UPDATE` sin especificar `OF <alias>` sobre una consulta con `LEFT JOIN` **SIEMPRE falla en tiempo de ejecución** con:
   > `ERROR 0A000: FOR UPDATE cannot be applied to the nullable side of an outer join`
   
   **Consecuencia:** **El 100% de las llamadas a `rpc_vet_actualizar_sos` en producción estaban fallando y haciendo rollback automático en la BD.**
   Además, la misma función tiene otros 3 defectos lógicos:
   - No valida que el usuario invocante tenga rol `'veterinaria'` o `'administrador'` ni pertenencia a la clínica derivada.
   - En la transición `en_atencion` (`03_rpc_business.sql:1513-1522`) ignora `p_diagnostico`, `p_tratamiento` y `p_costo`; en `estabilizada` (`L1524-1536`) ignora `p_costo`.
   - Si `i.id_reserva IS NULL`, `r.id_propietario` es `NULL` y nunca notifica al dueño de la mascota (`mascotas.id_propietario`).
2. **CAUSA RAÍZ #2 — Tragueo silencioso de errores + UI optimista falsa (`js/roles/veterinaria.js:1196-1230`):**
   ```js
   const { error } = await supabase.rpc('rpc_vet_actualizar_sos', { ... });
   if (error) console.warn('Fallback local en rpc_vet_actualizar_sos:', error.message);
   ```
   Al no lanzar `throw error`, el código continuaba mutando `vetState.alertasSos` en memoria + `localStorage` y mostraba un toast verde de éxito falso. Al cambiar de pestaña o recargar, `cargarDatosPanelVeterinaria()` leía la fila intacta de PostgreSQL y revertía toda la pantalla al estado original; el Propietario jamás recibía ninguna actualización.
3. **CAUSA RAÍZ #3 — Brechas en Emisión, RLS y Realtime S.O.S.:**
   - `js/roles/veterinaria.js:621, 1259-1314`: El botón *"Simular Ingreso S.O.S."* inserta alertas falsas solo en `localStorage` con ID `sos-live-...` que nunca existen en BD.
   - `supabase/03_rpc_business.sql:1372-1470` (`rpc_emitir_sos`): No recibe `p_ubicacion`, por lo que `alerta-sos.js:390` concatena `[Ubicación: ...]` dentro de `p_descripcion` y la columna `ubicacion_emergencia` queda fija en `'Cusco'`.
   - `supabase/04_rls_policies.sql:445-455` (`sos_select_involucrados`): No incluye `EXISTS (SELECT 1 FROM public.mascotas m WHERE m.id = incidencias_emergencias.id_mascota AND m.id_propietario = auth.uid())`, impidiendo que el Propietario lea alertas S.O.S. cuya `id_reserva` sea `NULL`.
   - `js/roles/propietario.js:742-746`: Solo escucha `UPDATE` en `incidencias_emergencias` (pierde `INSERT` cuando el cuidador emite S.O.S.) y no refresca el badge del sidebar. `js/app.js:97` solo escucha `INSERT` y no `UPDATE`.

#### Solución Definitiva
- **En `supabase/08_pulido_v5_1.sql` (y sincronizado en `03_rpc_business.sql` & `04_rls_policies.sql`):**
  - Corregir `rpc_vet_actualizar_sos`:
    1. Cambiar `FOR UPDATE;` → `FOR UPDATE OF i;` y unir `LEFT JOIN public.mascotas m ON m.id = i.id_mascota` obteniendo `v_propietario_id := COALESCE(v_sos.res_propietario, v_sos.mascota_propietario)` y `v_cuidador_usuario_id` vía `perfiles_cuidadores`.
    2. Validar rol (`public.get_my_role() IN ('veterinaria', 'administrador')`) y si es veterinaria verificar que pertenece a la clínica derivada (o que la clínica esté asignada al usuario).
    3. Persistir `COALESCE(NULLIF(trim(p_diagnostico), ''), diagnostico_clinico)`, `COALESCE(NULLIF(trim(p_tratamiento), ''), tratamiento_aplicado)` y `COALESCE(p_costo, costo_emergencia)` en **todas** las transiciones (`en_atencion`, `estabilizada`, `resuelta`), guardando `updated_at = now()` y `fecha_resolucion = now()` al pasar a `resuelta`.
    4. Insertar notificaciones reales en `public.notificaciones` para el Propietario, el Cuidador (si existe) y todos los Administradores en cada cambio de estado.
    5. Retornar `jsonb` con la fila completa actualizada (`id`, `estado_sos`, `diagnostico_clinico`, `tratamiento_aplicado`, `costo_emergencia`, `fecha_resolucion`, `updated_at`).
  - Actualizar `rpc_emitir_sos` añadiendo parámetro opcional `p_ubicacion text DEFAULT 'Cusco'` (backward-compatible) y persistiendo en `ubicacion_emergencia`.
  - Actualizar política RLS `sos_select_involucrados` para incluir propiedad directa de `mascotas.id_propietario = auth.uid()`.
- **En Frontend (`veterinaria.js`, `propietario.js`, `administrador.js`, `alerta-sos.js`, `app.js`):**
  - En `veterinaria.js:1196-1230`: **Eliminar todo fallback silencioso** (`if (error) throw error;`). Tras confirmar éxito real del RPC, recargar el estado desde Supabase (`await cargarDatosPanelVeterinaria(user, { silencioso: true })`) y re-renderizar. Eliminar o restringir el botón *"Simular Ingreso S.O.S."* exclusivamente al modo sin conexión (ocultarlo cuando `isSupabaseConfigured()` sea `true`).
  - Suscribir Realtime en `'*'` (INSERT + UPDATE) en `veterinaria.js`, `propietario.js`, `administrador.js` y `app.js`, actualizando tarjetas, estado clínico, diagnóstico/tratamiento/costo y contadores de notificación sin recargar la página.

---

### Bloque 5: Eliminación Absoluta de Jerga Técnica y Datos Crudos `jsonb` en toda la UI

#### Inventario Exhaustivo de Fugas Detectadas (Archivo y Línea Exacta)

| Archivo | Líneas Exactas | Texto Técnico Expuesto al Usuario | Reemplazo en Lenguaje de Negocio |
|---|---|---|---|
| `js/roles/administrador.js` | L1358 | `1. Dashboard & Chart.js` | `1. Panel Ejecutivo` |
| `js/roles/administrador.js` | L1418 | ``(`rpc_admin_dashboard_metrics`)`` | Eliminar paréntesis técnico; dejar *"Supervisión financiera en tiempo real, acreditación..."* |
| `js/roles/administrador.js` | L1534 | `(rpc_admin_dashboard_metrics)` en spinner | `Actualizando métricas financieras en tiempo real...` |
| `js/roles/administrador.js` | L1772, L1774 | ``(`rpc_admin_aprobar_cuidador`)``, ``0 <code>undefined</code>`` | `Verificación Legal y Aprobación de Cuidadores` / *"Expedientes y distritos verificados."* |
| `js/roles/administrador.js` | L2054, L2266, L2427, L2759, L3083, L3331 | Nombres `rpc_admin_*` y `"en Supabase"` en `showSpinner()` | Mensajes naturales (*"Actualizando estado del cuidador..."*, *"Registrando clínica aliada..."*, *"Registrando resolución..."*, *"Registrando pago bancario..."*, *"Reasignando clínica de emergencia..."*) |
| `js/roles/administrador.js` | L2109, L2313 | ``(`rpc_admin_aprobar_clinica`)``, ``(`rpc_admin_crear_clinica_directa`)`` | Quitar referencias técnicas |
| `js/roles/administrador.js` | L2489, L2492 | ``(`rpc_admin_resolver_caso`)``, ``0 <code>undefined</code>`` | `Gestión de Cancelaciones, Reembolsos y Disputas` / *"Revisa solicitudes, ejecuta reembolsos o define porcentajes de conciliación."* |
| `js/roles/administrador.js` | L2883, L2886 | ``(`rpc_admin_procesar_liquidacion`)``, `<code>pagado</code>` | `Liquidaciones a Cuidadores` / `<strong>Pagado</strong>` |
| `js/roles/administrador.js` | L3157, L3215, L3287 | ``(`rpc_admin_reasignar_sos`)``, ``(`configuracion_plataforma`)``, ``(`temporadas_tarifas`)`` | `Central Global S.O.S. y Reasignación`, `Parámetros Globales`, `Temporadas Turísticas Oficiales de Cusco` |
| `js/roles/administrador.js` | L3504–L3682 | `TRIGGERS POSTGRESQL`, ``(`auditoria_estados`)``, `instantáneas JSONB (old_record vs new_record)`, nombres crudos de tablas en `<select>` y tabla, cabecera `JSONB`, `Trigger PostgreSQL`, `fn_auditar_cambio_estado`, modal `Evidencia Forense JSONB` con `<pre>OLD_RECORD / NEW_RECORD</pre>` | **Rediseño completo de Bitácora Humana:** cabecera `Resumen del Cambio`, nombres amigables de módulos/estados, actor `Sistema Automático`, resumen legible en fila y modal **"Detalle del Cambio (Antes vs. Después)"** con tabla de campos traducidos al español |
| `js/roles/veterinaria.js` | L1193, L1492, L1840, L1937 | `(rpc_vet_actualizar_sos)`, ``(`validaciones_veterinarias`)``, `(rpc_vet_dictaminar_ficha)`, `MAPA LEAFLET CUSCO` | Textos clínicos claros (`Actualizando estado clínico S.O.S....`, `Registro Histórico de Dictámenes Médicos`, `DIRECTORIO DE EMERGENCIAS Y MAPA DE CUSCO`) |
| `js/roles/cuidador.js` | L620, L697, L825, L961, L1806, L1857, L1865, L1867, L2031 | `(rpc_cuidador_*)`, `Supabase Storage`, `PostImg` | Textos operativos limpios (`Confirmando reserva...`, `Registrando ingreso de la mascota...`, `Subir fotografías de evidencia`) |
| `js/roles/propietario.js` | L368, L442, L519, L644 | `(rpc_preview_cancelacion)`, `(rpc_cancelar_reserva)`, `(rpc_abrir_disputa)`, `(rpc_publicar_resena)` | Textos centrados en el dueño (`Calculando reembolso...`, `Procesando cancelación...`, `Registrando reclamo...`, `Publicando tu calificación...`) |
| `js/components/wizard-reserva.js` | L251, L709, L926 | `rpc_cotizar_reserva`, enum crudo `todo_el_dia`, `rpc_crear_reserva` | `Calculando cotización...`, `Estadía completa (24h)`, `Confirmando tu reserva...` |
| `js/components/alerta-sos.js` | L392 | `(rpc_emitir_sos)` | `Enviando alerta S.O.S. a la Clínica Veterinaria 24h...` |
| `js/components/billetera-cuidador.js` | L464 | `(rpc_solicitar_retiro)` | `Enviando solicitud de retiro bancario...` |
| `js/components/calendario-agenda.js` | L419, L620 | Enum crudo, `disponibilidad_cuidadores` | Etiqueta amigable, `Guardando disponibilidad en tu agenda...` |
| `js/components/carnet-digital.js` | L416, L417, L427, L929 | `PostImg`, `Supabase Storage`, enum crudo | Dropzone directo sin jerga + etiquetas legibles |
| `js/components/muro-fotos.js` | L278, L382 | `Supabase Storage y PostImg`, badge `Storage / PostImg` | *"Seguimiento fotográfico enviado por el cuidador en Cusco."* (eliminar badge técnico de almacenamiento) |
| `js/public/catalogo.js` & `mapa-cusco.js` | `catalogo.js:418`, `mapa-cusco.js:79` | `Leaflet.js + OpenStreetMap`, `librería cartográfica Leaflet.js` | `Mapa Interactivo de Cusco`, `No se pudo cargar el mapa interactivo.` |
| `js/public/landing.js` | L263 | `<code>#/paw-id/:id</code>` | `acceso directo por código QR` |
| `js/router.js` | L247 | `rpc_obtener_paw_id_publico en la Fase 4` | `Consultando credencial digital PAW-ID...` |
| `js/utils/ui-helpers.js` & `js/supabase-client.js` | `ui-helpers.js:280`, `supabase-client.js:90` | `Supabase Auth (GoTrue). Ejecuta el script supabase/07_fix_auth_and_audit.sql`, `PostImg` | `Servicio de autenticación temporalmente no disponible. Intenta nuevamente en unos minutos.` / `No se pudo subir el archivo en este momento.` |
| `index.html` | L538, L539 | `Enlace DNI / Antecedentes (PostImg o URL)` | Reemplazado por dropzones de documentos (Bloque 3) |

*(Nota de terminología financiera: reemplazar `"Garantía Escrow"` donde pueda sonar técnico al consumidor final por `"Pago Protegido en Garantía"` manteniendo claridad total del 15%/85%.)*

#### Solución Específica para la Bitácora de Auditoría (`js/roles/administrador.js:3478-3685`)
- Crear un formateador dedicado `formatearResumenCambioAuditoria(registro)` y diccionarios `ENTIDAD_LABELS`, `ESTADO_LABELS`, `CAMPO_LABELS`:
  - Traducir `entidad`: `reservas` → `Reservas`, `incidencias_emergencias` → `Emergencias S.O.S.`, `liquidaciones_cuidadores` → `Liquidaciones`, `cancelaciones_reembolsos` → `Cancelaciones y Disputas`, `perfiles_cuidadores` → `Cuidadores`, `clinicas_veterinarias` → `Clínicas Veterinarias`, `mascotas` → `Mascotas (PAW-ID)`, `pagos` → `Pagos`, `configuracion_plataforma` → `Parámetros Globales`.
  - Extraer código legible de `new_record`/`old_record` (`codigo_reserva`, `codigo_sos`, `codigo_liquidacion`, `codigo_cuidador`, `paw_id`, `codigo_clinica`) en vez de mostrar UUIDs crudos.
  - Comparar `old_record` vs `new_record` ignorando campos de ruido (`updated_at`, `created_at`, `id`) para generar un resumen conciso de una línea en la columna **"Resumen del Cambio"** (ej.: *"Estado: En Atención → Resuelta • Diagnóstico clínico registrado • Costo: S/ 120.00"*).
  - En el botón **"Ver Detalle"** (ícono `bi-card-list`), abrir un modal con tabla comparativa **Campo | Antes | Después** totalmente traducida al español sin exponer `JSONB`, `OLD_RECORD` ni `<pre>` técnico.

---

### Bloque 6: Reglas de Negocio Refinadas en Cuidador, Agenda, Muro y Billetera

#### Causas Raíz Exactas
1. **Muro de Fotos del Cuidador muestra reservas finalizadas, canceladas o futuras (`js/roles/cuidador.js:1790-1792`):**
   ```js
   const reservasElegibles = reservas.filter((r) => ['en_curso', 'confirmada'].includes(r.estado_reserva));
   const listaSelector = reservasElegibles.length > 0 ? reservasElegibles : reservas;
   ```
   Incluye `'confirmada'` (aún sin Check-In) y si no hay ninguna, cae a `reservas` completo mostrando `finalizada`, `cancelada` y `pendiente_confirmacion`.
2. **Hospedaje 24h permite elegir bloques parciales y solo valida el Día 1 (`js/components/wizard-reserva.js:457-482` + `supabase/03_rpc_business.sql:248-352`):**
   - `wizard-reserva.js` muestra los 4 bloques horarios incluso cuando `oferta.categoria === 'Hospedaje'`.
   - En el Paso 2 (`L461`), `state.disponibilidadDia` solo evalúa la disponibilidad del primer día (`fechaInicio`), ignorando bloqueos o cupo lleno en los días 2..N de una estadía multi-día.
   - `rpc_crear_reserva` en PostgreSQL no fuerza `todo_el_dia` para `Hospedaje`.
3. **Check-Out permitido antes de que inicie el servicio (`js/roles/cuidador.js:888-1025, 1652` + `supabase/03_rpc_business.sql:726-802`):**
   - Ni `rpc_cuidador_checkout` ni `cuidador.js` validan la fecha/hora de inicio programada (`fecha_inicio + hora_inicio`). Un cuidador puede hacer Check-In y Check-Out de inmediato en una reserva futura para liberar el 85% en garantía antes de prestar el servicio.
4. **Billetera con error-swallowing y gráfico mensual ficticio (`js/components/billetera-cuidador.js:472-475, 537-550`):**
   - `rpc_solicitar_retiro` captura el error solo con `console.warn` y finge éxito local; además el gráfico de ingresos mensuales usa cifras fijas inventadas (Jun–Oct) en vez de calcular desde las liquidaciones reales.

#### Solución Definitiva
1. **Muro del Cuidador (`cuidador.js:1785-2095`):**
   - Filtrar estrictamente `const reservasEnCurso = reservas.filter((r) => r.estado_reserva === 'en_curso');`.
   - Si `reservasEnCurso.length === 0`, ocultar/deshabilitar el formulario de envío y mostrar un estado vacío explicativo: *"Solo puedes enviar fotos al Muro cuando tengas una reserva activa En Curso (después de registrar el Check-In)."*
   - Opcional en `08_pulido_v5_1.sql`: agregar validación en política RLS/trigger de `reportes_seguimiento` asegurando que la reserva referenciada tenga `estado_reserva = 'en_curso'`.
2. **Hospedaje 24h vs. Bloques Horarios (`wizard-reserva.js` + `08_pulido_v5_1.sql`):**
   - Frontend (`wizard-reserva.js`):
     - Al elegir un servicio con `categoria === 'Hospedaje'`, fijar automáticamente `state.bloqueHorario = 'todo_el_dia'`, ocultar los radio-botones parciales (`manana_08_12`, `tarde_14_18`, `noche_18_22`) y mostrar una tarjeta informativa clara: **"Estadía Completa 24 Horas (Check-In / Check-Out diario)"**.
     - Al elegir `'Paseo'` o `'Guardería'`, habilitar los bloques horarios configurados (`manana_08_12`, `tarde_14_18`, `noche_18_22`, `todo_el_dia`) mostrando solo los disponibles y no bloqueados.
     - Consultar y verificar la disponibilidad de **TODOS los días** del rango `[fechaInicio..fechaFin]` (no solo el primer día) y mostrar advertencia explícita indicando qué fecha exacta está bloqueada o sin cupos.
   - Backend (`rpc_crear_reserva` en `08_pulido_v5_1.sql`):
     - Si `v_servicio.categoria = 'Hospedaje'`, exigir `v_bloque_horario = 'todo_el_dia'` (o rechazar con mensaje claro si llega un bloque parcial) y verificar disponibilidad día por día en todo el rango.
3. **Validación Temporal de Check-Out (`rpc_cuidador_checkout` + `cuidador.js`):**
   - Backend (`rpc_cuidador_checkout` en `08_pulido_v5_1.sql`):
     ```sql
     IF ((v_res.fecha_inicio::text || ' ' || COALESCE(v_res.hora_inicio, '08:00:00')::text)::timestamp AT TIME ZONE 'America/Lima') > now() THEN
       RAISE EXCEPTION 'No puedes registrar el Check-Out antes de la fecha y hora de inicio programada (% %).',
         to_char(v_res.fecha_inicio, 'DD/MM/YYYY'),
         to_char(COALESCE(v_res.hora_inicio, '08:00:00'::time), 'HH24:MI');
     END IF;
     ```
   - Frontend (`cuidador.js`): Calcular `inicioReservaLima` con zona `America/Lima` (`UTC-5`); si aún es futuro, deshabilitar el botón de Check-Out con tooltip y texto explicativo *"Disponible desde el DD/MM/YYYY a las HH:mm (hora Cusco)"*, y además validar antes de llamar al RPC sin tragar errores (`if (error) throw error`).
4. **Billetera Cuidador (`billetera-cuidador.js`):**
   - Eliminar tragueo de errores en `rpc_solicitar_retiro` (`if (error) throw error`), recargar saldo desde `v_billetera_cuidador` y `liquidaciones_cuidadores`, y construir el gráfico mensual dinámicamente agrupando las liquidaciones reales por mes (`YYYY-MM`).

---

### Bloque 7: Eliminación Completa del Módulo y Lógica de Cupones Promocionales

#### Causas Raíz / Ubicaciones Exactas
1. **Backend SQL (`supabase/03_rpc_business.sql`):**
   - `rpc_cotizar_reserva` (L14–L180): consulta `cupones_promocionales` (L122–L148) y calcula `descuento_cupon`.
   - `rpc_crear_reserva` (L188–L430): recibe `codigo_cupon`, guarda `id_cupon` y ejecuta `UPDATE public.cupones_promocionales SET usos_actuales = usos_actuales + 1` (L408).
   - `supabase/06_seed.sql`: inserta 4 cupones semilla (`CUSCO10`, `TURISTA15`, etc.).
2. **Wizard de Reserva (`js/components/wizard-reserva.js`):**
   - `CUPONES_FALLBACK` (L39–L43), cálculo de cupón (L101–L122), título Paso 3 `"Cotización y Cupón"` (L301), campo input + botones de cupón rápido (L562–L567, L598–L611, L838–L851) y envío `codigo_cupon`.
3. **Comprobante de Reserva (`js/components/carnet-digital.js`):**
   - L954–L959 muestra fila de descuento por cupón.
4. **Panel Administrador (`js/roles/administrador.js`):**
   - `CONFIG_GOBERNANZA_SEED.cupones`, tabla CRUD de cupones, botón `Nuevo Cupón`, toggle Activo/Pausado y modal de creación (L3209, L3245–L3284, L3394–L3471).

#### Solución Definitiva
- **SQL (`supabase/08_pulido_v5_1.sql`):**
  - Mantener la tabla `cupones_promocionales` inactiva (`UPDATE public.cupones_promocionales SET activo = false;`) para no romper la llave foránea histórica `reservas.id_cupon`.
  - En `rpc_cotizar_reserva` (manteniendo el parámetro `p_codigo_cupon text DEFAULT NULL` por compatibilidad de firma con llamadas cacheadas): ignorarlo por completo y devolver siempre `descuento_cupon = 0`, `id_cupon = NULL`, `cupon_valido = false`.
  - En `rpc_crear_reserva`: forzar `id_cupon = NULL`, `descuento_cupon = 0` y eliminar el `UPDATE public.cupones_promocionales`.
- **Frontend:**
  - `wizard-reserva.js`: eliminar `CUPONES_FALLBACK`, toda lógica/input/botones de cupón y renombrar Paso 3 a **"Cotización Transparente"** (tarifa base × días/cantidad + recargo temporada Cusco si aplica + opcionales como baño higiénico = Total 100%).
  - `carnet-digital.js`: ocultar la línea de descuento por cupón en nuevos comprobantes (solo renderizar si una reserva histórica antigua tuviese `descuento_cupon > 0`).
  - `administrador.js`: eliminar completamente la tarjeta, tabla, listeners y modal de Cupones Promocionales en Sección 5, dedicando esa columna íntegramente a **Temporadas Turísticas Oficiales de Cusco** (leídas y editables desde `public.temporadas_tarifas`) junto a **Parámetros Globales** (persistidos en `public.configuracion_plataforma`).

---

### Bloque 8: Conmutador de Idioma `ES / EN` Funcional y Estándar Neutro `"Propietario"`

#### Causas Raíz Exactas
1. **Conmutador `ES / EN` puramente cosmético (`js/app.js:328-333`, `index.html:87-89`):**
   - Al hacer clic en `#btn-toggle-lang`, solo ejecuta `btnLang.textContent = newLang` (lo que **destruye** el ícono `<i class="bi bi-translate"></i>` interno) y muestra un toast sin traducir un solo texto de la interfaz.
   - Al cargar la página (`DOMContentLoaded`), ni `#btn-toggle-currency` ni `#btn-toggle-lang` restauran su etiqueta guardada en `localStorage`.
2. **Apariciones de `"Propietaria"` en femenino (5 ubicaciones exactas verificadas por grep):**
   - `index.html:205`: `<strong>🐾 Propietaria</strong>`
   - `js/config.js:74`: `nombre: 'Lucía Mendoza (Propietaria Local / Turista)'`
   - `js/config.js:77`: `badge: 'Propietaria'`
   - `js/public/catalogo.js:999`: `<strong>Lucía M. (Propietaria Local)</strong>`
   - `js/public/landing.js:72`: `origen: 'Propietaria Local • Wanchaq, Cusco'`

#### Solución Definitiva
- **Crear `js/i18n.js`** con:
  - Estado persistido en `localStorage.getItem('paw_lang') || 'ES'` (`'ES'` | `'EN'`).
  - Diccionario completo `ES` / `EN` cubriendo: Navbar, Footer, Modales de Auth/Registro, Landing completa (Hero, Métricas, Cómo Funciona, Carné PAW-ID, Clínicas Aliadas, Testimonios, Banner CTA), Catálogo y Filtros, Carné PAW-ID Público, Wizard de Reserva (4 pasos), Panel de Propietario (menú, KPIs, botones principales) y encabezados comunes de los otros roles.
  - Funciones exportadas: `getCurrentLang()`, `setLanguage(lang)`, `t(key, vars = {})`, `applyTranslations(root = document)` (soporta `data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-title`).
- **Conectar en `js/app.js`:**
  - En `DOMContentLoaded`: hidratar `#btn-toggle-lang` y `#btn-toggle-currency` usando `innerHTML` (preservando `<i class="bi bi-translate"></i>` y `<i class="bi bi-currency-exchange"></i>`) y ejecutar `applyTranslations(document)`.
  - Al cambiar idioma: actualizar `localStorage`, `<html lang="es|en">`, `applyTranslations(document)`, `updateNavbar()` y re-renderizar la ruta actual vía `handleRouteChange()` para que las vistas dinámicas cambien instantáneamente.
- **Unificación neutra a `"Propietario"`:** Corregir las 5 líneas exactas detectadas (y usar `"Owner"` en `EN`).

---

### Auditoría Proactiva de Bugs Ocultos Adicionales (13 Hallazgos Críticos en Producción)

Además de los 8 bloques solicitados, la inspección línea por línea destapó **13 defectos reales de producción** que deben corregirse durante el pulido v5.1:

| # | Severidad | Archivo y Línea | Bug Detectado | Solución Exacta |
|---|---|---|---|---|
| **H1** | **CRÍTICA** | `supabase/07_fix_auth_and_audit.sql:488` | `supabase_realtime` solo publica `incidencias_emergencias`, `notificaciones` y `reportes_seguimiento`. Faltan `reservas`, `liquidaciones_cuidadores` y `auditoria_estados`, por lo que los canales Realtime en `cuidador.js:1295,1301` y `administrador.js:1305` **nunca disparan eventos en producción**. | Añadir `reservas`, `liquidaciones_cuidadores` y `auditoria_estados` a `supabase_realtime` de forma idempotente en `08_pulido_v5_1.sql`. |
| **H2** | **CRÍTICA** | `js/roles/administrador.js:2063, 2275, 2433, 2769, 3093, 3335`; `veterinaria.js:1206, 1852, 2046`; `cuidador.js:1225, 2055, 2231`; `billetera-cuidador.js:472`; `calendario-agenda.js:1017` | **Tragueo silencioso de errores de Supabase:** 12+ operaciones críticas hacen `console.warn('Fallback local...')` o ignoran `{ error }`, fingiendo éxito en `localStorage` aunque la BD haya rechazado la operación. | Cuando `isSupabaseConfigured()` sea `true`, lanzar siempre `if (error) throw error;` y recargar estado confirmado desde BD. |
| **H3** | **ALTA** | `js/roles/propietario.js:296`; `alerta-sos.js:179`; `muro-fotos.js:141`; `cuidador.js:514, 545, 549`; `billetera-cuidador.js:288` | **Fuga de datos demo a usuarios reales nuevos:** Condiciones `if (!error && data.length > 0)` hacen que cualquier usuario real registrado con 0 reservas/fotos/retiros caiga al fallback de `localStorage` y vea mascotas/reservas demo de Lucía o Valeria. | Cambiar condición a `if (!error && Array.isArray(data))` retornando `[]` real cuando el usuario está autenticado en Supabase. |
| **H4** | **ALTA** | `js/components/billetera-cuidador.js:848` | **Argumentos invertidos en `exportarCsv`:** Llama `exportarCsv('billetera_...csv', rowsCsv)` mientras `js/utils/formatters.js:162` define `exportarCsv(rows, filename)`. Genera archivo corrupto o falla. | Invertir a `exportarCsv(rowsCsv, 'billetera_liquidaciones_cuidador_cusco.csv')`. |
| **H5** | **ALTA** | `js/roles/administrador.js:3375-3392` | **Parámetros globales no persisten en BD:** `#form-admin-parametros` guarda solo en `localStorage` y nunca actualiza `public.configuracion_plataforma` (por lo que `rpc_cotizar_reserva` sigue leyendo los valores viejos). | Persistir mediante `supabase.from('configuracion_plataforma').update(...)` (RLS `config_admin_all` ya existe) y recargar desde BD. |
| **H6** | **ALTA** | `js/auth/postulaciones.js:267-299` | **Falso error de RUC duplicado al postular clínica:** `handle_new_auth_user()` ya inserta la clínica en `clinicas_veterinarias` con estado `'pendiente'`, luego `postulaciones.js` intenta consultar como `anon` (bloqueado por RLS `clinicas_select_public_activas`), obtiene `null` y hace un segundo `INSERT` que choca con `UNIQUE (ruc)`. | Pasar todos los campos (`foto_fachada_url`, `constancia_url`, etc.) en `options.data` de `auth.signUp()` para que el trigger `handle_new_auth_user()` inserte la fila completa una sola vez; en `postulaciones.js` solo hacer `UPDATE` si existe sesión autenticada. |
| **H7** | **ALTA** | `js/components/calendario-agenda.js:634` | **Replicar agenda sobrescribe reservas existentes:** Al copiar horarios a "próximos 3/7 días", envía `cupos_reservados: diaTarget === fechaIso ? b.cupos_reservados : 0` en un `upsert`, borrando los cupos ya reservados de esos días futuros. | Al hacer upsert de `disponibilidad_cuidadores`, omitir `cupos_reservados` en días replicados (o leer el `cupos_reservados` existente en BD antes del upsert, y nunca bajar `cupo_maximo` por debajo de `cupos_reservados`). |
| **H8** | **MEDIA** | `js/utils/formatters.js:36, 124` | **Bugs de zona horaria:** `calcularEdadDinamica()` usa `new Date(fechaNacimiento)` en vez de `parseFechaLocal()` (desfase -1 día en UTC-5); `getHoyIso()` usa la zona horaria del dispositivo del turista en vez de `America/Lima`. | Usar `parseFechaLocal()` en `calcularEdadDinamica()` y `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' })` en `getHoyIso()`. |
| **H9** | **MEDIA** | `js/components/alerta-sos.js:261`; `js/roles/propietario.js:1086` | **Íconos Bootstrap rotos por mayúsculas:** `bi-Broadcast-pin` y `bi-person-Vcard-fill` no existen en Bootstrap Icons (son case-sensitive). | Corregir a `bi-broadcast-pin` y `bi-person-vcard-fill`. |
| **H10** | **MEDIA** | `js/app.js:320-333` | **Destrucción de íconos en Navbar:** Cambiar moneda o idioma usa `.textContent = ...` borrando `<i class="bi ...">`, y al iniciar la app los botones no reflejan la preferencia guardada en `localStorage`. | Usar `innerHTML` preservando íconos e hidratar ambos botones en `DOMContentLoaded`. |
| **H11** | **MEDIA** | `js/public/catalogo.js:996-1008`; `js/components/billetera-cuidador.js:537-550` | **Datos hardcodeados falsos:** El modal de perfil del cuidador muestra una reseña estática de "Lucía M." para todos los cuidadores; el gráfico de billetera muestra montos fijos Jun–Oct. | Consultar reseñas reales de `public.resenas` por `id_cuidador` (con estado vacío si aún no tiene) y calcular la serie mensual de billetera desde `liquidaciones_cuidadores`. |
| **H12** | **BAJA** | `index.html:210, 214`; `js/config.js:82, 90`; `landing.js:284`; `paw-id-publico.js:17` | **Inconsistencias de nombres demo:** `"Valeria Quispe"` vs `"Valeria Huamán Delgado"`, `"Dr. Marco Polo"` vs `"Dra. Claudia Salazar Cáceres"`, `PAW-6858` llamado `"Rocky"` en landing/fallback vs `"Inti"` en seed BD. | Alinear todos los nombres de acceso rápido y preview con los datos reales sembrados en BD (`Valeria Huamán`, `Dra. Claudia Salazar`, `Inti — PAW-6858`). |
| **H13** | **BAJA** | `js/config.js:60-65` | **Desajuste de claves en `BLOQUES_HORARIOS`:** Usa `'08:00-12:00'` en lugar del enum SQL (`'manana_08_12'`, `'tarde_14_18'`, `'noche_18_22'`, `'todo_el_dia'`). | Estandarizar `CUSCO_CONFIG.BLOQUES_HORARIOS` con las claves exactas del enum SQL + etiquetas en ES/EN. |

---

## SECCIÓN 2: PLAN DE EJECUCIÓN MODULAR POR FASES CORTAS (4 SUB-FASES ATÓMICAS)

### Sub-Fase P1 — Blindaje Backend SQL, Persistencia S.O.S., Storage PDF/Img y Realtime
**Objetivo:** Corregir el 100% de fallos de base de datos, RPCs, RLS, Storage y Realtime mediante un parche idempotente desplegable en producción (`supabase/08_pulido_v5_1.sql`) y sincronizar los scripts base (`02`–`06`).

- [x] Crear `supabase/08_pulido_v5_1.sql` idempotente (ejecutable sobre BD existente sin perder datos reales).
- [x] Corregir `rpc_vet_actualizar_sos`: reemplazar `FOR UPDATE;` por `FOR UPDATE OF i;`, añadir `LEFT JOIN public.mascotas m`, usar `COALESCE(r.id_propietario, m.id_propietario)`, validar rol (`veterinaria`/`administrador`), persistir `diagnostico_clinico`, `tratamiento_aplicado` y `costo_emergencia` en **todas** las transiciones, notificar a Propietario + Cuidador + Admins y retornar `jsonb` con la fila confirmada.
- [x] Actualizar `rpc_emitir_sos` aceptando `p_ubicacion text DEFAULT 'Cusco'` y guardándolo en `ubicacion_emergencia`.
- [x] Actualizar política RLS `sos_select_involucrados` en `incidencias_emergencias` para incluir `EXISTS (SELECT 1 FROM public.mascotas m WHERE m.id = incidencias_emergencias.id_mascota AND m.id_propietario = auth.uid())`.
- [x] Actualizar `rpc_cuidador_checkout` validando que `(v_res.fecha_inicio::text || ' ' || COALESCE(v_res.hora_inicio, '08:00:00')::text)::timestamp AT TIME ZONE 'America/Lima' <= now()` antes de finalizar y liberar el 85% en garantía.
- [x] Actualizar `rpc_cotizar_reserva` y `rpc_crear_reserva`: eliminar cálculo/uso de cupones promocionales (forzar `descuento_cupon = 0`, `id_cupon = NULL`, sin `UPDATE cupones_promocionales`), desactivar filas en `cupones_promocionales`, y forzar `bloque_horario = 'todo_el_dia'` + validación multi-día completa cuando `categoria = 'Hospedaje'`.
- [x] Actualizar `handle_new_auth_user()` para guardar `foto_url`, `foto_hogar_url`, `foto_fachada_url`, `constancia_url` y documentos de `antecedentes_cuidadores` desde `raw_user_meta_data` evitando el doble INSERT en postulación de clínicas.
- [x] Actualizar buckets y políticas de `storage.buckets` / `storage.objects`: añadir `application/pdf` a `mascotas-fotos`, `documentos-verificacion` y `comprobantes-pago`; habilitar subida controlada `postulaciones/*` para `anon` y `authenticated`; permitir lectura firmada de `documentos-verificacion` a dueño + `administrador` + `veterinaria`.
- [x] Reemplazar en BD cualquier URL rota de `postimg.cc`/`postimages.org` en `clinicas_veterinarias`, `mascotas` y `antecedentes_cuidadores` por fotos veterinarias válidas (Unsplash) o `NULL` limpio.
- [x] Añadir idempotente de `public.reservas`, `public.liquidaciones_cuidadores` y `public.auditoria_estados` a la publicación `supabase_realtime`.
- [x] Sincronizar estos cambios en `supabase/02_functions_triggers.sql`, `supabase/03_rpc_business.sql`, `supabase/04_rls_policies.sql`, `supabase/05_storage_buckets.sql` y `supabase/06_seed.sql` para instalaciones nuevas.
- [x] Documentar el avance en `BITACORA_EJECUCION_V5.md` y marcar los ítems completados en `PLAN_PULIDO_V5_1.md`.

---

### Sub-Fase P2 — Identidad Visual "Andes & Huellas Cusco", Contraste WCAG AAA, Modal Legal Global, `ES/EN` y Neutro "Propietario"
**Objetivo:** Transformar la identidad visual al concepto cálido de Mascotas + Cusco, corregir los fallos graves de contraste (Footer y Banner CTA), habilitar el Modal Legal de 3 pestañas en todo el sistema, activar el motor bilingüe `ES/EN` y unificar `"Propietario"`.

- [x] Crear `css/tokens.css` con la paleta "Andes & Huellas Cusco" (`#FAF7F2`, `#F3EDE2`, `#E85D24`, `#1E5631`, `#D99B26`, `#111827`, `#0B1120`) y cargarlo en `index.html` antes de `css/main.css`.
- [x] Actualizar `css/main.css`, `css/auth.css`, `css/catalogo.css`, `css/paneles.css` y `css/print.css`: franja textil andina (`.andean-textile-ribbon`), fondos piedra/crema cálidos, corrección de especificidad `h1..h6`/`p` dentro de `.text-white`, `.cta-andes-banner`, `.paw-id-banner-emergencia` y contraste WCAG AAA (`> 7:1`) en `.footer-paw`.
- [x] Rediseñar el Hero y el Banner CTA Inferior en `js/public/landing.js` (Hero editorial 2 columnas con silueta montañas/huellas SVG + collage cálido Cusco; Banner CTA en Verde Bosque Montaña `#1E5631` con texto blanco puro `#FFFFFF` y botones de máximo contraste; reemplazar URLs `postimg` del seed local de clínicas y añadir fallback SVG).
- [x] Corregir `index.html`: eliminar `.text-muted` del Footer, convertir los enlaces legales del Footer y de los 3 modales de registro/postulación en vínculos clicables con `data-legal-tab="terminos | privacidad | declaracion"`, alinear nombres demo (`Valeria Huamán`, `Dra. Claudia Salazar`) y cambiar `"Propietaria"` → `"Propietario"`.
- [x] Crear `js/components/legal-modal.js` con 3 pestañas completas (Términos v5.1, Política de Privacidad Ley N° 29733 + derechos ARCO + privacidad QR/GPS, Declaración Jurada), delegación global `[data-legal-tab]` y manejo seguro de `z-index` sobre modales padre.
- [x] Crear `js/i18n.js` (`ES` / `EN`) con `t()`, `getCurrentLang()`, `setLanguage()`, `applyTranslations()` y conectar `#btn-toggle-lang` + `#btn-toggle-currency` en `js/app.js` preservando los íconos Bootstrap, hidratando estado al arrancar y re-renderizando la ruta activa al alternar idioma.
- [x] Estandarizar `js/config.js` (`"Propietario"`, nombres demo alineados, `BLOQUES_HORARIOS` alineado a enum SQL), `js/public/catalogo.js` (quitar reseña fija de "Lucía M. (Propietaria Local)" y cargar reseñas reales de `public.resenas` + quitar badge `Leaflet.js`) y `js/public/paw-id-publico.js` (alinear `Inti` y contraste banner emergencia).
- [x] Documentar el avance en `BITACORA_EJECUCION_V5.md` y marcar los ítems completados en `PLAN_PULIDO_V5_1.md`.

---

### Sub-Fase P3 — Motor Directo Supabase Storage (Imágenes + PDFs sin PostImg) y Reglas Operativas (S.O.S., Cuidador, Wizard sin Cupones, Muro, Agenda y Billetera)
**Objetivo:** Erradicar `PostImg` en el 100% de formularios y visores, habilitar subida directa de imágenes (con compresión) y PDFs (con URLs firmadas para buckets privados), arreglar la persistencia real S.O.S. y aplicar las reglas de negocio de Cuidador, Wizard, Agenda, Muro y Billetera.

- [x] Potenciar `js/supabase-client.js`: añadir `compressImageFile()`, `uploadFileToStorage()` (retornando `origen: 'supabase_storage'` y `storage://bucket/path` para privados), `resolveMediaUrl()` (con `createSignedUrl` para privados y rechazo de URLs `postimg`), `getFallbackSvgDataUri()` y eliminar mensajes técnicos de `PostImg`.
- [x] Crear `js/components/file-uploader.js`: widget dropzone reutilizable (`mountFileUploader()`) con barra de progreso, preview imagen/PDF, validación MIME/tamaño, acordeón colapsado secundario opcional para URL externa y visor universal `abrirVisorDocumento(urlOrRef, titulo)` compatible con imágenes y PDFs firmados.
- [x] Integrar `file-uploader.js` en todos los flujos de subida:
  - Postulación Cuidador (`index.html` + `js/auth/postulaciones.js`): `foto_perfil`, `foto_hogar` y los 4 docs (`DNI`, `Policiales`, `Penales`, `Domicilio` — `image/*,application/pdf`).
  - Postulación Clínica (`index.html` + `js/auth/postulaciones.js`): `foto_fachada` (`image/*`) y `constancia_url` CMVP/RUC (`image/*,application/pdf`), eliminando el bug de doble INSERT de clínica.
  - Mascotas Crear/Editar y Visor Cartilla (`js/components/carnet-digital.js`): foto mascota + cartilla `image/*,application/pdf` + visor PDF + ocultar línea de cupón en comprobantes nuevos.
  - Perfil Sede Clínica y Visor Cartilla Veterinaria (`js/roles/veterinaria.js`): subir fachada + constancia PDF + visor PDF en dictamen PAW-ID.
  - Muro en Vivo y Perfil Cuidador (`js/roles/cuidador.js` + `js/components/muro-fotos.js`): dropzone directo cámara/galería sin `PostImg` ni badges de almacenamiento.
  - Perfil Propietario (`js/roles/propietario.js`): subida directa de avatar (`avatar_url`) + corregir icono `bi-person-vcard-fill`.
- [x] Reparar persistencia real S.O.S. en Frontend (`js/roles/veterinaria.js`, `js/roles/propietario.js`, `js/components/alerta-sos.js`, `js/app.js`): eliminar `console.warn('Fallback local...')` en `rpc_vet_actualizar_sos` y `rpc_vet_dictaminar_ficha`, validar `throw error`, recargar desde BD tras cada transición, ocultar simulador local cuando Supabase esté activo, enviar `p_ubicacion` en `rpc_emitir_sos`, corregir icono `bi-broadcast-pin`, y escuchar `'*'` en Realtime en Propietario/Veterinaria/App.
- [x] Aplicar Reglas de Negocio en Cuidador, Wizard, Agenda y Billetera:
  - `js/roles/cuidador.js`: selector de Muro estrictamente filtrado a `estado_reserva === 'en_curso'` con estado vacío claro; bloqueo temporal de Check-Out antes de `fecha_inicio + hora_inicio` (hora Cusco `America/Lima`); eliminar error-swallowing en servicios/muro/reseñas y fallback `data.length > 0`.
  - `js/components/wizard-reserva.js`: eliminar completamente cupones promocionales (`CUPONES_FALLBACK`, input, botones, Paso 3 → *"Cotización Transparente"*); forzar `todo_el_dia` (24h) para `Hospedaje`; validar disponibilidad en **todos** los días del rango; conectar checkbox Paso 4 al Modal Legal (`data-legal-tab="terminos"`).
  - `js/components/calendario-agenda.js`: corregir bug de replicación que ponía `cupos_reservados: 0` en días futuros y quitar error-swallowing.
  - `js/components/billetera-cuidador.js`: corregir orden de argumentos en `exportarCsv(rowsCsv, filename)`, quitar error-swallowing en `rpc_solicitar_retiro`, quitar fallback `data.length > 0` y calcular serie mensual Chart.js desde liquidaciones reales.
- [x] Corregir `js/utils/formatters.js` (`parseFechaLocal()` en `calcularEdadDinamica()`, zona `America/Lima` en `getHoyIso()`).
- [x] Documentar el avance en `BITACORA_EJECUCION_V5.md` y marcar los ítems completados en `PLAN_PULIDO_V5_1.md`.

---

### Sub-Fase P4 — Panel Administrador (Bitácora Humana sin `jsonb`, Sin Cupones, Visor Firmado), Purga Final de Jerga, QA E2E y Despliegue
**Objetivo:** Limpiar el 100% del Panel Administrador y archivos residuales de jerga técnica/errores silenciosos, transformar la Bitácora de Auditoría a lenguaje humano, ejecutar verificación forense E2E en los 4 roles y publicar la v5.1 en GitHub Pages.

- [x] Refactorizar `js/roles/administrador.js`:
  - Eliminar el 100% de jerga técnica en títulos, badges, spinners y tablas (`rpc_admin_*`, `Chart.js`, `0 undefined`, `configuracion_plataforma`, `temporadas_tarifas`, `auditoria_estados`, `TRIGGERS POSTGRESQL`, `JSONB`, `old_record`, `new_record`, `fn_auditar_cambio_estado`).
  - Eliminar completamente el CRUD y lógica de **Cupones Promocionales** (Sección 5) y dejar **Parámetros Globales** (persistidos realmente en `public.configuracion_plataforma`) + **Temporadas Turísticas Oficiales de Cusco** (leídas desde `public.temporadas_tarifas`).
  - Eliminar **todos** los tragueos silenciosos de errores en los 6 RPCs de Admin (`rpc_admin_aprobar_cuidador`, `rpc_admin_aprobar_clinica`, `rpc_admin_crear_clinica_directa`, `rpc_admin_resolver_caso`, `rpc_admin_procesar_liquidacion`, `rpc_admin_reasignar_sos`) y recargar desde Supabase tras éxito.
  - Integrar `mountFileUploader()` en `abrirModalCrearClinicaDirecta` (`foto_fachada_url` y `constancia_url` PDF/Img) y conectar `abrirVisorDocumento()` (con URLs firmadas `storage://`) en el Expediente de Cuidadores (4 docs) y Constancia CMVP de Clínicas.
  - Rediseñar la **Sección 6 (Bitácora de Auditoría)**: implementar `formatearResumenCambioAuditoria()`, traducir entidades/estados/campos a español humano, reemplazar columna `JSONB` por **"Resumen del Cambio"** + botón **"Ver Detalle"** que abre tabla comparativa **"Antes vs. Después"** sin crudo JSONB ni UUIDs desnudos.
- [x] Limpiar jerga residual en `js/utils/ui-helpers.js` (L280 sin mencionar `GoTrue` ni `.sql`), `js/router.js` (L247), `js/public/mapa-cusco.js` (L79) y hacer barrido regex global verificando **0 ocurrencias visibles** de `rpc_`, `jsonb`, `PostImg`, `GoTrue`, `PostgreSQL`, `Leaflet`, `Chart.js`, `0 undefined` y `"Propietaria"`.
- [x] Ejecutar pruebas de verificación SQL en Supabase (o entregar checklist ejecutable exacto para el SQL Editor si el agente no tiene token de BD) validando `08_pulido_v5_1.sql`.
- [x] Verificar E2E los 4 roles (Propietario, Cuidador, Clínica Veterinaria, Administrador) + vistas públicas (Landing, Catálogo, PAW-ID QR) en desktop y móvil, comprobando contraste WCAG AAA, Modal Legal, `ES/EN`, subida de Imagen y PDF, ciclo completo S.O.S. con recarga de página, Muro `en_curso`, Hospedaje 24h, Check-Out temporal y Bitácora humana.
- [x] Actualizar `BITACORA_EJECUCION_V5.md` con el cierre oficial v5.1, actualizar `PLAN_PULIDO_V5_1.md` (100% `- [x]`), realizar `git status`, `git diff --stat`, commit limpio y despliegue a GitHub Pages (`git push`).

---

## SECCIÓN 3: TABLA DE ASIGNACIÓN DE MODELOS (AHORRO DE TOKENS VS. POTENCIA)

| Sub-Fase | Complejidad y Riesgo Técnico | Ruta A: Ahorro Inteligente (Mejor relación calidad/costo) | Ruta B: Máxima Potencia (Cero riesgo en un solo intento) | Nivel de Razonamiento (`Thinking`) |
|---|---|---|---|---|
| **P1 — Backend SQL, S.O.S., RLS, Storage & Realtime** | **Alta** (Lógica transaccional PostgreSQL, `FOR UPDATE OF i`, zonas horarias `America/Lima`, políticas RLS de Storage e idempotencia en producción) | **Claude Sonnet 4.6** o **Gemini 2.5 Pro** | **Claude Opus 4.6** o **Gemini 3.1 Pro** | **Alto (`High`)** — Un error SQL/RLS bloquea los 4 roles |
| **P2 — Identidad Visual "Andes & Huellas", Contraste, Modal Legal e `i18n`** | **Media** (Diseño CSS cálido cohesivo, WCAG AAA, copywriting legal Perú Ley 29733 y diccionario `ES/EN`) | **Gemini 2.5 Flash** o **Claude Sonnet 4.6** | **Claude Sonnet 4.6** o **Gemini 3.1 Pro** | **Medio (`Medium`)** — Excelente equilibrio estético y velocidad |
| **P3 — Subida Storage PDF/Img + Reglas Operativas (S.O.S., Cuidador, Wizard, Agenda, Billetera)** | **Muy Alta** (13 archivos JS interconectados, compresión Canvas, URLs firmadas en buckets privados, estado real sin fallbacks falsos) | **Claude Sonnet 4.6** | **Claude Opus 4.6** o **Gemini 3.1 Pro** | **Alto (`High`)** — Mayor superficie de regresiones si se usa un modelo ligero |
| **P4 — Panel Admin, Bitácora Humana sin `jsonb`, Purga Regex, QA E2E y Deploy** | **Media-Alta** (`administrador.js` tiene 3,685 líneas; requiere edición precisa + verificación global y despliegue) | **Claude Sonnet 4.6** | **Claude Opus 4.6** o **Claude Sonnet 4.6** | **Medio-Alto (`Medium/High`)** — Precisión en refactor grande y QA final |

> **Recomendación Práctica:** Si buscas optimizar consumo de cuota/tokens sin arriesgar bugs en producción, ejecuta **P2 con modelo Medio/Flash**, y reserva **Sonnet / Pro (Thinking High)** para **P1, P3 y P4**. Abre un **chat nuevo limpio por cada sub-fase** pegando únicamente el prompt correspondiente de la Sección 4.

---

## SECCIÓN 4: PROMPTS AUTOCONTENIDOS ULTRA DETALLADOS (LISTOS PARA COPIAR Y PEGAR)

### PROMPT SUB-FASE P1 — Backend SQL, Persistencia S.O.S., Storage PDF/Img y Realtime

```markdown
Actúa como Arquitecto Principal PostgreSQL / Supabase Senior ejecutando la **Sub-Fase P1** del proyecto **Paw Patita Cusco v5.1**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_1.md` (Sección 1: Bloques 3, 4, 6, 7, Hallazgo H1, H6 y Sección 2: Sub-Fase P1).
3. **NO modifiques archivos de frontend (`index.html`, `css/`, `js/`) en esta fase.** Solo trabajarás en `supabase/`, `PLAN_PULIDO_V5_1.md` y `BITACORA_EJECUCION_V5.md`.
4. Todo el SQL en `supabase/08_pulido_v5_1.sql` debe ser **100% idempotente** (`CREATE OR REPLACE`, `DROP POLICY IF EXISTS`, `DO $$ ... END $$;`) y seguro para ejecutarse en el SQL Editor de producción (`https://evephdzpoonavggwoejs.supabase.co`) sin perder datos existentes.

### ARCHIVOS A INSPECCIONAR (SOLO SECCIONES RELEVANTES)
- `supabase/01_schema.sql` (tablas `clinicas_veterinarias`, `reservas`, `incidencias_emergencias`, `cupones_promocionales`, `fotos_reporte`, `antecedentes_cuidadores`)
- `supabase/02_functions_triggers.sql` (`handle_new_auth_user`)
- `supabase/03_rpc_business.sql` (`rpc_cotizar_reserva`, `rpc_crear_reserva`, `rpc_cuidador_checkout`, `rpc_emitir_sos`, `rpc_vet_actualizar_sos`)
- `supabase/04_rls_policies.sql` (`sos_select_involucrados`)
- `supabase/05_storage_buckets.sql`
- `supabase/06_seed.sql` (URLs `postimg.cc`)
- `supabase/07_fix_auth_and_audit.sql` (`handle_new_auth_user` y `supabase_realtime`)

### TAREAS EXACTAS A EJECUTAR
1. **Crear `supabase/08_pulido_v5_1.sql`** con los siguientes bloques ordenados y comentados:
   - **Bloque A — Reparación Crítica S.O.S. (`rpc_vet_actualizar_sos` y `rpc_emitir_sos`):**
     - Reescribir `public.rpc_vet_actualizar_sos(p_id_incidencia uuid, p_accion text, p_diagnostico text DEFAULT NULL, p_tratamiento text DEFAULT NULL, p_costo numeric DEFAULT NULL)` corrigiendo el crash PostgreSQL `0A000`: usar `FOR UPDATE OF i;` (NUNCA `FOR UPDATE;` sobre `LEFT JOIN`).
     - Hacer `LEFT JOIN public.reservas r ON r.id = i.id_reserva` y `LEFT JOIN public.mascotas m ON m.id = i.id_mascota`, obteniendo `v_propietario_id := COALESCE(r.id_propietario, m.id_propietario)` y `v_cuidador_usuario_id` desde `perfiles_cuidadores`.
     - Validar que `public.get_my_role() IN ('veterinaria', 'administrador')`. Si es `'veterinaria'`, verificar que el usuario esté vinculado a la clínica derivada (`clinicas_veterinarias.id_usuario_responsable = auth.uid()` o usuario sin restricción cuando la clínica no tiene responsable asignado).
     - Persistir `diagnostico_clinico = COALESCE(NULLIF(trim(p_diagnostico), ''), diagnostico_clinico)`, `tratamiento_aplicado = COALESCE(NULLIF(trim(p_tratamiento), ''), tratamiento_aplicado)`, `costo_emergencia = COALESCE(p_costo, costo_emergencia)` en **TODAS** las transiciones (`en_atencion`, `estabilizada`, `resuelta`), fijando `fecha_resolucion = now()` en `resuelta` y `updated_at = now()`.
     - Insertar notificaciones en `public.notificaciones` para el propietario, el cuidador (si existe) y todos los administradores.
     - Retornar `jsonb` con `{ ok: true, id, codigo_sos, estado_sos, diagnostico_clinico, tratamiento_aplicado, costo_emergencia, fecha_resolucion, updated_at }`.
     - Actualizar `public.rpc_emitir_sos` agregando `p_ubicacion text DEFAULT 'Cusco'` al final de la firma (manteniendo compatibilidad) y guardándolo en `ubicacion_emergencia`.
     - Actualizar política RLS `sos_select_involucrados` en `public.incidencias_emergencias` agregando `OR EXISTS (SELECT 1 FROM public.mascotas m WHERE m.id = incidencias_emergencias.id_mascota AND m.id_propietario = auth.uid())`.
   - **Bloque B — Reglas de Negocio (Check-Out Temporal, Hospedaje 24h y Eliminación de Cupones):**
     - Actualizar `public.rpc_cuidador_checkout`: rechazar con `RAISE EXCEPTION` si `((v_res.fecha_inicio::text || ' ' || COALESCE(v_res.hora_inicio, '08:00:00')::text)::timestamp AT TIME ZONE 'America/Lima') > now()`, indicando fecha y hora programada en formato legible `DD/MM/YYYY HH24:MI`.
     - Actualizar `public.rpc_cotizar_reserva` (manteniendo `p_codigo_cupon text DEFAULT NULL` por compatibilidad): ignorar cupones y retornar siempre `descuento_cupon = 0`, `id_cupon = NULL`, `cupon_valido = false`.
     - Actualizar `public.rpc_crear_reserva`: forzar `id_cupon = NULL`, `descuento_cupon = 0` y eliminar cualquier `UPDATE public.cupones_promocionales`. Si el servicio tiene `categoria = 'Hospedaje'`, exigir `v_bloque_horario = 'todo_el_dia'` (lanzando excepción clara si llega otro bloque) y validar disponibilidad/cupo en **todos** los días del rango `[fecha_inicio..fecha_fin]`.
     - Desactivar cupones existentes: `UPDATE public.cupones_promocionales SET activo = false WHERE activo = true;`.
     - Agregar validación en `reportes_seguimiento` (trigger `BEFORE INSERT`) para rechazar reportes en el Muro si la reserva asociada no tiene `estado_reserva = 'en_curso'`.
   - **Bloque C — Trigger `handle_new_auth_user()` Mejorado (Postulaciones sin Doble INSERT):**
     - Actualizar `public.handle_new_auth_user()` (basándote en la versión saneada de `07_fix_auth_and_audit.sql`) para que, si llegan en `NEW.raw_user_meta_data`:
       - En `perfiles_cuidadores` persista `foto_url` y `foto_hogar_url`.
       - En `antecedentes_cuidadores` inserte los 4 documentos (`doc_identidad_url`, `doc_antecedentes_policiales_url`, `doc_antecedentes_penales_url`, `doc_domicilio_url`) con `ON CONFLICT` seguro.
       - En `clinicas_veterinarias` persista `foto_fachada_url` y `constancia_url` con `ON CONFLICT (ruc) DO NOTHING`.
   - **Bloque D — Storage Buckets (Imágenes + PDFs) y Limpieza de URLs PostImg en BD:**
     - Actualizar `storage.buckets` asegurando `allowed_mime_types` con `application/pdf` en `mascotas-fotos`, `documentos-verificacion` y `comprobantes-pago` (límite `10485760`), e imágenes (`image/jpeg`, `image/png`, `image/webp`, límite `5242880`) en `perfiles` y `muro-fotos`.
     - Actualizar políticas RLS en `storage.objects`: permitir `INSERT` a `anon, authenticated` en `perfiles` y `documentos-verificacion` cuando el path comience por `postulaciones/`; permitir `SELECT` en `documentos-verificacion` y `comprobantes-pago` al propietario del folder, a `administrador` y a `veterinaria`.
     - Reemplazar en `public.clinicas_veterinarias` todas las URLs `foto_fachada_url` que contengan `postimg` por fotografías veterinarias reales válidas de Unsplash (URLs distintas por clínica) y poner `NULL` donde `constancia_url`, `mascotas.cartilla_vacunas_url` o `antecedentes_cuidadores.*_url` contengan `postimg.cc`.
   - **Bloque E — Publicación `supabase_realtime` Completa:**
     - Bloque `DO $$ ... END $$;` idempotente que garantice que `incidencias_emergencias`, `notificaciones`, `reportes_seguimiento`, `reservas`, `liquidaciones_cuidadores` y `auditoria_estados` estén en `supabase_realtime`.
   - **Bloque F — Grants y Consultas de Verificación Comentadas** al final del archivo.
2. **Sincronizar archivos base SQL** (`02_functions_triggers.sql`, `03_rpc_business.sql`, `04_rls_policies.sql`, `05_storage_buckets.sql`, `06_seed.sql`) para que una instalación desde cero contenga exactamente las mismas correcciones y 0 enlaces de `postimg.cc`.
3. **Verificación obligatoria antes de cerrar:**
   - Grep sobre `supabase/*.sql` verificando: 0 `postimg.cc`, 0 `LEFT JOIN` seguido de `FOR UPDATE;` sin `OF`, y firmas/grants consistentes.
   - Marcar con `[x]` todos los ítems de la Sub-Fase P1 en `PLAN_PULIDO_V5_1.md`.
   - Agregar una entrada de cierre de **Sub-Fase P1** en `BITACORA_EJECUCION_V5.md` indicando claramente al usuario que debe ejecutar `supabase/08_pulido_v5_1.sql` en el SQL Editor de Supabase.
```

---

### PROMPT SUB-FASE P2 — Identidad Visual "Andes & Huellas Cusco", Contraste WCAG AAA, Modal Legal Global, `ES/EN` y Neutro "Propietario"

```markdown
Actúa como Product Designer UI/UX Senior y Arquitecto Frontend ejecutando la **Sub-Fase P2** del proyecto **Paw Patita Cusco v5.1**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_1.md` (Sección 1: Bloques 1, 2, 8, Hallazgos H10, H11-catálogo, H12, H13 y Sección 2: Sub-Fase P2).
3. **NO modifiques `supabase/*.sql`, `js/supabase-client.js`, `js/roles/administrador.js`, `js/roles/cuidador.js`, `js/roles/veterinaria.js` ni `js/roles/propietario.js` en esta fase** (excepto si se requiere soporte `data-i18n` mínimo; los paneles y storage van en P3/P4).
4. Mantén arquitectura 100% Static SPA Vanilla ES Modules sin bundler (compatible con GitHub Pages).

### ARCHIVOS A CREAR / EDITAR
- **Crear:** `css/tokens.css`, `js/components/legal-modal.js`, `js/i18n.js`
- **Editar:** `index.html`, `css/main.css`, `css/auth.css`, `css/catalogo.css`, `css/paneles.css`, `css/print.css`, `js/app.js`, `js/config.js`, `js/public/landing.js`, `js/public/catalogo.js`, `js/public/paw-id-publico.js`, `js/public/mapa-cusco.js`

### TAREAS EXACTAS A EJECUTAR
1. **Identidad Visual "Andes & Huellas Cusco" y Corrección Crítica de Contraste:**
   - Crear `css/tokens.css` (extraído desde `css/main.css:7-94` y actualizado) e importarlo en `index.html` antes de `css/main.css`:
     - `--pp-bg-body: #FAF7F2`, `--pp-bg-sand: #F3EDE2`, `--pp-bg-surface: #FFFFFF`, `--pp-border-warm: #E7DDD0`.
     - `--pp-primary: #E85D24` (hover `#C84B17`, deep `#9A3412`), `--pp-forest: #1E5631` (dark `#143D23`), `--pp-gold: #D99B26`, `--pp-secondary: #111827`, `--pp-secondary-dark: #0B1120`.
   - Actualizar `css/main.css`, `css/auth.css`, `css/catalogo.css`, `css/paneles.css` y `css/print.css`:
     - Crear `.andean-textile-ribbon` (franja decorativa textil geométrica cusqueña sutil en header y separadores) y `.hero-andes-cusco` (fondo crema/arena andino cálido con marca de agua SVG sutil de montañas y huellas).
     - **Corregir especificidad CSS:** asegurar que `h1..h6` y `p` dentro de `.text-white`, `.cta-andes-banner`, `.paw-id-banner-emergencia`, `.footer-paw` y `.bg-danger` hereden `#FFFFFF` (nunca queden en `#0F172A` oscuro).
     - **Footer Global WCAG AAA (`> 7:1`):** en `index.html` quitar `.text-muted` del `<footer>` y en `css/main.css` definir `.footer-paw` con fondo `#0B1120`, títulos `#FFFFFF`, párrafos y distritos `#E2E8F0`, metadatos `#CBD5E1`, enlaces en `#FDBA74` con hover `#FFFFFF` subrayado.
   - Rediseñar `js/public/landing.js`:
     - Hero editorial 2 columnas con propuesta de valor cálida + collage fotográfico de mascotas en Cusco (Unsplash reales + fallback SVG inline, cero `postimg.cc`).
     - Reemplazar URLs `postimg.cc` en `CLINICAS_FALLBACK` por fotos veterinarias reales válidas + fallback SVG inline.
     - Banner CTA inferior (`.cta-andes-banner`) en Verde Bosque Montaña (`#1E5631` → `#143D23`) con borde Dorado Inti, tipografía blanca `#FFFFFF` pura y botones de alto contraste.
     - Quitar `<code>#/paw-id/:id</code>` en L263 y cambiar `"Rocky"` → `"Inti"` en L284 y `"Propietaria Local"` → `"Propietario Local"` en L72.
2. **Modal Legal Global (`js/components/legal-modal.js`):**
   - Implementar `initLegalModal()` y `abrirModalLegal(tab = 'terminos')` con delegación global en `document` para `[data-legal-tab="terminos | privacidad | declaracion"]`.
   - Incluir 3 pestañas navegables completas y redactadas formalmente bajo el marco peruano:
     1. **Términos y Condiciones v5.1** (intermediación, PAW-ID, tarifas transparentes, 15%/85%, pago protegido en garantía hasta Check-Out, política escalonada de cancelaciones `>48h 100%`, `24-48h 70%`, `<24h 50%`, Ley N° 30407, protocolo S.O.S.).
     2. **Política de Privacidad — Ley N° 29733** (protección de datos, geolocalización solo en emergencias S.O.S., privacidad QR ocultando DNI y dirección exacta, derechos ARCO).
     3. **Declaración Jurada de Idoneidad y Antecedentes** (cuidadores independientes y clínicas veterinarias aliadas en Cusco).
   - Manejar `z-index` superior (`1085` / backdrop `1080`) para que abrirlo desde un modal padre (Registro / Postulación / Wizard) y cerrarlo NO rompa el scroll ni el backdrop del modal padre.
   - Conectar en `index.html`: Footer (L177: 3 enlaces clicables), Registro Propietario (L421), Postulación Cuidador (L548, L557) y Postulación Clínica (L666).
3. **Motor Bilingüe Funcional `ES / EN` (`js/i18n.js` + `js/app.js`):**
   - Crear `js/i18n.js` exportando `getCurrentLang()`, `setLanguage(lang)`, `t(key, params)`, `applyTranslations(root = document)` con diccionario completo `ES` y `EN` para Navbar, Footer, Auth Modals, Landing, Catálogo, PAW-ID Público, Wizard y etiquetas comunes.
   - Añadir atributos `data-i18n` / `data-i18n-placeholder` en `index.html` y vistas públicas (`landing.js`, `catalogo.js`, `paw-id-publico.js`).
   - En `js/app.js`: inicializar `initLegalModal()`, hidratar los botones `#btn-toggle-currency` y `#btn-toggle-lang` al arrancar usando `innerHTML` (SIN borrar `<i class="bi ...">`), y al alternar idioma llamar `setLanguage()`, `applyTranslations(document)`, `updateNavbar()` y `handleRouteChange()`.
4. **Estándar Neutro `"Propietario"` y Limpieza de Catálogo/Config:**
   - Reemplazar las 5 apariciones de `"Propietaria"` → `"Propietario"` (`index.html:205`, `js/config.js:74,77`, `js/public/landing.js:72`, `js/public/catalogo.js:999`).
   - Alinear nombres demo en `index.html:210,214`, `js/config.js:82,90` (`Valeria Huamán`, `Dra. Claudia Salazar`) y `paw-id-publico.js:17` (`Inti`).
   - Alinear `CUSCO_CONFIG.BLOQUES_HORARIOS` en `js/config.js:60-65` con las claves exactas del enum SQL (`manana_08_12`, `tarde_14_18`, `noche_18_22`, `todo_el_dia`).
   - En `js/public/catalogo.js`: reemplazar el bloque de reseña hardcodeada de "Lucía M." (L996–L1008) por consulta real a `public.resenas` filtrada por `id_cuidador` (con estado vacío elegante si aún no tiene reseñas), y quitar `"Leaflet.js + OpenStreetMap"` en L418 (y `mapa-cusco.js:79`).
5. **Verificación y Cierre:**
   - Verificar con grep que queden **0 ocurrencias** de `Propietaria` en `index.html` y `js/`, y **0 enlaces muertos** en el Footer y formularios de `index.html`.
   - Marcar `[x]` en los ítems de la Sub-Fase P2 en `PLAN_PULIDO_V5_1.md` y documentar cambios en `BITACORA_EJECUCION_V5.md`.
```

---

### PROMPT SUB-FASE P3 — Motor Directo Supabase Storage (Imágenes + PDFs sin PostImg) y Reglas Operativas (S.O.S., Cuidador, Wizard sin Cupones, Muro, Agenda y Billetera)

```markdown
Actúa como Arquitecto Principal Full-Stack JavaScript / Supabase ejecutando la **Sub-Fase P3** del proyecto **Paw Patita Cusco v5.1**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_1.md` (Sección 1: Bloques 3, 4, 6, 7, Hallazgos H2, H3, H4, H6, H7, H8, H9, H11-billetera y Sección 2: Sub-Fase P3).
3. **NO modifiques `supabase/*.sql` ni `js/roles/administrador.js` en esta fase** (P1 ya cerró SQL y P4 se encarga exclusivamente del Panel Administrador).
4. **CERO tragueo silencioso de errores:** cuando `isSupabaseConfigured()` sea `true`, ninguna llamada `.rpc()`, `.insert()`, `.update()` o `.upsert()` debe esconder `{ error }` con `console.warn('Fallback local...')`. Siempre hacer `if (error) throw error;` y recargar estado confirmado desde BD.

### ARCHIVOS A CREAR / EDITAR
- **Crear:** `js/components/file-uploader.js`
- **Editar:** `js/supabase-client.js`, `js/utils/formatters.js`, `index.html` (solo bloques de subida de archivos en modales de Postulación Cuidador y Postulación Clínica), `js/auth/postulaciones.js`, `js/components/carnet-digital.js`, `js/components/wizard-reserva.js`, `js/components/alerta-sos.js`, `js/components/muro-fotos.js`, `js/components/billetera-cuidador.js`, `js/components/calendario-agenda.js`, `js/roles/propietario.js`, `js/roles/cuidador.js`, `js/roles/veterinaria.js`, `js/app.js` (Realtime S.O.S. `'*'`).

### TAREAS EXACTAS A EJECUTAR
1. **Infraestructura de Almacenamiento Directo (`js/supabase-client.js`):**
   - Implementar y exportar:
     - `compressImageFile(file, { maxWidth = 1600, quality = 0.82 })`: comprime imágenes vía Canvas; deja intacto `application/pdf`.
     - `uploadFileToStorage(file, bucket, folder = 'general', { onProgress } = {})`: valida MIME y tamaño (`<= 5MB` imagen, `<= 10MB` PDF), sube a Supabase Storage y retorna `{ url, storageRef, bucket, path, mimeType, origen: 'supabase_storage' }`. Para buckets privados (`documentos-verificacion`, `comprobantes-pago`), `storageRef` es `storage://<bucket>/<path>` y `url` es una signed URL temporal para preview.
     - Mantener compatibilidad con `uploadOrResolveMedia()` corrigiendo `origen: 'supabase_storage'` (nunca `'storage'`) y rechazando URLs de `postimg.cc` / `postimages.org`.
     - `resolveMediaUrl(urlOrRef, expiresIn = 3600)`: si inicia con `storage://`, genera URL firmada con `createSignedUrl()`; si contiene `postimg.cc` / `postimages.org`, retorna `null`.
     - `getFallbackSvgDataUri(tipo = 'clinica' | 'mascota' | 'avatar' | 'hogar')`: retorna SVG embebido cálido temático andino.
2. **Widget Reutilizable y Visor Universal (`js/components/file-uploader.js`):**
   - Exportar `mountFileUploader(container, opts)` con soporte para `accept` (`image/*` o `image/*,application/pdf`), `bucket`, `folder`, `initialValue`, `label`, `allowExternalUrl = true` (SIEMPRE dentro de un `<details>`/acordeón colapsado *"¿Prefieres pegar un enlace externo? (Opcional)"* sin mencionar `PostImg`), barra de progreso, preview de imagen o tarjeta PDF, validación y método `.getValue()` / `.uploadIfPending()`.
   - Exportar `abrirVisorDocumento(urlOrRef, titulo)`: resuelve `storage://` vía `resolveMediaUrl()`, detecta PDF para mostrar `<iframe style="width:100%;height:68vh">` + botón *"Abrir / Descargar PDF"*, o `<img>` ampliable si es imagen.
3. **Integración del Dropzone en los Flujos de Usuario (Eliminación 100% de PostImg):**
   - **Postulación Cuidador (`index.html` + `js/auth/postulaciones.js`):** Dropzones directos para `foto_perfil` (img), `foto_hogar` (img) y los 4 documentos (`DNI`, `Antecedentes Policiales`, `Antecedentes Penales`, `Comprobante Domicilio` — `image/*,application/pdf`). Subir a `perfiles/postulaciones/...` y `documentos-verificacion/postulaciones/...` antes del `signUp` y enviar las referencias en `options.data`.
   - **Postulación Clínica (`index.html` + `js/auth/postulaciones.js`):** Dropzones para `foto_fachada_url` (img) y `constancia_url` CMVP/RUC (`image/*,application/pdf`). Enviar todos los datos en `options.data` de `auth.signUp()` y **eliminar el doble `INSERT`** en `clinicas_veterinarias` cuando no exista sesión activa (ya lo crea `handle_new_auth_user()`).
   - **Mascotas Crear/Editar y Visor Cartilla (`js/components/carnet-digital.js`):** Reemplazar campos PostImg por `mountFileUploader` para foto (`mascotas-fotos`, img) y cartilla (`mascotas-fotos`, `image/*,application/pdf`); actualizar `abrirVisorCartillaVacunas()` usando `abrirVisorDocumento()`; ocultar fila de cupón en recibos nuevos (solo mostrar si `descuento_cupon > 0`).
   - **Veterinaria (`js/roles/veterinaria.js`):** Agregar dropzones en Configuración de Sede (`foto_fachada_url`, `constancia_url` PDF/Img) y usar `abrirVisorDocumento()` en el visor de cartilla durante la validación PAW-ID.
   - **Muro en Vivo Cuidador (`js/roles/cuidador.js` + `js/components/muro-fotos.js`):** Dropzone multi-foto (hasta 3 imágenes) cámara/galería sin referencias a `PostImg` ni `Supabase Storage`.
   - **Perfil Propietario (`js/roles/propietario.js`):** Añadir subida directa de avatar (`avatar_url` en bucket `perfiles`) y corregir icono `bi-person-vcard-fill`.
4. **Persistencia Real S.O.S. (Cero UI Optimista Falsa):**
   - `js/roles/veterinaria.js`: eliminar `console.warn('Fallback local...')` en `rpc_vet_actualizar_sos` (L1206), `rpc_vet_dictaminar_ficha` (L1852) y comprobar `{ error }` en `clinicas_veterinarias.update` (L2046). Tras éxito real del RPC, recargar datos desde Supabase (`cargarDatosPanelVeterinaria`) para garantizar sincronización real. Ocultar el botón *"Simular Ingreso S.O.S."* cuando `isSupabaseConfigured()` sea `true`. Eliminar toda jerga `rpc_*` / `validaciones_veterinarias` / `LEAFLET`.
   - `js/components/alerta-sos.js`: pasar `p_ubicacion` a `rpc_emitir_sos`, corregir icono `bi-broadcast-pin`, corregir `data.length > 0` → `Array.isArray(data)` y limpiar jerga `(rpc_emitir_sos)`.
   - `js/roles/propietario.js` y `js/app.js`: suscribir Realtime S.O.S. con evento `'*'` (INSERT + UPDATE), refrescar panel y badge en vivo, corregir `data.length > 0` → `Array.isArray(data)` y limpiar jerga `(rpc_*)`.
5. **Reglas de Negocio Cuidador, Wizard sin Cupones, Agenda, Billetera y Fechas:**
   - `js/utils/formatters.js`: usar `parseFechaLocal()` en `calcularEdadDinamica()` y forzar `timeZone: 'America/Lima'` en `getHoyIso()`.
   - `js/roles/cuidador.js`:
     - Selector del Muro de Fotos estrictamente `reservas.filter((r) => r.estado_reserva === 'en_curso')`; si está vacío, mostrar estado vacío claro y deshabilitar el envío.
     - Check-Out temporal: bloquear botón/acción antes de `fecha_inicio + hora_inicio` (hora Cusco `America/Lima`) con aviso claro de disponibilidad.
     - Quitar fallbacks `data.length > 0`, quitar error-swallowing en servicios/muro/reseñas y quitar toda jerga `(rpc_cuidador_*)` / `PostImg` / `Supabase Storage`.
   - `js/components/wizard-reserva.js`:
     - Eliminar **todo** rastro de cupones (`CUPONES_FALLBACK`, input, botones rápidos, Paso 3 → *"Cotización Transparente"*).
     - Si `oferta.categoria === 'Hospedaje'`, forzar `bloqueHorario = 'todo_el_dia'` (24h), ocultar bloques parciales y mostrar badge *"Estadía Completa 24 Horas"*.
     - Validar disponibilidad en **TODOS los días** de `[fechaInicio..fechaFin]` (no solo el día 1).
     - Conectar checkbox Paso 4 al Modal Legal (`data-legal-tab="terminos"`). Limpiar jerga `rpc_*` y enum crudo `todo_el_dia`.
   - `js/components/calendario-agenda.js`: al replicar a 3/7 días, preservar `cupos_reservados` existentes de cada día destino (nunca resetear a `0`), quitar error-swallowing y jerga `disponibilidad_cuidadores`.
   - `js/components/billetera-cuidador.js`: **invertir argumentos en L848** → `exportarCsv(rowsCsv, 'billetera_liquidaciones_cuidador_cusco.csv')`, quitar error-swallowing en `rpc_solicitar_retiro`, quitar `data.length > 0`, calcular serie mensual Chart.js dinámicamente desde liquidaciones reales y limpiar jerga `(rpc_solicitar_retiro)`.
6. **Verificación y Cierre:**
   - Ejecutar grep sobre los archivos editados verificando 0 `PostImg`, 0 `rpc_` en UI, 0 `Fallback local` silenciosos en mutaciones y argumentos correctos de `exportarCsv`.
   - Marcar `[x]` en los ítems de la Sub-Fase P3 en `PLAN_PULIDO_V5_1.md` y documentar en `BITACORA_EJECUCION_V5.md`.
```

---

### PROMPT SUB-FASE P4 — Panel Administrador (Bitácora Humana sin `jsonb`, Sin Cupones, Visor Firmado), Purga Final de Jerga, QA E2E y Despliegue

```markdown
Actúa como Arquitecto Principal Full-Stack y Auditor QA Forense ejecutando la **Sub-Fase P4 (Cierre y Despliegue)** del proyecto **Paw Patita Cusco v5.1**.

### REGLAS INQUEBRANTABLES
1. **PROHIBIDO leer o abrir `legacy-gas/` o `BD-PAWPATITAS-v3.xlsx`.**
2. Lee primero `PLAN_PULIDO_V5_1.md` (Sección 1: Bloques 5, 7, Hallazgos H2, H5 y Sección 2: Sub-Fase P4) y revisa los últimos 80 líneas de `BITACORA_EJECUCION_V5.md` para confirmar el estado de P1–P3.
3. No rompas ningún contrato implementado en P1–P3.

### ARCHIVOS A EDITAR
- `js/roles/administrador.js`
- `js/utils/ui-helpers.js` (L280: quitar `Supabase Auth (GoTrue)` y ruta `.sql`)
- `js/router.js` (L247: quitar `rpc_obtener_paw_id_publico en la Fase 4`)
- `PLAN_PULIDO_V5_1.md` y `BITACORA_EJECUCION_V5.md`

### TAREAS EXACTAS A EJECUTAR
1. **Refactor Integral de `js/roles/administrador.js`:**
   - **Eliminación 100% de Jerga Técnica:**
     - Limpiar títulos, badges, subtítulos y `showSpinner()` en las 6 secciones (`1. Panel Ejecutivo` sin `Chart.js`; eliminar todas las menciones `rpc_admin_*`, `0 undefined`, `configuracion_plataforma`, `temporadas_tarifas`, `auditoria_estados`, `TRIGGERS POSTGRESQL`, `JSONB`, `old_record`, `new_record`, `fn_auditar_cambio_estado`, `"en Supabase"`).
   - **Persistencia Real sin Tragueo de Errores:**
     - En los 6 RPCs (`rpc_admin_aprobar_cuidador`, `rpc_admin_aprobar_clinica`, `rpc_admin_crear_clinica_directa`, `rpc_admin_resolver_caso`, `rpc_admin_procesar_liquidacion`, `rpc_admin_reasignar_sos`): comprobar `{ error }` y ejecutar `if (error) throw error;` cuando `isSupabaseConfigured()` sea `true`, recargando datos confirmados desde Supabase tras éxito.
     - En `#form-admin-parametros`: persistir realmente mediante `supabase.from('configuracion_plataforma').update(...)` (además de refrescar estado en memoria), sin quedarse solo en `localStorage`.
   - **Visor Firmado de Documentos y Dropzone en Alta de Clínica:**
     - Importar `mountFileUploader` y `abrirVisorDocumento` desde `../components/file-uploader.js` y `resolveMediaUrl` / `getFallbackSvgDataUri` desde `../supabase-client.js`.
     - En `renderSubVistaCuidadoresAdmin`, `abrirModalExpedienteCuidador` y `renderSubVistaClinicasAdmin`: reemplazar `<a href="...">` directos sobre los 4 docs del cuidador y la constancia CMVP por botones que invoquen `abrirVisorDocumento(urlOrRef, titulo)` (soportando URLs firmadas `storage://` + imágenes + PDFs).
     - En `abrirModalCrearClinicaDirecta`: añadir dropzones para `foto_fachada_url` (`perfiles`, imagen) y `constancia_url` (`documentos-verificacion`, imagen/PDF) e incluir ambos en `p_payload` al invocar `rpc_admin_crear_clinica_directa`.
   - **Eliminación Total de Cupones Promocionales (Sección 5):**
     - Eliminar `CONFIG_GOBERNANZA_SEED.cupones`, la tabla de cupones, el toggle `[data-toggle-cupon]`, el botón `#btn-admin-nuevo-cupon` y el modal de creación.
     - Reorganizar la fila de Gobernanza en 2 tarjetas limpias: **Parámetros Financieros Globales** (conectado a `configuracion_plataforma`) y **Temporadas Turísticas Oficiales de Cusco** (cargadas desde `public.temporadas_tarifas`).
   - **Rediseño Humano de la Bitácora de Auditoría (Sección 6):**
     - Reemplazar las opciones del `<select id="aud-filtro-entidad">` por etiquetas humanas de negocio (manteniendo el `value` interno de tabla).
     - Implementar `formatearResumenCambioAuditoria(item)` con diccionarios `ENTIDAD_LABELS`, `ESTADO_LABELS` y `CAMPO_LABELS`:
       - Mostrar código legible (`codigo_reserva`, `codigo_sos`, `codigo_liquidacion`, `paw_id`, `codigo_cuidador`) extraído de `new_record`/`old_record` en vez de UUIDs crudos.
       - Traducir `estado_anterior` → `estado_nuevo` a español legible y reemplazar `Trigger PostgreSQL` por `Sistema Automático`.
       - Reemplazar la cabecera `JSONB` por **"Resumen del Cambio"** (mostrando un resumen claro en fila + botón **"Ver Detalle"** `bi-card-list`).
       - En el modal de detalle, mostrar una tabla limpia **Campo | Valor Anterior | Valor Nuevo** en lenguaje humano (CERO `<pre>` JSON crudo, CERO etiquetas `OLD_RECORD`/`NEW_RECORD`/`JSONB`).
2. **Limpieza Residual (`js/utils/ui-helpers.js` y `js/router.js`):**
   - `ui-helpers.js:280`: reemplazar mensaje técnico de `GoTrue` / `07_fix_auth_and_audit.sql` por mensaje amigable de usuario.
   - `router.js:247`: reemplazar texto placeholder técnico.
3. **Auditoría Automática Forense (Barrido Regex Global):**
   - Ejecutar un script PowerShell sobre `index.html`, `css/` y `js/` (excluyendo comentarios puros e invocaciones internas `.rpc(`/`.from(`) confirmando **0 fugas visibles** de:
     - `rpc_`, `jsonb`, `JSONB`, `old_record`, `new_record`, `PostImg`, `postimg`, `GoTrue`, `PostgreSQL`, `Leaflet`, `Chart.js`, `0 undefined`, `Propietaria`.
   - Verificar sintaxis JS válida en todos los módulos y verificar que ningún archivo tenga errores de importación de rutas relativas.
4. **QA E2E, Documentación y Despliegue:**
   - Iniciar servidor local (o verificar con subagente browser si está disponible) y validar visual y funcionalmente:
     - Landing (contraste Hero, Banner CTA, Footer WCAG AAA, 0 imágenes rotas de PostImg).
     - Modal Legal 3 pestañas desde Footer, 3 Registros y Wizard Paso 4.
     - Switcher `ES / EN` y `PEN / USD` (preservando íconos).
     - Flujos de Propietario, Cuidador (Muro solo `en_curso`, Check-Out temporal, Billetera), Veterinaria (S.O.S. persistente y visor PDF), Administrador (Bitácora humana, sin cupones, visor firmado).
   - Marcar todos los ítems restantes de `PLAN_PULIDO_V5_1.md` como `[x]`.
   - Registrar el cierre oficial de **Paw Patita Cusco v5.1** en `BITACORA_EJECUCION_V5.md` con tabla de archivos modificados y resultados de QA.
   - Ejecutar `git status`, `git diff --stat`, crear commit descriptivo de v5.1 y (solo si el usuario lo autoriza o si el repo ya despliega vía `main`) preparar/ejecutar el `git push` para publicar en GitHub Pages (`https://nasdigog-glitch.github.io/paw-patita-cusco/`).
```

---

## Registro de Progreso Global v5.1

- [x] **Sub-Fase P1:** Backend SQL (`08_pulido_v5_1.sql` + sync `02`–`06`) ejecutado y verificado.
- [ ] **Sub-Fase P2:** Identidad Visual "Andes & Huellas Cusco", Contraste WCAG AAA, Modal Legal Global, `ES/EN` y `"Propietario"`.
- [ ] **Sub-Fase P3:** Subida Directa Supabase Storage (Img + PDF sin PostImg) y Reglas Operativas (S.O.S., Cuidador, Wizard sin Cupones, Muro, Agenda, Billetera).
- [ ] **Sub-Fase P4:** Panel Admin (Bitácora Humana sin `jsonb`, Sin Cupones, Visor Firmado), Purga Final, QA E2E y Despliegue GitHub Pages.

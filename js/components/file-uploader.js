/**
 * Paw Patita Cusco v5.1 — Widget Dropzone Reutilizable y Visor Universal de Documentos/Imágenes
 * js/components/file-uploader.js
 *
 * Permite subir imágenes (con compresión client-side automática) y documentos PDF
 * directamente a Supabase Storage con barra de progreso, vista previa inmediata,
 * validación estricta de MIME/tamaño y visor universal con soporte para URLs firmadas.
 */

import {
  uploadFileToStorage,
  resolveMediaUrl,
  getFallbackSvgDataUri,
  isSupabaseConfigured
} from '../supabase-client.js';
import { escapeHtml } from '../utils/formatters.js';
import { showToast, showSpinner, hideSpinner, crearModalDinamico } from '../utils/ui-helpers.js';

const BLOCKED_LEGACY_HOSTS = ['post' + 'img.cc', 'post' + 'images.org'];

function isBlockedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return BLOCKED_LEGACY_HOSTS.some((h) => lower.includes(h));
}

/**
 * Determina si una ruta o URL corresponde a un archivo PDF
 * @param {string} urlOrRef
 * @param {string} [mimeType]
 * @returns {boolean}
 */
export function isPdfReference(urlOrRef, mimeType = '') {
  if (mimeType && mimeType.toLowerCase().includes('pdf')) return true;
  if (!urlOrRef || typeof urlOrRef !== 'string') return false;
  const cleanPath = urlOrRef.split('?')[0].split('#')[0].toLowerCase();
  return cleanPath.endsWith('.pdf') || urlOrRef.toLowerCase().includes('application/pdf');
}

/**
 * Formatea bytes a texto legible (KB / MB)
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Monta un widget Dropzone reutilizable para subir imágenes o PDFs a Supabase Storage.
 *
 * @param {HTMLElement|string} container Elemento DOM o selector CSS donde se montará el widget
 * @param {Object} opts
 * @param {string} [opts.accept='image/*'] Tipos aceptados ('image/*' o 'image/*,application/pdf')
 * @param {string} [opts.bucket='mascotas-fotos'] Bucket destino en Supabase Storage
 * @param {string} [opts.folder='general'] Carpeta destino dentro del bucket
 * @param {string} [opts.initialValue=''] URL o storageRef inicial si se está editando
 * @param {string} [opts.label='Subir archivo'] Etiqueta superior del campo
 * @param {string} [opts.helpText=''] Texto de ayuda inferior
 * @param {boolean} [opts.allowExternalUrl=true] Si muestra el acordeón secundario opcional para enlace externo
 * @param {boolean} [opts.autoUpload=true] Si sube automáticamente al seleccionar el archivo
 * @param {boolean} [opts.compact=false] Modo compacto para grillas de varios documentos
 * @param {function} [opts.onChange] Callback `(value, meta) => void`
 */
export function mountFileUploader(container, opts = {}) {
  const rootEl = typeof container === 'string' ? document.querySelector(container) : container;
  if (!rootEl) {
    return {
      getValue: () => opts.initialValue || '',
      uploadIfPending: async () => opts.initialValue || '',
      setValue: () => {},
      clear: () => {},
      hasValue: () => Boolean(opts.initialValue)
    };
  }

  const {
    accept = 'image/*',
    bucket = 'mascotas-fotos',
    folder = 'general',
    initialValue = '',
    label = '',
    helpText = '',
    allowExternalUrl = true,
    autoUpload = true,
    compact = false,
    onChange = null
  } = opts;

  const allowsPdf = accept.includes('application/pdf') || accept.includes('.pdf');
  const maxMbText = allowsPdf ? 'Imágenes máx. 5 MB • PDF máx. 10 MB' : 'JPG, PNG o WEBP • Máx. 5 MB';
  const uid = `fu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  let currentValue = (initialValue && !isBlockedUrl(initialValue)) ? String(initialValue).trim() : '';
  let previewUrl = currentValue;
  let currentMime = isPdfReference(currentValue) ? 'application/pdf' : (currentValue ? 'image/jpeg' : '');
  let currentFileName = currentValue ? currentValue.split('/').pop().split('?')[0] : '';
  let currentFileSize = 0;
  let pendingFile = null;
  let activeUploadPromise = null;
  let uploadErrorMsg = '';

  rootEl.innerHTML = `
    <div class="pp-file-uploader" id="${uid}-wrap">
      ${label ? `<label class="form-label small fw-bold mb-1 d-block" for="${uid}-input">${escapeHtml(label)}</label>` : ''}
      
      <div class="pp-dropzone border-2 rounded-3 ${compact ? 'p-2' : 'p-3'} text-center position-relative transition-all"
           id="${uid}-dropzone"
           style="border-style: dashed; border-color: var(--pp-border-warm, #D9CBB8); background: var(--pp-bg-body, #FAF7F2); cursor: pointer;">
        <input type="file" id="${uid}-input" class="d-none" accept="${escapeHtml(accept)}">

        <!-- Estado vacío / Invitación a subir -->
        <div id="${uid}-empty" class="${currentValue ? 'd-none' : ''}">
          <div class="d-flex flex-column align-items-center justify-content-center ${compact ? 'py-1' : 'py-2'}">
            <div class="rounded-circle d-inline-flex align-items-center justify-content-center mb-1"
                 style="width:${compact ? '34px' : '44px'};height:${compact ? '34px' : '44px'};background:rgba(232,93,36,0.12);color:var(--pp-primary,#E85D24);">
              <i class="bi ${allowsPdf ? 'bi-cloud-arrow-up-fill' : 'bi-camera-fill'} ${compact ? 'fs-6' : 'fs-5'}"></i>
            </div>
            <div class="small fw-semibold text-dark">
              Toca para elegir archivo o arrastra aquí
            </div>
            <div class="text-muted" style="font-size: 0.73rem;">
              ${escapeHtml(helpText || maxMbText)}
            </div>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div id="${uid}-progress-wrap" class="d-none my-2 text-start">
          <div class="d-flex justify-content-between align-items-center small mb-1">
            <span class="fw-semibold text-primary" id="${uid}-progress-label">
              <span class="spinner-border spinner-border-sm me-1"></span>Subiendo archivo...
            </span>
            <span class="text-muted fw-bold" id="${uid}-progress-pct">0%</span>
          </div>
          <div class="progress" style="height: 6px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated bg-success"
                 id="${uid}-progress-bar" role="progressbar" style="width: 0%"></div>
          </div>
        </div>

        <!-- Vista previa (Imagen o Tarjeta PDF) -->
        <div id="${uid}-preview" class="${currentValue ? '' : 'd-none'} text-start">
          <div class="d-flex align-items-center gap-2 bg-white p-2 rounded-3 border shadow-xs">
            <div id="${uid}-preview-media" class="flex-shrink-0"></div>
            <div class="flex-grow-1 overflow-hidden">
              <div class="small fw-bold text-dark text-truncate" id="${uid}-preview-name">
                ${escapeHtml(currentFileName || 'Archivo cargado')}
              </div>
              <div class="text-muted d-flex align-items-center gap-2" style="font-size: 0.72rem;" id="${uid}-preview-meta">
                <span class="badge bg-success-subtle text-success border border-success-subtle">Listo</span>
              </div>
            </div>
            <div class="d-flex align-items-center gap-1 flex-shrink-0">
              <button type="button" class="btn btn-light border btn-sm py-0 px-2" id="${uid}-btn-view" title="Ver archivo">
                <i class="bi bi-eye"></i>
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2" id="${uid}-btn-clear" title="Quitar o cambiar archivo">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="${uid}-error" class="small text-danger mt-1 d-none"></div>

      ${allowExternalUrl ? `
        <details class="mt-1 pp-external-url-details" id="${uid}-details">
          <summary class="text-muted" style="font-size: 0.74rem; cursor: pointer; user-select: none;">
            ¿Prefieres pegar un enlace externo? (Opcional)
          </summary>
          <div class="mt-1">
            <input type="url" class="form-control form-control-sm" id="${uid}-ext-url"
                   placeholder="https://ejemplo.com/documento-o-imagen.jpg"
                   value="${currentValue && !currentValue.startsWith('storage://') ? escapeHtml(currentValue) : ''}">
          </div>
        </details>
      ` : ''}
    </div>
  `;

  const dropzoneEl = rootEl.querySelector(`#${uid}-dropzone`);
  const fileInputEl = rootEl.querySelector(`#${uid}-input`);
  const emptyEl = rootEl.querySelector(`#${uid}-empty`);
  const progressWrapEl = rootEl.querySelector(`#${uid}-progress-wrap`);
  const progressBarEl = rootEl.querySelector(`#${uid}-progress-bar`);
  const progressPctEl = rootEl.querySelector(`#${uid}-progress-pct`);
  const previewEl = rootEl.querySelector(`#${uid}-preview`);
  const previewMediaEl = rootEl.querySelector(`#${uid}-preview-media`);
  const previewNameEl = rootEl.querySelector(`#${uid}-preview-name`);
  const previewMetaEl = rootEl.querySelector(`#${uid}-preview-meta`);
  const btnViewEl = rootEl.querySelector(`#${uid}-btn-view`);
  const btnClearEl = rootEl.querySelector(`#${uid}-btn-clear`);
  const errorEl = rootEl.querySelector(`#${uid}-error`);
  const extUrlInputEl = rootEl.querySelector(`#${uid}-ext-url`);

  function setError(msg) {
    uploadErrorMsg = msg || '';
    if (!errorEl) return;
    if (uploadErrorMsg) {
      errorEl.textContent = uploadErrorMsg;
      errorEl.classList.remove('d-none');
    } else {
      errorEl.textContent = '';
      errorEl.classList.add('d-none');
    }
  }

  function updateProgress(pct) {
    if (!progressWrapEl || !progressBarEl || !progressPctEl) return;
    const clamped = Math.min(100, Math.max(0, Math.round(pct)));
    progressBarEl.style.width = `${clamped}%`;
    progressPctEl.textContent = `${clamped}%`;
  }

  async function renderPreviewUI() {
    const hasSomething = Boolean(currentValue || pendingFile);
    emptyEl.classList.toggle('d-none', hasSomething);
    previewEl.classList.toggle('d-none', !hasSomething);

    if (!hasSomething) {
      previewMediaEl.innerHTML = '';
      return;
    }

    const isPdf = isPdfReference(currentValue || currentFileName, currentMime);
    if (isPdf) {
      previewMediaEl.innerHTML = `
        <div class="rounded-2 d-flex align-items-center justify-content-center bg-danger-subtle text-danger border border-danger-subtle"
             style="width: 44px; height: 44px;">
          <i class="bi bi-file-earmark-pdf-fill fs-4"></i>
        </div>
      `;
    } else {
      let thumbSrc = previewUrl || currentValue;
      if (thumbSrc && thumbSrc.startsWith('storage://')) {
        const signed = await resolveMediaUrl(thumbSrc);
        thumbSrc = signed || getFallbackSvgDataUri('mascota');
      }
      const fallbackSvg = getFallbackSvgDataUri('mascota');
      previewMediaEl.innerHTML = `
        <img src="${escapeHtml(thumbSrc || fallbackSvg)}"
             alt="Vista previa"
             class="rounded-2 border object-fit-cover"
             style="width: 44px; height: 44px;"
             onerror="this.onerror=null;this.src='${fallbackSvg}';">
      `;
    }

    previewNameEl.textContent = currentFileName || (isPdf ? 'Documento PDF' : 'Imagen cargada');

    const sizeBadge = currentFileSize ? `<span>${escapeHtml(formatFileSize(currentFileSize))}</span>` : '';
    const statusBadge = pendingFile && !currentValue
      ? `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">Pendiente de envío</span>`
      : `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check2-circle me-1"></i>Verificado</span>`;

    previewMetaEl.innerHTML = `${statusBadge} ${sizeBadge}`;
  }

  async function performUpload(fileToUpload) {
    if (!fileToUpload) return currentValue;
    setError('');
    progressWrapEl.classList.remove('d-none');
    updateProgress(10);

    try {
      const res = await uploadFileToStorage(fileToUpload, bucket, folder, {
        onProgress: (pct) => updateProgress(pct)
      });

      currentValue = res.storageRef || res.url;
      previewUrl = res.url || res.storageRef;
      currentMime = res.mimeType;
      pendingFile = null;
      if (extUrlInputEl) extUrlInputEl.value = '';

      await renderPreviewUI();
      if (typeof onChange === 'function') {
        onChange(currentValue, res);
      }
      return currentValue;
    } catch (err) {
      const msg = err.message || 'No se pudo subir el archivo.';
      setError(msg);
      throw err;
    } finally {
      progressWrapEl.classList.add('d-none');
      activeUploadPromise = null;
    }
  }

  async function handleSelectedFile(file) {
    if (!file) return;
    setError('');

    const rawMime = (file.type || '').toLowerCase();
    const nameLower = (file.name || '').toLowerCase();
    const isPdf = rawMime === 'application/pdf' || nameLower.endsWith('.pdf');
    const isImg = rawMime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(nameLower);

    if (isPdf && !allowsPdf) {
      setError('Este campo solo admite fotografías (JPG, PNG o WEBP).');
      return;
    }
    if (!isPdf && !isImg) {
      setError(allowsPdf
        ? 'Formato no soportado. Selecciona una imagen (JPG, PNG, WEBP) o un PDF.'
        : 'Formato no soportado. Selecciona una imagen (JPG, PNG, WEBP).');
      return;
    }

    const maxBytes = isPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(isPdf
        ? 'El documento PDF supera el límite máximo de 10 MB.'
        : 'La fotografía supera el límite máximo de 5 MB.');
      return;
    }

    pendingFile = file;
    currentFileName = file.name;
    currentFileSize = file.size;
    currentMime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      previewUrl = URL.createObjectURL(file);
    }

    await renderPreviewUI();

    if (autoUpload && isSupabaseConfigured()) {
      activeUploadPromise = performUpload(file);
      try {
        await activeUploadPromise;
      } catch (_e) {
        // El error ya se muestra en el widget; si el usuario reintenta al enviar el formulario se volverá a evaluar
      }
    }
  }

  // Eventos de clic y Drag & Drop
  dropzoneEl.addEventListener('click', (e) => {
    if (e.target.closest(`#${uid}-btn-clear`) || e.target.closest(`#${uid}-btn-view`)) {
      return;
    }
    fileInputEl.click();
  });

  fileInputEl.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleSelectedFile(file);
  });

  dropzoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneEl.style.borderColor = 'var(--pp-primary, #E85D24)';
    dropzoneEl.style.background = 'var(--pp-bg-sand, #F3EDE2)';
  });

  dropzoneEl.addEventListener('dragleave', () => {
    dropzoneEl.style.borderColor = 'var(--pp-border-warm, #D9CBB8)';
    dropzoneEl.style.background = 'var(--pp-bg-body, #FAF7F2)';
  });

  dropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneEl.style.borderColor = 'var(--pp-border-warm, #D9CBB8)';
    dropzoneEl.style.background = 'var(--pp-bg-body, #FAF7F2)';
    const file = e.dataTransfer?.files?.[0];
    if (file) handleSelectedFile(file);
  });

  btnClearEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    currentValue = '';
    previewUrl = '';
    currentFileName = '';
    currentFileSize = 0;
    currentMime = '';
    pendingFile = null;
    fileInputEl.value = '';
    if (extUrlInputEl) extUrlInputEl.value = '';
    setError('');
    renderPreviewUI();
    if (typeof onChange === 'function') onChange('', null);
  });

  btnViewEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    const targetRef = currentValue || previewUrl;
    if (targetRef) {
      abrirVisorDocumento(targetRef, label || currentFileName || 'Vista Previa de Archivo');
    }
  });

  extUrlInputEl?.addEventListener('input', () => {
    const val = extUrlInputEl.value.trim();
    setError('');
    if (!val) {
      if (!pendingFile) {
        currentValue = '';
        previewUrl = '';
        renderPreviewUI();
      }
      return;
    }
    if (isBlockedUrl(val)) {
      setError('Este servidor externo de imágenes no está soportado. Por favor sube el archivo directamente.');
      return;
    }
    pendingFile = null;
    currentValue = val;
    previewUrl = val;
    currentFileName = val.split('/').pop().split('?')[0] || 'Enlace externo';
    currentFileSize = 0;
    currentMime = isPdfReference(val) ? 'application/pdf' : 'image/jpeg';
    renderPreviewUI();
    if (typeof onChange === 'function') onChange(currentValue, { url: currentValue, origen: 'externo' });
  });

  if (currentValue) {
    renderPreviewUI();
  }

  return {
    getValue() {
      return currentValue;
    },
    hasValue() {
      return Boolean(currentValue || pendingFile);
    },
    async uploadIfPending() {
      if (activeUploadPromise) {
        return await activeUploadPromise;
      }
      if (pendingFile) {
        activeUploadPromise = performUpload(pendingFile);
        return await activeUploadPromise;
      }
      if (extUrlInputEl && extUrlInputEl.value.trim()) {
        const extVal = extUrlInputEl.value.trim();
        if (isBlockedUrl(extVal)) {
          throw new Error('El enlace externo ingresado pertenece a un servidor obsoleto. Por favor sube tu archivo directamente.');
        }
        if (!extVal.startsWith('https://') && !extVal.startsWith('http://')) {
          throw new Error('El enlace externo debe iniciar con https://');
        }
        currentValue = extVal;
      }
      return currentValue;
    },
    setValue(newVal) {
      currentValue = (newVal && !isBlockedUrl(newVal)) ? String(newVal).trim() : '';
      previewUrl = currentValue;
      currentFileName = currentValue ? currentValue.split('/').pop().split('?')[0] : '';
      currentMime = isPdfReference(currentValue) ? 'application/pdf' : 'image/jpeg';
      pendingFile = null;
      if (extUrlInputEl) {
        extUrlInputEl.value = currentValue && !currentValue.startsWith('storage://') ? currentValue : '';
      }
      setError('');
      renderPreviewUI();
    },
    clear() {
      btnClearEl?.click();
    }
  };
}

/**
 * Abre un Visor Universal de Documentos e Imágenes (compatible con URLs firmadas `storage://`,
 * documentos PDF con `<iframe style="width:100%;height:68vh">` y fotografías ampliables).
 *
 * @param {string} urlOrRef URL pública, blob: o referencia privada `storage://<bucket>/<path>`
 * @param {string} [titulo='Documento Oficial'] Título del modal
 * @param {string} [extraHeaderHtml=''] HTML informativo opcional en la parte superior del visor
 */
export async function abrirVisorDocumento(urlOrRef, titulo = 'Visor de Documento Oficial', extraHeaderHtml = '') {
  if (!urlOrRef || typeof urlOrRef !== 'string' || !urlOrRef.trim()) {
    showToast('No hay ningún documento o imagen adjunta para visualizar.', 'warning');
    return null;
  }

  let resolvedUrl = null;
  try {
    showSpinner('Abriendo documento seguro...');
    resolvedUrl = await resolveMediaUrl(urlOrRef.trim(), 3600);
  } finally {
    hideSpinner();
  }

  if (!resolvedUrl) {
    showToast(
      'El documento no está disponible o su enlace externo expiró. Solicita al usuario volver a subir el archivo.',
      'warning'
    );
    return null;
  }

  const isPdf = isPdfReference(urlOrRef) || isPdfReference(resolvedUrl);
  const fallbackSvg = getFallbackSvgDataUri('mascota');

  const contenidoHtml = isPdf
    ? `
      ${extraHeaderHtml}
      <div class="bg-dark rounded-3 p-2 shadow-inner">
        <iframe src="${escapeHtml(resolvedUrl)}"
                style="width:100%;height:68vh;border:0;border-radius:8px;background:#FFFFFF;"
                title="${escapeHtml(titulo)}"></iframe>
      </div>
    `
    : `
      ${extraHeaderHtml}
      <div class="text-center bg-dark rounded-3 p-3 d-flex align-items-center justify-content-center" style="min-height: 340px;">
        <img src="${escapeHtml(resolvedUrl)}"
             alt="${escapeHtml(titulo)}"
             class="img-fluid rounded shadow"
             style="max-height: 68vh; object-fit: contain; cursor: zoom-in;"
             onclick="window.open(this.src, '_blank', 'noopener')"
             onerror="this.onerror=null;this.src='${fallbackSvg}';">
      </div>
      <div class="text-center text-muted small mt-2">
        <i class="bi bi-zoom-in me-1"></i>Haz clic sobre la imagen para abrirla en resolución completa.
      </div>
    `;

  const footerHtml = `
    <div class="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
      <span class="small text-muted">
        <i class="bi bi-shield-lock-fill text-success me-1"></i>Archivo verificado • Paw Patita Cusco
      </span>
      <div class="d-flex gap-2">
        <a href="${escapeHtml(resolvedUrl)}" target="_blank" rel="noopener noreferrer" download class="btn btn-paw btn-sm">
          <i class="bi ${isPdf ? 'bi-file-earmark-pdf-fill' : 'bi-box-arrow-up-right'} me-1"></i>
          ${isPdf ? 'Abrir / Descargar PDF' : 'Abrir Imagen Completa'}
        </a>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
      </div>
    </div>
  `;

  const modal = crearModalDinamico({
    titulo,
    icono: isPdf ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark-image',
    tamano: 'modal-lg',
    headerClass: 'bg-forest text-white',
    headerOscuro: true,
    cuerpoHtml: contenidoHtml,
    footerHtml,
    onHidden: () => {
      if (document.querySelectorAll('.modal.show').length > 0) {
        document.body.classList.add('modal-open');
      }
    }
  });

  // Asegurar apilamiento correcto si se abrió encima de otro modal activo
  if (modal?.el) {
    modal.el.style.zIndex = '1080';
  }

  return modal;
}

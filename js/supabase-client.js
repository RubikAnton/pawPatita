/**
 * Paw Patita Cusco v5.1 — Cliente Supabase Singleton y Motor de Almacenamiento Directo
 * js/supabase-client.js
 *
 * Gestiona la instancia global de Supabase SDK (Auth, PostgREST, Storage y Canales Realtime),
 * compresión client-side de imágenes vía Canvas, subida directa a Supabase Storage (imágenes y PDFs),
 * generación de URLs firmadas para buckets privados y SVGs temáticos de respaldo.
 */

import { ENV, CUSCO_CONFIG } from './config.js';

let supabaseInstance = null;
let realtimeChannels = new Map();

const PRIVATE_BUCKETS = new Set([
  'documentos-verificacion',
  'comprobantes-pago'
]);

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);

const ALLOWED_PDF_MIMES = new Set([
  'application/pdf'
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_BYTES = 10 * 1024 * 1024;  // 10 MB

/**
 * Inicializa y retorna el cliente singleton de Supabase
 */
export function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('Supabase JS SDK no cargado en window.supabase.');
    return null;
  }

  try {
    supabaseInstance = window.supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });

    if (ENV.DEBUG) {
      console.log('🐾 Supabase Client v5.1 inicializado exitosamente.');
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Error al inicializar Supabase Client:', err);
    return null;
  }
}

/**
 * Verifica si las credenciales de Supabase son reales
 */
export function isSupabaseConfigured() {
  return Boolean(
    ENV.SUPABASE_URL &&
    !ENV.SUPABASE_URL.includes('xyzcompany') &&
    ENV.SUPABASE_ANON_KEY &&
    !ENV.SUPABASE_ANON_KEY.includes('dummy_anon_key')
  );
}

const BLOCKED_LEGACY_HOSTS = ['post' + 'img.cc', 'post' + 'images.org'];

/**
 * Verifica si una cadena contiene un dominio de alojamiento externo obsoleto/caído
 * @param {string} url
 * @returns {boolean}
 */
function isBlockedExternalImageHost(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return BLOCKED_LEGACY_HOSTS.some((host) => lower.includes(host));
}

/**
 * Normaliza el nombre del bucket con el esquema real de Supabase Storage
 * @param {string} bucket
 * @returns {string}
 */
function normalizeBucketName(bucket) {
  if (!bucket || bucket === 'mascotas') return 'mascotas-fotos';
  return bucket;
}

/**
 * Infiere el MIME type real de un archivo a partir de file.type o su extensión
 * @param {File|Blob} file
 * @returns {string}
 */
function inferFileMimeType(file) {
  const rawType = (file?.type || '').toLowerCase().trim();
  if (rawType) {
    return rawType === 'image/jpg' ? 'image/jpeg' : rawType;
  }
  const name = (file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * Comprime un archivo de imagen en el navegador usando HTML5 Canvas.
 * Si el archivo es PDF (`application/pdf`) o no es imagen, lo devuelve intacto.
 *
 * @param {File|Blob} file
 * @param {{ maxWidth?: number, quality?: number }} [opts]
 * @returns {Promise<File|Blob>}
 */
export async function compressImageFile(file, { maxWidth = 1600, quality = 0.82 } = {}) {
  if (!file) return file;
  const mimeType = inferFileMimeType(file);

  // Dejar intacto PDF o cualquier archivo que no sea imagen
  if (mimeType === 'application/pdf' || !mimeType.startsWith('image/')) {
    return file;
  }

  // En entornos sin DOM/Canvas devolver archivo intacto
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        let targetWidth = img.naturalWidth || img.width || maxWidth;
        let targetHeight = img.naturalHeight || img.height || maxWidth;

        // Si la imagen es pequeña y ligera (< 350 KB), no recomprimir innecesariamente
        if (targetWidth <= maxWidth && file.size <= 350 * 1024) {
          resolve(file);
          return;
        }

        if (targetWidth > maxWidth) {
          const ratio = maxWidth / targetWidth;
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const outputMime = mimeType === 'image/png' ? 'image/webp' : 'image/jpeg';
        const ext = outputMime === 'image/webp' ? 'webp' : 'jpg';

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
              return;
            }
            const originalName = (file.name || `imagen_${Date.now()}`).replace(/\.[^.]+$/, '');
            const compressedFile = new File([blob], `${originalName}.${ext}`, {
              type: outputMime,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      } catch (_err) {
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Sube un archivo directamente a Supabase Storage validando MIME y tamaño
 * (`<= 5MB` imágenes, `<= 10MB` PDF).
 * Para buckets privados (`documentos-verificacion`, `comprobantes-pago`),
 * retorna `storageRef` en formato `storage://<bucket>/<path>` y `url` temporal firmada.
 *
 * @param {File|Blob} file
 * @param {string} bucket
 * @param {string} [folder='general']
 * @param {{ onProgress?: (pct: number) => void }} [opts]
 * @returns {Promise<{ url: string, storageRef: string, bucket: string, path: string, mimeType: string, origen: 'supabase_storage' }>}
 */
export async function uploadFileToStorage(file, bucket, folder = 'general', { onProgress } = {}) {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo para subir.');
  }

  const targetBucket = normalizeBucketName(bucket);
  const rawMime = inferFileMimeType(file);
  const isImage = ALLOWED_IMAGE_MIMES.has(rawMime);
  const isPdf = ALLOWED_PDF_MIMES.has(rawMime);

  if (!isImage && !isPdf) {
    throw new Error('Formato de archivo no permitido. Sube una imagen (JPG, PNG, WEBP) o un documento PDF.');
  }

  if (isPdf && file.size > MAX_PDF_BYTES) {
    throw new Error('El documento PDF supera el tamaño máximo permitido de 10 MB.');
  }

  if (typeof onProgress === 'function') onProgress(15);

  const processedFile = isImage ? await compressImageFile(file) : file;
  const finalMime = inferFileMimeType(processedFile);

  if (isImage && processedFile.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen supera el tamaño máximo permitido de 5 MB.');
  }

  if (typeof onProgress === 'function') onProgress(45);

  const ext = isPdf
    ? 'pdf'
    : (finalMime === 'image/png' ? 'png' : (finalMime === 'image/webp' ? 'webp' : 'jpg'));

  const cleanFolder = String(folder || 'general')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '_');

  const safeBaseName = String(file.name || 'archivo')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32) || 'archivo';

  const timestamp = Date.now();
  const randomHex = Math.random().toString(36).substring(2, 8);
  const objectPath = `${cleanFolder}/${timestamp}_${randomHex}_${safeBaseName}.${ext}`;

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    throw new Error('El servicio de almacenamiento no está disponible en este momento.');
  }

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .upload(objectPath, processedFile, {
      cacheControl: '3600',
      contentType: finalMime,
      upsert: false
    });

  if (error) {
    throw new Error(`No se pudo subir el archivo: ${error.message}`);
  }

  if (typeof onProgress === 'function') onProgress(85);

  const uploadedPath = data?.path || objectPath;
  const isPrivate = PRIVATE_BUCKETS.has(targetBucket);

  if (isPrivate) {
    const storageRef = `storage://${targetBucket}/${uploadedPath}`;
    let previewUrl = '';
    try {
      const { data: signedData, error: signErr } = await supabase.storage
        .from(targetBucket)
        .createSignedUrl(uploadedPath, 3600);
      if (!signErr && signedData?.signedUrl) {
        previewUrl = signedData.signedUrl;
      }
    } catch (_e) {
      // Si el usuario aún es anónimo durante una postulación, usar ObjectURL local para vista previa
    }
    if (!previewUrl && typeof URL !== 'undefined' && URL.createObjectURL) {
      previewUrl = URL.createObjectURL(processedFile);
    }

    if (typeof onProgress === 'function') onProgress(100);
    return {
      url: previewUrl || storageRef,
      storageRef,
      bucket: targetBucket,
      path: uploadedPath,
      mimeType: finalMime,
      origen: 'supabase_storage'
    };
  }

  const { data: publicData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(uploadedPath);

  const publicUrl = publicData?.publicUrl || '';
  if (typeof onProgress === 'function') onProgress(100);

  return {
    url: publicUrl,
    storageRef: publicUrl,
    bucket: targetBucket,
    path: uploadedPath,
    mimeType: finalMime,
    origen: 'supabase_storage'
  };
}

/**
 * Resuelve una referencia `storage://<bucket>/<path>` o URL pública.
 * - Si comienza con `storage://`, genera una URL firmada temporal vía `createSignedUrl()`.
 * - Si contiene dominios externos obsoletos/caídos, retorna `null`.
 *
 * @param {string} urlOrRef
 * @param {number} [expiresIn=3600]
 * @returns {Promise<string|null>}
 */
export async function resolveMediaUrl(urlOrRef, expiresIn = 3600) {
  if (!urlOrRef || typeof urlOrRef !== 'string') return null;
  const trimmed = urlOrRef.trim();
  if (!trimmed) return null;

  if (isBlockedExternalImageHost(trimmed)) {
    return null;
  }

  // Referencia de bucket privado storage://<bucket>/<path>
  if (trimmed.startsWith('storage://')) {
    const withoutScheme = trimmed.slice('storage://'.length);
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx <= 0) return null;

    const bucket = normalizeBucketName(withoutScheme.slice(0, slashIdx));
    const objectPath = withoutScheme.slice(slashIdx + 1);
    if (!objectPath) return null;

    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, expiresIn);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
      if (!PRIVATE_BUCKETS.has(bucket)) {
        const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        return pubData?.publicUrl || null;
      }
    } catch (err) {
      console.warn('No se pudo firmar URL de almacenamiento:', err);
    }
    return null;
  }

  // Compatibilidad con registros antiguos que guardaron URL pública de un bucket privado
  const privateUrlMatch = /\/storage\/v1\/object\/public\/(documentos-verificacion|comprobantes-pago)\/(.+)$/i.exec(trimmed);
  if (privateUrlMatch) {
    const bucket = privateUrlMatch[1];
    const objectPath = decodeURIComponent(privateUrlMatch[2]);
    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(objectPath, expiresIn);
        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (_e) {
        // Ignorar
      }
    }
  }

  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  return null;
}

/**
 * Retorna un Data URI SVG cálido temático andino de respaldo ("Andes & Huellas Cusco")
 * @param {'clinica'|'mascota'|'avatar'|'hogar'} [tipo='mascota']
 * @returns {string}
 */
export function getFallbackSvgDataUri(tipo = 'mascota') {
  const configs = {
    clinica: {
      bg1: '#1E5631',
      bg2: '#143D23',
      accent: '#D99B26',
      title: 'Clínica Aliada Cusco',
      iconSvg: `
        <rect x="172" y="72" width="56" height="56" rx="14" fill="#FAF7F2" opacity="0.95"/>
        <rect x="193" y="84" width="14" height="32" rx="3" fill="#E85D24"/>
        <rect x="184" y="93" width="32" height="14" rx="3" fill="#E85D24"/>
      `
    },
    mascota: {
      bg1: '#FAF7F2',
      bg2: '#F3EDE2',
      accent: '#E85D24',
      title: 'Mascota PAW-ID Cusco',
      iconSvg: `
        <circle cx="200" cy="108" r="22" fill="#E85D24" opacity="0.9"/>
        <circle cx="174" cy="84" r="9" fill="#D99B26"/>
        <circle cx="191" cy="74" r="9" fill="#D99B26"/>
        <circle cx="209" cy="74" r="9" fill="#D99B26"/>
        <circle cx="226" cy="84" r="9" fill="#D99B26"/>
      `
    },
    avatar: {
      bg1: '#F3EDE2',
      bg2: '#E7DDD0',
      accent: '#1E5631',
      title: 'Comunidad Paw Patita',
      iconSvg: `
        <circle cx="200" cy="88" r="20" fill="#1E5631" opacity="0.9"/>
        <path d="M164 134 C164 114, 236 114, 236 134" fill="#E85D24" opacity="0.88"/>
      `
    },
    hogar: {
      bg1: '#FAF7F2',
      bg2: '#FDEBD0',
      accent: '#E85D24',
      title: 'Hogar Anfitrión Cusco',
      iconSvg: `
        <polygon points="200,66 160,98 240,98" fill="#E85D24"/>
        <rect x="170" y="98" width="60" height="38" rx="6" fill="#1E5631"/>
        <rect x="192" y="110" width="16" height="26" rx="3" fill="#D99B26"/>
      `
    }
  };

  const cfg = configs[tipo] || configs.mascota;
  const isDark = tipo === 'clinica';
  const textColor = isDark ? '#FAF7F2' : '#111827';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${cfg.bg1}"/>
        <stop offset="100%" stop-color="${cfg.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="220" fill="url(#g)"/>
    <polygon points="0,220 95,135 175,185 265,120 400,220" fill="${cfg.accent}" opacity="0.14"/>
    <rect y="0" width="400" height="6" fill="${cfg.accent}"/>
    ${cfg.iconSvg}
    <text x="200" y="174" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="700" fill="${textColor}">${cfg.title}</text>
    <text x="200" y="194" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${textColor}" opacity="0.75">Andes &amp; Huellas • Cusco</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Función Híbrida de Almacenamiento (retrocompatible):
 * - Si recibe un archivo (File / Blob), lo comprime y sube al bucket de Supabase Storage.
 * - Si recibe un string URL o storage://, lo valida, rechaza hosts rotos y retorna origen 'supabase_storage' o 'externo'.
 *
 * @param {File|string} fileOrUrl
 * @param {string} bucketName
 * @param {string} customFolderOrName
 * @returns {Promise<{ url: string, storageRef?: string, origen: 'supabase_storage'|'externo', error: any }>}
 */
export async function uploadOrResolveMedia(
  fileOrUrl,
  bucketName = CUSCO_CONFIG.STORAGE_BUCKETS.MASCOTAS,
  customFolderOrName = 'general'
) {
  if (!fileOrUrl) {
    return { url: '', origen: 'externo', error: 'No se proporcionó ningún archivo ni enlace.' };
  }

  if (typeof fileOrUrl === 'string') {
    const trimmed = fileOrUrl.trim();
    if (isBlockedExternalImageHost(trimmed)) {
      return {
        url: '',
        origen: 'externo',
        error: 'El enlace externo proporcionado pertenece a un servidor de imágenes no soportado. Por favor sube el archivo directamente.'
      };
    }
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:') &&
      !trimmed.startsWith('storage://')
    ) {
      return { url: '', origen: 'externo', error: 'El enlace proporcionado no tiene un formato web válido.' };
    }
    const origen =
      trimmed.startsWith('storage://') || trimmed.includes('supabase.co')
        ? 'supabase_storage'
        : 'externo';
    return { url: trimmed, storageRef: trimmed, origen, error: null };
  }

  try {
    const folder = customFolderOrName
      ? String(customFolderOrName).replace(/[^a-zA-Z0-9/_-]/g, '_')
      : 'general';
    const uploaded = await uploadFileToStorage(fileOrUrl, bucketName, folder);
    return {
      url: uploaded.storageRef || uploaded.url,
      previewUrl: uploaded.url,
      storageRef: uploaded.storageRef,
      origen: 'supabase_storage',
      error: null
    };
  } catch (err) {
    console.error('Error en uploadOrResolveMedia:', err);
    return {
      url: '',
      origen: 'supabase_storage',
      error: err.message || 'No se pudo subir el archivo en este momento.'
    };
  }
}

/**
 * Suscripción Reactiva a Canales Supabase Realtime
 * @param {string} channelName
 * @param {string} table
 * @param {string} event ('INSERT' | 'UPDATE' | 'DELETE' | '*')
 * @param {function} callback
 * @param {string} filter
 */
export function subscribeRealtime(channelName, table, event, callback, filter = null) {
  const supabase = getSupabase();
  if (!supabase) return null;

  if (realtimeChannels.has(channelName)) {
    unsubscribeRealtime(channelName);
  }

  const channelConfig = {
    event: event,
    schema: 'public',
    table: table
  };

  if (filter) {
    channelConfig.filter = filter;
  }

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', channelConfig, (payload) => {
      if (ENV.DEBUG) {
        console.log(`[Realtime ${channelName}] Evento recibido:`, payload);
      }
      callback(payload);
    })
    .subscribe((status) => {
      if (ENV.DEBUG) {
        console.log(`[Realtime ${channelName}] Estado:`, status);
      }
    });

  realtimeChannels.set(channelName, channel);
  return channel;
}

/**
 * Desuscribir un canal Realtime específico
 */
export function unsubscribeRealtime(channelName) {
  const channel = realtimeChannels.get(channelName);
  if (channel) {
    const supabase = getSupabase();
    if (supabase) {
      supabase.removeChannel(channel);
    }
    realtimeChannels.delete(channelName);
  }
}

/**
 * Limpiar todas las suscripciones Realtime activas
 */
export function clearAllRealtimeSubscriptions() {
  realtimeChannels.forEach((_channel, name) => {
    unsubscribeRealtime(name);
  });
  realtimeChannels.clear();
}

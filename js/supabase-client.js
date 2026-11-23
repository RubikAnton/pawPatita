/**
 * Paw Patita Cusco v5.0 — Cliente Supabase Singleton
 * js/supabase-client.js
 * 
 * Gestiona la instancia global de Supabase SDK (Auth, PostgREST, Storage y Canales Realtime),
 * con fallback de compresión de imágenes y subida a Supabase Storage O enlaces PostImg.
 */

import { ENV, CUSCO_CONFIG } from './config.js';

let supabaseInstance = null;
let realtimeChannels = new Map();

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
      console.log('🐾 Supabase Client inicializado exitosamente.');
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Error al inicializar Supabase Client:', err);
    return null;
  }
}

/**
 * Verifica si las credenciales de Supabase son placeholders
 */
export function isSupabaseConfigured() {
  return (
    ENV.SUPABASE_URL &&
    !ENV.SUPABASE_URL.includes('xyzcompany') &&
    ENV.SUPABASE_ANON_KEY &&
    !ENV.SUPABASE_ANON_KEY.includes('dummy_anon_key')
  );
}

/**
 * Función Híbrida de Almacenamiento:
 * - Si recibe un archivo (File / Blob), lo comprime si es necesario y lo sube al bucket de Supabase Storage.
 * - Si recibe un string URL (ej. PostImg, Imgur o Supabase), lo valida y lo retorna directamente.
 * 
 * @param {File|string} fileOrUrl 
 * @param {string} bucketName ('mascotas' | 'muro-fotos' | 'perfiles' | 'documentos-verificacion')
 * @param {string} customFileName 
 * @returns {Promise<{ url: string, origen: 'storage'|'postimg'|'externo', error: any }>}
 */
export async function uploadOrResolveMedia(fileOrUrl, bucketName = CUSCO_CONFIG.STORAGE_BUCKETS.MASCOTAS, customFileName = null) {
  if (!fileOrUrl) {
    return { url: '', origen: 'externo', error: 'No se proveyó ningún archivo ni URL' };
  }

  // 1. Si ya es una URL en texto (PostImg, HTTPS externo o Storage ya subido)
  if (typeof fileOrUrl === 'string') {
    const trimmed = fileOrUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:')) {
      return { url: '', origen: 'externo', error: 'La URL provista no es un enlace web válido' };
    }
    const origen = trimmed.includes('postimg') ? 'postimg' : (trimmed.includes('supabase.co') ? 'storage' : 'externo');
    return { url: trimmed, origen, error: null };
  }

  // 2. Si es un archivo File / Blob para subir a Supabase Storage
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      url: '',
      origen: 'storage',
      error: 'Supabase no está configurado con credenciales válidas. Puedes ingresar una URL directa de PostImg mientras tanto.'
    };
  }

  try {
    const ext = fileOrUrl.name ? fileOrUrl.name.split('.').pop().toLowerCase() : 'jpg';
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const fileName = customFileName ? `${customFileName}.${ext}` : `${timestamp}_${randomHex}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileOrUrl, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn(`Fallo al subir a bucket '${bucketName}':`, error.message);
      return { url: '', origen: 'storage', error: error.message };
    }

    // Obtener URL pública
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return { url: publicData.publicUrl, origen: 'storage', error: null };
  } catch (err) {
    console.error('Excepción en uploadOrResolveMedia:', err);
    return { url: '', origen: 'storage', error: err.message };
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

  // Evitar suscripciones duplicadas con el mismo nombre
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
  realtimeChannels.forEach((channel, name) => {
    unsubscribeRealtime(name);
  });
  realtimeChannels.clear();
}

/**
 * Paw Patita Cusco v5.1 — Motor Bilingüe de Internacionalización (ES / EN)
 * js/i18n.js
 * 
 * Gestiona el idioma activo ('ES' | 'EN'), almacenamiento local y diccionario
 * exhaustivo para vistas públicas, navbar, footer, modales de autenticación,
 * catálogo, ficha PAW-ID y componentes principales.
 */

const STORAGE_KEY = 'paw_lang';

const DICTIONARY = {
  ES: {
    // NAVBAR
    'nav.inicio': 'Inicio',
    'nav.cuidadores': 'Cuidadores',
    'nav.mi_panel': 'Mi Panel',
    'nav.notificaciones': 'Notificaciones en Vivo',
    'nav.no_notif': 'No tienes notificaciones pendientes.',
    'nav.login': 'Iniciar Sesión',
    'nav.registro': 'Registrarme',
    'nav.cerrar_sesion': 'Cerrar Sesión',

    // FOOTER
    'footer.desc': 'Plataforma digital para el cuidado ético y familiar de mascotas en la Capital Histórica del Perú. Identidad médica digital PAW-ID y red veterinaria de urgencias 24h.',
    'footer.distritos': 'Cusco Centro, Wanchaq, San Sebastián, San Jerónimo, San Blas',
    'footer.para_mascotas': 'Para Mascotas',
    'footer.buscar_cuidador': 'Buscar Cuidador',
    'footer.carne_digital': 'Carné Digital PAW-ID',
    'footer.registro_propietario': 'Registro Propietario',
    'footer.unete_red': 'Únete a la Red',
    'footer.postular_cuidador': 'Postular como Cuidador',
    'footer.postular_clinica': 'Postular Clínica Veterinaria',
    'footer.acceso_panel': 'Acceso a Mi Panel',
    'footer.soporte_emergencias': 'Soporte & Emergencias',
    'footer.soporte_desc': 'En caso de urgencia médica en Cusco, nuestras clínicas aliadas atienden las 24 horas del día.',
    'footer.central_sos': 'Central SOS Cusco 24h',
    'footer.derechos': '© 2026 Paw Patita Cusco v5.1. Todos los derechos reservados.',
    'legal.terminos_link': 'Términos de Servicio v5.1',
    'legal.privacidad_link': 'Políticas de Privacidad Cusco',
    'legal.declaracion_link': 'Declaración Jurada',

    // AUTH & MODALES
    'auth.login_title': 'Iniciar Sesión en Paw Patita',
    'auth.demo_title': 'Accesos Demo Rápidos (4 Roles Activos)',
    'auth.demo_pass': 'Clave: PawPatita2026!',
    'auth.demo_prop': '🐾 Propietario',
    'auth.demo_prop_desc': 'Lucía Mendoza (Local/Turista)',
    'auth.demo_cuid': '🏡 Cuidadora Aprobada',
    'auth.demo_cuid_desc': 'Valeria Huamán (Wanchaq)',
    'auth.demo_vet': '🏥 Clínica Veterinaria',
    'auth.demo_vet_desc': 'Dra. Claudia Salazar (24 Horas)',
    'auth.demo_admin': '🛡️ Administrador',
    'auth.demo_admin_desc': 'Comisión 15% & Arbitraje',
    'auth.or_email': 'O ingresa con tu correo',
    'auth.email_label': 'Correo Electrónico',
    'auth.password_label': 'Contraseña',
    'auth.forgot_password': '¿Olvidaste tu contraseña?',
    'auth.btn_login': 'Ingresar a mi Panel',
    'auth.no_account': '¿No tienes una cuenta aún?',
    'auth.register_free': 'Regístrate como Propietario',

    // REGISTRO PROPIETARIO
    'reg_prop.title': 'Registro de Propietario de Mascotas',
    'reg_prop.subtitle': 'Crea tu cuenta para registrar tus mascotas con carné PAW-ID y reservar cuidadores verificados en Cusco.',
    'reg_prop.btn_submit': 'Completar Registro y Crear Carné PAW-ID',

    // POSTULACIONES
    'post_cuid.title': 'Postulación como Cuidador Independiente',
    'post_cuid.subtitle': 'Únete a la red más confiable de cuidadores en Cusco. Recibe el 85% neto de cada servicio con respaldo veterinario 24h.',
    'post_cuid.btn_submit': 'Enviar Postulación de Cuidador',
    'post_vet.title': 'Afiliación de Clínica Veterinaria 24h',
    'post_vet.subtitle': 'Sé parte de la red médica oficial de atención de urgencias y validación sanitaria PAW-ID en Cusco.',
    'post_vet.btn_submit': 'Enviar Solicitud de Afiliación',

    // LANDING PAGE
    'landing.badge_red': 'Red de Cuidado Familiar & Central S.O.S. en Cusco',
    'landing.hero_title': 'Cuidado Familiar y Amor Real para tu Mascota en Cusco',
    'landing.hero_lead': 'Conectamos a cuidadores independientes verificados con propietarios locales y turistas. Con carné digital PAW-ID, cobertura de emergencias con clínicas aliadas 24h y fotos en vivo durante todo el servicio.',
    'landing.btn_catalogo': 'Explorar Catálogo de Cuidadores',
    'landing.btn_postular_cuid': 'Postular como Cuidador',
    'landing.btn_afiliar_clinica': 'Afiliar Clínica Veterinaria',
    'landing.trust_police': 'Antecedentes Policiales Verificados',
    'landing.trust_pawid': 'Carné PAW-ID Escaneable',
    'landing.trust_vets': 'Red Médica 24h en Cusco',
    'landing.trust_escrow': 'Pago Protegido en Garantía (15% / 85%)',
    'landing.stats_verified': 'Cuidadores Verificados',
    'landing.stats_districts': 'Cusco Centro a San Jerónimo',
    'landing.stats_sos': 'Central S.O.S. en Vivo',
    'landing.stats_commission': 'Comisión Justa y Transparente',
    'landing.value_title': 'Diseñado para la Realidad Única de Cusco',
    'landing.value_lead': 'Ya sea que vivas en Wanchaq o estés visitando Machu Picchu y el Valle Sagrado, garantizamos la mejor experiencia de cuidado ético.',
    'landing.local_badge': 'Para Familias Cusqueñas',
    'landing.local_title': 'Cuidado Cercano y Familiar',
    'landing.tourist_badge': 'Para Viajeros y Turistas',
    'landing.tourist_title': 'Disfruta Cusco sin Preocupaciones',
    'landing.pawid_badge': 'Tecnología & Seguridad',
    'landing.pawid_title': 'Carné Digital PAW-ID y Central S.O.S. en Tiempo Real',
    'landing.pawid_desc': 'Cada mascota registrada en Paw Patita cuenta con su identificador único PAW-XXXX y un carné con código QR. Si tu mascota se extravía o sufre un accidente, cualquier veterinaria o transeúnte puede escanear el carné y contactarte de inmediato sin exponer tus datos privados.',
    'landing.qr_title': 'Escaneo QR Inmediato',
    'landing.qr_desc': 'Ruta pública segura por código QR con foto, raza, alergias y botón directo a WhatsApp.',
    'landing.sos_title': 'Derivación S.O.S. a la Clínica más Cercana',
    'landing.sos_desc': 'Geolocalización automática de clínicas 24h activas en Cusco para atención médica urgente.',
    'landing.vets_badge': 'Red de Urgencias Cusco',
    'landing.vets_title': 'Clínicas Veterinarias Aliadas',
    'landing.vets_subtitle': 'Nuestra red oficial de atención médica presencial y emergencias S.O.S. en Cusco.',
    'landing.cta_title': '¿Listo para encontrar al cuidador ideal para tu mascota?',
    'landing.cta_lead': 'Explora los perfiles aprobados en tu distrito o postula hoy para unirte a la red de cuidadores más confiable de Cusco.',
    'landing.cta_btn_catalogo': 'Ver Catálogo Completo',
    'landing.cta_btn_register': 'Crear Cuenta de Propietario',

    // CATÁLOGO
    'catalogo.title': 'Catálogo de Cuidadores Verificados en Cusco',
    'catalogo.subtitle': 'Filtra por distrito, tipo de servicio, rango de tarifa y disponibilidad en tiempo real.',
    'catalogo.btn_mapa_ver': 'Ver Mapa Interactivo de Cusco',
    'catalogo.btn_mapa_ocultar': 'Ocultar Mapa',
    'catalogo.filtro_distrito': 'Distrito en Cusco',
    'catalogo.filtro_servicio': 'Tipo de Servicio',
    'catalogo.filtro_tamano': 'Tamaño de Mascota',
    'catalogo.filtro_orden': 'Ordenar Por',
    'catalogo.todos_distritos': 'Todos los Distritos',
    'catalogo.todos_servicios': 'Todos los Servicios',
    'catalogo.sin_resultados': 'No se encontraron cuidadores con los criterios seleccionados.',
    'catalogo.ver_perfil': 'Ver Perfil y Reseñas',
    'catalogo.reservar': 'Reservar con Garantía',

    // PAW-ID PÚBLICO
    'paw_id.banner_title': '¿Encontraste a esta mascota?',
    'paw_id.banner_subtitle': 'Comunícate de inmediato con su dueño o con el contacto de auxilio.',
    'paw_id.btn_wa': 'Escribir por WhatsApp al Propietario',
    'paw_id.btn_tel': 'Llamar al Propietario',
    'paw_id.validado': 'Sanitariamente Validado',
    'paw_id.pendiente': 'Pendiente de Validación',

    // GENERAL
    'common.cerrar': 'Cerrar',
    'common.guardar': 'Guardar',
    'common.cancelar': 'Cancelar',
    'common.enviar': 'Enviar',
    'common.cargando': 'Procesando solicitud segura...',
    'common.moneda_cambiada': 'Moneda cambiada a {val}',
    'common.idioma_cambiado': 'Idioma cambiado a Español'
  },

  EN: {
    // NAVBAR
    'nav.inicio': 'Home',
    'nav.cuidadores': 'Pet Sitters',
    'nav.mi_panel': 'My Dashboard',
    'nav.notificaciones': 'Live Notifications',
    'nav.no_notif': 'No pending notifications.',
    'nav.login': 'Log In',
    'nav.registro': 'Register',
    'nav.cerrar_sesion': 'Log Out',

    // FOOTER
    'footer.desc': 'Digital platform for ethical and family pet care in the Historic Capital of Peru. Digital medical PAW-ID and 24/7 emergency veterinary network.',
    'footer.distritos': 'Cusco Downtown, Wanchaq, San Sebastián, San Jerónimo, San Blas',
    'footer.para_mascotas': 'For Pets',
    'footer.buscar_cuidador': 'Find Pet Sitter',
    'footer.carne_digital': 'PAW-ID Digital Card',
    'footer.registro_propietario': 'Pet Owner Registration',
    'footer.unete_red': 'Join the Network',
    'footer.postular_cuidador': 'Apply as Pet Sitter',
    'footer.postular_clinica': 'Register Vet Clinic',
    'footer.acceso_panel': 'Access My Dashboard',
    'footer.soporte_emergencias': 'Support & Emergencies',
    'footer.soporte_desc': 'In case of medical emergency in Cusco, our allied clinics operate 24 hours a day.',
    'footer.central_sos': 'Cusco 24/7 SOS Center',
    'footer.derechos': '© 2026 Paw Patita Cusco v5.1. All rights reserved.',
    'legal.terminos_link': 'Terms of Service v5.1',
    'legal.privacidad_link': 'Cusco Privacy Policy',
    'legal.declaracion_link': 'Sworn Affidavit',

    // AUTH & MODALES
    'auth.login_title': 'Log In to Paw Patita',
    'auth.demo_title': 'Quick Demo Access (4 Active Roles)',
    'auth.demo_pass': 'Password: PawPatita2026!',
    'auth.demo_prop': '🐾 Pet Owner',
    'auth.demo_prop_desc': 'Lucía Mendoza (Local/Tourist)',
    'auth.demo_cuid': '🏡 Approved Pet Sitter',
    'auth.demo_cuid_desc': 'Valeria Huamán (Wanchaq)',
    'auth.demo_vet': '🏥 Veterinary Clinic',
    'auth.demo_vet_desc': 'Dr. Claudia Salazar (24 Hours)',
    'auth.demo_admin': '🛡️ Administrator',
    'auth.demo_admin_desc': '15% Commission & Arbitration',
    'auth.or_email': 'Or sign in with your email',
    'auth.email_label': 'Email Address',
    'auth.password_label': 'Password',
    'auth.forgot_password': 'Forgot your password?',
    'auth.btn_login': 'Sign In to Dashboard',
    'auth.no_account': "Don't have an account yet?",
    'auth.register_free': 'Register as Pet Owner',

    // REGISTRO PROPIETARIO
    'reg_prop.title': 'Pet Owner Registration',
    'reg_prop.subtitle': 'Create your account to register pets with PAW-ID card and book verified sitters in Cusco.',
    'reg_prop.btn_submit': 'Complete Registration & Create PAW-ID',

    // POSTULACIONES
    'post_cuid.title': 'Independent Pet Sitter Application',
    'post_cuid.subtitle': 'Join Cusco’s most reliable pet care network. Earn 85% net of every booking with 24/7 vet emergency backup.',
    'post_cuid.btn_submit': 'Submit Sitter Application',
    'post_vet.title': '24/7 Veterinary Clinic Affiliation',
    'post_vet.subtitle': 'Become an official medical emergency and PAW-ID health validation center in Cusco.',
    'post_vet.btn_submit': 'Submit Affiliation Request',

    // LANDING PAGE
    'landing.badge_red': 'Family Care Network & 24/7 SOS Center in Cusco',
    'landing.hero_title': 'Family Pet Care & Real Love for Your Pet in Cusco',
    'landing.hero_lead': 'We connect verified independent pet sitters with local pet owners and travelers. Featuring digital PAW-ID card, 24/7 emergency clinic network and live photo updates.',
    'landing.btn_catalogo': 'Explore Pet Sitters Catalog',
    'landing.btn_postular_cuid': 'Apply as Pet Sitter',
    'landing.btn_afiliar_clinica': 'Register Vet Clinic',
    'landing.trust_police': 'Police Background Verified',
    'landing.trust_pawid': 'Scannable PAW-ID Card',
    'landing.trust_vets': '24/7 Cusco Medical Network',
    'landing.trust_escrow': 'Protected Escrow Payment (15% / 85%)',
    'landing.stats_verified': 'Verified Pet Sitters',
    'landing.stats_districts': 'Cusco Center to San Jerónimo',
    'landing.stats_sos': 'Live 24/7 SOS Center',
    'landing.stats_commission': 'Fair & Transparent 15%',
    'landing.value_title': 'Designed for the Unique Reality of Cusco',
    'landing.value_lead': 'Whether you live in Wanchaq or are visiting Machu Picchu and the Sacred Valley, we guarantee ethical, top-quality care.',
    'landing.local_badge': 'For Cusco Families',
    'landing.local_title': 'Close & Loving Family Care',
    'landing.tourist_badge': 'For Travelers & Tourists',
    'landing.tourist_title': 'Enjoy Cusco Worry-Free',
    'landing.pawid_badge': 'Technology & Safety',
    'landing.pawid_title': 'Digital PAW-ID Card & Real-Time SOS Center',
    'landing.pawid_desc': 'Every pet registered on Paw Patita receives a unique PAW-XXXX code and QR card. If lost or facing an emergency, anyone can scan it to reach you directly without exposing your private data.',
    'landing.qr_title': 'Immediate QR Scan',
    'landing.qr_desc': 'Direct access via QR code with pet photo, breed, allergies and direct WhatsApp contact.',
    'landing.sos_title': 'S.O.S. Dispatch to Closest Clinic',
    'landing.sos_desc': 'Automatic routing to active 24/7 clinics in Cusco for immediate veterinary attention.',
    'landing.vets_badge': 'Cusco Emergency Network',
    'landing.vets_title': 'Allied Veterinary Clinics',
    'landing.vets_subtitle': 'Our official network for in-person medical care and 24/7 S.O.S. emergencies in Cusco.',
    'landing.cta_title': 'Ready to find the perfect caregiver for your pet?',
    'landing.cta_lead': 'Explore approved sitters in your district or apply today to join Cusco’s most trusted network.',
    'landing.cta_btn_catalogo': 'View Full Catalog',
    'landing.cta_btn_register': 'Create Pet Owner Account',

    // CATÁLOGO
    'catalogo.title': 'Verified Pet Sitters in Cusco',
    'catalogo.subtitle': 'Filter by district, service type, price range, and real-time availability.',
    'catalogo.btn_mapa_ver': 'View Interactive Cusco Map',
    'catalogo.btn_mapa_ocultar': 'Hide Map',
    'catalogo.filtro_distrito': 'District in Cusco',
    'catalogo.filtro_servicio': 'Service Type',
    'catalogo.filtro_tamano': 'Pet Size',
    'catalogo.filtro_orden': 'Sort By',
    'catalogo.todos_distritos': 'All Districts',
    'catalogo.todos_servicios': 'All Services',
    'catalogo.sin_resultados': 'No pet sitters found matching your filters.',
    'catalogo.ver_perfil': 'View Profile & Reviews',
    'catalogo.reservar': 'Book with Guarantee',

    // PAW-ID PÚBLICO
    'paw_id.banner_title': 'Did you find this pet?',
    'paw_id.banner_subtitle': 'Contact the owner or emergency contact immediately.',
    'paw_id.btn_wa': 'Send WhatsApp to Pet Owner',
    'paw_id.btn_tel': 'Call Pet Owner',
    'paw_id.validado': 'Health Validated',
    'paw_id.pendiente': 'Pending Validation',

    // GENERAL
    'common.cerrar': 'Close',
    'common.guardar': 'Save',
    'common.cancelar': 'Cancel',
    'common.enviar': 'Send',
    'common.cargando': 'Processing secure request...',
    'common.moneda_cambiada': 'Currency changed to {val}',
    'common.idioma_cambiado': 'Language switched to English'
  }
};

/**
 * Obtiene el idioma actualmente configurado ('ES' o 'EN')
 * @returns {'ES' | 'EN'}
 */
export function getCurrentLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return (saved === 'EN') ? 'EN' : 'ES';
}

/**
 * Establece el nuevo idioma activo en localStorage y actualiza el atributo lang del HTML
 * @param {'ES' | 'EN'} lang 
 */
export function setLanguage(lang) {
  const validLang = (lang === 'EN') ? 'EN' : 'ES';
  localStorage.setItem(STORAGE_KEY, validLang);
  document.documentElement.lang = validLang.toLowerCase();
  return validLang;
}

/**
 * Traduce una clave al idioma activo con interpolación de variables opcional
 * @param {string} key 
 * @param {Record<string, string>} [vars] 
 * @returns {string}
 */
export function t(key, vars = {}) {
  const lang = getCurrentLang();
  const dict = DICTIONARY[lang] || DICTIONARY.ES;
  let text = dict[key] || DICTIONARY.ES[key] || key;

  // Interpolación de variables {nombre}
  if (vars && typeof vars === 'object') {
    Object.keys(vars).forEach((varKey) => {
      text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), vars[varKey]);
    });
  }

  return text;
}

/**
 * Aplica traducciones en todo el subárbol DOM indicado usando selectores data-i18n
 * @param {HTMLElement | Document} [root=document] 
 */
export function applyTranslations(root = document) {
  if (!root) return;

  // 1. Textos simples: data-i18n="clave"
  const elements = root.querySelectorAll('[data-i18n]');
  elements.forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = t(key);
      } else {
        el.textContent = t(key);
      }
    }
  });

  // 2. Placeholders: data-i18n-placeholder="clave"
  const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  // 3. Titles / Tooltips: data-i18n-title="clave"
  const titles = root.querySelectorAll('[data-i18n-title]');
  titles.forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
    }
  });

  // 4. Aria Labels: data-i18n-aria-label="clave"
  const arias = root.querySelectorAll('[data-i18n-aria-label]');
  arias.forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) {
      el.setAttribute('aria-label', t(key));
    }
  });
}

/**
 * Paw Patita Cusco v5.2 — Motor Central de Validación Estricta en Tiempo Real y Envío
 * js/utils/validators.js
 *
 * Heurísticas Nielsen H4 (Consistencia), H5 (Prevención de Errores),
 * H9 (Diagnóstico y Recuperación de Errores) y H10 (Guías de Campo).
 *
 * Reglas centralizadas y bilingües (ES / EN):
 *  - Teléfonos Perú (^9\d{8}$) e Internacionales turistas (^\+[1-9]\d{7,14}$)
 *  - Documentos: DNI (8 dígitos), CE (9–12 alfanum.), Pasaporte (6–12 alfanum.), RUC (11 dígitos)
 *  - Email estricto (^[^\s@]+@[^\s@]+\.[^\s@]{2,}$)
 *  - Nombres/Apellidos sin dígitos numéricos (>= 2 letras reales)
 *  - Cuentas de cobro (Yape/Plin ^9\d{8}$, CCI ^\d{20}$, Bancos >= 10 dígitos)
 *  - Tarjeta últimos 4 dígitos (^\d{4}$), código operación (^[A-Za-z0-9-]{6,30}$)
 *  - Rangos numéricos, fechas pasadas/vigentes, contraseñas (>= 8) y confirmación
 *  - Checkboxes obligatorios de Términos y Condiciones / Declaración Jurada
 */

import { t } from '../i18n.js';
import { showToast } from './ui-helpers.js';

export const REGEX_PHONE_PE = /^9\d{8}$/;
export const REGEX_PHONE_INTL = /^\+[1-9]\d{7,14}$/;
export const REGEX_DNI = /^\d{8}$/;
export const REGEX_CE = /^[A-Za-z0-9]{9,12}$/;
export const REGEX_PASAPORTE = /^[A-Za-z0-9]{6,12}$/;
export const REGEX_RUC = /^(10|15|17|20)\d{9}$/;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const REGEX_CARD_LAST4 = /^\d{4}$/;
export const REGEX_OPERATION_CODE = /^[A-Za-z0-9-]{6,30}$/;
export const REGEX_CCI = /^\d{20}$/;
export const REGEX_CMVP = /^[A-Za-z0-9-]{4,25}$/;

/* ==========================================================================
   1. SANITIZADORES EN TIEMPO REAL (EVENTO `input`)
   ========================================================================== */

/**
 * Permite únicamente dígitos y opcionalmente '+' estrictamente en posición 0
 */
export function sanitizePhone(value = '') {
  const str = String(value ?? '');
  const hasLeadingPlus = str.trimStart().startsWith('+');
  const digits = str.replace(/\D/g, '').slice(0, hasLeadingPlus ? 15 : 9);
  return hasLeadingPlus ? `+${digits}` : digits;
}

/**
 * Permite únicamente dígitos numéricos con límite opcional de longitud
 */
export function sanitizeDigits(value = '', maxLen = 20) {
  return String(value ?? '').replace(/\D/g, '').slice(0, maxLen);
}

/**
 * Permite únicamente caracteres alfanuméricos en mayúsculas (CE / Pasaporte)
 */
export function sanitizeAlnum(value = '', maxLen = 12) {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, maxLen);
}

/**
 * Bloquea dígitos numéricos en nombres y apellidos de personas
 */
export function sanitizePersonName(value = '') {
  return String(value ?? '').replace(/\d/g, '');
}

/**
 * Permite únicamente letras, números y guiones en códigos de operación / CMVP
 */
export function sanitizeOperationCode(value = '', maxLen = 30) {
  return String(value ?? '').replace(/[^A-Za-z0-9-]/g, '').slice(0, maxLen);
}

/**
 * Permite dígitos y guiones para cuentas bancarias (BCP, Interbank, BBVA)
 */
export function sanitizeBankNumber(value = '', maxLen = 24) {
  return String(value ?? '').replace(/[^0-9-]/g, '').slice(0, maxLen);
}

/**
 * Elimina espacios en correos electrónicos
 */
export function sanitizeEmail(value = '') {
  return String(value ?? '').replace(/\s+/g, '');
}

/* ==========================================================================
   2. VALIDADORES PUROS REUTILIZABLES (RETORNAN { valid, message })
   ========================================================================== */

export function validatePhone(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  // Rechazar de inmediato cualquier letra o símbolo inválido
  if (!/^[+\d\s-]+$/.test(raw)) {
    return { valid: false, message: t('validators.phone') };
  }
  const compact = raw.replace(/[\s-]+/g, '');
  if (compact.indexOf('+', 1) !== -1) {
    return { valid: false, message: t('validators.phone') };
  }
  if (REGEX_PHONE_PE.test(compact) || REGEX_PHONE_INTL.test(compact)) {
    return { valid: true, message: '' };
  }
  return { valid: false, message: t('validators.phone') };
}

export function validateDocument(docType, value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  const typeNorm = String(docType || 'DNI').toUpperCase();
  if (typeNorm === 'DNI') {
    return REGEX_DNI.test(raw)
      ? { valid: true, message: '' }
      : { valid: false, message: t('validators.dni') };
  }
  if (typeNorm === 'CE') {
    return REGEX_CE.test(raw)
      ? { valid: true, message: '' }
      : { valid: false, message: t('validators.ce') };
  }
  if (typeNorm === 'PASAPORTE' || typeNorm === 'PASSPORT') {
    return REGEX_PASAPORTE.test(raw)
      ? { valid: true, message: '' }
      : { valid: false, message: t('validators.pasaporte') };
  }
  if (typeNorm === 'RUC') {
    return REGEX_RUC.test(raw)
      ? { valid: true, message: '' }
      : { valid: false, message: t('validators.ruc') };
  }
  return raw.length >= 6
    ? { valid: true, message: '' }
    : { valid: false, message: t('validators.dni') };
}

export function validateEmail(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  return REGEX_EMAIL.test(raw)
    ? { valid: true, message: '' }
    : { valid: false, message: t('validators.email') };
}

export function validatePersonName(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  const letters = raw.match(/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/g) || [];
  if (/\d/.test(raw) || raw.length < 2 || letters.length < 2) {
    return { valid: false, message: t('validators.person_name') };
  }
  return { valid: true, message: '' };
}

export function validatePassword(value, { minLen = 8, required = true } = {}) {
  const raw = String(value ?? '');
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  if (raw.length < minLen) {
    return { valid: false, message: t('validators.password_min', { min: String(minLen) }) };
  }
  return { valid: true, message: '' };
}

export function validateBankAccount(bankType, value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  const typeNorm = String(bankType || 'Yape').toUpperCase();
  if (typeNorm === 'YAPE' || typeNorm === 'PLIN') {
    const compact = raw.replace(/[\s-]+/g, '');
    if (!/^\d+$/.test(compact) || !REGEX_PHONE_PE.test(compact)) {
      return { valid: false, message: t('validators.yape_plin') };
    }
    return { valid: true, message: '' };
  }
  if (typeNorm === 'CCI') {
    return REGEX_CCI.test(raw)
      ? { valid: true, message: '' }
      : { valid: false, message: t('validators.cci') };
  }
  if (!/^[0-9-]+$/.test(raw)) {
    return { valid: false, message: t('validators.bank_account') };
  }
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 20) {
    return { valid: false, message: t('validators.bank_account') };
  }
  return { valid: true, message: '' };
}

export function validateCardLast4(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  return REGEX_CARD_LAST4.test(raw)
    ? { valid: true, message: '' }
    : { valid: false, message: t('validators.card_last4') };
}

export function validateOperationCode(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  return REGEX_OPERATION_CODE.test(raw)
    ? { valid: true, message: '' }
    : { valid: false, message: t('validators.operation_code') };
}

export function validateCmvp(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  return REGEX_CMVP.test(raw)
    ? { valid: true, message: '' }
    : { valid: false, message: t('validators.cmvp') };
}

export function validateNumberRange(value, { min = null, max = null, required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (raw === '') {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    if (min !== null && max !== null) {
      return { valid: false, message: t('validators.number_range', { min: String(min), max: String(max) }) };
    }
    return { valid: false, message: t('validators.required') };
  }
  if (min !== null && max !== null && (num < min || num > max)) {
    return { valid: false, message: t('validators.number_range', { min: String(min), max: String(max) }) };
  }
  if (min !== null && num < min) {
    return { valid: false, message: t('validators.number_min', { min: String(min) }) };
  }
  if (max !== null && num > max) {
    return { valid: false, message: t('validators.number_max', { max: String(max) }) };
  }
  return { valid: true, message: '' };
}

function getTodayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validatePastDate(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { valid: false, message: t('validators.past_date') };
  }
  if (raw > getTodayIsoLocal()) {
    return { valid: false, message: t('validators.past_date') };
  }
  return { valid: true, message: '' };
}

export function validateFutureDate(value, { required = true } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return required
      ? { valid: false, message: t('validators.required') }
      : { valid: true, message: '' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { valid: false, message: t('validators.future_date') };
  }
  if (raw < getTodayIsoLocal()) {
    return { valid: false, message: t('validators.future_date') };
  }
  return { valid: true, message: '' };
}

/* ==========================================================================
   3. MOTOR DOM BOOTSTRAP 5 (.is-invalid / .invalid-feedback / FOCO)
   ========================================================================== */

function isFieldHiddenOrDisabled(field) {
  if (!field || field.disabled || field.type === 'hidden') return true;
  if (field.closest('.d-none, [hidden], fieldset[disabled]')) return true;
  return false;
}

function getFeedbackAnchor(field) {
  const pwdWrap = field.closest('.input-password-wrapper');
  if (pwdWrap) return pwdWrap;
  const inputGroup = field.closest('.input-group');
  if (inputGroup) return inputGroup;
  return field;
}

function ensureFeedbackElement(field) {
  if (field.type === 'checkbox') {
    const checkContainer = field.closest('.form-check') || field.parentElement;
    if (!checkContainer) return null;
    let fb = checkContainer.querySelector('.invalid-feedback[data-paw-feedback]');
    if (!fb) {
      fb = document.createElement('div');
      fb.className = 'invalid-feedback small fw-semibold mt-1';
      fb.setAttribute('data-paw-feedback', field.id || 'check');
      fb.setAttribute('role', 'alert');
      checkContainer.appendChild(fb);
    }
    return fb;
  }

  const anchor = getFeedbackAnchor(field);
  const parent = anchor.parentElement;
  if (!parent) return null;

  const key = field.id || field.name || 'field';
  let fb = parent.querySelector(`.invalid-feedback[data-paw-feedback="${CSS.escape(key)}"]`);
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'invalid-feedback small';
    fb.setAttribute('data-paw-feedback', key);
    fb.setAttribute('role', 'alert');
    anchor.insertAdjacentElement('afterend', fb);
  }
  return fb;
}

export function setFieldValidity(field, isValid, message = '') {
  if (!field) return;
  const fb = ensureFeedbackElement(field);

  if (isValid) {
    field.classList.remove('is-invalid');
    if (field.type !== 'checkbox' && String(field.value ?? '').trim() !== '') {
      field.classList.add('is-valid');
    } else {
      field.classList.remove('is-valid');
    }
    field.setAttribute('aria-invalid', 'false');
    if (fb) {
      fb.textContent = '';
      fb.classList.remove('d-block');
    }
    if (field.type === 'checkbox') {
      const box = field.closest('.form-check');
      box?.classList.remove('border', 'border-danger', 'rounded-2', 'p-2', 'bg-danger-subtle');
    }
  } else {
    field.classList.remove('is-valid');
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
    if (fb) {
      fb.textContent = message || t('validators.required');
      fb.classList.add('d-block');
    }
    if (field.type === 'checkbox') {
      const box = field.closest('.form-check');
      if (box && !box.classList.contains('form-switch')) {
        box.classList.add('border', 'border-danger', 'rounded-2', 'p-2', 'bg-danger-subtle');
      }
    }
  }
}

export function clearFieldValidation(field) {
  if (!field) return;
  field.classList.remove('is-invalid', 'is-valid');
  field.removeAttribute('aria-invalid');
  const fb = field.type === 'checkbox'
    ? field.closest('.form-check')?.querySelector('.invalid-feedback[data-paw-feedback]')
    : getFeedbackAnchor(field).parentElement?.querySelector(
        `.invalid-feedback[data-paw-feedback="${CSS.escape(field.id || field.name || 'field')}"]`
      );
  if (fb) {
    fb.textContent = '';
    fb.classList.remove('d-block');
  }
  if (field.type === 'checkbox') {
    field.closest('.form-check')?.classList.remove('border', 'border-danger', 'rounded-2', 'p-2', 'bg-danger-subtle');
  }
}

export function resetFormValidation(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll('input, select, textarea').forEach((f) => clearFieldValidation(f));
}

function getDocTypeForField(field, formEl) {
  const sel = field.getAttribute('data-doc-type-selector');
  if (sel) {
    const selectEl = (formEl && formEl.querySelector(sel)) || document.querySelector(sel);
    if (selectEl) return selectEl.value || 'DNI';
  }
  const rule = (field.getAttribute('data-validate') || '').toLowerCase();
  if (rule === 'dni') return 'DNI';
  if (rule === 'ce') return 'CE';
  if (rule === 'pasaporte') return 'Pasaporte';
  if (rule === 'ruc') return 'RUC';
  return 'DNI';
}

function getBankTypeForField(field, formEl) {
  const sel = field.getAttribute('data-bank-type-selector');
  if (sel) {
    const selectEl = (formEl && formEl.querySelector(sel)) || document.querySelector(sel);
    if (selectEl) return selectEl.value || 'Yape';
  }
  return 'Yape';
}

function syncDynamicFieldAttributes(field, formEl) {
  const rule = (field.getAttribute('data-validate') || '').toLowerCase();

  if (rule === 'phone' || rule === 'phone-optional') {
    field.setAttribute('inputmode', 'tel');
    field.setAttribute('maxlength', '16');
  } else if (rule === 'yape-plin') {
    field.setAttribute('inputmode', 'numeric');
    field.setAttribute('maxlength', '9');
  } else if (rule === 'dni') {
    field.setAttribute('inputmode', 'numeric');
    field.setAttribute('maxlength', '8');
  } else if (rule === 'ruc') {
    field.setAttribute('inputmode', 'numeric');
    field.setAttribute('maxlength', '11');
  } else if (rule === 'card-last4') {
    field.setAttribute('inputmode', 'numeric');
    field.setAttribute('maxlength', '4');
  } else if (rule === 'doc-number') {
    const docType = getDocTypeForField(field, formEl).toUpperCase();
    if (docType === 'DNI') {
      field.setAttribute('inputmode', 'numeric');
      field.setAttribute('maxlength', '8');
    } else {
      field.setAttribute('inputmode', 'text');
      field.setAttribute('maxlength', '12');
    }
  } else if (rule === 'bank-account') {
    const bankType = getBankTypeForField(field, formEl).toUpperCase();
    field.setAttribute('inputmode', 'numeric');
    if (bankType === 'YAPE' || bankType === 'PLIN') {
      field.setAttribute('maxlength', '9');
    } else if (bankType === 'CCI') {
      field.setAttribute('maxlength', '20');
    } else {
      field.setAttribute('maxlength', '24');
    }
  }
}

function applyInputSanitization(field, formEl) {
  const rule = (field.getAttribute('data-validate') || '').toLowerCase();
  if (!rule || field.readOnly || field.type === 'checkbox' || field.tagName === 'SELECT') return;

  const original = field.value;
  let cleaned = original;

  switch (rule) {
    case 'phone':
    case 'phone-optional':
      cleaned = sanitizePhone(original);
      break;
    case 'yape-plin':
      cleaned = sanitizeDigits(original, 9);
      break;
    case 'dni':
      cleaned = sanitizeDigits(original, 8);
      break;
    case 'ruc':
      cleaned = sanitizeDigits(original, 11);
      break;
    case 'ce':
    case 'pasaporte':
      cleaned = sanitizeAlnum(original, 12);
      break;
    case 'doc-number': {
      const docType = getDocTypeForField(field, formEl).toUpperCase();
      cleaned = docType === 'DNI' ? sanitizeDigits(original, 8) : sanitizeAlnum(original, 12);
      break;
    }
    case 'bank-account': {
      const bankType = getBankTypeForField(field, formEl).toUpperCase();
      if (bankType === 'YAPE' || bankType === 'PLIN') cleaned = sanitizeDigits(original, 9);
      else if (bankType === 'CCI') cleaned = sanitizeDigits(original, 20);
      else cleaned = sanitizeBankNumber(original, 24);
      break;
    }
    case 'card-last4':
      cleaned = sanitizeDigits(original, 4);
      break;
    case 'operation-code':
    case 'operation-code-optional':
      cleaned = sanitizeOperationCode(original, 30);
      break;
    case 'cmvp':
      cleaned = sanitizeOperationCode(original, 25).toUpperCase();
      break;
    case 'email':
    case 'email-optional':
      cleaned = sanitizeEmail(original);
      break;
    case 'person-name':
    case 'person-name-optional':
      cleaned = sanitizePersonName(original);
      break;
    default:
      break;
  }

  if (cleaned !== original) {
    const cursorPos = field.selectionStart;
    field.value = cleaned;
    if (typeof cursorPos === 'number' && document.activeElement === field) {
      const nextPos = Math.max(0, cursorPos - (original.length - cleaned.length));
      try { field.setSelectionRange(nextPos, nextPos); } catch (_) { /* ignore */ }
    }
  }
}

/**
 * Valida un único control HTML según `data-validate` o atributos nativos HTML5
 */
export function validateField(field, formEl = null) {
  if (!field || isFieldHiddenOrDisabled(field) || field.readOnly) {
    return { valid: true, message: '' };
  }

  const rule = (field.getAttribute('data-validate') || '').toLowerCase();
  const isReq = field.hasAttribute('required');
  const val = field.type === 'checkbox' ? field.checked : String(field.value ?? '').trim();

  let res = { valid: true, message: '' };

  if (field.type === 'checkbox' || rule === 'required-check') {
    if (rule === 'required-check' || isReq) {
      const customMsg = field.getAttribute('data-error-msg');
      res = field.checked
        ? { valid: true, message: '' }
        : { valid: false, message: customMsg || t('validators.required_check') };
    }
  } else if (rule === 'phone' || rule === 'phone-optional') {
    res = validatePhone(val, { required: rule === 'phone' || isReq });
  } else if (rule === 'yape-plin') {
    res = validateBankAccount('Yape', val, { required: isReq || true });
  } else if (rule === 'dni' || rule === 'ce' || rule === 'pasaporte' || rule === 'ruc' || rule === 'doc-number') {
    const docType = getDocTypeForField(field, formEl);
    res = validateDocument(docType, val, { required: isReq || true });
  } else if (rule === 'email' || rule === 'email-optional' || (!rule && field.type === 'email')) {
    res = validateEmail(val, { required: rule === 'email' || isReq });
  } else if (rule === 'person-name' || rule === 'person-name-optional') {
    res = validatePersonName(val, { required: rule === 'person-name' || isReq });
  } else if (rule === 'password') {
    const minLen = Number(field.getAttribute('data-minlen') || field.getAttribute('minlength')) || 8;
    res = validatePassword(field.value, { minLen, required: true });
  } else if (rule === 'password-login') {
    res = String(field.value || '').length > 0
      ? { valid: true, message: '' }
      : { valid: false, message: t('validators.required') };
  } else if (rule === 'password-confirm') {
    const matchSel = field.getAttribute('data-match');
    const matchEl = matchSel ? ((formEl && formEl.querySelector(matchSel)) || document.querySelector(matchSel)) : null;
    const minLen = Number(field.getAttribute('data-minlen') || field.getAttribute('minlength')) || 8;
    const baseCheck = validatePassword(field.value, { minLen, required: true });
    if (!baseCheck.valid) {
      res = baseCheck;
    } else if (matchEl && field.value !== matchEl.value) {
      res = { valid: false, message: t('validators.password_mismatch') };
    }
  } else if (rule === 'bank-account') {
    const bankType = getBankTypeForField(field, formEl);
    res = validateBankAccount(bankType, val, { required: true });
  } else if (rule === 'card-last4') {
    res = validateCardLast4(val, { required: true });
  } else if (rule === 'operation-code' || rule === 'operation-code-optional') {
    res = validateOperationCode(val, { required: rule === 'operation-code' || isReq });
  } else if (rule === 'cmvp') {
    res = validateCmvp(val, { required: isReq || true });
  } else if (rule === 'number-range' || (!rule && field.type === 'number')) {
    const minAttr = field.getAttribute('min');
    const maxAttr = field.getAttribute('max');
    const min = minAttr !== null && minAttr !== '' ? Number(minAttr) : null;
    const max = maxAttr !== null && maxAttr !== '' ? Number(maxAttr) : null;
    res = validateNumberRange(val, { min, max, required: isReq });
  } else if (rule === 'past-date') {
    res = validatePastDate(val, { required: isReq });
  } else if (rule === 'future-date') {
    res = validateFutureDate(val, { required: isReq });
  } else {
    // Regla genérica de texto / select (required + minlength)
    const minLenAttr = Number(field.getAttribute('minlength') || field.getAttribute('data-minlen') || 0);
    if (isReq && !val) {
      res = { valid: false, message: t('validators.required') };
    } else if (val && minLenAttr > 0 && val.length < minLenAttr) {
      res = { valid: false, message: t('validators.min_length', { min: String(minLenAttr) }) };
    }
  }

  setFieldValidity(field, res.valid, res.message);
  return res;
}

/**
 * Conecta sanitización en tiempo real (`input`), validación en `blur`/`change`
 * y vinculación de selectores dinámicos a un formulario completo.
 */
export function attachFormValidation(formEl) {
  if (!formEl) return;
  formEl.setAttribute('novalidate', 'novalidate');
  if (formEl.dataset.pawValidated === 'true') return;
  formEl.dataset.pawValidated = 'true';

  const fields = formEl.querySelectorAll('input, select, textarea');

  fields.forEach((field) => {
    syncDynamicFieldAttributes(field, formEl);

    // Normalizar prefills heredados con espacios/guiones en teléfonos o Yape para compatibilidad inmediata
    const rule = (field.getAttribute('data-validate') || '').toLowerCase();
    if ((rule === 'phone' || rule === 'phone-optional' || rule === 'yape-plin') && field.value) {
      if (/^[+\d\s-]+$/.test(field.value)) {
        field.value = rule === 'yape-plin' ? sanitizeDigits(field.value, 9) : sanitizePhone(field.value);
      }
    }

    field.addEventListener('input', () => {
      applyInputSanitization(field, formEl);
      if (field.classList.contains('is-invalid') || field.classList.contains('is-valid')) {
        validateField(field, formEl);
      }
      // Si es contraseña principal, revalidar campo de confirmación si ya tiene contenido
      if (rule === 'password' && field.id) {
        const confirmEl = formEl.querySelector(`[data-match="#${CSS.escape(field.id)}"]`);
        if (confirmEl && confirmEl.value) {
          validateField(confirmEl, formEl);
        }
      }
    });

    field.addEventListener('blur', () => {
      applyInputSanitization(field, formEl);
      if (field.type !== 'checkbox') {
        const val = String(field.value ?? '').trim();
        if (val !== '' || field.hasAttribute('required') || field.classList.contains('is-invalid')) {
          validateField(field, formEl);
        }
      }
    });

    if (field.type === 'checkbox' || field.tagName === 'SELECT' || field.type === 'date') {
      field.addEventListener('change', () => {
        if (field.classList.contains('is-invalid') || field.type === 'checkbox') {
          validateField(field, formEl);
        }
      });
    }

    // Vincular selector dinámico de tipo de documento (DNI / CE / Pasaporte)
    const docSel = field.getAttribute('data-doc-type-selector');
    if (docSel) {
      const selectEl = formEl.querySelector(docSel) || document.querySelector(docSel);
      selectEl?.addEventListener('change', () => {
        syncDynamicFieldAttributes(field, formEl);
        applyInputSanitization(field, formEl);
        if (field.value || field.classList.contains('is-invalid')) {
          validateField(field, formEl);
        }
      });
    }

    // Vincular selector dinámico de banco / billetera (Yape / Plin / CCI / BCP...)
    const bankSel = field.getAttribute('data-bank-type-selector');
    if (bankSel) {
      const selectEl = formEl.querySelector(bankSel) || document.querySelector(bankSel);
      selectEl?.addEventListener('change', () => {
        syncDynamicFieldAttributes(field, formEl);
        applyInputSanitization(field, formEl);
        if (field.value || field.classList.contains('is-invalid')) {
          validateField(field, formEl);
        }
      });
    }
  });

  formEl.addEventListener('reset', () => {
    setTimeout(() => resetFormValidation(formEl), 0);
  });
}

/**
 * Ejecuta validación completa de todos los campos visibles del formulario al hacer submit.
 * Enfoca y desplaza automáticamente al primer error (H9) y muestra aviso claro.
 */
export function validateFormNow(formEl, { showToastOnError = true, focusFirst = true } = {}) {
  if (!formEl) return { valid: true, firstInvalid: null, errors: [] };

  const fields = Array.from(formEl.querySelectorAll('input, select, textarea'));
  const errors = [];
  let firstInvalid = null;
  let missingCheckbox = false;

  fields.forEach((field) => {
    if (isFieldHiddenOrDisabled(field) || field.readOnly) return;
    applyInputSanitization(field, formEl);
    const check = validateField(field, formEl);
    if (!check.valid) {
      errors.push({ field, message: check.message });
      if (!firstInvalid) firstInvalid = field;
      if (field.type === 'checkbox') missingCheckbox = true;
    }
  });

  if (errors.length > 0) {
    if (focusFirst && firstInvalid) {
      try {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      } catch (_) {
        try { firstInvalid.focus(); } catch (__) { /* ignore */ }
      }
    }
    if (showToastOnError) {
      const toastMsg = missingCheckbox && errors.every((e) => e.field.type === 'checkbox')
        ? t('validators.tyc_required')
        : (firstInvalid && firstInvalid.type === 'checkbox'
          ? t('validators.tyc_required')
          : `${t('validators.form_errors_toast')} (${errors[0].message})`);
      showToast(toastMsg, 'warning');
    }
    return { valid: false, firstInvalid, errors };
  }

  return { valid: true, firstInvalid: null, errors: [] };
}

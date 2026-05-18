/**
 * Supported currencies
 */
export const CURRENCIES = {
  ARS: { code: 'ARS', locale: 'es-AR', symbol: '$', name: 'Peso Argentino' },
  COP: { code: 'COP', locale: 'es-CO', symbol: '$', name: 'Peso Colombiano' },
  USD: { code: 'USD', locale: 'en-US', symbol: 'US$', name: 'Dólar Estadounidense' },
  EUR: { code: 'EUR', locale: 'de-DE', symbol: '€', name: 'Euro' },
};

/**
 * Format a number as currency
 * @param {number|string} amount - Amount to format
 * @param {string} currencyCode - Currency code (ARS, COP, USD, EUR)
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} Formatted string
 */
export function formatCurrency(amount, currencyCode = 'ARS', options = {}) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0,00';

  const config = CURRENCIES[currencyCode] || CURRENCIES.ARS;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(num);
}

/**
 * Legacy function for backward compatibility - defaults to ARS
 * @param {number|string} amount
 * @param {object} options
 * @returns {string}
 */
export function formatCurrencyLegacy(amount, options = {}) {
  return formatCurrency(amount, 'ARS', options);
}

/**
 * Format a number as ARS with no decimals (for display)
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrencyCompact(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Parse an ARS formatted string back to number
 * @param {string} formatted
 * @returns {number}
 */
export function parseCurrency(formatted) {
  if (typeof formatted === 'number') return formatted;
  return parseFloat(formatted.replace(/[$\s]/g, '').replace(',', '.')) || 0;
}

/**
 * Format a date as short date string (e.g., "12/05/2026")
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
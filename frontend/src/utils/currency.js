/**
 * Currency formatting utilities for Kambelleh PMS
 * Site: kambelleh.com - Argentina
 */

/**
 * Format a number as Argentine Pesos (ARS)
 * @param {number|string} amount - Amount to format
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} Formatted string like "$45.000,00"
 */
export function formatCurrency(amount, options = {}) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0,00';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(num);
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
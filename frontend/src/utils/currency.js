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
import { Resend } from 'resend';
import { generateInvoicePdf } from '../utils/pdfInvoice.js';

// Lazy initialization to avoid throwing at module load time when key is missing
let resend = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const HOTEL_NAME = process.env.HOTEL_NAME || 'Kambelleh';
const HOTEL_EMAIL = process.env.HOTEL_EMAIL || 'reservas@kambelleh.com';
const HOTEL_PHONE = process.env.HOTEL_PHONE || '';
const HOTEL_ADDRESS = process.env.HOTEL_ADDRESS || '';

// ================== i18n ==================
const DEFAULT_LANG = 'es';

const i18n = {
  es: {
    reservationConfirmed: 'Tu reservación confirmada',
    welcome: '¡Hola, {name}!',
    checkin: 'Check-in',
    checkout: 'Check-out',
    room: 'Habitación',
    total: 'Total',
    saveThisEmail: 'Guardá este email como comprobante. Para check-in necesitás tu documento de identidad.',
    checkinReminder: '¡Bienvenido, {name}! Te esperamos mañana para tu check-in.',
    arriveEarly: 'Si necesitás llegar fuera de horario, avisanos con anticipación.',
    checkoutReminder: '¡Gracias por elegirnos, {name}! Hoy es tu día de salida.',
    checkoutTime: 'Hora de salida',
    leaveBy11: 'Por favor dejá la habitación antes de las 11:00.',
    hopeToSeeYou: '¡Esperamos verte de vuelta pronto!',
    invoice: 'Factura',
    invoiceMessage: 'Hola {name}, aquí tienes tu factura.',
    paidAmount: 'Monto pagado',
    questions: '¿Preguntas?',
    writeUs: 'Escríbenos a',
    orCallUs: 'o llámanos al',
    fromTime: 'desde las {time}',
    untilTime: 'hasta las {time}',
  },
  en: {
    reservationConfirmed: 'Your reservation is confirmed',
    welcome: 'Hello, {name}!',
    checkin: 'Check-in',
    checkout: 'Check-out',
    room: 'Room',
    total: 'Total',
    saveThisEmail: 'Save this email as receipt. For check-in you need your ID document.',
    checkinReminder: 'Welcome, {name}! We await you tomorrow for check-in.',
    arriveEarly: 'If you need to arrive outside of business hours, let us know in advance.',
    checkoutReminder: 'Thank you for choosing us, {name}! Today is your departure day.',
    checkoutTime: 'Departure time',
    leaveBy11: 'Please leave the room before 11:00.',
    hopeToSeeYou: 'We hope to see you again soon!',
    invoice: 'Invoice',
    invoiceMessage: 'Hello {name}, here is your invoice.',
    paidAmount: 'Amount paid',
    questions: 'Questions?',
    writeUs: 'Write to us at',
    orCallUs: 'or call us at',
    fromTime: 'from {time}',
    untilTime: 'until {time}',
  },
};

export function t(key, lang = DEFAULT_LANG, params = {}) {
  const translation = i18n[lang]?.[key] || i18n.es[key] || key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    translation
  );
}

// ================== Retry ==================
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry(fn, context = 'operation') {
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[Email] ${context} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err.message);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  console.error(`[Email] ${context} failed after ${MAX_RETRIES} attempts:`, lastError.message);
  return null;
}

function wrapEmail(html) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${HOTEL_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <!-- Header -->
          <tr>
            <td style="background:#0ea5e9;padding:24px 32px;text-align:center">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">${HOTEL_NAME}</h1>
              <p style="color:#e0f2fe;margin:4px 0 0;font-size:14px">Tu reservación confirmada</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px">
              ${html}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
              <p style="color:#64748b;font-size:13px;margin:0">
                ${HOTEL_NAME} &bull; ${HOTEL_ADDRESS}
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:8px 0 0">
                ¿Preguntas? Escríbenos a <a href="mailto:${HOTEL_EMAIL}" style="color:#0ea5e9">${HOTEL_EMAIL}</a>${HOTEL_PHONE ? ` o llámanos al ${HOTEL_PHONE}` : ''}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCurrency(amount) {
  return `${Number(amount || 0).toFixed(2)} €`;
}

/**
 * Envía confirmación de reserva. No falla la creación si el email falla.
 * Soporta i18n y retry automático.
 */
export async function sendReservationConfirmation(guest, reservation, room, sendgrid) {
  const lang = guest?.language || DEFAULT_LANG;
  const subject = `${t('reservationConfirmed', lang)} #${reservation.id.slice(0, 8)} - ${HOTEL_NAME}`;
  const checkInTime = '14:00';
  const checkOutTime = '11:00';

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">${t('welcome', lang, { name: guest?.name || 'Huésped' })}</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">${t('reservationConfirmed', lang)}:</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('room', lang)}</strong><br>
          <span style="color:#1e293b;font-size:15px">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkin', lang)}</strong><br>
          <span style="color:#1e293b;font-size:15px">${formatDate(reservation.checkIn)} ${t('fromTime', lang, { time: checkInTime })}</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkout', lang)}</strong><br>
          <span style="color:#1e293b;font-size:15px">${formatDate(reservation.checkOut)} ${t('untilTime', lang, { time: checkOutTime })}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('total', lang)}</strong><br>
          <span style="color:#0ea5e9;font-size:18px;font-weight:700">${formatCurrency(reservation.totalAmount)}</span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;margin:0 0 16px">${t('saveThisEmail', lang)}</p>
  `;

  try {
    const client = getResend();
    const sendEmail = async () => {
      if (sendgrid) {
        await sendgrid.send({ to: guest?.email, subject, html: wrapEmail(html) });
      } else if (client) {
        await client.emails.send({
          from: `${HOTEL_NAME} <${HOTEL_EMAIL}>`,
          to: guest?.email || '',
          subject,
          html: wrapEmail(html),
        });
      } else {
        console.log('[Email] Would send confirmation to', guest?.email, '- RESEND_API_KEY not set');
      }
    };

    await withRetry(sendEmail, 'confirmation');
  } catch (err) {
    console.error('[Email] Confirmation failed:', err.message);
    // Non-blocking — reservation still succeeds
  }
}

/**
 * Recordatorio de check-in.
 */
export async function sendCheckinReminder(guest, reservation, room) {
  const lang = guest?.language || DEFAULT_LANG;
  const subject = `${t('checkinReminder', lang, { name: guest?.name || 'Huésped' })} - ${HOTEL_NAME}`;

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">${t('welcome', lang, { name: guest?.name || 'Huésped' })}</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">${t('checkinReminder', lang, { name: guest?.name || 'Huésped' })}.</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('room', lang)}</strong><br>
          <span style="color:#1e293b">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkin', lang)}</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkIn)} ${t('fromTime', lang, { time: '14:00' })}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkout', lang)}</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkOut)} ${t('untilTime', lang, { time: '11:00' })}</span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;margin:0">${t('arriveEarly', lang)}</p>
  `;

  try {
    const client = getResend();
    await withRetry(async () => {
      if (client) {
        await client.emails.send({
          from: `${HOTEL_NAME} <${HOTEL_EMAIL}>`,
          to: guest?.email || '',
          subject,
          html: wrapEmail(html),
        });
      } else {
        console.log('[Email] Would send check-in reminder to', guest?.email);
      }
    }, 'checkin-reminder');
  } catch (err) {
    console.error('[Email] Check-in reminder failed:', err.message);
  }
}

/**
 * Recordatorio de check-out.
 */
export async function sendCheckoutReminder(guest, reservation, room) {
  const lang = guest?.language || DEFAULT_LANG;
  const subject = `${t('checkoutReminder', lang, { name: guest?.name || 'Huésped' })} - ${HOTEL_NAME}`;

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">${t('checkoutReminder', lang, { name: guest?.name || 'Huésped' })}</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">${t('checkoutReminder', lang, { name: guest?.name || 'Huésped' })}:</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('room', lang)}</strong><br>
          <span style="color:#1e293b">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkoutTime', lang)}</strong><br>
          <span style="color:#1e293b;font-size:16px;font-weight:600">11:00</span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;margin:0 0 8px">${t('leaveBy11', lang)}</p>
    <p style="color:#475569;font-size:14px;margin:0">${t('hopeToSeeYou', lang)}</p>
  `;

  try {
    const client = getResend();
    await withRetry(async () => {
      if (client) {
        await client.emails.send({
          from: `${HOTEL_NAME} <${HOTEL_EMAIL}>`,
          to: guest?.email || '',
          subject,
          html: wrapEmail(html),
        });
      } else {
        console.log('[Email] Would send checkout reminder to', guest?.email);
      }
    }, 'checkout-reminder');
  } catch (err) {
    console.error('[Email] Checkout reminder failed:', err.message);
  }
}

/**
 * Factura con PDF adjunto.
 */
export async function sendInvoice(guest, reservation, room, payment) {
  const lang = guest?.language || DEFAULT_LANG;
  const subject = `${t('invoice', lang)} #${reservation.id.slice(0, 8)} - ${HOTEL_NAME}`;

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">${t('invoice', lang)}</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">${t('invoiceMessage', lang, { name: guest?.name || 'Huésped' })}.</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('room', lang)}</strong><br>
          <span style="color:#1e293b">#${reservation.id.slice(0, 8)}</span>
        </td>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('room', lang)}</strong><br>
          <span style="color:#1e293b">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkin', lang)}</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkIn)}</span>
        </td>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('checkout', lang)}</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkOut)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px" colspan="2">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">${t('paidAmount', lang)}</strong><br>
          <span style="color:#0ea5e9;font-size:20px;font-weight:700">${formatCurrency(payment?.amount || reservation.totalAmount)}</span>
          <span style="color:#64748b;font-size:12px;margin-left:8px">${payment?.currency?.toUpperCase() || 'EUR'}</span>
        </td>
      </tr>
    </table>
  `;

  try {
    const client = getResend();
    await withRetry(async () => {
      if (client) {
        // Generate PDF
        const pdfBuffer = await generateInvoicePdf({ reservation, guest, room, payment });
        const invoiceNum = `INV-${reservation.id.slice(0, 8).toUpperCase()}.pdf`;

        await client.emails.send({
          from: `${HOTEL_NAME} <${HOTEL_EMAIL}>`,
          to: guest?.email || '',
          subject,
          html: wrapEmail(html),
          attachments: [
            {
              filename: invoiceNum,
              content: pdfBuffer.toString('base64'),
              contentType: 'application/pdf',
            },
          ],
        });
      } else {
        console.log('[Email] Would send invoice (with PDF) to', guest?.email);
      }
    }, 'invoice');
  } catch (err) {
    console.error('[Email] Invoice failed:', err.message);
    // Non-blocking — payment already confirmed
  }
}
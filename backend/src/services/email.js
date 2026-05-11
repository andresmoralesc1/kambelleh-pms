import { Resend } from 'resend';

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
 */
export async function sendReservationConfirmation(guest, reservation, room, sendgrid) {
  const subject = `Confirmación de reserva #${reservation.id.slice(0, 8)} - ${HOTEL_NAME}`;
  const checkInTime = '14:00';
  const checkOutTime = '11:00';

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">¡Hola, ${guest?.name || 'Huésped'}!</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">Tu reservación está confirmada. Aquí tienes los detalles:</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Habitación</strong><br>
          <span style="color:#1e293b;font-size:15px">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Check-in</strong><br>
          <span style="color:#1e293b;font-size:15px">${formatDate(reservation.checkIn)} desde las ${checkInTime}</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Check-out</strong><br>
          <span style="color:#1e293b;font-size:15px">${formatDate(reservation.checkOut)} hasta las ${checkOutTime}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Total</strong><br>
          <span style="color:#0ea5e9;font-size:18px;font-weight:700">${formatCurrency(reservation.totalAmount)}</span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;margin:0 0 16px">
      Guardá este email como comprobante. Para check-in necesitás tu documento de identidad.
    </p>
  `;

  try {
    const client = getResend();
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
  } catch (err) {
    console.error('[Email] Confirmation failed:', err.message);
    // Non-blocking — reservation still succeeds
  }
}

/**
 * Recordatorio de check-in.
 */
export async function sendCheckinReminder(guest, reservation, room) {
  const subject = `Recordatorio: tu check-in es mañana - ${HOTEL_NAME}`;

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">¡Bienvenido, ${guest?.name || 'Huésped'}!</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">Te esperamos mañana para tu check-in.</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Habitación</strong><br>
          <span style="color:#1e293b">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Check-in</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkIn)} desde las 14:00</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Check-out</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkOut)} hasta las 11:00</span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;margin:0">
      Si necesitás llegar fuera de horario, avisanos con anticipación.
    </p>
  `;

  try {
    const client = getResend();
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
  } catch (err) {
    console.error('[Email] Check-in reminder failed:', err.message);
  }
}

/**
 * Recordatorio de check-out.
 */
export async function sendCheckoutReminder(guest, reservation, room) {
  const subject = `Checkout hoy - ${HOTEL_NAME}`;

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">¡Gracias por elegirnos, ${guest?.name || 'Huésped'}!</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">Hoy es tu día de salida. Aquí los detalles:</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Habitación</strong><br>
          <span style="color:#1e293b">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Hora de salida</strong><br>
          <span style="color:#1e293b;font-size:16px;font-weight:600">11:00</span>
        </td>
      </tr>
    </table>

    <p style="color:#475569;font-size:14px;margin:0 0 8px">Por favor dejá la habitación antes de las 11:00.</p>
    <p style="color:#475569;font-size:14px;margin:0">¡Esperamos verte de vuelta pronto!</p>
  `;

  try {
    const client = getResend();
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
  } catch (err) {
    console.error('[Email] Checkout reminder failed:', err.message);
  }
}

/**
 * Factura simplificada (solo email, sin PDF aún).
 */
export async function sendInvoice(guest, reservation, room, payment) {
  const subject = `Factura reserva #${reservation.id.slice(0, 8)} - ${HOTEL_NAME}`;

  const html = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:20px">Factura</h2>
    <p style="color:#475569;font-size:15px;margin:0 0 24px">Hola ${guest?.name || 'Huésped'}, aquí tienes tu factura.</p>

    <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin-bottom:24px">
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Reserva</strong><br>
          <span style="color:#1e293b">#${reservation.id.slice(0, 8)}</span>
        </td>
        <td style="border-bottom:1px solid #e2e8f0;padding-bottom:8px">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Habitación</strong><br>
          <span style="color:#1e293b">${room?.name || '—'} (Nº ${room?.number || '—'})</span>
        </td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Check-in</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkIn)}</span>
        </td>
        <td style="border-bottom:1px solid #e2e8f0;padding:8px 0">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Check-out</strong><br>
          <span style="color:#1e293b">${formatDate(reservation.checkOut)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px" colspan="2">
          <strong style="color:#64748b;font-size:12px;text-transform:uppercase">Monto pagado</strong><br>
          <span style="color:#0ea5e9;font-size:20px;font-weight:700">${formatCurrency(payment?.amount || reservation.totalAmount)}</span>
          <span style="color:#64748b;font-size:12px;margin-left:8px">${payment?.currency?.toUpperCase() || 'EUR'}</span>
        </td>
      </tr>
    </table>
  `;

  try {
    const client = getResend();
    if (client) {
      await client.emails.send({
        from: `${HOTEL_NAME} <${HOTEL_EMAIL}>`,
        to: guest?.email || '',
        subject,
        html: wrapEmail(html),
      });
    } else {
      console.log('[Email] Would send invoice to', guest?.email);
    }
  } catch (err) {
    console.error('[Email] Invoice failed:', err.message);
  }
}
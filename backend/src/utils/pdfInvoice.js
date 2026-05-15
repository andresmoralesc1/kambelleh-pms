import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

const HOTEL_NAME = process.env.HOTEL_NAME || 'Kambelleh';
const HOTEL_EMAIL = process.env.HOTEL_EMAIL || 'reservas@kambelleh.com';
const HOTEL_PHONE = process.env.HOTEL_PHONE || '';
const HOTEL_ADDRESS = process.env.HOTEL_ADDRESS || '';

function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy');
}

function formatCurrency(amount) {
  return `${Number(amount || 0).toFixed(2)} €`;
}

/**
 * Generate a PDF invoice for a reservation.
 * Returns a Buffer containing the PDF data.
 */
export function generateInvoicePdf({ reservation, guest, room, payment }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const invoiceNum = `INV-${reservation.id.slice(0, 8).toUpperCase()}`;
      const invoiceDate = format(new Date(), 'dd/MM/yyyy');
      const checkIn = formatDate(reservation.checkIn);
      const checkOut = formatDate(reservation.checkOut);
      const nights = Math.ceil((new Date(reservation.checkOut) - new Date(reservation.checkIn)) / (1000 * 60 * 60 * 24));

      // Header
      doc.fontSize(22).font('Helvetica-Bold').text(HOTEL_NAME, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(`${HOTEL_ADDRESS} | ${HOTEL_EMAIL} ${HOTEL_PHONE ? `| ${HOTEL_PHONE}` : ''}`, { align: 'center' });
      doc.moveDown(1.5);

      // Invoice title
      doc.fontSize(18).font('Helvetica-Bold').text('FACTURA', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(`Fecha: ${invoiceDate}`, { align: 'center' });
      doc.text(`Factura N°: ${invoiceNum}`, { align: 'center' });
      doc.moveDown(2);

      // Divider
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(1.5);

      // Bill to
      doc.fontSize(11).font('Helvetica-Bold').text('Datos del cliente:');
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica').text(`Nombre: ${guest?.name || '—'}`);
      doc.text(`Email: ${guest?.email || '—'}`);
      doc.text(`Teléfono: ${guest?.phone || '—'}`);
      doc.moveDown(1.5);

      // Stay details
      doc.fontSize(11).font('Helvetica-Bold').text('Detalles de la estancia:');
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica').text(`Habitación: ${room?.name || '—'} (Nº ${room?.number || '—'})`);
      doc.text(`Check-in: ${checkIn}`);
      doc.text(`Check-out: ${checkOut}`);
      doc.text(`Noches: ${nights}`);
      doc.moveDown(1.5);

      // Price breakdown table
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 350;
      const col3 = 450;

      // Table header
      doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
      doc.text('Descripción', col1 + 5, tableTop + 5);
      doc.text('Cantidad', col2, tableTop + 5);
      doc.text('Importe', col3, tableTop + 5);
      doc.moveDown(0.8);

      // Table rows
      doc.font('Helvetica').fillColor('#000000');
      const pricePerNight = room?.pricePerNight || 0;
      const totalNights = nights;
      const subtotal = pricePerNight * totalNights;

      doc.text(`Alojamiento - ${totalNights} noche${totalNights !== 1 ? 's' : ''} (${formatCurrency(pricePerNight)}/noche)`, col1 + 5);
      doc.text(`${totalNights}`, col2);
      doc.text(formatCurrency(subtotal), col3);
      doc.moveDown(0.5);

      // IVA (assuming 10% for simplicity — adjust as needed)
      const ivaRate = 0.10;
      const iva = subtotal * ivaRate;
      const total = subtotal + iva;

      doc.moveDown(0.5);
      doc.text('Subtotal:', 350);
      doc.text(formatCurrency(subtotal), col3);
      doc.moveDown(0.3);
      doc.text(`IVA (${(ivaRate * 100).toFixed(0)}%):`, 350);
      doc.text(formatCurrency(iva), col3);
      doc.moveDown(0.5);
      doc.moveTo(350, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(12).text('TOTAL:', 350);
      doc.text(formatCurrency(total), col3);

      doc.moveDown(2);

      // Footer
      doc.fontSize(9).font('Helvetica').fillColor('#888888');
      doc.text('Esta factura ha sido emitida automáticamente por el sistema de gestión del hotel.', { align: 'center' });
      doc.text(`Reserva ID: ${reservation.id}`, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
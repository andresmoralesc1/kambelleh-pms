/**
 * Booking.com Service - Integración con Booking.com Partner API
 * 
 * Este servicio maneja la comunicación con la API de Booking.com para importar
 * reservas y mantener sincronizado el PMS con los canales.
 * 
 * Modo Mock: BOOKING_MOCK=true genera reservas de ejemplo sin llamar a la API real.
 */

import axios from 'axios';
import crypto from 'crypto';
import prisma from '../config/database.js';

const BOOKING_API_BASE = 'https://supply-xml.booking.com/hotels/xml';
const MOCK_MODE = process.env.BOOKING_MOCK === 'true';

class BookingService {
  constructor() {
    this.username = null;
    this.password = null;
    this.hotelId = null;
  }

  /**
   * Verifica si el servicio está configurado y conectado
   */
  isConnected() {
    if (MOCK_MODE) return true;
    return !!(this.username && this.password && this.hotelId);
  }

  /**
   * Verifica si el canal de Booking.com está activo en la BD
   */
  async isChannelActive() {
    const channel = await prisma.channelConnection.findFirst({
      where: { channel: 'BOOKING' }
    });
    return channel?.isActive || false;
  }

  /**
   * Conecta el canal de Booking.com
   */
  async connect() {
    // Modo mock
    if (MOCK_MODE) {
      this.username = 'mock_user';
      this.password = 'mock_pass';
      this.hotelId = 'mock_hotel';
      
      // Asegurar registro en BD
      await prisma.channelConnection.upsert({
        where: { channel: 'BOOKING' },
        update: { isActive: true },
        create: { channel: 'BOOKING', isActive: true }
      });
      return { success: true, mockMode: true };
    }

    // Verificar credenciales
    const { BOOKING_USERNAME, BOOKING_PASSWORD, BOOKING_HOTEL_ID } = process.env;
    if (!BOOKING_USERNAME || !BOOKING_PASSWORD || !BOOKING_HOTEL_ID) {
      throw new Error('Credenciales de Booking.com no configuradas');
    }

    this.username = BOOKING_USERNAME;
    this.password = BOOKING_PASSWORD;
    this.hotelId = BOOKING_HOTEL_ID;

    // Guardar en BD
    await prisma.channelConnection.upsert({
      where: { channel: 'BOOKING' },
      update: { isActive: true },
      create: { channel: 'BOOKING', isActive: true }
    });

    return { success: true };
  }

  /**
   * Desconecta el canal de Booking.com
   */
  async disconnect() {
    this.username = null;
    this.password = null;
    this.hotelId = null;

    // Actualizar BD
    await prisma.channelConnection.upsert({
      where: { channel: 'BOOKING' },
      update: { isActive: false },
      create: { channel: 'BOOKING', isActive: false }
    });

    return { success: true };
  }

  /**
   * Obtiene reservas desde la API de Booking.com
   * 
   * NOTA: La API real de Booking.com requiere credenciales de socio (Affiliate ID).
   * En modo mock se generan reservas de ejemplo.
   * Para implementación real, consultar:
   * https://connect.booking.com/user_guide/site/es-es/integrator-guide/
   */
  async fetchReservations() {
    if (MOCK_MODE) {
      return this.generateMockReservations();
    }

    if (!this.isConnected()) {
      throw new Error('No conectado a Booking.com. Ejecute connect() primero.');
    }

    try {
      // Implementación real - Booking.com XML API
      // const response = await axios.get(`${BOOKING_API_BASE}/reservations`, {
      //   params: {
      //     hotel_id: this.hotelId,
      //     username: this.username,
      //     password: this.password,
      //     date_from: startDate,
      //     date_to: endDate,
      //   },
      // });
      // return this.parseXmlReservations(response.data);

      throw new Error('API real de Booking.com no implementada. Use BOOKING_MOCK=true para modo demo.');
    } catch (err) {
      console.error('Booking.com fetch error:', err.message);
      throw err;
    }
  }

  /**
   * Genera reservas mock para testing/demo
   */
  generateMockReservations() {
    const today = new Date();
    const rooms = [
      { number: '101', price: 95.00 },
      { number: '102', price: 110.00 },
      { number: '201', price: 135.00 },
    ];

    return rooms.map((room, index) => {
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + (index * 3) + 2);
      
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 4);

      const guests = [
        { firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@email.fr', phone: '+33612345678' },
        { firstName: 'Anna', lastName: 'Schmidt', email: 'anna.schmidt@email.de', phone: '+49123456789' },
        { firstName: 'Marco', lastName: 'Rossi', email: 'marco.rossi@email.it', phone: '+39345678901' },
      ];

      const guest = guests[index];

      return {
        reservation_id: `BKG-${Date.now()}-${index}`,
        hotel_id: room.number,
        room_id: room.number,
        guest_first_name: guest.firstName,
        guest_last_name: guest.lastName,
        guest_email: guest.email,
        guest_phone: guest.phone,
        checkin: checkIn.toISOString().split('T')[0],
        checkout: checkOut.toISOString().split('T')[0],
        nights: 4,
        status: 'confirmed',
        adults: 2,
        children: index === 1 ? 1 : 0,
        price: room.price,
        currency: 'EUR',
        special_requests: index === 0 ? 'Late check-in requested' : null,
      };
    });
  }

  /**
   * Importa una reserva desde Booking.com a la base de datos local
   */
  async importReservation(bookingReservation) {
    const {
      reservation_id,
      hotel_id,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
      checkin,
      checkout,
      adults = 1,
      children = 0,
      status,
      price,
      special_requests,
    } = bookingReservation;

    // Buscar habitación por número
    const roomNumber = hotel_id?.toString() || '';
    const room = await prisma.room.findFirst({
      where: { number: roomNumber },
    });

    if (!room) {
      console.warn(`Booking.com: Habitación #${roomNumber} no encontrada, omitiendo reserva ${reservation_id}`);
      return { success: false, reason: 'Room not found' };
    }

    // Buscar o crear huésped
    let guest = await prisma.guest.findFirst({
      where: { email: guest_email },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          name: `${guest_first_name || 'Guest'} ${guest_last_name || ''}`.trim(),
          email: guest_email || null,
          phone: guest_phone || null,
          nationality: 'Not specified',
        },
      });
    }

    // Calcular fechas y total
    const checkIn = new Date(checkin);
    const checkOut = new Date(checkout);
    
    let totalAmount;
    if (price) {
      totalAmount = price;
    } else {
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      totalAmount = Number(room.pricePerNight) * nights;
    }

    // Verificar si ya existe esta reserva (por reservation_id)
    const existing = await prisma.reservation.findFirst({
      where: { stripePaymentId: reservation_id },
    });

    if (existing) {
      // Actualizar reserva existente
      await prisma.reservation.update({
        where: { id: existing.id },
        data: {
          checkIn,
          checkOut,
          totalAmount,
          status: this.mapStatus(status),
          adults,
          children,
          notes: special_requests || null,
        },
      });

      return { success: true, action: 'updated', reservationId: existing.id };
    }

    // Crear nueva reserva
    const reservation = await prisma.reservation.create({
      data: {
        guestId: guest.id,
        roomId: room.id,
        checkIn,
        checkOut,
        totalAmount,
        status: this.mapStatus(status),
        source: 'BOOKING',
        stripePaymentId: reservation_id,
        adults,
        children,
        notes: special_requests || null,
      },
    });

    return { success: true, action: 'created', reservationId: reservation.id };
  }

  /**
   * Importa múltiples reservas desde Booking.com
   */
  async importReservations(bookingReservations) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const reservation of bookingReservations) {
      try {
        const result = await this.importReservation(reservation);
        if (result.success) {
          if (result.action === 'created') results.created++;
          else results.updated++;
        } else {
          results.failed++;
          results.errors.push({ code: reservation.reservation_id, reason: result.reason });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ code: reservation.reservation_id, reason: err.message });
      }
    }

    return results;
  }

  /**
   * Sincroniza todas las reservas desde Booking.com
   */
  async syncAllReservations() {
    const reservations = await this.fetchReservations();
    return this.importReservations(reservations);
  }

  /**
   * Mapear estado de Booking.com a estado del PMS
   */
  mapStatus(bookingStatus) {
    const statusMap = {
      confirmed: 'CONFIRMED',
      pending: 'PENDING',
      cancelled: 'CANCELLED',
      no_show: 'CANCELLED',
    };
    return statusMap[bookingStatus?.toLowerCase()] || 'CONFIRMED';
  }

  /**
   * Verifica y procesa webhook de Booking.com
   */
  async processWebhook(payload, signature) {
    const webhookSecret = process.env.BOOKING_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('BOOKING_WEBHOOK_SECRET no configurado');
    }

    // Verificar firma del webhook
    if (signature) {
      const expectedSig = crypto.createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSig) {
        throw new Error('Firma de webhook inválida');
      }
    }

    // Procesar eventos
    const eventType = payload.event;
    const reservation = payload.reservation;

    if (eventType === 'new_booking' || eventType === 'booking_modified') {
      await this.importReservation(reservation);
    } else if (eventType === 'booking_cancelled') {
      const reservationId = reservation?.reservation_id;
      if (reservationId) {
        await prisma.reservation.updateMany({
          where: { stripePaymentId: reservationId },
          data: { status: 'CANCELLED' },
        });
      }
    }

    return { received: true };
  }
}

// Singleton instance
const bookingService = new BookingService();

export default bookingService;

// Función de conveniencia para usar en el router
export async function syncBookingReservations() {
  return bookingService.syncAllReservations();
}

/**
 * Airbnb Service - Integración con Airbnb Partner API
 * 
 * Este servicio maneja la comunicación con la API de Airbnb para importar
 * reservas y mantener sincronizado el PMS con los canales.
 * 
 * Modo Mock: AIRBNB_MOCK=true genera reservas de ejemplo sin llamar a la API real.
 */

import axios from 'axios';
import crypto from 'crypto';
import prisma from '../config/database.js';

const AIRBNB_API_BASE = 'https://api.airbnb.com/v2';
const MOCK_MODE = process.env.AIRBNB_MOCK === 'true';

class AirbnbService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  /**
   * Verifica si el servicio está configurado y conectado
   */
  isConnected() {
    if (MOCK_MODE) return true;
    return !!(this.accessToken && this.expiresAt && new Date() < this.expiresAt);
  }

  /**
   * Obtiene la URL de autorización OAuth para Airbnb
   */
  getAuthorizationUrl() {
    if (MOCK_MODE) {
      return null; // No necesita auth en modo mock
    }

    const clientId = process.env.AIRBNB_CLIENT_ID;
    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/channels/airbnb/callback`;
    const state = crypto.randomBytes(16).toString('hex');

    return {
      url: `https://www.airbnb.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read_listings&state=${state}`,
      state,
    };
  }

  /**
   * Intercambia código de autorización por tokens de acceso
   */
  async exchangeCodeForTokens(code) {
    if (MOCK_MODE) {
      this.accessToken = 'mock_token_' + Date.now();
      this.refreshToken = 'mock_refresh_' + Date.now();
      this.expiresAt = new Date(Date.now() + 3600 * 1000);
      return { success: true, mockMode: true };
    }

    const clientId = process.env.AIRBNB_CLIENT_ID;
    const clientSecret = process.env.AIRBNB_CLIENT_SECRET;
    const redirectUri = `${process.env.API_URL || 'http://localhost:3001'}/api/channels/airbnb/callback`;

    try {
      const response = await axios.post('https://api.airbnb.com/v2/oauth2/token', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.expiresAt = new Date(Date.now() + (response.data.expires_in * 1000));

      return { success: true };
    } catch (err) {
      console.error('Airbnb token exchange error:', err.response?.data || err.message);
      throw new Error('Error al obtener tokens de Airbnb');
    }
  }

  /**
   * Refresca el token de acceso usando el refresh token
   */
  async refreshAccessToken() {
    if (MOCK_MODE || !this.refreshToken) {
      return { success: false, reason: 'Mock mode or no refresh token' };
    }

    try {
      const clientId = process.env.AIRBNB_CLIENT_ID;
      const clientSecret = process.env.AIRBNB_CLIENT_SECRET;

      const response = await axios.post('https://api.airbnb.com/v2/oauth2/token', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      this.accessToken = response.data.access_token;
      this.expiresAt = new Date(Date.now() + (response.data.expires_in * 1000));

      return { success: true };
    } catch (err) {
      console.error('Airbnb token refresh error:', err.message);
      return { success: false, reason: err.message };
    }
  }

  /**
   * Obtiene reservas desde la API de Airbnb
   */
  async fetchReservations(listingId = null) {
    if (MOCK_MODE) {
      return this.generateMockReservations();
    }

    if (!this.isConnected()) {
      throw new Error('No conectado a Airbnb. Ejecute connect() primero.');
    }

    try {
      const params = { _format: 'calendar_reservation' };
      if (listingId || process.env.AIRBNB_LISTING_ID) {
        params.listing_id = listingId || process.env.AIRBNB_LISTING_ID;
      }

      const response = await axios.get(`${AIRBNB_API_BASE}/listings/reservations`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        params,
      });

      return response.data.reservations || [];
    } catch (err) {
      // Si el token expiró, intentar refrescar
      if (err.response?.status === 401) {
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.success) {
          return this.fetchReservations(listingId); // Reintentar
        }
      }
      throw err;
    }
  }

  /**
   * Genera reservas mock para testing/demo
   */
  generateMockReservations() {
    const today = new Date();
    const rooms = [
      { number: '101', price: 89.00 },
      { number: '102', price: 95.00 },
      { number: '201', price: 120.00 },
    ];

    return rooms.map((room, index) => {
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + (index * 2) + 1);
      
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);

      const guests = [
        { firstName: 'María', lastName: 'García', email: 'maria.garcia@email.com', phone: '+34612345678' },
        { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos.rod@email.com', phone: '+34698765432' },
        { firstName: 'Ana', lastName: 'Martínez', email: 'ana.martinez@email.com', phone: '+34655555555' },
      ];

      const guest = guests[index];

      return {
        confirmation_code: `MOCK-${Date.now()}-${index}`,
        listing_id: room.number,
        room_id: room.number,
        guest_first_name: guest.firstName,
        guest_last_name: guest.lastName,
        guest_email: guest.email,
        guest_phone: guest.phone,
        start_date: checkIn.toISOString().split('T')[0],
        end_date: checkOut.toISOString().split('T')[0],
        nights: 3,
        status: 'accepted',
        number_of_adults: 2,
        number_of_children: index === 0 ? 1 : 0,
        price: room.price,
        currency: 'EUR',
      };
    });
  }

  /**
   * Importa una reserva desde Airbnb a la base de datos local
   */
  async importReservation(airbnbReservation) {
    // Extraer información de la reserva Airbnb
    const {
      confirmation_code,
      listing_id,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
      start_date,
      end_date,
      number_of_adults = 1,
      number_of_children = 0,
      status,
      price,
    } = airbnbReservation;

    // Buscar habitación por número
    const roomNumber = listing_id?.toString() || '';
    const room = await prisma.room.findFirst({
      where: { number: roomNumber },
    });

    if (!room) {
      console.warn(`Airbnb: Habitación #${roomNumber} no encontrada, omitiendo reserva ${confirmation_code}`);
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
    const checkIn = new Date(start_date);
    const checkOut = new Date(end_date);
    
    let totalAmount;
    if (price) {
      totalAmount = price;
    } else {
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      totalAmount = Number(room.pricePerNight) * nights;
    }

    // Verificar si ya existe esta reserva (por confirmation_code)
    const existing = await prisma.reservation.findFirst({
      where: { stripePaymentId: confirmation_code },
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
          adults: number_of_adults,
          children: number_of_children,
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
        source: 'AIRBNB',
        stripePaymentId: confirmation_code,
        adults: number_of_adults,
        children: number_of_children,
      },
    });

    return { success: true, action: 'created', reservationId: reservation.id };
  }

  /**
   * Importa múltiples reservas desde Airbnb
   */
  async importReservations(airbnbReservations) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    for (const reservation of airbnbReservations) {
      try {
        const result = await this.importReservation(reservation);
        if (result.success) {
          if (result.action === 'created') results.created++;
          else results.updated++;
        } else {
          results.failed++;
          results.errors.push({ code: reservation.confirmation_code, reason: result.reason });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ code: reservation.confirmation_code, reason: err.message });
      }
    }

    return results;
  }

  /**
   * Sincroniza todas las reservas desde Airbnb
   */
  async syncAllReservations() {
    const reservations = await this.fetchReservations();
    return this.importReservations(reservations);
  }

  /**
   * Desconecta el servicio limpiando tokens
   */
  disconnect() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  /**
   * Mapear estado de Airbnb a estado del PMS
   */
  mapStatus(airbnbStatus) {
    const statusMap = {
      accepted: 'CONFIRMED',
      pending: 'PENDING',
      cancelled: 'CANCELLED',
      declined: 'CANCELLED',
    };
    return statusMap[airbnbStatus?.toLowerCase()] || 'CONFIRMED';
  }
}

// Singleton instance
const airbnbService = new AirbnbService();

export default airbnbService;

// Función de conveniencia para usar en el router
export async function syncAirbnbReservations() {
  return airbnbService.syncAllReservations();
}
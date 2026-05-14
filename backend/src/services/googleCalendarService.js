import { google } from 'googleapis';
import crypto from 'crypto';
import prisma from '../config/database.js';

const MOCK_MODE = process.env.GOOGLE_CALENDAR_MOCK === 'true';
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/channels/google/callback'
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

class GoogleCalendarService {
  constructor() {
    this.connected = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  isConnected() {
    return this.connected && this.accessToken;
  }

  getAuthorizationUrl() {
    if (MOCK_MODE) return null;
    
    const state = crypto.randomBytes(16).toString('hex');
    return {
      url: oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state,
        prompt: 'consent',
      }),
      state,
    };
  }

  async exchangeCodeForTokens(code) {
    if (MOCK_MODE) {
      this.accessToken = 'mock_google_token_' + Date.now();
      this.refreshToken = 'mock_google_refresh_' + Date.now();
      this.expiresAt = new Date(Date.now() + 3600 * 1000);
      this.connected = true;
      return { success: true, mockMode: true };
    }

    const { tokens } = await oauth2Client.getToken(code);
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.expiresAt = new Date(tokens.expiry_date);
    this.connected = true;

    await this.saveTokens(tokens);
    return { success: true };
  }

  async saveTokens(tokens) {
    let channel = await prisma.channelConnection.findFirst({
      where: { channel: 'GOOGLE' }
    });

    if (channel) {
      await prisma.channelConnection.update({
        where: { id: channel.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expiry_date),
          isActive: true,
        }
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          channel: 'GOOGLE',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expiry_date),
          isActive: true,
        }
      });
    }
  }

  async loadTokens() {
    const channel = await prisma.channelConnection.findFirst({
      where: { channel: 'GOOGLE' }
    });
    return channel;
  }

  async disconnect() {
    this.connected = false;
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;

    await prisma.channelConnection.updateMany({
      where: { channel: 'GOOGLE' },
      data: { isActive: false }
    });

    return { success: true };
  }

  async syncReservations() {
    if (MOCK_MODE) {
      return {
        success: true,
        mockMode: true,
        eventsCreated: Math.floor(Math.random() * 10) + 1,
        lastSync: new Date().toISOString(),
      };
    }

    const channel = await this.loadTokens();
    if (!channel || !channel.accessToken) {
      throw new Error('Google Calendar no conectado');
    }

    oauth2Client.setCredentials({
      access_token: channel.accessToken,
      refresh_token: channel.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    const reservations = await prisma.reservation.findMany({
      where: {
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        checkIn: { gte: today, lte: endDate },
      },
      include: { guest: true, room: true },
    });

    let eventsCreated = 0;

    for (const r of reservations) {
      try {
        const guestName = r.guest ? r.guest.name : 'Huesped';
        const roomNumber = r.room ? r.room.number : 'N/A';
        
        const event = {
          summary: 'Reserva: ' + guestName,
          description: 'Habitacion: ' + roomNumber + '\nAdultos: ' + r.adults + '\nNinos: ' + r.children + '\nFuente: ' + r.source,
          start: {
            date: new Date(r.checkIn).toISOString().split('T')[0],
          },
          end: {
            date: new Date(r.checkOut).toISOString().split('T')[0],
          },
          colorId: r.status === 'CHECKED_IN' ? '2' : '9',
        };

        await calendar.events.insert({
          calendarId: CALENDAR_ID,
          resource: event,
        });
        eventsCreated++;
      } catch (err) {
        console.error('Error creating event for reservation', r.id, err.message);
      }
    }

    await prisma.channelConnection.update({
      where: { channel: 'GOOGLE' },
      data: { lastSync: new Date() }
    });

    return { success: true, eventsCreated };
  }
}

export default new GoogleCalendarService();

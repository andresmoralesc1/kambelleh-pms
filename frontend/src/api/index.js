import axios from 'axios';

const CSRF_TOKEN_KEY = 'csrfToken';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Request interceptor: add CSRF token to all state-changing requests
api.interceptors.request.use((config) => {
  // Only add CSRF token for state-changing methods
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    const token = localStorage.getItem(CSRF_TOKEN_KEY);
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

// Response interceptor: handle 401 (session expired) and other errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const refresh = () => api.post('/auth/refresh');

// Rooms
export const getRooms = (params) => api.get('/rooms', { params });
export const getRoom = (id) => api.get(`/rooms/${id}`);
export const createRoom = (data) => api.post('/rooms', data);
export const updateRoom = (id, data) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id) => api.delete(`/rooms/${id}`);
export const getRoomAvailability = (id, params) => api.get(`/rooms/${id}/availability`, { params });

// Reservations
export const getReservations = (params) => api.get('/reservations', { params });
export const getReservation = (id) => api.get(`/reservations/${id}`);
export const createReservation = (data) => api.post('/reservations', data);
export const updateReservation = (id, data) => api.put(`/reservations/${id}`, data);
export const updateReservationStatus = (id, status, cancellationReason) => api.patch(`/reservations/${id}/status`, { status, cancellationReason });
export const deleteReservation = (id) => api.delete(`/reservations/${id}`);

// Guests
export const getGuests = (params) => api.get('/guests', { params });
export const getGuest = (id) => api.get(`/guests/${id}`);
export const createGuest = (data) => api.post('/guests', data);
export const updateGuest = (id, data) => api.put(`/guests/${id}`, data);
export const deleteGuest = (id) => api.delete(`/guests/${id}`);

// Users / Staff
export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const changePassword = (id, data) => api.patch(`/users/${id}/password`, data);

// Payments
export const createPaymentIntent = (reservationId) => api.post('/payments/create-intent', { reservationId });
export const confirmPayment = (data) => api.post('/payments/confirm', data);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getDashboardCalendar = (params) => api.get('/dashboard/calendar', { params });
export const getDashboardAnalytics = (params) => api.get('/dashboard/analytics', { params });

// Internal Notes
export const getNotes = (params) => api.get('/notes', { params });
export const createNote = (data) => api.post('/notes', data);
export const deleteNote = (id) => api.delete(`/notes/${id}`);

// Cleaning
export const getCleaningRooms = () => api.get('/cleaning/rooms');
export const getRoomCleaningLogs = (roomId) => api.get(`/cleaning/rooms/${roomId}/cleaning-logs`);
export const updateRoomCleaningStatus = (roomId, status) => api.patch(`/cleaning/rooms/${roomId}/cleaning-status`, { status });
export const createCleaningLog = (roomId, data) => api.post(`/cleaning/rooms/${roomId}/cleaning-logs`, data);

// Exports
export const exportReservationsCSV = () => api.get('/exports/reservations', { responseType: 'blob' });
export const exportGuestsCSV = () => api.get('/exports/guests', { responseType: 'blob' });
export const exportRoomsCSV = () => api.get('/exports/rooms', { responseType: 'blob' });

// Channel Manager - Airbnb
export const getChannelStatus = () => api.get('/channels/airbnb/status');
export const connectAirbnbChannel = () => api.post('/channels/airbnb/connect');
export const disconnectAirbnbChannel = () => api.post('/channels/airbnb/disconnect');
export const syncAirbnbChannel = () => api.post('/channels/airbnb/sync');

// Channel Manager - Google Calendar
export const getGoogleCalendarStatus = () => api.get('/channels/google/status');
export const connectGoogleCalendar = () => api.post('/channels/google/connect');
export const disconnectGoogleCalendar = () => api.post('/channels/google/disconnect');
export const syncGoogleCalendar = () => api.post('/channels/google/sync');

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

export default api;
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

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
export const updateReservationStatus = (id, status) => api.patch(`/reservations/${id}/status`, { status });

// Guests
export const getGuests = (params) => api.get('/guests', { params });
export const getGuest = (id) => api.get(`/guests/${id}`);
export const createGuest = (data) => api.post('/guests', data);
export const updateGuest = (id, data) => api.put(`/guests/${id}`, data);
export const deleteGuest = (id) => api.delete(`/guests/${id}`);

// Payments
export const createPaymentIntent = (reservationId) => api.post('/payments/create-intent', { reservationId });
export const confirmPayment = (data) => api.post('/payments/confirm', data);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getDashboardCalendar = (params) => api.get('/dashboard/calendar', { params });
export const getDashboardAnalytics = (params) => api.get('/dashboard/analytics', { params });

export default api;
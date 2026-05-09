import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

// Keys factory
export const keys = {
  rooms: () => ['rooms'],
  room: (id) => ['rooms', id],
  reservations: (params) => ['reservations', params],
  reservation: (id) => ['reservations', id],
  guests: (params) => ['guests', params],
  guest: (id) => ['guests', id],
  dashboard: () => ['dashboard'],
  calendar: (month) => ['dashboard', 'calendar', month],
};

// Rooms
export function useRooms(params) {
  return useQuery({ queryKey: keys.rooms(), queryFn: () => api.getRooms(params).then(r => r.data) });
}
export function useRoom(id) {
  return useQuery({ queryKey: keys.room(id), queryFn: () => api.getRoom(id).then(r => r.data), enabled: !!id });
}
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createRoom, onSuccess: () => qc.invalidateQueries({ queryKey: keys.rooms() }) });
}
export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => api.updateRoom(id, data), onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: keys.room(id) }) });
}
export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteRoom, onSuccess: () => qc.invalidateQueries({ queryKey: keys.rooms() }) });
}

// Reservations
export function useReservations(params) {
  return useQuery({ queryKey: keys.reservations(params), queryFn: () => api.getReservations(params).then(r => r.data) });
}
export function useReservation(id) {
  return useQuery({ queryKey: keys.reservation(id), queryFn: () => api.getReservation(id).then(r => r.data), enabled: !!id });
}
export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createReservation, onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['reservations'] });
    qc.invalidateQueries({ queryKey: keys.calendar() });
  }});
}
export function useUpdateReservation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => api.updateReservation(id, data), onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: keys.reservation(id) }) });
}
export function useUpdateReservationStatus() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, status }) => api.updateReservationStatus(id, status), onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['reservations'] });
    qc.invalidateQueries({ queryKey: keys.dashboard() });
  }});
}

// Guests
export function useGuests(params) {
  return useQuery({ queryKey: keys.guests(params), queryFn: () => api.getGuests(params).then(r => r.data), placeholderData: { guests: [] } });
}
export function useGuest(id) {
  return useQuery({ queryKey: keys.guest(id), queryFn: () => api.getGuest(id).then(r => r.data), enabled: !!id });
}
export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createGuest, onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }) });
}
export function useUpdateGuest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => api.updateGuest(id, data), onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: keys.guest(id) }) });
}

// Dashboard
export function useDashboardStats() {
  return useQuery({ queryKey: keys.dashboard(), queryFn: () => api.getDashboardStats().then(r => r.data), refetchInterval: 60000 });
}
export function useDashboardCalendar(month) {
  return useQuery({ queryKey: keys.calendar(month), queryFn: () => api.getDashboardCalendar({ month }).then(r => r.data), enabled: !!month });
}

// Payments
export function useCreatePaymentIntent() {
  return useMutation({ mutationFn: api.createPaymentIntent });
}
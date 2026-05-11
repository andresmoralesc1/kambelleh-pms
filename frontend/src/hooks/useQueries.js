import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';
import { toast } from '../components/ToastProvider';

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
export function useDeleteGuest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteGuest, onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }) });
}

// Users / Staff
export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: () => api.getUsers().then(r => r.data), placeholderData: { users: [] } });
}
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado correctamente');
    },
    onError: () => {
      toast.error('Error al crear el usuario');
    },
  });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario actualizado correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar el usuario');
    },
  });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado correctamente');
    },
    onError: () => {
      toast.error('Error al eliminar el usuario');
    },
  });
}
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, data }) => api.changePassword(id, data),
    onSuccess: () => {
      toast.success('Contraseña actualizada correctamente');
    },
    onError: () => {
      toast.error('Error al cambiar la contraseña');
    },
  });
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

// Cleaning
export function useRoomCleaningLogs(roomId) {
  return useQuery({
    queryKey: ['rooms', roomId, 'cleaning-logs'],
    queryFn: () => api.getRoomCleaningLogs(roomId).then(r => r.data),
    enabled: !!roomId,
  });
}
export function useUpdateRoomCleaningStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, status }) => api.updateRoomCleaningStatus(roomId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms() });
      toast.success('Estado de limpieza actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar el estado de limpieza');
    },
  });
}
export function useCreateCleaningLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, data }) => api.createCleaningLog(roomId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rooms() });
      toast.success('Registro de limpieza creado');
    },
    onError: () => {
      toast.error('Error al crear el registro de limpieza');
    },
  });
}

// Internal Notes
export function useNotes(params) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: () => api.getNotes(params).then(r => r.data),
    enabled: !!params.guestId || !!params.reservationId,
  });
}
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings().then(r => r.data),
  });
}
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configuración guardada correctamente');
    },
    onError: () => {
      toast.error('Error al guardar la configuración');
    },
  });
}

// Channel Manager - Airbnb
export function useChannelStatus() {
  return useQuery({
    queryKey: ['channel', 'airbnb', 'status'],
    queryFn: () => api.getChannelStatus().then(r => r.data),
  });
}
export function useConnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.connectAirbnbChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channel', 'airbnb', 'status'] });
    },
  });
}
export function useDisconnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.disconnectAirbnbChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channel', 'airbnb', 'status'] });
    },
  });
}
export function useSyncChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.syncAirbnbChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: keys.dashboard() });
    },
  });
}
import { useState } from 'react';
import { DoorOpen, Plus, Pencil, Trash2, Bed, Wifi, Wind, Coffee, Tv, Search, Download } from 'lucide-react';
import { useRooms, useCreateRoom, useDeleteRoom } from '../hooks/useQueries';
import { useExportRooms } from '../hooks/useExport';
import { useSocket } from '../context/SocketContext';
import { formatCurrencyCompact } from '../utils/currency';
import { useToast } from '../components/ToastProvider';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const amenityIcons = { WiFi: Wifi, 'A/C': Wind, Desayuno: Coffee, TV: Tv };

const statusConfig = {
  AVAILABLE: { label: 'Libre', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  OCCUPIED: { label: 'Ocupada', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  MAINTENANCE: { label: 'Mantenimiento', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const typeLabels = { PRIVATE: 'Privada', SHARED: 'Compartida', DORM: 'Dormitorio' };

function RoomModal({ room, onClose }) {
  const [form, setForm] = useState(room || {
    number: '', name: '', type: 'PRIVATE', capacity: 2, pricePerNight: '', amenities: [], floor: 1,
  });
  const [error, setError] = useState('');
  const createRoom = useCreateRoom();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createRoom.mutateAsync({ ...form, pricePerNight: parseFloat(form.pricePerNight) });
      toast.success(room ? `Habitación #${form.number} actualizada` : `Habitación #${form.number} creada`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la habitación');
      toast.error(err.response?.data?.error || 'Error al guardar la habitación');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="room-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 id="room-modal-title" className="text-lg font-bold text-surface-900 mb-4">
          {room ? 'Editar' : 'Nueva'} habitación
        </h2>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Número *</label>
              <input
                value={form.number} onChange={e => setForm({ ...form, number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                required placeholder="101"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Piso</label>
              <input type="number" value={form.floor} onChange={e => setForm({ ...form, floor: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Nombre *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              required placeholder="Habitación Doble"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow">
                <option value="PRIVATE">Privada</option>
                <option value="SHARED">Compartida</option>
                <option value="DORM">Dormitorio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Capacidad</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Precio / noche (€) *</label>
            <input type="number" step="0.01" value={form.pricePerNight}
              onChange={e => setForm({ ...form, pricePerNight: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              required placeholder="65.00"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-700 mb-2">Comodidades</label>
            <div className="flex gap-2 flex-wrap">
              {['WiFi', 'A/C', 'Desayuno', 'TV'].map(a => (
                <button key={a} type="button"
                  onClick={() => setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a] })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.amenities.includes(a)
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'border-surface-300 text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="flex-1 px-4 py-2 rounded-xl border border-surface-300 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createRoom.isPending}
              className="flex-1 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {createRoom.isPending ? 'Guardando...' : room ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Rooms() {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [confirmState, setConfirmState] = useState(null);
  const { data, isLoading } = useRooms();
  const deleteRoom = useDeleteRoom();
  const toast = useToast();
  const exportRooms = useExportRooms();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Listen for room:updated to refetch room data in real time
  useEffect(() => {
    if (!socket) return;
    const handleRoomUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    };
    socket.on('room:updated', handleRoomUpdated);
    return () => socket.off('room:updated', handleRoomUpdated);
  }, [socket, queryClient]);

  const rooms = data?.rooms || [];
  const filtered = filter === 'ALL' ? rooms : rooms.filter(r => r.status === filter);

  const handleDelete = async (room) => {
    setConfirmState({
      title: 'Eliminar habitación',
      message: `¿Eliminar la habitación #${room.number} — ${room.name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      confirmVariant: 'danger',
      resolve: async (ok) => {
        if (!ok) return;
        try {
          await deleteRoom.mutateAsync(room.id);
          toast.success(`Habitación #${room.number} eliminada`);
        } catch (err) {
          toast.error(err.response?.data?.error || 'No se pudo eliminar la habitación');
        }
      },
    });
  };

  const handleConfirm = () => { confirmState?.resolve?.(true); setConfirmState(null); };
  const handleCancel = () => { confirmState?.resolve?.(false); setConfirmState(null); };

  const statusFilters = ['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
  const statusLabels = { ALL: 'Todas', AVAILABLE: 'Disponibles', OCCUPIED: 'Ocupadas', MAINTENANCE: 'Mantenimiento' };

  return (
    <div className="p-6 space-y-5" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Habitaciones</h1>
          <p className="text-surface-500 text-sm mt-0.5">{rooms.length} habitaciones registradas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportRooms}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-300 bg-white hover:bg-surface-50 text-surface-700 text-sm font-medium transition-colors"
            aria-label="Exportar habitaciones a CSV">
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            aria-label="Crear nueva habitación">
            <Plus className="w-4 h-4" aria-hidden="true" /> Nueva habitación
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-surface-800 text-white'
                : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
            aria-pressed={filter === f}>
            {statusLabels[f]}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-52 bg-surface-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-surface-500" />
          </div>
          <h3 className="font-semibold text-surface-700 mb-1">
            {filter === 'ALL' ? 'Sin habitaciones' : `No hay habitaciones ${statusLabels[filter].toLowerCase()}`}
          </h3>
          <p className="text-sm text-surface-500 mb-4 max-w-xs">
            {filter === 'ALL'
              ? 'Crea tu primera habitación para comenzar a gestionar reservas'
              : `No hay habitaciones en ${statusLabels[filter].toLowerCase()} actualmente`}
          </p>
          {filter === 'ALL' && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Crear habitación
            </button>
          )}
        </div>
      ) : (
        /* Room grid */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(room => {
            const status = statusConfig[room.status] || statusConfig.AVAILABLE;
            return (
              <div key={room.id}
                className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-md transition-shadow">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.bg.replace('100', '50')}`}>
                      <DoorOpen className={`w-5 h-5 ${status.text.replace('700', '600')}`} />
                    </div>
                    <div>
                      <p className="font-bold text-surface-900">#{room.number}</p>
                      <p className="text-xs text-surface-500">{typeLabels[room.type] || room.type}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${status.bg} ${status.text}`}
                    aria-label={`Estado: ${status.label}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
                    {status.label}
                  </span>
                </div>

                <h3 className="font-semibold text-surface-800 text-sm mb-1">{room.name}</h3>
                <p className="text-xs text-surface-500 mb-3">Piso {room.floor} · Capacidad {room.capacity}</p>

                {/* Amenities */}
                {room.amenities?.length > 0 && (
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {room.amenities.map(a => {
                      const Icon = amenityIcons[a] || Bed;
                      return (
                        <div key={a} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 text-surface-600"
                          title={a === 'WiFi' ? 'WiFi gratuito' : a === 'A/C' ? 'Aire acondicionado' : a === 'TV' ? 'Televisión' : a}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs">{a}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                  <span className="text-lg font-bold text-primary-600">{formatCurrencyCompact(room.pricePerNight)}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setShowModal(room)}
                      aria-label={`Editar habitación ${room.number}`}
                      className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(room)}
                      aria-label={`Eliminar habitación ${room.number}`}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-surface-500 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && <RoomModal room={showModal === true ? null : showModal} onClose={() => setShowModal(false)} />}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[90] p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900">{confirmState.title}</h2>
              </div>
            </div>
            <p className="text-sm text-surface-600 mb-6">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-surface-200 text-surface-700 text-sm font-medium hover:bg-surface-50 transition-colors">Cancelar</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">{confirmState.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
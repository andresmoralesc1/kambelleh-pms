import { useState } from 'react';
import { DoorOpen, Plus, Pencil, Trash2, Bed, Wifi, Wind, Coffee, Tv, More } from 'lucide-react';
import { useRooms, useCreateRoom, useDeleteRoom } from '../hooks/useQueries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

const amenityIcons = { WiFi: Wifi, 'A/C': Wind, Desayuno: Coffee, TV: Tv };

const statusColors = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  OCCUPIED: 'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-amber-100 text-amber-700',
};

const typeLabels = { PRIVATE: 'Privada', SHARED: 'Compartida', DORM: 'Dormitorio' };

function RoomModal({ room, onClose }) {
  const [form, setForm] = useState(room || { number: '', name: '', type: 'PRIVATE', capacity: 2, pricePerNight: '', amenities: [], floor: 1 });
  const createRoom = useCreateRoom();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createRoom.mutateAsync({ ...form, pricePerNight: parseFloat(form.pricePerNight) });
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating room');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-surface-900 mb-4">{room ? 'Editar' : 'Nueva'} habitación</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Número</label>
              <input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" required placeholder="101" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Piso</label>
              <input type="number" value={form.floor} onChange={e => setForm({ ...form, floor: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nombre</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" required placeholder="Habitación Doble" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm">
                <option value="PRIVATE">Privada</option>
                <option value="SHARED">Compartida</option>
                <option value="DORM">Dormitorio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Capacidad</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" min="1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Precio / noche (€)</label>
            <input type="number" step="0.01" value={form.pricePerNight} onChange={e => setForm({ ...form, pricePerNight: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" required placeholder="65.00" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['WiFi', 'A/C', 'Desayuno', 'TV'].map(a => (
              <button key={a} type="button" onClick={() => setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a] })} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${form.amenities.includes(a) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-surface-300 text-surface-500 hover:bg-surface-50'}`}>
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-surface-300 text-sm font-medium text-surface-600 hover:bg-surface-50">Cancelar</button>
            <button type="submit" disabled={createRoom.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {createRoom.isPending ? 'Guardando...' : room ? 'Actualizar' : 'Crear'}
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
  const { data, isLoading } = useRooms();
  const deleteRoom = useDeleteRoom();
  const qc = useQueryClient();

  const rooms = data?.rooms || [];
  const filtered = filter === 'ALL' ? rooms : rooms.filter(r => r.status === filter);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta habitación?')) return;
    try {
      await deleteRoom.mutateAsync(id);
    } catch (err) {
      alert(err.response?.data?.error || 'No se puede eliminar');
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Habitaciones</h1>
          <p className="text-surface-500 text-sm mt-0.5">{rooms.length} habitaciones registradas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva habitación
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['ALL', 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-surface-800 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
            {f === 'ALL' ? 'Todas' : f === 'AVAILABLE' ? 'Disponibles' : f === 'OCCUPIED' ? 'Ocupadas' : 'Mantenimiento'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? <RoomsSkeleton /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(room => (
            <div key={room.id} className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${room.status === 'OCCUPIED' ? 'bg-red-100 text-red-600' : room.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-surface-900">#{room.number}</p>
                    <p className="text-xs text-surface-500">{typeLabels[room.type]}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[room.status]}`}>
                  {room.status === 'AVAILABLE' ? 'Libre' : room.status === 'OCCUPIED' ? 'Ocupada' : 'Mantenimiento'}
                </span>
              </div>

              <h3 className="font-semibold text-surface-800 text-sm mb-1">{room.name}</h3>
              <p className="text-xs text-surface-400 mb-3">Piso {room.floor} · Capacidad {room.capacity}</p>

              {/* Amenities */}
              {room.amenities?.length > 0 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {room.amenities.map(a => {
                    const Icon = amenityIcons[a] || Bed;
                    return (
                      <div key={a} className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 text-surface-500" title={a}>
                        <Icon className="w-3 h-3" />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                <span className="text-lg font-bold text-primary-600">€{Number(room.pricePerNight).toFixed(2)}</span>
                <div className="flex gap-1">
                  <button onClick={() => setShowModal(room)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(room.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <RoomModal room={null} onClose={() => setShowModal(false)} />}
    </div>
  );
}

function RoomsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-surface-200 rounded-2xl animate-pulse" />)}
    </div>
  );
}
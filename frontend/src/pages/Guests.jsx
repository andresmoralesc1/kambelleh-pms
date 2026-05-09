import { useState } from 'react';
import { Plus, Search, Eye, User, Phone, Mail, MapPin, Pencil, X } from 'lucide-react';
import { useGuests, useCreateGuest, useUpdateGuest } from '../hooks/useQueries';

export default function Guests() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const { data, isLoading } = useGuests({ search });
  const createGuest = useCreateGuest();

  const guests = data?.guests || [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Huéspedes</h1>
          <p className="text-surface-500 text-sm mt-0.5">{guests.length} huéspedes registrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nuevo huésped
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, email o teléfono..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 bg-white text-sm" />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-surface-200 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map(guest => (
            <GuestCard key={guest.id} guest={guest} onEdit={() => { setEditingGuest(guest); setShowModal(true); }} />
          ))}
        </div>
      )}

      {showModal && <GuestModal guest={editingGuest} onClose={() => { setShowModal(false); setEditingGuest(null); }} />}
    </div>
  );
}

function GuestCard({ guest, onEdit }) {
  const totalReservations = guest._count?.reservations || 0;
  const lastReservation = guest.reservations?.[0];

  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-sm font-bold">
            {guest.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-surface-900">{guest.name}</p>
            <p className="text-xs text-surface-400">{totalReservations} reserva{totalReservations !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5 text-sm text-surface-600">
        {guest.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-surface-400" /> {guest.email}</div>}
        {guest.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-surface-400" /> {guest.phone}</div>}
        {guest.nationality && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-surface-400" /> {guest.nationality}</div>}
      </div>

      {lastReservation && (
        <div className="mt-3 pt-3 border-t border-surface-100 text-xs text-surface-400">
          Última reserva: Hab. {lastReservation.room?.number}
        </div>
      )}
    </div>
  );
}

function GuestModal({ guest, onClose }) {
  const [form, setForm] = useState(guest || { name: '', email: '', phone: '', documentType: '', documentNumber: '', nationality: '', notes: '' });
  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const isEditing = !!guest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateGuest.mutateAsync({ id: guest.id, data: form });
      } else {
        await createGuest.mutateAsync(form);
      }
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving guest');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900">{isEditing ? 'Editar' : 'Nuevo'} huésped</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nombre completo *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tipo documento</label>
              <select value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm">
                <option value="">Seleccionar</option>
                <option value="DNI">DNI</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="NIE">NIE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Nº Documento</label>
              <input value={form.documentNumber} onChange={e => setForm({ ...form, documentNumber: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Nacionalidad</label>
            <input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2" className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-surface-300 text-sm font-medium text-surface-600 hover:bg-surface-50">Cancelar</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
              {isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
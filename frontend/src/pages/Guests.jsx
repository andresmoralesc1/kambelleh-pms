import { useState } from 'react';
import { Plus, Search, Phone, Mail, MapPin, X, Users, Trash2, Download, StickyNote } from 'lucide-react';
import { useGuests, useCreateGuest, useUpdateGuest, useDeleteGuest, useNotes, useCreateNote, useDeleteNote } from '../hooks/useQueries';
import { useExportGuests } from '../hooks/useExport';
import { useToast } from '../components/ToastProvider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

function GuestModal({ guest, onClose }) {
  const [form, setForm] = useState(guest || {
    name: '', email: '', phone: '', documentType: '', documentNumber: '', nationality: '', notes: '',
    vip: false, blacklist: false,
  });
  const [error, setError] = useState('');
  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const toast = useToast();
  const isEditing = !!guest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isEditing) {
        await updateGuest.mutateAsync({ id: guest.id, data: form });
        toast.success('Huésped actualizado correctamente');
      } else {
        await createGuest.mutateAsync(form);
        toast.success('Huésped creado correctamente');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el huésped');
      toast.error(err.response?.data?.error || 'Error al guardar el huésped');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="guest-modal-title" className="text-lg font-bold text-surface-900">{isEditing ? 'Editar' : 'Nuevo'} huésped</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Nombre completo *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              required placeholder="María García López" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="maria@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="+34 600 000 000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Tipo documento</label>
              <select value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow">
                <option value="">Seleccionar</option>
                <option value="DNI">DNI</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="NIE">NIE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Nº Documento</label>
              <input value={form.documentNumber} onChange={e => setForm({ ...form, documentNumber: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="12345678A" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Nacionalidad</label>
            <input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              placeholder="Española" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows="2"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              placeholder="Alergias, preferencias, información relevante..." />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.vip} onChange={e => setForm({ ...form, vip: e.target.checked })}
                className="w-4 h-4 rounded border-surface-300 text-amber-500 focus:ring-amber-500" />
              <span className="text-sm font-medium text-amber-700">⭐ Cliente VIP</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.blacklist} onChange={e => setForm({ ...form, blacklist: e.target.checked })}
                className="w-4 h-4 rounded border-surface-300 text-red-500 focus:ring-red-500" />
              <span className="text-sm font-medium text-red-700">🚫 blacklist</span>
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createGuest.isPending || updateGuest.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {(createGuest.isPending || updateGuest.isPending) ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NoteModal({ guestId, onClose }) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [error, setError] = useState('');
  const createNote = useCreateNote();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createNote.mutateAsync({ content, authorName, guestId });
      toast.success('Nota agregada correctamente');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la nota');
      toast.error(err.response?.data?.error || 'Error al crear la nota');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="note-modal-title" className="text-lg font-bold text-surface-900">Agregar nota interna</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Tu nombre *</label>
            <input value={authorName} onChange={e => setAuthorName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              required placeholder="Recepción" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Nota *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows="4"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              required placeholder="Información relevante sobre el huésped..." />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createNote.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {createNote.isPending ? 'Guardando...' : 'Agregar nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GuestCard({ guest, onDelete }) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const { data: notesData, isLoading: notesLoading } = useNotes({ guestId: guest.id });
  const deleteNote = useDeleteNote();
  const toast = useToast();

  const notes = notesData?.notes || [];

  const handleDeleteNote = (note) => {
    setConfirmState({
      title: 'Eliminar nota',
      message: '¿Eliminar esta nota interna? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      confirmVariant: 'danger',
      resolve: async (ok) => {
        if (!ok) return;
        try {
          await deleteNote.mutateAsync(note.id);
          toast.success('Nota eliminada correctamente');
        } catch (err) {
          toast.error(err.response?.data?.error || 'No se pudo eliminar la nota');
        }
      },
    });
  };

  const handleConfirm = () => { confirmState?.resolve?.(true); setConfirmState(null); };
  const handleCancel = () => { confirmState?.resolve?.(false); setConfirmState(null); };

  const totalReservations = guest._count?.reservations || 0;
  const lastReservation = guest.reservations?.[0];

  return (
    <>
      <div className="bg-white rounded-2xl border border-surface-200 p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-sm font-bold">
              {guest.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-surface-900">{guest.name}</p>
                {guest.vip && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⭐ VIP</span>}
                {guest.blacklist && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">🚫</span>}
              </div>
              <p className="text-xs text-surface-500">{totalReservations} reserva{totalReservations !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => onDelete(guest)}
            aria-label={`Eliminar huésped ${guest.name}`}
            className="p-1.5 rounded-lg hover:bg-red-50 text-surface-500 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 text-sm text-surface-600">
          {guest.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
              <span className="truncate">{guest.email}</span>
            </div>
          )}
          {guest.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
              <span>{guest.phone}</span>
            </div>
          )}
          {guest.nationality && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
              <span>{guest.nationality}</span>
            </div>
          )}
        </div>

        {lastReservation && (
          <div className="mt-3 pt-3 border-t border-surface-100 text-xs text-surface-500">
            Última reserva: Hab. {lastReservation.room?.number}
          </div>
        )}

        {/* Notas internas */}
        <div className="mt-4 pt-3 border-t border-surface-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-surface-700">
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notas internas</span>
              <span className="text-surface-400">({notes.length})</span>
            </div>
            <button onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-medium transition-colors">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>

          {notesLoading ? (
            <div className="space-y-2">
              <div className="h-12 bg-surface-100 rounded-lg animate-pulse" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-xs text-surface-400 italic">Sin notas internas</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {notes.map(note => (
                <div key={note.id} className="bg-surface-50 rounded-lg p-2 text-xs group relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-surface-700 line-clamp-2">{note.content}</p>
                      <p className="text-surface-400 mt-1">
                        {note.authorName} • {format(new Date(note.createdAt), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteNote(note)}
                      className="p-1 rounded hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNoteModal && <NoteModal guestId={guest.id} onClose={() => setShowNoteModal(false)} />}
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
    </>
  );
}

export default function Guests() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const { data, isLoading } = useGuests({ search });
  const deleteGuest = useDeleteGuest();
  const toast = useToast();
  const exportGuests = useExportGuests();

  const guests = data?.guests || [];

  const handleDelete = (guest) => {
    setConfirmState({
      title: 'Eliminar huésped',
      message: `¿Eliminar a ${guest.name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      confirmVariant: 'danger',
      resolve: async (ok) => {
        if (!ok) return;
        try {
          await deleteGuest.mutateAsync(guest.id);
          toast.success(`Huésped ${guest.name} eliminado`);
        } catch (err) {
          toast.error(err.response?.data?.error || 'No se pudo eliminar el huésped');
        }
      },
    });
  };

  const handleConfirm = () => { confirmState?.resolve?.(true); setConfirmState(null); };
  const handleCancel = () => { confirmState?.resolve?.(false); setConfirmState(null); };

  return (
    <div className="p-6 space-y-5" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Huéspedes</h1>
          <p className="text-surface-500 text-sm mt-0.5">{guests.length} huéspedes registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportGuests}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-300 bg-white hover:bg-surface-50 text-surface-700 text-sm font-medium transition-colors"
            aria-label="Exportar huéspedes a CSV">
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            aria-label="Registrar nuevo huésped">
            <Plus className="w-4 h-4" aria-hidden="true" /> Nuevo huésped
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="relative max-w-md">
        <label htmlFor="guest-search" className="sr-only">Buscar huéspedes</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" aria-hidden="true" />
        <input id="guest-search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow" />
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-surface-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : guests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-surface-500" />
          </div>
          <h3 className="font-semibold text-surface-700 mb-1">Sin huéspedes</h3>
          <p className="text-sm text-surface-500 mb-4 max-w-xs">
            {search ? `No se encontraron huéspedes para "${search}"` : 'Registra tu primer huésped para gestionar reservas'}
          </p>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            aria-label="Registrar huésped">
            <Plus className="w-4 h-4" aria-hidden="true" /> Registrar huésped
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map(guest => (
            <GuestCard key={guest.id} guest={guest} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && <GuestModal guest={editingGuest} onClose={() => { setShowModal(false); setEditingGuest(null); }} />}
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
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, X, CheckCircle, XCircle, Clock, AlertCircle, CalendarDays, Download, StickyNote, Trash2 } from 'lucide-react';
import { useReservations, useUpdateReservationStatus, useNotes, useCreateNote, useDeleteNote } from '../hooks/useQueries';
import { useExportReservations } from '../hooks/useExport';
import { formatCurrencyCompact } from '../utils/currency';
import { useToast } from '../components/ToastProvider';

const statusConfig = {
  PENDING: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Confirmada', bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
  CHECKED_IN: { label: 'Check-in', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  CHECKED_OUT: { label: 'Check-out', bg: 'bg-surface-200', text: 'text-surface-500', icon: XCircle },
  CANCELLED: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <cfg.icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function NoteModal({ reservationId, onClose }) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [error, setError] = useState('');
  const createNote = useCreateNote();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createNote.mutateAsync({ content, authorName, reservationId });
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
              required placeholder="Información relevante sobre la reserva..." />
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

function ReservationModal({ reservation, onClose }) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const updateStatus = useUpdateReservationStatus();
  const { data: notesData, isLoading: notesLoading } = useNotes({ reservationId: reservation.id });
  const deleteNote = useDeleteNote();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const notes = notesData?.notes || [];

  const handleStatus = async (newStatus) => {
    // Cancellation requires a reason modal
    if (newStatus === 'CANCELLED') {
      setShowCancelModal(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status: newStatus });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Por favor ingresa un motivo de cancelación');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status: 'CANCELLED', cancellationReason: cancelReason.trim() });
      setShowCancelModal(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cancelar la reserva');
    } finally {
      setLoading(false);
    }
  };

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

  const statusActions = {
    PENDING: [
      { label: 'Confirmar reserva', status: 'CONFIRMED', color: 'bg-blue-600 hover:bg-blue-700' },
      { label: 'Cancelar reserva', status: 'CANCELLED', color: 'bg-red-50 hover:bg-red-100 text-red-700' },
    ],
    CONFIRMED: [
      { label: 'Realizar Check-in', status: 'CHECKED_IN', color: 'bg-emerald-600 hover:bg-emerald-700' },
      { label: 'Cancelar reserva', status: 'CANCELLED', color: 'bg-red-50 hover:bg-red-100 text-red-700' },
    ],
    CHECKED_IN: [{ label: 'Realizar Check-out', status: 'CHECKED_OUT', color: 'bg-surface-700 hover:bg-surface-800' }],
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 id="reservation-modal-title" className="text-lg font-bold text-surface-900">Reserva #{reservation.id.slice(0, 8)}</h2>
            <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Huésped</p>
                <p className="font-semibold text-surface-900">{reservation.guest?.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Habitación</p>
                <p className="font-semibold text-surface-900">#{reservation.room?.number} — {reservation.room?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Check-in</p>
                <p className="font-medium text-surface-700">{format(new Date(reservation.checkIn), 'dd MMM yyyy', { locale: es })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Check-out</p>
                <p className="font-medium text-surface-700">{format(new Date(reservation.checkOut), 'dd MMM yyyy', { locale: es })}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Adultos</p>
                <p className="font-medium">{reservation.adults}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Niños</p>
                <p className="font-medium">{reservation.children}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Total</p>
                <p className="font-bold text-primary-600">{formatCurrencyCompact(reservation.totalAmount)}</p>
              </div>
            </div>
            {reservation.specialRequests && (
              <div>
                <p className="text-xs font-medium text-surface-500 mb-0.5">Solicitudes especiales</p>
                <p className="text-surface-700">{reservation.specialRequests}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-surface-500 mb-0.5">Estado</p>
              <StatusBadge status={reservation.status} />
            </div>
          </div>

          {/* Notas internas */}
          <div className="mt-5 pt-4 border-t border-surface-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-surface-700">
                <StickyNote className="w-3.5 h-3.5" />
                <span>Notas internas</span>
                <span className="text-surface-400">({notes.length})</span>
              </div>
              <button onClick={() => setShowNoteModal(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-medium transition-colors">
                <Plus className="w-3 h-3" /> Agregar nota
              </button>
            </div>

            {notesLoading ? (
              <div className="space-y-2">
                <div className="h-12 bg-surface-100 rounded-lg animate-pulse" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-xs text-surface-400 italic">Sin notas internas para esta reserva</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="bg-surface-50 rounded-lg p-2 text-xs group relative">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-surface-700 line-clamp-2">{note.content}</p>
                        <p className="text-surface-400 mt-1">
                          {note.authorName} • {format(new Date(note.createdAt), 'dd MMM yyyy HH:mm', { locale: es })}
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

          {/* Actions */}
          {(statusActions[reservation.status] || []).length > 0 && (
            <div className="mt-5 pt-4 border-t border-surface-200 space-y-2">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Acciones rápidas</p>
              {statusActions[reservation.status].map(action => (
                <button key={action.status} onClick={() => handleStatus(action.status)} disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 ${action.color}`}>
                  {loading ? 'Procesando...' : action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNoteModal && <NoteModal reservationId={reservation.id} onClose={() => setShowNoteModal(false)} />}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[90] p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-surface-900">Cancelar reserva</h2>
            </div>
            <p className="text-sm text-surface-600 mb-4">Por favor ingresa el motivo de la cancelación.</p>
            {error && <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows="3"
              placeholder="Ej: Cliente solicitó cancelación por cambio de planes"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowCancelModal(false); setCancelReason(''); setError(''); }}
                className="px-4 py-2 rounded-xl border border-surface-200 text-surface-700 text-sm font-medium hover:bg-surface-50 transition-colors">
                Volver
              </button>
              <button onClick={handleConfirmCancel} disabled={loading}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                {loading ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic confirm dialog */}
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

export default function Reservations() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading } = useReservations();
  const exportReservations = useExportReservations();

  const reservations = data?.reservations || [];
  const filtered = reservations.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch = !search || r.guest?.name?.toLowerCase().includes(search.toLowerCase()) || r.room?.number?.includes(search);
    return matchStatus && matchSearch;
  });

  const statusFilters = ['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
  const statusLabels = { ALL: 'Todas', PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CHECKED_IN: 'Check-in', CHECKED_OUT: 'Check-out', CANCELLED: 'Cancelada' };

  return (
    <div className="p-6 space-y-5" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reservas</h1>
          <p className="text-surface-500 text-sm mt-0.5">{filtered.length} reservas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportReservations}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-300 bg-white hover:bg-surface-50 text-surface-700 text-sm font-medium transition-colors"
            aria-label="Exportar reservas a CSV">
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar CSV
          </button>
          <Link to="/reservations/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            aria-label="Crear nueva reserva">
            <Plus className="w-4 h-4" aria-hidden="true" /> Nueva reserva
          </Link>
        </div>
      </header>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="reservation-search" className="sr-only">Buscar reservas</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" aria-hidden="true" />
          <input id="reservation-search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por huésped o habitación..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow" />
        </div>
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtrar por estado">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-surface-800 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
              }`}
              aria-pressed={statusFilter === s}>
              {statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-surface-200 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <CalendarDays className="w-7 h-7 text-surface-500" />
          </div>
          <h3 className="font-semibold text-surface-700 mb-1">Sin resultados</h3>
          <p className="text-sm text-surface-500 max-w-xs">
            {search ? `No se encontraron reservas para "${search}"` : 'No hay reservas con estos filtros'}
          </p>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]" role="table" aria-label="Lista de reservas">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Huésped</th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Habitación</th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Fechas</th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Total</th>
                  <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Estado</th>
                  <th scope="col" className="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-surface-900 text-sm">{r.guest?.name}</p>
                      <p className="text-xs text-surface-500">{r.guest?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-surface-700 text-sm">#{r.room?.number}</p>
                      <p className="text-xs text-surface-500">{r.room?.name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-surface-700">
                        {format(new Date(r.checkIn), 'dd MMM', { locale: es })} → {format(new Date(r.checkOut), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-primary-600 text-sm">{formatCurrencyCompact(r.totalAmount)}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setSelected(r)}
                        aria-label={`Ver detalles de reserva de ${r.guest?.name}`}
                        className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && <ReservationModal reservation={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
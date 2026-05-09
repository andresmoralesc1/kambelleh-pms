import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';;
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, X, CheckCircle, XCircle, Clock, AlertCircle, CalendarDays } from 'lucide-react';
import { useReservations, useUpdateReservationStatus } from '../hooks/useQueries';

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

function ReservationModal({ reservation, onClose }) {
  const updateStatus = useUpdateReservationStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStatus = async (newStatus) => {
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

  const statusActions = {
    PENDING: [{ label: 'Confirmar reserva', status: 'CONFIRMED', color: 'bg-blue-600 hover:bg-blue-700' }],
    CONFIRMED: [{ label: 'Realizar Check-in', status: 'CHECKED_IN', color: 'bg-emerald-600 hover:bg-emerald-700' }],
    CHECKED_IN: [{ label: 'Realizar Check-out', status: 'CHECKED_OUT', color: 'bg-surface-700 hover:bg-surface-800' }],
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900">Reserva #{reservation.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
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
              <p className="font-bold text-primary-600">€{Number(reservation.totalAmount).toFixed(2)}</p>
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

        {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
          <div className="mt-2">
            <button onClick={() => handleStatus('CANCELLED')} disabled={loading}
              className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors">
              Cancelar reserva
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reservations() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading } = useReservations();

  const reservations = data?.reservations || [];
  const filtered = reservations.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch = !search || r.guest?.name?.toLowerCase().includes(search.toLowerCase()) || r.room?.number?.includes(search);
    return matchStatus && matchSearch;
  });

  const statusFilters = ['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
  const statusLabels = { ALL: 'Todas', PENDING: 'Pendiente', CONFIRMED: 'Confirmada', CHECKED_IN: 'Check-in', CHECKED_OUT: 'Check-out', CANCELLED: 'Cancelada' };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reservas</h1>
          <p className="text-surface-500 text-sm mt-0.5">{filtered.length} reservas</p>
        </div>
        <Link to="/reservations/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva reserva
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por huésped o habitación..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-surface-800 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
              }`}>
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
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Huésped</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Habitación</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Fechas</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Acciones</th>
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
                      <p className="font-semibold text-primary-600 text-sm">€{Number(r.totalAmount).toFixed(2)}</p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => setSelected(r)}
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
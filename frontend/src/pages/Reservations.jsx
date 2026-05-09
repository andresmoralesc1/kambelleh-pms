import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useReservations, useUpdateReservationStatus } from '../hooks/useQueries';

const statusConfig = {
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  CONFIRMED: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  CHECKED_IN: { label: 'Check-in', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  CHECKED_OUT: { label: 'Check-out', color: 'bg-surface-200 text-surface-500', icon: XCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function ReservationModal({ reservation, onClose }) {
  const updateStatus = useUpdateReservationStatus();
  const [loading, setLoading] = useState(false);

  const handleStatus = async (newStatus) => {
    setLoading(true);
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status: newStatus });
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900">Reserva #{reservation.id.slice(0, 8)}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-surface-500 text-xs">Huésped</p>
              <p className="font-medium text-surface-900">{reservation.guest?.name}</p>
            </div>
            <div>
              <p className="text-surface-500 text-xs">Habitación</p>
              <p className="font-medium text-surface-900">#{reservation.room?.number} — {reservation.room?.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-surface-500 text-xs">Check-in</p>
              <p className="font-medium">{format(new Date(reservation.checkIn), 'dd MMM yyyy', { locale: es })}</p>
            </div>
            <div>
              <p className="text-surface-500 text-xs">Check-out</p>
              <p className="font-medium">{format(new Date(reservation.checkOut), 'dd MMM yyyy', { locale: es })}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-surface-500 text-xs">Adultos</p>
              <p className="font-medium">{reservation.adults}</p>
            </div>
            <div>
              <p className="text-surface-500 text-xs">Niños</p>
              <p className="font-medium">{reservation.children}</p>
            </div>
            <div>
              <p className="text-surface-500 text-xs">Total</p>
              <p className="font-bold text-primary-600">€{Number(reservation.totalAmount).toFixed(2)}</p>
            </div>
          </div>
          {reservation.specialRequests && (
            <div>
              <p className="text-surface-500 text-xs">Solicitudes especiales</p>
              <p className="text-surface-700">{reservation.specialRequests}</p>
            </div>
          )}
          <div>
            <p className="text-surface-500 text-xs">Estado</p>
            <StatusBadge status={reservation.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-surface-200 space-y-2">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">Acciones rápidas</p>
          {reservation.status === 'PENDING' && (
            <button onClick={() => handleStatus('CONFIRMED')} disabled={loading} className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Confirmar reserva
            </button>
          )}
          {reservation.status === 'CONFIRMED' && (
            <button onClick={() => handleStatus('CHECKED_IN')} disabled={loading} className="w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              Realizar Check-in
            </button>
          )}
          {reservation.status === 'CHECKED_IN' && (
            <button onClick={() => handleStatus('CHECKED_OUT')} disabled={loading} className="w-full py-2 rounded-xl bg-surface-700 text-white text-sm font-medium hover:bg-surface-800 disabled:opacity-50">
              Realizar Check-out
            </button>
          )}
          {(reservation.status === 'PENDING' || reservation.status === 'CONFIRMED') && (
            <button onClick={() => handleStatus('CANCELLED')} disabled={loading} className="w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
              Cancelar reserva
            </button>
          )}
        </div>
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

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reservas</h1>
          <p className="text-surface-500 text-sm mt-0.5">{filtered.length} reservas</p>
        </div>
        <Link to="/reservations/new" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nueva reserva
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por huésped o habitación..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 bg-white text-sm" />
        </div>
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-surface-800 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'}`}>
              {s === 'ALL' ? 'Todas' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-surface-200 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-surface-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No se encontraron reservas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Huésped</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Habitación</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Fechas</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Estado</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-surface-900 text-sm">{r.guest?.name}</p>
                    <p className="text-xs text-surface-400">{r.guest?.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-surface-700 text-sm">#{r.room?.number}</p>
                    <p className="text-xs text-surface-400">{r.room?.name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-surface-700">{format(new Date(r.checkIn), 'dd MMM', { locale: es })} → {format(new Date(r.checkOut), 'dd MMM', { locale: es })}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-primary-600 text-sm">€{Number(r.totalAmount).toFixed(2)}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setSelected(r)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <ReservationModal reservation={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
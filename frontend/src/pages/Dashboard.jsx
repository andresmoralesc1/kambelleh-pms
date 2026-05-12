import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Bed, TrendingUp, Users, CalendarDays, ArrowRight, Sunrise, Sun, Moon, Download, LogIn, LogOut } from 'lucide-react';
import { useDashboardStats } from '../hooks/useQueries';
import { useUpdateReservationStatus } from '../hooks/useQueries';
import { useExportReservations } from '../hooks/useExport';
import { Link } from 'react-router-dom';
import { formatCurrencyCompact } from '../utils/currency';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Buenas noches', icon: Moon };
  if (hour < 12) return { text: 'Buenos días', icon: Sunrise };
  if (hour < 20) return { text: 'Buenas tardes', icon: Sun };
  return { text: 'Buenas noches', icon: Moon };
}

// Deterministic room color by index
const ROOM_COLOR_CLASSES = [
  'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
];
export function roomColor(index) {
  return ROOM_COLOR_CLASSES[index % ROOM_COLOR_CLASSES.length];
}

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-surface-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ArrivalRow({ reservation, onAction }) {
  const { guest, room, checkIn, status } = reservation;
  const canCheckIn = status === 'PENDING' || status === 'CONFIRMED';
  return (
    <div role="listitem" className="flex items-center gap-3 py-2.5 border-b border-surface-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-semibold flex-shrink-0" aria-hidden="true">
        {guest.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-900 truncate">{guest.name}</p>
        <p className="text-xs text-surface-500">Hab. {room.number}</p>
      </div>
      <div className="text-right flex-shrink-0 flex items-center gap-2">
        <div>
          <p className="text-xs font-medium text-surface-700">{format(new Date(checkIn), 'HH:mm')}</p>
          <p className="text-xs text-surface-500">{format(new Date(checkIn), 'dd MMM', { locale: es })}</p>
        </div>
        {canCheckIn && (
          <button
            onClick={() => onAction(reservation.id, 'CHECKED_IN')}
            aria-label={`Realizar check-in de ${guest.name}`}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            title="Check-in">
            <LogIn className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function DepartureRow({ reservation, onAction }) {
  const { guest, room, checkOut } = reservation;
  return (
    <div role="listitem" className="flex items-center gap-3 py-2.5 border-b border-surface-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 text-xs font-semibold flex-shrink-0" aria-hidden="true">
        {guest.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-900 truncate">{guest.name}</p>
        <p className="text-xs text-surface-500">Hab. {room.number}</p>
      </div>
      <div className="text-right flex-shrink-0 flex items-center gap-2">
        <div>
          <p className="text-xs font-medium text-surface-700">{format(new Date(checkOut), 'HH:mm')}</p>
          <p className="text-xs text-surface-500">{format(new Date(checkOut), 'dd MMM', { locale: es })}</p>
        </div>
        <button
          onClick={() => onAction(reservation.id, 'CHECKED_OUT')}
          aria-label={`Realizar check-out de ${guest.name}`}
          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
          title="Check-out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useDashboardStats();
  const updateStatus = useUpdateReservationStatus();
  const exportReservations = useExportReservations();
  const stats = data?.stats;
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const handleStatusAction = async (id, status) => {
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      // mutation has own error toast, no need to handle here
    }
  };

  const dateStr = format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-6" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center" aria-hidden="true">
            <GreetingIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{greeting.text}</h1>
            <p className="text-surface-500 text-sm mt-0.5 capitalize">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportReservations}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-300 bg-white hover:bg-surface-50 text-surface-700 text-sm font-medium transition-colors"
            aria-label="Exportar reservas del mes a CSV">
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar mes
          </button>
          <Link to="/reservations/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            aria-label="Crear nueva reserva">
            + Nueva reserva
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bed} label="Ocupación" value={`${stats?.occupancyRate || 0}%`}
          sub={`${stats?.occupiedToday || 0} de ${stats?.totalRooms || 0} habitaciones`} color="primary" />
        <StatCard icon={TrendingUp} label="Ingresos del mes" value={formatCurrencyCompact(stats?.revenueThisMonth || 0)}
          sub="Completados" color="green" />
        <StatCard icon={CalendarDays} label="Llegadas hoy" value={stats?.arrivalsToday || 0}
          sub="Reservas confirmadas" color="blue" />
        <StatCard icon={Users} label="Salidas hoy" value={stats?.departuresToday || 0}
          sub="Clientes que se van" color="amber" />
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Arrivals today */}
        <section className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm" aria-labelledby="arrivals-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="arrivals-heading" className="font-semibold text-surface-900">Llegadas de hoy</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium" aria-label={`${stats?.arrivalsToday || 0} llegadas`}>{stats?.arrivalsToday || 0}</span>
          </div>
          {stats?.arrivalsToday > 0 ? (
            <div role="list" aria-label="Lista de llegadas de hoy">
              {stats.arrivals?.slice(0, 5).map((r) => (
                <ArrivalRow key={r.id} reservation={r} onAction={handleStatusAction} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-500" role="status" aria-live="polite">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
              <p className="text-sm">No hay llegadas hoy</p>
            </div>
          )}
        </section>

        {/* Departures today */}
        <section className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm" aria-labelledby="departures-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="departures-heading" className="font-semibold text-surface-900">Salidas de hoy</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium" aria-label={`${stats?.departuresToday || 0} salidas`}>{stats?.departuresToday || 0}</span>
          </div>
          {stats?.departuresToday > 0 ? (
            <div role="list" aria-label="Lista de salidas de hoy">
              {stats.departures?.slice(0, 5).map((r) => (
                <DepartureRow key={r.id} reservation={r} onAction={handleStatusAction} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-500" role="status" aria-live="polite">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
              <p className="text-sm">No hay salidas hoy</p>
            </div>
          )}
        </section>

        {/* Upcoming reservations */}
        <section className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm lg:col-span-2" aria-labelledby="upcoming-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="upcoming-heading" className="font-semibold text-surface-900">Próximas reservas</h2>
            <Link to="/reservations" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1" aria-label="Ver todas las reservas">
              Ver todas <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
          {stats?.upcomingArrivals?.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" role="list" aria-label="Próximas reservas">
              {stats.upcomingArrivals.map((r) => (
                <div key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-surface-300 transition-colors"
                  role="listitem">
                  <div className="w-9 h-9 rounded-full bg-surface-100 flex items-center justify-center text-sm font-semibold text-surface-600 flex-shrink-0" aria-hidden="true">
                    {r.guest.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">{r.guest.name}</p>
                    <p className="text-xs text-surface-500">Hab. {r.room.number} · {format(new Date(r.checkIn), 'dd MMM', { locale: es })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-surface-500 text-sm" role="status" aria-live="polite">No hay reservas próximas</p>
          )}
        </section>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-200 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-6 w-32 bg-surface-200 rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-surface-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-200 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-surface-200 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );
}
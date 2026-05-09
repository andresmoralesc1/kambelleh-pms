import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bed, TrendingUp, Users, CalendarDays, ArrowRight, AlertCircle } from 'lucide-react';
import { useDashboardStats } from '../hooks/useQueries';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-surface-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ArrivalRow({ guest, room, checkIn }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-semibold">
        {guest.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-900">{guest.name}</p>
        <p className="text-xs text-surface-500">Hab. {room.number}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium text-surface-700">{format(new Date(checkIn), 'HH:mm')}</p>
        <p className="text-xs text-surface-400">{format(new Date(checkIn), 'dd MMM', { locale: es })}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useDashboardStats();
  const stats = data?.stats;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Buenos días</h1>
          <p className="text-surface-500 text-sm mt-0.5">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <Link to="/reservations/new" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
          + Nueva reserva
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bed} label="Ocupación" value={`${stats?.occupancyRate || 0}%`} sub={`${stats?.occupiedToday || 0} de ${stats?.totalRooms || 0} habitaciones`} color="primary" />
        <StatCard icon={TrendingUp} label="Ingresos del mes" value={`€${(stats?.revenueThisMonth || 0).toFixed(2)}`} sub="Completados" color="green" />
        <StatCard icon={CalendarDays} label="Llegadas hoy" value={stats?.arrivalsToday || 0} sub="Reservas confirmadas" color="blue" />
        <StatCard icon={Users} label="Salidas hoy" value={stats?.departuresToday || 0} sub="Clientes que se van" color="amber" />
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Arrivals today */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-900">Llegadas de hoy</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary-600 font-medium">{stats?.arrivalsToday || 0}</span>
          </div>
          {stats?.arrivalsToday > 0 ? (
            <div>
              {stats.arrivals?.slice(0, 5).map((r) => (
                <ArrivalRow key={r.id} guest={r.guest} room={r.room} checkIn={r.checkIn} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay llegadas hoy</p>
            </div>
          )}
        </div>

        {/* Departures today */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-900">Salidas de hoy</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">{stats?.departuresToday || 0}</span>
          </div>
          {stats?.departuresToday > 0 ? (
            <div>
              {stats.departures?.slice(0, 5).map((r) => (
                <ArrivalRow key={r.id} guest={r.guest} room={r.room} checkIn={r.checkIn} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay salidas hoy</p>
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-900">Próximas reservas</h2>
            <Link to="/reservations" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.upcomingArrivals?.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.upcomingArrivals.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-surface-300 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-surface-100 flex items-center justify-center text-sm font-semibold text-surface-600">
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
            <p className="text-center py-6 text-surface-400 text-sm">No hay reservas próximas</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-surface-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-surface-200 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );
}
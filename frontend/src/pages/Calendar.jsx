import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { ChevronLeft, ChevronRight, Plus, Bed, Star, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardCalendar } from '../hooks/useQueries';
import { roomColor } from './Dashboard';

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-emerald-100 text-emerald-700',
  CHECKED_OUT: 'bg-surface-200 text-surface-600',
  CANCELLED: 'bg-red-100 text-red-600',
};

const SOURCE_BADGE = {
  AIRBNB: 'bg-purple-100 text-purple-700',
  BOOKING: 'bg-blue-100 text-blue-700',
  EXPEDIA: 'bg-orange-100 text-orange-700',
  WALKIN: 'bg-teal-100 text-teal-700',
  DIRECT: 'bg-surface-100 text-surface-600',
};

function StatusBadge({ status }) {
  const labels = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    CHECKED_IN: 'Ocupada',
    CHECKED_OUT: 'Completada',
    CANCELLED: 'Cancelada',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[status] || 'bg-surface-100 text-surface-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function OverflowPopover({ reservations, day, onClose }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 mt-1 w-72 bg-white rounded-xl border border-surface-200 shadow-xl overflow-hidden"
      style={{ top: '100%', left: 0 }}
    >
      {/* Popover header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-100 bg-surface-50">
        <span className="text-xs font-semibold text-surface-700">
          {format(day, "d 'de' MMMM", { locale: es })} — {reservations.length} reservas
        </span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-surface-200 text-surface-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Reservation list */}
      <div className="max-h-64 overflow-y-auto divide-y divide-surface-100">
        {reservations.map((r) => {
          const isCheckIn = isSameDay(new Date(r.checkIn), day);
          const isCheckOut = isSameDay(new Date(r.checkOut), day);
          return (
            <Link
              key={r.id}
              to={`/reservations?id=${r.id}`}
              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-50 transition-colors no-underline"
              onClick={onClose}
            >
              {/* Room color indicator */}
              <div className={`w-1.5 h-10 rounded-full flex-shrink-0 mt-0.5 ${roomColor(r.room?.id)}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-surface-800 truncate">
                    {r.guest?.name}
                  </span>
                  {r.guest?.vip && <Star className="w-3 h-3 text-amber-400 flex-shrink-0 fill-amber-400" />}
                  {r.guest?.blacklist && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                </div>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <Bed className="w-3 h-3 text-surface-400" />
                  <span className="text-xs text-surface-600">
                    Hab. {r.room?.number} {r.room?.name && `— ${r.room.name}`}
                  </span>
                </div>

                {/* Check-in/out label */}
                {(isCheckIn || isCheckOut) && (
                  <div className={`mt-0.5 text-[10px] font-medium ${isCheckIn ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isCheckIn ? '→ Entrada' : '← Salida'} · {format(new Date(isCheckIn ? r.checkIn : r.checkOut), 'HH:mm')}
                  </div>
                )}
              </div>

              {/* Right side: status + source */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge status={r.status} />
                {r.source && r.source !== 'DIRECT' && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_BADGE[r.source] || 'bg-surface-100 text-surface-600'}`}>
                    {r.source}
                  </span>
                )}
                <ExternalLink className="w-3 h-3 text-surface-300 mt-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
      {/* Header skeleton */}
      <div className="grid grid-cols-7 border-b border-surface-200">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="py-2.5 text-center">
            <div className="h-3 w-6 mx-auto bg-surface-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Days skeleton */}
      <div className="grid grid-cols-7">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="min-h-[100px] border-b border-r border-surface-100 p-2">
            <div className="w-7 h-7 rounded-full mx-auto mb-2 bg-surface-100 animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 rounded bg-surface-100 animate-pulse" />
              <div className="h-4 rounded bg-surface-100 animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const VISIBLE_RESERVATIONS = 3;

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overflowState, setOverflowState] = useState(null); // { day: Date, reservations: [], anchorRef }
  const monthKey = format(currentMonth, 'yyyy-MM');
  const { data, isLoading } = useDashboardCalendar(monthKey, roomFilter || undefined, statusFilter || undefined);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const reservations = data?.reservations || [];
  const blockedDates = data?.blockedDates || [];
  const rooms = data?.rooms || [];

  const getResForDay = (day) => {
    return reservations.filter(r => {
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
      return day >= checkIn && day < checkOut;
    });
  };

  const getBlockedForDay = (day) => {
    return blockedDates.filter(b => isSameDay(new Date(b.date), day));
  };

  const handleOverflowClick = (e, day, dayReservations) => {
    e.stopPropagation();
    setOverflowState({ day, reservations: dayReservations });
  };

  // Close overflow when navigating months
  useEffect(() => {
    setOverflowState(null);
  }, [monthKey]);

  const hasActiveFilters = roomFilter || statusFilter;

  return (
    <div className="p-6 space-y-4" onClick={() => setOverflowState(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Calendario</h1>
          <p className="text-surface-500 text-sm mt-0.5 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-200 hover:bg-surface-300 text-surface-600 transition-colors"
            aria-label="Ir a hoy"
          >
            Hoy
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <Link to="/reservations/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors ml-2"
            aria-label="Crear nueva reserva"
          >
            <Plus className="w-4 h-4" /> Nueva reserva
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Room filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="room-filter" className="text-xs font-medium text-surface-600 whitespace-nowrap">
            Habitación:
          </label>
          <select
            id="room-filter"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="text-sm border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todas las habitaciones</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.number} — {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs font-medium text-surface-600 whitespace-nowrap">
            Estado:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="CHECKED_IN">Ocupada</option>
            <option value="CHECKED_OUT">Completada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={() => { setRoomFilter(''); setStatusFilter(''); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        )}

        {/* Active filter count */}
        {hasActiveFilters && (
          <span className="text-xs text-surface-500">
            ({reservations.length} reserva{reservations.length !== 1 ? 's' : ''} encontrada{reservations.length !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-surface-600" role="list" aria-label="Leyenda del calendario">
        <div className="flex items-center gap-1.5" role="listitem">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" aria-hidden="true" /> Entrada
        </div>
        <div className="flex items-center gap-1.5" role="listitem">
          <div className="w-3 h-3 rounded-sm bg-amber-500" aria-hidden="true" /> Salida
        </div>
        <div className="flex items-center gap-1.5" role="listitem">
          <div className="w-3 h-3 rounded-sm bg-surface-400" aria-hidden="true" /> Bloqueado
        </div>
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div
          className="bg-white rounded-2xl border border-surface-200 overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-surface-200" role="row">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-surface-500 uppercase tracking-wide" role="columnheader">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7" role="grid" aria-label={`Calendario de ${format(currentMonth, 'MMMM yyyy', { locale: es })}`}>
            {days.map((day, idx) => {
              const dayReservations = getResForDay(day);
              const dayBlocked = getBlockedForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const visibleReservations = dayReservations.slice(0, VISIBLE_RESERVATIONS);
              const overflowCount = dayReservations.length - VISIBLE_RESERVATIONS;
              const isOverflowOpen = overflowState &&
                isSameDay(overflowState.day, day) &&
                overflowState.reservations.length === dayReservations.length;

              return (
                <div key={idx}
                  className={`min-h-[110px] border-b border-r border-surface-100 p-1.5 ${!inMonth ? 'bg-surface-50' : ''}`}
                  role="gridcell"
                  aria-label={format(day, "EEEE, d 'de' MMMM", { locale: es })}
                >
                  {/* Day number */}
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isCurrentDay ? 'bg-primary-600 text-white' : inMonth ? 'text-surface-700' : 'text-surface-300'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Reservations */}
                  <div className="space-y-0.5">
                    {visibleReservations.map((r) => {
                      const isCheckIn = isSameDay(new Date(r.checkIn), day);
                      const isCheckOut = isSameDay(new Date(r.checkOut), day);
                      const isCancelled = r.status === 'CANCELLED';

                      return (
                        <Link
                          key={r.id}
                          to={`/reservations?id=${r.id}`}
                          className={`group relative flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncate text-white no-underline transition-opacity hover:opacity-80 ${
                            isCancelled ? 'bg-surface-300 line-through' :
                            isCheckIn ? 'bg-emerald-500' : isCheckOut ? 'bg-amber-500' : 'bg-primary-500'
                          }`}
                          title={`${r.guest?.name} — Hab. ${r.room?.number}${isCheckIn ? ' · Entrada' : ''}${isCheckOut ? ' · Salida' : ''}`}
                        >
                          {/* Color bar */}
                          <div className={`w-1 h-3 rounded-full flex-shrink-0 ${roomColor(r.room?.id)}`} />

                          {/* Guest name */}
                          <span className="truncate flex-1">
                            {isCheckIn && <span className="mr-0.5">→</span>}
                            {isCheckOut && <span className="mr-0.5">←</span>}
                            {r.guest?.name}
                          </span>

                          {/* VIP / blacklist indicators */}
                          {r.guest?.vip && <Star className="w-2.5 h-2.5 text-amber-300 flex-shrink-0 fill-amber-300" />}
                          {r.guest?.blacklist && <AlertTriangle className="w-2.5 h-2.5 text-red-300 flex-shrink-0" />}
                        </Link>
                      );
                    })}

                    {/* Overflow button — click to open popover */}
                    {overflowCount > 0 && (
                      <button
                        onClick={(e) => handleOverflowClick(e, day, dayReservations)}
                        className={`w-full flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors ${
                          isOverflowOpen ? 'ring-2 ring-primary-400' : ''
                        }`}
                        aria-label={`${overflowCount} reserva${overflowCount !== 1 ? 's' : ''} más`}
                      >
                        <Plus className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="flex-1 text-left">{overflowCount} más</span>
                        {isOverflowOpen && <X className="w-2.5 h-2.5" />}
                      </button>
                    )}

                    {/* Blocked dates */}
                    {dayBlocked.map((b) => (
                      <div key={b.id}
                        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-surface-200 text-surface-600 truncate"
                        title={`Hab. ${b.room?.number} · Bloqueado`}
                      >
                        <div className={`w-1 h-3 rounded-full flex-shrink-0 ${roomColor(b.room?.id)}`} />
                        {b.room?.number} ✕
                      </div>
                    ))}
                  </div>

                  {/* Overflow popover — rendered relative to this cell */}
                  {isOverflowOpen && (
                    <OverflowPopover
                      reservations={overflowState.reservations}
                      day={day}
                      onClose={() => setOverflowState(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Empty overlay */}
          {reservations.length === 0 && blockedDates.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/80 rounded-xl px-4 py-2 text-sm text-surface-500">
                Sin reservas{hasActiveFilters ? ' con los filtros activos' : ' este mes'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

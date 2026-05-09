import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { ChevronLeft, ChevronRight, Plus, Bed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardCalendar } from '../hooks/useQueries';
import { roomColor } from './Dashboard';

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

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthKey = format(currentMonth, 'yyyy-MM');
  const { data, isLoading } = useDashboardCalendar(monthKey);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const reservations = data?.reservations || [];
  const blockedDates = data?.blockedDates || [];

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

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase();

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Calendario</h1>
          <p className="text-surface-500 text-sm mt-0.5 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-200 hover:bg-surface-300 text-surface-600 transition-colors">
            Hoy
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <Link to="/reservations/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors ml-2">
            <Plus className="w-4 h-4" /> Nueva reserva
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-surface-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Entrada
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" /> Salida
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-surface-400" /> Bloqueado
        </div>
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-surface-200">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-surface-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayReservations = getResForDay(day);
              const dayBlocked = getBlockedForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <div key={idx}
                  className={`min-h-[100px] border-b border-r border-surface-100 p-2 ${!inMonth ? 'bg-surface-50' : ''}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                    isCurrentDay ? 'bg-primary-600 text-white' : inMonth ? 'text-surface-700' : 'text-surface-300'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayReservations.slice(0, 3).map((r) => {
                      const isCheckIn = isSameDay(new Date(r.checkIn), day);
                      const isCheckOut = isSameDay(new Date(r.checkOut), day);
                      return (
                        <div key={r.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${
                            isCheckIn ? 'bg-emerald-500' : isCheckOut ? 'bg-amber-500' : 'bg-primary-500'
                          }`}
                          title={`${r.guest.name} — Hab. ${r.room.number}`}>
                          {isCheckIn && '→ '}{isCheckOut && '← '}{r.guest.name}
                        </div>
                      );
                    })}
                    {dayBlocked.map((b) => (
                      <div key={b.id}
                        className="text-xs px-1.5 py-0.5 rounded bg-surface-200 text-surface-600 truncate">
                        {b.room.number} ✕
                      </div>
                    ))}
                    {dayReservations.length > 3 && (
                      <div className="text-xs text-surface-500 pl-1">+{dayReservations.length - 3}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty overlay */}
          {reservations.length === 0 && blockedDates.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/80 rounded-xl px-4 py-2 text-sm text-surface-500">
                Sin reservas este mes
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
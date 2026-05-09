import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardCalendar } from '../hooks/useQueries';

const ROOM_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500',
];

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

  // Group reservations by room
  const roomsInMonth = [...new Set(reservations.map(r => r.room.id))];

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
          <p className="text-surface-500 text-sm mt-0.5">{format(currentMonth, 'MMMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-surface-100 text-surface-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-200 hover:bg-surface-300 text-surface-700 transition-colors">
            Hoy
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-xl hover:bg-surface-100 text-surface-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <Link to="/reservations/new" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors ml-2">
            <Plus className="w-4 h-4" /> Nueva reserva
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Check-in
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" /> Check-out
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-surface-400" /> Bloqueado
        </div>
      </div>

      {/* Calendar grid */}
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
              <div
                key={idx}
                className={`min-h-[100px] border-b border-r border-surface-100 p-2 ${
                  !inMonth ? 'bg-surface-50' : ''
                }`}
              >
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
                      <div
                        key={r.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate text-white ${
                          isCheckIn ? 'bg-emerald-500' : isCheckOut ? 'bg-amber-500' : 'bg-primary-500'
                        }`}
                        title={`${r.guest.name} - Hab. ${r.room.number}`}
                      >
                        {isCheckIn && '→ '}{isCheckOut && '← '}{r.guest.name}
                      </div>
                    );
                  })}
                  {dayBlocked.map((b) => (
                    <div key={b.id} className="text-xs px-1.5 py-0.5 rounded bg-surface-300 text-surface-700 truncate text-xs">
                      {b.room.number} ✕
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div className="text-xs text-surface-400 pl-1">+{dayReservations.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
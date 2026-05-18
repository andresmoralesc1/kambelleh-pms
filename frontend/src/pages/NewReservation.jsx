import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { ArrowLeft, Search, User, Calendar, Check, AlertCircle, DoorOpen, UserPlus, Zap } from 'lucide-react';
import { useRooms } from '../hooks/useQueries';
import { useGuests } from '../hooks/useQueries';
import { useCreateReservation, useCreateGuest, useUpdateReservationStatus } from '../hooks/useQueries';
import { formatCurrencyCompact, formatCurrency } from '../utils/currency';

const typeLabels = { PRIVATE: 'Privada', SHARED: 'Compartida', DORM: 'Dormitorio' };

export default function NewReservation() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Nueva Reserva — Kambelleh PMS'; }, []);
  const [step, setStep] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [guestSearch, setGuestSearch] = useState('');
  const [guestSearchDebounced, setGuestSearchDebounced] = useState('');
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' });
  const [nameError, setNameError] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [error, setError] = useState('');

  const { data: roomsData, isLoading: roomsLoading } = useRooms({ status: 'AVAILABLE' });
  const { data: guestsData, isLoading: guestsLoading } = useGuests({ search: guestSearchDebounced });

  // Debounce guest search: 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setGuestSearchDebounced(guestSearch), 300);
    return () => clearTimeout(timer);
  }, [guestSearch]);
  const createReservation = useCreateReservation();
  const createGuest = useCreateGuest();
  const updateStatus = useUpdateReservationStatus();

  const rooms = roomsData?.rooms || [];
  const guests = guestsData?.guests || [];

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights : 0;

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setStep(2);
    setError('');
  };

  const handleSelectGuest = async (guest) => {
    setSelectedGuest(guest);
    setStep(3);
    setError('');
  };

  const handleCreateNewGuest = async () => {
    if (!guestForm.name) { setNameError('El nombre es obligatorio'); return; }
    setNameError('');
    setError('');
    try {
      const res = await createGuest.mutateAsync(guestForm);
      setSelectedGuest(res.data.guest);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el huésped');
    }
  };

  const handleSubmit = async () => {
    if (!selectedGuest || !selectedRoom) return;
    setError('');
    try {
      const res = await createReservation.mutateAsync({
        guestId: selectedGuest.id,
        roomId: selectedRoom.id,
        checkIn,
        checkOut,
        adults,
        children,
        specialRequests,
      });
      // Walk-in: immediately check in the guest
      if (isWalkIn && res?.data?.id) {
        await updateStatus.mutateAsync({ id: res.data.id, status: 'CHECKED_IN' });
      }
      navigate('/reservations');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la reserva');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-surface-50 dark:bg-surface-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={handleBack}
          className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Nueva Reserva</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm">Paso {step} de 3</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-8" role="progressbar" aria-label={`Paso ${step} de 3`}>
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary-500 dark:bg-primary-400' : 'bg-surface-200 dark:bg-surface-700'}`} />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2" role="alert" aria-live="polite">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* STEP 1: Dates + Room */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Dates */}
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-4">
            <h2 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500 dark:text-primary-400" /> Fechas de la estancia
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="check-in" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Check-in *</label>
                <input id="check-in" type="date" value={checkIn}
                  onChange={e => { setCheckIn(e.target.value); if (new Date(e.target.value) >= new Date(checkOut)) setCheckOut(e.target.value); }}
                  className="w-full px-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
                  aria-required="true" />
              </div>
              <div>
                <label htmlFor="check-out" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Check-out *</label>
                <input id="check-out" type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn}
                  className="w-full px-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
                  aria-required="true" />
              </div>
            </div>
            {nights > 0 && (
              <div className="text-sm text-surface-600 dark:text-surface-400 bg-surface-50 dark:bg-surface-700 rounded-xl px-4 py-2">
                <span className="font-semibold text-primary-600 dark:text-primary-400">{nights}</span> noche{nights > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Room selection */}
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
            <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-4 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-primary-500 dark:text-primary-400" /> Seleccionar habitación
            </h2>

            {roomsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />)}
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center mx-auto mb-3">
                  <DoorOpen className="w-6 h-6 text-surface-500 dark:text-surface-400" />
                </div>
                <p className="text-surface-600 dark:text-surface-400 font-medium mb-1">No hay habitaciones disponibles</p>
                <p className="text-sm text-surface-500 dark:text-surface-500"> para estas fechas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map(room => (
                  <button key={room.id} onClick={() => handleSelectRoom(room)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all text-left">
                    <div>
                      <p className="font-semibold text-surface-900 dark:text-surface-100">#{room.number} — {room.name}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">{typeLabels[room.type] || room.type} · Capacidad {room.capacity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600 dark:text-primary-400">{formatCurrencyCompact(room.pricePerNight)}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">/ noche</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Guest */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500 dark:text-primary-400" /> Datos del huésped
              </h2>
              <button onClick={() => { setStep(1); setSelectedRoom(null); }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                aria-label="Cambiar habitación seleccionada"
              >Cambiar habitación</button>
            </div>

            <div className="mb-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-700 flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500 dark:text-surface-400">Habitación seleccionada</p>
                <p className="font-semibold text-surface-900 dark:text-surface-100">#{selectedRoom.number} — {selectedRoom.name}</p>
              </div>
              <p className="font-bold text-primary-600 dark:text-primary-400">{formatCurrencyCompact(selectedRoom.pricePerNight)}/noche</p>
            </div>

            <div className="mb-4">
              <label htmlFor="guest-search" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Buscar huésped existente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 dark:text-surface-400" aria-hidden="true" />
                <input id="guest-search" value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
                  placeholder="Nombre, email o teléfono..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow" />
              </div>

              {guestsLoading ? (
                <div className="mt-2 space-y-1">{[1, 2].map(i => <div key={i} className="h-12 bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse" />)}</div>
              ) : guests.length > 0 ? (
                <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                  {guests.map(g => (
                    <button key={g.id} onClick={() => handleSelectGuest(g)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-left transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {g.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{g.name}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{g.email || g.phone || 'Sin contacto'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : guestSearch.length > 1 && (
                <p className="mt-2 text-sm text-surface-500 dark:text-surface-400 text-center py-2">No se encontraron huéspedes</p>
              )}
            </div>

            <div className="text-center text-surface-500 dark:text-surface-400 text-sm my-3 relative">
              <span className="bg-white dark:bg-surface-800 px-3 relative z-10">o</span>
            </div>

            {!newGuestMode ? (
              <button onClick={() => setNewGuestMode(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 text-surface-500 dark:text-surface-400 text-sm font-medium hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Registrar nuevo huésped
              </button>
            ) : (
              <div className="mt-4 space-y-3 p-4 bg-surface-50 dark:bg-surface-700 rounded-xl">
                <div>
                  <label htmlFor="new-guest-name" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Nombre completo *</label>
                  <input id="new-guest-name" value={guestForm.name} onChange={e => { setGuestForm({ ...guestForm, name: e.target.value }); setNameError(''); }}
                    className={`w-full px-3 py-2.5 rounded-xl border text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-shadow ${nameError ? 'border-red-400 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-800' : 'border-surface-300 dark:border-surface-600'}`}
                    placeholder="Nombre y apellido"
                    aria-required="true"
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? 'name-error' : undefined}
                  />
                  {nameError && <p id="name-error" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{nameError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-guest-email" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Email</label>
                    <input id="new-guest-email" value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
                      placeholder="email@ejemplo.com" />
                  </div>
                  <div>
                    <label htmlFor="new-guest-phone" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Teléfono</label>
                    <input id="new-guest-phone" value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
                      placeholder="+34 600 000 000" />
                  </div>
                </div>
                <button onClick={handleCreateNewGuest} disabled={createGuest.isPending}
                  className="w-full py-2.5 rounded-xl bg-primary-600 dark:bg-primary-700 text-white text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  aria-disabled={createGuest.isPending}
                >
                  {createGuest.isPending ? (
                  <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />Creando...</>
                ) : 'Continuar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Details + Summary */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 space-y-4">
            <h2 className="font-semibold text-surface-900 dark:text-surface-100">Detalles de la estancia</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="adults" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">Adultos *</label>
                <select id="adults" value={adults} onChange={e => setAdults(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
                  aria-required="true">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="children" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">Niños</label>
                <select id="children" value={children} onChange={e => setChildren(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow">
                  {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="special-requests" className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">Solicitudes especiales</label>
              <textarea id="special-requests" value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows="3"
                placeholder="Alergias, preferencias de habitación, hora de llegada..."
                className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow" />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">Resumen de la reserva</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500 dark:text-surface-400">Huésped</span><span className="font-medium text-surface-800 dark:text-surface-200">{selectedGuest?.name}</span></div>
              <div className="flex justify-between"><span className="text-surface-500 dark:text-surface-400">Habitación</span><span className="font-medium text-surface-800 dark:text-surface-200">#{selectedRoom?.number} — {selectedRoom?.name}</span></div>
              <div className="flex justify-between"><span className="text-surface-500 dark:text-surface-400">Check-in</span><span className="font-medium text-surface-700 dark:text-surface-300">{format(new Date(checkIn), 'dd MMM yyyy', { locale: es })}</span></div>
              <div className="flex justify-between"><span className="text-surface-500 dark:text-surface-400">Check-out</span><span className="font-medium text-surface-700 dark:text-surface-300">{format(new Date(checkOut), 'dd MMM yyyy', { locale: es })}</span></div>
              <div className="flex justify-between"><span className="text-surface-500 dark:text-surface-400">Noches</span><span className="font-medium text-surface-700 dark:text-surface-300">{nights}</span></div>
              <div className="flex justify-between pt-3 border-t border-surface-200 dark:border-surface-700">
                <span className="text-surface-600 dark:text-surface-400 font-medium">Total ({nights} noches × {formatCurrencyCompact(selectedRoom?.pricePerNight)})</span>
                <span className="font-bold text-primary-600 dark:text-primary-400 text-xl">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Walk-in toggle */}
            <div className="p-4 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWalkIn}
                  onChange={e => setIsWalkIn(e.target.checked)}
                  className="w-5 h-5 rounded border-surface-300 dark:border-surface-500 text-primary-600 dark:text-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
                />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Check-in inmediato (Walk-in)</span>
                </div>
              </label>
              <p className="ml-10 mt-1 text-xs text-surface-500 dark:text-surface-400">La reserva se creará y el huésped quedará registrado automáticamente</p>
            </div>

            <button onClick={handleSubmit} disabled={createReservation.isPending}
              className="w-full mt-5 py-3 rounded-xl bg-primary-600 dark:bg-primary-700 text-white text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              aria-disabled={createReservation.isPending}
            >
              {createReservation.isPending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creando reserva...
                </>
              ) : (
                <><Check className="w-4 h-4" /> Confirmar reserva</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

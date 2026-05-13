import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar, Users, CheckCircle, AlertCircle, ChevronRight, Bed } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const typeLabels = { PRIVATE: 'Privada', SHARED: 'Compartida', DORM: 'Dormitorio' };

function StepIndicator({ current }) {
  const steps = [
    { n: 1, label: 'Fechas' },
    { n: 2, label: 'Habitación' },
    { n: 3, label: 'Datos' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
            current > s.n ? 'bg-emerald-500 text-white' : current === s.n ? 'bg-primary-600 text-white' : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
          }`}>
            {current > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
          </div>
          <span className={`text-sm font-medium hidden sm:block ${current === s.n ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400'}`}>{s.label}</span>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-surface-300 dark:text-surface-600" />}
        </div>
      ))}
    </div>
  );
}

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' });
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdReservation, setCreatedReservation] = useState(null);

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights : 0;

  const searchRooms = async () => {
    setLoadingRooms(true);
    setRoomsError('');
    setRooms([]);
    try {
      const res = await fetch(`${API_URL}/public/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al buscar habitaciones');
      }
      const data = await res.json();
      setRooms(data.rooms || []);
      if (data.rooms?.length === 0) setRoomsError('No hay habitaciones disponibles para estas fechas');
    } catch (e) {
      setRoomsError(e.message);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (new Date(checkOut) <= new Date(checkIn)) {
      setRoomsError('La fecha de salida debe ser posterior a la de entrada');
      return;
    }
    searchRooms();
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API_URL}/public/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn,
          checkOut,
          adults: guests,
          children: 0,
          roomId: selectedRoom.id,
          guest: guestForm,
          specialRequests: specialRequests || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear la reserva');
      }
      const data = await res.json();
      setCreatedReservation(data.reservation);
      setSuccess(true);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Dark mode bg
  const bg = 'bg-surface-50 dark:bg-surface-900 min-h-screen';

  if (success && createdReservation) {
    return (
      <div className={`${bg} flex items-center justify-center p-6`}>
        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">¡Reserva recibida!</h1>
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            Te enviamos un correo de confirmación. Te esperamos el{' '}
            <strong>{format(new Date(createdReservation.checkIn), "d 'de' MMMM yyyy", { locale: es })}</strong>.
          </p>
          <div className="bg-surface-50 dark:bg-surface-900 rounded-xl p-4 text-left mb-6 border border-surface-200 dark:border-surface-700">
            <div className="flex items-center gap-2 mb-2">
              <Bed className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Habitación {createdReservation.room?.number} — {createdReservation.room?.name}</span>
            </div>
            <div className="text-xs text-surface-500 dark:text-surface-400">
              {format(new Date(createdReservation.checkIn), 'dd MMM', { locale: es })} → {format(new Date(createdReservation.checkOut), 'dd MMM yyyy', { locale: es })} · {nights} noche{nights !== 1 ? 's' : ''}
            </div>
            <div className="text-sm font-bold text-surface-900 dark:text-surface-100 mt-2">
              ${Number(createdReservation.totalAmount).toLocaleString('es-AR')}
            </div>
          </div>
          <p className="text-xs text-surface-400 dark:text-surface-500">
            Cualquier consulta, contáctanos por correo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bg} p-6`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100 mb-2">Reservar habitación</h1>
          <p className="text-surface-500 dark:text-surface-400">Completá los datos para hacer tu reserva</p>
        </div>

        <StepIndicator current={step} />

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-lg p-6 border border-surface-200 dark:border-surface-700">

          {/* Step 1: Dates */}
          {step === 1 && (
            <form onSubmit={handleSearch} className="space-y-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">¿Cuándo te alojás?</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="check-in" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Fecha de entrada</label>
                  <input
                    id="check-in"
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="check-out" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Fecha de salida</label>
                  <input
                    id="check-out"
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    min={format(addDays(new Date(checkIn), 1), 'yyyy-MM-dd')}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="guests" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Cantidad de huéspedes</label>
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} adulto{n !== 1 ? 's' : ''}</option>)}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Buscar disponibilidad
              </button>
            </form>
          )}

          {/* Step 2: Room selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Elegí tu habitación</h2>
                <button onClick={() => setStep(1)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  Cambiar fechas
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(checkIn), "d MMM", { locale: es })} → {format(new Date(checkOut), "d MMM yyyy", { locale: es })} · {nights} noche{nights !== 1 ? 's' : ''} · {guests} adulto{guests !== 1 ? 's' : ''}
              </div>

              {loadingRooms && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {roomsError && !loadingRooms && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {roomsError}
                </div>
              )}

              {!loadingRooms && rooms.length > 0 && (
                <div className="space-y-3">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => { setSelectedRoom(room); setStep(3); }}
                      className="w-full text-left p-4 rounded-xl border-2 border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors bg-white dark:bg-surface-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-surface-900 dark:text-surface-100">#{room.number}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-600 text-surface-600 dark:text-surface-400">{typeLabels[room.type]}</span>
                          </div>
                          <p className="text-sm text-surface-700 dark:text-surface-300 font-medium">{room.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3.5 h-3.5 text-surface-400" />
                            <span className="text-xs text-surface-500 dark:text-surface-400">Hasta {room.capacity} huéspedes</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            ${Number(room.pricePerNight).toLocaleString('es-AR')}
                          </p>
                          <p className="text-xs text-surface-400">por noche</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Guest info */}
          {step === 3 && selectedRoom && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Tus datos</h2>
                <button type="button" onClick={() => setStep(2)} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  Cambiar habitación
                </button>
              </div>

              {/* Room summary */}
              <div className="bg-surface-50 dark:bg-surface-900 rounded-xl p-4 border border-surface-100 dark:border-surface-700 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-surface-900 dark:text-surface-100">#{selectedRoom.number} — {selectedRoom.name}</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      {format(new Date(checkIn), 'dd MMM', { locale: es })} → {format(new Date(checkOut), 'dd MMM yyyy', { locale: es })} · {nights} noche{nights !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-600 dark:text-primary-400">${totalPrice.toLocaleString('es-AR')}</p>
                    <p className="text-xs text-surface-400">total</p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Nombre completo *</label>
                <input
                  id="name"
                  type="text"
                  value={guestForm.name}
                  onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={guestForm.email}
                  onChange={e => setGuestForm(f => ({ ...f, email: e.target.value }))}
                  required
                  placeholder="juan@email.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Teléfono</label>
                <input
                  id="phone"
                  type="tel"
                  value={guestForm.phone}
                  onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+54 11 1234 5678"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="requests" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Solicitudes especiales</label>
                <textarea
                  id="requests"
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ej: Llegada después de las 20h, preferencia de piso alto..."
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? 'Enviando...' : 'Confirmar reserva'}
              </button>

              <p className="text-xs text-center text-surface-400 dark:text-surface-500">
                Al confirmar, recibirás un correo con los datos de tu reserva. Solo se cobra en el check-in.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
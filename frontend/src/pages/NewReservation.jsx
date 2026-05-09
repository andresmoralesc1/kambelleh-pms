import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Search, User, Calendar, CreditCard, Check } from 'lucide-react';
import { useRooms } from '../hooks/useQueries';
import { useGuests } from '../hooks/useQueries';
import { useCreateReservation, useCreateGuest } from '../hooks/useQueries';

export default function NewReservation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkIn, setCheckIn] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkOut, setCheckOut] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [guestSearch, setGuestSearch] = useState('');
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' });
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');

  const { data: roomsData } = useRooms({ status: 'AVAILABLE' });
  const { data: guestsData } = useGuests({ search: guestSearch });
  const createReservation = useCreateReservation();
  const createGuest = useCreateGuest();

  const rooms = roomsData?.rooms || [];
  const guests = guestsData?.guests || [];

  const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights : 0;

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setStep(2);
  };

  const handleSelectGuest = async (guest) => {
    setSelectedGuest(guest);
    setStep(3);
  };

  const handleCreateNewGuest = async () => {
    if (!guestForm.name) return alert('El nombre es obligatorio');
    try {
      const { data } = await createGuest.mutateAsync(guestForm);
      setSelectedGuest(data.guest);
      setStep(3);
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating guest');
    }
  };

  const handleSubmit = async () => {
    if (!selectedGuest || !selectedRoom) return;
    try {
      const { data } = await createReservation.mutateAsync({
        guestId: selectedGuest.id,
        roomId: selectedRoom.id,
        checkIn,
        checkOut,
        adults,
        children,
        specialRequests,
      });
      navigate(`/reservations`);
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating reservation');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-100 text-surface-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Nueva Reserva</h1>
          <p className="text-surface-500 text-sm">Paso {step} de 4</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary-500' : 'bg-surface-200'}`} />
        ))}
      </div>

      {/* STEP 1: Dates */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
            <h2 className="font-semibold text-surface-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary-500" /> Fechas de la estancia</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Check-in</label>
                <input type="date" value={checkIn} onChange={e => { setCheckIn(e.target.value); if (new Date(e.target.value) >= new Date(checkOut)) setCheckOut(e.target.value); }} className="w-full px-4 py-3 rounded-xl border border-surface-300 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Check-out</label>
                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} className="w-full px-4 py-3 rounded-xl border border-surface-300 text-sm" />
              </div>
            </div>
            {nights > 0 && (
              <div className="text-sm text-surface-500 bg-surface-50 rounded-xl px-4 py-2">
                <span className="font-medium text-primary-600">{nights}</span> noche{nights > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary-500" /> Seleccionar habitación</h2>
            {rooms.length === 0 ? (
              <p className="text-center py-6 text-surface-400 text-sm">No hay habitaciones disponibles para estas fechas</p>
            ) : (
              <div className="space-y-2">
                {rooms.map(room => (
                  <button key={room.id} onClick={() => handleSelectRoom(room)} className="w-full flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left">
                    <div>
                      <p className="font-semibold text-surface-900">#{room.number} — {room.name}</p>
                      <p className="text-xs text-surface-400">{room.type} · Capacidad {room.capacity} personas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">€{Number(room.pricePerNight).toFixed(2)}</p>
                      <p className="text-xs text-surface-400">/ noche</p>
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
          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-surface-900 flex items-center gap-2"><User className="w-5 h-5 text-primary-500" /> Datos del huésped</h2>
              <button onClick={() => { setStep(1); setSelectedRoom(null); }} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Cambiar habitación</button>
            </div>

            <div className="mb-4 p-4 rounded-xl bg-surface-50 flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500">Habitación seleccionada</p>
                <p className="font-semibold text-surface-900">#{selectedRoom.number} — {selectedRoom.name}</p>
              </div>
              <p className="font-bold text-primary-600">€{Number(selectedRoom.pricePerNight).toFixed(2)}/noche</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Buscar huésped existente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input value={guestSearch} onChange={e => setGuestSearch(e.target.value)} placeholder="Nombre, email o teléfono..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 bg-white text-sm" />
              </div>
              {guests.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {guests.map(g => (
                    <button key={g.id} onClick={() => handleSelectGuest(g)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-100 text-left">
                      <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold">{g.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">{g.name}</p>
                        <p className="text-xs text-surface-400">{g.email || g.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center text-surface-400 text-sm my-3">ó</div>

            <button onClick={() => setNewGuestMode(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-surface-300 text-surface-500 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors">
              + Registrar nuevo huésped
            </button>

            {newGuestMode && (
              <div className="mt-4 space-y-3 p-4 bg-surface-50 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Nombre completo *</label>
                  <input value={guestForm.name} onChange={e => setGuestForm({ ...guestForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
                    <input value={guestForm.email} onChange={e => setGuestForm({ ...guestForm, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Teléfono</label>
                    <input value={guestForm.phone} onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm" />
                  </div>
                </div>
                <button onClick={handleCreateNewGuest} disabled={createGuest.isPending} className="w-full py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                  {createGuest.isPending ? 'Creando...' : 'Continuar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Details */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-4">
            <h2 className="font-semibold text-surface-900">Detalles de la reserva</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Adultos</label>
                <select value={adults} onChange={e => setAdults(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Niños</label>
                <select value={children} onChange={e => setChildren(parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm">
                  {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Solicitudes especiales</label>
              <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows="3" placeholder="Alergias, preferencias de habitación, hora de llegada..." className="w-full px-3 py-2 rounded-lg border border-surface-300 text-sm resize-none" />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6">
            <h3 className="font-semibold text-surface-900 mb-4">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">Huésped</span><span className="font-medium">{selectedGuest?.name}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Habitación</span><span className="font-medium">#{selectedRoom?.number} — {selectedRoom?.name}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Check-in</span><span className="font-medium">{format(new Date(checkIn), 'dd MMM yyyy', { locale: es })}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Check-out</span><span className="font-medium">{format(new Date(checkOut), 'dd MMM yyyy', { locale: es })}</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Noches</span><span className="font-medium">{nights}</span></div>
              <div className="flex justify-between pt-2 border-t border-surface-200"><span className="text-surface-500">Total ({nights} noches)</span><span className="font-bold text-primary-600 text-lg">€{totalPrice.toFixed(2)}</span></div>
            </div>
            <button onClick={handleSubmit} disabled={createReservation.isPending} className="w-full mt-5 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {createReservation.isPending ? 'Creando...' : <><Check className="w-4 h-4" /> Confirmar reserva</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { SprayCan, CheckCircle, AlertCircle, Clock, Wrench, ChevronDown, ChevronUp, User } from 'lucide-react';
import { useRooms, useRoomCleaningLogs, useUpdateRoomCleaningStatus, useCreateCleaningLog, useUsers } from '../hooks/useQueries';
import { formatDateShort } from '../utils/currency';
import { useToast } from '../components/ToastProvider';

const cleaningStatusConfig = {
  CLEANED: { label: 'Limpia', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, dot: 'bg-emerald-500' },
  NEEDS_CLEANING: { label: 'Necesita limpieza', bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle, dot: 'bg-red-500' },
  IN_CLEANING: { label: 'En limpieza', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, dot: 'bg-yellow-500' },
  MAINTENANCE: { label: 'Mantenimiento', bg: 'bg-gray-100', text: 'text-gray-700', icon: Wrench, dot: 'bg-gray-500' },
};

const filterOptions = [
  { key: 'ALL', label: 'Todas' },
  { key: 'CLEANED', label: 'Limpias' },
  { key: 'NEEDS_CLEANING', label: 'Necesitan limpieza' },
  { key: 'IN_CLEANING', label: 'En limpieza' },
  { key: 'MAINTENANCE', label: 'Mantenimiento' },
];

function CleaningHistoryModal({ roomId, roomNumber, onClose }) {
  const { data, isLoading } = useRoomCleaningLogs(roomId);
  const logs = data?.logs || [];

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="cleaning-history-title">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
          <h2 id="cleaning-history-title" className="text-lg font-bold text-surface-900 dark:text-surface-100">
            Historial de limpieza — Hab. #{roomNumber}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <SprayCan className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-3" />
              <p className="text-surface-500 dark:text-surface-400 text-sm">Sin registros de limpieza aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const config = cleaningStatusConfig[log.status] || cleaningStatusConfig.CLEANED;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <config.icon className={`w-4 h-4 ${config.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-surface-400 dark:text-surface-500">{formatDateShort(log.createdAt)}</span>
                      </div>
                      <p className="text-sm text-surface-700 dark:text-surface-300 mt-1">
                        {log.staff ? (
                          <span className="font-medium">{log.staff.name}</span>
                        ) : (
                          <span className="font-medium">{log.performedBy}</span>
                        )}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 truncate">{log.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Housekeeping() {
  const [filter, setFilter] = useState('ALL');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [cleaningNotes, setCleaningNotes] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const toast = useToast();

  const { data, isLoading } = useRooms();
  const { data: usersData } = useUsers();
  const updateStatus = useUpdateRoomCleaningStatus();
  const createLog = useCreateCleaningLog();

  const rooms = data?.rooms || [];
  const users = usersData?.users || [];
  const filtered = filter === 'ALL' ? rooms : rooms.filter(r => r.cleaningStatus === filter);

  const handleStatusChange = async (room, newStatus) => {
    setPendingRoomId(room.id);
    try {
      await updateStatus.mutateAsync({ roomId: room.id, status: newStatus });
      const config = cleaningStatusConfig[newStatus];
      toast.success(`Habitación #${room.number} marcada como "${config.label.toLowerCase()}"`);
    } catch (err) {
      toast.error('No se pudo actualizar el estado de limpieza');
    } finally {
      setPendingRoomId(null);
    }
  };

  const handleMarkClean = (room) => {
    setSelectedStaffId('');
    setCleaningNotes('');
    setPendingRoomId(room.id);
    setConfirmState({
      title: 'Registrar limpieza',
      message: `¿Quién realizó la limpieza de la habitación #${room.number}?`,
      confirmLabel: 'Registrar',
      resolve: async (ok) => {
        if (!ok) { setPendingRoomId(null); return; }
        try {
          const selectedUser = users.find(u => u.id === selectedStaffId);
          await createLog.mutateAsync({
            roomId: room.id,
            data: {
              performedBy: selectedUser ? selectedUser.name : 'Personal de limpieza',
              staffId: selectedStaffId || null,
              status: 'CLEANED',
              notes: cleaningNotes || 'Limpieza completada',
            },
          });
          toast.success(`Habitación #${room.number} marcada como limpia`);
        } catch (err) {
          toast.error('No se pudo registrar la limpieza');
        } finally {
          setPendingRoomId(null);
        }
      },
    });
  };

  const handleConfirm = () => { confirmState?.resolve?.(true); setConfirmState(null); };
  const handleCancel = () => { confirmState?.resolve?.(false); setConfirmState(null); };

  return (
    <div className="p-6 space-y-5 bg-surface-50 dark:bg-surface-900 min-h-screen" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Limpieza</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">
            {rooms.filter(r => r.cleaningStatus === 'NEEDS_CLEANING').length} necesitan limpieza ·{' '}
            {rooms.filter(r => r.cleaningStatus === 'IN_CLEANING').length} en proceso
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map(opt => (
          <button key={opt.key} onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === opt.key
                ? 'bg-surface-800 dark:bg-primary-600 text-white dark:text-white'
                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            }`}
            aria-pressed={filter === opt.key}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-white dark:bg-surface-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
            <SprayCan className="w-7 h-7 text-surface-500 dark:text-surface-400" />
          </div>
          <h3 className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Sin habitaciones</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400">No hay habitaciones con este estado de limpieza</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(room => {
            const config = cleaningStatusConfig[room.cleaningStatus] || cleaningStatusConfig.CLEANED;
            const isExpanded = expandedRoom === room.id;
            return (
              <div key={room.id} className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg.replace('100', '50').replace('bg-emerald-100', 'bg-emerald-50 dark:bg-emerald-900/30').replace('bg-red-100', 'bg-red-50 dark:bg-red-900/30').replace('bg-yellow-100', 'bg-yellow-50 dark:bg-yellow-900/30').replace('bg-gray-100', 'bg-gray-100 dark:bg-gray-900/30')}`}>
                        <config.icon className={`w-5 h-5 ${config.text.replace('700', '600')}`} />
                      </div>
                      <div>
                        <p className="font-bold text-surface-900 dark:text-surface-100">#{room.number}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">{room.name}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.bg} ${config.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                      {config.label}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleMarkClean(room)}
                      disabled={pendingRoomId === room.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Marcar habitación ${room.number} como limpia`}
                      aria-disabled={pendingRoomId === room.id}>
                      {pendingRoomId === room.id ? (
                        <><span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />Procesando</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /> Marcar limpia</>
                      )}
                    </button>
                    <button
                      onClick={() => handleStatusChange(room, room.cleaningStatus === 'NEEDS_CLEANING' ? 'CLEANED' : 'NEEDS_CLEANING')}
                      disabled={pendingRoomId === room.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        room.cleaningStatus === 'NEEDS_CLEANING'
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300'
                      }`}
                      aria-label={room.cleaningStatus === 'NEEDS_CLEANING' ? `Marcar habitación ${room.number} como limpia` : `Marcar habitación ${room.number} como necesita limpieza`}
                      aria-disabled={pendingRoomId === room.id}>
                      {pendingRoomId === room.id ? (
                        <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Procesando</>
                      ) : room.cleaningStatus === 'NEEDS_CLEANING' ? (
                        <><CheckCircle className="w-4 h-4" /> Marcar limpia</>
                      ) : (
                        <><AlertCircle className="w-4 h-4" /> Necesita limpieza</>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setExpandedRoom(isExpanded ? null : room.id)}
                    className="w-full mt-2 flex items-center justify-center gap-1 py-1 text-xs text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
                    aria-expanded={isExpanded}>
                    {isExpanded ? 'Ocultar historial' : 'Ver historial'}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expanded cleaning history */}
                {isExpanded && (
                  <div className="border-t border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 max-h-48 overflow-y-auto">
                    <CleaningHistorySection roomId={room.id} roomNumber={room.number} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-[90] p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <SprayCan className="w-5 h-5 text-primary-600 dark:text-primary-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">{confirmState.title}</h2>
              </div>
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">{confirmState.message}</p>

            {/* Staff selector for cleaning log */}
            {confirmState.title === 'Registrar limpieza' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Personal de limpieza</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-600 text-sm text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Sin asignar --</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Notas (opcional)</label>
                  <input
                    type="text"
                    value={cleaningNotes}
                    onChange={(e) => setCleaningNotes(e.target.value)}
                    placeholder="Ej: Limpieza completa"
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-600 text-sm text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-400 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">Cancelar</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">{confirmState.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CleaningHistorySection({ roomId, roomNumber }) {
  const { data, isLoading } = useRoomCleaningLogs(roomId);
  const logs = data?.logs || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-12 bg-surface-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-xs text-surface-400 text-center py-2">Sin registros aún</p>
    );
  }

  const recentLogs = logs.slice(0, 5);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-surface-500 mb-2">Últimas limpiezas</p>
      {recentLogs.map(log => {
        const config = cleaningStatusConfig[log.status] || cleaningStatusConfig.CLEANED;
        return (
          <div key={log.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-surface-200">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${config.bg}`}>
              <config.icon className={`w-3.5 h-3.5 ${config.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-surface-700 truncate">
                {log.staff ? log.staff.name : log.performedBy}
              </p>
              <p className="text-xs text-surface-400">{formatDateShort(log.createdAt)}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}>
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
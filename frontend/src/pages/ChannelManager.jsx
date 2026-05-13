import { useState } from 'react';
import { Link2, RefreshCw, Wifi, WifiOff, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import {
  useChannelStatus,
  useConnectChannel,
  useDisconnectChannel,
  useSyncChannel,
} from '../hooks/useQueries';

function AirbnbCard() {
  const toast = useToast();
  const { data, isLoading, error } = useChannelStatus();
  const connect = useConnectChannel();
  const disconnect = useDisconnectChannel();
  const sync = useSyncChannel();

  const [syncing, setSyncing] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-surface-200 dark:bg-surface-700 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-surface-200 dark:bg-surface-700 rounded w-1/3" />
            <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  const status = data || { connected: false, lastSync: null, mockMode: true };
  const isConnected = status.connected;

  const handleConnect = async () => {
    try {
      const result = await connect.mutateAsync();
      toast.success(result.mockMode ? 'Conectado en modo demo' : 'Conectado a Airbnb exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al conectar con Airbnb');
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await disconnect.mutateAsync();
      toast.success(result.message || 'Desconectado de Airbnb');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al desconectar');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await sync.mutateAsync();
      toast.success(
        result.mockMode
          ? `Sincronizadas ${result.reservationsImported} reservas en modo demo`
          : `Sincronizadas ${result.reservationsImported} reservas de Airbnb`
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al sincronizar reservas');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (dateStr) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          {/* Airbnb Logo placeholder */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-surface-100 text-lg">Airbnb</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {isConnected ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Conectado
                  </span>
                  {status.mockMode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium">
                      Modo demo
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400 text-xs font-medium">
                  <WifiOff className="w-3 h-3" />
                  Desconectado
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-surface-500 dark:text-surface-400">Última sincronización</span>
          <span className="text-surface-700 dark:text-surface-300 font-medium">{formatLastSync(status.lastSync)}</span>
        </div>
        {!status.credentialsConfigured && !status.mockMode && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Credenciales no configuradas. Configure AIRBNB_CLIENT_ID y AIRBNB_CLIENT_SECRET en el archivo .env</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {isConnected ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncing || sync.isPending}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Desconectar
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connect.isPending}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Link2 className="w-4 h-4" />
            Conectar Airbnb
          </button>
        )}
      </div>
    </div>
  );
}

function PlaceholderCard({ name, comingSoon = true }) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 opacity-60">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
            <span className="text-surface-400 dark:text-surface-500 text-lg font-bold">{name[0]}</span>
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-surface-100 text-lg">{name}</h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500 text-xs font-medium mt-0.5">
              Próximamente
            </span>
          </div>
        </div>
      </div>

      <div className="h-8 bg-surface-100 dark:bg-surface-700 rounded-lg mb-4" />

      <div className="flex flex-col gap-2">
        <button
          disabled
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-surface-100 dark:bg-surface-700 text-surface-400 dark:text-surface-500 text-sm font-medium cursor-not-allowed"
        >
          <ExternalLink className="w-4 h-4" />
          No disponible
        </button>
      </div>
    </div>
  );
}

export default function ChannelManager() {
  return (
    <div className="p-6 space-y-6 bg-surface-50 dark:bg-surface-900 min-h-screen" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Canales</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">Gestiona la conexión con canales de reservas</p>
        </div>
      </header>

      {/* Channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AirbnbCard />
        <PlaceholderCard name="Booking.com" />
        <PlaceholderCard name="Expedia" />
      </div>

      {/* Info box */}
      <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-medium text-surface-900 dark:text-surface-100 text-sm">Integración con canales</h3>
            <p className="text-surface-600 dark:text-surface-400 text-xs mt-1">
              Conecta Kambelleh con canales de reservas como Airbnb para sincronizar automáticamente tus reservas.
              Las reservas importadas desde canales externos aparecerán marcadas con el origen "AIRBNB" en el sistema.
              Activa el modo demo para probar la integración sin credenciales reales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
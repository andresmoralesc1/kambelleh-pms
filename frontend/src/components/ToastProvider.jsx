import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

// Module-level toast object so consumers can import { toast } and use it
const toast = {
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Update the module-level toast object methods
  useEffect(() => {
    toast.success = (msg, dur) => addToast(msg, 'success', dur);
    toast.error = (msg, dur) => addToast(msg, 'error', dur ?? 6000);
    toast.warning = (msg, dur) => addToast(msg, 'warning', dur);
    toast.info = (msg, dur) => addToast(msg, 'info', dur);
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export { toast };
export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: AlertCircle,
};

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="region" aria-label="Notificaciones">
      {toasts.map(t => {
        const Icon = icons[t.type] || icons.info;
        return (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right ${styles[t.type] || styles.info}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[t.type]}`} />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              onClick={() => onRemove(t.id)}
              className="p-0.5 rounded hover:bg-black/10 transition-colors flex-shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
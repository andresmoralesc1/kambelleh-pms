import { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(null);

  const confirm = (options) => new Promise((resolve) => {
    setConfirmState({ ...options, resolve });
  });

  const handleConfirm = () => {
    confirmState?.resolve(true);
    setConfirmState(null);
  };

  const handleCancel = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  return { confirm, ConfirmDialog: ConfirmDialog({ confirmState, handleConfirm, handleCancel }), confirmState };
}

export function ConfirmDialog({ confirmState, onConfirm, onCancel }) {
  if (!confirmState) return null;
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const firstButton = dialogRef.current?.querySelector('button');
    firstButton?.focus();
    return () => previousFocus?.focus();
  }, [confirmState]);
  const { title = '¿Estás seguro?', message = 'Esta acción no se puede deshacer.', confirmLabel = 'Eliminar', confirmVariant = 'danger' } = confirmState;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[90] p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div ref={dialogRef} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 modal-enter" tabIndex="-1">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirmVariant === 'danger' ? 'bg-red-100' : 'bg-primary-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${confirmVariant === 'danger' ? 'text-red-600' : 'text-primary-600'}`} />
          </div>
          <h2 id="confirm-title" className="text-lg font-bold text-surface-900">{title}</h2>
        </div>
        <p className="text-sm text-surface-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-surface-200 text-surface-700 text-sm font-medium hover:bg-surface-50 active:scale-[0.97] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-sm font-medium active:scale-[0.97] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/20 focus-visible:ring-red-500'
                : 'bg-primary-600 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-500/20 focus-visible:ring-primary-500'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Skeleton loaders
export function CardSkeleton({ className = '' }) {
  return <div className={`bg-surface-200 rounded-2xl animate-pulse ${className}`} />;
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-surface-100">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 bg-surface-200 rounded animate-pulse flex-1" />
      ))}
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-surface-100">
      <div className="w-8 h-8 rounded-full bg-surface-200 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-surface-200 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-surface-100 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
}
import { formatCurrency } from '../../utils/currency';

export default function TopRooms({ topRooms }) {
  const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Top 5 habitaciones por ingresos</h3>
      {topRooms?.length ? (
        <div className="flex flex-col gap-3">
          {topRooms.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
                  {r.name || `Habitación ${r.number}`}
                </p>
                <p className="text-xs text-surface-500">{r.reservation_count} reservas</p>
              </div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white flex-shrink-0">
                {fmt.format(Number(r.total_revenue))}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-surface-400">Sin datos</div>
      )}
    </div>
  );
}
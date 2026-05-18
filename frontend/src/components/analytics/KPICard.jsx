import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ label, value, change, icon: Icon, dark }) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
        </div>
        <div className="p-2 bg-surface-100 dark:bg-surface-700 rounded-xl">
          <Icon className="w-5 h-5 text-surface-500" />
        </div>
      </div>
      {change != null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}% vs mes anterior
        </div>
      )}
    </div>
  );
}
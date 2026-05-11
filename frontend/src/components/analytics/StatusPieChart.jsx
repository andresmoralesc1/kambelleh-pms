import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function StatusPieChart({ statusData, dark }) {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
      <div className="bg-surface-800 dark:bg-surface-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-surface-700">
        <p style={{ color: p.payload.color }}>{p.name}: {p.value}</p>
      </div>
    );
  };

  if (!statusData?.length) {
    return (
      <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Estado de reservas (este mes)</h3>
        <div className="h-[160px] flex items-center justify-center text-sm text-surface-400">Sin datos</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Estado de reservas (este mes)</h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
              aria-label={`Gráfico de estado: ${statusData.map((s) => `${s.name}: ${s.value}`).join(', ')}`}
            >
              {statusData.map((entry, i) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2">
          {statusData.map((s) => (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-surface-600 dark:text-surface-400 capitalize">{s.name}</span>
              <span className="font-semibold text-surface-900 dark:text-white ml-auto pl-4">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
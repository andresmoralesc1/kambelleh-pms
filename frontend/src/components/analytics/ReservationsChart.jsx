import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReservationsChart({ monthly, dark }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-surface-800 dark:bg-surface-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-surface-700">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">Reservas por mes</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="reservation_count" name="Reservas" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled_count" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
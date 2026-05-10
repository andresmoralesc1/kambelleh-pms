import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Bed, Clock } from 'lucide-react';
import { getDashboardAnalytics } from '../api';
import Layout from '../components/Layout';
import { formatCurrencyCompact } from '../utils/currency';

const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
const fmtCompact = (n) => formatCurrencyCompact(n);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const LEAD_BINS = ['0-6', '7-13', '14-29', '30+'];

const KPICard = ({ label, value, change, icon: Icon, dark }) => (
  <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
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

const ChartCard = ({ title, children, dark }) => (
  <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
    <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">{title}</h3>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label, dark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 dark:bg-surface-900 text-white rounded-xl px-3 py-2 text-xs shadow-xl border border-surface-700">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name.toLowerCase().includes('revenue') ? fmt.format(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const { dark } = { dark: document.documentElement.classList.contains('dark') };
  const [months, setMonths] = useState(6);

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', months],
    queryFn: () => getDashboardAnalytics({ months }),
    select: (d) => d.data,
  });

  const monthly = (data?.monthlyData || []).map((m) => ({
    ...m,
    month: new Date(m.month).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
    revenue: Number(m.revenue) || 0,
    adr: Math.round(Number(m.adr) || 0),
  }));

  const statusData = (data?.statusBreakdown || []).map((s, i) => ({
    name: s.status.replace('_', ' '),
    value: s._count.status,
    color: COLORS[i % COLORS.length],
  }));

  const leadTimeData = LEAD_BINS.map((bin) => {
    const found = (data?.leadTimeDistribution || []).find((l) => l.bin === bin);
    return { bin, count: found ? Number(found.count) : 0 };
  });

  const comp = data?.comparison || {};

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" aria-label="Cargando analytics" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main id="main-content" className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Analíticas</h1>
            <p className="text-sm text-surface-500 mt-0.5">Rendimiento y tendencias del hotel</p>
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Periodo de análisis"
          >
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" aria-label="Métricas clave">
          <KPICard
            label="Ingresos este mes"
            value={fmt.format(comp.revenueThisMonth || 0)}
            change={comp.revenueChange}
            icon={DollarSign}
            dark={dark}
          />
          <KPICard
            label="Reservas este mes"
            value={comp.reservationsThisMonth || 0}
            change={comp.reservationChange}
            icon={Calendar}
            dark={dark}
          />
          <KPICard
            label="ADR promedio"
            value={monthly.length ? fmt.format(Math.round(monthly.reduce((s, m) => s + m.adr, 0) / monthly.length)) : '$0'}
            icon={Bed}
            dark={dark}
          />
          <KPICard
            label="Lead time promedio"
            value={monthly.length ? `${Math.round(monthly.reduce((s, m) => s + Number(m.lead_time) || 0, 0) / monthly.length)} días` : 'N/A'}
            icon={Clock}
            dark={dark}
          />
        </div>

        {/* Revenue & ADR Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Ingresos mensuales (USD)" dark={dark}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <Tooltip content={<CustomTooltip dark={dark} />} />
                <Bar dataKey="revenue" name="Ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="ADR mensual (tarifa diaria promedio USD)" dark={dark}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <Tooltip content={<CustomTooltip dark={dark} />} />
                <Line type="monotone" dataKey="adr" name="ADR" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Reservation Trend + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ChartCard title="Reservas por mes" dark={dark}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <Tooltip content={<CustomTooltip dark={dark} />} />
                <Bar dataKey="reservation_count" name="Reservas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled_count" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Estado de reservas (este mes)" dark={dark}>
            {statusData.length ? (
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
                    <Tooltip content={<CustomTooltip dark={dark} />} />
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
            ) : (
              <div className="h-[160px] flex items-center justify-center text-sm text-surface-400">Sin datos</div>
            )}
          </ChartCard>
        </div>

        {/* Lead Time + Top Rooms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Distribución de lead time (días entre reserva y check-in)" dark={dark}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadTimeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="bin" tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} label={{ value: 'Días', position: 'insideBottom', offset: -2, fontSize: 10, fill: dark ? '#6b7280' : '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: dark ? '#9ca3af' : '#6b7280' }} />
                <Tooltip content={<CustomTooltip dark={dark} />} />
                <Bar dataKey="count" name="Reservas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 5 habitaciones por ingresos" dark={dark}>
            {data?.topRooms?.length ? (
              <div className="flex flex-col gap-3">
                {data.topRooms.map((r, i) => (
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
          </ChartCard>
        </div>
      </main>
    </Layout>
  );
}

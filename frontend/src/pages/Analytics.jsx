import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Calendar, Bed, Clock } from 'lucide-react';
import { getDashboardAnalytics } from '../api';
import { useSettings } from '../hooks/useQueries';
import Layout from '../components/Layout';
import KPICard from '../components/analytics/KPICard';
import RevenueChart from '../components/analytics/RevenueChart';
import ADRChart from '../components/analytics/ADRChart';
import ReservationsChart from '../components/analytics/ReservationsChart';
import StatusPieChart from '../components/analytics/StatusPieChart';
import LeadTimeChart from '../components/analytics/LeadTimeChart';
import TopRooms from '../components/analytics/TopRooms';

export default function Analytics() {
  const dark = document.documentElement.classList.contains('dark');
  const [months, setMonths] = useState(6);
  const { data: settingsData } = useSettings();
  const currency = settingsData?.currency || 'EUR';
  const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 0 });

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

  const statusData = (data?.statusBreakdown || []).map((s, i) => {
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return { name: s.status.replace('_', ' '), value: s._count.status, color: colors[i % colors.length] };
  });

  const leadTimeData = ['0-6', '7-13', '14-29', '30+'].map((bin) => {
    const found = (data?.leadTimeDistribution || []).find((l) => l.bin === bin);
    return { bin, count: found ? Number(found.count) : 0 };
  });

  const comp = data?.comparison || {};
  const avgADR = monthly.length
    ? Math.round(monthly.reduce((s, m) => s + m.adr, 0) / monthly.length)
    : 0;
  const avgLead = monthly.length
    ? Math.round(monthly.reduce((s, m) => s + Number(m.lead_time) || 0, 0) / monthly.length)
    : 0;

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
          <KPICard label="Ingresos este mes" value={fmt.format(comp.revenueThisMonth || 0)} change={comp.revenueChange} icon={DollarSign} dark={dark} />
          <KPICard label="Reservas este mes" value={comp.reservationsThisMonth || 0} change={comp.reservationChange} icon={Calendar} dark={dark} />
          <KPICard label="ADR promedio" value={fmt.format(avgADR)} icon={Bed} dark={dark} />
          <KPICard label="Lead time promedio" value={`${avgLead} días`} icon={Clock} dark={dark} />
        </div>

        {/* Revenue & ADR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <RevenueChart monthly={monthly} dark={dark} />
          <ADRChart monthly={monthly} dark={dark} />
        </div>

        {/* Reservations & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ReservationsChart monthly={monthly} dark={dark} />
          <StatusPieChart statusData={statusData} dark={dark} />
        </div>

        {/* Lead Time & Top Rooms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadTimeChart leadTimeData={leadTimeData} dark={dark} />
          <TopRooms topRooms={data?.topRooms} />
        </div>
      </main>
    </Layout>
  );
}
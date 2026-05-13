import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../hooks/useQueries';
import { toast } from '../components/ToastProvider';

function SettingsSkeleton() {
  return (
    <div className="p-6 space-y-6 bg-surface-50 dark:bg-surface-900 min-h-screen">
      <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm space-y-3">
            <div className="h-5 w-32 bg-surface-100 dark:bg-surface-700 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-10 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    property_name: '',
    property_address: '',
    property_phone: '',
    property_email: '',
    check_in_time: '14:00',
    check_out_time: '10:00',
    currency: 'ARS',
    cancellation_policy: '',
    services_included: '',
  });

  useEffect(() => {
    if (settings) {
      setForm(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(form);
      toast.success('Configuración guardada correctamente');
    } catch (err) {
      toast.error('Error al guardar la configuración');
    }
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="p-6 space-y-6 bg-surface-50 dark:bg-surface-900 min-h-screen" role="main">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Configuración</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm">Administra la información de tu propiedad</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        {/* Información de la propiedad */}
        <section className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">Información de la propiedad</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="property_name" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Nombre de la propiedad
              </label>
              <input
                id="property_name"
                name="property_name"
                type="text"
                value={form.property_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Kambelleh"
              />
            </div>
            <div>
              <label htmlFor="property_address" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Dirección
              </label>
              <input
                id="property_address"
                name="property_address"
                type="text"
                value={form.property_address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Av. Ejemplo 123, Ciudad"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="property_phone" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Teléfono
                </label>
                <input
                  id="property_phone"
                  name="property_phone"
                  type="text"
                  value={form.property_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+54 11 1234 5678"
                />
              </div>
              <div>
                <label htmlFor="property_email" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Email
                </label>
                <input
                  id="property_email"
                  name="property_email"
                  type="email"
                  value={form.property_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="info@ejemplo.com"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Horarios */}
        <section className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">Horarios</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="check_in_time" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Check-in
              </label>
              <input
                id="check_in_time"
                name="check_in_time"
                type="time"
                value={form.check_in_time}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="check_out_time" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Check-out
              </label>
              <input
                id="check_out_time"
                name="check_out_time"
                type="time"
                value={form.check_out_time}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Moneda */}
        <section className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">Moneda</h2>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Moneda predeterminada
            </label>
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="USD">USD - Dólar Estadounidense</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
        </section>

        {/* Política de cancelación */}
        <section className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">Política de cancelación</h2>
          <div>
            <label htmlFor="cancellation_policy" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Política de cancelación
            </label>
            <textarea
              id="cancellation_policy"
              name="cancellation_policy"
              value={form.cancellation_policy}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Ej: Cancelación gratuita hasta 48 horas antes del check-in..."
            />
          </div>
        </section>

        {/* Servicios incluidos */}
        <section className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm">
          <h2 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">Servicios incluidos</h2>
          <div>
            <label htmlFor="services_included" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Servicios (uno por línea)
            </label>
            <textarea
              id="services_included"
              name="services_included"
              value={form.services_included}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="WiFi&#10;Desayuno&#10;Aire acondicionado"
            />
          </div>
        </section>

        {/* Botón guardar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-medium transition-colors"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {updateSettings.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
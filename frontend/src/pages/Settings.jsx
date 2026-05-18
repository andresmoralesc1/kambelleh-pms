import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Save, Loader2, Building2, Clock, Coins,
  Bell, MessageSquare, CreditCard, Link2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '../hooks/useQueries';
import { toast } from '../components/ToastProvider';

function Toggle({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label htmlFor={id} className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</label>
        {description && <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${checked ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, isOpen, onToggle, isDirty }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-600 dark:text-primary-300" />
      </div>
      <div className="flex-1">
        <h2 className="font-semibold text-surface-900 dark:text-surface-100">{title}</h2>
      </div>
      {isDirty && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Sin guardar</span>
      )}
      {isOpen ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
    </button>
  );
}

function CollapsibleSection({ icon: Icon, title, children, isOpen, onToggle, isDirty }) {
  return (
    <section className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
      <div className="p-5">
        <SectionHeader icon={Icon} title={title} isOpen={isOpen} onToggle={onToggle} isDirty={isDirty} />
      </div>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-surface-100 dark:border-surface-700 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}

function InputField({ id, label, type = 'text', description, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{label}</label>
      {description && <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">{description}</p>}
      <input
        id={id}
        type={type}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${error ? 'border-red-500' : 'border-surface-300 dark:border-surface-600'}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function SelectField({ id, label, children, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{label}</label>
      <select
        id={id}
        className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

function NumberField({ id, label, min, max, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        {...props}
      />
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="p-6 space-y-4 bg-surface-50 dark:bg-surface-900 min-h-screen">
      <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded-lg animate-pulse" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 shadow-sm">
            <div className="h-5 w-32 bg-surface-100 dark:bg-surface-700 rounded animate-pulse mb-4" />
            <div className="space-y-3">
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

const INITIAL_SECTIONS = {
  property: true,
  schedules: false,
  currency: false,
  cancellation: false,
  services: false,
  notifications: false,
  channels: false,
  payments: false,
};

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    property_name: '', property_address: '', property_phone: '', property_email: '',
    check_in_time: '14:00', check_out_time: '10:00',
    currency: 'ARS', cancellation_policy: '', services_included: '',
    notifications_email_confirmation: false, notifications_whatsapp_confirmation: false,
    notifications_reminder_checkin: false, notifications_reminder_checkout: false,
    channel_airbnb_enabled: false, channel_airbnb_listing_id: '',
    channel_google_enabled: false, channel_booking_enabled: false,
    payment_stripe_public_key: '', payment_default_method: 'card',
    payment_require_advance: false, payment_advance_percentage: 30,
  });

  const [openSections, setOpenSections] = useState(INITIAL_SECTIONS);
  const [dirtySections, setDirtySections] = useState({});
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (settings) setForm(prev => ({ ...prev, ...settings }));
  }, [settings]);

  const toggleSection = useCallback((key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: finalValue }));
    setDirtySections(prev => ({ ...prev, [name]: true }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (form.property_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.property_email)) {
      newErrors.property_email = 'Email inválido';
    }
    if (form.property_phone && !/^[+]?[\d\s\-()]{7,}$/.test(form.property_phone)) {
      newErrors.property_phone = 'Teléfono inválido';
    }
    if (form.payment_advance_percentage < 0 || form.payment_advance_percentage > 100) {
      newErrors.payment_advance_percentage = 'Debe estar entre 0 y 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Por favor corrige los errores');
      return;
    }
    try {
      await updateSettings.mutateAsync(form);
      setDirtySections({});
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
      toast.success('Configuración guardada correctamente');
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
      toast.error('Error al guardar la configuración');
    }
  };

  const isDirty = (section) => {
    if (section === 'property') return dirtySections.property_name || dirtySections.property_address || dirtySections.property_phone || dirtySections.property_email;
    if (section === 'schedules') return dirtySections.check_in_time || dirtySections.check_out_time;
    if (section === 'currency') return dirtySections.currency;
    if (section === 'cancellation') return dirtySections.cancellation_policy;
    if (section === 'services') return dirtySections.services_included;
    if (section === 'notifications') return dirtySections.notifications_email_confirmation || dirtySections.notifications_whatsapp_confirmation || dirtySections.notifications_reminder_checkin || dirtySections.notifications_reminder_checkout;
    if (section === 'channels') return dirtySections.channel_airbnb_enabled || dirtySections.channel_airbnb_listing_id || dirtySections.channel_google_enabled || dirtySections.channel_booking_enabled;
    if (section === 'payments') return dirtySections.payment_stripe_public_key || dirtySections.payment_default_method || dirtySections.payment_require_advance || dirtySections.payment_advance_percentage;
    return false;
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="p-6 space-y-4 bg-surface-50 dark:bg-surface-900 min-h-screen" role="main">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Configuración</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm">Administra la información de tu propiedad</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {/* Property Info */}
        <CollapsibleSection icon={Building2} title="Información de la propiedad" isOpen={openSections.property} onToggle={() => toggleSection('property')} isDirty={isDirty('property')}>
          <div className="space-y-3">
            <InputField id="property_name" name="property_name" label="Nombre de la propiedad" value={form.property_name} onChange={handleChange} placeholder="Kambelleh" />
            <InputField id="property_address" name="property_address" label="Dirección" value={form.property_address} onChange={handleChange} placeholder="Av. Ejemplo 123, Ciudad" />
            <div className="grid grid-cols-2 gap-3">
              <InputField id="property_phone" name="property_phone" label="Teléfono" value={form.property_phone} onChange={handleChange} placeholder="+54 11 1234 5678" error={errors.property_phone} />
              <InputField id="property_email" name="property_email" label="Email" type="email" value={form.property_email} onChange={handleChange} placeholder="info@ejemplo.com" error={errors.property_email} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Schedules */}
        <CollapsibleSection icon={Clock} title="Horarios de Check-in/out" isOpen={openSections.schedules} onToggle={() => toggleSection('schedules')} isDirty={isDirty('schedules')}>
          <div className="grid grid-cols-2 gap-4">
            <InputField id="check_in_time" name="check_in_time" label="Check-in" type="time" value={form.check_in_time} onChange={handleChange} />
            <InputField id="check_out_time" name="check_out_time" label="Check-out" type="time" value={form.check_out_time} onChange={handleChange} />
          </div>
        </CollapsibleSection>

        {/* Currency */}
        <CollapsibleSection icon={Coins} title="Moneda" isOpen={openSections.currency} onToggle={() => toggleSection('currency')} isDirty={isDirty('currency')}>
          <SelectField id="currency" name="currency" label="Moneda predeterminada" value={form.currency} onChange={handleChange}>
            <option value="ARS">ARS - Peso Argentino</option>
            <option value="COP">COP - Peso Colombiano</option>
            <option value="USD">USD - Dólar Estadounidense</option>
            <option value="EUR">EUR - Euro</option>
          </SelectField>
        </CollapsibleSection>

        {/* Cancellation */}
        <CollapsibleSection icon={AlertCircle} title="Política de cancelación" isOpen={openSections.cancellation} onToggle={() => toggleSection('cancellation')} isDirty={isDirty('cancellation')}>
          <textarea
            id="cancellation_policy"
            name="cancellation_policy"
            value={form.cancellation_policy}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Ej: Cancelación gratuita hasta 48 horas antes del check-in..."
          />
        </CollapsibleSection>

        {/* Services */}
        <CollapsibleSection icon={CheckCircle2} title="Servicios incluidos" isOpen={openSections.services} onToggle={() => toggleSection('services')} isDirty={isDirty('services')}>
          <textarea
            id="services_included"
            name="services_included"
            value={form.services_included}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="WiFi&#10;Desayuno&#10;Aire acondicionado"
          />
        </CollapsibleSection>

        {/* Notifications */}
        <CollapsibleSection icon={Bell} title="Notificaciones" isOpen={openSections.notifications} onToggle={() => toggleSection('notifications')} isDirty={isDirty('notifications')}>
          <div className="space-y-4">
            <Toggle id="notifications_email_confirmation" checked={form.notifications_email_confirmation} onChange={handleChange} label="Confirmación por email" description="Enviar confirmación de reserva por email" />
            <Toggle id="notifications_whatsapp_confirmation" checked={form.notifications_whatsapp_confirmation} onChange={handleChange} label="Confirmación por WhatsApp" description="Enviar confirmación de reserva por WhatsApp" />
            <Toggle id="notifications_reminder_checkin" checked={form.notifications_reminder_checkin} onChange={handleChange} label="Recordatorio de check-in" description="Enviar recordatorio un día antes del check-in" />
            <Toggle id="notifications_reminder_checkout" checked={form.notifications_reminder_checkout} onChange={handleChange} label="Recordatorio de check-out" description="Enviar recordatorio el día del check-out" />
          </div>
        </CollapsibleSection>

        {/* Channels */}
        <CollapsibleSection icon={Link2} title="Canales de reserva" isOpen={openSections.channels} onToggle={() => toggleSection('channels')} isDirty={isDirty('channels')}>
          <div className="space-y-4">
            <Toggle id="channel_airbnb_enabled" checked={form.channel_airbnb_enabled} onChange={handleChange} label="Airbnb" />
            {form.channel_airbnb_enabled && (
              <InputField id="channel_airbnb_listing_id" name="channel_airbnb_listing_id" label="Airbnb Listing ID" value={form.channel_airbnb_listing_id} onChange={handleChange} placeholder="ABC123XYZ" />
            )}
            <Toggle id="channel_google_enabled" checked={form.channel_google_enabled} onChange={handleChange} label="Google" />
            <Toggle id="channel_booking_enabled" checked={form.channel_booking_enabled} onChange={handleChange} label="Booking.com" />
          </div>
        </CollapsibleSection>

        {/* Payments */}
        <CollapsibleSection icon={CreditCard} title="Pagos" isOpen={openSections.payments} onToggle={() => toggleSection('payments')} isDirty={isDirty('payments')}>
          <div className="space-y-4">
            <InputField id="payment_stripe_public_key" name="payment_stripe_public_key" label="Stripe Public Key" value={form.payment_stripe_public_key} onChange={handleChange} placeholder="pk_test_..." />
            <SelectField id="payment_default_method" name="payment_default_method" label="Método de pago predeterminado" value={form.payment_default_method} onChange={handleChange}>
              <option value="card">Tarjeta</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </SelectField>
            <div className="space-y-3">
              <Toggle id="payment_require_advance" checked={form.payment_require_advance} onChange={handleChange} label="Requerir anticipo" description="Requerir pago anticipado para confirmar la reserva" />
              {form.payment_require_advance && (
                <NumberField id="payment_advance_percentage" name="payment_advance_percentage" label="Porcentaje de anticipo (%)" min={0} max={100} value={form.payment_advance_percentage} onChange={handleChange} error={errors.payment_advance_percentage} />
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'success' && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" /> Guardado
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" /> Error
              </span>
            )}
          </div>
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
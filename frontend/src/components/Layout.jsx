import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, DoorOpen, BookCheck, Users, LogOut, Bed, Menu, X, Sun, Moon, BarChart2, SprayCan, Settings, Link } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Role-based visibility
  const canSeeAnalytics = ['ADMIN', 'MANAGER'].includes(user?.role);
  const canSeeChannels = user?.role === 'ADMIN';
  const canSeeSettings = user?.role === 'ADMIN';
  const canSeeStaff = user?.role === 'ADMIN';

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(canSeeAnalytics ? [{ to: '/analytics', icon: BarChart2, label: 'Analíticas' }] : []),
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/rooms', icon: DoorOpen, label: 'Habitaciones' },
    { to: '/housekeeping', icon: SprayCan, label: 'Limpieza' },
    { to: '/reservations', icon: BookCheck, label: 'Reservas' },
    { to: '/guests', icon: Users, label: 'Huéspedes' },
    ...(canSeeChannels ? [{ to: '/channels', icon: Link, label: 'Canales' }] : []),
    ...(canSeeSettings ? [{ to: '/settings', icon: Settings, label: 'Configuración' }] : []),
    ...(canSeeStaff ? [{ to: '/staff', icon: Users, label: 'Personal' }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNavMouseEnter = (path) => {
    // Prefetch page chunk when user hovers nav item
    if (path !== '/dashboard') {
      // React Router v6: use window.history.pushState to warm up the router cache
      // The route chunk will be loaded when the user actually navigates
    }
  };

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-900">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
        Saltar al contenido principal
      </a>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside aria-label="Navegación principal" className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-surface-800 border-r border-surface-200 dark:border-surface-700
        flex flex-col transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Bed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-surface-900 dark:text-white text-lg leading-tight">Kambelleh</h1>
              <p className="text-xs text-surface-500">PMS</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-600 lg:hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            aria-label="Cerrar menú de navegación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              onMouseEnter={() => handleNavMouseEnter(to)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-l-2 border-primary-500 pl-[10px]'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:pl-[10px]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-sm font-semibold text-surface-600 dark:text-surface-300 flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{user?.name}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 capitalize">{user?.role?.toLowerCase() || 'Usuario'}</p>
            </div>
            <button
              onClick={toggle}
              className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-surface-500 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 p-4 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Bed className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-surface-900 dark:text-white">Kambelleh</span>
          </div>
        </div>

        {/* Main content */}
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
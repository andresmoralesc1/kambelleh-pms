import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, DoorOpen, BookCheck, Users, LogOut, Bed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendario' },
  { to: '/rooms', icon: DoorOpen, label: 'Habitaciones' },
  { to: '/reservations', icon: BookCheck, label: 'Reservas' },
  { to: '/guests', icon: Users, label: 'Huéspedes' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-surface-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-surface-200 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Bed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-surface-900 text-lg leading-tight">Kambelleh</h1>
              <p className="text-xs text-surface-500">PMS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-100'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-200 flex items-center justify-center text-sm font-semibold text-surface-700">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900 truncate">{user?.name}</p>
              <p className="text-xs text-surface-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
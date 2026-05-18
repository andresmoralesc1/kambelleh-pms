import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, X, Users, Trash2, Mail, Shield, Calendar } from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useChangePassword } from '../hooks/useQueries';
import { useToast } from '../components/ToastProvider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

const roleConfig = {
  ADMIN: { label: 'Administrador', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  MANAGER: { label: 'Gerencia', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  RECEPTIONIST: { label: 'Recepción', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
};

function RoleBadge({ role }) {
  const cfg = roleConfig[role] || roleConfig.RECEPTIONIST;
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function UserModal({ user, onClose }) {
  const [form, setForm] = useState(user || {
    name: '', email: '', role: 'RECEPTIONIST', password: '',
  });
  const [error, setError] = useState('');
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const toast = useToast();
  const isEditing = !!user;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Por favor, introduce un email válido');
      return;
    }

    // Validación de contraseña al crear
    if (!isEditing && !form.password) {
      setError('La contraseña es obligatoria');
      return;
    }

    if (!isEditing && form.password && form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      if (isEditing) {
        const { password, ...updateData } = form;
        await updateUser.mutateAsync({ id: user.id, data: updateData });
        toast.success('Usuario actualizado correctamente');
      } else {
        await createUser.mutateAsync(form);
        toast.success('Usuario creado correctamente');
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al guardar el usuario';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto modal-enter">
        <div className="flex items-center justify-between mb-4">
          <h2 id="user-modal-title" className="text-lg font-bold text-surface-900 dark:text-surface-100">{isEditing ? 'Editar' : 'Nuevo'} usuario</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Nombre completo *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
              required placeholder="María García López" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
              required placeholder="maria@kambelleh.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Rol *</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow">
              <option value="ADMIN">Administrador</option>
              <option value="MANAGER">Gerencia</option>
              <option value="RECEPTIONIST">Recepción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
              Contraseña {isEditing && <span className="text-surface-400 dark:text-surface-500">(solo si deseas cambiarla)</span>}
            </label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-sm bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
              placeholder={isEditing ? '••••••••' : 'Mínimo 6 caracteres'} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={createUser.isPending || updateUser.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {(createUser.isPending || updateUser.isPending) ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const changePassword = useChangePassword();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      await changePassword.mutateAsync({ id: user.id, data: { password } });
      toast.success('Contraseña actualizada correctamente');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="password-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 modal-enter">
        <div className="flex items-center justify-between mb-4">
          <h2 id="password-modal-title" className="text-lg font-bold text-surface-900">Cambiar contraseña</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-surface-100"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-surface-600">Usuario: <span className="font-medium text-surface-900">{user.name}</span></p>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Nueva contraseña *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
              required placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Confirmar contraseña *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow"
              required placeholder="Repite la contraseña" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 text-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={changePassword.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {changePassword.isPending ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserCard({ user, onEdit, onDelete, onChangePassword }) {
  const totalReservations = user._count?.reservations || 0;

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 flex items-center justify-center text-sm font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-surface-900 dark:text-surface-100">{user.name}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{totalReservations} reserva{totalReservations !== 1 ? 's' : ''} creada{totalReservations !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onChangePassword(user)}
            aria-label={`Cambiar contraseña de ${user.name}`}
            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-surface-500 dark:text-surface-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
            title="Cambiar contraseña">
            <Shield className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(user)}
            aria-label={`Editar usuario ${user.name}`}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(user)}
            aria-label={`Eliminar usuario ${user.name}`}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-surface-500 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-surface-600 dark:text-surface-400">
        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400 flex-shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={user.role} />
        </div>
        {user.createdAt && (
          <div className="flex items-center gap-2 text-xs text-surface-400 dark:text-surface-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Creado: {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: es })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Staff() {
  useEffect(() => { document.title = 'Personal — Kambelleh PMS'; }, []);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const { data, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const toast = useToast();

  const users = data?.users || [];

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
  });

  const handleDelete = (user) => {
    setConfirmState({
      title: 'Eliminar usuario',
      message: `¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      confirmVariant: 'danger',
      resolve: async (ok) => {
        if (!ok) return;
        try {
          await deleteUser.mutateAsync(user.id);
          toast.success(`Usuario ${user.name} eliminado`);
        } catch (err) {
          toast.error(err.response?.data?.error || 'No se pudo eliminar el usuario');
        }
      },
    });
  };

  const handleConfirm = () => { confirmState?.resolve?.(true); setConfirmState(null); };
  const handleCancel = () => { confirmState?.resolve?.(false); setConfirmState(null); };

  return (
    <div className="p-6 space-y-5 bg-surface-50 dark:bg-surface-900 min-h-screen" role="main">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Personal</h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          aria-label="Crear nuevo usuario">
          <Plus className="w-4 h-4" aria-hidden="true" /> Nuevo usuario
        </button>
      </header>

      {/* Search */}
      <div className="relative max-w-md">
        <label htmlFor="user-search" className="sr-only">Buscar usuarios</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 dark:text-surface-400" aria-hidden="true" />
        <input id="user-search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:shadow-md focus:shadow-primary-500/20 transition-shadow" />
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-white dark:bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-surface-500 dark:text-surface-400" />
          </div>
          <h3 className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Sin usuarios</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4 max-w-xs">
            {search ? `No se encontraron usuarios para "${search}"` : 'Registra tu primer usuario para gestionar el personal'}
          </p>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
            aria-label="Registrar usuario">
            <Plus className="w-4 h-4" aria-hidden="true" /> Registrar usuario
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => (
            <UserCard key={user.id} user={user}
              onEdit={(u) => { setEditingUser(u); setShowModal(true); }}
              onDelete={handleDelete}
              onChangePassword={(u) => setPasswordUser(u)} />
          ))}
        </div>
      )}

      {showModal && <UserModal user={editingUser} onClose={() => { setShowModal(false); setEditingUser(null); }} />}
      {passwordUser && <PasswordModal user={passwordUser} onClose={() => setPasswordUser(null)} />}
      {confirmState && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-[90] p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl w-full max-w-sm p-6 modal-enter">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">{confirmState.title}</h2>
              </div>
            </div>
            <p className="text-sm text-surface-600 dark:text-surface-400 mb-6">{confirmState.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-400 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 active:scale-[0.97] transition-all duration-150">Cancelar</button>
              <button onClick={handleConfirm} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/20 text-white text-sm font-medium active:scale-[0.97] transition-all duration-150">{confirmState.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
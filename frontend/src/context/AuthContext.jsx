import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister, refresh } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh().then(({ data }) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name, role) => {
    const { data } = await apiRegister({ email, password, name, role });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
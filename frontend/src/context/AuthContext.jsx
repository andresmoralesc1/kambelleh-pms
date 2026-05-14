import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, register as apiRegister, refresh } from '../api';
import api from '../api/index.js';

const CSRF_TOKEN_KEY = 'csrfToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(() => localStorage.getItem(CSRF_TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate existing session via refresh endpoint — reads httpOnly cookie
    refresh()
      .then(({ data }) => {
        setUser(data.user);
        if (data.csrfToken) {
          localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
          setCsrfToken(data.csrfToken);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    if (data.csrfToken) {
      localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password, name, role) => {
    const { data } = await apiRegister({ email, password, name, role });
    if (data.csrfToken) {
      localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    localStorage.removeItem(CSRF_TOKEN_KEY);
    setCsrfToken(null);
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, csrfToken, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
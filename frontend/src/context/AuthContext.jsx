import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, register as apiRegister, refresh } from '../api';
import api from '../api/index.js';

// Axios interceptor: withCredentials=true sends httpOnly cookies automatically
// No need to touch localStorage for auth — backend sets accessToken cookie
api.interceptors.request.use((config) => {
  // Let cookies be sent automatically via withCredentials: true
  return config;
});

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate existing session via refresh endpoint — reads httpOnly cookie
    refresh()
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    // Backend sets accessToken + refreshToken as httpOnly cookies
    // User data comes in the response body
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
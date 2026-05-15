import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, register as apiRegister, refresh } from '../api';
import api from '../api/index.js';

const CSRF_TOKEN_KEY = 'csrfToken';
const ACCESS_TOKEN_KEY = 'accessToken'; // for silent refresh timing

const AuthContext = createContext(null);

function parseJwtExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(() => localStorage.getItem(CSRF_TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);
  const isRefreshingRef = useRef(false);

  // Schedule a refresh 60 seconds before token expiry
  const scheduleRefresh = useCallback((accessToken) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const expiry = parseJwtExpiry(accessToken);
    if (!expiry) return;
    const msUntilRefresh = expiry - Date.now() - 60_000; // 1 min before
    if (msUntilRefresh <= 0) {
      // Token already expires in <= 60s, refresh now
      refresh().then(({ data }) => {
        setUser(data.user);
        if (data.csrfToken) {
          localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
          setCsrfToken(data.csrfToken);
        }
      }).catch(() => {});
      return;
    }
    refreshTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        const { data } = await refresh();
        setUser(data.user);
        if (data.csrfToken) {
          localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
          setCsrfToken(data.csrfToken);
        }
      } catch {
        // Refresh failed — let the user continue, they'll get logged out on next 401
      } finally {
        isRefreshingRef.current = false;
      }
    }, msUntilRefresh);
  }, []);

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

  // Intercept 401 responses globally to auto-refresh the session
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const { data } = await refresh();
            setUser(data.user);
            if (data.csrfToken) {
              localStorage.setItem(CSRF_TOKEN_KEY, data.csrfToken);
              setCsrfToken(data.csrfToken);
            }
            // Retry the original request with new token
            return api(originalRequest);
          } catch {
            setUser(null);
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
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
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
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
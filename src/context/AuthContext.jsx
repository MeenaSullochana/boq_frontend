import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('oi_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('oi_token'));

  useEffect(() => {
    const token = localStorage.getItem('oi_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('oi_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('oi_token');
        localStorage.removeItem('oi_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('oi_token', data.token);
    localStorage.setItem('oi_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('oi_token');
    localStorage.removeItem('oi_user');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === 'superadmin',
      isStaff: user?.role === 'staff',
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

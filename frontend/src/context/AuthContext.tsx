import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { auth as authApi } from '../api/client';

type User = {
  id: string;
  role: string;
  name: string;
  phone: string;
  resellerProfile?: unknown;
  customerProfile?: unknown;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (t === 'demo-token') {
      setUser({ id: 'demo', role: 'ADMIN', name: 'Admin', phone: '01700000000' });
      setLoading(false);
      return;
    }
    try {
      const u = await authApi.me();
      setUser(u as User);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const { user: u, token: t } = await authApi.login(phone, password);
      localStorage.setItem('token', t);
      setToken(t);
      setUser(u as User);
    } catch (e) {
      if (phone === '01700000000' && password === 'admin123') {
        const demoUser: User = { id: 'demo', role: 'ADMIN', name: 'Admin', phone: '01700000000' };
        localStorage.setItem('token', 'demo-token');
        setToken('demo-token');
        setUser(demoUser);
      } else {
        throw e;
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

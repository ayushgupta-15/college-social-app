import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { User } from '../types';

// ── Shape ─────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;              // true while checking stored token on boot
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<User>) => void; // optimistic local update
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app boot: restore persisted session from SecureStore
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        const storedUser  = await SecureStore.getItemAsync('user');

        if (storedToken && storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Refresh profile silently so stale data doesn't persist
          try {
            const { data } = await api.get<User>('/users/me');
            setUser(data);
            await SecureStore.setItemAsync('user', JSON.stringify(data));
          } catch {
            // If refresh fails (e.g. offline), use cached version — handled by 401 interceptor
          }
        }
      } catch (e) {
        // SecureStore read failure — treat as logged out
        console.warn('AuthContext boot error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync('token', newToken);
    await SecureStore.setItemAsync('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
  }, []);

  // Optimistic update — used after PATCH /users/me without a full re-fetch
  const updateUser = useCallback((updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updated };
      SecureStore.setItemAsync('user', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, updateUser }),
    [user, token, isLoading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

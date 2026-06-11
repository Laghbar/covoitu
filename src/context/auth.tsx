import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { api, AuthResponse, Role } from '@/lib/api';

export type User = { id: number; email: string; name: string; role: Role };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  showWelcome: boolean;
  dismissWelcome: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'harizana_token';
const USER_KEY  = 'harizana_user';

async function persist({ token, user }: AuthResponse) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY)
      .then((v) => { if (v) setUser(JSON.parse(v)); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    await persist(res);
    setUser(res.user);
    // no welcome on login
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: Role) => {
    const res = await api.register(name, email, password, role);
    await persist(res);
    setUser(res.user);
    setShowWelcome(true); // only registration triggers welcome
  }, []);

  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
    setShowWelcome(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, showWelcome, dismissWelcome, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

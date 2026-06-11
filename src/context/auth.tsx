import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { Role } from '@/lib/api';

export type User = { id: string; email: string; name: string; role: Role };

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  // Map a Supabase session user to our User type
  function toUser(supaUser: any): User | null {
    if (!supaUser) return null;
    return {
      id:    supaUser.id,
      email: supaUser.email ?? '',
      name:  supaUser.user_metadata?.name  ?? supaUser.email ?? '',
      role:  (supaUser.user_metadata?.role ?? 'passenger') as Role,
    };
  }

  // Restore session on mount and listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session?.user ?? null));
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user ?? null));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // onAuthStateChange will set the user
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: Role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw new Error(error.message);

    // No session means email confirmation is still ON in Supabase
    if (!data.session) {
      throw new Error('Account created! Please check your email to confirm it, then sign in.');
    }

    // Upsert profile row (don't rely on trigger alone)
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, name, role }, { onConflict: 'id' });
    }

    setShowWelcome(true);
  }, []);

  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // ignore sign-out errors
    } finally {
      setUser(null);
      setShowWelcome(false);
    }
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

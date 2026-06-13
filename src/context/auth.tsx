import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { Role } from '@/lib/api';
import { registerPushToken } from '@/lib/push-notifications';

export type VerificationStatus = 'unsubmitted' | 'pending_review' | 'verified' | 'rejected';

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_admin: boolean;
  suspended: boolean;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  verification_status: VerificationStatus | null; // drivers only
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  showWelcome: boolean;
  loginError: string | null;
  clearLoginError: () => void;
  dismissWelcome: () => void;
  login: (email: string, password: string, expectedRole?: Role) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loginError, setLoginError]   = useState<string | null>(null);

  // Stores the expected role during a login attempt so onAuthStateChange can check it
  const pendingRole = useRef<Role | null>(null);

  async function toUser(supaUser: any): Promise<User | null> {
    if (!supaUser) return null;
    const role = (supaUser.user_metadata?.role ?? 'passenger') as Role;

    const metaAdmin = supaUser.user_metadata?.is_admin === true;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, suspended, phone, phone_verified')
      .eq('id', supaUser.id)
      .single();

    let verification_status: VerificationStatus | null = null;
    if (role === 'driver') {
      const { data: verif } = await supabase
        .from('driver_verifications')
        .select('status')
        .eq('driver_id', supaUser.id)
        .single();
      verification_status = (verif?.status ?? 'unsubmitted') as VerificationStatus;
    }

    return {
      id:                  supaUser.id,
      email:               supaUser.email ?? '',
      name:                supaUser.user_metadata?.name ?? supaUser.email ?? '',
      role,
      is_admin:            metaAdmin || (profile?.is_admin ?? false),
      suspended:           profile?.suspended    ?? false,
      phone:               profile?.phone        ?? null,
      phone_verified:      profile?.phone_verified ?? false,
      email_verified:      !!supaUser.email_confirmed_at,
      verification_status,
    };
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(await toUser(data.session?.user ?? null));
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = await toUser(session?.user ?? null);

      // Role / admin check — runs inside onAuthStateChange so the error
      // survives any auth-screen re-mount caused by the sign-out
      if (u && pendingRole.current) {
        if (u.is_admin && Platform.OS === 'web') {
          // Admin tried to log in through the regular user flow on web
          pendingRole.current = null;
          setLoginError('This is an admin account. Please use the Admin Portal.');
          await supabase.auth.signOut();
          return;
        }
        if (!u.is_admin && u.role !== pendingRole.current) {
          // Regular user selected the wrong role
          const actualLabel = u.role === 'driver' ? 'Driver' : 'Passenger';
          pendingRole.current = null;
          setLoginError(
            `This account is registered as a ${actualLabel}. ` +
            `Go back and select "${actualLabel}" to sign in.`
          );
          await supabase.auth.signOut();
          return;
        }
      }

      pendingRole.current = null;
      setUser(u);
      if (u) registerPushToken(u.id).catch(() => {});
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const login = useCallback(async (email: string, password: string, expectedRole?: Role) => {
    setLoginError(null);
    pendingRole.current = expectedRole ?? null;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      pendingRole.current = null;
      throw new Error(error.message);
    }
    // onAuthStateChange handles role validation and calls setUser
  }, []);

  const register = useCallback(async (name: string, email: string, phone: string, password: string, role: Role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) throw new Error(error.message);

    if (!data.session) {
      throw new Error('CHECK_EMAIL');
    }

    if (data.user) {
      await supabase.from('profiles').upsert(
        { id: data.user.id, name, role, phone: phone || null },
        { onConflict: 'id' },
      );
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

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(await toUser(data.user ?? null));
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoading, showWelcome, loginError,
      clearLoginError, dismissWelcome, login, register, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

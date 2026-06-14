import { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { AdminOverview }      from './admin/overview';
import { AdminUsers }         from './admin/users';
import { AdminRides }         from './admin/rides';
import { AdminPayments }      from './admin/payments';
import { AdminVerifications } from './admin/verifications';
import { AdminWithdrawals }   from './admin/withdrawals';

const C = '#6366F1';

type TabKey = 'overview' | 'users' | 'verifications' | 'rides' | 'payments' | 'withdrawals';
const NAV: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview',      label: 'Overview',     icon: '📊' },
  { key: 'users',         label: 'Users',        icon: '👥' },
  { key: 'verifications', label: 'Verifications',icon: '🛡️' },
  { key: 'rides',         label: 'Rides',        icon: '🚗' },
  { key: 'payments',      label: 'Payments',     icon: '💳' },
  { key: 'withdrawals',   label: 'Retraits',     icon: '🏦' },
];

// ─── Login form ───────────────────────────────────────────────────────────────

function AdminLogin() {
  const { login, loginError, clearLoginError } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const submit = async () => {
    if (!email.trim()) { setError('Enter your email.'); return; }
    if (!password)     { setError('Enter your password.'); return; }
    setLoading(true);
    setError('');
    try {
      // No role arg — onAuthStateChange will set user; we check is_admin below
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = error || loginError;

  return (
    <View style={ls.root}>
      <View style={ls.card}>
        {/* Logo */}
        <View style={ls.logoRow}>
          <View style={ls.logoBox}><Text style={{ fontSize: 26 }}>🛡️</Text></View>
          <View>
            <Text style={ls.logoTitle}>Horizon Admin</Text>
            <Text style={ls.logoSub}>Restricted — admin access only</Text>
          </View>
        </View>

        <Text style={ls.heading}>Sign in to Admin Portal</Text>

        <View style={ls.field}>
          <Text style={ls.label}>Email address</Text>
          <TextInput
            style={ls.input}
            value={email}
            onChangeText={v => { setEmail(v); setError(''); clearLoginError(); }}
            placeholder="admin@horizon.ma"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={ls.field}>
          <Text style={ls.label}>Password</Text>
          <TextInput
            style={ls.input}
            value={password}
            onChangeText={v => { setPassword(v); setError(''); clearLoginError(); }}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
          />
        </View>

        {displayError ? (
          <View style={ls.errorBox}>
            <Text style={ls.errorTxt}>⚠️ {displayError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[ls.btn, (loading || !email || !password) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={loading || !email || !password}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={ls.btnTxt}>Sign In</Text>}
        </Pressable>

        <Text style={ls.notice}>
          This portal is for administrators only.{'\n'}
          Regular users should use the Horizon mobile app.
        </Text>
      </View>
    </View>
  );
}

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <Text style={{ fontSize: 56 }}>🚫</Text>
      <Text style={{ fontSize: 24, fontWeight: '900', color: '#1E293B' }}>Access Denied</Text>
      <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, maxWidth: 380 }}>
        Your account does not have administrator privileges.{'\n'}
        Only platform admins can access this portal.
      </Text>
      <Pressable
        onPress={onSignOut}
        style={{ backgroundColor: '#EF4444', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

// ─── Sidebar dashboard ────────────────────────────────────────────────────────

function Dashboard({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const initial = (name[0] ?? 'A').toUpperCase();

  return (
    <View style={ds.root}>
      {/* Sidebar */}
      <View style={ds.sidebar}>
        <View style={ds.brand}>
          <View style={ds.brandIcon}><Text style={{ fontSize: 20 }}>🛡️</Text></View>
          <View>
            <Text style={ds.brandName}>Horizon</Text>
            <Text style={ds.brandSub}>Admin Portal</Text>
          </View>
        </View>

        <View style={ds.nav}>
          {NAV.map(item => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[ds.navItem, active && ds.navItemActive]}
              >
                <Text style={ds.navIcon}>{item.icon}</Text>
                <Text style={[ds.navLabel, active && ds.navLabelActive]}>{item.label}</Text>
                {active && <View style={ds.activeDot} />}
              </Pressable>
            );
          })}
        </View>

        <View style={ds.userCard}>
          <View style={[ds.avatar, { backgroundColor: C }]}>
            <Text style={ds.avatarTxt}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ds.userName} numberOfLines={1}>{name}</Text>
            <Text style={ds.userRole}>Administrator</Text>
          </View>
          <Pressable onPress={onSignOut} style={ds.signOutBtn}>
            <Text style={ds.signOutIcon}>⏻</Text>
          </Pressable>
        </View>
      </View>

      {/* Main */}
      <View style={ds.main}>
        <View style={ds.topBar}>
          <View>
            <Text style={ds.pageTitle}>{NAV.find(n => n.key === tab)?.label}</Text>
            <Text style={ds.pageDate}>
              {new Date().toLocaleDateString('fr-MA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
          <View style={ds.badge}>
            <Text style={ds.badgeTxt}>🔐 Admin</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {tab === 'overview'      && <AdminOverview />}
          {tab === 'users'         && <AdminUsers />}
          {tab === 'verifications' && <AdminVerifications />}
          {tab === 'rides'         && <AdminRides />}
          {tab === 'payments'      && <AdminPayments />}
          {tab === 'withdrawals'   && <AdminWithdrawals />}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function AdminPortalPage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' }}>
        <ActivityIndicator size="large" color={C} />
      </View>
    );
  }

  if (!user) return <AdminLogin />;
  if (!user.is_admin) return <AccessDenied onSignOut={logout} />;

  return <Dashboard name={user.name} onSignOut={logout} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 440, backgroundColor: '#fff',
    borderRadius: 20, padding: 40, gap: 20,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 32, elevation: 12,
  },
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoBox:   { width: 52, height: 52, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  logoSub:   { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  heading:   { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  field:     { gap: 6 },
  label:     { fontSize: 13, fontWeight: '600', color: '#475569' },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E2E8F0', paddingHorizontal: 14,
    fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC',
  },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorTxt: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  btn: {
    height: 50, backgroundColor: C, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnTxt:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  notice:  { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
});

const ds = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F5F3FF' },

  sidebar: {
    width: 240, backgroundColor: '#fff',
    borderRightWidth: 1, borderRightColor: '#E2E8F0',
    paddingVertical: 24, gap: 8,
    // @ts-ignore web sticky
    position: 'sticky', top: 0, height: '100vh',
  },
  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8,
  },
  brandIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  brandSub:  { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 1 },

  nav:          { flex: 1, paddingHorizontal: 12, gap: 2 },
  navItem:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  navItemActive:{ backgroundColor: '#EDE9FE' },
  navIcon:      { fontSize: 16, width: 22, textAlign: 'center' },
  navLabel:     { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748B' },
  navLabelActive: { color: C, fontWeight: '700' },
  activeDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: C },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, padding: 12,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  avatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },
  userName:   { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  userRole:   { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  signOutBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  signOutIcon:{ fontSize: 14, color: '#EF4444' },

  main:    { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 28, paddingVertical: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  pageDate:  { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  badge:     { backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeTxt:  { fontSize: 13, fontWeight: '700', color: C },
});

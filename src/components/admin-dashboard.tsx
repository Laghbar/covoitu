import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { AdminOverview }       from './admin/overview';
import { AdminUsers }          from './admin/users';
import { AdminRides }          from './admin/rides';
import { AdminPayments }       from './admin/payments';
import { AdminReviews }        from './admin/reviews';
import { AdminVerifications }  from './admin/verifications';

const C = '#6366F1';

type TabKey = 'overview' | 'users' | 'verifications' | 'rides' | 'payments';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'overview',       label: 'Overview', emoji: '📊' },
  { key: 'users',          label: 'Users',    emoji: '👥' },
  { key: 'verifications',  label: 'Verify',   emoji: '🛡️' },
  { key: 'rides',          label: 'Rides',    emoji: '🚗' },
  { key: 'payments',       label: 'Payments', emoji: '💳' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]    = useState<TabKey>('overview');
  const insets           = useSafeAreaInsets();

  const initial = (user?.name?.[0] ?? 'A').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      {/* Top app bar */}
      <View style={[styles.topSafe, { paddingTop: insets.top }]}>
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <View style={[styles.appLogo, { backgroundColor: C }]}>
              <Text style={{ fontSize: 14 }}>🛡️</Text>
            </View>
            <Text style={styles.appName}>Admin Panel</Text>
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>Admin</Text>
            </View>
          </View>
          <View style={styles.appBarRight}>
            <Pressable onPress={logout} style={styles.signOutBtn}>
              <Text style={styles.signOutTxt}>Sign Out</Text>
            </Pressable>
            <View style={[styles.avatarBtn, { backgroundColor: C }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Page content */}
      <View style={{ flex: 1 }}>
        {tab === 'overview'       && <AdminOverview />}
        {tab === 'users'          && <AdminUsers />}
        {tab === 'verifications'  && <AdminVerifications />}
        {tab === 'rides'          && <AdminRides />}
        {tab === 'payments'       && <AdminPayments />}
      </View>

      {/* Bottom tab bar */}
      <View style={{ paddingBottom: insets.bottom, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
        <View style={styles.tabBar}>
          {TABS.map(tab_ => {
            const focused = tab_.key === tab;
            return (
              <Pressable key={tab_.key} style={styles.tabItem} onPress={() => setTab(tab_.key)}>
                {focused && <View style={[styles.tabActiveBar, { backgroundColor: C }]} />}
                <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{tab_.emoji}</Text>
                <Text style={[styles.tabLabel, focused && { color: C, fontWeight: '700' }]}>
                  {tab_.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topSafe: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  appBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLogo: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: 17, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  adminPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: C + '18',
  },
  adminPillText: { fontSize: 11, fontWeight: '700', color: C },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  signOutBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FEE2E2' },
  signOutTxt:  { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  avatarBtn:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontSize: 14, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 0 : 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute',
    top: 0, left: 12, right: 12,
    height: 3, borderRadius: 2,
  },
  tabEmoji:       { fontSize: 22, opacity: 0.4 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
});

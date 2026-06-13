import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { DriverHome }                from './driver/home';
import { DriverCreateTrip }         from './driver/create-trip';
import { DriverRides }              from './driver/rides';
import { DriverProfile }            from './driver/profile';
import { DriverWallet }             from './driver/wallet';
import { DriverPassengerRequests }  from './driver/passenger-requests';
import { NotificationsPanel }       from './driver/notifications-panel';

export const DRIVER_COLOR = '#10B981';

type TabKey = 'home' | 'create' | 'rides' | 'requests' | 'wallet' | 'profile';

const TABS: { key: TabKey; emoji: string; label: string }[] = [
  { key: 'home',     emoji: '🏠', label: 'Home'    },
  { key: 'create',   emoji: '➕', label: 'Trip'    },
  { key: 'rides',    emoji: '🚗', label: 'Rides'   },
  { key: 'requests', emoji: '📋', label: 'Requests'},
  { key: 'profile',  emoji: '👤', label: 'Profile' },
];

function AppBar({
  pendingCount,
  walletBalance,
  onBellPress,
  onAvatarPress,
  onWalletPress,
}: {
  pendingCount: number;
  walletBalance: number | null;
  onBellPress: () => void;
  onAvatarPress: () => void;
  onWalletPress: () => void;
}) {
  const { user } = useAuth();
  const initial  = (user?.name?.[0] ?? 'D').toUpperCase();

  return (
    <View style={styles.appBar}>
      <View style={styles.appBarLeft}>
        <View style={[styles.appLogo, { backgroundColor: DRIVER_COLOR }]}>
          <Text style={{ fontSize: 12 }}>🚗</Text>
        </View>
        <Text style={styles.appName}>Horizon</Text>
        <View style={[styles.rolePill, { backgroundColor: DRIVER_COLOR + '18' }]}>
          <Text style={[styles.roleText, { color: DRIVER_COLOR }]}>Driver</Text>
        </View>
      </View>
      <View style={styles.appBarRight}>
        {walletBalance !== null && (
          <Pressable style={styles.walletChip} onPress={onWalletPress}>
            <Text style={styles.walletChipTxt}>💰 {walletBalance.toFixed(0)} MAD</Text>
          </Pressable>
        )}
        <Pressable style={styles.bellWrap} onPress={onBellPress}>
          <Text style={styles.bellIcon}>🔔</Text>
          {pendingCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={onAvatarPress} style={[styles.avatarBtn, { backgroundColor: DRIVER_COLOR }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BottomTabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {TABS.map(tab => {
        const focused = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.tabItem} onPress={() => onChange(tab.key)}>
            {focused && <View style={[styles.tabActiveBar, { backgroundColor: DRIVER_COLOR }]} />}
            <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, focused && { color: DRIVER_COLOR, fontWeight: '700' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const [tab,            setTab]            = useState<TabKey>('home');
  const [pendingCount,   setPendingCount]   = useState(0);
  const [panelVisible,   setPanelVisible]   = useState(false);
  const [walletBalance,  setWalletBalance]  = useState<number | null>(null);

  const fetchPendingCount = useCallback(async () => {
    if (!user) return;
    const { data: rides } = await supabase.from('rides').select('id').eq('driver_id', user.id);
    const ids = rides?.map(r => r.id) ?? [];
    if (!ids.length) { setPendingCount(0); return; }
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .in('ride_id', ids)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, [user]);

  const fetchWalletBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('driver_wallets')
      .select('balance')
      .eq('driver_id', user.id)
      .single();
    setWalletBalance(data?.balance ?? 0);
  }, [user]);

  useEffect(() => { fetchPendingCount(); }, [fetchPendingCount]);
  useEffect(() => { fetchWalletBalance(); }, [fetchWalletBalance]);


  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('driver-bookings-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchPendingCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPendingCount]);

  const navigate = (key: string) => setTab(key as TabKey);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={[styles.topSafe, { paddingTop: insets.top }]}>
        <AppBar
          pendingCount={pendingCount}
          walletBalance={walletBalance}
          onBellPress={() => setPanelVisible(true)}
          onAvatarPress={() => setTab('profile')}
          onWalletPress={() => setTab('wallet')}
        />
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'home'     && <DriverHome                onNavigate={navigate} />}
        {tab === 'create'   && <DriverCreateTrip          onNavigate={navigate} onWalletUpdated={fetchWalletBalance} />}
        {tab === 'rides'    && <DriverRides               onNavigate={navigate} />}
        {tab === 'requests' && <DriverPassengerRequests />}
        {tab === 'profile'  && <DriverProfile />}
      </View>

      <View style={{ paddingBottom: insets.bottom, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
        <BottomTabBar active={tab} onChange={setTab} />
      </View>

      <NotificationsPanel
        visible={panelVisible}
        onClose={() => setPanelVisible(false)}
        onCountChange={setPendingCount}
      />
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  appBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogo: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  appName:  { fontSize: 17, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700' },

  walletChip: {
    backgroundColor: DRIVER_COLOR + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  walletChipTxt: { fontSize: 12, fontWeight: '700', color: DRIVER_COLOR },

  bellWrap: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
  },
  bellBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  avatarBtn:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 0 : 6,
  },
  tabItem: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4, position: 'relative',
  },
  tabActiveBar: {
    position: 'absolute', top: 0, left: 12, right: 12, height: 3, borderRadius: 2,
  },
  tabEmoji:       { fontSize: 22, opacity: 0.4 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
});

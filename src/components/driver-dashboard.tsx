import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { DriverHome } from './driver/home';
import { DriverCreateTrip } from './driver/create-trip';
import { DriverRides } from './driver/rides';
import { DriverInvitations } from './driver/invitations';
import { DriverVehicle } from './driver/vehicle';
import { DriverMessages } from './driver/messages';
import { DriverProfile } from './driver/profile';

export const DRIVER_COLOR = '#10B981';

type TabKey = 'home' | 'create' | 'rides' | 'invitations' | 'vehicle' | 'messages' | 'profile';

const TABS: { key: TabKey; label: string; icon: { ios: string; android: string } }[] = [
  { key: 'home',        label: 'Home',        icon: { ios: 'house.fill',           android: 'home' } },
  { key: 'create',      label: 'Create Trip', icon: { ios: 'plus.circle.fill',     android: 'add_circle' } },
  { key: 'rides',       label: 'My Rides',    icon: { ios: 'car.fill',             android: 'directions_car' } },
  { key: 'invitations', label: 'Invitations', icon: { ios: 'envelope.fill',        android: 'mail' } },
  { key: 'vehicle',     label: 'Vehicle',     icon: { ios: 'car.2.fill',           android: 'commute' } },
  { key: 'messages',    label: 'Messages',    icon: { ios: 'message.fill',         android: 'chat' } },
  { key: 'profile',     label: 'Profile',     icon: { ios: 'person.fill',          android: 'person' } },
];

function TopNavBar({ active, onChange, inviteCount }: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  inviteCount?: number;
}) {
  const { user } = useAuth();
  const initial = (user?.name?.[0] ?? 'D').toUpperCase();

  return (
    <View style={styles.navContainer}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <View style={[styles.appLogo, { backgroundColor: DRIVER_COLOR }]}>
            <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={14} tintColor="#fff" />
          </View>
          <Text style={styles.appName}>Harizana</Text>
          <View style={[styles.rolePill, { backgroundColor: DRIVER_COLOR + '18' }]}>
            <Text style={[styles.roleText, { color: DRIVER_COLOR }]}>Driver</Text>
          </View>
        </View>
        <Pressable onPress={() => onChange('profile')} style={[styles.avatarBtn, { backgroundColor: DRIVER_COLOR }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      {/* Horizontal tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabStrip}>
        {TABS.map((tab) => {
          const focused = tab.key === active;
          const hasNotif = tab.key === 'invitations' && (inviteCount ?? 0) > 0;
          return (
            <Pressable key={tab.key} style={styles.tabItem} onPress={() => onChange(tab.key)}>
              <View style={styles.tabIconRow}>
                <SymbolView
                  name={tab.icon as any}
                  size={18}
                  tintColor={focused ? DRIVER_COLOR : '#94A3B8'}
                />
                {hasNotif && <View style={[styles.notifDot, { backgroundColor: '#EF4444' }]} />}
              </View>
              <Text style={[styles.tabLabel, focused && { color: DRIVER_COLOR, fontWeight: '700' }]}>
                {tab.label}
              </Text>
              {focused && <View style={[styles.activeBar, { backgroundColor: DRIVER_COLOR }]} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function DriverDashboard() {
  const [tab, setTab] = useState<TabKey>('home');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopNavBar active={tab} onChange={setTab} inviteCount={3} />
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'home'        && <DriverHome        onNavigate={(k) => setTab(k as TabKey)} />}
        {tab === 'create'      && <DriverCreateTrip  onNavigate={(k) => setTab(k as TabKey)} />}
        {tab === 'rides'       && <DriverRides        onNavigate={(k) => setTab(k as TabKey)} />}
        {tab === 'invitations' && <DriverInvitations />}
        {tab === 'vehicle'     && <DriverVehicle />}
        {tab === 'messages'    && <DriverMessages />}
        {tab === 'profile'     && <DriverProfile />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
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
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLogo: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: 17, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700' },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  tabStrip: { paddingHorizontal: 8, paddingBottom: 0 },
  tabItem: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 0, gap: 4, minWidth: 72 },
  tabIconRow: { position: 'relative' },
  notifDot: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#fff',
  },
  tabLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  activeBar: { height: 3, width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
});

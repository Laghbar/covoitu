import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { PassengerHome }      from './passenger/home';
import { PassengerSearch }    from './passenger/search';
import { PassengerRideDetail } from './passenger/ride-detail';
import { PassengerBookings }  from './passenger/bookings';
import { PassengerPayments }  from './passenger/payments';
import { PassengerMessages }  from './passenger/messages';
import { PassengerProfile }   from './passenger/profile';

export const PASSENGER_COLOR = '#3B82F6';

type TabKey = 'home' | 'search' | 'bookings' | 'payments' | 'messages' | 'profile';

const TABS: { key: TabKey; label: string; icon: { ios: string; android: string } }[] = [
  { key: 'home',     label: 'Home',      icon: { ios: 'house.fill',              android: 'home' } },
  { key: 'search',   label: 'Search',    icon: { ios: 'magnifyingglass',         android: 'search' } },
  { key: 'bookings', label: 'Bookings',  icon: { ios: 'ticket.fill',             android: 'confirmation_number' } },
  { key: 'payments', label: 'Payments',  icon: { ios: 'creditcard.fill',         android: 'credit_card' } },
  { key: 'messages', label: 'Messages',  icon: { ios: 'message.fill',            android: 'chat' } },
  { key: 'profile',  label: 'Profile',   icon: { ios: 'person.fill',             android: 'person' } },
];

export type RideItem = {
  id: string; from: string; to: string; date: string; time: string;
  price: number; seats: number; bookedSeats: number;
  driver: { name: string; initial: string; rating: number; trips: number; memberSince: string; bio: string };
  car: { make: string; model: string; year: string; color: string; plate: string };
  preferences: string[]; pickupPoint: string; dropoffPoint: string; note?: string;
};

function TopNavBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const { user } = useAuth();
  const initial = (user?.name?.[0] ?? 'P').toUpperCase();

  return (
    <View style={styles.navContainer}>
      <View style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <View style={[styles.appLogo, { backgroundColor: PASSENGER_COLOR }]}>
            <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={14} tintColor="#fff" />
          </View>
          <Text style={styles.appName}>Harizana</Text>
          <View style={[styles.rolePill, { backgroundColor: PASSENGER_COLOR + '18' }]}>
            <Text style={[styles.roleText, { color: PASSENGER_COLOR }]}>Passenger</Text>
          </View>
        </View>
        <Pressable onPress={() => onChange('profile')} style={[styles.avatarBtn, { backgroundColor: PASSENGER_COLOR }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
        {TABS.map((tab) => {
          const focused = tab.key === active;
          return (
            <Pressable key={tab.key} style={styles.tabItem} onPress={() => onChange(tab.key)}>
              <SymbolView
                name={tab.icon as any}
                size={18}
                tintColor={focused ? PASSENGER_COLOR : '#94A3B8'}
              />
              <Text style={[styles.tabLabel, focused && { color: PASSENGER_COLOR, fontWeight: '700' }]}>
                {tab.label}
              </Text>
              {focused && <View style={[styles.activeBar, { backgroundColor: PASSENGER_COLOR }]} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function PassengerDashboard() {
  const [tab, setTab]             = useState<TabKey>('home');
  const [selectedRide, setSelectedRide] = useState<RideItem | null>(null);
  const [searchQuery, setSearchQuery]   = useState<{ from: string; to: string; date: string; seats: string } | null>(null);
  const insets = useSafeAreaInsets();

  const navigate = (key: string, payload?: any) => {
    if (key === 'ride-detail') { setSelectedRide(payload); return; }
    if (key === 'search' && payload) { setSearchQuery(payload); }
    setSelectedRide(null);
    setTab(key as TabKey);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopNavBar active={tab} onChange={(k) => { setSelectedRide(null); setTab(k); }} />
      </View>

      <View style={{ flex: 1 }}>
        {selectedRide ? (
          <PassengerRideDetail ride={selectedRide} onBack={() => setSelectedRide(null)} onNavigate={navigate} />
        ) : (
          <>
            {tab === 'home'     && <PassengerHome     onNavigate={navigate} />}
            {tab === 'search'   && <PassengerSearch   onNavigate={navigate} initialQuery={searchQuery} />}
            {tab === 'bookings' && <PassengerBookings onNavigate={navigate} />}
            {tab === 'payments' && <PassengerPayments />}
            {tab === 'messages' && <PassengerMessages />}
            {tab === 'profile'  && <PassengerProfile  />}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appLogo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 17, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700' },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  tabStrip: { paddingHorizontal: 8 },
  tabItem: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 0, gap: 4, minWidth: 72 },
  tabLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  activeBar: { height: 3, width: '100%', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
});

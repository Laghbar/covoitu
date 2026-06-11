import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RideItem } from '../passenger-dashboard';

const C = '#3B82F6';

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Agadir', 'Fès', 'Tanger', 'Meknès', 'Oujda'];

const RECENT = [
  { from: 'Casablanca', to: 'Rabat' },
  { from: 'Marrakech',  to: 'Agadir' },
  { from: 'Fès',        to: 'Meknès' },
];

export const FEATURED_RIDES: RideItem[] = [
  {
    id: '1', from: 'Casablanca', to: 'Rabat', date: '2026-06-15', time: '08:30',
    price: 45, seats: 3, bookedSeats: 1,
    driver: { name: 'Mohammed Alami', initial: 'M', rating: 4.8, trips: 142, memberSince: '2023', bio: 'Experienced driver, always on time. I like calm trips with good music.' },
    car: { make: 'Dacia', model: 'Logan', year: '2020', color: 'White', plate: '12348 A 5' },
    preferences: ['No Smoke', 'Music', 'A/C'],
    pickupPoint: 'Gare Routière Ouled Ziane', dropoffPoint: 'Agdal, Rabat',
    note: 'Please be on time, I leave exactly at 08:30.',
  },
  {
    id: '2', from: 'Casablanca', to: 'Rabat', date: '2026-06-15', time: '09:00',
    price: 40, seats: 3, bookedSeats: 0,
    driver: { name: 'Samira Benali', initial: 'S', rating: 4.9, trips: 87, memberSince: '2024', bio: 'Female driver. Calm and safe driver. I enjoy music during long trips.' },
    car: { make: 'Renault', model: 'Clio', year: '2022', color: 'Grey', plate: '54321 B 2' },
    preferences: ['Luggage', 'A/C', 'Chatty'],
    pickupPoint: 'Maarif, Casablanca', dropoffPoint: 'Hassan, Rabat',
  },
  {
    id: '3', from: 'Casablanca', to: 'Marrakech', date: '2026-06-16', time: '07:00',
    price: 120, seats: 2, bookedSeats: 1,
    driver: { name: 'Karim Lahlou', initial: 'K', rating: 4.7, trips: 203, memberSince: '2022', bio: 'Professional driver doing this route every week. Clean car, good music.' },
    car: { make: 'Volkswagen', model: 'Polo', year: '2021', color: 'Black', plate: '98765 C 3' },
    preferences: ['No Smoke', 'Pets OK', 'A/C'],
    pickupPoint: 'Sidi Maarouf, Casablanca', dropoffPoint: 'Guéliz, Marrakech',
    note: 'Stop at Settat for 10 min.',
  },
];

function MiniRideCard({ ride, onPress }: { ride: RideItem; onPress: () => void }) {
  const available = ride.seats - ride.bookedSeats;
  return (
    <Pressable style={styles.miniCard} onPress={onPress}>
      <View style={[styles.miniAvatar, { backgroundColor: C + '18' }]}>
        <Text style={[styles.miniInitial, { color: C }]}>{ride.driver.initial}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.miniRoute}>{ride.from} → {ride.to}</Text>
        <View style={styles.miniMeta}>
          <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={10} tintColor="#F59E0B" />
          <Text style={styles.miniMetaText}>{ride.driver.rating} · {ride.time} · {available} seat{available !== 1 ? 's' : ''} left</Text>
        </View>
      </View>
      <View style={[styles.miniPrice, { backgroundColor: C }]}>
        <Text style={styles.miniPriceText}>{ride.price} MAD</Text>
      </View>
    </Pressable>
  );
}

type Props = { onNavigate: (key: string, payload?: any) => void };

export function PassengerHome({ onNavigate }: Props) {
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [date, setDate]   = useState('');
  const [seats, setSeats] = useState('1');

  const search = () => {
    onNavigate('search', { from, to, date, seats });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Search card */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Find a Ride</Text>

        <View style={styles.routeBox}>
          <View style={styles.inputRow}>
            <SymbolView name={{ ios: 'location.fill', android: 'location_on' } as any} size={15} tintColor={C} />
            <TextInput
              style={styles.input} value={from} onChangeText={setFrom}
              placeholder="Departure city" placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={styles.routeDivider}>
            <View style={styles.routeLine} />
            <Pressable style={[styles.swapBtn, { borderColor: C + '40' }]} onPress={() => { const t = from; setFrom(to); setTo(t); }}>
              <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert' } as any} size={13} tintColor={C} />
            </Pressable>
            <View style={styles.routeLine} />
          </View>
          <View style={styles.inputRow}>
            <SymbolView name={{ ios: 'mappin', android: 'place' } as any} size={15} tintColor="#EF4444" />
            <TextInput
              style={styles.input} value={to} onChangeText={setTo}
              placeholder="Destination city" placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputRow, { flex: 2, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}>
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={14} tintColor="#94A3B8" />
            <TextInput
              style={[styles.input, { fontSize: 14 }]} value={date} onChangeText={setDate}
              placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={[styles.inputRow, { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}>
            <SymbolView name={{ ios: 'person.fill', android: 'person' } as any} size={14} tintColor="#94A3B8" />
            <TextInput
              style={[styles.input, { fontSize: 14 }]} value={seats} onChangeText={setSeats}
              placeholder="Seats" placeholderTextColor="#94A3B8" keyboardType="numeric"
            />
          </View>
        </View>

        <Pressable style={[styles.searchBtn, { backgroundColor: C }]} onPress={search}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search' } as any} size={18} tintColor="#fff" />
          <Text style={styles.searchBtnText}>Search Rides</Text>
        </Pressable>
      </View>

      {/* Recent searches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Searches</Text>
        <View style={styles.chips}>
          {RECENT.map((r, i) => (
            <Pressable key={i} style={styles.chip} onPress={() => onNavigate('search', { from: r.from, to: r.to, date: '', seats: '1' })}>
              <SymbolView name={{ ios: 'clock', android: 'history' } as any} size={12} tintColor="#64748B" />
              <Text style={styles.chipText}>{r.from} → {r.to}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Popular routes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Routes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {[
            { from: 'Casablanca', to: 'Rabat',      price: 40 },
            { from: 'Casablanca', to: 'Marrakech',  price: 110 },
            { from: 'Rabat',      to: 'Fès',        price: 80 },
            { from: 'Tanger',     to: 'Casablanca', price: 130 },
          ].map((r, i) => (
            <Pressable key={i} style={styles.routeChip}
              onPress={() => onNavigate('search', { from: r.from, to: r.to, date: '', seats: '1' })}>
              <Text style={styles.routeChipText}>{r.from} → {r.to}</Text>
              <Text style={[styles.routeChipPrice, { color: C }]}>from {r.price} MAD</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Featured rides */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Available Now</Text>
          <Pressable onPress={() => onNavigate('search')}>
            <Text style={[styles.seeAll, { color: C }]}>See all</Text>
          </Pressable>
        </View>
        {FEATURED_RIDES.map((r) => (
          <MiniRideCard key={r.id} ride={r} onPress={() => onNavigate('ride-detail', r)} />
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 32 },

  searchCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  searchTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },

  routeBox: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, gap: 0,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, color: '#1E293B' },
  routeDivider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  routeLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  swapBtn: { padding: 6, borderRadius: 16, borderWidth: 1, backgroundColor: '#fff', marginHorizontal: 8 },

  row: { flexDirection: 'row', gap: 10 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },

  routeChip: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, minWidth: 150, gap: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  routeChipText: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  routeChipPrice: { fontSize: 12, fontWeight: '500' },

  miniCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  miniAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  miniInitial: { fontSize: 16, fontWeight: '700' },
  miniRoute: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  miniMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniMetaText: { fontSize: 12, color: '#64748B' },
  miniPrice: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 },
  miniPriceText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

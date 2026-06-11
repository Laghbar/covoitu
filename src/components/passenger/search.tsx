import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RideItem } from '../passenger-dashboard';
import { FEATURED_RIDES } from './home';

const C = '#3B82F6';

const ALL_RIDES: RideItem[] = [
  ...FEATURED_RIDES,
  {
    id: '4', from: 'Rabat', to: 'Fès', date: '2026-06-17', time: '06:30',
    price: 80, seats: 4, bookedSeats: 2,
    driver: { name: 'Youssef Tazi', initial: 'Y', rating: 4.6, trips: 55, memberSince: '2023', bio: 'Regular Rabat-Fès driver. Comfortable and on time.' },
    car: { make: 'Hyundai', model: 'i20', year: '2019', color: 'Blue', plate: '11223 D 4' },
    preferences: ['Luggage', 'No Smoke'],
    pickupPoint: 'Agdal, Rabat', dropoffPoint: 'Centre-ville, Fès',
  },
  {
    id: '5', from: 'Tanger', to: 'Casablanca', date: '2026-06-18', time: '10:00',
    price: 130, seats: 3, bookedSeats: 0,
    driver: { name: 'Nadia El Fassi', initial: 'N', rating: 4.9, trips: 310, memberSince: '2021', bio: 'Top-rated driver on Harizana. Very experienced on long routes.' },
    car: { make: 'Toyota', model: 'Yaris', year: '2023', color: 'Silver', plate: '33445 E 5' },
    preferences: ['A/C', 'Music', 'Chatty'],
    pickupPoint: 'Port de Tanger', dropoffPoint: 'Maarif, Casablanca',
    note: 'Stop in Larache for 15 min.',
  },
  {
    id: '6', from: 'Agadir', to: 'Marrakech', date: '2026-06-19', time: '08:00',
    price: 95, seats: 2, bookedSeats: 1,
    driver: { name: 'Hassan Ouaziz', initial: 'H', rating: 4.5, trips: 39, memberSince: '2024', bio: 'New but reliable driver. I keep my car clean and drive safely.' },
    car: { make: 'Peugeot', model: '208', year: '2021', color: 'Red', plate: '77889 F 6' },
    preferences: ['No Smoke', 'Pets OK'],
    pickupPoint: 'Talborjt, Agadir', dropoffPoint: 'Hivernage, Marrakech',
  },
];

const SORT_OPTIONS = ['Cheapest', 'Fastest', 'Best rated', 'Most seats'];

type Props = {
  onNavigate: (key: string, payload?: any) => void;
  initialQuery?: { from: string; to: string; date: string; seats: string } | null;
};

function RideCard({ ride, onPress }: { ride: RideItem; onPress: () => void }) {
  const available = ride.seats - ride.bookedSeats;
  const pct = ride.bookedSeats / ride.seats;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.driverRow}>
        <View style={[styles.avatar, { backgroundColor: C + '18' }]}>
          <Text style={[styles.avatarInitial, { color: C }]}>{ride.driver.initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{ride.driver.name}</Text>
          <View style={styles.ratingRow}>
            <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={11} tintColor="#F59E0B" />
            <Text style={styles.ratingText}>{ride.driver.rating} · {ride.driver.trips} trips</Text>
          </View>
        </View>
        <View>
          <Text style={[styles.price, { color: C }]}>{ride.price} MAD</Text>
          <Text style={styles.priceSub}>per seat</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: C }]} />
          <Text style={styles.routeCity}>{ride.from}</Text>
        </View>
        <View style={styles.routeLineBox}>
          <View style={styles.routeLine} />
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' } as any} size={12} tintColor="#CBD5E1" />
        </View>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.routeCity}>{ride.to}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={12} tintColor="#94A3B8" />
          <Text style={styles.metaText}>{ride.date}</Text>
        </View>
        <View style={styles.metaChip}>
          <SymbolView name={{ ios: 'clock', android: 'schedule' } as any} size={12} tintColor="#94A3B8" />
          <Text style={styles.metaText}>{ride.time}</Text>
        </View>
        <View style={styles.metaChip}>
          <SymbolView name={{ ios: 'person.fill', android: 'person' } as any} size={12} tintColor={available > 0 ? C : '#EF4444'} />
          <Text style={[styles.metaText, { color: available > 0 ? '#475569' : '#EF4444' }]}>
            {available > 0 ? `${available} seat${available > 1 ? 's' : ''}` : 'Full'}
          </Text>
        </View>
      </View>

      <View style={styles.seatBarTrack}>
        <View style={[styles.seatBarFill, { width: `${pct * 100}%` as any, backgroundColor: pct >= 1 ? '#EF4444' : C }]} />
      </View>

      <View style={styles.prefRow}>
        {ride.preferences.slice(0, 3).map((p) => (
          <View key={p} style={styles.prefChip}><Text style={styles.prefText}>{p}</Text></View>
        ))}
        <View style={[styles.bookBtn, { backgroundColor: C }]}>
          <Text style={styles.bookBtnText}>View details →</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function PassengerSearch({ onNavigate, initialQuery }: Props) {
  const [from,    setFrom]    = useState(initialQuery?.from  ?? '');
  const [to,      setTo]      = useState(initialQuery?.to    ?? '');
  const [date,    setDate]    = useState(initialQuery?.date  ?? '');
  const [seats,   setSeats]   = useState(initialQuery?.seats ?? '1');
  const [sort,    setSort]    = useState('Cheapest');
  const [results, setResults] = useState<RideItem[]>(ALL_RIDES);

  useEffect(() => {
    if (initialQuery?.from || initialQuery?.to) applySearch(initialQuery.from, initialQuery.to);
  }, []);

  const applySearch = (f = from, t = to) => {
    const filtered = ALL_RIDES.filter((r) => {
      const matchFrom = !f || r.from.toLowerCase().includes(f.toLowerCase());
      const matchTo   = !t || r.to.toLowerCase().includes(t.toLowerCase());
      return matchFrom && matchTo;
    });
    setResults(filtered);
  };

  const sorted = [...results].sort((a, b) => {
    if (sort === 'Cheapest')   return a.price - b.price;
    if (sort === 'Best rated') return b.driver.rating - a.driver.rating;
    if (sort === 'Most seats') return (b.seats - b.bookedSeats) - (a.seats - a.bookedSeats);
    return 0;
  });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <View style={styles.formCard}>
        <View style={styles.routeBox}>
          <View style={styles.inputRow}>
            <SymbolView name={{ ios: 'location.fill', android: 'location_on' } as any} size={15} tintColor={C} />
            <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="Departure" placeholderTextColor="#94A3B8" />
          </View>
          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Pressable style={[styles.swapBtn, { borderColor: C + '40' }]} onPress={() => { const t = from; setFrom(to); setTo(t); }}>
              <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert' } as any} size={13} tintColor={C} />
            </Pressable>
            <View style={styles.divLine} />
          </View>
          <View style={styles.inputRow}>
            <SymbolView name={{ ios: 'mappin', android: 'place' } as any} size={15} tintColor="#EF4444" />
            <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="Destination" placeholderTextColor="#94A3B8" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputRow, styles.inlineBox, { flex: 2 }]}>
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={13} tintColor="#94A3B8" />
            <TextInput style={[styles.input, { fontSize: 13 }]} value={date} onChangeText={setDate} placeholder="Date" placeholderTextColor="#94A3B8" />
          </View>
          <View style={[styles.inputRow, styles.inlineBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'person.fill', android: 'person' } as any} size={13} tintColor="#94A3B8" />
            <TextInput style={[styles.input, { fontSize: 13 }]} value={seats} onChangeText={setSeats} placeholder="Seats" placeholderTextColor="#94A3B8" keyboardType="numeric" />
          </View>
          <Pressable style={[styles.searchBtn, { backgroundColor: C }]} onPress={() => applySearch()}>
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search' } as any} size={16} tintColor="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{sorted.length} ride{sorted.length !== 1 ? 's' : ''} found</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {SORT_OPTIONS.map((s) => (
          <Pressable key={s} style={[styles.sortChip, sort === s && { backgroundColor: C, borderColor: C }]} onPress={() => setSort(s)}>
            <Text style={[styles.sortText, sort === s && { color: '#fff' }]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search' } as any} size={52} tintColor="#CBD5E1" />
          <Text style={styles.emptyTitle}>No rides found</Text>
          <Text style={styles.emptySub}>Try different cities or dates.</Text>
        </View>
      ) : (
        sorted.map((r) => <RideCard key={r.id} ride={r} onPress={() => onNavigate('ride-detail', r)} />)
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  routeBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  input: { flex: 1, fontSize: 15, color: '#1E293B' },
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  divLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  swapBtn: { padding: 6, borderRadius: 14, borderWidth: 1, backgroundColor: '#fff', marginHorizontal: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineBox: { backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  searchBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsCount: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  sortChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  sortText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 17, fontWeight: '800' },
  driverName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, color: '#64748B' },
  price: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  priceSub: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeCity: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  routeLineBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  routeLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },

  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 12, color: '#475569' },

  seatBarTrack: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
  seatBarFill: { height: '100%', borderRadius: 2 },

  prefRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  prefChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  prefText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  bookBtn: { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94A3B8' },
  emptySub: { fontSize: 13, color: '#CBD5E1' },
});

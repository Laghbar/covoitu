import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = '#3B82F6';

type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

type Booking = {
  id: string; from: string; to: string; date: string; time: string;
  price: number; seats: number; status: BookingStatus;
  driver: { name: string; initial: string; rating: number };
  car: string; rated?: boolean;
};

const BOOKINGS: Booking[] = [
  {
    id: '1', from: 'Casablanca', to: 'Rabat', date: '15 Jun 2026', time: '08:30',
    price: 45, seats: 1, status: 'upcoming',
    driver: { name: 'Mohammed Alami', initial: 'M', rating: 4.8 },
    car: 'Dacia Logan 2020',
  },
  {
    id: '2', from: 'Rabat', to: 'Fès', date: '17 Jun 2026', time: '06:30',
    price: 160, seats: 2, status: 'upcoming',
    driver: { name: 'Youssef Tazi', initial: 'Y', rating: 4.6 },
    car: 'Hyundai i20 2019',
  },
  {
    id: '3', from: 'Casablanca', to: 'Marrakech', date: '02 Jun 2026', time: '07:00',
    price: 120, seats: 1, status: 'completed',
    driver: { name: 'Karim Lahlou', initial: 'K', rating: 4.7 },
    car: 'Volkswagen Polo 2021', rated: false,
  },
  {
    id: '4', from: 'Tanger', to: 'Casablanca', date: '18 May 2026', time: '10:00',
    price: 130, seats: 1, status: 'completed',
    driver: { name: 'Nadia El Fassi', initial: 'N', rating: 4.9 },
    car: 'Toyota Yaris 2023', rated: true,
  },
  {
    id: '5', from: 'Agadir', to: 'Marrakech', date: '10 May 2026', time: '08:00',
    price: 95, seats: 1, status: 'cancelled',
    driver: { name: 'Hassan Ouaziz', initial: 'H', rating: 4.5 },
    car: 'Peugeot 208 2021',
  },
];

const STATUS_META: Record<BookingStatus, { label: string; bg: string; color: string }> = {
  upcoming:  { label: 'Upcoming',  bg: '#EFF6FF', color: C },
  completed: { label: 'Completed', bg: '#F0FDF4', color: '#10B981' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#EF4444' },
};

function BookingCard({ booking }: { booking: Booking }) {
  const meta = STATUS_META[booking.status];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.route}>{booking.from} → {booking.to}</Text>
          <Text style={styles.dateLine}>{booking.date} · {booking.time}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.driverRow}>
        <View style={[styles.driverAvatar, { backgroundColor: C + '15' }]}>
          <Text style={[styles.driverInitial, { color: C }]}>{booking.driver.initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{booking.driver.name}</Text>
          <Text style={styles.carText}>{booking.car}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={11} tintColor="#F59E0B" />
          <Text style={styles.ratingText}>{booking.driver.rating}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.priceLabel}>{booking.seats} seat{booking.seats > 1 ? 's' : ''}</Text>
          <Text style={[styles.price, { color: C }]}>{booking.price} MAD</Text>
        </View>
        <View style={styles.footerActions}>
          {booking.status === 'upcoming' && (
            <>
              <Pressable style={[styles.actionBtn, { borderColor: C + '40' }]}
                onPress={() => Alert.alert('Contact Driver', 'Opening chat...')}>
                <SymbolView name={{ ios: 'message.fill', android: 'chat' } as any} size={13} tintColor={C} />
                <Text style={[styles.actionText, { color: C }]}>Message</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, { borderColor: '#EF444440' }]}
                onPress={() => Alert.alert('Cancel Booking', 'Are you sure?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive' },
                ])}>
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Cancel</Text>
              </Pressable>
            </>
          )}
          {booking.status === 'completed' && !booking.rated && (
            <Pressable style={[styles.actionBtn, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B40' }]}
              onPress={() => Alert.alert('Rate Driver', 'Rating feature coming soon.')}>
              <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={13} tintColor="#F59E0B" />
              <Text style={[styles.actionText, { color: '#92400E' }]}>Rate Driver</Text>
            </Pressable>
          )}
          {booking.status === 'completed' && booking.rated && (
            <View style={[styles.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#10B98140' }]}>
              <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle' } as any} size={13} tintColor="#10B981" />
              <Text style={[styles.actionText, { color: '#10B981' }]}>Rated</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = { onNavigate: (key: string, payload?: any) => void };

export function PassengerBookings({ onNavigate }: Props) {
  const [tab, setTab] = useState<BookingStatus>('upcoming');
  const filtered = BOOKINGS.filter((b) => b.status === tab);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>My Bookings</Text>

      <View style={styles.tabs}>
        {(['upcoming', 'completed', 'cancelled'] as BookingStatus[]).map((t) => (
          <Pressable key={t} style={[styles.tabChip, tab === t && { backgroundColor: C }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView name={{ ios: 'ticket.fill', android: 'confirmation_number' } as any} size={52} tintColor="#CBD5E1" />
          <Text style={styles.emptyTitle}>No {tab} bookings</Text>
          {tab === 'upcoming' && (
            <Pressable style={[styles.emptyBtn, { backgroundColor: C }]} onPress={() => onNavigate('search')}>
              <Text style={styles.emptyBtnText}>Find a Ride</Text>
            </Pressable>
          )}
        </View>
      ) : (
        filtered.map((b) => <BookingCard key={b.id} booking={b} />)
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  tabs: { flexDirection: 'row', gap: 8 },
  tabChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  route: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  dateLine: { fontSize: 13, color: '#64748B', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9' },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: 14, fontWeight: '800' },
  driverName: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  carText: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#64748B' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  price: { fontSize: 18, fontWeight: '800' },
  footerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyTitle: { fontSize: 16, color: '#94A3B8', fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

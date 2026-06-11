import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = '#10B981';

type Status = 'active' | 'completed' | 'cancelled';

type Ride = {
  id: string; from: string; to: string; date: string; time: string;
  booked: number; seats: number; revenue: number; status: Status;
  passengers: { name: string; initial: string; status: 'confirmed' | 'pending' }[];
};

const RIDES: Ride[] = [
  {
    id: '1', from: 'Casablanca', to: 'Rabat', date: 'Lun 15 Jun', time: '08:30',
    booked: 2, seats: 3, revenue: 90, status: 'active',
    passengers: [
      { name: 'Fatima Zahra', initial: 'F', status: 'confirmed' },
      { name: 'Omar Soussi',  initial: 'O', status: 'confirmed' },
    ],
  },
  {
    id: '2', from: 'Rabat', to: 'Casablanca', date: 'Mer 18 Jun', time: '17:00',
    booked: 1, seats: 3, revenue: 40, status: 'active',
    passengers: [
      { name: 'Aicha Moukrim', initial: 'A', status: 'pending' },
    ],
  },
  {
    id: '3', from: 'Casablanca', to: 'Marrakech', date: 'Sam 07 Jun', time: '07:00',
    booked: 3, seats: 3, revenue: 360, status: 'completed',
    passengers: [],
  },
  {
    id: '4', from: 'Fès', to: 'Meknès', date: 'Ven 30 Mai', time: '09:30',
    booked: 2, seats: 2, revenue: 70, status: 'completed',
    passengers: [],
  },
  {
    id: '5', from: 'Tanger', to: 'Tétouan', date: 'Lun 20 Mai', time: '08:00',
    booked: 0, seats: 3, revenue: 0, status: 'cancelled',
    passengers: [],
  },
];

const STATUS_META: Record<Status, { bg: string; color: string; label: string }> = {
  active:    { bg: '#F0FDF4', color: C,         label: 'Active' },
  completed: { bg: '#F8FAFC', color: '#64748B', label: 'Completed' },
  cancelled: { bg: '#FEF2F2', color: '#EF4444', label: 'Cancelled' },
};

function RideCard({ ride }: { ride: Ride }) {
  const [showPassengers, setShowPassengers] = useState(false);
  const meta = STATUS_META[ride.status];
  const pct = ride.seats > 0 ? ride.booked / ride.seats : 0;

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardRoute}>{ride.from} → {ride.to}</Text>
          <Text style={styles.cardMeta}>{ride.date} · {ride.time}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: pct === 1 ? '#F59E0B' : C }]} />
      </View>
      <Text style={styles.progressLabel}>{ride.booked}/{ride.seats} seats booked</Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={[styles.revenue, { color: C }]}>{ride.revenue} MAD</Text>

        {ride.status === 'active' && (
          <View style={styles.footerActions}>
            <Pressable
              style={[styles.footerBtn, { borderColor: C + '50' }]}
              onPress={() => setShowPassengers(!showPassengers)}>
              <SymbolView name={{ ios: 'person.2.fill', android: 'group' } as any} size={13} tintColor={C} />
              <Text style={[styles.footerBtnText, { color: C }]}>
                {showPassengers ? 'Hide' : 'Passengers'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.footerBtn, { borderColor: '#E2E8F0' }]}
              onPress={() => Alert.alert('Edit Ride', 'Edit functionality coming soon.')}>
              <SymbolView name={{ ios: 'pencil', android: 'edit' } as any} size={13} tintColor="#475569" />
              <Text style={styles.footerBtnText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => Alert.alert('Delete Ride', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive' },
              ])}>
              <SymbolView name={{ ios: 'trash', android: 'delete' } as any} size={16} tintColor="#EF4444" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Passenger list */}
      {showPassengers && ride.passengers.length > 0 && (
        <View style={styles.passengerBox}>
          <Text style={styles.paxTitle}>Booked Passengers</Text>
          {ride.passengers.map((p, i) => (
            <View key={i} style={styles.paxRow}>
              <View style={[styles.paxAvatar, { backgroundColor: '#3B82F6' + '18' }]}>
                <Text style={[styles.paxInitial, { color: '#3B82F6' }]}>{p.initial}</Text>
              </View>
              <Text style={styles.paxName}>{p.name}</Text>
              <View style={[styles.paxStatus, {
                backgroundColor: p.status === 'confirmed' ? '#F0FDF4' : '#FFF7ED',
              }]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: p.status === 'confirmed' ? C : '#F97316' }}>
                  {p.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type Props = { onNavigate: (key: string) => void };

export function DriverRides({ onNavigate }: Props) {
  const [tab, setTab] = useState<Status>('active');
  const filtered = RIDES.filter((r) => r.status === tab);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>My Rides</Text>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {(['active', 'completed', 'cancelled'] as Status[]).map((t) => (
          <Pressable key={t} style={[styles.tabChip, tab === t && { backgroundColor: C }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={52} tintColor="#CBD5E1" />
          <Text style={styles.emptyTitle}>No {tab} rides</Text>
          {tab === 'active' && (
            <Pressable style={[styles.emptyBtn, { backgroundColor: C }]} onPress={() => onNavigate('create')}>
              <Text style={styles.emptyBtnText}>Create a Trip</Text>
            </Pressable>
          )}
        </View>
      ) : (
        filtered.map((r) => <RideCard key={r.id} ride={r} />)
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
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardRoute: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },

  progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#64748B', marginTop: -4 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revenue: { fontSize: 16, fontWeight: '700' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  footerBtnText: { fontSize: 12, fontWeight: '600', color: '#475569' },

  passengerBox: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, gap: 8 },
  paxTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  paxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paxAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  paxInitial: { fontSize: 13, fontWeight: '700' },
  paxName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E293B' },
  paxStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  empty: { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyTitle: { fontSize: 16, color: '#94A3B8', fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = '#10B981';

const UPCOMING = [
  { id: '1', from: 'Casablanca', to: 'Rabat',      date: 'Lun 15 Jun', time: '08:30', booked: 2, total: 3, revenue: 90 },
  { id: '2', from: 'Rabat',      to: 'Casablanca', date: 'Mer 18 Jun', time: '17:00', booked: 3, total: 3, revenue: 120 },
];

const QUICK: { key: string; label: string; icon: { ios: string; android: string } }[] = [
  { key: 'create',      label: 'New Trip',    icon: { ios: 'plus.circle.fill',  android: 'add_circle' } },
  { key: 'rides',       label: 'My Rides',    icon: { ios: 'car.fill',          android: 'directions_car' } },
  { key: 'invitations', label: 'Requests',    icon: { ios: 'envelope.fill',     android: 'mail' } },
  { key: 'earnings',    label: 'Earnings',    icon: { ios: 'banknote.fill',     android: 'payments' } },
];

type Props = { onNavigate: (key: string) => void };

export function DriverHome({ onNavigate }: Props) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Earnings banner */}
      <View style={[styles.banner, { backgroundColor: C }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerSub}>This month's earnings</Text>
          <Text style={styles.bannerAmount}>2 850 MAD</Text>
          <View style={styles.bannerRow}>
            <SymbolView name={{ ios: 'arrow.up.right', android: 'trending_up' } as any} size={12} tintColor="rgba(255,255,255,0.8)" />
            <Text style={styles.bannerTrend}>+12% vs last month</Text>
          </View>
        </View>
        <View style={styles.bannerRight}>
          <View style={styles.ratingCircle}>
            <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={16} tintColor="#FCD34D" />
            <Text style={styles.ratingNum}>4.9</Text>
          </View>
          <Text style={styles.ratingLabel}>Your rating</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { v: '150 MAD', l: 'Today',       icon: { ios: 'sun.max.fill',   android: 'wb_sunny' } },
          { v: '48',      l: 'Total trips',  icon: { ios: 'car.fill',       android: 'directions_car' } },
          { v: '3',       l: 'Pending req.', icon: { ios: 'clock.fill',     android: 'schedule' } },
        ].map((s) => (
          <View key={s.l} style={styles.statCard}>
            <SymbolView name={s.icon as any} size={16} tintColor={C} />
            <Text style={styles.statVal}>{s.v}</Text>
            <Text style={styles.statLbl}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {QUICK.map((q) => (
            <Pressable key={q.key} style={styles.gridCard} onPress={() => onNavigate(q.key)}>
              <View style={[styles.gridIcon, { backgroundColor: C + '15' }]}>
                <SymbolView name={q.icon as any} size={22} tintColor={C} />
              </View>
              <Text style={styles.gridLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Upcoming trips */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Trips</Text>
          <Pressable onPress={() => onNavigate('rides')}>
            <Text style={[styles.seeAll, { color: C }]}>See all</Text>
          </Pressable>
        </View>
        {UPCOMING.map((t) => (
          <View key={t.id} style={styles.tripCard}>
            <View style={[styles.tripDot, { backgroundColor: C + '20' }]}>
              <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={16} tintColor={C} />
            </View>
            <View style={styles.tripInfo}>
              <Text style={styles.tripRoute}>{t.from} → {t.to}</Text>
              <Text style={styles.tripMeta}>{t.date} · {t.time}</Text>
              <View style={styles.seatsBar}>
                {Array.from({ length: t.total }).map((_, i) => (
                  <View key={i} style={[styles.seatDot, { backgroundColor: i < t.booked ? C : '#E2E8F0' }]} />
                ))}
                <Text style={styles.seatsText}>{t.booked}/{t.total}</Text>
              </View>
            </View>
            <Text style={[styles.tripRev, { color: C }]}>{t.revenue} MAD</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 32 },

  banner: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  bannerAmount: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginVertical: 2 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerTrend: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  bannerRight: { alignItems: 'center', gap: 4 },
  ratingCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  ratingNum: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ratingLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statVal: { fontSize: 15, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  statLbl: { fontSize: 10, color: '#94A3B8', textAlign: 'center' },

  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  gridIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },

  tripCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tripDot: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tripInfo: { flex: 1, gap: 3 },
  tripRoute: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  tripMeta: { fontSize: 12, color: '#94A3B8' },
  seatsBar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  seatDot: { width: 10, height: 10, borderRadius: 5 },
  seatsText: { fontSize: 11, color: '#94A3B8', marginLeft: 2 },
  tripRev: { fontSize: 15, fontWeight: '700' },
});

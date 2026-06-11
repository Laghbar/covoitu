import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = '#10B981';

const MONTHLY = [
  { month: 'Jan', amount: 1800 },
  { month: 'Feb', amount: 2100 },
  { month: 'Mar', amount: 1650 },
  { month: 'Apr', amount: 2400 },
  { month: 'May', amount: 2200 },
  { month: 'Jun', amount: 2850 },
];

const TRANSACTIONS = [
  { id: '1', route: 'Casablanca → Rabat',     date: 'Mon 15 Jun', amount: 90,  passengers: 2 },
  { id: '2', route: 'Rabat → Casablanca',     date: 'Wed 11 Jun', amount: 120, passengers: 3 },
  { id: '3', route: 'Casablanca → Marrakech', date: 'Sat 07 Jun', amount: 360, passengers: 3 },
  { id: '4', route: 'Fès → Meknès',           date: 'Fri 30 May', amount: 70,  passengers: 2 },
];

const maxAmount = Math.max(...MONTHLY.map((m) => m.amount));

export function DriverEarnings() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>Earnings</Text>

      {/* Balance card */}
      <View style={[styles.balanceCard, { backgroundColor: C }]}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>14 320 MAD</Text>
        <Pressable style={styles.withdrawBtn}>
          <SymbolView name={{ ios: 'arrow.down.to.line', android: 'download' } as any} size={14} tintColor={C} />
          <Text style={[styles.withdrawBtnText, { color: C }]}>Withdraw</Text>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Today',    value: '150 MAD',  sub: '2 rides' },
          { label: 'This Week', value: '720 MAD', sub: '8 rides' },
          { label: 'This Month', value: '2 850 MAD', sub: '18 rides' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statSub}>{s.sub}</Text>
          </View>
        ))}
      </View>

      {/* Monthly chart */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Monthly Overview</Text>
        <View style={styles.chart}>
          {MONTHLY.map((m) => {
            const heightPct = m.amount / maxAmount;
            return (
              <View key={m.month} style={styles.barCol}>
                <Text style={styles.barAmount}>{(m.amount / 1000).toFixed(1)}k</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${heightPct * 100}%` as any, backgroundColor: m.month === 'Jun' ? C : C + '40' }]} />
                </View>
                <Text style={[styles.barLabel, m.month === 'Jun' && { color: C, fontWeight: '700' }]}>{m.month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Transaction history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {TRANSACTIONS.map((t) => (
          <View key={t.id} style={styles.txCard}>
            <View style={[styles.txIcon, { backgroundColor: C + '15' }]}>
              <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={16} tintColor={C} />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txRoute}>{t.route}</Text>
              <Text style={styles.txMeta}>{t.date} · {t.passengers} passengers</Text>
            </View>
            <Text style={styles.txAmount}>+{t.amount} MAD</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B', letterSpacing: -0.5 },

  balanceCard: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginTop: 8,
  },
  withdrawBtnText: { fontSize: 14, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontSize: 13, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  statSub: { fontSize: 10, color: '#94A3B8' },

  chartCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  chart: { flexDirection: 'row', height: 120, alignItems: 'flex-end', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barAmount: { fontSize: 9, color: '#94A3B8' },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, color: '#94A3B8' },

  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },

  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  txIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txRoute: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  txMeta: { fontSize: 12, color: '#94A3B8' },
  txAmount: { fontSize: 15, fontWeight: '700', color: C },
});

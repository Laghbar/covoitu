import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = '#3B82F6';

type TxType = 'payment' | 'refund';

type Transaction = {
  id: string; type: TxType; label: string; route: string;
  date: string; amount: number; status: 'paid' | 'refunded' | 'pending';
  receiptId: string;
};

const TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'payment', label: 'Ride Booking',  route: 'Casablanca → Rabat',     date: '15 Jun 2026', amount: 45,  status: 'paid',     receiptId: 'HR-2026-00145' },
  { id: '2', type: 'payment', label: 'Ride Booking',  route: 'Rabat → Fès',             date: '17 Jun 2026', amount: 160, status: 'pending',  receiptId: 'HR-2026-00161' },
  { id: '3', type: 'payment', label: 'Ride Booking',  route: 'Casablanca → Marrakech',  date: '02 Jun 2026', amount: 120, status: 'paid',     receiptId: 'HR-2026-00120' },
  { id: '4', type: 'payment', label: 'Ride Booking',  route: 'Tanger → Casablanca',     date: '18 May 2026', amount: 130, status: 'paid',     receiptId: 'HR-2026-00098' },
  { id: '5', type: 'refund',  label: 'Cancellation',  route: 'Agadir → Marrakech',      date: '10 May 2026', amount: 95,  status: 'refunded', receiptId: 'HR-2026-00071' },
  { id: '6', type: 'payment', label: 'Ride Booking',  route: 'Fès → Meknès',            date: '25 Apr 2026', amount: 35,  status: 'paid',     receiptId: 'HR-2026-00052' },
];

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  paid:     { label: 'Paid',     bg: '#F0FDF4', color: '#10B981' },
  refunded: { label: 'Refunded', bg: '#EFF6FF', color: C },
  pending:  { label: 'Pending',  bg: '#FFFBEB', color: '#F59E0B' },
};

const PAYMENT_METHODS = [
  { label: 'Cash on departure', icon: { ios: 'banknote.fill', android: 'payments' }, active: true },
  { label: 'Bank transfer', icon: { ios: 'building.columns.fill', android: 'account_balance' }, active: false },
  { label: 'Add payment method', icon: { ios: 'plus.circle.fill', android: 'add_circle' }, active: false, add: true },
];

function downloadReceipt(tx: Transaction) {
  if (Platform.OS === 'web') {
    const lines = [
      '===== HARIZANA RECEIPT =====',
      `Receipt No : ${tx.receiptId}`,
      `Date       : ${tx.date}`,
      `Route      : ${tx.route}`,
      `Amount     : ${tx.amount} MAD`,
      `Status     : ${tx.status.toUpperCase()}`,
      '============================',
      'Thank you for using Horizon!',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${tx.receiptId}.txt`; a.click();
    URL.revokeObjectURL(url);
  } else {
    Alert.alert('Receipt', `Receipt ${tx.receiptId}\n${tx.route}\n${tx.date}\n${tx.amount} MAD\nStatus: ${tx.status.toUpperCase()}\n\nDownload will be available in the full app.`);
  }
}

export function PassengerPayments() {
  const paidTotal   = TRANSACTIONS.filter((t) => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
  const refundTotal = TRANSACTIONS.filter((t) => t.status === 'refunded').reduce((s, t) => s + t.amount, 0);
  const pendingTotal = TRANSACTIONS.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>Payments</Text>

      {/* Summary banner */}
      <View style={[styles.banner, { backgroundColor: C }]}>
        <View style={styles.bannerMain}>
          <Text style={styles.bannerLabel}>Total Spent</Text>
          <Text style={styles.bannerAmount}>{paidTotal} MAD</Text>
          <Text style={styles.bannerSub}>{TRANSACTIONS.filter(t => t.status === 'paid').length} rides paid</Text>
        </View>
        <View style={styles.bannerStats}>
          <View style={styles.bannerStat}>
            <Text style={styles.bannerStatVal}>{refundTotal} MAD</Text>
            <Text style={styles.bannerStatLabel}>Refunded</Text>
          </View>
          <View style={styles.bannerStatDivider} />
          <View style={styles.bannerStat}>
            <Text style={styles.bannerStatVal}>{pendingTotal} MAD</Text>
            <Text style={styles.bannerStatLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Secure payment notice */}
      <View style={styles.secureRow}>
        <SymbolView name={{ ios: 'lock.shield.fill', android: 'security' } as any} size={16} tintColor="#10B981" />
        <Text style={styles.secureText}>All payments are secured and encrypted end-to-end.</Text>
      </View>

      {/* Payment methods */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Methods</Text>
        {PAYMENT_METHODS.map((m, i) => (
          <Pressable key={i} style={styles.methodRow}
            onPress={() => !m.active && Alert.alert('Coming Soon', 'This payment method will be available soon.')}>
            <View style={[styles.methodIcon, { backgroundColor: m.add ? C + '12' : '#F1F5F9' }]}>
              <SymbolView name={m.icon as any} size={16} tintColor={m.add ? C : '#475569'} />
            </View>
            <Text style={[styles.methodLabel, m.add && { color: C }]}>{m.label}</Text>
            {m.active && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeText}>Default</Text>
              </View>
            )}
            {!m.add && <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' } as any} size={13} tintColor="#CBD5E1" />}
          </Pressable>
        ))}
      </View>

      {/* Transaction history */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transaction History</Text>
        {TRANSACTIONS.map((tx, i) => {
          const meta = STATUS_META[tx.status];
          const isRefund = tx.type === 'refund';
          return (
            <View key={tx.id}>
              <View style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: isRefund ? '#EFF6FF' : '#F0FDF4' }]}>
                  <SymbolView
                    name={{ ios: isRefund ? 'arrow.uturn.left.circle.fill' : 'checkmark.circle.fill', android: isRefund ? 'undo' : 'check_circle' } as any}
                    size={18}
                    tintColor={isRefund ? C : '#10B981'}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.txLabel}>{tx.label}</Text>
                  <Text style={styles.txRoute}>{tx.route}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.txAmount, { color: isRefund ? C : '#1E293B' }]}>
                    {isRefund ? '+' : '-'}{tx.amount} MAD
                  </Text>
                  <View style={[styles.txStatus, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.txStatusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              </View>
              {/* Receipt button */}
              <Pressable style={styles.receiptBtn} onPress={() => downloadReceipt(tx)}>
                <SymbolView name={{ ios: 'arrow.down.doc.fill', android: 'download' } as any} size={12} tintColor="#64748B" />
                <Text style={styles.receiptText}>Download Receipt · {tx.receiptId}</Text>
              </Pressable>
              {i < TRANSACTIONS.length - 1 && <View style={styles.txDivider} />}
            </View>
          );
        })}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  banner: { borderRadius: 20, padding: 20, gap: 16 },
  bannerMain: { gap: 4 },
  bannerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  bannerAmount: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  bannerStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12 },
  bannerStat: { flex: 1, alignItems: 'center', gap: 2 },
  bannerStatVal: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bannerStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  bannerStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  secureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#10B98130',
  },
  secureText: { fontSize: 13, color: '#065F46', flex: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E293B' },
  activeBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  activeText: { fontSize: 11, fontWeight: '700', color: C },

  txRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  txLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  txRoute: { fontSize: 12, color: '#64748B' },
  txDate: { fontSize: 11, color: '#94A3B8' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txStatus: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  txStatusText: { fontSize: 11, fontWeight: '700' },
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginLeft: 48, marginTop: 6, paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  receiptText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  txDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
});

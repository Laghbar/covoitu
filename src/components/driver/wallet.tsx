import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type WalletData = { balance: number; reserved: number };

type Transaction = {
  id: string;
  type: 'recharge' | 'commission_reserve' | 'commission_release' | 'commission_transfer';
  amount: number;
  description: string;
  created_at: string;
};

const TX_META: Record<Transaction['type'], { label: string; sign: '+' | '-' | ''; color: string; icon: string }> = {
  recharge:             { label: 'Wallet Recharged',        sign: '+', color: '#10B981', icon: '⬆' },
  commission_reserve:   { label: 'Commission Reserved',     sign: '-', color: '#F59E0B', icon: '🔒' },
  commission_release:   { label: 'Commission Refunded',     sign: '+', color: '#10B981', icon: '🔓' },
  commission_transfer:  { label: 'Commission Paid',         sign: '-', color: '#EF4444', icon: '💸' },
};


export function DriverWallet() {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();

  const [wallet,       setWallet]       = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [err,          setErr]          = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr('');

    const [walletRes, txRes] = await Promise.all([
      supabase.from('driver_wallets').select('balance, reserved').eq('driver_id', user.id).single(),
      supabase.from('wallet_transactions').select('*').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]);

    if (walletRes.error && walletRes.error.code !== 'PGRST116') {
      setErr(walletRes.error.message);
    } else {
      setWallet({ balance: walletRes.data?.balance ?? 0, reserved: walletRes.data?.reserved ?? 0 });
    }
    setTransactions((txRes.data ?? []) as Transaction[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C} />
      </View>
    );
  }

  const available = wallet?.balance  ?? 0;
  const reserved  = wallet?.reserved ?? 0;
  const total     = available + reserved;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>

      {/* ── Balance card ─────────────────────────────────────── */}
      <View style={s.balanceCard}>
        <Text style={s.balanceLabel}>Available Balance</Text>
        <Text style={s.balanceAmount}>{available.toFixed(2)} MAD</Text>
        <View style={s.balanceRow}>
          <View style={s.balanceSub}>
            <Text style={s.balanceSubLabel}>🔒 Reserved</Text>
            <Text style={s.balanceSubValue}>{reserved.toFixed(2)} MAD</Text>
          </View>
          <View style={[s.balanceSub, { alignItems: 'flex-end' }]}>
            <Text style={s.balanceSubLabel}>Total</Text>
            <Text style={s.balanceSubValue}>{total.toFixed(2)} MAD</Text>
          </View>
        </View>
        {reserved > 0 && (
          <View style={s.reservedNote}>
            <Text style={s.reservedNoteTxt}>
              🔒 {reserved.toFixed(2)} MAD is locked as commission for your active ride(s). It will be released if you cancel or transferred to the platform when rides complete.
            </Text>
          </View>
        )}
      </View>

      {err ? (
        <View style={s.errBanner}>
          <Text style={s.errTxt}>⚠️ {err}</Text>
          <Pressable onPress={load}><Text style={{ color: C, fontWeight: '700' }}>Retry</Text></Pressable>
        </View>
      ) : null}

      {/* ── Admin-only notice ────────────────────────────── */}
      <View style={s.adminNotice}>
        <Text style={s.adminNoticeIcon}>🔒</Text>
        <Text style={s.adminNoticeTxt}>Your wallet balance is managed by the platform. Contact support to top up your account.</Text>
      </View>

      {/* ── Transaction history ──────────────────────────── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>📋 Transaction History</Text>
        {transactions.length === 0 ? (
          <View style={s.emptyTx}>
            <Text style={s.emptyTxIcon}>💰</Text>
            <Text style={s.emptyTxTxt}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const meta = TX_META[tx.type];
            const date = new Date(tx.created_at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
            });
            const time = new Date(tx.created_at).toLocaleTimeString('en-GB', {
              hour: '2-digit', minute: '2-digit',
            });
            return (
              <View key={tx.id} style={s.txRow}>
                <View style={[s.txIcon, { backgroundColor: meta.color + '18' }]}>
                  <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txLabel}>{meta.label}</Text>
                  <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={s.txDate}>{date} · {time}</Text>
                </View>
                <Text style={[s.txAmount, { color: meta.color }]}>
                  {meta.sign}{tx.amount.toFixed(2)} MAD
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  balanceCard: {
    margin: 16,
    backgroundColor: C,
    borderRadius: 24,
    padding: 24,
    gap: 8,
    shadowColor: C, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  balanceLabel:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  balanceAmount:  { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  balanceRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  balanceSub:     { gap: 2 },
  balanceSubLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  balanceSubValue:{ fontSize: 14, color: '#fff', fontWeight: '700' },
  reservedNote:   { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 10, marginTop: 4 },
  reservedNoteTxt:{ fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 17 },

  errBanner: { marginHorizontal: 16, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errTxt:    { fontSize: 13, color: '#EF4444', flex: 1 },

  adminNotice: {
    marginHorizontal: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F1F5F9', borderRadius: 14, padding: 14,
  },
  adminNoticeIcon: { fontSize: 20 },
  adminNoticeTxt:  { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 },

  card: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  cardSub:   { fontSize: 13, color: '#64748B', marginTop: -8 },

  emptyTx:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyTxIcon: { fontSize: 32 },
  emptyTxTxt:  { fontSize: 14, color: '#94A3B8' },

  txRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txIcon:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  txDesc:  { fontSize: 11, color: '#64748B', marginTop: 1 },
  txDate:  { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  txAmount:{ fontSize: 14, fontWeight: '800' },
});

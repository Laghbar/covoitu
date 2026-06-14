import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type WalletData = { balance: number; reserved: number };

type Transaction = {
  id: string;
  type: 'recharge' | 'commission_reserve' | 'commission_release' | 'commission_transfer' | 'withdrawal';
  amount: number;
  description: string;
  created_at: string;
};

type WithdrawalRequest = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_name: string | null;
  account_name: string | null;
  rib: string | null;
  admin_note: string | null;
  created_at: string;
};

const TX_META: Record<Transaction['type'], { label: string; sign: string; color: string; icon: string }> = {
  recharge:             { label: 'Portefeuille rechargé',    sign: '+', color: '#10B981', icon: '⬆' },
  commission_reserve:   { label: 'Commission réservée',      sign: '-', color: '#F59E0B', icon: '🔒' },
  commission_release:   { label: 'Commission remboursée',    sign: '+', color: '#10B981', icon: '🔓' },
  commission_transfer:  { label: 'Commission payée',         sign: '-', color: '#EF4444', icon: '💸' },
  withdrawal:           { label: 'Retrait demandé',          sign: '-', color: '#6366F1', icon: '🏦' },
};

const WR_STATUS: Record<WithdrawalRequest['status'], { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: 'En attente',  color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
  approved: { label: 'Approuvé',    color: '#059669', bg: '#ECFDF5', icon: '✅' },
  rejected: { label: 'Refusé',      color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
};

const MIN_WITHDRAWAL = 50;

// ─── Withdrawal modal ─────────────────────────────────────────────────────────
function WithdrawModal({
  visible, available, onClose, onSuccess,
}: {
  visible: boolean; available: number; onClose: () => void; onSuccess: () => void;
}) {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const [amount,  setAmount]  = useState('');
  const [bank,    setBank]    = useState('');
  const [name,    setName]    = useState('');
  const [rib,     setRib]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const reset = () => { setAmount(''); setBank(''); setName(''); setRib(''); setError(null); };

  const submit = async () => {
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_WITHDRAWAL)  { setError(`Montant minimum : ${MIN_WITHDRAWAL} MAD`); return; }
    if (amt > available)               { setError('Montant supérieur à votre solde disponible.'); return; }
    if (!bank.trim())                  { setError('Veuillez entrer le nom de votre banque.'); return; }
    if (!name.trim())                  { setError('Veuillez entrer le nom du titulaire du compte.'); return; }
    if (!rib.trim())                   { setError('Veuillez entrer votre RIB.'); return; }

    setLoading(true);
    const { error: dbErr } = await supabase.from('withdrawal_requests').insert({
      driver_id:      user!.id,
      amount:         amt,
      bank_name:      bank.trim(),
      account_name:   name.trim(),
      rib:            rib.trim(),
      status:         'pending',
    });
    setLoading(false);

    if (dbErr) { setError(dbErr.message); return; }
    reset();
    onSuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={m.backdrop} onPress={onClose} />
      <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={m.handle} />

        <View style={m.header}>
          <Text style={m.title}>Demander un retrait</Text>
          <Pressable onPress={() => { reset(); onClose(); }} style={m.closeBtn}>
            <Text style={m.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
          {/* Balance hint */}
          <View style={m.balanceHint}>
            <Text style={m.balanceHintTxt}>Solde disponible</Text>
            <Text style={m.balanceHintAmt}>{available.toFixed(2)} MAD</Text>
          </View>

          {/* Amount */}
          <View style={m.group}>
            <Text style={m.label}>Montant à retirer *</Text>
            <View style={m.inputRow}>
              <TextInput
                style={m.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={`Min. ${MIN_WITHDRAWAL} MAD`}
                placeholderTextColor="#94A3B8"
              />
              <Text style={m.currency}>MAD</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {[50, 100, 200, 500].filter(v => v <= available).map(v => (
                <Pressable key={v} style={m.quickBtn} onPress={() => setAmount(String(v))}>
                  <Text style={m.quickTxt}>{v}</Text>
                </Pressable>
              ))}
              {available >= MIN_WITHDRAWAL && (
                <Pressable style={m.quickBtn} onPress={() => setAmount(String(Math.floor(available)))}>
                  <Text style={m.quickTxt}>Tout</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Bank info */}
          <View style={m.group}>
            <Text style={m.label}>Informations bancaires</Text>
            <TextInput style={m.input} value={bank} onChangeText={setBank}
              placeholder="Nom de la banque (ex: CIH, Attijariwafa…)" placeholderTextColor="#94A3B8" />
            <TextInput style={m.input} value={name} onChangeText={setName}
              placeholder="Nom du titulaire du compte" placeholderTextColor="#94A3B8" />
            <TextInput style={m.input} value={rib} onChangeText={setRib}
              placeholder="RIB (24 chiffres)" placeholderTextColor="#94A3B8"
              keyboardType="number-pad" maxLength={24} />
          </View>

          {error && (
            <View style={m.errorBanner}>
              <Text style={m.errorTxt}>⚠️ {error}</Text>
            </View>
          )}

          <View style={m.infoBox}>
            <Text style={m.infoTxt}>
              💡 Votre demande sera traitée par l'équipe Horizon dans les 2–3 jours ouvrables. Vous recevrez une notification à la confirmation.
            </Text>
          </View>

          <Pressable
            style={[m.submitBtn, { backgroundColor: loading ? C + '80' : C }]}
            onPress={submit}
            disabled={loading}
          >
            <Text style={m.submitTxt}>{loading ? 'Envoi…' : '🏦 Envoyer la demande'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main wallet screen ───────────────────────────────────────────────────────
export function DriverWallet() {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();

  const [wallet,        setWallet]        = useState<WalletData | null>(null);
  const [transactions,  setTransactions]  = useState<Transaction[]>([]);
  const [withdrawals,   setWithdrawals]   = useState<WithdrawalRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [err,           setErr]           = useState('');
  const [modalOpen,     setModalOpen]     = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErr('');

    const [walletRes, txRes, wrRes] = await Promise.all([
      supabase.from('driver_wallets').select('balance, reserved').eq('driver_id', user.id).single(),
      supabase.from('wallet_transactions').select('*').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('withdrawal_requests').select('*').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);

    if (walletRes.error && walletRes.error.code !== 'PGRST116') {
      setErr(walletRes.error.message);
    } else {
      setWallet({ balance: walletRes.data?.balance ?? 0, reserved: walletRes.data?.reserved ?? 0 });
    }
    setTransactions((txRes.data ?? []) as Transaction[]);
    setWithdrawals((wrRes.data ?? []) as WithdrawalRequest[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={C} /></View>;
  }

  const available = wallet?.balance  ?? 0;
  const reserved  = wallet?.reserved ?? 0;
  const total     = available + reserved;
  const hasPending = withdrawals.some(w => w.status === 'pending');

  return (
    <>
      <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>

        {/* ── Balance card ───────────────────────────────────── */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Solde disponible</Text>
          <Text style={s.balanceAmount}>{available.toFixed(2)} MAD</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceSub}>
              <Text style={s.balanceSubLabel}>🔒 Réservé</Text>
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
                🔒 {reserved.toFixed(2)} MAD bloqué comme commission pour vos trajets actifs.
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

        {/* ── Withdrawal button ──────────────────────────────── */}
        <View style={s.withdrawSection}>
          {available < MIN_WITHDRAWAL ? (
            <View style={s.withdrawLocked}>
              <Text style={s.withdrawLockedIcon}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.withdrawLockedTitle}>Retrait non disponible</Text>
                <Text style={s.withdrawLockedSub}>
                  Solde minimum requis : {MIN_WITHDRAWAL} MAD. Il vous manque {(MIN_WITHDRAWAL - available).toFixed(2)} MAD.
                </Text>
              </View>
            </View>
          ) : hasPending ? (
            <View style={s.withdrawLocked}>
              <Text style={s.withdrawLockedIcon}>⏳</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.withdrawLockedTitle}>Demande en cours</Text>
                <Text style={s.withdrawLockedSub}>Votre retrait est en attente de validation par l'équipe Horizon.</Text>
              </View>
            </View>
          ) : (
            <Pressable style={s.withdrawBtn} onPress={() => setModalOpen(true)}>
              <Text style={s.withdrawBtnIcon}>🏦</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.withdrawBtnTitle}>Retirer des fonds</Text>
                <Text style={s.withdrawBtnSub}>{available.toFixed(2)} MAD disponible</Text>
              </View>
              <Text style={s.withdrawBtnArrow}>→</Text>
            </Pressable>
          )}
        </View>

        {/* ── Withdrawal history ─────────────────────────────── */}
        {withdrawals.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🏦 Historique des retraits</Text>
            {withdrawals.map((wr) => {
              const meta = WR_STATUS[wr.status];
              const date = new Date(wr.created_at).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <View key={wr.id} style={[s.wrRow, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.wrAmount}>{wr.amount.toFixed(2)} MAD</Text>
                    <Text style={s.wrBank}>{wr.bank_name ?? ''} · {wr.rib ?? ''}</Text>
                    <Text style={s.wrDate}>{date}</Text>
                    {wr.admin_note && (
                      <Text style={[s.wrNote, { color: meta.color }]}>Note : {wr.admin_note}</Text>
                    )}
                  </View>
                  <View style={[s.wrBadge, { backgroundColor: meta.color + '20' }]}>
                    <Text style={[s.wrBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Transaction history ────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📋 Historique des transactions</Text>
          {transactions.length === 0 ? (
            <View style={s.emptyTx}>
              <Text style={s.emptyTxIcon}>💰</Text>
              <Text style={s.emptyTxTxt}>Aucune transaction</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const meta = TX_META[tx.type] ?? TX_META.recharge;
              const date = new Date(tx.created_at).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
              const time = new Date(tx.created_at).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
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

      <WithdrawModal
        visible={modalOpen}
        available={available}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); load(); }}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  balanceCard: {
    margin: 16, backgroundColor: C, borderRadius: 24, padding: 24, gap: 8,
    shadowColor: C, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  balanceLabel:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  balanceAmount:   { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  balanceRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  balanceSub:      { gap: 2 },
  balanceSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  balanceSubValue: { fontSize: 14, color: '#fff', fontWeight: '700' },
  reservedNote:    { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 10, marginTop: 4 },
  reservedNoteTxt: { fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 17 },

  errBanner: { marginHorizontal: 16, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  errTxt:    { fontSize: 13, color: '#EF4444', flex: 1 },

  withdrawSection: { marginHorizontal: 16, marginBottom: 16 },
  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    borderWidth: 2, borderColor: C,
    shadowColor: C, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  withdrawBtnIcon:  { fontSize: 28 },
  withdrawBtnTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  withdrawBtnSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  withdrawBtnArrow: { fontSize: 20, color: C, fontWeight: '700' },
  withdrawLocked: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  withdrawLockedIcon:  { fontSize: 28 },
  withdrawLockedTitle: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  withdrawLockedSub:   { fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 17 },

  card: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },

  wrRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  wrAmount: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  wrBank:   { fontSize: 12, color: '#64748B' },
  wrDate:   { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  wrNote:   { fontSize: 12, fontWeight: '600', marginTop: 2 },
  wrBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  wrBadgeTxt: { fontSize: 11, fontWeight: '700' },

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

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title:    { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },

  balanceHint: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C + '12', borderRadius: 14, padding: 14 },
  balanceHintTxt: { fontSize: 13, color: C, fontWeight: '600' },
  balanceHintAmt: { fontSize: 18, fontWeight: '900', color: C },

  group:    { gap: 8 },
  label:    { fontSize: 13, fontWeight: '700', color: '#475569' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14 },
  input:    { flex: 1, fontSize: 15, color: '#1E293B', paddingVertical: 13, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14, marginVertical: 2 },
  currency: { fontSize: 13, fontWeight: '700', color: C },

  quickBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: C + '15', borderRadius: 10 },
  quickTxt: { fontSize: 12, fontWeight: '700', color: C },

  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt:    { fontSize: 13, color: '#EF4444', fontWeight: '500' },

  infoBox:  { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14 },
  infoTxt:  { fontSize: 12, color: '#3B82F6', lineHeight: 18 },

  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

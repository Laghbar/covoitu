import * as Linking from 'expo-linking';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#6366F1';

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  name: string;
  role: string;
  is_admin: boolean;
  suspended: boolean;
  documents_verified: boolean;
  created_at: string;
};

type WalletData = {
  balance:          number;
  security_deposit: number;
  pending_amount:   number;
  platform_margin:  number;
};

type Transaction = {
  id: string;
  amount: number;
  target: 'balance' | 'security_deposit';
  note: string | null;
  created_at: string;
};

type DocUrls = {
  doc_national_id_url:  string | null;
  doc_license_url:      string | null;
  doc_registration_url: string | null;
};

// ─── Wallet Modal ─────────────────────────────────────────────────────────────

function WalletModal({
  user,
  onClose,
  onSuccess,
}: {
  user: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [wallet,       setWallet]       = useState<WalletData | null>(null);
  const [txns,         setTxns]         = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [amount,       setAmount]       = useState('');
  const [target,       setTarget]       = useState<'balance' | 'security_deposit'>('balance');
  const [note,         setNote]         = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // driver_wallets uses driver_id; columns are balance + reserved
    const { data: w } = await supabase
      .from('driver_wallets')
      .select('balance, reserved')
      .eq('driver_id', user.id)
      .single();

    setWallet({
      balance:          w?.balance  ?? 0,
      security_deposit: w?.reserved ?? 0,
      pending_amount:   0,
      platform_margin:  0,
    });

    const { data: t } = await supabase
      .from('wallet_transactions')
      .select('id, amount, type, description, created_at')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setTxns((t ?? []).map((r: any) => ({
      id:         r.id,
      amount:     r.amount,
      target:     (r.type === 'commission_reserve') ? 'security_deposit' as const : 'balance' as const,
      note:       r.description,
      created_at: r.created_at,
    })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const addFunds = async () => {
    if (!user) return;
    const val = parseFloat(amount);
    if (!val || val <= 0) { alert('Enter a valid amount'); return; }

    setSaving(true);

    // Atomic increment via stored function — never risks stale-read overwrite
    const { error } = await supabase.rpc('admin_add_wallet_funds', {
      p_driver_id: user.id,
      p_amount:    val,
      p_field:     target === 'balance' ? 'balance' : 'reserved',
      p_note:      note.trim() || null,
    });

    if (error) { alert('Error: ' + error.message); setSaving(false); return; }

    setSaving(false);
    onClose();
    onSuccess(`${val.toFixed(2)} MAD added to ${user.name}'s wallet`);
  };

  if (!user) return null;

  const fmt = (n: number) => n.toFixed(2) + ' MAD';

  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={wm.overlay} onPress={onClose} />
      <View style={wm.sheet}>
        {/* Header */}
        <View style={wm.header}>
          <Text style={wm.title}>🪙 Wallet — {user.name}</Text>
          <Pressable style={wm.closeBtn} onPress={onClose}>
            <Text style={wm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={wm.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color={C} style={{ marginVertical: 24 }} />
          ) : (
            <>
              {/* Balance cards */}
              <View style={wm.balanceGrid}>
                <View style={[wm.balCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                  <Text style={[wm.balLabel, { color: '#10B981' }]}>Solde disponible</Text>
                  <Text style={[wm.balAmt,   { color: '#10B981' }]}>{fmt(wallet?.balance ?? 0)}</Text>
                </View>
                <View style={[wm.balCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[wm.balLabel, { color: '#3B82F6' }]}>Dépôt de garantie</Text>
                  <Text style={[wm.balAmt,   { color: '#3B82F6' }]}>{fmt(wallet?.security_deposit ?? 0)}</Text>
                </View>
                <View style={[wm.balCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <Text style={[wm.balLabel, { color: '#D97706' }]}>En attente</Text>
                  <Text style={[wm.balAmt,   { color: '#D97706' }]}>{fmt(wallet?.pending_amount ?? 0)}</Text>
                </View>
                <View style={[wm.balCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                  <Text style={[wm.balLabel, { color: C }]}>Marge plateforme</Text>
                  <Text style={[wm.balAmt,   { color: C }]}>{fmt(wallet?.platform_margin ?? 0)}</Text>
                </View>
              </View>

              {/* Add funds */}
              <View style={wm.section}>
                <Text style={wm.sectionTitle}>Ajouter des fonds</Text>

                <View style={wm.amountRow}>
                  <TextInput
                    style={[wm.input, { flex: 1 }]}
                    placeholder="Montant en MAD"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <Text style={wm.madLabel}>MAD</Text>
                </View>

                <View style={wm.radioRow}>
                  <Pressable style={wm.radioOpt} onPress={() => setTarget('balance')}>
                    <View style={[wm.radio, target === 'balance' && wm.radioActive]}>
                      {target === 'balance' && <View style={wm.radioDot} />}
                    </View>
                    <Text style={wm.radioTxt}>Solde disponible</Text>
                  </Pressable>
                  <Pressable style={wm.radioOpt} onPress={() => setTarget('security_deposit')}>
                    <View style={[wm.radio, target === 'security_deposit' && wm.radioActive]}>
                      {target === 'security_deposit' && <View style={wm.radioDot} />}
                    </View>
                    <Text style={wm.radioTxt}>Dépôt de garantie</Text>
                  </Pressable>
                </View>

                <TextInput
                  style={wm.input}
                  placeholder="Note (optionnelle)"
                  placeholderTextColor="#94A3B8"
                  value={note}
                  onChangeText={setNote}
                />

                <Pressable
                  style={[wm.addBtn, (saving || !amount) && { opacity: 0.55 }]}
                  onPress={addFunds}
                  disabled={saving || !amount}>
                  <Text style={wm.addTxt}>{saving ? 'Enregistrement…' : '+ Ajouter'}</Text>
                </Pressable>
              </View>

              {/* Transactions */}
              <View style={wm.section}>
                <Text style={wm.sectionTitle}>Dernières transactions</Text>
                {txns.length === 0 ? (
                  <Text style={wm.noTxn}>Aucune transaction</Text>
                ) : (
                  txns.map(t => (
                    <View key={t.id} style={wm.txnRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={wm.txnAmt}>+{t.amount.toFixed(2)} MAD</Text>
                        <Text style={wm.txnTarget}>
                          {t.target === 'security_deposit' ? 'Dépôt de garantie' : 'Solde disponible'}
                          {t.note ? ` · ${t.note.replace(/ ?[–—-]? ?(Solde disponible|Dépôt de garantie|balance|reserved)$/i, '')}` : ''}
                        </Text>
                      </View>
                      <Text style={wm.txnDate}>
                        {new Date(t.created_at).toLocaleDateString('fr-MA')}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const wm = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    top: '50%', left: '50%',
    // @ts-ignore web only
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    width: 420,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title:    { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  content:  { padding: 20, gap: 16, paddingBottom: 24 },

  balanceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  balCard: {
    flex: 1, minWidth: '45%', borderRadius: 14, padding: 14,
    borderWidth: 1, gap: 4,
  },
  balLabel: { fontSize: 11, fontWeight: '700' },
  balAmt:   { fontSize: 18, fontWeight: '900' },

  section:      { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
  },
  madLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  radioRow: { flexDirection: 'row', gap: 20 },
  radioOpt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C },
  radioDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C },
  radioTxt:    { fontSize: 13, color: '#334155', fontWeight: '600' },

  addBtn: { backgroundColor: C, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  addTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

  noTxn:    { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
  txnRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txnAmt:   { fontSize: 14, fontWeight: '800', color: '#10B981' },
  txnTarget:{ fontSize: 12, color: '#64748B', marginTop: 2 },
  txnDate:  { fontSize: 12, color: '#94A3B8' },
});

// ─── Docs Modal ───────────────────────────────────────────────────────────────

const DOC_LABELS: { key: keyof DocUrls; label: string; emoji: string }[] = [
  { key: 'doc_national_id_url',  label: 'National ID (CIN)',    emoji: '🪪' },
  { key: 'doc_license_url',      label: "Driver's Licence",     emoji: '🚗' },
  { key: 'doc_registration_url', label: 'Vehicle Registration', emoji: '📄' },
];

function DocsModal({
  driver,
  onClose,
  onVerified,
}: {
  driver: { id: string; name: string } | null;
  onClose: () => void;
  onVerified: (id: string) => void;
}) {
  const [docs,      setDocs]      = useState<DocUrls | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!driver) return;
    setDocs(null);
    setLoading(true);
    supabase
      .from('profiles')
      .select('doc_national_id_url, doc_license_url, doc_registration_url')
      .eq('id', driver.id)
      .single()
      .then(({ data }) => {
        setDocs(data ?? { doc_national_id_url: null, doc_license_url: null, doc_registration_url: null });
        setLoading(false);
      });
  }, [driver?.id]);

  const handleVerify = async () => {
    if (!driver) return;
    setVerifying(true);
    const { error } = await supabase
      .from('driver_verifications')
      .update({ status: 'verified', reviewed_at: new Date().toISOString() })
      .eq('driver_id', driver.id);
    setVerifying(false);
    if (!error) { onVerified(driver.id); onClose(); }
    else alert('Error: ' + error.message);
  };

  const handleReject = async (reason: string) => {
    if (!driver) return;
    setVerifying(true);
    const { error } = await supabase
      .from('driver_verifications')
      .update({ status: 'rejected', rejection_reason: reason, reviewed_at: new Date().toISOString() })
      .eq('driver_id', driver.id);
    setVerifying(false);
    if (!error) { onVerified(driver.id); onClose(); }
    else alert('Error: ' + error.message);
  };

  const openDoc = (url: string) => {
    if (Platform.OS === 'web') window.open(url, '_blank');
    else Linking.openURL(url);
  };

  if (!driver) return null;

  const uploadedCount = docs ? DOC_LABELS.filter(d => docs[d.key]).length : 0;

  return (
    <Modal visible={!!driver} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={dm.overlay} onPress={onClose} />
      <View style={dm.panel}>
        <View style={dm.handle} />
        <View style={dm.header}>
          <View>
            <Text style={dm.title}>Documents — {driver.name}</Text>
            <Text style={dm.sub}>{uploadedCount}/3 documents uploaded</Text>
          </View>
          <Pressable style={dm.closeBtn} onPress={onClose}>
            <Text style={dm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={dm.content}>
          {loading ? (
            <ActivityIndicator color={C} style={{ marginTop: 20 }} />
          ) : (
            <>
              {DOC_LABELS.map(d => {
                const url = docs?.[d.key] ?? null;
                return (
                  <View key={d.key} style={[dm.docRow, url && dm.docRowUploaded]}>
                    <Text style={dm.docEmoji}>{d.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.docLabel}>{d.label}</Text>
                      <Text style={url ? dm.uploaded : dm.missing}>
                        {url ? '✓ Uploaded' : '✗ Not uploaded'}
                      </Text>
                    </View>
                    {url && (
                      <Pressable style={dm.viewBtn} onPress={() => openDoc(url)}>
                        <Text style={dm.viewTxt}>View 🔗</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}

              {uploadedCount === 0 && (
                <View style={dm.noDocsBox}>
                  <Text style={dm.noDocsTxt}>
                    This driver has not uploaded any documents yet.
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={[dm.rejectBtn, (uploadedCount === 0 || verifying) && { opacity: 0.5 }]}
                  onPress={() => {
                    const reason = Platform.OS === 'web'
                      ? window.prompt('Rejection reason (optional):') ?? ''
                      : 'Documents unclear or invalid';
                    handleReject(reason);
                  }}
                  disabled={uploadedCount === 0 || verifying}>
                  <Text style={dm.rejectTxt}>✗ Reject</Text>
                </Pressable>
                <Pressable
                  style={[dm.verifyBtn, (uploadedCount === 0 || verifying) && { opacity: 0.5 }]}
                  onPress={handleVerify}
                  disabled={uploadedCount === 0 || verifying}>
                  <Text style={dm.verifyTxt}>{verifying ? 'Saving…' : '✓ Approve'}</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  sub:   { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  content: { padding: 16, gap: 10, paddingBottom: 8 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  docRowUploaded: { borderColor: '#10B98130', backgroundColor: '#F0FDF4' },
  docEmoji: { fontSize: 22 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  uploaded: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  missing:  { fontSize: 12, color: '#EF4444', marginTop: 2 },
  viewBtn: { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewTxt: { fontSize: 12, fontWeight: '700', color: C },
  noDocsBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  noDocsTxt: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  verifyBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  verifyTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  rejectTxt: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
});

// ─── Success Toast ────────────────────────────────────────────────────────────

function SuccessToast({ message, onDone }: { message: string; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(onDone);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[toast.wrap, { opacity }]}>
      <Text style={toast.icon}>✅</Text>
      <Text style={toast.msg}>{message}</Text>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 16, left: 16, right: 16, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#10B981', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },
  icon: { fontSize: 18 },
  msg:  { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ─── Main AdminUsers ───────────────────────────────────────────────────────────

type FilterKey = 'all' | 'drivers' | 'passengers' | 'suspended';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'drivers',    label: 'Drivers' },
  { key: 'passengers', label: 'Passengers' },
  { key: 'suspended',  label: 'Suspended' },
];

function avatarColor(p: Profile) {
  if (p.is_admin) return '#6366F1';
  if (p.role === 'driver') return '#10B981';
  return '#3B82F6';
}
function roleLabel(p: Profile) {
  if (p.is_admin) return 'Admin';
  if (p.role === 'driver') return 'Driver';
  return 'Passenger';
}

export function AdminUsers() {
  const [profiles,      setProfiles]      = useState<Profile[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>('all');
  const [docsDriver,    setDocsDriver]    = useState<{ id: string; name: string } | null>(null);
  const [walletUser,    setWalletUser]    = useState<{ id: string; name: string } | null>(null);
  const [successMsg,    setSuccessMsg]    = useState<{ text: string; key: number } | null>(null);

  const fetchProfiles = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, name, role, is_admin, suspended, documents_verified, created_at')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setProfiles(data ?? []);
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetchProfiles(); setLoading(false); })();
  }, [fetchProfiles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchProfiles(); setRefreshing(false);
  }, [fetchProfiles]);

  const toggleSuspend = useCallback(async (p: Profile) => {
    const next = !p.suspended;
    const { error: err } = await supabase.from('profiles').update({ suspended: next }).eq('id', p.id);
    if (!err) setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, suspended: next } : x));
  }, []);

  const confirmSuspend = useCallback((p: Profile) => {
    const action  = p.suspended ? 'Unsuspend' : 'Suspend';
    const message = p.suspended ? `Unsuspend ${p.name}?` : `Suspend ${p.name}? They won't be able to use the app.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) toggleSuspend(p);
    } else {
      Alert.alert(action, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: action, style: p.suspended ? 'default' : 'destructive', onPress: () => toggleSuspend(p) },
      ]);
    }
  }, [toggleSuspend]);

  const onDriverVerified = useCallback((id: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, documents_verified: true } : p));
  }, []);

  const filtered = profiles.filter(p => {
    if (!p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === 'drivers')    return p.role === 'driver';
    if (activeFilter === 'passengers') return p.role === 'passenger';
    if (activeFilter === 'suspended')  return p.suspended;
    return true;
  });

  if (loading) return <ActivityIndicator color={C} size="large" style={{ marginTop: 40 }} />;

  if (error) return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={async () => { setLoading(true); await fetchProfiles(); setLoading(false); }} style={styles.retryBtn}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <DocsModal   driver={docsDriver}  onClose={() => setDocsDriver(null)}  onVerified={onDriverVerified} />
      <WalletModal
        user={walletUser}
        onClose={() => setWalletUser(null)}
        onSuccess={msg => setSuccessMsg({ text: msg, key: Date.now() })}
      />
      {successMsg && (
        <SuccessToast
          key={successMsg.key}
          message={successMsg.text}
          onDone={() => setSuccessMsg(null)}
        />
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[styles.chip, activeFilter === f.key && styles.chipActive]}>
                  <Text style={[styles.chipText, activeFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={[styles.avatar, { backgroundColor: avatarColor(item) }]}>
                <Text style={styles.avatarText}>{(item.name?.[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText}>{item.name}</Text>
                  <View style={[styles.badge, { backgroundColor: avatarColor(item) + '20' }]}>
                    <Text style={[styles.badgeText, { color: avatarColor(item) }]}>{roleLabel(item)}</Text>
                  </View>
                </View>
                <Text style={styles.subText}>ID: {item.id.slice(0, 8)}…</Text>
                <View style={styles.tagsRow}>
                  {item.suspended && (
                    <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.badgeText, { color: '#EF4444' }]}>Suspended</Text>
                    </View>
                  )}
                  {item.role === 'driver' && (
                    <View style={[styles.badge, { backgroundColor: item.documents_verified ? '#D1FAE5' : '#FEF3C7' }]}>
                      <Text style={[styles.badgeText, { color: item.documents_verified ? '#10B981' : '#F59E0B' }]}>
                        {item.documents_verified ? '✓ Verified' : '⏳ Unverified'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              {/* Wallet button — all users */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F5F3FF' }]}
                onPress={() => setWalletUser({ id: item.id, name: item.name })}>
                <Text style={[styles.actionText, { color: C }]}>🪙 Wallet</Text>
              </TouchableOpacity>

              {/* Docs button — drivers only */}
              {item.role === 'driver' && !item.documents_verified && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#EDE9FE' }]}
                  onPress={() => setDocsDriver({ id: item.id, name: item.name })}>
                  <Text style={[styles.actionText, { color: C }]}>📄 Docs</Text>
                </TouchableOpacity>
              )}
              {item.role === 'driver' && item.documents_verified && (
                <View style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.actionText, { color: '#10B981' }]}>✓ Verified</Text>
                </View>
              )}

              {/* Suspend/Unsuspend */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: item.suspended ? '#D1FAE5' : '#FEE2E2' }]}
                onPress={() => confirmSuspend(item)}>
                <Text style={[styles.actionText, { color: item.suspended ? '#10B981' : '#EF4444' }]}>
                  {item.suspended ? 'Unsuspend' : 'Ban'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container:   { padding: 20, gap: 12, paddingBottom: 32 },
  header:      { gap: 10, marginBottom: 4 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9' },
  chipActive:     { backgroundColor: C },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop:  { flexDirection: 'row', gap: 12 },
  avatar:   { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nameText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  subText:  { fontSize: 12, color: '#64748B', marginTop: 2 },
  tagsRow:  { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:{ fontSize: 11, fontWeight: '700' },

  actions:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionText:{ fontSize: 12, fontWeight: '700' },

  empty: { color: '#94A3B8', textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  errorBanner: { margin: 20, backgroundColor: '#EF4444', borderRadius: 12, padding: 16, alignItems: 'center', gap: 10 },
  errorText:   { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  retryBtn:    { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryText:   { color: '#EF4444', fontWeight: '700', fontSize: 13 },
});

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#6366F1';

type WithdrawalRequest = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_name: string | null;
  account_name: string | null;
  rib: string | null;
  admin_note: string | null;
  created_at: string;
  driver: { name: string; email: string } | null;
};

const STATUS_META = {
  pending:  { label: 'En attente', color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
  approved: { label: 'Approuvé',   color: '#059669', bg: '#ECFDF5', icon: '✅' },
  rejected: { label: 'Refusé',     color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
};

export function AdminWithdrawals() {
  const [requests,  setRequests]  = useState<WithdrawalRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [notes,     setNotes]     = useState<Record<string, string>>({});
  const [acting,    setActing]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*, driver:driver_id(name, email)')
      .order('created_at', { ascending: false });
    setRequests((data ?? []) as WithdrawalRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id);
    await supabase
      .from('withdrawal_requests')
      .update({ status, admin_note: notes[id] ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    // Notify the driver
    const req = requests.find(r => r.id === id);
    if (req) {
      const driverRow = await supabase
        .from('profiles')
        .select('id')
        .eq('name', (req.driver as any)?.name ?? '')
        .maybeSingle();

      // Get driver_id directly from the request
      const { data: wrData } = await supabase
        .from('withdrawal_requests')
        .select('driver_id')
        .eq('id', id)
        .single();

      if (wrData?.driver_id) {
        await supabase.from('notifications').insert({
          user_id: wrData.driver_id,
          type:    status === 'approved' ? 'withdrawal_approved' : 'withdrawal_rejected',
          title:   status === 'approved' ? '✅ Retrait approuvé' : '❌ Retrait refusé',
          body:    status === 'approved'
            ? `Votre demande de retrait de ${req.amount} MAD a été approuvée. Le virement sera effectué sous 2–3 jours.`
            : `Votre demande de retrait de ${req.amount} MAD a été refusée.${notes[id] ? ' Motif : ' + notes[id] : ''}`,
          read:    false,
        });
      }
    }

    setActing(null);
    load();
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>🏦 Demandes de retrait</Text>
          {pendingCount > 0 && (
            <Text style={s.sub}>{pendingCount} en attente de validation</Text>
          )}
        </View>
        <Pressable onPress={load} style={s.refreshBtn}>
          <Text>🔄</Text>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <Pressable
            key={f}
            style={[s.filterChip, filter === f && { backgroundColor: C, borderColor: C }]}
            onPress={() => setFilter(f)}>
            <Text style={[s.filterTxt, filter === f && { color: '#fff' }]}>
              {f === 'pending' ? `⏳ En attente${pendingCount > 0 ? ` (${pendingCount})` : ''}` :
               f === 'approved' ? '✅ Approuvés' :
               f === 'rejected' ? '❌ Refusés' : 'Tous'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40 }}>🏦</Text>
          <Text style={s.emptyTxt}>Aucune demande</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {filtered.map((req) => {
            const meta = STATUS_META[req.status];
            const date = new Date(req.created_at).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <View key={req.id} style={s.card}>
                {/* Driver + amount */}
                <View style={s.cardHeader}>
                  <View style={s.driverAvatar}>
                    <Text style={s.driverInitial}>{(req.driver?.name?.[0] ?? 'D').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.driverName}>{req.driver?.name ?? 'Driver'}</Text>
                    <Text style={s.driverEmail}>{req.driver?.email ?? ''}</Text>
                    <Text style={s.reqDate}>{date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.amount}>{req.amount.toFixed(2)} MAD</Text>
                    <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[s.statusTxt, { color: meta.color }]}>{meta.icon} {meta.label}</Text>
                    </View>
                  </View>
                </View>

                {/* Bank details */}
                <View style={s.bankRow}>
                  <View style={s.bankField}>
                    <Text style={s.bankLabel}>Banque</Text>
                    <Text style={s.bankValue}>{req.bank_name ?? '—'}</Text>
                  </View>
                  <View style={s.bankField}>
                    <Text style={s.bankLabel}>Titulaire</Text>
                    <Text style={s.bankValue}>{req.account_name ?? '—'}</Text>
                  </View>
                </View>
                <View style={s.bankField}>
                  <Text style={s.bankLabel}>RIB</Text>
                  <Text style={[s.bankValue, { fontFamily: 'monospace', letterSpacing: 1 }]}>{req.rib ?? '—'}</Text>
                </View>

                {req.admin_note && (
                  <Text style={s.adminNote}>Note : {req.admin_note}</Text>
                )}

                {/* Actions — only for pending */}
                {req.status === 'pending' && (
                  <View style={s.actions}>
                    <TextInput
                      style={s.noteInput}
                      value={notes[req.id] ?? ''}
                      onChangeText={v => setNotes(prev => ({ ...prev, [req.id]: v }))}
                      placeholder="Note admin (optionnelle)"
                      placeholderTextColor="#94A3B8"
                    />
                    <View style={s.btnRow}>
                      <Pressable
                        style={[s.btn, s.btnReject, acting === req.id && { opacity: 0.5 }]}
                        onPress={() => act(req.id, 'rejected')}
                        disabled={acting === req.id}>
                        <Text style={[s.btnTxt, { color: '#DC2626' }]}>❌ Refuser</Text>
                      </Pressable>
                      <Pressable
                        style={[s.btn, s.btnApprove, acting === req.id && { opacity: 0.5 }]}
                        onPress={() => act(req.id, 'approved')}
                        disabled={acting === req.id}>
                        <Text style={[s.btnTxt, { color: '#fff' }]}>✅ Approuver</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title:  { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  sub:    { fontSize: 13, color: C, fontWeight: '600', marginTop: 2 },
  refreshBtn: { padding: 8 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff' },
  filterTxt:  { fontSize: 12, fontWeight: '600', color: '#64748B' },

  emptyTxt: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  driverAvatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: C + '20', alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: 18, fontWeight: '800', color: C },
  driverName:    { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  driverEmail:   { fontSize: 12, color: '#64748B' },
  reqDate:       { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  amount:        { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusTxt:     { fontSize: 11, fontWeight: '700' },

  bankRow:   { flexDirection: 'row', gap: 12 },
  bankField: { flex: 1, gap: 2 },
  bankLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  bankValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  adminNote: { fontSize: 12, color: '#6366F1', fontStyle: 'italic' },

  actions:   { gap: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  noteInput: { backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  btnRow:    { flexDirection: 'row', gap: 8 },
  btn:       { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnApprove:{ backgroundColor: '#059669' },
  btnReject: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  btnTxt:    { fontSize: 13, fontWeight: '800' },
});

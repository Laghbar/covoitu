import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type VerifStatus = 'unsubmitted' | 'pending_review' | 'verified' | 'rejected';

type DriverVerif = {
  driver_id: string;
  status: VerifStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  profiles: {
    name: string;
    doc_national_id_url: string | null;
    doc_license_url: string | null;
    doc_registration_url: string | null;
  } | null;
};

type FilterKey = 'pending' | 'all' | 'verified' | 'rejected';

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'pending',  label: '⏳ Pending',  color: '#D97706' },
  { key: 'all',      label: 'All',          color: C },
  { key: 'verified', label: '✓ Verified',   color: '#10B981' },
  { key: 'rejected', label: '✗ Rejected',   color: '#EF4444' },
];

const STATUS_CONFIG: Record<VerifStatus, { label: string; bg: string; fg: string }> = {
  unsubmitted:    { label: 'Not submitted', bg: '#F1F5F9', fg: '#64748B' },
  pending_review: { label: 'Pending review', bg: '#FEF3C7', fg: '#D97706' },
  verified:       { label: 'Verified',       bg: '#D1FAE5', fg: '#10B981' },
  rejected:       { label: 'Rejected',       bg: '#FEE2E2', fg: '#EF4444' },
};

const DOC_SLOTS: { key: 'doc_national_id_url' | 'doc_license_url' | 'doc_registration_url'; label: string; emoji: string }[] = [
  { key: 'doc_national_id_url',  label: 'National ID (CIN)',    emoji: '🪪' },
  { key: 'doc_license_url',      label: "Driver's Licence",     emoji: '🚗' },
  { key: 'doc_registration_url', label: 'Vehicle Registration', emoji: '📄' },
];

function docCount(v: DriverVerif): number {
  const p = v.profiles;
  if (!p) return 0;
  return [p.doc_national_id_url, p.doc_license_url, p.doc_registration_url].filter(Boolean).length;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({
  item,
  onClose,
  onDone,
}: {
  item: DriverVerif | null;
  onClose: () => void;
  onDone: (id: string, newStatus: VerifStatus) => void;
}) {
  const [saving,       setSaving]       = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);

  useEffect(() => {
    if (!item) { setShowReject(false); setRejectReason(''); }
  }, [item?.driver_id]);

  if (!item) return null;

  const docs = item.profiles;
  const count = docCount(item);
  const name  = item.profiles?.name ?? 'Unknown driver';

  const approve = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('driver_verifications')
      .update({ status: 'verified', reviewed_at: new Date().toISOString(), rejection_reason: null })
      .eq('driver_id', item.driver_id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onDone(item.driver_id, 'verified');
    onClose();
  };

  const reject = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('driver_verifications')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectReason.trim() || 'Documents unclear or invalid',
      })
      .eq('driver_id', item.driver_id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onDone(item.driver_id, 'rejected');
    onClose();
  };

  const openDoc = (url: string) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={rm.overlay} onPress={onClose} />
      <View style={rm.sheet}>
        <View style={rm.handle} />

        {/* Header */}
        <View style={rm.header}>
          <View style={[rm.avatar, { backgroundColor: C }]}>
            <Text style={rm.avatarTxt}>{(name[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rm.name}>{name}</Text>
            <Text style={rm.meta}>
              {count}/3 documents · Submitted {formatDate(item.submitted_at)}
            </Text>
          </View>
          <Pressable style={rm.closeBtn} onPress={onClose}>
            <Text style={rm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={rm.content} showsVerticalScrollIndicator={false}>

          {/* Rejection reason (if previously rejected) */}
          {item.status === 'rejected' && item.rejection_reason && (
            <View style={rm.prevRejectBox}>
              <Text style={rm.prevRejectLabel}>Previous rejection reason:</Text>
              <Text style={rm.prevRejectReason}>{item.rejection_reason}</Text>
            </View>
          )}

          {/* Document list */}
          {DOC_SLOTS.map(slot => {
            const url = docs?.[slot.key] ?? null;
            return (
              <View key={slot.key} style={[rm.docRow, url ? rm.docRowOk : rm.docRowMissing]}>
                <Text style={rm.docEmoji}>{slot.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={rm.docLabel}>{slot.label}</Text>
                  <Text style={url ? rm.docOk : rm.docMissing}>
                    {url ? '✓ Uploaded' : '✗ Not uploaded'}
                  </Text>
                </View>
                {url && (
                  <Pressable style={rm.viewBtn} onPress={() => openDoc(url)}>
                    <Text style={rm.viewTxt}>View 🔗</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {count === 0 && (
            <View style={rm.noDocs}>
              <Text style={rm.noDocsTxt}>
                This driver has not uploaded any documents yet. They need to upload all 3 documents before you can review them.
              </Text>
            </View>
          )}

          {/* Reject reason input */}
          {showReject && (
            <View style={rm.reasonBox}>
              <Text style={rm.reasonLabel}>Rejection reason (shown to driver):</Text>
              <TextInput
                style={rm.reasonInput}
                placeholder="e.g. Documents are blurry or expired"
                placeholderTextColor="#94A3B8"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={[rm.rejectConfirmBtn, saving && { opacity: 0.5 }]}
                  onPress={reject}
                  disabled={saving}>
                  <Text style={rm.rejectConfirmTxt}>{saving ? 'Saving…' : '✗ Confirm Reject'}</Text>
                </Pressable>
                <Pressable style={rm.cancelRejectBtn} onPress={() => setShowReject(false)}>
                  <Text style={rm.cancelRejectTxt}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Action buttons */}
          {!showReject && item.status !== 'verified' && (
            <View style={rm.actions}>
              <Pressable
                style={[rm.rejectBtn, (count === 0 || saving) && { opacity: 0.4 }]}
                onPress={() => setShowReject(true)}
                disabled={count === 0 || saving}>
                <Text style={rm.rejectBtnTxt}>✗ Reject</Text>
              </Pressable>
              <Pressable
                style={[rm.approveBtn, (count === 0 || saving) && { opacity: 0.4 }]}
                onPress={approve}
                disabled={count === 0 || saving}>
                <Text style={rm.approveBtnTxt}>{saving ? 'Saving…' : '✓ Approve'}</Text>
              </Pressable>
            </View>
          )}

          {item.status === 'verified' && (
            <View style={rm.alreadyVerified}>
              <Text style={rm.alreadyVerifiedTxt}>✓ This driver is already verified</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminVerifications() {
  const [items,       setItems]       = useState<DriverVerif[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState<FilterKey>('pending');
  const [reviewing,   setReviewing]   = useState<DriverVerif | null>(null);
  const [fetchError,  setFetchError]  = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from('driver_verifications')
      .select(`
        driver_id,
        status,
        submitted_at,
        reviewed_at,
        rejection_reason,
        profiles (
          name,
          doc_national_id_url,
          doc_license_url,
          doc_registration_url
        )
      `)
      .order('driver_id', { ascending: false });

    if (error) {
      setFetchError(error.message);
    } else if (data) {
      setItems(data as unknown as DriverVerif[]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetch();
      setLoading(false);
    })();
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  const onDone = useCallback((id: string, newStatus: VerifStatus) => {
    setItems(prev => prev.map(v => v.driver_id === id ? { ...v, status: newStatus } : v));
  }, []);

  const filtered = items.filter(v => {
    if (filter === 'pending')  return v.status === 'pending_review';
    if (filter === 'verified') return v.status === 'verified';
    if (filter === 'rejected') return v.status === 'rejected';
    return v.status !== 'unsubmitted';
  });

  const pendingCount = items.filter(v => v.status === 'pending_review').length;

  if (loading) {
    return <ActivityIndicator color={C} size="large" style={{ marginTop: 60 }} />;
  }

  if (fetchError) {
    return (
      <View style={{ margin: 24, backgroundColor: '#FEE2E2', borderRadius: 14, padding: 16, gap: 10 }}>
        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Failed to load verifications:</Text>
        <Text style={{ color: '#EF4444', fontSize: 13 }}>{fetchError}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); fetch().then(() => setLoading(false)); }}
          style={{ backgroundColor: '#EF4444', borderRadius: 10, padding: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ReviewModal item={reviewing} onClose={() => setReviewing(null)} onDone={onDone} />

      <FlatList
        data={filtered}
        keyExtractor={v => v.driver_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />}
        ListHeaderComponent={
          <View style={s.header}>
            <View style={s.titleRow}>
              <Text style={s.title}>Driver Verifications</Text>
              {pendingCount > 0 && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeTxt}>{pendingCount} pending</Text>
                </View>
              )}
            </View>
            <Text style={s.subtitle}>
              Review driver documents before they can create rides.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
              <View style={s.filterRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.chip, filter === f.key && { backgroundColor: f.color }]}
                    onPress={() => setFilter(f.key)}>
                    <Text style={[s.chipTxt, filter === f.key && { color: '#fff' }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        }
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const cfg   = STATUS_CONFIG[item.status];
          const count = docCount(item);
          const name  = item.profiles?.name ?? 'Unknown';

          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.avatar, { backgroundColor: C + '20' }]}>
                  <Text style={[s.avatarTxt, { color: C }]}>{(name[0] ?? '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.driverName}>{name}</Text>
                  <Text style={s.driverMeta}>
                    Submitted: {formatDate(item.submitted_at)}
                  </Text>
                  {item.reviewed_at && (
                    <Text style={s.driverMeta}>
                      Reviewed: {formatDate(item.reviewed_at)}
                    </Text>
                  )}
                </View>
                <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[s.statusTxt, { color: cfg.fg }]}>{cfg.label}</Text>
                </View>
              </View>

              <View style={s.docBar}>
                {DOC_SLOTS.map(slot => {
                  const uploaded = !!item.profiles?.[slot.key];
                  return (
                    <View key={slot.key} style={[s.docSlot, uploaded ? s.docSlotOk : s.docSlotMissing]}>
                      <Text style={s.docSlotEmoji}>{slot.emoji}</Text>
                      <Text style={[s.docSlotTxt, { color: uploaded ? '#10B981' : '#94A3B8' }]}>
                        {uploaded ? '✓' : '✗'}
                      </Text>
                    </View>
                  );
                })}
                <Text style={s.docCount}>{count}/3 docs</Text>
              </View>

              {item.status === 'rejected' && item.rejection_reason && (
                <View style={s.rejectReasonBox}>
                  <Text style={s.rejectReasonTxt}>
                    Rejection: {item.rejection_reason}
                  </Text>
                </View>
              )}

              <Pressable
                style={[
                  s.reviewBtn,
                  item.status === 'verified' && s.reviewBtnVerified,
                ]}
                onPress={() => setReviewing(item)}>
                <Text style={[
                  s.reviewBtnTxt,
                  item.status === 'verified' && { color: '#10B981' },
                ]}>
                  {item.status === 'verified' ? '✓ Verified — View docs' : 'Review Documents →'}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>
              {filter === 'pending' ? '✅' : '📂'}
            </Text>
            <Text style={s.emptyTxt}>
              {filter === 'pending'
                ? 'No drivers waiting for review'
                : 'No drivers found'}
            </Text>
          </View>
        }
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const rm = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '88%', paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  avatar:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C },
  avatarTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name:      { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  meta:      { fontSize: 12, color: '#64748B', marginTop: 2 },
  closeBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt:  { fontSize: 14, color: '#64748B', fontWeight: '700' },
  content:   { padding: 16, gap: 12, paddingBottom: 8 },

  prevRejectBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  prevRejectLabel: { fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  prevRejectReason: { fontSize: 13, color: '#92400E' },

  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  docRowOk:      { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  docRowMissing: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  docEmoji: { fontSize: 22 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  docOk:    { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  docMissing: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  viewBtn:  { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewTxt:  { fontSize: 12, fontWeight: '700', color: C },

  noDocs: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  noDocsTxt: { fontSize: 13, color: '#92400E', lineHeight: 18 },

  reasonBox:  { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#FECACA' },
  reasonLabel: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  reasonInput: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#FECACA',
    minHeight: 72, textAlignVertical: 'top',
  },
  rejectConfirmBtn: { flex: 1, backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  rejectConfirmTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  cancelRejectBtn:  { paddingHorizontal: 16, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: '#F1F5F9' },
  cancelRejectTxt:  { color: '#64748B', fontSize: 14, fontWeight: '700' },

  actions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn:  { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  rejectBtnTxt: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
  approveBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  approveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  alreadyVerified: { backgroundColor: '#D1FAE5', borderRadius: 14, padding: 16, alignItems: 'center' },
  alreadyVerifiedTxt: { color: '#10B981', fontSize: 15, fontWeight: '700' },
});

const s = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  header: { gap: 6, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  pendingBadge: { backgroundColor: '#D97706', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pendingBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  subtitle: { fontSize: 13, color: '#64748B' },
  filterScroll: { marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 18, fontWeight: '800' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  driverMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },

  docBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docSlot: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  docSlotOk:      { backgroundColor: '#F0FDF4' },
  docSlotMissing: { backgroundColor: '#F8FAFC' },
  docSlotEmoji: { fontSize: 14 },
  docSlotTxt:   { fontSize: 12, fontWeight: '700' },
  docCount:     { marginLeft: 'auto', fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  rejectReasonBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10 },
  rejectReasonTxt: { fontSize: 12, color: '#EF4444' },

  reviewBtn: {
    backgroundColor: C + '12', borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: C + '30',
  },
  reviewBtnVerified: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  reviewBtnTxt: { fontSize: 14, fontWeight: '700', color: C },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTxt:   { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
});

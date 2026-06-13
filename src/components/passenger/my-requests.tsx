import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#3B82F6';
const G = '#10B981';

// ─── Types ────────────────────────────────────────────────────────────────────

type DriverResponse = {
  id: string;
  driver_id: string;
  ride_id: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  driver_name: string;
  ride_from: string | null;
  ride_to: string | null;
  ride_date: string | null;
  ride_time: string | null;
  ride_price: number | null;
};

type RideRequest = {
  id: string;
  passenger_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  seats_needed: number;
  max_price: number | null;
  message: string | null;
  status: 'open' | 'accepted' | 'cancelled' | 'expired';
  created_at: string;
  responses: DriverResponse[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' });
}

const REQ_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  open:      { label: 'Open',      bg: '#EFF6FF', fg: C },
  accepted:  { label: 'Accepted',  bg: '#D1FAE5', fg: G },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', fg: '#EF4444' },
  expired:   { label: 'Expired',   bg: '#F1F5F9', fg: '#94A3B8' },
};

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({
  res, requestStatus, seatsNeeded,
  onAccept, onReject,
}: {
  res: DriverResponse;
  requestStatus: string;
  seatsNeeded: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isAccepted = res.status === 'accepted';
  const isRejected = res.status === 'rejected';
  const initial    = (res.driver_name?.[0] ?? 'D').toUpperCase();

  return (
    <View style={[pc.card, isAccepted && pc.cardGreen, isRejected && pc.cardGray]}>
      <View style={pc.row}>
        <View style={[pc.avatar, { backgroundColor: isAccepted ? G : '#64748B' }]}>
          <Text style={pc.avatarTxt}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pc.name}>{res.driver_name}</Text>
          {res.ride_from ? (
            <Text style={pc.route}>
              {res.ride_from} → {res.ride_to}
            </Text>
          ) : null}
          <View style={pc.metaRow}>
            {res.ride_date ? <Text style={pc.meta}>{fmtDate(res.ride_date)}</Text> : null}
            {res.ride_time ? <Text style={pc.meta}>· {res.ride_time.slice(0, 5)}</Text> : null}
            {res.ride_price != null ? (
              <Text style={[pc.meta, pc.price]}>{res.ride_price} MAD/seat</Text>
            ) : null}
          </View>
        </View>
        {isAccepted && (
          <View style={pc.badge}><Text style={[pc.badgeTxt, { color: G }]}>✓ Accepted</Text></View>
        )}
        {isRejected && (
          <View style={[pc.badge, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[pc.badgeTxt, { color: '#94A3B8' }]}>✗ Declined</Text>
          </View>
        )}
      </View>

      {res.message ? <Text style={pc.msg}>"{res.message}"</Text> : null}

      {res.status === 'pending' && requestStatus === 'open' && (
        <View style={pc.actions}>
          <Pressable style={pc.declineBtn} onPress={onReject}>
            <Text style={pc.declineTxt}>✗ Decline</Text>
          </Pressable>
          <Pressable style={pc.acceptBtn} onPress={onAccept}>
            <Text style={pc.acceptTxt}>✓ Accept Driver</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  cardGray:  { opacity: 0.55 },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  name:      { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  route:     { fontSize: 13, color: '#475569', marginTop: 2 },
  metaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  meta:      { fontSize: 12, color: '#64748B' },
  price:     { color: G, fontWeight: '700' },
  badge:     { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
  msg:       { fontSize: 13, color: '#64748B', fontStyle: 'italic' },
  actions:   { flexDirection: 'row', gap: 8 },
  declineBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  declineTxt: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  acceptBtn:  { flex: 2, backgroundColor: G, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  acceptTxt:  { color: '#fff', fontSize: 13, fontWeight: '800' },
});

// ─── Request Card (with inline proposals) ─────────────────────────────────────

function RequestCard({ req, onUpdate, onRemove }: { req: RideRequest; onUpdate: () => void; onRemove: () => void }) {
  const [acting,        setActing]        = useState(false);
  const [expanded,      setExpanded]      = useState(req.responses.some(r => r.status === 'pending'));
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Optimistic local hide: IDs declined this session before re-fetch completes
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const cfg     = REQ_STATUS[req.status] ?? REQ_STATUS.open;
  const visible = req.responses.filter(r => !hiddenIds.has(r.id));
  const pending = visible.filter(r => r.status === 'pending');

  const notify = (userId: string, type: string, title: string, body: string) => {
    // Fire-and-forget — never let notification failure block the UI
    supabase.from('notifications').insert({ user_id: userId, type, title, body });
  };

  const accept = async (res: DriverResponse) => {
    setActing(true);

    await supabase.from('driver_responses').update({ status: 'accepted' }).eq('id', res.id);

    const otherIds = req.responses.filter(r => r.id !== res.id).map(r => r.id);
    if (otherIds.length) {
      await supabase.from('driver_responses').update({ status: 'rejected' }).in('id', otherIds);
    }

    await supabase.from('ride_requests').update({ status: 'accepted' }).eq('id', req.id);

    if (res.ride_id) {
      await supabase.from('bookings').insert({
        ride_id:         res.ride_id,
        passenger_id:    req.passenger_id,
        seats_requested: req.seats_needed,
        status:          'accepted',
      });
    }

    notify(res.driver_id, 'request_accepted', 'Passenger accepted your proposal!',
      `Your proposal for ${req.from_city} → ${req.to_city} was accepted.`);

    setActing(false);
    onUpdate();
  };

  const reject = async (res: DriverResponse) => {
    setActing(true);
    // Optimistically hide right away so the card updates even before re-fetch
    setHiddenIds(prev => new Set([...prev, res.id]));
    await supabase.from('driver_responses').update({ status: 'rejected' }).eq('id', res.id);
    notify(res.driver_id, 'request_rejected', 'Proposal declined',
      `Passenger declined your proposal for ${req.from_city} → ${req.to_city}.`);
    setActing(false);
    onUpdate();
  };

  const doCancel = async () => {
    setConfirmCancel(false);
    onRemove(); // remove from list immediately
    await supabase.from('ride_requests').update({ status: 'cancelled' }).eq('id', req.id);
  };

  return (
    <View style={[s.card, pending.length > 0 && s.cardHighlight]}>
      {/* Header */}
      <Pressable style={s.cardHeader} onPress={() => setExpanded(e => !e)}>
        <View style={{ flex: 1 }}>
          <Text style={s.route}>{req.from_city} → {req.to_city}</Text>
          <Text style={s.meta}>
            {fmtDate(req.departure_date)} · {req.departure_time.slice(0, 5)} · {req.seats_needed} seat{req.seats_needed > 1 ? 's' : ''}
          </Text>
          {req.max_price ? <Text style={s.maxPrice}>Max {req.max_price} MAD/seat</Text> : null}
        </View>
        <View style={s.headerRight}>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusTxt, { color: cfg.fg }]}>{cfg.label}</Text>
          </View>
          <Text style={s.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {/* Proposals count banner */}
      {pending.length > 0 && !expanded && (
        <Pressable style={s.proposalBanner} onPress={() => setExpanded(true)}>
          <Text style={s.proposalBannerTxt}>
            🚗 {pending.length} driver proposal{pending.length > 1 ? 's' : ''} waiting — Tap to review
          </Text>
        </Pressable>
      )}

      {/* Inline proposals */}
      {expanded && (
        <View style={s.proposalsSection}>
          {acting && <ActivityIndicator color={C} style={{ marginVertical: 8 }} />}

          {visible.length === 0 ? (
            <View style={s.noProposals}>
              <Text style={s.noProposalsTxt}>
                No driver proposals yet. Drivers will see your request and respond soon.
              </Text>
            </View>
          ) : (
            <>
              <Text style={s.proposalsLabel}>
                {visible.length} Driver Proposal{visible.length > 1 ? 's' : ''}
              </Text>
              {visible.map(res => (
                <ProposalCard
                  key={res.id}
                  res={res}
                  requestStatus={req.status}
                  seatsNeeded={req.seats_needed}
                  onAccept={() => accept(res)}
                  onReject={() => reject(res)}
                />
              ))}
            </>
          )}

          {req.message ? (
            <View style={s.noteBox}>
              <Text style={s.noteTxt}>Your note: "{req.message}"</Text>
            </View>
          ) : null}

          {req.status === 'open' && !confirmCancel && (
            <Pressable style={s.cancelBtn} onPress={() => setConfirmCancel(true)}>
              <Text style={s.cancelTxt}>Cancel this request</Text>
            </Pressable>
          )}
          {req.status === 'open' && confirmCancel && (
            <View style={s.confirmRow}>
              <Text style={s.confirmTxt}>Cancel this request?</Text>
              <View style={s.confirmBtns}>
                <Pressable style={s.confirmNo} onPress={() => setConfirmCancel(false)}>
                  <Text style={s.confirmNoTxt}>No</Text>
                </Pressable>
                <Pressable style={s.confirmYes} onPress={doCancel}>
                  <Text style={s.confirmYesTxt}>Yes, cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = { onCreateNew: () => void };

export function PassengerRequests({ onCreateNew }: Props) {
  const { user } = useAuth();
  const [requests,   setRequests]   = useState<RideRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;

    // Fetch requests — exclude cancelled and expired
    const { data: reqs } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('passenger_id', user.id)
      .in('status', ['open', 'accepted'])
      .order('created_at', { ascending: false });

    if (!reqs?.length) { setRequests([]); return; }

    // Fetch responses separately (avoids FK naming issues with nested joins)
    const reqIds = reqs.map(r => r.id);
    const { data: rawResponses } = await supabase
      .from('driver_responses')
      .select('id, request_id, driver_id, ride_id, status, message, created_at')
      .in('request_id', reqIds)
      .neq('status', 'rejected'); // hide rejected unless we want to show them

    // Fetch driver names
    const driverIds = [...new Set((rawResponses ?? []).map(r => r.driver_id))];
    const { data: drivers } = driverIds.length
      ? await supabase.from('profiles').select('id, name').in('id', driverIds)
      : { data: [] };

    // Fetch linked rides
    const rideIds = [...new Set((rawResponses ?? []).map(r => r.ride_id).filter(Boolean))];
    const { data: rides } = rideIds.length
      ? await supabase.from('rides').select('id, from_city, to_city, departure_date, departure_time, price').in('id', rideIds)
      : { data: [] };

    const driverMap = Object.fromEntries((drivers ?? []).map(d => [d.id, d.name]));
    const rideMap   = Object.fromEntries((rides   ?? []).map(r => [r.id, r]));

    // Build typed responses
    const responsesByReq: Record<string, DriverResponse[]> = {};
    for (const r of (rawResponses ?? [])) {
      const ride = r.ride_id ? rideMap[r.ride_id] : null;
      const dr: DriverResponse = {
        id:          r.id,
        driver_id:   r.driver_id,
        ride_id:     r.ride_id,
        status:      r.status,
        message:     r.message,
        created_at:  r.created_at,
        driver_name: driverMap[r.driver_id] ?? 'Driver',
        ride_from:   ride?.from_city   ?? null,
        ride_to:     ride?.to_city     ?? null,
        ride_date:   ride?.departure_date ?? null,
        ride_time:   ride?.departure_time ?? null,
        ride_price:  ride?.price       ?? null,
      };
      if (!responsesByReq[r.request_id]) responsesByReq[r.request_id] = [];
      responsesByReq[r.request_id].push(dr);
    }

    const result: RideRequest[] = reqs.map(req => ({
      ...req,
      responses: responsesByReq[req.id] ?? [],
    }));

    setRequests(result);
  }, [user]);

  useEffect(() => {
    (async () => { setLoading(true); await fetch(); setLoading(false); })();
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetch(); setRefreshing(false);
  }, [fetch]);

  // Live updates when a driver responds
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('passenger-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_responses' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetch]);

  const totalPending = requests.reduce((n, r) => n + r.responses.filter(res => res.status === 'pending').length, 0);

  if (loading) return <ActivityIndicator color={C} size="large" style={{ marginTop: 60 }} />;

  return (
    <FlatList
      data={requests}
      keyExtractor={r => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />}
      ListHeaderComponent={
        <View style={s.header}>
          <View style={s.titleRow}>
            <Text style={s.title}>My Ride Requests</Text>
            {totalPending > 0 && (
              <View style={s.pendingBadge}>
                <Text style={s.pendingBadgeTxt}>{totalPending} new proposal{totalPending > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
          <Text style={s.subtitle}>Drivers respond to your requests directly here.</Text>
          <Pressable style={s.newBtn} onPress={onCreateNew}>
            <Text style={s.newBtnTxt}>+ New Request</Text>
          </Pressable>
        </View>
      }
      contentContainerStyle={s.list}
      renderItem={({ item }) => (
        <RequestCard
          req={item}
          onUpdate={fetch}
          onRemove={() => setRequests(prev => prev.filter(r => r.id !== item.id))}
        />
      )}
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🗺️</Text>
          <Text style={s.emptyTitle}>No requests yet</Text>
          <Text style={s.emptyBody}>Create a ride request and nearby drivers will propose their trips.</Text>
          <Pressable style={s.newBtn} onPress={onCreateNew}>
            <Text style={s.newBtnTxt}>+ Create your first request</Text>
          </Pressable>
        </View>
      }
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  list:   { padding: 16, gap: 14, paddingBottom: 40 },
  header: { gap: 8, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title:    { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B' },
  pendingBadge:    { backgroundColor: G, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  pendingBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  newBtn:    { backgroundColor: C, borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  newBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'transparent',
  },
  cardHighlight: { borderColor: C + '60' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 10 },
  route:    { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  meta:     { fontSize: 12, color: '#64748B', marginTop: 3 },
  maxPrice: { fontSize: 12, color: '#D97706', fontWeight: '600', marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 11, color: '#94A3B8' },

  proposalBanner: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C + '12', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C + '30',
  },
  proposalBannerTxt: { fontSize: 13, color: C, fontWeight: '700', textAlign: 'center' },

  proposalsSection: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 14, gap: 10 },
  proposalsLabel: { fontSize: 13, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 },

  noProposals: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  noProposalsTxt: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  noteBox: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  noteTxt: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },

  cancelBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#FEE2E2' },
  cancelTxt: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  confirmRow:  { gap: 8 },
  confirmTxt:  { fontSize: 13, color: '#475569', fontWeight: '600', textAlign: 'center' },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  confirmNo:   { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#F1F5F9' },
  confirmNoTxt:  { color: '#64748B', fontSize: 13, fontWeight: '700' },
  confirmYes:    { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#EF4444' },
  confirmYesTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  emptyBody:  { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});

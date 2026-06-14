import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { useLang } from '@/context/language';
import { supabase } from '@/lib/supabase';
import { calcMatchScore, scoreColor, scoreLabel, RideData } from '@/lib/matching';

const C = '#10B981';

type MyRide = RideData & { id: string; status: string; seats: number; booked_seats: number };

type PassengerRequest = {
  id: string;
  passenger_id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  seats_needed: number;
  max_price: number | null;
  message: string | null;
  created_at: string;
  profiles: { name: string } | null;
  driver_responses: { driver_id: string }[];
  // computed client-side:
  matchScore: number;
  bestRide: MyRide | null;
};

function formatDate(d: string, locale = 'fr-MA') {
  return new Date(d).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <View style={[sb.wrap, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[sb.pct, { color }]}>{score}%</Text>
      <Text style={[sb.label, { color }]}>{scoreLabel(score)}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrap:  { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', gap: 1 },
  pct:   { fontSize: 18, fontWeight: '900' },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});

// ─── Propose Modal ──────────────────────────────────────────────────────────

function ProposeModal({ request, myRides, onClose, onProposed }: {
  request: PassengerRequest | null;
  myRides: MyRide[];
  onClose: () => void;
  onProposed: () => void;
}) {
  const t = useLang();
  const [selectedRide, setSelectedRide] = useState<MyRide | null>(null);
  const [message,      setMessage]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (request?.bestRide) setSelectedRide(request.bestRide);
    setMessage('');
  }, [request?.id]);

  if (!request) return null;

  const propose = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('driver_responses').upsert({
      request_id: request.id,
      driver_id:  user.id,
      ride_id:    selectedRide?.id ?? null,
      message:    message.trim() || null,
      status:     'pending',
    }, { onConflict: 'request_id,driver_id' });

    if (!error) {
      // Notify passenger
      await supabase.from('notifications').insert({
        user_id: request.passenger_id,
        type:    'driver_proposed',
        title:   'A driver responded to your request!',
        body:    `${user.name} proposed a ride for ${request.from_city} → ${request.to_city}.`,
      });
    }

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onProposed();
    onClose();
  };

  const eligibleRides = myRides.filter(r =>
    ['scheduled', 'active'].includes(r.status) && r.available_seats >= request.seats_needed
  );

  return (
    <Modal visible={!!request} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.overlay} onPress={onClose} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <View style={pm.header}>
          <View style={{ flex: 1 }}>
            <Text style={pm.title}>{t('Propose a Ride', 'Proposer un trajet')}</Text>
            <Text style={pm.sub}>{request.from_city} → {request.to_city}</Text>
          </View>
          <Pressable style={pm.closeBtn} onPress={onClose}>
            <Text style={pm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={pm.content} showsVerticalScrollIndicator={false}>
          {/* Passenger request info */}
          <View style={pm.reqBox}>
            <Text style={pm.reqLabel}>{t('Passenger needs:', 'Le passager a besoin de :')}</Text>
            <Text style={pm.reqInfo}>
              {request.seats_needed} {t(request.seats_needed>1?'seats':'seat', request.seats_needed>1?'places':'place')} · {formatDate(request.departure_date, t('en-GB', 'fr-MA'))} {t('around', 'vers')} {request.departure_time.slice(0,5)}
            </Text>
            {request.max_price && (
              <Text style={pm.reqInfo}>{t('Max price:', 'Prix max :')} {request.max_price} {t('MAD/seat', 'MAD/place')}</Text>
            )}
            {request.message && (
              <Text style={pm.reqMessage}>"{request.message}"</Text>
            )}
          </View>

          {/* Select ride */}
          <Text style={pm.sectionLabel}>{t('Select which of your rides to propose:', 'Sélectionnez le trajet à proposer :')}</Text>
          {eligibleRides.length === 0 ? (
            <View style={pm.noRidesBox}>
              <Text style={pm.noRidesTxt}>
                {t('You have no scheduled rides with enough seats for this request. Create a trip first.', 'Vous n\'avez aucun trajet planifié avec suffisamment de places. Créez d\'abord un trajet.')}
              </Text>
            </View>
          ) : (
            eligibleRides.map(ride => {
              const score   = calcMatchScore(request, ride);
              const color   = scoreColor(score);
              const isSelected = selectedRide?.id === ride.id;
              return (
                <Pressable
                  key={ride.id}
                  style={[pm.rideCard, isSelected && pm.rideCardSelected]}
                  onPress={() => setSelectedRide(ride)}>
                  <View style={{ flex: 1 }}>
                    <Text style={pm.rideRoute}>{ride.from_city} → {ride.to_city}</Text>
                    <Text style={pm.rideMeta}>
                      {formatDate(ride.departure_date, t('en-GB', 'fr-MA'))} · {ride.departure_time.slice(0,5)} · {ride.price_per_seat} {t('MAD/seat', 'MAD/place')}
                    </Text>
                    <Text style={pm.rideSeats}>{ride.available_seats} {t('seats available', 'places disponibles')}</Text>
                  </View>
                  <View>
                    <Text style={[pm.rideScore, { color }]}>{score}%</Text>
                    {isSelected && <Text style={pm.selectedMark}>✓</Text>}
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Message */}
          <Text style={pm.sectionLabel}>{t('Add a message (optional):', 'Ajouter un message (optionnel) :')}</Text>
          <TextInput
            style={pm.msgInput}
            placeholder={t('e.g. I pass through your area, happy to pick you up!', 'Ex. Je passe près de chez vous, je peux vous prendre en chemin !')}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />

          <Pressable
            style={[pm.proposeBtn, (saving || eligibleRides.length === 0 || !selectedRide) && { opacity: 0.4 }]}
            onPress={propose}
            disabled={saving || eligibleRides.length === 0 || !selectedRide}>
            <Text style={pm.proposeTxt}>{saving ? t('Sending…', 'Envoi…') : t('🚗 Send Proposal', '🚗 Envoyer la proposition')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function DriverPassengerRequests() {
  const { user } = useAuth();
  const t = useLang();
  const [requests,   setRequests]   = useState<PassengerRequest[]>([]);
  const [myRides,    setMyRides]    = useState<MyRide[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [proposing,  setProposing]  = useState<PassengerRequest | null>(null);
  const [minScore,   setMinScore]   = useState(0);

  const fetchMyRides = useCallback(async () => {
    if (!user) return [];
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('rides')
      .select('id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats, status')
      .eq('driver_id', user.id)
      .in('status', ['scheduled', 'active'])
      .gte('departure_date', today)
      .order('departure_date');

    // Map DB column names to the shape expected by RideData / matching lib
    return (data ?? []).map((r: any) => ({
      ...r,
      price_per_seat:  r.price,
      available_seats: (r.seats ?? 0) - (r.booked_seats ?? 0),
    })) as MyRide[];
  }, [user]);

  const fetchRequests = useCallback(async (rides: MyRide[]) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('ride_requests')
      .select(`
        *,
        profiles!passenger_id ( name ),
        driver_responses ( driver_id )
      `)
      .eq('status', 'open')
      .gte('departure_date', today)
      .order('created_at', { ascending: false });

    const raw = (data ?? []) as any[];

    // Calculate match scores client-side
    const scored: PassengerRequest[] = raw.map(req => {
      let best = 0;
      let bestRide: MyRide | null = null;
      for (const ride of rides) {
        const score = calcMatchScore(req, ride);
        if (score > best) { best = score; bestRide = ride; }
      }
      return { ...req, matchScore: best, bestRide };
    });

    // Sort: already-responded last, then by score desc
    const alreadyResponded = (r: PassengerRequest) =>
      r.driver_responses.some(dr => dr.driver_id === user.id);

    scored.sort((a, b) => {
      const aRes = alreadyResponded(a) ? 1 : 0;
      const bRes = alreadyResponded(b) ? 1 : 0;
      if (aRes !== bRes) return aRes - bRes;
      return b.matchScore - a.matchScore;
    });

    setRequests(scored);
  }, [user]);

  const loadAll = useCallback(async () => {
    const rides = await fetchMyRides();
    setMyRides(rides);
    await fetchRequests(rides);
  }, [fetchMyRides, fetchRequests]);

  useEffect(() => {
    (async () => { setLoading(true); await loadAll(); setLoading(false); })();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadAll(); setRefreshing(false);
  }, [loadAll]);

  // Realtime: new requests appear live
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('driver-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadAll]);

  const filtered = requests.filter(r => r.matchScore >= minScore);
  const alreadyResponded = (r: PassengerRequest) =>
    r.driver_responses.some(dr => dr.driver_id === user?.id);

  if (loading) return <ActivityIndicator color={C} size="large" style={{ marginTop: 60 }} />;

  return (
    <>
      <ProposeModal
        request={proposing}
        myRides={myRides}
        onClose={() => setProposing(null)}
        onProposed={loadAll}
      />

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>{t('Passenger Requests', 'Demandes de passagers')}</Text>
            <Text style={s.subtitle}>
              {requests.length} {t(requests.length !== 1 ? 'open requests matching your routes' : 'open request matching your routes', requests.length !== 1 ? 'demandes ouvertes correspondant à vos trajets' : 'demande ouverte correspondant à vos trajets')}
            </Text>
            {/* Score filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.filterRow}>
                {[
                  { label: t('All', 'Tous'), val: 0 },
                  { label: '50%+', val: 50 },
                  { label: '70%+', val: 70 },
                  { label: '85%+', val: 85 },
                ].map(f => (
                  <Pressable
                    key={f.val}
                    style={[s.chip, minScore === f.val && s.chipActive]}
                    onPress={() => setMinScore(f.val)}>
                    <Text style={[s.chipTxt, minScore === f.val && s.chipTxtActive]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        }
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const responded = alreadyResponded(item);
          const name = item.profiles?.name ?? t('Passenger', 'Passager');
          return (
            <View style={[s.card, responded && s.cardResponded]}>
              <View style={s.cardTop}>
                <View style={[s.avatar, { backgroundColor: '#3B82F6' }]}>
                  <Text style={s.avatarTxt}>{(name[0]??'P').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.route}>{item.from_city} → {item.to_city}</Text>
                  <Text style={s.meta}>
                    {formatDate(item.departure_date, t('en-GB', 'fr-MA'))} · {item.departure_time.slice(0,5)} · {item.seats_needed} {t(item.seats_needed>1?'seats':'seat', item.seats_needed>1?'places':'place')}
                  </Text>
                  {item.max_price && <Text style={s.maxPrice}>{t('Max', 'Max')} {item.max_price} {t('MAD/seat', 'MAD/place')}</Text>}
                  {item.message && <Text style={s.msg} numberOfLines={2}>"{item.message}"</Text>}
                </View>
                <ScoreBadge score={item.matchScore} />
              </View>

              {item.bestRide && (
                <View style={s.matchRide}>
                  <Text style={s.matchRideLabel}>{t('Best matching ride:', 'Meilleur trajet correspondant :')}</Text>
                  <Text style={s.matchRideTxt}>
                    {item.bestRide.from_city} → {item.bestRide.to_city} · {formatDate(item.bestRide.departure_date, t('en-GB', 'fr-MA'))} · {item.bestRide.price_per_seat} MAD
                  </Text>
                </View>
              )}

              {responded ? (
                <View style={s.proposedBanner}>
                  <Text style={s.proposedTxt}>✓ {t('You already proposed — waiting for passenger response', 'Vous avez déjà proposé — en attente de réponse du passager')}</Text>
                </View>
              ) : (
                <Pressable style={s.proposeBtn} onPress={() => setProposing(item)}>
                  <Text style={s.proposeBtnTxt}>{t('🚗 Propose a Ride', '🚗 Proposer un trajet')}</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🔍</Text>
            <Text style={s.emptyTitle}>
              {requests.length === 0
                ? t('No requests nearby', 'Aucune demande à proximité')
                : t('No requests at this score filter', 'Aucune demande à ce niveau de correspondance')}
            </Text>
            <Text style={s.emptyBody}>
              {requests.length === 0
                ? t('Create scheduled trips and passengers will find you when they post matching requests.', 'Créez des trajets planifiés et les passagers vous trouveront lorsqu\'ils publient des demandes correspondantes.')
                : t('Try lowering the match score filter to see more requests.', 'Essayez de réduire le filtre de correspondance pour voir plus de demandes.')}
            </Text>
          </View>
        }
      />
    </>
  );
}

const pm = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title:  { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  sub:    { fontSize: 13, color: '#64748B', marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  content: { padding: 16, gap: 14, paddingBottom: 8 },

  reqBox: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  reqLabel:   { fontSize: 12, fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase' },
  reqInfo:    { fontSize: 14, color: '#1E293B', fontWeight: '600' },
  reqMessage: { fontSize: 13, color: '#475569', fontStyle: 'italic' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },

  noRidesBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  noRidesTxt: { fontSize: 13, color: '#92400E', lineHeight: 18 },

  rideCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: 'transparent',
  },
  rideCardSelected: { borderColor: C, backgroundColor: '#F0FDF4' },
  rideRoute:  { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  rideMeta:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  rideSeats:  { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  rideScore:  { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  selectedMark: { fontSize: 14, color: C, textAlign: 'center', fontWeight: '800' },

  msgInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
    minHeight: 80, textAlignVertical: 'top',
  },
  proposeBtn: { backgroundColor: C, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  proposeTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const s = StyleSheet.create({
  list:   { padding: 16, gap: 12, paddingBottom: 32 },
  header: { gap: 8, marginBottom: 8 },
  title:    { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#64748B' },
  filterRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  chipActive: { backgroundColor: C },
  chipTxt:    { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTxtActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardResponded: { opacity: 0.75 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 18, fontWeight: '800' },
  route:    { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  meta:     { fontSize: 12, color: '#64748B', marginTop: 2 },
  maxPrice: { fontSize: 12, color: '#D97706', fontWeight: '600', marginTop: 2 },
  msg:      { fontSize: 12, color: '#94A3B8', marginTop: 4, fontStyle: 'italic' },

  matchRide: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, gap: 2,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  matchRideLabel: { fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' },
  matchRideTxt:   { fontSize: 13, color: '#1E293B', fontWeight: '600' },

  proposedBanner: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, alignItems: 'center' },
  proposedTxt:    { fontSize: 13, color: '#10B981', fontWeight: '600' },
  proposeBtn:     { backgroundColor: C, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  proposeBtnTxt:  { color: '#fff', fontSize: 14, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  emptyBody:  { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
});

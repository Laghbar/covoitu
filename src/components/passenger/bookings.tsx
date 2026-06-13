import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { RateModal } from './rate-modal';

const C = '#3B82F6';

type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

type Booking = {
  id: string;
  seats_requested: number;
  status: BookingStatus;
  created_at: string;
  message: string | null;
  ride_completed: boolean;
  passenger_dismissed: boolean;
  ride: {
    id: string;
    from_city: string; to_city: string;
    departure_date: string; departure_time: string;
    price: number;
    status: string;
    driver_id: string;
    driver: { name: string } | null;
  } | null;
};

type RateTarget = { rideId: string; driverId: string; driverName: string; route: string };

type Tab = 'pending' | 'confirmed' | 'history';

const STATUS_CFG: Record<BookingStatus, { label: string; emoji: string; bg: string; color: string }> = {
  pending:   { label: 'En attente', emoji: '⏳', bg: '#FFFBEB', color: '#D97706' },
  accepted:  { label: 'Confirmé',   emoji: '✅', bg: '#F0FDF4', color: '#10B981' },
  rejected:  { label: 'Refusé',     emoji: '❌', bg: '#FEF2F2', color: '#EF4444' },
  cancelled: { label: 'Annulé',     emoji: '🚫', bg: '#F8FAFC', color: '#94A3B8' },
};

function getStatusDisplay(booking: Booking) {
  if (booking.status === 'accepted' && booking.ride_completed) {
    return { label: 'Terminé', emoji: '🎉', bg: '#EFF6FF', color: '#3B82F6' };
  }
  return STATUS_CFG[booking.status];
}

function NotifBanner({ message, color, onDone }: { message: string; color: string; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[styles.banner, { backgroundColor: color, opacity }]}>
      <Text style={styles.bannerTxt}>{message}</Text>
    </Animated.View>
  );
}

function BookingCard({
  booking, reviewedRideIds, onCancel, onRate, onDismiss,
}: {
  booking: Booking;
  reviewedRideIds: Set<string>;
  onCancel: (id: string) => void;
  onRate: (t: RateTarget) => void;
  onDismiss: (id: string) => void;
}) {
  const cfg           = getStatusDisplay(booking);
  const rideCompleted = booking.ride_completed === true;
  const driverName    = booking.ride?.driver?.name ?? 'Driver';
  const initial       = driverName[0]?.toUpperCase() ?? 'D';
  const total         = (booking.ride?.price ?? 0) * booking.seats_requested;
  const canCancel     = (booking.status === 'pending' || booking.status === 'accepted') && !rideCompleted;
  const rideId        = booking.ride?.id ?? '';
  const canRate       = booking.status === 'accepted' && rideCompleted && !reviewedRideIds.has(rideId);
  const alreadyRated  = booking.status === 'accepted' && rideCompleted && reviewedRideIds.has(rideId);

  const doCancel = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Annuler cette réservation ?')) onCancel(booking.id);
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Annuler la réservation', 'Êtes-vous sûr ?', [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui, annuler', style: 'destructive', onPress: () => onCancel(booking.id) },
      ]);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.route}>
            {booking.ride?.from_city ?? '—'} → {booking.ride?.to_city ?? '—'}
          </Text>
          <Text style={styles.dateLine}>
            📅 {booking.ride?.departure_date ?? ''} · 🕐 {booking.ride?.departure_time ?? ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusTxt, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.driverRow}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverInitial}>{initial}</Text>
        </View>
        <Text style={styles.driverName}>{driverName}</Text>
      </View>

      {booking.message ? (
        <View style={styles.msgBubble}>
          <Text style={styles.msgLabel}>Votre message au conducteur :</Text>
          <Text style={styles.msgText}>"{booking.message}"</Text>
        </View>
      ) : null}

      {booking.status === 'accepted' && !rideCompleted && (
        <View style={styles.acceptedBanner}>
          <Text style={styles.acceptedTxt}>✅ Le conducteur a accepté votre réservation</Text>
        </View>
      )}
      {rideCompleted && (
        <View style={[styles.acceptedBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Text style={[styles.acceptedTxt, { color: '#3B82F6' }]}>🎉 Trajet terminé — merci d'avoir voyagé !</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.seatsLbl}>{booking.seats_requested} place{booking.seats_requested > 1 ? 's' : ''}</Text>
          <Text style={[styles.price, { color: C }]}>{total} MAD</Text>
        </View>
        {alreadyRated && <Text style={styles.ratedBadge}>⭐ Évalué</Text>}
      </View>

      {canRate && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={[styles.rateBtn, { flex: 1 }]}
            onPress={() => onRate({
              rideId,
              driverId:   booking.ride!.driver_id,
              driverName,
              route: `${booking.ride?.from_city} → ${booking.ride?.to_city}`,
            })}>
            <Text style={styles.rateTxt}>⭐ Évaluer le trajet</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={() => onDismiss(booking.id)}>
            <Text style={styles.skipTxt}>Ignorer</Text>
          </Pressable>
        </View>
      )}

      {canCancel && (
        <Pressable style={styles.cancelBtn} onPress={doCancel}>
          <Text style={styles.cancelTxt}>🚫  Annuler la réservation</Text>
        </Pressable>
      )}
    </View>
  );
}

type Props = { onNavigate: (key: string, payload?: any) => void };
type Notif = { message: string; color: string; key: number };

export function PassengerBookings({ onNavigate }: Props) {
  const { user } = useAuth();
  const [bookings,        setBookings]        = useState<Booking[]>([]);
  const [reviewedRideIds, setReviewedRideIds] = useState<Set<string>>(new Set());
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState<Tab>('pending');
  const [notif,           setNotif]           = useState<Notif | null>(null);
  const [rateTarget,      setRateTarget]      = useState<RateTarget | null>(null);
  const selfCancelledIds  = useRef<Set<string>>(new Set());

  // Clear bell badge when passenger opens this tab
  useEffect(() => {
    if (!user) return;
    supabase
      .from('bookings')
      .update({ passenger_seen: true })
      .eq('passenger_id', user.id)
      .eq('status', 'accepted')
      .eq('passenger_seen', false);
  }, [user]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [bookingsRes, reviewsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select(`
          id, seats_requested, status, created_at, message, ride_completed, passenger_dismissed,
          ride:ride_id(
            id, from_city, to_city, departure_date, departure_time,
            price, status, driver_id,
            driver:driver_id(name)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select('ride_id')
        .eq('passenger_id', user.id),
    ]);

    setBookings((bookingsRes.data ?? []) as unknown as Booking[]);
    setReviewedRideIds(new Set((reviewsRes.data ?? []).map(r => r.ride_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Realtime: keep booking cards in sync with DB state (tab switches, status updates)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`bookings:passenger:${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.new?.passenger_id !== user.id) return;
        const bookingId   = payload.new.id as string;
        const newStatus   = payload.new.status as BookingStatus;
        const rideCompleted = payload.new.ride_completed === true;

        // Keep local card state in sync
        setBookings(prev =>
          prev.map(b => b.id === bookingId ? { ...b, status: newStatus, ride_completed: rideCompleted } : b),
        );

        // Switch tabs to reflect new state (toast is handled by dashboard via notifications table)
        if (newStatus === 'accepted' && payload.old?.status === 'pending') {
          setTab('confirmed');
        } else if (newStatus === 'rejected') {
          setTab('history');
        } else if (newStatus === 'cancelled' && !selfCancelledIds.current.has(bookingId)) {
          setTab('history');
        }
        selfCancelledIds.current.delete(bookingId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);


  const dismissBooking = async (id: string) => {
    await supabase
      .from('bookings')
      .update({ passenger_dismissed: true })
      .eq('id', id)
      .eq('passenger_id', user!.id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, passenger_dismissed: true } : b));
  };

  const cancelBooking = async (id: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_by: 'passenger' })
      .eq('id', id)
      .eq('passenger_id', user!.id)
      .select('id');

    if (error || !data?.length) {
      setNotif({ message: '❌ Impossible d\'annuler la réservation. Veuillez réessayer.', color: '#EF4444', key: Date.now() });
      return;
    }

    selfCancelledIds.current.add(id);
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  const handleReviewSubmitted = () => {
    if (rateTarget) {
      setReviewedRideIds(prev => new Set([...prev, rateTarget.rideId]));
      const booking = bookings.find(b => b.ride?.id === rateTarget.rideId);
      if (booking) dismissBooking(booking.id);
    }
    setRateTarget(null);
  };

  const isDone = (b: Booking) =>
    b.ride_completed && (b.passenger_dismissed || reviewedRideIds.has(b.ride?.id ?? ''));

  const pendingList   = bookings.filter(b => b.status === 'pending');
  const confirmedList = bookings.filter(b => b.status === 'accepted' && !isDone(b));
  const historyList   = bookings.filter(b =>
    b.status === 'rejected' || b.status === 'cancelled' ||
    (b.status === 'accepted' && isDone(b)),
  );
  const shown = tab === 'pending' ? pendingList : tab === 'confirmed' ? confirmedList : historyList;

  return (
    <View style={{ flex: 1 }}>
      {rateTarget && (
        <RateModal
          visible
          rideId={rateTarget.rideId}
          driverId={rateTarget.driverId}
          driverName={rateTarget.driverName}
          route={rateTarget.route}
          onClose={() => setRateTarget(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {notif && (
        <NotifBanner key={notif.key} message={notif.message} color={notif.color} onDone={() => setNotif(null)} />
      )}

      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.pageTitle}>Vos trajets</Text>

        <View style={styles.tabs}>
          <Pressable style={[styles.tabChip, tab === 'pending'   && { backgroundColor: '#D97706' }]} onPress={() => setTab('pending')}>
            <Text style={[styles.tabTxt, tab === 'pending'   && { color: '#fff' }]}>
              ⏳ En attente{pendingList.length > 0 ? ` (${pendingList.length})` : ''}
            </Text>
          </Pressable>
          <Pressable style={[styles.tabChip, tab === 'confirmed' && { backgroundColor: '#10B981' }]} onPress={() => setTab('confirmed')}>
            <Text style={[styles.tabTxt, tab === 'confirmed' && { color: '#fff' }]}>
              ✅ Confirmés{confirmedList.length > 0 ? ` (${confirmedList.length})` : ''}
            </Text>
          </Pressable>
          <Pressable style={[styles.tabChip, tab === 'history'   && { backgroundColor: '#64748B' }]} onPress={() => setTab('history')}>
            <Text style={[styles.tabTxt, tab === 'history'   && { color: '#fff' }]}>Historique</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.empty}><Text style={styles.emptyTxt}>Chargement…</Text></View>
        ) : shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>
              {tab === 'pending' ? '⏳' : tab === 'confirmed' ? '🎫' : '📋'}
            </Text>
            <Text style={styles.emptyTxt}>
              {tab === 'pending'   ? 'Aucune demande en attente'  :
               tab === 'confirmed' ? 'Aucun trajet confirmé'      : 'Aucun historique'}
            </Text>
            {tab === 'pending' && (
              <Pressable style={[styles.emptyBtn, { backgroundColor: C }]} onPress={() => onNavigate('search')}>
                <Text style={styles.emptyBtnTxt}>Trouver un trajet</Text>
              </Pressable>
            )}
          </View>
        ) : (
          shown.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              reviewedRideIds={reviewedRideIds}
              onCancel={cancelBooking}
              onRate={setRateTarget}
              onDismiss={dismissBooking}
            />
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  banner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  bannerTxt: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabTxt:  { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  route:    { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  dateLine: { fontSize: 13, color: '#64748B', marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTxt:  { fontSize: 12, fontWeight: '700' },
  divider:    { height: 1, backgroundColor: '#F1F5F9' },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C + '15', alignItems: 'center', justifyContent: 'center',
  },
  driverInitial: { fontSize: 15, fontWeight: '800', color: C },
  driverName:    { fontSize: 14, fontWeight: '600', color: '#1E293B' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seatsLbl:   { fontSize: 11, color: '#94A3B8' },
  price:      { fontSize: 18, fontWeight: '800' },

  rateBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D',
  },
  rateTxt: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  ratedBadge: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  skipBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  skipTxt: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },

  msgBubble: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 10,
    borderLeftWidth: 3, borderLeftColor: C,
    gap: 2,
  },
  msgLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  msgText:  { fontSize: 13, color: '#1E293B', fontStyle: 'italic' },

  acceptedBanner: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#BBF7D0', alignItems: 'center',
  },
  acceptedTxt: { fontSize: 13, fontWeight: '700', color: '#10B981' },

  cancelBtn: {
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

  empty:      { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyTxt:   { fontSize: 16, color: '#94A3B8', fontWeight: '500' },
  emptyBtn:   { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnTxt:{ color: '#fff', fontSize: 14, fontWeight: '700' },
});

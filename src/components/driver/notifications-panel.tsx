import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useLang } from '@/context/language';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type Booking = {
  id: string;
  seats_requested: number;
  message?: string | null;
  created_at: string;
  ride: { id: string; from_city: string; to_city: string; departure_date: string; departure_time: string } | null;
  passenger: { id: string; name: string; avg_rating: number | null; total_trips: number } | null;
};

function PassengerProfileModal({ passenger, onClose }: {
  passenger: Booking['passenger'];
  onClose: () => void;
}) {
  const t = useLang();
  if (!passenger) return null;
  const initial = (passenger.name?.[0] ?? '?').toUpperCase();
  const rating  = passenger.avg_rating;
  const trips   = passenger.total_trips ?? 0;

  const stars = (r: number) => {
    const full  = Math.floor(r);
    const half  = r - full >= 0.5;
    let s = '★'.repeat(full);
    if (half) s += '½';
    return s || '☆';
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pm2.overlay} onPress={onClose} />
      <View style={pm2.card}>
        <View style={pm2.handle} />

        {/* Avatar */}
        <View style={pm2.avatarWrap}>
          <View style={pm2.avatar}>
            <Text style={pm2.avatarTxt}>{initial}</Text>
          </View>
        </View>

        <Text style={pm2.name}>{passenger.name}</Text>
        <Text style={pm2.role}>{t('Passenger', 'Passager')}</Text>

        {/* Stats */}
        <View style={pm2.statsRow}>
          <View style={pm2.stat}>
            <Text style={pm2.statVal}>{trips}</Text>
            <Text style={pm2.statLabel}>{t('Trips', 'Trajets')}</Text>
          </View>
          <View style={pm2.divider} />
          <View style={pm2.stat}>
            {rating != null ? (
              <>
                <Text style={pm2.statVal}>{rating.toFixed(1)}</Text>
                <Text style={[pm2.statLabel, { color: '#F59E0B' }]}>{stars(rating)}</Text>
              </>
            ) : (
              <>
                <Text style={pm2.statVal}>—</Text>
                <Text style={pm2.statLabel}>{t('New', 'Nouveau')}</Text>
              </>
            )}
          </View>
        </View>

        <Pressable style={pm2.closeBtn} onPress={onClose}>
          <Text style={pm2.closeTxt}>{t('Close', 'Fermer')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const pm2 = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: 'center', gap: 8,
  },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 12 },
  avatarWrap:{ marginBottom: 4 },
  avatar:    { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#BFDBFE' },
  avatarTxt: { fontSize: 34, fontWeight: '900', color: '#3B82F6' },
  name:      { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  role:      { fontSize: 13, color: '#94A3B8', fontWeight: '600', marginBottom: 16 },
  statsRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, gap: 24, marginBottom: 8 },
  stat:      { alignItems: 'center', gap: 2, minWidth: 70 },
  statVal:   { fontSize: 26, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  divider:   { width: 1, height: 40, backgroundColor: '#E2E8F0' },
  closeBtn:  { backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 13, marginTop: 8 },
  closeTxt:  { fontSize: 15, fontWeight: '800', color: '#475569' },
});

function confirm(msg: string, cb: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) cb();
  } else {
    const { Alert } = require('react-native');
    Alert.alert('Confirm', msg, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: cb },
    ]);
  }
}

function RequestCard({
  booking,
  onAccept,
  onReject,
  onViewProfile,
}: { booking: Booking; onAccept: (b: Booking) => void; onReject: (id: string) => void; onViewProfile: (p: Booking['passenger']) => void }) {
  const t = useLang();
  const fade    = useRef(new Animated.Value(1)).current;
  const initial = (booking.passenger?.name?.[0] ?? '?').toUpperCase();
  const rating  = booking.passenger?.avg_rating;

  const animateThen = (cb: () => void) =>
    Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(cb);

  return (
    <Animated.View style={[styles.card, { opacity: fade }]}>
      <Pressable style={styles.passengerRow} onPress={() => onViewProfile(booking.passenger)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.passengerName}>{booking.passenger?.name ?? 'Passenger'}</Text>
          <Text style={styles.seatsTxt}>
            {booking.seats_requested} {booking.seats_requested > 1 ? t('seats', 'places') : t('seat', 'place')} · {
              rating != null ? `⭐ ${rating.toFixed(1)}` : t('New passenger', 'Nouveau passager')
            }
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={styles.dateTxt}>
            {new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </Text>
          <Text style={styles.viewProfileHint}>{t('View profile →', 'Voir profil →')}</Text>
        </View>
      </Pressable>

      {booking.ride && (
        <View style={styles.tripBox}>
          <Text style={styles.tripRoute}>
            📍 {booking.ride.from_city} → {booking.ride.to_city}
          </Text>
          <Text style={styles.tripMeta}>
            📅 {booking.ride.departure_date} · 🕐 {booking.ride.departure_time}
          </Text>
        </View>
      )}

      {booking.message ? (
        <View style={styles.msgBubble}>
          <Text style={styles.msgText}>"{booking.message}"</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
          onPress={() => confirm(t('Decline this request?', 'Refuser cette demande ?'), () => animateThen(() => onReject(booking.id)))}>
          <Text style={[styles.btnTxt, { color: '#EF4444' }]}>✕  {t('Decline', 'Refuser')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: C, borderColor: C }]}
          onPress={() => confirm(t('Accept this passenger?', 'Accepter ce passager ?'), () => animateThen(() => onAccept(booking)))}>
          <Text style={[styles.btnTxt, { color: '#fff' }]}>✓  {t('Accept', 'Accepter')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onCountChange: (n: number) => void;
};

export function NotificationsPanel({ visible, onClose, onCountChange }: Props) {
  const { user } = useAuth();
  const t = useLang();
  const insets   = useSafeAreaInsets();
  const [bookings,       setBookings]       = useState<Booking[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [actionError,    setActionError]    = useState<string | null>(null);
  const [viewPassenger,  setViewPassenger]  = useState<Booking['passenger'] | null>(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rides } = await supabase.from('rides').select('id').eq('driver_id', user.id);
    const ids = rides?.map(r => r.id) ?? [];
    if (!ids.length) { setBookings([]); setLoading(false); return; }

    const { data } = await supabase
      .from('bookings')
      .select(`
        id, seats_requested, message, created_at,
        ride:ride_id(id, from_city, to_city, departure_date, departure_time),
        passenger:passenger_id(id, name, avg_rating, total_trips)
      `)
      .in('ride_id', ids)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setBookings((data ?? []) as unknown as Booking[]);
    setLoading(false);
  }, [user]);

  // Single source of truth: sync parent count whenever bookings list changes
  useEffect(() => { onCountChange(bookings.length); }, [bookings]);

  useEffect(() => { if (visible) fetch(); }, [visible, fetch]);

  // Realtime: refresh on new bookings, remove cancelled/accepted ones live
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('notifications-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, fetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
        const s = payload.new?.status;
        if (s === 'cancelled' || s === 'rejected' || s === 'accepted') {
          setBookings(prev => prev.filter(b => b.id !== payload.new.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetch]);

  const acceptBooking = async (booking: Booking) => {
    setActionError(null);
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'accepted', passenger_seen: false })
      .eq('id', booking.id);
    if (error) { setActionError('Accept failed: ' + error.message); return; }
    setBookings(prev => prev.filter(b => b.id !== booking.id));
  };

  const rejectBooking = async (id: string) => {
    setActionError(null);
    const { error } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id);
    if (error) { setActionError('Decline failed: ' + error.message); return; }
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <PassengerProfileModal
        passenger={viewPassenger}
        onClose={() => setViewPassenger(null)}
      />
      {/* Dark overlay */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Panel */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 12 }]}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.title}>{t('Requests', 'Demandes')}</Text>
            {bookings.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countTxt}>{bookings.length}</Text>
              </View>
            )}
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {actionError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTxt}>⚠️ {actionError}</Text>
            <Pressable onPress={() => setActionError(null)}><Text style={{ color: '#EF4444', fontWeight: '700' }}>✕</Text></Pressable>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTxt}>Loading…</Text>
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTxt}>{t('No pending requests', 'Aucune demande en attente')}</Text>
              <Text style={styles.emptySub}>{t('New booking requests will appear here.', 'Les nouvelles demandes apparaîtront ici.')}</Text>
            </View>
          ) : (
            bookings.map(b => (
              <RequestCard
                key={b.id}
                booking={b}
                onAccept={acceptBooking}
                onReject={rejectBooking}
                onViewProfile={setViewPassenger}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  countBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: C, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  countTxt: { color: '#fff', fontSize: 13, fontWeight: '900' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },

  errorBanner: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  errorTxt: { flex: 1, color: '#EF4444', fontSize: 13 },

  list: { padding: 16, gap: 12, paddingBottom: 8 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#F0FDF4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:     { fontSize: 17, fontWeight: '800', color: '#3B82F6' },
  passengerName:   { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  seatsTxt:        { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  dateTxt:         { fontSize: 11, color: '#CBD5E1' },
  viewProfileHint: { fontSize: 10, color: C, fontWeight: '700' },

  tripBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 3,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  tripRoute: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  tripMeta:  { fontSize: 12, color: '#64748B' },

  msgBubble: {
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: C,
  },
  msgText: { fontSize: 13, color: '#374151', fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  btnTxt: { fontSize: 13, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyTxt:  { fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  emptySub:  { fontSize: 13, color: '#CBD5E1', textAlign: 'center' },
});

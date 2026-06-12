import { useCallback, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type Status = 'pending' | 'accepted' | 'rejected';

type Booking = {
  id: string;
  seats_requested: number;
  status: Status;
  message?: string | null;
  created_at: string;
  ride: { id: string; from_city: string; to_city: string; departure_date: string; departure_time: string } | null;
  passenger: { name: string } | null;
};

function confirm(msg: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(msg)) onConfirm();
  } else {
    const { Alert } = require('react-native');
    Alert.alert('Confirm', msg, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: onConfirm },
    ]);
  }
}

function BookingCard({
  booking, onAccept, onReject,
}: { booking: Booking; onAccept: (b: Booking) => void; onReject: (id: string) => void }) {
  const initial = (booking.passenger?.name?.[0] ?? '?').toUpperCase();
  const fade    = new Animated.Value(1);

  const animateThen = (cb: () => void) => {
    Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }).start(cb);
  };

  return (
    <Animated.View style={[styles.card, { opacity: fade }]}>
      {/* Passenger */}
      <View style={styles.passengerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.passengerName}>{booking.passenger?.name ?? 'Passenger'}</Text>
          <Text style={styles.seatsRequested}>
            {booking.seats_requested} seat{booking.seats_requested > 1 ? 's' : ''} requested
          </Text>
        </View>
        <Text style={styles.timeAgo}>
          {new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </Text>
      </View>

      {/* Trip */}
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

      {/* Passenger message */}
      {booking.message ? (
        <View style={styles.msgBubble}>
          <Text style={styles.msgText}>"{booking.message}"</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
          onPress={() => confirm('Decline this request?', () => animateThen(() => onReject(booking.id)))}>
          <Text style={[styles.btnTxt, { color: '#EF4444' }]}>✕  Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: C, borderColor: C }]}
          onPress={() => confirm('Accept this passenger?', () => animateThen(() => onAccept(booking)))}>
          <Text style={[styles.btnTxt, { color: '#fff' }]}>✓  Accept</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

type Props = { onPendingChange?: (count: number) => void };

export function DriverInvitations({ onPendingChange }: Props) {
  const { user } = useAuth();
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [dbError,     setDbError]     = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: rides } = await supabase
      .from('rides').select('id').eq('driver_id', user.id);

    const rideIds = rides?.map(r => r.id) ?? [];

    if (rideIds.length === 0) {
      setBookings([]); setLoading(false); onPendingChange?.(0); return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id, seats_requested, status, message, created_at,
        ride:ride_id(id, from_city, to_city, departure_date, departure_time),
        passenger:passenger_id(name)
      `)
      .in('ride_id', rideIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) { setDbError(error.message); setLoading(false); return; }

    const list = (data ?? []) as unknown as Booking[];
    setBookings(list);
    setDbError(null);
    onPendingChange?.(list.length);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Realtime: new booking requests come in live
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('driver-invitations-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBookings]);

  const acceptBooking = async (booking: Booking) => {
    setActionError(null);
    const { error } = await supabase.from('bookings').update({ status: 'accepted' }).eq('id', booking.id);
    if (error) { setActionError('Accept failed: ' + error.message); return; }

    if (booking.ride?.id) {
      const { data: ride } = await supabase.from('rides').select('booked_seats').eq('id', booking.ride.id).single();
      await supabase.from('rides')
        .update({ booked_seats: (ride?.booked_seats ?? 0) + booking.seats_requested })
        .eq('id', booking.ride.id);
    }

    setBookings(prev => {
      const next = prev.filter(b => b.id !== booking.id);
      onPendingChange?.(next.length);
      return next;
    });
  };

  const rejectBooking = async (id: string) => {
    setActionError(null);
    const { error } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id);
    if (error) { setActionError('Decline failed: ' + error.message); return; }

    setBookings(prev => {
      const next = prev.filter(b => b.id !== id);
      onPendingChange?.(next.length);
      return next;
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Requests</Text>
        {bookings.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countTxt}>{bookings.length}</Text>
          </View>
        )}
      </View>
      <Text style={styles.pageSub}>Passengers waiting for your reply.</Text>

      {dbError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTxt}>⚠️ {dbError}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchBookings}>
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      )}

      {actionError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTxt}>⚠️ {actionError}</Text>
          <Pressable onPress={() => setActionError(null)} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: '#EF4444', fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>Loading…</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTxt}>No pending requests</Text>
          <Text style={styles.emptySub}>
            When passengers book your trips, their requests will appear here.
          </Text>
        </View>
      ) : (
        bookings.map(b => (
          <BookingCard key={b.id} booking={b} onAccept={acceptBooking} onReject={rejectBooking} />
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  countBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: C, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  countTxt: { color: '#fff', fontSize: 13, fontWeight: '900' },
  pageSub: { fontSize: 14, color: '#64748B', marginTop: -8 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F0FDF4',
  },

  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:      { fontSize: 18, fontWeight: '800', color: '#3B82F6' },
  passengerName:  { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  seatsRequested: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  timeAgo:        { fontSize: 11, color: '#CBD5E1' },

  tripBox: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, gap: 4,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  tripRoute: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  tripMeta:  { fontSize: 13, color: '#64748B' },

  msgBubble: {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: C,
  },
  msgText: { fontSize: 13, color: '#374151', fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  btnTxt: { fontSize: 14, fontWeight: '700' },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', gap: 10,
  },
  errorTxt: { color: '#EF4444', fontSize: 13, fontWeight: '500' },
  retryBtn: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  retryTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  empty:     { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTxt:  { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  emptySub:  { fontSize: 13, color: '#CBD5E1', textAlign: 'center', paddingHorizontal: 20 },
});

import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type Status = 'active' | 'completed' | 'cancelled';

type Ride = {
  id: string; from_city: string; to_city: string;
  departure_date: string; departure_time: string;
  seats: number; price: number; status: Status;
  booked_seats?: number;
};

const STATUS_META: Record<Status, { bg: string; color: string; label: string }> = {
  active:    { bg: '#F0FDF4', color: C,         label: 'Active' },
  completed: { bg: '#F8FAFC', color: '#64748B', label: 'Completed' },
  cancelled: { bg: '#FEF2F2', color: '#EF4444', label: 'Cancelled' },
};

function confirm(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('Confirm', message, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

function RideCard({
  ride, onComplete, onCancel, onDelete,
}: { ride: Ride; onComplete: (id: string) => void; onCancel: (id: string) => void; onDelete: (id: string) => void }) {
  const meta   = STATUS_META[ride.status];
  const booked = ride.booked_seats ?? 0;
  const pct    = ride.seats > 0 ? booked / ride.seats : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardRoute}>{ride.from_city} → {ride.to_city}</Text>
          <Text style={styles.cardMeta}>{ride.departure_date} · {ride.departure_time}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: pct >= 1 ? '#F59E0B' : C }]} />
      </View>
      <Text style={styles.progressLabel}>{booked}/{ride.seats} seats booked</Text>

      <View style={styles.cardFooter}>
        <Text style={[styles.revenue, { color: C }]}>{ride.price * booked} MAD earned</Text>

        <View style={styles.actions}>
          {ride.status === 'active' && (
            <>
              <Pressable
                style={styles.completeBtn}
                onPress={() => confirm('Mark this trip as completed?', () => onComplete(ride.id))}>
                <Text style={styles.completeBtnText}>✓ Complete</Text>
              </Pressable>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => confirm('Cancel this trip? Passengers will be notified.', () => onCancel(ride.id))}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </>
          )}

          {ride.status !== 'active' && (
            <Pressable
              onPress={() => confirm('Delete this ride from your history?', () => onDelete(ride.id))}>
              <SymbolView name={{ ios: 'trash', android: 'delete' } as any} size={18} tintColor="#EF4444" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = { onNavigate: (key: string) => void };

export function DriverRides({ onNavigate }: Props) {
  const { user } = useAuth();
  const [tab,      setTab]      = useState<Status>('active');
  const [rides,    setRides]    = useState<Ride[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  const fetchRides = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch rides + their bookings so we can calculate booked seats from source of truth
    const { data, error } = await supabase
      .from('rides')
      .select(`
        id, from_city, to_city, departure_date, departure_time,
        seats, price, status, created_at,
        bookings(seats_requested, status)
      `)
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });

    if (error) { setFetchErr(error.message); setLoading(false); return; }
    setFetchErr(null);

    const allRides: Ride[] = (data ?? []).map((r: any) => ({
      ...r,
      // Count only accepted bookings — cancelled/rejected don't occupy seats
      booked_seats: (r.bookings ?? [])
        .filter((b: any) => b.status === 'accepted')
        .reduce((sum: number, b: any) => sum + (b.seats_requested ?? 0), 0),
    }));

    setRides(allRides);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  // Re-fetch whenever any booking changes (accept / cancel / reject) so counts stay live
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('driver-rides-bookings-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, fetchRides)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchRides]);

  const completeRide = async (id: string) => {
    const { error } = await supabase.from('rides').update({ status: 'completed' }).eq('id', id);
    if (error) return;
    setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' as Status } : r));
  };

  const cancelRide = async (id: string) => {
    const { error: rideErr } = await supabase
      .from('rides').update({ status: 'cancelled' }).eq('id', id);
    if (rideErr) { setFetchErr('Could not cancel ride: ' + rideErr.message); return; }

    // Also cancel bookings from client side (DB trigger does this too, belt-and-suspenders)
    const { error: bookErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('ride_id', id)
      .in('status', ['pending', 'accepted']);
    if (bookErr) setFetchErr('Ride cancelled but bookings error: ' + bookErr.message);

    setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' as Status } : r));
  };

  const deleteRide = async (id: string) => {
    const { error } = await supabase.from('rides').delete().eq('id', id);
    if (error) return;
    setRides(prev => prev.filter(r => r.id !== id));
  };

  const filtered = rides.filter(r => r.status === tab);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>My Rides</Text>

      <View style={styles.tabs}>
        {(['active', 'completed', 'cancelled'] as Status[]).map((t) => (
          <Pressable key={t} style={[styles.tabChip, tab === t && { backgroundColor: C }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'active' && rides.filter(r => r.status === 'active').length > 0
                ? ` (${rides.filter(r => r.status === 'active').length})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {fetchErr && (
        <View style={[styles.empty, { backgroundColor: '#FEF2F2', borderRadius: 12, margin: 4 }]}>
          <Text style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>⚠️ {fetchErr}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Loading rides…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={52} tintColor="#CBD5E1" />
          <Text style={styles.emptyTitle}>No {tab} rides</Text>
          {tab === 'active' && (
            <Pressable style={[styles.emptyBtn, { backgroundColor: C }]} onPress={() => onNavigate('create')}>
              <Text style={styles.emptyBtnText}>Create a Trip</Text>
            </Pressable>
          )}
        </View>
      ) : (
        filtered.map(r => (
          <RideCard key={r.id} ride={r} onComplete={completeRide} onCancel={cancelRide} onDelete={deleteRide} />
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  tabs: { flexDirection: 'row', gap: 8 },
  tabChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardRoute: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },

  progressTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 12, color: '#64748B', marginTop: -4 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revenue: { fontSize: 15, fontWeight: '700' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  completeBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: C,
  },
  completeBtnText: { fontSize: 13, fontWeight: '700', color: C },
  cancelBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#D97706' },

  empty: { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyTitle: { fontSize: 16, color: '#94A3B8', fontWeight: '500' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

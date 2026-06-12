import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

const C = '#3B82F6';
const G = '#10B981';

type DriverProfile = {
  id: string;
  name: string;
  bio: string;
  member_since: string;
  avatar_url?: string;
};

type UpcomingRide = {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price: number;
  seats: number;
  booked_seats: number;
};

type Props = {
  driverId: string;
  onBack: () => void;
  onBookRide?: (rideId: string) => void;
};

export function DriverPublicProfile({ driverId, onBack, onBookRide }: Props) {
  const insets = useSafeAreaInsets();
  const [profile,  setProfile]  = useState<DriverProfile | null>(null);
  const [rides,    setRides]    = useState<UpcomingRide[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    load();
  }, [driverId]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [profileRes, ridesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, bio, created_at, avatar_url')
          .eq('id', driverId)
          .single(),
        supabase
          .from('rides')
          .select(`
            id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats,
            bookings!left(status, seats_requested)
          `)
          .eq('driver_id', driverId)
          .eq('status', 'scheduled')
          .gte('departure_date', new Date().toISOString().split('T')[0])
          .order('departure_date', { ascending: true })
          .limit(10),
      ]);

      if (profileRes.error) throw profileRes.error;
      const p = profileRes.data;
      setProfile({
        id: p.id,
        name: p.name ?? 'Driver',
        bio: p.bio ?? '',
        member_since: p.created_at
          ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'Unknown',
        avatar_url: p.avatar_url,
      });

      if (!ridesRes.error && ridesRes.data) {
        const mapped: UpcomingRide[] = ridesRes.data.map((r: any) => {
          const booked = Array.isArray(r.bookings)
            ? r.bookings
                .filter((b: any) => b.status === 'accepted')
                .reduce((s: number, b: any) => s + (b.seats_requested ?? 0), 0)
            : (r.booked_seats ?? 0);
          return {
            id: r.id,
            from_city: r.from_city,
            to_city: r.to_city,
            departure_date: r.departure_date,
            departure_time: r.departure_time,
            price: r.price,
            seats: r.seats,
            booked_seats: booked,
          };
        });
        setRides(mapped);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Could not load driver profile');
    } finally {
      setLoading(false);
    }
  };

  const initial = (profile?.name?.[0] ?? 'D').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Driver Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C} />
        </View>
      ) : err ? (
        <View style={styles.center}>
          <Text style={styles.errIcon}>⚠️</Text>
          <Text style={styles.errTxt}>{err}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : !profile ? (
        <View style={styles.center}>
          <Text style={styles.errTxt}>Driver not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{profile.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>✓ Verified Driver</Text>
                  </View>
                </View>
                <Text style={styles.since}>Member since {profile.member_since}</Text>
              </View>
            </View>

            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : (
              <Text style={styles.bioEmpty}>No bio yet.</Text>
            )}
          </View>

          {/* Upcoming rides */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Rides</Text>
            {rides.length === 0 ? (
              <View style={styles.emptyRides}>
                <Text style={styles.emptyIcon}>🚗</Text>
                <Text style={styles.emptyTxt}>No upcoming rides</Text>
              </View>
            ) : (
              rides.map((r) => {
                const available = r.seats - r.booked_seats;
                const full      = available <= 0;
                return (
                  <View key={r.id} style={styles.rideCard}>
                    <View style={styles.rideRoute}>
                      <Text style={styles.rideCity}>{r.from_city}</Text>
                      <Text style={styles.rideArrow}>→</Text>
                      <Text style={styles.rideCity}>{r.to_city}</Text>
                    </View>
                    <View style={styles.rideMeta}>
                      <View style={styles.rideChip}>
                        <Text style={styles.rideChipTxt}>📅 {r.departure_date}</Text>
                      </View>
                      <View style={styles.rideChip}>
                        <Text style={styles.rideChipTxt}>🕐 {r.departure_time}</Text>
                      </View>
                      <View style={styles.rideChip}>
                        <Text style={styles.rideChipTxt}>💺 {available} seat{available !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.rideFooter}>
                      <Text style={styles.ridePrice}>{r.price} MAD</Text>
                      {onBookRide && (
                        <Pressable
                          style={[styles.bookBtn, full && styles.bookBtnDisabled]}
                          onPress={() => !full && onBookRide(r.id)}
                          disabled={full}
                        >
                          <Text style={[styles.bookBtnTxt, full && { color: '#94A3B8' }]}>
                            {full ? 'Full' : 'Book Now'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backArrow:   { fontSize: 20, color: '#1E293B' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errIcon:    { fontSize: 36 },
  errTxt:     { fontSize: 15, color: '#64748B', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:   { backgroundColor: C, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11 },
  retryTxt:   { color: '#fff', fontWeight: '700' },

  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  avatarRow:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar:      { width: 64, height: 64, borderRadius: 32, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 26, color: '#fff', fontWeight: '800' },
  name:        { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  badgeRow:    { flexDirection: 'row', marginTop: 4 },
  badge:       { backgroundColor: G + '18', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt:    { fontSize: 11, fontWeight: '700', color: G },
  since:       { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  bio:         { fontSize: 14, color: '#475569', lineHeight: 20 },
  bioEmpty:    { fontSize: 14, color: '#94A3B8', fontStyle: 'italic' },

  section:       { paddingHorizontal: 16, gap: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 4 },

  emptyRides:  { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyIcon:   { fontSize: 36 },
  emptyTxt:    { fontSize: 15, color: '#94A3B8' },

  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  rideRoute:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideCity:    { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  rideArrow:   { fontSize: 16, color: '#94A3B8' },
  rideMeta:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rideChip:    { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  rideChipTxt: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  rideFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ridePrice:       { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  bookBtn:         { backgroundColor: C, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  bookBtnDisabled: { backgroundColor: '#E2E8F0' },
  bookBtnTxt:      { color: '#fff', fontSize: 14, fontWeight: '700' },
});

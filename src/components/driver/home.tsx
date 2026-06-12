import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

// Cross-platform icon: emoji on web, SF Symbol / Material on native
function Icon({ ios, android, emoji, size = 18, color = C }: {
  ios: string; android: string; emoji: string; size?: number; color?: string;
}) {
  if (Platform.OS === 'web') return <Text style={{ fontSize: size * 0.95, lineHeight: size * 1.3 }}>{emoji}</Text>;
  return <SymbolView name={{ ios, android } as any} size={size} tintColor={color} />;
}

type Coords = { lat: number; lng: number };

function LocationCard() {
  const [coords,  setCoords]  = useState<Coords | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const detect = () => {
    setLoading(true);
    setError(null);

    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        setError('Geolocation not supported by this browser.');
        setLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords: c }) => {
          setCoords({ lat: c.latitude, lng: c.longitude });
          try {
            const res  = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}`,
              { headers: { 'Accept-Language': 'en' } },
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village;
            setAddress([city, data.address?.state, data.address?.country].filter(Boolean).join(', '));
          } catch { setAddress(null); }
          setLoading(false);
        },
        () => { setError('Location denied. Allow access in your browser.'); setLoading(false); },
        { timeout: 10000 },
      );
      return;
    }

    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') { setError('Permission denied.'); setLoading(false); return; }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        if (geo) setAddress([geo.city, geo.region, geo.country].filter(Boolean).join(', '));
      } catch { setError('Could not get location.'); }
      setLoading(false);
    });
  };

  const openMaps = () => {
    if (!coords) return;
    const url = Platform.select({
      ios:     `maps:?q=${coords.lat},${coords.lng}`,
      android: `geo:${coords.lat},${coords.lng}`,
      default: `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`,
    })!;
    Linking.openURL(url);
  };

  return (
    <View style={styles.locCard}>
      <View style={styles.locTop}>
        <View style={styles.locIconWrap}>
          <Text style={styles.locEmoji}>📍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locTitle}>Your Location</Text>
          {address
            ? <Text style={styles.locAddress}>{address}</Text>
            : <Text style={styles.locHint}>{loading ? 'Detecting…' : 'Tap to detect your city'}</Text>
          }
          {error && <Text style={styles.locError}>{error}</Text>}
        </View>
        <Pressable
          style={[styles.locBtn, { backgroundColor: coords ? '#F1F5F9' : C }]}
          onPress={coords ? detect : detect}
          disabled={loading}>
          <Text style={[styles.locBtnTxt, { color: coords ? '#64748B' : '#fff' }]}>
            {loading ? '…' : coords ? '↺' : 'Detect'}
          </Text>
        </Pressable>
      </View>

      {coords && (
        <>
          <Text style={styles.locCoords}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>

          {Platform.OS === 'web' && (
            // @ts-ignore
            <iframe
              title="map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.015},${coords.lat - 0.015},${coords.lng + 0.015},${coords.lat + 0.015}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
              style={{ width: '100%', height: 200, border: 'none', borderRadius: 12, marginTop: 8 }}
            />
          )}

          <Pressable style={styles.mapsBtn} onPress={openMaps}>
            <Text style={styles.mapsBtnTxt}>🗺  Open in Maps</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

type UpcomingRide = {
  id: string; from_city: string; to_city: string;
  departure_date: string; departure_time: string;
  seats: number; booked_seats: number; price: number;
};

type Props = { onNavigate: (key: string) => void };

export function DriverHome({ onNavigate }: Props) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Driver';

  const [stats,    setStats]    = useState({ trips: 0, requests: 0, todayEarnings: 0 });
  const [rating,   setRating]   = useState<{ avg: number; count: number } | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingRide[]>([]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [tripsRes, ridesRes] = await Promise.all([
      supabase.from('rides').select('id', { count: 'exact', head: true })
        .eq('driver_id', user.id).eq('status', 'completed'),
      supabase.from('rides').select('id').eq('driver_id', user.id),
    ]);

    const rideIds = ridesRes.data?.map(r => r.id) ?? [];

    const [requestsRes, todayRidesRes, upcomingRes] = await Promise.all([
      rideIds.length > 0
        ? supabase.from('bookings').select('id', { count: 'exact', head: true })
            .in('ride_id', rideIds).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
      supabase.from('rides').select('id').eq('driver_id', user.id).eq('departure_date', today),
      supabase.from('rides')
        .select('id, from_city, to_city, departure_date, departure_time, seats, booked_seats, price')
        .eq('driver_id', user.id).eq('status', 'active')
        .gte('departure_date', today)
        .order('departure_date', { ascending: true }).limit(3),
    ]);

    let todayEarnings = 0;
    const todayRideIds = todayRidesRes.data?.map(r => r.id) ?? [];
    if (todayRideIds.length > 0) {
      const { data: earned } = await supabase.from('bookings')
        .select('total_price').in('ride_id', todayRideIds).eq('status', 'accepted');
      todayEarnings = earned?.reduce((s, b) => s + (b.total_price ?? 0), 0) ?? 0;
    }

    const { data: reviewsData } = await supabase
      .from('reviews').select('rating').eq('driver_id', user.id);
    const reviewCount = reviewsData?.length ?? 0;
    const avgRating   = reviewCount > 0
      ? Math.round(reviewsData!.reduce((s, r) => s + r.rating, 0) / reviewCount * 10) / 10
      : 0;

    setStats({ trips: tripsRes.count ?? 0, requests: requestsRes.count ?? 0, todayEarnings });
    setRating(reviewCount > 0 ? { avg: avgRating, count: reviewCount } : null);
    setUpcoming((upcomingRes.data ?? []) as UpcomingRide[]);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Hero card ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Bonjour, {firstName} 👋</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineTxt}>Online · Ready for rides</Text>
            </View>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingNum}>
              {rating ? rating.avg.toFixed(1) : '—'}
            </Text>
            {rating && <Text style={styles.ratingCount}>({rating.count})</Text>}
          </View>
        </View>

      </View>

      {/* ── KPI strip ── */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={styles.kpiEmoji}>💰</Text>
          <Text style={[styles.kpiVal, { color: C }]}>{stats.todayEarnings} MAD</Text>
          <Text style={styles.kpiLbl}>Today</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={styles.kpiEmoji}>🚗</Text>
          <Text style={[styles.kpiVal, { color: '#3B82F6' }]}>{stats.trips}</Text>
          <Text style={styles.kpiLbl}>Completed</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#FFFBEB' }]}>
          <Text style={styles.kpiEmoji}>📨</Text>
          <Text style={[styles.kpiVal, { color: '#F59E0B' }]}>{stats.requests}</Text>
          <Text style={styles.kpiLbl}>Requests</Text>
        </View>
      </View>

      {/* ── Quick actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { key: 'create',      emoji: '➕', label: 'New Trip',  bg: '#F0FDF4', fg: C },
            { key: 'rides',       emoji: '🚗', label: 'My Rides',  bg: '#EFF6FF', fg: '#3B82F6' },
            { key: 'invitations', emoji: '📨', label: 'Requests',  bg: '#FFFBEB', fg: '#F59E0B' },
            { key: 'messages',    emoji: '💬', label: 'Messages',  bg: '#FDF4FF', fg: '#A855F7' },
          ].map(a => (
            <Pressable key={a.key} style={styles.actionCard} onPress={() => onNavigate(a.key)}>
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <Text style={styles.actionEmoji}>{a.emoji}</Text>
              </View>
              <Text style={[styles.actionLabel, { color: a.fg }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Location ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Location</Text>
        <LocationCard />
      </View>

      {/* ── Upcoming trips ── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Trips</Text>
          <Pressable onPress={() => onNavigate('rides')}>
            <Text style={[styles.seeAll, { color: C }]}>See all →</Text>
          </Pressable>
        </View>

        {upcoming.length === 0 ? (
          <Pressable style={[styles.emptyTripsCard]} onPress={() => onNavigate('create')}>
            <Text style={styles.emptyTripsText}>No upcoming trips · Tap to create one →</Text>
          </Pressable>
        ) : (
          upcoming.map((t, i) => (
            <View key={t.id} style={styles.tripCard}>
              <View style={styles.tripIndex}>
                <Text style={styles.tripIndexTxt}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripRoute}>{t.from_city} → {t.to_city}</Text>
                <Text style={styles.tripMeta}>📅 {t.departure_date} · 🕐 {t.departure_time}</Text>
                <View style={styles.seatsRow}>
                  {Array.from({ length: t.seats }).map((_, s) => (
                    <View key={s} style={[styles.seatPip, { backgroundColor: s < t.booked_seats ? C : '#E2E8F0' }]} />
                  ))}
                  <Text style={styles.seatsTxt}>{t.booked_seats}/{t.seats} seats</Text>
                </View>
              </View>
              <View style={styles.tripRevBox}>
                <Text style={[styles.tripRev, { color: C }]}>{t.price * t.booked_seats}</Text>
                <Text style={styles.tripRevSub}>MAD</Text>
              </View>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, gap: 20, paddingBottom: 40 },

  /* Hero */
  hero: {
    backgroundColor: C, borderRadius: 24, padding: 22,
    gap: 20,
    shadowColor: C, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A7F3D0' },
  onlineTxt: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
  },
  ratingStar:   { fontSize: 14 },
  ratingNum:    { fontSize: 18, fontWeight: '900', color: '#fff' },
  ratingCount:  { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  earningsBlock: { gap: 6 },
  earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  earningsAmt: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  earningsCur: { fontSize: 22, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  earningsTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  earningsTagTxt: { fontSize: 12, color: '#fff', fontWeight: '600' },

  /* KPIs */
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  kpiEmoji: { fontSize: 22 },
  kpiVal: { fontSize: 17, fontWeight: '800' },
  kpiLbl: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },

  /* Section */
  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  /* Quick actions */
  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionEmoji: { fontSize: 22 },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  /* Location card */
  locCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  locTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  locEmoji: { fontSize: 22 },
  locTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  locAddress: { fontSize: 13, color: '#64748B', marginTop: 2 },
  locHint: { fontSize: 13, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' },
  locError: { fontSize: 12, color: '#EF4444', marginTop: 2 },
  locBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  locBtnTxt: { fontSize: 13, fontWeight: '700' },
  locCoords: { fontSize: 11, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mapsBtn: {
    alignSelf: 'flex-start', backgroundColor: '#F0FDF4',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  mapsBtnTxt: { fontSize: 13, fontWeight: '600', color: C },

  emptyTripsCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTripsText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  /* Trip cards */
  tripCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tripIndex: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C + '15', alignItems: 'center', justifyContent: 'center',
  },
  tripIndexTxt: { fontSize: 15, fontWeight: '800', color: C },
  tripRoute: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  tripMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  seatsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  seatPip: { width: 10, height: 10, borderRadius: 5 },
  seatsTxt: { fontSize: 11, color: '#94A3B8', marginLeft: 4 },
  tripRevBox: { alignItems: 'flex-end' },
  tripRev: { fontSize: 18, fontWeight: '900' },
  tripRevSub: { fontSize: 11, color: '#94A3B8' },
});

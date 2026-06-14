import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { useLang } from '@/context/language';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type Props = { onNavigate: (key: string) => void };

export function DriverHome({ onNavigate }: Props) {
  const { user } = useAuth();
  const t = useLang();
  const firstName = user?.name?.split(' ')[0] ?? 'Driver';

  const [stats,  setStats]  = useState({ trips: 0, requests: 0, todayEarnings: 0 });
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [tripsRes, ridesRes] = await Promise.all([
      supabase.from('rides').select('id', { count: 'exact', head: true })
        .eq('driver_id', user.id).eq('status', 'completed'),
      supabase.from('rides').select('id').eq('driver_id', user.id),
    ]);

    const rideIds = ridesRes.data?.map(r => r.id) ?? [];

    const [requestsRes, todayRidesRes] = await Promise.all([
      rideIds.length > 0
        ? supabase.from('bookings').select('id', { count: 'exact', head: true })
            .in('ride_id', rideIds).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
      supabase.from('rides').select('id').eq('driver_id', user.id).eq('departure_date', today),
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
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Hero card ── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>{t(`Hello, ${firstName} 👋`, `Bonjour, ${firstName} 👋`)}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineTxt}>{t('Online · Ready for rides', 'En ligne · Prêt pour les trajets')}</Text>
            </View>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingNum}>{rating ? rating.avg.toFixed(1) : '—'}</Text>
            {rating && <Text style={styles.ratingCount}>({rating.count})</Text>}
          </View>
        </View>
      </View>

      {/* ── KPI strip ── */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={styles.kpiEmoji}>💰</Text>
          <Text style={[styles.kpiVal, { color: C }]}>{stats.todayEarnings} MAD</Text>
          <Text style={styles.kpiLbl}>{t('Today', "Aujourd'hui")}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={styles.kpiEmoji}>🚗</Text>
          <Text style={[styles.kpiVal, { color: '#3B82F6' }]}>{stats.trips}</Text>
          <Text style={styles.kpiLbl}>{t('Completed', 'Terminés')}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#FFFBEB' }]}>
          <Text style={styles.kpiEmoji}>📨</Text>
          <Text style={[styles.kpiVal, { color: '#F59E0B' }]}>{stats.requests}</Text>
          <Text style={styles.kpiLbl}>{t('Requests', 'Demandes')}</Text>
        </View>
      </View>

      {/* ── Quick actions ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Quick Actions', 'Actions rapides')}</Text>
        <View style={styles.actionsGrid}>
          {[
            { key: 'create',      emoji: '➕', label: t('New Trip',  'Nouveau trajet'), bg: '#F0FDF4', fg: C },
            { key: 'rides',       emoji: '🚗', label: t('My Rides',  'Mes trajets'),    bg: '#EFF6FF', fg: '#3B82F6' },
            { key: 'invitations', emoji: '📨', label: t('Requests',  'Demandes'),       bg: '#FFFBEB', fg: '#F59E0B' },
            { key: 'profile',     emoji: '👤', label: t('Profile',   'Profil'),         bg: '#F5F3FF', fg: '#6366F1' },
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, gap: 20, paddingBottom: 40 },

  hero: {
    backgroundColor: C, borderRadius: 24, padding: 22,
    shadowColor: C, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A7F3D0' },
  onlineTxt:    { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  ratingBadge:  {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
  },
  ratingStar:  { fontSize: 14 },
  ratingNum:   { fontSize: 18, fontWeight: '900', color: '#fff' },
  ratingCount: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: {
    flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  kpiEmoji: { fontSize: 22 },
  kpiVal:   { fontSize: 17, fontWeight: '800' },
  kpiLbl:   { fontSize: 10, color: '#94A3B8', fontWeight: '500' },

  section:      { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },

  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionIcon:  { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionEmoji: { fontSize: 22 },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

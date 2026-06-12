import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#6366F1';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  passenger: { name: string } | null;
  driver:    { name: string } | null;
  ride:      { from_city: string; to_city: string } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Text key={n} style={{ fontSize: 14, color: n <= rating ? '#F59E0B' : '#E2E8F0' }}>★</Text>
      ))}
    </View>
  );
}

export function AdminReviews() {
  const [reviews,    setReviews]    = useState<Review[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  const fetchReviews = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at,
        passenger:passenger_id(name),
        driver:driver_id(name),
        ride:ride_id(from_city, to_city)
      `)
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); }
    else     { setReviews((data ?? []) as unknown as Review[]); }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetchReviews(); setLoading(false); })();
  }, [fetchReviews]);

  const onRefresh = async () => {
    setRefreshing(true); await fetchReviews(); setRefreshing(false);
  };

  if (loading) return <ActivityIndicator color={C} size="large" style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />}>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTxt}>⚠️ {error}</Text>
          <Pressable onPress={fetchReviews} style={styles.retryBtn}>
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{reviews.length}</Text>
          <Text style={styles.summaryLbl}>Total Reviews</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>⭐ {avgRating}</Text>
          <Text style={styles.summaryLbl}>Platform Avg</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: '#10B981' }]}>
            {reviews.filter(r => r.rating >= 4).length}
          </Text>
          <Text style={styles.summaryLbl}>4-5 ⭐ Reviews</Text>
        </View>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTxt}>No reviews yet</Text>
          <Text style={styles.emptySub}>Reviews appear here after passengers rate completed trips.</Text>
        </View>
      ) : (
        reviews.map(r => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Stars rating={r.rating} />
              <Text style={styles.dateText}>
                {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>

            {r.ride && (
              <Text style={styles.routeText}>
                📍 {(r.ride as any).from_city} → {(r.ride as any).to_city}
              </Text>
            )}

            <View style={styles.peopleRow}>
              <View style={styles.personChip}>
                <View style={[styles.personDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.personName}>{(r.passenger as any)?.name ?? 'Passenger'}</Text>
              </View>
              <Text style={styles.arrowTxt}>→</Text>
              <View style={styles.personChip}>
                <View style={[styles.personDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.personName}>{(r.driver as any)?.name ?? 'Driver'}</Text>
              </View>
            </View>

            {r.comment ? (
              <View style={styles.commentBox}>
                <Text style={styles.commentText}>"{r.comment}"</Text>
              </View>
            ) : (
              <Text style={styles.noComment}>No comment left</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const CARD_STYLE = {
  backgroundColor: '#fff', borderRadius: 16, padding: 16,
  shadowColor: '#000' as const, shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
};

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 32 },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', gap: 8, flexDirection: 'row', alignItems: 'center',
  },
  errorTxt: { flex: 1, color: '#EF4444', fontSize: 13 },
  retryBtn: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  retryTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { ...CARD_STYLE, flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14 },
  summaryVal:  { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  summaryLbl:  { fontSize: 11, color: '#94A3B8', textAlign: 'center' },

  card: { ...CARD_STYLE, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 12, color: '#94A3B8' },
  routeText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },

  peopleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  personDot:  { width: 8, height: 8, borderRadius: 4 },
  personName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  arrowTxt:   { fontSize: 14, color: '#94A3B8' },

  commentBox: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: C,
  },
  commentText: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
  noComment:   { fontSize: 12, color: '#CBD5E1' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTxt:  { fontSize: 18, fontWeight: '700', color: '#94A3B8' },
  emptySub:  { fontSize: 13, color: '#CBD5E1', textAlign: 'center', paddingHorizontal: 20 },
});

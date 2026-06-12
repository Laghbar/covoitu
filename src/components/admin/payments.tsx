import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#6366F1';

type Booking = {
  id: string;
  seats_requested: number;
  total_price: number;
  status: string;
  created_at: string;
  ride: { from_city: string; to_city: string; departure_date: string } | null;
  passenger: { name: string } | null;
};

type FilterKey = 'all' | 'pending' | 'accepted' | 'rejected' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'accepted',  label: 'Accepted' },
  { key: 'rejected',  label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

function statusColor(status: string) {
  if (status === 'pending')   return '#F59E0B';
  if (status === 'accepted')  return '#10B981';
  if (status === 'rejected')  return '#EF4444';
  if (status === 'cancelled') return '#94A3B8';
  return '#64748B';
}

export function AdminPayments() {
  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>('all');

  const fetchBookings = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('bookings')
      .select('id, seats_requested, total_price, status, created_at, ride:ride_id(from_city, to_city, departure_date), passenger:passenger_id(name)')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setBookings((data ?? []) as unknown as Booking[]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchBookings();
      setLoading(false);
    })();
  }, [fetchBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  const totalRevenue = bookings
    .filter((b) => b.status === 'accepted')
    .reduce((sum, b) => sum + (b.total_price ?? 0), 0);

  const totalCount   = bookings.length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  const filtered = bookings.filter((b) => {
    if (activeFilter === 'all') return true;
    return b.status === activeFilter;
  });

  if (loading) {
    return <ActivityIndicator color={C} size="large" style={{ marginTop: 40 }} />;
  }

  if (error) {
    return (
      <View style={styles.errorBanner}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={async () => {
            setLoading(true);
            await fetchBookings();
            setLoading(false);
          }}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalRevenue} MAD</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.chip,
                  activeFilter === f.key && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeFilter === f.key && styles.chipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      contentContainerStyle={styles.container}
      renderItem={({ item }) => {
        const ride      = item.ride as any;
        const passenger = item.passenger as any;
        const createdAt = new Date(item.created_at).toLocaleDateString();
        const sc        = statusColor(item.status);

        return (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: C }]}>
                <Text style={styles.avatarText}>
                  {(passenger?.name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>{passenger?.name ?? '—'}</Text>
                <Text style={styles.metaText}>
                  {ride?.from_city ?? '—'} → {ride?.to_city ?? '—'}
                </Text>
                {ride?.departure_date && (
                  <Text style={styles.metaText}>{ride.departure_date}</Text>
                )}
                <Text style={styles.priceText}>
                  {item.seats_requested} × {item.total_price / (item.seats_requested || 1)} MAD = {item.total_price} MAD
                </Text>
                <Text style={styles.dateText}>Booked: {createdAt}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: sc + '20' }]}>
                <Text style={[styles.badgeText, { color: sc }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.empty}>No bookings found</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  header: {
    gap: 12,
    marginBottom: 4,
  },
  statsBar: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: C,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: C,
    marginTop: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  empty: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  errorBanner: {
    margin: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
});

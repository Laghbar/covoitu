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

type Ride = {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price: number;
  seats: number;
  booked_seats: number;
  status: string;
  created_at: string;
  driver: { name: string } | null;
};

type FilterKey = 'all' | 'active' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function statusColor(status: string) {
  if (status === 'active')    return '#10B981';
  if (status === 'completed') return '#3B82F6';
  if (status === 'cancelled') return '#94A3B8';
  return '#64748B';
}

export function AdminRides() {
  const [rides,         setRides]         = useState<Ride[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [activeFilter,  setActiveFilter]  = useState<FilterKey>('all');

  const fetchRides = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('rides')
      .select('id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats, status, created_at, driver:driver_id(name)')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setRides((data ?? []) as unknown as Ride[]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchRides();
      setLoading(false);
    })();
  }, [fetchRides]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRides();
    setRefreshing(false);
  }, [fetchRides]);

  const cancelRide = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (!err) {
      setRides((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)),
      );
    }
  }, []);

  const filtered = rides.filter((r) => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
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
            await fetchRides();
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
          <Text style={styles.countText}>{filtered.length} rides</Text>
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
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeText}>
                {item.from_city} → {item.to_city}
              </Text>
              <Text style={styles.metaText}>
                {item.departure_date} · {item.departure_time}
              </Text>
              <Text style={styles.metaText}>
                Driver: {(item.driver as any)?.name ?? '—'}
              </Text>
              <Text style={styles.metaText}>
                {item.price} MAD · {item.booked_seats}/{item.seats} seats booked
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>

          {item.status === 'active' && (
            <TouchableOpacity
              onPress={() => cancelRide(item.id)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No rides found</Text>
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
    gap: 10,
    marginBottom: 4,
  },
  countText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
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
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
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

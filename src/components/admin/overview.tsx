import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#6366F1';

type Stats = {
  totalDrivers: number;
  totalPassengers: number;
  activeRides: number;
  totalRevenue: number;
};

type RecentRide = {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  price: number;
  status: string;
  driver: { name: string } | null;
};

type RecentBooking = {
  id: string;
  seats_requested: number;
  total_price: number;
  status: string;
  ride: { from_city: string; to_city: string } | null;
  passenger: { name: string } | null;
};

const CARD_STYLE = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};

const STAT_CARDS = [
  { key: 'totalDrivers',    label: 'Total Drivers',     icon: '🚗', color: '#10B981' },
  { key: 'totalPassengers', label: 'Total Passengers',  icon: '👥', color: '#3B82F6' },
  { key: 'activeRides',     label: 'Active Rides',      icon: '🛣️',  color: '#F59E0B' },
  { key: 'totalRevenue',    label: 'Total Revenue',     icon: '💰', color: '#6366F1' },
];

function statusColor(status: string) {
  if (status === 'active')    return '#10B981';
  if (status === 'completed') return '#3B82F6';
  if (status === 'cancelled') return '#94A3B8';
  if (status === 'pending')   return '#F59E0B';
  if (status === 'accepted')  return '#10B981';
  if (status === 'rejected')  return '#EF4444';
  return '#94A3B8';
}

export function AdminOverview() {
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [recentRides,    setRecentRides]    = useState<RecentRide[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [driversRes, passengersRes, activeRes, revenueRes, ridesRes, bookingsRes] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'passenger'),
          supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('bookings').select('total_price').eq('status', 'accepted'),
          supabase
            .from('rides')
            .select('id, from_city, to_city, departure_date, price, status, driver:driver_id(name)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('bookings')
            .select('id, seats_requested, total_price, status, ride:ride_id(from_city, to_city), passenger:passenger_id(name)')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      if (driversRes.error)    throw driversRes.error;
      if (passengersRes.error) throw passengersRes.error;
      if (activeRes.error)     throw activeRes.error;
      if (revenueRes.error)    throw revenueRes.error;
      if (ridesRes.error)      throw ridesRes.error;
      if (bookingsRes.error)   throw bookingsRes.error;

      const totalRevenue = (revenueRes.data ?? []).reduce(
        (sum, b) => sum + (b.total_price ?? 0),
        0,
      );

      setStats({
        totalDrivers:    driversRes.count    ?? 0,
        totalPassengers: passengersRes.count ?? 0,
        activeRides:     activeRes.count     ?? 0,
        totalRevenue,
      });
      setRecentRides((ridesRes.data ?? []) as unknown as RecentRide[]);
      setRecentBookings((bookingsRes.data ?? []) as unknown as RecentBooking[]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return <ActivityIndicator color={C} size="large" style={{ marginTop: 40 }} />;
  }

  if (error) {
    return (
      <View style={styles.errorBanner}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchAll} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Platform Stats</Text>

      <View style={styles.grid}>
        {STAT_CARDS.map((card) => {
          const value = stats ? stats[card.key as keyof Stats] : 0;
          const display =
            card.key === 'totalRevenue' ? `${value} MAD` : String(value);
          return (
            <View key={card.key} style={[CARD_STYLE, styles.statCard]}>
              <Text style={styles.statIcon}>{card.icon}</Text>
              <Text style={[styles.statValue, { color: card.color }]}>{display}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Recent Rides</Text>
      {recentRides.length === 0 ? (
        <Text style={styles.empty}>No rides yet</Text>
      ) : (
        recentRides.map((ride) => (
          <View key={ride.id} style={[CARD_STYLE, styles.row]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeText}>
                {ride.from_city} → {ride.to_city}
              </Text>
              <Text style={styles.metaText}>
                {ride.departure_date} · {(ride.driver as any)?.name ?? '—'}
              </Text>
              <Text style={styles.priceText}>{ride.price} MAD</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(ride.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor(ride.status) }]}>
                {ride.status}
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Recent Bookings</Text>
      {recentBookings.length === 0 ? (
        <Text style={styles.empty}>No bookings yet</Text>
      ) : (
        recentBookings.map((booking) => {
          const ride = booking.ride as any;
          const passenger = booking.passenger as any;
          return (
            <View key={booking.id} style={[CARD_STYLE, styles.row]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeText}>
                  {passenger?.name ?? '—'}
                </Text>
                <Text style={styles.metaText}>
                  {ride?.from_city ?? '—'} → {ride?.to_city ?? '—'}
                </Text>
                <Text style={styles.priceText}>{booking.total_price} MAD</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor(booking.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: statusColor(booking.status) }]}>
                  {booking.status}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    alignItems: 'flex-start',
    gap: 6,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  priceText: {
    fontSize: 13,
    fontWeight: '600',
    color: C,
    marginTop: 4,
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
  empty: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
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

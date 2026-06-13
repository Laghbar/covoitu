import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { PassengerHome }       from './passenger/home';
import { PassengerSearch }     from './passenger/search';
import { PassengerRideDetail } from './passenger/ride-detail';
import { PassengerBookings }   from './passenger/bookings';
import { PassengerProfile }    from './passenger/profile';
import { PassengerRequests }   from './passenger/my-requests';
import { CreateRequestModal }  from './passenger/create-request';
import { QRScannerModal }      from './passenger/qr-scanner';
import { DriverPublicProfile } from './passenger/driver-public-profile';

export const PASSENGER_COLOR = '#3B82F6';

type TabKey = 'home' | 'search' | 'requests' | 'bookings' | 'profile';

const TABS: { key: TabKey; emoji: string; label: string }[] = [
  { key: 'home',     emoji: '🔍', label: 'Rechercher' },
  { key: 'requests', emoji: '➕', label: 'Publier'    },
  { key: 'bookings', emoji: '🗺️', label: 'Vos trajets'},
  { key: 'profile',  emoji: '👤', label: 'Profil'     },
];

export type RideItem = {
  id: string; from: string; to: string; date: string; time: string;
  price: number; seats: number; bookedSeats: number;
  driver: { name: string; initial: string; rating: number; trips: number; memberSince: string; bio: string };
  car: { make: string; model: string; year: string; color: string; plate: string };
  preferences: string[]; pickupPoint: string; dropoffPoint: string; note?: string;
};

function AppBar({
  notifCount,
  onBellPress,
  onAvatarPress,
}: {
  notifCount: number;
  onBellPress: () => void;
  onAvatarPress: () => void;
}) {
  const { user } = useAuth();
  const initial  = (user?.name?.[0] ?? 'P').toUpperCase();

  return (
    <View style={styles.appBar}>
      {/* Left: logo + name */}
      <View style={styles.appBarLeft}>
        <View style={[styles.appLogo, { backgroundColor: PASSENGER_COLOR }]}>
          <Text style={{ fontSize: 12 }}>🚌</Text>
        </View>
        <Text style={styles.appName}>Horizon</Text>
      </View>

      {/* Right: bell + avatar */}
      <View style={styles.appBarRight}>
        <Pressable style={styles.bellWrap} onPress={onBellPress}>
          <Text style={styles.bellIcon}>🔔</Text>
          {notifCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={onAvatarPress} style={[styles.avatarBtn, { backgroundColor: PASSENGER_COLOR }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BottomTabBar({
  active,
  onChange,
  bookingCount,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  bookingCount: number;
}) {
  return (
    <View style={styles.tabBar}>
      {TABS.map(tab => {
        const focused  = tab.key === active;
        const hasBadge = tab.key === 'bookings' && bookingCount > 0;
        const isPrimary = tab.key === 'requests'; // "Publier" gets accent treatment
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onChange(tab.key)}>
            <View style={styles.tabIconWrap}>
              {isPrimary ? (
                <View style={[styles.tabPublishBtn, focused && { backgroundColor: PASSENGER_COLOR }]}>
                  <Text style={[styles.tabEmoji, { fontSize: 20, opacity: 1 }]}>{tab.emoji}</Text>
                </View>
              ) : (
                <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{tab.emoji}</Text>
              )}
              {hasBadge && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{bookingCount > 9 ? '9+' : bookingCount}</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.tabLabel,
              focused && { color: PASSENGER_COLOR, fontWeight: '700' },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AcceptToast({ message, onPress, onDone, type = 'accept' }: { message: string; onPress: () => void; onDone: () => void; type?: 'accept' | 'cancel' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
      ]).start(onDone);
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  const isCancel  = type === 'cancel';
  const accent    = isCancel ? '#EF4444' : '#10B981';

  return (
    <Animated.View style={[toastStyles.wrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable style={[toastStyles.inner, { borderLeftColor: accent }]} onPress={onPress}>
        <Text style={toastStyles.icon}>{isCancel ? '🚫' : '🎉'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={toastStyles.title}>{isCancel ? 'Ride Cancelled' : 'Booking Accepted!'}</Text>
          <Text style={toastStyles.body}>{message}</Text>
        </View>
        <Text style={[toastStyles.action, { color: accent }]}>View →</Text>
      </Pressable>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 8, left: 16, right: 16, zIndex: 999,
    borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 10,
  },
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16,
    padding: 14, borderLeftWidth: 4, borderLeftColor: '#10B981',
  },
  icon:   { fontSize: 28 },
  title:  { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  body:   { fontSize: 12, color: '#64748B', marginTop: 1 },
  action: { fontSize: 13, fontWeight: '700', color: '#10B981' },
});

export default function PassengerDashboard() {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();
  const [tab,              setTab]              = useState<TabKey>('home');
  const [selectedRide,    setSelectedRide]    = useState<RideItem | null>(null);
  const [searchQuery,     setSearchQuery]     = useState<{ from: string; to: string; date: string; seats: string } | null>(null);
  const [notifCount,      setNotifCount]      = useState(0);
  const [toast,           setToast]           = useState<{ msg: string; key: number; type?: 'accept' | 'cancel' } | null>(null);
  const [qrOpen,          setQrOpen]          = useState(false);
  const [selectedDriver,  setSelectedDriver]  = useState<string | null>(null);
  const [createReqOpen,   setCreateReqOpen]   = useState(false);

  const tabRef = useRef(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  const fetchNotifCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (tabRef.current !== 'bookings') {
      setNotifCount(count ?? 0);
    }
  }, [user]);

  useEffect(() => { fetchNotifCount(); }, [fetchNotifCount]);

  const markNotifsSeen = useCallback(async () => {
    if (!user) return;
    setNotifCount(0);
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  }, [user]);

  // Auto-clear badge whenever the bookings tab is active (covers refresh, direct navigation, etc.)
  useEffect(() => {
    if (tab === 'bookings') markNotifsSeen();
  }, [tab, markNotifsSeen]);

  // Realtime: listen for INSERT on notifications table — reliable, fast, server-filtered
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('passenger-notifications-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as any;
        if (n.type === 'booking_accepted') {
          setToast({ msg: n.body, key: Date.now(), type: 'accept' });
        } else if (n.type === 'ride_cancelled') {
          setToast({ msg: n.body, key: Date.now(), type: 'cancel' });
        } else if (n.type === 'rate_driver') {
          // Switch to bookings tab so the rate button is visible
          setTab('bookings');
          setToast({ msg: n.body, key: Date.now(), type: 'accept' });
        }
        if (tabRef.current === 'bookings') {
          markNotifsSeen();
        } else {
          fetchNotifCount();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifCount, markNotifsSeen]);

  const navigate = (key: string, payload?: any) => {
    if (key === 'ride-detail') { setSelectedRide(payload); return; }
    if (key === 'driver-profile') { setSelectedDriver(payload); return; }
    if (key === 'requests') { setTab('requests'); return; }
    if (key === 'search' && payload) { setSearchQuery(payload); setTab('home'); return; }
    setSelectedRide(null);
    setSelectedDriver(null);
    setTab(key as TabKey);
  };

  const changeTab = (k: TabKey) => {
    setSelectedRide(null);
    if (k === 'home') setSearchQuery(null);
    setTab(k);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4FF' }}>
      {/* Top app bar */}
      <View style={[styles.topSafe, { paddingTop: insets.top }]}>
        <AppBar
          notifCount={notifCount}
          onBellPress={() => changeTab('bookings')}
          onAvatarPress={() => changeTab('profile')}
        />
      </View>

      {/* Acceptance toast — floats over content, auto-dismisses */}
      {toast && (
        <AcceptToast
          key={toast.key}
          message={toast.msg}
          type={toast.type}
          onPress={() => { setToast(null); changeTab('bookings'); }}
          onDone={() => setToast(null)}
        />
      )}

      {/* Create request modal */}
      <CreateRequestModal
        visible={createReqOpen}
        onClose={() => setCreateReqOpen(false)}
        onCreated={() => setTab('requests')}
      />

      {/* QR scanner modal */}
      <QRScannerModal
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        onDriverFound={(id) => { setSelectedDriver(id); }}
      />

      {/* Page content */}
      <View style={{ flex: 1 }}>
        {selectedDriver ? (
          <DriverPublicProfile
            driverId={selectedDriver}
            onBack={() => setSelectedDriver(null)}
          />
        ) : selectedRide ? (
          <PassengerRideDetail ride={selectedRide} onBack={() => setSelectedRide(null)} onNavigate={navigate} />
        ) : (
          <>
            {tab === 'home'  && !searchQuery && <PassengerHome onNavigate={navigate} />}
            {tab === 'home'  && searchQuery  && (
              <PassengerSearch
                onNavigate={navigate}
                initialQuery={searchQuery}
                onScanQR={() => setQrOpen(true)}
              />
            )}
{tab === 'requests' && <PassengerRequests onCreateNew={() => setCreateReqOpen(true)} />}
            {tab === 'bookings' && <PassengerBookings onNavigate={navigate} />}
            {tab === 'profile'  && <PassengerProfile  />}
          </>
        )}
      </View>

      {/* Bottom tab bar — hidden when viewing detail screens */}
      {!selectedRide && !selectedDriver && (
        <View style={{ paddingBottom: insets.bottom, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
          <BottomTabBar active={tab} onChange={changeTab} bookingCount={notifCount} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topSafe: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  appBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogo: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  appName:  { fontSize: 17, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: '700' },

  bellWrap: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 20 },
  bellBadge: {
    position: 'absolute', top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff',
  },
  bellBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },

  avatarBtn:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Bottom tab bar */
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  tabIconWrap: { position: 'relative' },
  tabPublishBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E0EAFF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: -4,
  },
  tabEmoji:       { fontSize: 22, opacity: 0.35 },
  tabEmojiActive: { opacity: 1 },
  tabBadge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#fff',
  },
  tabBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },
  tabLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500', letterSpacing: 0.1 },
});

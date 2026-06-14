import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RideItem } from '../passenger-dashboard';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES, normalizeCity, stripDiacritics } from '@/lib/cities';
import { calcPassengerPrice } from '@/lib/commission';

const C = '#3B82F6';

const CITIES = MOROCCAN_CITIES;

function toRideItem(r: any): RideItem {
  // Calculate from accepted bookings (source of truth) rather than the cached column
  const bookedSeats = Array.isArray(r.bookings)
    ? r.bookings
        .filter((b: any) => b.status === 'accepted')
        .reduce((s: number, b: any) => s + (b.seats_requested ?? 0), 0)
    : (r.booked_seats ?? 0);

  return {
    id: r.id,
    from: r.from_city,
    to: r.to_city,
    date: r.departure_date,
    time: r.departure_time,
    price: r.price,
    seats: r.seats,
    bookedSeats,
    driver: {
      name: r.driver?.name ?? 'Driver',
      initial: (r.driver?.name?.[0] ?? 'D').toUpperCase(),
      rating: r.driver?.avg_rating ?? null,
      trips: r.driver?.total_trips ?? 0,
      memberSince: '2024',
      bio: r.note ?? '',
    },
    car: {
      make:  r.car_make  ?? '',
      model: r.car_model ?? '',
      year:  r.car_year  ?? '',
      color: r.car_color ?? '',
      plate: r.car_plate ?? '',
    },
    preferences: Array.isArray(r.preferences) ? r.preferences : [],
    pickupPoint: r.pickup_point ?? '',
    dropoffPoint: r.dropoff_point ?? '',
    note: r.note ?? undefined,
    paymentMethod: (r.payment_method === 'in_app' ? 'in_app' : 'cash') as 'cash' | 'in_app',
  };
}

const SORT_OPTIONS = ['Cheapest', 'Fastest', 'Best rated', 'Most seats'];

// ─── City autocomplete (free text + suggestions) ──────────────────────────────
function CityPicker({
  value, onSelect, placeholder, emoji,
}: { value: string; onSelect: (c: string) => void; placeholder: string; emoji: string }) {
  const [focused,   setFocused]   = useState(false);
  const [inputText, setInputText] = useState(value);
  const selecting = useRef(false);

  // Sync display when parent clears or swaps the value
  useEffect(() => { setInputText(value); }, [value]);

  const suggestions  = inputText.length >= 1
    ? CITIES.filter(c => c.toLowerCase().includes(inputText.toLowerCase())).slice(0, 7)
    : [];
  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={{ zIndex: showDropdown ? 200 : 1 }}>
      <View style={styles.cityBtn}>
        <Text style={{ fontSize: 15 }}>{emoji}</Text>
        <TextInput
          style={[styles.cityBtnText, { flex: 1, padding: 0 }]}
          value={inputText}
          onChangeText={(t) => { setInputText(t); onSelect(t); }}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (selecting.current) return;
            setTimeout(() => setFocused(false), 150);
          }}
        />
        {inputText.length > 0 && (
          <Pressable onPress={() => { setInputText(''); onSelect(''); }}>
            <Text style={{ color: '#CBD5E1', fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View
          style={styles.dropdown}
          // Prevent mousedown from blurring the TextInput on web
          {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
        >
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map(c => (
              <Pressable
                key={c}
                style={[styles.dropdownItem, c === inputText && { backgroundColor: C + '10' }]}
                onPress={() => { setInputText(c); onSelect(c); setFocused(false); }}>
                <Text style={[styles.dropdownItemText, c === inputText && { color: C, fontWeight: '700' }]}>
                  {c}
                </Text>
                {c === inputText && <Text style={{ color: C }}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Date field ───────────────────────────────────────────────────────────────
function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [show,  setShow]  = useState(false);
  const dateObj = value ? new Date(value + 'T12:00:00') : new Date();
  const today   = new Date().toISOString().split('T')[0];

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dateBtn}>
        <Text>📅</Text>
        {/* @ts-ignore */}
        <input
          type="date" value={value || ''} min={today}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 14, color: value ? '#1E293B' : '#94A3B8',
            outline: 'none', cursor: 'pointer', minWidth: 0,
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <Pressable style={styles.dateBtn} onPress={() => setShow(true)}>
        <Text>📅</Text>
        <Text style={[styles.dateBtnText, value ? { color: '#1E293B', fontWeight: '600' } : {}]}>
          {value || 'Pick a date'}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 12 }}>▼</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={dateObj} mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_e, d) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (d) onChange(d.toISOString().split('T')[0]);
          }}
          themeVariant="light"
        />
      )}
      {Platform.OS === 'ios' && show && (
        <Pressable style={[styles.doneBtn, { backgroundColor: C }]} onPress={() => setShow(false)}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Ride card ────────────────────────────────────────────────────────────────
function RideCard({ ride, alreadyBooked, onPress }: {
  ride: RideItem; alreadyBooked: boolean; onPress: () => void;
}) {
  const available     = ride.seats - ride.bookedSeats;
  const pct           = ride.seats > 0 ? ride.bookedSeats / ride.seats : 0;
  const passengerPrice = calcPassengerPrice(ride.price, ride.paymentMethod);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.driverRow}>
        <View style={[styles.avatar, { backgroundColor: C + '18' }]}>
          <Text style={[styles.avatarInitial, { color: C }]}>{ride.driver.initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{ride.driver.name}</Text>
          {ride.driver.rating != null ? (
            <Text style={styles.ratingText}>
              ⭐ {ride.driver.rating.toFixed(1)} · {ride.driver.trips} avis
            </Text>
          ) : (
            <Text style={[styles.ratingText, { color: '#94A3B8', fontStyle: 'italic' }]}>
              Nouveau conducteur
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.price, { color: C }]}>{passengerPrice} MAD</Text>
          <Text style={styles.priceSub}>par siège</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: C }]} />
          <Text style={styles.routeCity}>{ride.from}</Text>
        </View>
        <View style={styles.routeLineBox}>
          <View style={styles.routeLine} />
          <Text style={{ color: '#CBD5E1', fontSize: 12 }}>›</Text>
        </View>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.routeCity}>{ride.to}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}><Text style={styles.metaIcon}>📅</Text><Text style={styles.metaText}>{ride.date}</Text></View>
        <View style={styles.metaChip}><Text style={styles.metaIcon}>🕐</Text><Text style={styles.metaText}>{ride.time}</Text></View>
        <View style={styles.metaChip}>
          <Text style={styles.metaIcon}>{available > 0 ? '💺' : '🈵'}</Text>
          <Text style={[styles.metaText, { color: available > 0 ? '#475569' : '#EF4444' }]}>
            {available > 0 ? `${available} seat${available > 1 ? 's' : ''}` : 'Full'}
          </Text>
        </View>
      </View>

      <View style={styles.seatBarTrack}>
        <View style={[styles.seatBarFill, { width: `${pct * 100}%` as any, backgroundColor: pct >= 1 ? '#EF4444' : C }]} />
      </View>

      <View style={styles.prefRow}>
        <View style={[
          styles.payBadge,
          ride.paymentMethod === 'in_app'
            ? { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }
            : { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
        ]}>
          <Text style={[
            styles.payBadgeText,
            { color: ride.paymentMethod === 'in_app' ? '#3B82F6' : '#16A34A' },
          ]}>
            {ride.paymentMethod === 'in_app' ? '📱 Paiement app' : '💵 Espèces'}
          </Text>
        </View>
        {ride.preferences.slice(0, 2).map((p) => (
          <View key={p} style={styles.prefChip}><Text style={styles.prefText}>{p}</Text></View>
        ))}
        {alreadyBooked ? (
          <View style={[styles.bookBtn, { backgroundColor: '#10B981', marginLeft: 'auto' }]}>
            <Text style={styles.bookBtnText}>✓ Booked</Text>
          </View>
        ) : (
          <View style={[styles.bookBtn, { backgroundColor: C, marginLeft: 'auto' }]}>
            <Text style={styles.bookBtnText}>View details →</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type Props = {
  onNavigate: (key: string, payload?: any) => void;
  initialQuery?: { from: string; to: string; date: string; seats: string } | null;
  onScanQR?: () => void;
};

export function PassengerSearch({ onNavigate, initialQuery, onScanQR }: Props) {
  const { user } = useAuth();
  const [from,          setFrom]          = useState(initialQuery?.from  ?? '');
  const [to,            setTo]            = useState(initialQuery?.to    ?? '');
  const [date,          setDate]          = useState(initialQuery?.date  ?? '');
  const [seats,         setSeats]         = useState(initialQuery?.seats ?? '1');
  const [sort,          setSort]          = useState('Cheapest');
  const [allRides,      setAllRides]      = useState<RideItem[]>([]);
  const [results,       setResults]       = useState<RideItem[]>([]);
  const [bookedRideIds, setBookedRideIds] = useState<Set<string>>(new Set());
  const [loading,       setLoading]       = useState(true);
  const [dbError,       setDbError]       = useState<string | null>(null);
  const [locLoading,    setLocLoading]    = useState(false);
  const [locError,      setLocError]      = useState<string | null>(null);

  // Location detection for departure
  const detectDeparture = () => {
    setLocLoading(true); setLocError(null);

    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) { setLocError('Geolocation not supported.'); setLocLoading(false); return; }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res  = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=en`,
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
            if (city) setFrom(city);
            else setLocError('City not detected. Please type it manually.');
          } catch { setLocError('Could not fetch city.'); }
          setLocLoading(false);
        },
        (err) => {
          if (err.code === 1) setLocError('Location access denied. Allow it in your browser.');
          else setLocError('Could not get location.');
          setLocLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: false },
      );
      return;
    }

    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') { setLocError('Permission denied.'); setLocLoading(false); return; }
      try {
        const pos   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        const city  = geo?.city || geo?.subregion || geo?.region || '';
        if (city) setFrom(city);
        else setLocError('City not detected. Please type it manually.');
      } catch { setLocError('Could not get location.'); }
      setLocLoading(false);
    });
  };

  const loadRides = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    const today = new Date().toISOString().split('T')[0];

    const [ridesRes, bookingsRes] = await Promise.all([
      supabase
        .from('rides')
        .select('id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats, preferences, pickup_point, dropoff_point, note, payment_method, car_make, car_model, car_year, car_color, car_plate, driver:driver_id(name, avg_rating, total_trips), bookings(seats_requested, status)')
        .eq('status', 'active')
        .gte('departure_date', today)
        .order('departure_date', { ascending: true }),
      user
        ? supabase
            .from('bookings')
            .select('ride_id')
            .eq('passenger_id', user.id)
            .in('status', ['pending', 'accepted'])
        : Promise.resolve({ data: [] }),
    ]);

    if (ridesRes.error) {
      setDbError(ridesRes.error.message);
      setLoading(false);
      return;
    }

    const mapped = (ridesRes.data ?? []).map(toRideItem);
    setAllRides(mapped);
    setResults(mapped);
    setBookedRideIds(new Set((bookingsRes.data ?? []).map((b: any) => b.ride_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { loadRides(); }, [loadRides]);

  // Realtime: auto-add new rides the moment a driver publishes them
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const channel = supabase
      .channel('rides-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rides',
        filter: `status=eq.active`,
      }, async (payload) => {
        const newRide = payload.new as any;
        if (!newRide || newRide.departure_date < today) return;
        // Fetch full row with driver join so we have name + rating
        const { data } = await supabase
          .from('rides')
          .select('id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats, preferences, pickup_point, dropoff_point, note, payment_method, car_make, car_model, car_year, car_color, car_plate, driver:driver_id(name, avg_rating, total_trips), bookings(seats_requested, status)')
          .eq('id', newRide.id)
          .single();
        if (!data) return;
        const item = toRideItem(data);
        setAllRides(prev => {
          if (prev.some(r => r.id === item.id)) return prev;
          return [item, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides',
      }, (payload) => {
        const updated = payload.new as any;
        // Remove cancelled/completed rides live; re-fetch active ones
        if (updated.status !== 'active') {
          setAllRides(prev => prev.filter(r => r.id !== updated.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (allRides.length > 0 && (initialQuery?.from || initialQuery?.to)) {
      applySearch(initialQuery?.from ?? '', initialQuery?.to ?? '', initialQuery?.date ?? '');
    }
  }, [allRides]);

  const cityMatch = (stored: string, query: string) => {
    if (!query) return true;
    const sd = stripDiacritics(stored.toLowerCase());
    const qd = stripDiacritics(query.toLowerCase());
    return sd.includes(qd) || qd.includes(sd);
  };

  const applySearch = (f = from, t = to, d = date) => {
    const nf = normalizeCity(f);
    const nt = normalizeCity(t);
    const filtered = allRides.filter((r) => {
      const matchFrom = !nf || cityMatch(r.from, nf);
      const matchTo   = !nt || cityMatch(r.to,   nt);
      const matchDate = !d  || r.date === d;
      return matchFrom && matchTo && matchDate;
    });
    setResults(filtered);
  };

  // Fresh fetch + filter — called by the search button so new rides are always visible
  const searchNow = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    const today = new Date().toISOString().split('T')[0];

    const [ridesRes, bookingsRes] = await Promise.all([
      supabase
        .from('rides')
        .select('id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats, preferences, pickup_point, dropoff_point, note, payment_method, car_make, car_model, car_year, car_color, car_plate, driver:driver_id(name, avg_rating, total_trips), bookings(seats_requested, status)')
        .eq('status', 'active')
        .gte('departure_date', today)
        .order('departure_date', { ascending: true }),
      user
        ? supabase.from('bookings').select('ride_id').eq('passenger_id', user.id).in('status', ['pending', 'accepted'])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    if (ridesRes.error) { setDbError(ridesRes.error.message); setLoading(false); return; }

    const mapped = (ridesRes.data ?? []).map(toRideItem);
    setAllRides(mapped);
    setBookedRideIds(new Set((bookingsRes.data ?? []).map((b: any) => b.ride_id)));

    const nFrom = normalizeCity(from);
    const nTo   = normalizeCity(to);
    const filtered = mapped.filter((r) => {
      const matchFrom = !nFrom || cityMatch(r.from, nFrom);
      const matchTo   = !nTo   || cityMatch(r.to,   nTo);
      const matchDate = !date  || r.date === date;
      return matchFrom && matchTo && matchDate;
    });
    setResults(filtered);
    setLoading(false);
  }, [user, from, to, date]);

  const sorted = [...results].sort((a, b) => {
    if (sort === 'Cheapest')   return a.price - b.price;
    if (sort === 'Best rated') return b.driver.rating - a.driver.rating;
    if (sort === 'Most seats') return (b.seats - b.bookedSeats) - (a.seats - a.bookedSeats);
    return 0;
  });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>

      <View style={styles.formCard}>
        {/* From */}
        <CityPicker value={from} onSelect={setFrom} placeholder="Departure city" emoji="🟢" />

        {/* Use my location */}
        <Pressable style={styles.locLink} onPress={detectDeparture} disabled={locLoading}>
          <Text style={[styles.locLinkTxt, { color: C }]}>
            {locLoading ? '📍  Detecting…' : '📍  Use my current location'}
          </Text>
        </Pressable>
        {locError ? <Text style={styles.locError}>{locError}</Text> : null}

        {/* Swap */}
        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Pressable
            style={[styles.swapBtn, { borderColor: C + '40' }]}
            onPress={() => { const t = from; setFrom(to); setTo(t); }}>
            <Text style={{ fontSize: 13 }}>⇅</Text>
          </Pressable>
          <View style={styles.divLine} />
        </View>

        {/* To */}
        <CityPicker value={to} onSelect={setTo} placeholder="Destination city" emoji="🔴" />

        {/* Date + Seats + Search */}
        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <DateField value={date} onChange={setDate} />
          </View>
          <View style={[styles.seatsBox, { flex: 1 }]}>
            <Text>💺</Text>
            <TextInput
              style={styles.seatsInput} value={seats} onChangeText={setSeats}
              placeholder="Seats" placeholderTextColor="#94A3B8" keyboardType="numeric"
            />
          </View>
          <Pressable style={[styles.searchBtn, { backgroundColor: C }]} onPress={searchNow}>
            <Text style={{ color: '#fff', fontSize: 17 }}>🔍</Text>
          </Pressable>
        </View>
      </View>

      {dbError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Could not load rides: {dbError}</Text>
          <Pressable style={styles.retryBtn} onPress={loadRides}>
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={styles.resultsCount}>
            {sorted.length} trajet{sorted.length !== 1 ? 's' : ''} trouvé{sorted.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>En direct</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {onScanQR && (
            <Pressable onPress={onScanQR} style={[styles.refreshBtn, { backgroundColor: C + '15' }]}>
              <Text style={{ fontSize: 16 }}>📷</Text>
            </Pressable>
          )}
          <Pressable onPress={loadRides} style={styles.refreshBtn}>
            <Text style={styles.refreshTxt}>🔄</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {SORT_OPTIONS.map((s) => (
          <Pressable key={s} style={[styles.sortChip, sort === s && { backgroundColor: C, borderColor: C }]} onPress={() => setSort(s)}>
            <Text style={[styles.sortText, sort === s && { color: '#fff' }]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Loading rides…</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 52 }}>😕</Text>
          <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
          <Text style={styles.emptySub}>
            Aucun conducteur ne fait ce trajet pour le moment.
          </Text>

          {/* Suggest posting a request */}
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>Vous avez besoin de ce trajet ?</Text>
            <Text style={styles.emptyCardBody}>
              Publiez une demande et les conducteurs disponibles vous contacteront directement.
            </Text>
            <Pressable
              style={styles.emptyCardBtn}
              onPress={() => onNavigate('requests')}
            >
              <Text style={styles.emptyCardBtnTxt}>📋 Publier une demande</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        sorted.map((r) => (
          <RideCard
            key={r.id}
            ride={r}
            alreadyBooked={bookedRideIds.has(r.id)}
            onPress={() => {
              if (bookedRideIds.has(r.id)) {
                onNavigate('bookings');
              } else {
                onNavigate('ride-detail', r);
              }
            }}
          />
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 32 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  cityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cityBtnText: { flex: 1, fontSize: 15, color: '#94A3B8' },
  dropdown: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 8,
  },
  dropdownSearch: {
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  dropdownItemText: { fontSize: 15, color: '#1E293B' },
  dropdownEmpty: { padding: 14, color: '#94A3B8', textAlign: 'center' },

  locLink: { marginTop: -4, paddingLeft: 2 },
  locLinkTxt: { fontSize: 13, fontWeight: '600' },
  locError: { fontSize: 12, color: '#EF4444', paddingLeft: 2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  divLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  swapBtn: { padding: 6, borderRadius: 14, borderWidth: 1, backgroundColor: '#fff', marginHorizontal: 8, alignItems: 'center', justifyContent: 'center' },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  dateBtnText: { flex: 1, fontSize: 14, color: '#94A3B8' },
  doneBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  seatsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  seatsInput: { flex: 1, fontSize: 14, color: '#1E293B' },
  searchBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  errorText: { flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '500' },
  retryBtn: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  retryTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsCount: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  liveTxt: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  refreshBtn: { padding: 6 },
  refreshTxt: { fontSize: 18 },

  sortChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  sortText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 17, fontWeight: '800' },
  driverName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  ratingText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  price: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  priceSub: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeCity: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  routeLineBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  routeLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },

  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaIcon: { fontSize: 11 },
  metaText: { fontSize: 12, color: '#475569' },

  seatBarTrack: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
  seatBarFill: { height: '100%', borderRadius: 2 },

  prefRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  payBadgeText: { fontSize: 11, fontWeight: '700' },
  prefChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
  prefText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  bookBtn: { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  emptySub:   { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  emptyCard: {
    marginTop: 8, width: '100%',
    backgroundColor: '#EFF6FF', borderRadius: 18,
    borderWidth: 1, borderColor: '#BFDBFE',
    padding: 20, gap: 10, alignItems: 'center',
  },
  emptyCardTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  emptyCardBody:  { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20 },
  emptyCardBtn: {
    marginTop: 4, backgroundColor: '#3B82F6',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyCardBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

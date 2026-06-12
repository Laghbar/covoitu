import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RideItem } from '../passenger-dashboard';
import { QRScannerModal } from './qr-scanner';

const C = '#3B82F6';

const CITIES = [
  'Agadir','Aït Melloul','Al Hoceïma','Azilal','Azrou',
  'Béni Mellal','Benslimane','Berrechid','Bouskoura',
  'Casablanca','Chefchaouen',
  'Dakhla',
  'El Jadida','El Kelâa des Sraghna','Errachidia','Essaouira',
  'Fès','Fkih Ben Salah',
  'Guelmim',
  'Ifrane','Inzegane',
  'Kénitra','Khemisset','Khouribga','Ksar el-Kébir',
  'Laâyoune','Larache',
  'Marrakech','Meknès','Midelt','Mohammedia',
  'Nador',
  'Ouarzazate','Ouazzane','Oujda',
  'Rabat',
  'Safi','Salé','Settat','Sidi Bennour','Sidi Ifni','Sidi Slimane','Skhirate',
  'Tanger','Taroudant','Taza','Tétouan','Tiznit',
  'Zagora',
];

const RECENT = [
  { from: 'Casablanca', to: 'Rabat' },
  { from: 'Marrakech',  to: 'Agadir' },
  { from: 'Fès',        to: 'Meknès' },
];

export const FEATURED_RIDES: RideItem[] = [
  {
    id: '1', from: 'Casablanca', to: 'Rabat', date: '2026-06-15', time: '08:30',
    price: 45, seats: 3, bookedSeats: 1,
    driver: { name: 'Mohammed Alami', initial: 'M', rating: 4.8, trips: 142, memberSince: '2023', bio: 'Experienced driver, always on time.' },
    car: { make: 'Dacia', model: 'Logan', year: '2020', color: 'White', plate: '12348 A 5' },
    preferences: ['No Smoke', 'Music', 'A/C'],
    pickupPoint: 'Gare Routière Ouled Ziane', dropoffPoint: 'Agdal, Rabat',
    note: 'Please be on time.',
  },
  {
    id: '2', from: 'Casablanca', to: 'Rabat', date: '2026-06-15', time: '09:00',
    price: 40, seats: 3, bookedSeats: 0,
    driver: { name: 'Samira Benali', initial: 'S', rating: 4.9, trips: 87, memberSince: '2024', bio: 'Female driver. Calm and safe.' },
    car: { make: 'Renault', model: 'Clio', year: '2022', color: 'Grey', plate: '54321 B 2' },
    preferences: ['Luggage', 'A/C', 'Chatty'],
    pickupPoint: 'Maarif, Casablanca', dropoffPoint: 'Hassan, Rabat',
  },
];

// ─── City autocomplete (free text + suggestions) ──────────────────────────────
function CityPicker({
  value, onSelect, placeholder, emoji,
}: { value: string; onSelect: (c: string) => void; placeholder: string; emoji: string }) {
  const [focused,    setFocused]    = useState(false);
  const [inputText,  setInputText]  = useState(value);
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

// ─── Location card (state kept local — same pattern as driver home) ───────────
function LocationCard() {
  const [coords,  setCoords]  = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const detect = () => {
    setLoading(true);
    setError('');

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
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}&accept-language=en`,
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
            setAddress([city, data.address?.state, data.address?.country].filter(Boolean).join(', '));
          } catch {
            // coords were set; just can't resolve address name
            setAddress(`${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`);
          }
          setLoading(false);
        },
        (err) => {
          if (err.code === 1) setError('Location access denied. Allow it in your browser settings.');
          else if (err.code === 3) setError('Location request timed out. Try again.');
          else setError('Could not get location.');
          setLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: false },
      );
      return;
    }

    // Native
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') {
        setError('Location permission denied.');
        setLoading(false);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        const city  = geo?.city || geo?.subregion || geo?.region || '';
        setAddress([city, geo?.region, geo?.country].filter(Boolean).join(', '));
      } catch {
        setError('Could not get location. Try again.');
      }
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
        <View style={styles.locIconBox}>
          <Text style={{ fontSize: 22 }}>📍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locTitle}>Your Location</Text>
          {address
            ? <Text style={styles.locAddress}>{address}</Text>
            : error
              ? <Text style={styles.locError}>{error}</Text>
              : <Text style={styles.locHint}>{loading ? 'Detecting…' : 'Tap Detect to see where you are'}</Text>
          }
          {address && error ? <Text style={styles.locError}>{error}</Text> : null}
        </View>
        <Pressable
          style={[styles.locDetectBtn, { backgroundColor: coords ? '#F1F5F9' : C }]}
          onPress={detect}
          disabled={loading}>
          <Text style={[styles.locDetectTxt, { color: coords ? '#64748B' : '#fff' }]}>
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

// ─── Mini ride card ───────────────────────────────────────────────────────────
function MiniRideCard({ ride, onPress }: { ride: RideItem; onPress: () => void }) {
  const available = ride.seats - ride.bookedSeats;
  return (
    <Pressable style={styles.miniCard} onPress={onPress}>
      <View style={[styles.miniAvatar, { backgroundColor: C + '18' }]}>
        <Text style={[styles.miniInitial, { color: C }]}>{ride.driver.initial}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.miniRoute}>{ride.from} → {ride.to}</Text>
        <Text style={styles.miniMeta}>⭐ {ride.driver.rating} · 🕐 {ride.time} · 💺 {available} left</Text>
      </View>
      <View style={[styles.miniPrice, { backgroundColor: C }]}>
        <Text style={styles.miniPriceText}>{ride.price} MAD</Text>
      </View>
    </Pressable>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type Props = { onNavigate: (key: string, payload?: any) => void };

export function PassengerHome({ onNavigate }: Props) {
  const [from,        setFrom]        = useState('');
  const [to,          setTo]          = useState('');
  const [date,        setDate]        = useState('');
  const [seats,       setSeats]       = useState('1');
  const [locLoading,  setLocLoading]  = useState(false);
  const [locError,    setLocError]    = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const detectDeparture = () => {
    setLocLoading(true);
    setLocError('');

    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        setLocError('Geolocation not supported.');
        setLocLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res  = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=en`,
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
            if (city) {
              setFrom(city);
            } else {
              setLocError('City not detected. Please type it manually.');
            }
          } catch {
            setLocError('Could not fetch city name. Please type it manually.');
          }
          setLocLoading(false);
        },
        (err) => {
          if (err.code === 1) setLocError('Location access denied. Allow it in your browser.');
          else setLocError('Could not get location. Try again.');
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
      } catch {
        setLocError('Could not get location.');
      }
      setLocLoading(false);
    });
  };

  const search = () => onNavigate('search', { from, to, date, seats });

  return (
    <>
    <QRScannerModal
      visible={showScanner}
      onClose={() => setShowScanner(false)}
      onSelectRide={(ride) => { setShowScanner(false); onNavigate('ride-detail', ride); }}
    />
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Search card */}
      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>🚗  Find a Ride</Text>

        <CityPicker value={from} onSelect={setFrom} placeholder="Departure city" emoji="🟢" />

        <Pressable style={styles.locLink} onPress={detectDeparture} disabled={locLoading}>
          <Text style={[styles.locLinkTxt, { color: locLoading ? '#94A3B8' : C }]}>
            {locLoading ? '📍  Detecting…' : '📍  Use my current location'}
          </Text>
        </Pressable>
        {locError ? <Text style={styles.locErrInline}>{locError}</Text> : null}

        <View style={styles.swapRow}>
          <View style={styles.swapLine} />
          <Pressable
            style={[styles.swapBtn, { borderColor: C + '40' }]}
            onPress={() => { const t = from; setFrom(to); setTo(t); }}>
            <Text style={{ fontSize: 14 }}>⇅</Text>
          </Pressable>
          <View style={styles.swapLine} />
        </View>

        <CityPicker value={to} onSelect={setTo} placeholder="Destination city" emoji="🔴" />

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
        </View>

        <Pressable style={[styles.searchBtn, { backgroundColor: C }]} onPress={search}>
          <Text style={styles.searchBtnText}>🔍  Search Rides</Text>
        </Pressable>
      </View>

      {/* QR Driver Finder */}
      <Pressable style={styles.qrBanner} onPress={() => setShowScanner(true)}>
        <View style={styles.qrBannerIcon}>
          <Text style={{ fontSize: 24 }}>📷</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.qrBannerTitle}>Find a Driver by QR Code</Text>
          <Text style={styles.qrBannerSub}>Scan a driver's QR code to see their rides instantly</Text>
        </View>
        <Text style={{ color: C, fontSize: 18 }}>›</Text>
      </Pressable>

      {/* Recent searches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Searches</Text>
        <View style={styles.chips}>
          {RECENT.map((r, i) => (
            <Pressable key={i} style={styles.chip}
              onPress={() => onNavigate('search', { from: r.from, to: r.to, date: '', seats: '1' })}>
              <Text style={styles.chipText}>🕐  {r.from} → {r.to}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Location card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Location</Text>
        <LocationCard />
      </View>

      {/* Popular routes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Routes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {[
            { from: 'Casablanca', to: 'Rabat',      price: 40 },
            { from: 'Casablanca', to: 'Marrakech',  price: 110 },
            { from: 'Rabat',      to: 'Fès',        price: 80 },
            { from: 'Tanger',     to: 'Casablanca', price: 130 },
          ].map((r, i) => (
            <Pressable key={i} style={styles.routeChip}
              onPress={() => onNavigate('search', { from: r.from, to: r.to, date: '', seats: '1' })}>
              <Text style={styles.routeChipText}>{r.from} → {r.to}</Text>
              <Text style={[styles.routeChipPrice, { color: C }]}>from {r.price} MAD</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Featured rides */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Available Now</Text>
          <Pressable onPress={() => onNavigate('search')}>
            <Text style={[styles.seeAll, { color: C }]}>See all →</Text>
          </Pressable>
        </View>
        {FEATURED_RIDES.map((r) => (
          <MiniRideCard key={r.id} ride={r} onPress={() => onNavigate('ride-detail', r)} />
        ))}
      </View>

    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },

  searchCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  searchTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },

  qrBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C + '10', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C + '25',
  },
  qrBannerIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C + '20', alignItems: 'center', justifyContent: 'center',
  },
  qrBannerTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  qrBannerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

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

  locLink: { paddingLeft: 2, marginTop: -4 },
  locLinkTxt: { fontSize: 13, fontWeight: '600' },
  locErrInline: { fontSize: 12, color: '#EF4444', paddingLeft: 2 },

  swapRow: { flexDirection: 'row', alignItems: 'center' },
  swapLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  swapBtn: {
    padding: 8, borderRadius: 18, borderWidth: 1,
    backgroundColor: '#fff', marginHorizontal: 8, alignItems: 'center', justifyContent: 'center',
  },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  dateBtnText: { flex: 1, fontSize: 14, color: '#94A3B8' },
  doneBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  row: { flexDirection: 'row', gap: 10 },
  seatsBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  seatsInput: { flex: 1, fontSize: 14, color: '#1E293B' },

  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  locCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  locTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  locTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  locAddress: { fontSize: 13, color: '#64748B', marginTop: 2 },
  locHint: { fontSize: 13, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' },
  locError: { fontSize: 12, color: '#EF4444', marginTop: 2, flexShrink: 1 },
  locDetectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  locDetectTxt: { fontSize: 13, fontWeight: '700' },
  locCoords: { fontSize: 11, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mapsBtn: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  mapsBtnTxt: { fontSize: 13, fontWeight: '600', color: C },

  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  seeAll: { fontSize: 13, fontWeight: '600' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },

  routeChip: { backgroundColor: '#fff', borderRadius: 14, padding: 14, minWidth: 150, gap: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  routeChipText: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  routeChipPrice: { fontSize: 12, fontWeight: '500' },

  miniCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  miniAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  miniInitial: { fontSize: 16, fontWeight: '700' },
  miniRoute: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  miniMeta: { fontSize: 12, color: '#64748B' },
  miniPrice: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5 },
  miniPriceText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

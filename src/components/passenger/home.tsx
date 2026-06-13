import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { QRScannerModal } from './qr-scanner';

const C = '#3B82F6';

const CITIES = [
  'Agadir','Aït Melloul','Al Hoceïma','Azilal','Azrou',
  'Béni Mellal','Benslimane','Berrechid','Bouskoura',
  'Casablanca','Chefchaouen','Dakhla',
  'El Jadida','El Kelâa des Sraghna','Errachidia','Essaouira',
  'Fès','Fkih Ben Salah','Guelmim','Ifrane','Inzegane',
  'Kénitra','Khemisset','Khouribga','Ksar el-Kébir',
  'Laâyoune','Larache','Marrakech','Meknès','Midelt','Mohammedia',
  'Nador','Ouarzazate','Ouazzane','Oujda','Rabat',
  'Safi','Salé','Settat','Sidi Bennour','Sidi Ifni','Sidi Slimane',
  'Tanger','Taroudant','Taza','Tétouan','Tiznit','Zagora',
];

const POPULAR_ROUTES = [
  { from: 'Casablanca', to: 'Rabat',      price: 40 },
  { from: 'Casablanca', to: 'Marrakech',  price: 110 },
  { from: 'Rabat',      to: 'Fès',        price: 80 },
  { from: 'Tanger',     to: 'Casablanca', price: 130 },
  { from: 'Marrakech',  to: 'Agadir',     price: 70 },
];

// ─── City autocomplete ────────────────────────────────────────────────────────

function CityInput({
  value, onSelect, placeholder, dot,
}: { value: string; onSelect: (c: string) => void; placeholder: string; dot: 'filled' | 'outline' }) {
  const [focused,   setFocused]   = useState(false);
  const [inputText, setInputText] = useState(value);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { setInputText(value); }, [value]);

  const suggestions  = inputText.length >= 1
    ? CITIES.filter(c => c.toLowerCase().includes(inputText.toLowerCase())).slice(0, 6)
    : [];
  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={{ zIndex: showDropdown ? 200 : 1 }}>
      <Pressable
        style={[s.fieldRow, focused && s.fieldRowFocused]}
        onPress={() => inputRef.current?.focus()}
      >
        {/* Radio-style dot */}
        <View style={[s.dot, dot === 'filled' ? s.dotFilled : s.dotOutline]}>
          {dot === 'filled' && <View style={s.dotInner} />}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>{dot === 'filled' ? 'Départ' : 'Destination'}</Text>
          <TextInput
            ref={inputRef}
            style={s.fieldInput}
            value={inputText}
            onChangeText={t => { setInputText(t); onSelect(t); }}
            placeholder={`Entrez votre ${placeholder.toLowerCase()}`}
            placeholderTextColor="#CBD5E1"
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
          />
        </View>

        {inputText.length > 0 && (
          <Pressable onPress={() => { setInputText(''); onSelect(''); }}>
            <Text style={s.clearBtn}>✕</Text>
          </Pressable>
        )}
      </Pressable>

      {showDropdown && (
        <View
          style={s.dropdown}
          {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
        >
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map(c => (
              <Pressable
                key={c}
                style={[s.dropItem, c === inputText && { backgroundColor: C + '10' }]}
                onPress={() => { setInputText(c); onSelect(c); setFocused(false); }}
              >
                <Text style={[s.dropItemTxt, c === inputText && { color: C, fontWeight: '700' }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Date button ──────────────────────────────────────────────────────────────

function DateBtn({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [show, setShow] = useState(false);
  const today   = new Date().toISOString().split('T')[0];
  const dateObj = value ? new Date(value + 'T12:00:00') : new Date();
  const isToday = value === today;
  const label   = isToday
    ? "Aujourd'hui"
    : new Date(value + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

  if (Platform.OS === 'web') {
    return (
      <View style={s.dateRow}>
        <Text style={s.dateTxt}>{label}</Text>
        {/* @ts-ignore */}
        <input
          type="date"
          value={value || ''}
          min={today}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            border: '1.5px solid #BFDBFE',
            borderRadius: 10,
            padding: '7px 10px',
            fontSize: 13,
            fontWeight: 600,
            color: '#1E293B',
            background: '#EFF6FF',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      </View>
    );
  }

  return (
    <>
      <View style={s.dateRow}>
        <Text style={s.dateTxt}>{label}</Text>
        <Pressable style={s.dateIconBtn} onPress={() => setShow(true)}>
          <Text style={{ fontSize: 20 }}>📅</Text>
        </Pressable>
      </View>
      {show && (
        <DateTimePicker
          value={dateObj} mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_e, d) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (d) onChange(d.toISOString().split('T')[0]);
          }}
        />
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = { onNavigate: (key: string, payload?: any) => void };

export function PassengerHome({ onNavigate }: Props) {
  const { user }  = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'vous';

  const [from,      setFrom]  = useState('');
  const [to,        setTo]    = useState('');
  const [date,      setDate]  = useState(new Date().toISOString().split('T')[0]);
  const [seats,     setSeats] = useState(1);
  const [detecting,  setDetecting]  = useState(false);
  const [showScanner,setShowScanner]= useState(false);

  const detectCity = async () => {
    setDetecting(true);
    try {
      if (Platform.OS === 'web') {
        if (!('geolocation' in navigator)) return;
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(async ({ coords: c }) => {
            try {
              const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}&accept-language=fr`);
              const data = await res.json();
              const city = data.address?.city || data.address?.town || data.address?.village || '';
              if (city) setFrom(city);
            } catch {}
            resolve();
          }, () => resolve(), { timeout: 8000 });
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [geo] = await Location.reverseGeocodeAsync(pos.coords);
          const city  = geo?.city || geo?.subregion || geo?.region || '';
          if (city) setFrom(city);
        }
      }
    } finally {
      setDetecting(false);
    }
  };

  const search = () => {
    onNavigate('search', { from, to, date, seats: String(seats) });
  };

  return (
    <>
      <QRScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onDriverFound={(driverId: string) => { onNavigate('driver-profile', driverId); }}
      />

      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Greeting ── */}
        <View style={s.greeting}>
          <Text style={s.greetSub}>Bonjour, {firstName} !</Text>
          <Text style={s.greetTitle}>Voyagez ensemble,{'\n'}économisez ensemble</Text>
        </View>

        {/* ── Search card ── */}
        <View style={s.card}>

          {/* Departure */}
          <CityInput value={from} onSelect={setFrom} placeholder="Départ" dot="filled" />

          <View style={s.divider} />

          {/* Destination */}
          <CityInput value={to} onSelect={setTo} placeholder="Destination" dot="outline" />

          <View style={s.divider} />

          {/* Swap + detect */}
          <View style={s.actionsRow}>
            <Pressable style={s.actionChip} onPress={() => { const t = from; setFrom(to); setTo(t); }}>
              <Text style={s.actionChipTxt}>⇅ Inverser</Text>
            </Pressable>
            <Pressable style={s.actionChip} onPress={detectCity} disabled={detecting}>
              <Text style={s.actionChipTxt}>{detecting ? '⌛ Détection…' : '📍 Ma position'}</Text>
            </Pressable>
          </View>

          <View style={s.divider} />

          {/* Date */}
          <View style={s.dateRowWrap}>
            <DateBtn value={date} onChange={setDate} />
          </View>

          <View style={s.divider} />

          {/* Passengers */}
          <View style={s.seatsRow}>
            <Text style={s.seatsIcon}>👤</Text>
            <Pressable style={s.seatsBtn} onPress={() => setSeats(Math.max(1, seats - 1))}>
              <Text style={s.seatsBtnTxt}>−</Text>
            </Pressable>
            <Text style={s.seatsCount}>{seats}</Text>
            <Pressable style={s.seatsBtn} onPress={() => setSeats(Math.min(8, seats + 1))}>
              <Text style={s.seatsBtnTxt}>+</Text>
            </Pressable>
            <Text style={s.seatsTxt}>{seats === 1 ? 'passager' : 'passagers'}</Text>
          </View>

          {/* Search button */}
          <Pressable style={s.searchBtn} onPress={search}>
            <Text style={s.searchBtnTxt}>Rechercher</Text>
          </Pressable>
        </View>

        {/* ── QR Scanner ── */}
        <Pressable style={s.qrBanner} onPress={() => setShowScanner(true)}>
          <View style={s.qrIcon}><Text style={{ fontSize: 22 }}>📷</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.qrTitle}>Trouver un conducteur par QR</Text>
            <Text style={s.qrSub}>Scannez le QR d'un conducteur pour voir ses trajets</Text>
          </View>
          <Text style={[s.qrArrow, { color: C }]}>›</Text>
        </Pressable>


      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F0F4FF' },
  content: { padding: 20, gap: 20, paddingBottom: 40 },

  // Greeting
  greeting: { gap: 6, paddingTop: 4 },
  greetSub:   { fontSize: 15, color: '#64748B', fontWeight: '500' },
  greetTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', lineHeight: 34, letterSpacing: -0.5 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C,
    overflow: 'visible',
    shadowColor: C,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },

  // Field rows
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  fieldRowFocused: {
    backgroundColor: '#F0F6FF',
  },
  dot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  dotFilled:  { backgroundColor: '#1E293B' },
  dotOutline: { borderWidth: 2, borderColor: '#94A3B8' },
  dotInner:   { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fieldInput: { fontSize: 15, color: '#1E293B', fontWeight: '600', paddingVertical: 0, minHeight: 22 },
  clearBtn:   { fontSize: 16, color: '#CBD5E1', paddingHorizontal: 6, paddingVertical: 4 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 18 },

  // Actions (swap + detect)
  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  actionChipTxt: { fontSize: 12, fontWeight: '600', color: '#475569' },

  // Date
  dateRowWrap: { paddingHorizontal: 18, paddingVertical: 4 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
  },
  dateTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1E293B', textTransform: 'capitalize' },
  dateIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },

  // Seats
  seatsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  seatsIcon:  { fontSize: 18, color: '#64748B' },
  seatsBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  seatsBtnTxt: { fontSize: 18, color: '#475569', lineHeight: 22 },
  seatsCount:  { fontSize: 16, fontWeight: '700', color: '#1E293B', minWidth: 20, textAlign: 'center' },
  seatsTxt:    { fontSize: 14, color: '#64748B' },

  // Search button
  searchBtn: {
    backgroundColor: C,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  searchBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  // QR banner
  qrBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  qrIcon:  { width: 48, height: 48, borderRadius: 14, backgroundColor: C + '15', alignItems: 'center', justifyContent: 'center' },
  qrTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  qrSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  qrArrow: { fontSize: 22, fontWeight: '300' },

  // Sections
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },

  // Route cards
  routeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    minWidth: 160, gap: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  routeFrom:  { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  routeArrow: { fontSize: 12, color: '#94A3B8' },
  routeTo:    { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  routePrice: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  // Tip
  tip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  tipIcon: { fontSize: 16 },
  tipTxt:  { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 20 },

  // Dropdown
  dropdown: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden', marginTop: 4, marginHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
    position: 'absolute', left: 0, right: 0, top: '100%',
  },
  dropItem: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  dropItemTxt: { fontSize: 14, color: '#1E293B' },
});

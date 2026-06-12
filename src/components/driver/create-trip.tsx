import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES, normalizeCity } from '@/lib/cities';

const C = '#10B981';

const PREFS = [
  { key: 'luggage',  label: 'Luggage',    icon: { ios: 'bag.fill',       android: 'luggage' } },
  { key: 'pets',     label: 'Pets OK',    icon: { ios: 'pawprint.fill',  android: 'pets' } },
  { key: 'nosmoke',  label: 'No Smoke',   icon: { ios: 'nosign',         android: 'smoke_free' } },
  { key: 'music',    label: 'Music',      icon: { ios: 'music.note',     android: 'music_note' } },
  { key: 'ac',       label: 'A/C',        icon: { ios: 'snowflake',      android: 'ac_unit' } },
  { key: 'chat',     label: 'Chatty',     icon: { ios: 'bubble.left.fill', android: 'chat' } },
];

function CityPicker({ label, value, onSelect, icon }: {
  label: string; value: string; onSelect: (c: string) => void;
  icon: { ios: string; android: string };
}) {
  const [text,    setText]    = useState(value);
  const [focused, setFocused] = useState(false);
  const selecting = useRef(false);

  // Keep display in sync when parent sets value externally (e.g. GPS detect)
  const prevValue = useRef(value);
  if (value !== prevValue.current) {
    prevValue.current = value;
    if (value !== text) setText(value);
  }

  const suggestions = text.length >= 1
    ? MOROCCAN_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 8)
    : MOROCCAN_CITIES.slice(0, 8);
  const showDropdown = focused && suggestions.length > 0;

  const commit = (city: string) => {
    setText(city);
    onSelect(normalizeCity(city));
    setFocused(false);
  };

  return (
    <View style={{ zIndex: showDropdown ? 200 : 1 }}>
      <View style={styles.cityBtn}>
        <SymbolView name={icon as any} size={16} tintColor={text ? C : '#94A3B8'} />
        <TextInput
          style={[styles.cityBtnText, { flex: 1, padding: 0, color: text ? '#1E293B' : '#94A3B8' }]}
          value={text}
          onChangeText={(t) => { setText(t); onSelect(t); }}
          placeholder={label}
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (selecting.current) { selecting.current = false; return; }
            setTimeout(() => setFocused(false), 150);
          }}
        />
        {text.length > 0 && (
          <Pressable onPress={() => { setText(''); onSelect(''); }}>
            <Text style={{ color: '#CBD5E1', fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View
          style={styles.cityDropdown}
          {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
        >
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map((c) => (
              <Pressable
                key={c}
                style={[styles.cityOption, value === c && { backgroundColor: C + '10' }]}
                onPressIn={() => { selecting.current = true; }}
                onPress={() => commit(c)}
              >
                <Text style={[styles.cityOptionText, value === c && { color: C, fontWeight: '700' }]}>{c}</Text>
                {value === c && <SymbolView name={{ ios: 'checkmark', android: 'check' } as any} size={14} tintColor={C} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function StepHeader({ num, title }: { num: number; title: string }) {
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepNum, { backgroundColor: C }]}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function PickerField({
  icon, emoji, label, value, onPress,
}: { icon: any; emoji: string; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.pickerBtn} onPress={onPress}>
      <SymbolView name={icon} size={16} tintColor={value ? C : '#94A3B8'} />
      <Text style={[styles.pickerText, value ? styles.pickerTextFilled : null]}>
        {emoji} {value || label}
      </Text>
      <Text style={styles.chevron}>▾</Text>
    </Pressable>
  );
}

function WebField({ emoji, label, type, value, min, onChange }: {
  emoji: string; label: string; type: 'date' | 'time';
  value: string; min?: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.pickerBtn}>
      <Text style={styles.pickerEmoji}>{emoji}</Text>
      {/* @ts-ignore – web-only HTML element */}
      <input
        type={type}
        value={value || ''}
        min={min}
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

type Props = { onNavigate: (key: string) => void };

export function DriverCreateTrip({ onNavigate }: Props) {
  const { user } = useAuth();
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [timeObj, setTimeObj] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [seats, setSeats]     = useState('3');
  const [price, setPrice]     = useState('');
  const [pickup, setPickup]   = useState('');
  const [dropoff, setDropoff] = useState('');
  const [note, setNote]       = useState('');
  const [carMake,  setCarMake]  = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear,  setCarYear]  = useState('');
  const [carColor, setCarColor] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [prefs, setPrefs]     = useState(['luggage', 'nosmoke']);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const applyCity = (raw: string) => {
    setFrom(normalizeCity(raw));
  };

  const detectDeparture = () => {
    setLocLoading(true);
    setSubmitError(null);

    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        setSubmitError('Geolocation not supported by this browser.');
        setLocLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res  = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
              { headers: { 'Accept-Language': 'en' } },
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            if (city) applyCity(city);
            else setSubmitError('City not detected. Please select manually.');
          } catch {
            setSubmitError('Could not fetch city. Please select manually.');
          }
          setLocLoading(false);
        },
        () => {
          setSubmitError('Location denied. Allow location access in your browser and try again.');
          setLocLoading(false);
        },
        { timeout: 10000 },
      );
      return;
    }

    // Native (iOS / Android)
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') {
        setSubmitError('Location permission denied.');
        setLocLoading(false);
        return;
      }
      try {
        const pos   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        const raw   = geo?.city || geo?.subregion || geo?.region || '';
        if (raw) applyCity(raw);
        else setSubmitError('Could not detect city. Select manually.');
      } catch {
        setSubmitError('Location unavailable. Select manually.');
      }
      setLocLoading(false);
    });
  };
  const [datePicked, setDatePicked] = useState(false);
  const [timePicked, setTimePicked] = useState(false);

  const dateStr = datePicked
    ? dateObj.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const timeStr = timePicked
    ? timeObj.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const dateISO = datePicked ? dateObj.toISOString().split('T')[0] : '';
  const timeISO = timePicked
    ? `${String(timeObj.getHours()).padStart(2,'0')}:${String(timeObj.getMinutes()).padStart(2,'0')}`
    : '';

  const toggle = (k: string) =>
    setPrefs((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);

  const changeSeats = (d: number) =>
    setSeats((s) => String(Math.min(8, Math.max(1, Number(s) + d))));

  const submit = async () => {
    setSubmitError(null);
    if (!from || !to || !datePicked || !timePicked || !price) {
      setSubmitError('Please fill in route, date, time and price.');
      return;
    }
    if (!user) { setSubmitError('Not logged in.'); return; }

    setLoading(true);
    const { error } = await supabase.from('rides').insert({
      driver_id:       user.id,
      from_city:       normalizeCity(from),
      to_city:         normalizeCity(to),
      departure_date:  dateISO,
      departure_time:  timeISO,
      seats:           Number(seats),
      price:           Number(price),
      pickup_point:    pickup || null,
      dropoff_point:   dropoff || null,
      preferences:     prefs,
      note:            note || null,
      status:          'active',
      car_make:        carMake  || null,
      car_model:       carModel || null,
      car_year:        carYear  || null,
      car_color:       carColor || null,
      car_plate:       carPlate || null,
    });
    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    onNavigate('rides');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>Create a Trip</Text>
      <Text style={styles.pageSub}>Fill in the details so passengers can find and book your ride.</Text>

      {/* Step 1 – Route */}
      <View style={styles.card}>
        <StepHeader num={1} title="Route" />

        <CityPicker
          label="Departure city *"
          value={from}
          onSelect={setFrom}
          icon={{ ios: 'location.fill', android: 'location_on' }}
        />

        <Pressable style={styles.locBtn} onPress={detectDeparture} disabled={locLoading}>
          <Text style={styles.locBtnText}>{locLoading ? 'Detecting…' : '📍  Use my current location'}</Text>
        </Pressable>

        {/* Swap */}
        <View style={styles.swapRow}>
          <View style={styles.swapLine} />
          <Pressable
            style={[styles.swapBtn, { borderColor: C + '50' }]}
            onPress={() => { const t = from; setFrom(to); setTo(t); }}>
            <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert' } as any} size={14} tintColor={C} />
          </Pressable>
          <View style={styles.swapLine} />
        </View>

        <CityPicker
          label="Destination city *"
          value={to}
          onSelect={setTo}
          icon={{ ios: 'mappin', android: 'place' }}
        />
      </View>

      {/* Step 2 – Date & Time */}
      <View style={styles.card}>
        <StepHeader num={2} title="Date & Time" />
        <View style={styles.row}>
          <View style={{ flex: 3 }}>
            {Platform.OS === 'web' ? (
              <WebField
                emoji="📅" label="Date *" type="date" value={dateISO}
                min={new Date().toISOString().split('T')[0]}
                onChange={(v) => {
                  if (v) { setDateObj(new Date(v + 'T12:00:00')); setDatePicked(true); }
                }}
              />
            ) : (
              <PickerField
                icon={{ ios: 'calendar', android: 'calendar_today' } as any}
                emoji="📅" label="Pick a date *" value={dateStr}
                onPress={() => setShowDate(true)}
              />
            )}
          </View>
          <View style={{ flex: 2 }}>
            {Platform.OS === 'web' ? (
              <WebField
                emoji="⏰" label="Time *" type="time" value={timeISO}
                onChange={(v) => {
                  if (v) {
                    const [h, m] = v.split(':').map(Number);
                    const t = new Date(); t.setHours(h, m, 0, 0);
                    setTimeObj(t); setTimePicked(true);
                  }
                }}
              />
            ) : (
              <PickerField
                icon={{ ios: 'clock.fill', android: 'schedule' } as any}
                emoji="⏰" label="Pick time *" value={timeStr}
                onPress={() => setShowTime(true)}
              />
            )}
          </View>
        </View>

        {/* Native date picker (iOS / Android only) */}
        {Platform.OS !== 'web' && showDate && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_e, d) => {
              if (Platform.OS !== 'ios') setShowDate(false);
              if (d) { setDateObj(d); setDatePicked(true); }
            }}
            themeVariant="light"
          />
        )}
        {Platform.OS === 'ios' && showDate && (
          <Pressable style={[styles.doneBtn, { backgroundColor: C }]} onPress={() => setShowDate(false)}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        )}

        {/* Native time picker (iOS / Android only) */}
        {Platform.OS !== 'web' && showTime && (
          <DateTimePicker
            value={timeObj}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            onChange={(_e, t) => {
              if (Platform.OS !== 'ios') setShowTime(false);
              if (t) { setTimeObj(t); setTimePicked(true); }
            }}
            themeVariant="light"
          />
        )}
        {Platform.OS === 'ios' && showTime && (
          <Pressable style={[styles.doneBtn, { backgroundColor: C }]} onPress={() => setShowTime(false)}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        )}
      </View>

      {/* Step 3 – Seats & Price */}
      <View style={styles.card}>
        <StepHeader num={3} title="Seats & Price" />
        <View style={styles.row}>
          {/* Seats stepper */}
          <View style={[styles.stepper, { flex: 1 }]}>
            <Text style={styles.stepperLabel}>Available seats</Text>
            <View style={styles.stepperRow}>
              <Pressable style={[styles.stepperBtn, { borderColor: C }]} onPress={() => changeSeats(-1)}>
                <Text style={[styles.stepperBtnText, { color: C }]}>−</Text>
              </Pressable>
              <Text style={styles.stepperVal}>{seats}</Text>
              <Pressable style={[styles.stepperBtn, { borderColor: C }]} onPress={() => changeSeats(1)}>
                <Text style={[styles.stepperBtnText, { color: C }]}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Price */}
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Text style={styles.currency}>MAD</Text>
            <TextInput
              style={styles.inputText}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="Price *"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
        {price ? (
          <View style={[styles.estimateBanner, { backgroundColor: C + '10' }]}>
            <SymbolView name={{ ios: 'info.circle.fill', android: 'info' } as any} size={14} tintColor={C} />
            <Text style={[styles.estimateText, { color: C }]}>
              Estimated revenue: {Number(price) * Number(seats)} MAD if fully booked
            </Text>
          </View>
        ) : null}
      </View>

      {/* Step 4 – Meeting points */}
      <View style={styles.card}>
        <StepHeader num={4} title="Meeting Points" />
        <View style={styles.inputBox}>
          <SymbolView name={{ ios: 'arrow.up.circle.fill', android: 'trip_origin' } as any} size={16} tintColor={C} />
          <TextInput style={styles.inputText} value={pickup} onChangeText={setPickup} placeholder="Pickup point (street, landmark…)" placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.inputBox}>
          <SymbolView name={{ ios: 'arrow.down.circle.fill', android: 'place' } as any} size={16} tintColor="#EF4444" />
          <TextInput style={styles.inputText} value={dropoff} onChangeText={setDropoff} placeholder="Drop-off point (street, landmark…)" placeholderTextColor="#94A3B8" />
        </View>
      </View>

      {/* Step 5 – Vehicle */}
      <View style={styles.card}>
        <StepHeader num={5} title="Your Vehicle" />
        <View style={styles.row}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={15} tintColor={carMake ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carMake} onChangeText={setCarMake} placeholder="Make (e.g. Dacia)" placeholderTextColor="#94A3B8" />
          </View>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'car.side.fill', android: 'commute' } as any} size={15} tintColor={carModel ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carModel} onChangeText={setCarModel} placeholder="Model (e.g. Logan)" placeholderTextColor="#94A3B8" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={15} tintColor={carYear ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carYear} onChangeText={setCarYear} placeholder="Year" placeholderTextColor="#94A3B8" keyboardType="numeric" maxLength={4} />
          </View>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'paintpalette.fill', android: 'palette' } as any} size={15} tintColor={carColor ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carColor} onChangeText={setCarColor} placeholder="Color" placeholderTextColor="#94A3B8" />
          </View>
        </View>
        <View style={styles.inputBox}>
          <SymbolView name={{ ios: 'number.square.fill', android: 'confirmation_number' } as any} size={15} tintColor={carPlate ? C : '#94A3B8'} />
          <TextInput style={styles.inputText} value={carPlate} onChangeText={setCarPlate} placeholder="Plate number (e.g. 12345 A 5)" placeholderTextColor="#94A3B8" autoCapitalize="characters" />
        </View>
      </View>

      {/* Step 6 – Preferences */}
      <View style={styles.card}>
        <StepHeader num={6} title="Preferences" />
        <View style={styles.prefGrid}>
          {PREFS.map((p) => {
            const on = prefs.includes(p.key);
            return (
              <Pressable
                key={p.key}
                style={[styles.prefChip, on && { backgroundColor: C + '12', borderColor: C }]}
                onPress={() => toggle(p.key)}>
                <SymbolView name={p.icon as any} size={14} tintColor={on ? C : '#94A3B8'} />
                <Text style={[styles.prefLabel, on && { color: C }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Step 7 – Note */}
      <View style={styles.card}>
        <StepHeader num={7} title="Note for passengers (optional)" />
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Meeting at the main entrance. I drive calmly and I'm punctual."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Inline error */}
      {submitError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}

      {/* Publish */}
      <Pressable style={[styles.publishBtn, { backgroundColor: loading ? C + '80' : C }]} onPress={submit} disabled={loading}>
        <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle' } as any} size={20} tintColor="#fff" />
        <Text style={styles.publishText}>{loading ? 'Publishing…' : 'Publish Trip'}</Text>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, color: '#64748B', marginTop: -8 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },

  cityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cityBtnText: { flex: 1, fontSize: 15, color: '#94A3B8' },
  cityDropdown: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden', marginTop: -4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  cityOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  cityOptionText: { fontSize: 15, color: '#1E293B' },

  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swapLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  swapBtn: { padding: 8, borderRadius: 20, borderWidth: 1, backgroundColor: '#F8FAFC' },

  row: { flexDirection: 'row', gap: 10 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputText: { flex: 1, fontSize: 14, color: '#1E293B' },
  currency: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  stepper: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  stepperLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  stepperVal: { fontSize: 20, fontWeight: '800', color: '#1E293B', minWidth: 24, textAlign: 'center' },

  estimateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  estimateText: { fontSize: 13, fontWeight: '500', flex: 1 },

  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  prefLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  noteInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: '#1E293B',
    minHeight: 80, textAlignVertical: 'top',
  },

  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 16,
  },
  publishText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  pickerText: { flex: 1, fontSize: 14, color: '#94A3B8' },
  pickerTextFilled: { color: '#1E293B', fontWeight: '600' },
  pickerEmoji: { fontSize: 16 },
  chevron: { fontSize: 13, color: '#94A3B8' },

  doneBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },

  locBtn: { alignSelf: 'flex-start' },
  locBtnText: { fontSize: 13, color: C, fontWeight: '600' },
});

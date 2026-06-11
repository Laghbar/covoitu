import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const C = '#10B981';

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Agadir', 'Fès', 'Tanger', 'Meknès', 'Oujda', 'Tétouan', 'Laâyoune'];

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
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable style={styles.cityBtn} onPress={() => setOpen(!open)}>
        <SymbolView name={icon as any} size={16} tintColor={value ? C : '#94A3B8'} />
        <Text style={[styles.cityBtnText, value && { color: '#1E293B', fontWeight: '600' }]}>
          {value || label}
        </Text>
        <SymbolView name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'expand_less' : 'expand_more' } as any} size={14} tintColor="#94A3B8" />
      </Pressable>
      {open && (
        <View style={styles.cityDropdown}>
          {CITIES.map((c) => (
            <Pressable key={c} style={[styles.cityOption, value === c && { backgroundColor: C + '10' }]} onPress={() => { onSelect(c); setOpen(false); }}>
              <Text style={[styles.cityOptionText, value === c && { color: C, fontWeight: '700' }]}>{c}</Text>
              {value === c && <SymbolView name={{ ios: 'checkmark', android: 'check' } as any} size={14} tintColor={C} />}
            </Pressable>
          ))}
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

type Props = { onNavigate: (key: string) => void };

export function DriverCreateTrip({ onNavigate }: Props) {
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [date, setDate]       = useState('');
  const [time, setTime]       = useState('');
  const [seats, setSeats]     = useState('3');
  const [price, setPrice]     = useState('');
  const [pickup, setPickup]   = useState('');
  const [dropoff, setDropoff] = useState('');
  const [note, setNote]       = useState('');
  const [prefs, setPrefs]     = useState(['luggage', 'nosmoke']);

  const toggle = (k: string) =>
    setPrefs((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);

  const changeSeats = (d: number) =>
    setSeats((s) => String(Math.min(8, Math.max(1, Number(s) + d))));

  const submit = () => {
    if (!from || !to || !date || !time || !price) {
      Alert.alert('Missing fields', 'Please fill in all required fields (route, date, time and price).');
      return;
    }
    Alert.alert(
      '🎉 Trip Published!',
      `${from} → ${to}\n${date} at ${time}\n${seats} seats · ${price} MAD/seat`,
      [
        { text: 'See My Rides', onPress: () => onNavigate('rides') },
        { text: 'New Trip', style: 'cancel' },
      ],
    );
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
          <View style={[styles.inputBox, { flex: 3 }]}>
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={15} tintColor="#94A3B8" />
            <TextInput
              style={styles.inputText}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD *"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <View style={[styles.inputBox, { flex: 2 }]}>
            <SymbolView name={{ ios: 'clock.fill', android: 'schedule' } as any} size={15} tintColor="#94A3B8" />
            <TextInput
              style={styles.inputText}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM *"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
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

      {/* Step 5 – Preferences */}
      <View style={styles.card}>
        <StepHeader num={5} title="Preferences" />
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

      {/* Step 6 – Note */}
      <View style={styles.card}>
        <StepHeader num={6} title="Note for passengers (optional)" />
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

      {/* Publish */}
      <Pressable style={[styles.publishBtn, { backgroundColor: C }]} onPress={submit}>
        <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle' } as any} size={20} tintColor="#fff" />
        <Text style={styles.publishText}>Publish Trip</Text>
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
});

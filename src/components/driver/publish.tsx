import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = '#10B981';

const OPTIONS = [
  { key: 'luggage',  label: 'Luggage OK',   icon: { ios: 'bag.fill',           android: 'luggage' } },
  { key: 'pets',     label: 'Pets OK',      icon: { ios: 'pawprint.fill',       android: 'pets' } },
  { key: 'smoke',    label: 'No smoking',   icon: { ios: 'smoke.fill',          android: 'smoke_free' } },
  { key: 'music',    label: 'Music OK',     icon: { ios: 'music.note',          android: 'music_note' } },
];

type Props = { onNavigate: (tab: string) => void };

export function DriverPublish({ onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [date, setDate]     = useState('');
  const [time, setTime]     = useState('');
  const [seats, setSeats]   = useState('3');
  const [price, setPrice]   = useState('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [options, setOptions] = useState<string[]>(['luggage', 'smoke']);

  const toggleOption = (k: string) =>
    setOptions((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);

  const publish = () => {
    if (!from || !to || !date || !time || !price) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    Alert.alert('Ride Published!', `Your ride from ${from} to ${to} on ${date} at ${time} has been published.`, [
      { text: 'View My Rides', onPress: () => onNavigate('rides') },
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      <Text style={styles.pageTitle}>Publish a Ride</Text>

      {/* Route */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route</Text>
        <View style={styles.inputGroup}>
          <View style={[styles.dot, { backgroundColor: C }]} />
          <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="Departure city *" placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.innerDivider} />
        <View style={styles.inputGroup}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="Destination city *" placeholderTextColor="#94A3B8" />
        </View>
      </View>

      {/* Date & time */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Date & Time</Text>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={15} tintColor="#94A3B8" />
            <TextInput style={styles.halfInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD *" placeholderTextColor="#94A3B8" />
          </View>
          <View style={styles.halfField}>
            <SymbolView name={{ ios: 'clock', android: 'schedule' } as any} size={15} tintColor="#94A3B8" />
            <TextInput style={styles.halfInput} value={time} onChangeText={setTime} placeholder="HH:MM *" placeholderTextColor="#94A3B8" />
          </View>
        </View>
      </View>

      {/* Seats & price */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Seats & Price</Text>
        <View style={styles.row}>
          <View style={[styles.halfField, { flex: 1 }]}>
            <SymbolView name={{ ios: 'person.2.fill', android: 'group' } as any} size={15} tintColor="#94A3B8" />
            <TextInput style={styles.halfInput} value={seats} onChangeText={setSeats} keyboardType="number-pad" placeholder="Seats available *" placeholderTextColor="#94A3B8" />
          </View>
          <View style={[styles.halfField, { flex: 1 }]}>
            <Text style={styles.currency}>MAD</Text>
            <TextInput style={styles.halfInput} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Price / seat *" placeholderTextColor="#94A3B8" />
          </View>
        </View>
      </View>

      {/* Pickup & drop-off */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meeting Points</Text>
        <View style={styles.inputGroup}>
          <SymbolView name={{ ios: 'location.fill', android: 'location_on' } as any} size={15} tintColor={C} />
          <TextInput style={styles.input} value={pickup} onChangeText={setPickup} placeholder="Pickup point" placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.innerDivider} />
        <View style={styles.inputGroup}>
          <SymbolView name={{ ios: 'mappin', android: 'flag' } as any} size={15} tintColor="#EF4444" />
          <TextInput style={styles.input} value={dropoff} onChangeText={setDropoff} placeholder="Drop-off point" placeholderTextColor="#94A3B8" />
        </View>
      </View>

      {/* Options */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <View style={styles.optionsGrid}>
          {OPTIONS.map((o) => {
            const on = options.includes(o.key);
            return (
              <Pressable
                key={o.key}
                style={[styles.optionChip, on && { backgroundColor: C + '15', borderColor: C }]}
                onPress={() => toggleOption(o.key)}>
                <SymbolView name={o.icon as any} size={15} tintColor={on ? C : '#94A3B8'} />
                <Text style={[styles.optionLabel, on && { color: C }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Publish button */}
      <Pressable style={[styles.publishBtn, { backgroundColor: C }]} onPress={publish}>
        <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle' } as any} size={18} tintColor="#fff" />
        <Text style={styles.publishBtnText}>Publish Ride</Text>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B', letterSpacing: -0.5 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 },

  inputGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  input: { flex: 1, fontSize: 15, color: '#1E293B', paddingVertical: 4 },
  innerDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 22 },

  row: { flexDirection: 'row', gap: 12 },
  halfField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  halfInput: { flex: 1, fontSize: 14, color: '#1E293B' },
  currency: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  optionLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16, marginTop: 4,
  },
  publishBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

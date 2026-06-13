import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES } from '@/lib/cities';

const C = '#3B82F6';

type Props = { visible: boolean; onClose: () => void; onCreated: () => void };

function CityInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text,    setText]    = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => { setText(value); }, [value]);

  const suggestions = text.length >= 1
    ? MOROCCAN_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 5)
    : [];
  const showDrop = focused && suggestions.length > 0;

  const select = (city: string) => {
    setText(city);
    onChange(city);
    setFocused(false);
  };

  return (
    <View>
      <TextInput
        style={[s.input, showDrop && s.inputOpen]}
        placeholder={label}
        placeholderTextColor="#94A3B8"
        value={text}
        onChangeText={(t) => { setText(t); onChange(t); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showDrop && (
        // Inline (not absolute) — avoids z-index stacking issues inside ScrollView on web
        <View style={s.dropdown}>
          {suggestions.map((city, i) => (
            <Pressable
              key={city}
              style={[s.dropItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]}
              // @ts-ignore web only
              onMouseDown={(e: any) => e.preventDefault()}
              onPress={() => select(city)}>
              <Text style={s.dropText}>📍 {city}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SeatPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.seatRow}>
      {[1, 2, 3, 4, 5, 6].map(n => (
        <Pressable
          key={n}
          style={[s.seatBtn, value === n && s.seatBtnActive]}
          onPress={() => onChange(n)}>
          <Text style={[s.seatBtnTxt, value === n && s.seatBtnTxtActive]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function toDateStr(d: Date) {
  // Use local time — toISOString() uses UTC and shifts the date in non-UTC timezones
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export function CreateRequestModal({ visible, onClose, onCreated }: Props) {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();

  const [fromCity,  setFromCity]  = useState('');
  const [toCity,    setToCity]    = useState('');
  const [date,      setDate]      = useState(new Date());
  const [time,      setTime]      = useState(() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; });
  const [seats,     setSeats]     = useState(1);
  const [maxPrice,  setMaxPrice]  = useState('');
  const [message,   setMessage]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [showDate,  setShowDate]  = useState(false);
  const [showTime,  setShowTime]  = useState(false);

  const reset = () => {
    setFromCity(''); setToCity('');
    setDate(new Date()); setSeats(1); setMaxPrice(''); setMessage('');
    const t = new Date(); t.setHours(8, 0, 0, 0); setTime(t);
  };

  const submit = async () => {
    if (!fromCity.trim()) { Alert.alert('Missing', 'Enter departure city'); return; }
    if (!toCity.trim())   { Alert.alert('Missing', 'Enter destination city'); return; }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase.from('ride_requests').insert({
      passenger_id:   user.id,
      from_city:      fromCity.trim(),
      to_city:        toCity.trim(),
      departure_date: toDateStr(date),
      departure_time: toTimeStr(time),
      seats_needed:   seats,
      max_price:      maxPrice ? parseFloat(maxPrice) : null,
      message:        message.trim() || null,
    });
    setSaving(false);

    if (error) { Alert.alert('Error', error.message); return; }
    reset();
    onCreated();
    onClose();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeTxt}>✕</Text>
          </Pressable>
          <Text style={s.title}>Request a Ride</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Route */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Route</Text>
            <CityInput label="Departure city" value={fromCity} onChange={setFromCity} />
            <View style={s.routeArrow}><Text style={s.routeArrowTxt}>↓</Text></View>
            <CityInput label="Destination city" value={toCity} onChange={setToCity} />
          </View>

          {/* Date & Time */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>When</Text>
            <View style={s.row}>
              {Platform.OS === 'web' ? (
                <View style={[s.pill, { flex: 1 }]}>
                  <Text style={s.pillIcon}>📅</Text>
                  {/* @ts-ignore – web only */}
                  <input
                    type="date"
                    value={toDateStr(date)}
                    min={toDateStr(today)}
                    onChange={(e: any) => {
                      const [y, mo, day] = e.target.value.split('-').map(Number);
                      if (y && mo && day) setDate(new Date(y, mo - 1, day));
                    }}
                    style={{ border: 'none', background: 'transparent', fontSize: 14, color: '#1E293B', fontWeight: '600', cursor: 'pointer', outline: 'none', width: '100%' }}
                  />
                </View>
              ) : (
                <Pressable style={[s.pill, { flex: 1 }]} onPress={() => setShowDate(true)}>
                  <Text style={s.pillIcon}>📅</Text>
                  <Text style={s.pillTxt}>
                    {date.toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </Text>
                </Pressable>
              )}

              {Platform.OS === 'web' ? (
                <View style={[s.pill, { flex: 1 }]}>
                  <Text style={s.pillIcon}>🕐</Text>
                  {/* @ts-ignore – web only */}
                  <input
                    type="time"
                    value={toTimeStr(time)}
                    onChange={(e: any) => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      const t = new Date(); t.setHours(h, m, 0, 0); setTime(t);
                    }}
                    style={{ border: 'none', background: 'transparent', fontSize: 14, color: '#1E293B', fontWeight: '600', cursor: 'pointer', outline: 'none', width: '100%' }}
                  />
                </View>
              ) : (
                <Pressable style={[s.pill, { flex: 1 }]} onPress={() => setShowTime(true)}>
                  <Text style={s.pillIcon}>🕐</Text>
                  <Text style={s.pillTxt}>{toTimeStr(time)}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {showDate && Platform.OS !== 'web' && (
            <DateTimePicker
              value={date}
              mode="date"
              minimumDate={today}
              onChange={(_, d) => { setShowDate(Platform.OS === 'ios'); if (d) setDate(d); }}
            />
          )}
          {showTime && Platform.OS !== 'web' && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour
              onChange={(_, t) => { setShowTime(Platform.OS === 'ios'); if (t) setTime(t); }}
            />
          )}

          {/* Seats */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Seats needed</Text>
            <SeatPicker value={seats} onChange={setSeats} />
          </View>

          {/* Max price */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Max price per seat (optional)</Text>
            <View style={s.priceRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="e.g. 120"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={setMaxPrice}
              />
              <Text style={s.madLabel}>MAD</Text>
            </View>
          </View>

          {/* Message */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Message for drivers (optional)</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="e.g. I have two small bags. Prefer morning departure."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
          </View>

          {/* Summary preview */}
          <View style={s.preview}>
            <Text style={s.previewTitle}>Request Summary</Text>
            <Text style={s.previewLine}>📍 {fromCity || '—'} → {toCity || '—'}</Text>
            <Text style={s.previewLine}>
              📅 {date.toLocaleDateString('fr-MA', { weekday: 'long', day: '2-digit', month: 'long' })} at {toTimeStr(time)}
            </Text>
            <Text style={s.previewLine}>👥 {seats} seat{seats > 1 ? 's' : ''}</Text>
            {maxPrice ? <Text style={s.previewLine}>💰 Max {maxPrice} MAD/seat</Text> : null}
          </View>

          <Pressable style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
            <Text style={s.submitTxt}>{saving ? 'Sending…' : 'Send Request to Drivers'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  title:    { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 15, color: '#64748B', fontWeight: '700' },
  content:  { padding: 20, gap: 8, paddingBottom: 48 },

  section:      { gap: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },

  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  inputOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: '#F1F5F9' },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1, borderTopWidth: 0, borderColor: '#E2E8F0',
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dropItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  dropText: { fontSize: 14, color: '#1E293B' },

  routeArrow:    { alignItems: 'center' },
  routeArrowTxt: { fontSize: 18, color: '#CBD5E1' },

  row: { flexDirection: 'row', gap: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  pillIcon: { fontSize: 16 },
  pillTxt:  { fontSize: 14, color: '#1E293B', fontWeight: '600' },

  seatRow: { flexDirection: 'row', gap: 8 },
  seatBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
  },
  seatBtnActive:    { backgroundColor: C, borderColor: C },
  seatBtnTxt:       { fontSize: 15, fontWeight: '700', color: '#64748B' },
  seatBtnTxtActive: { color: '#fff' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  madLabel: { fontSize: 14, fontWeight: '700', color: '#64748B' },

  preview: {
    backgroundColor: C + '10', borderRadius: 16, padding: 16, gap: 6,
    borderWidth: 1, borderColor: C + '30',
  },
  previewTitle: { fontSize: 13, fontWeight: '800', color: C, marginBottom: 4 },
  previewLine:  { fontSize: 14, color: '#334155' },

  submitBtn: {
    backgroundColor: C, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

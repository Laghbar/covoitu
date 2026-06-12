import { useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const LABELS = ['', 'Terrible 😞', 'Poor 😐', 'OK 🙂', 'Good 😊', 'Excellent 🤩'];

type Props = {
  visible:     boolean;
  onClose:     () => void;
  onSubmitted: () => void;
  rideId:      string;
  driverId:    string;
  driverName:  string;
  route:       string;
};

export function RateModal({ visible, onClose, onSubmitted, rideId, driverId, driverName, route }: Props) {
  const { user } = useAuth();
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const reset = () => { setRating(0); setComment(''); setError(''); setSaving(false); };

  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('reviews').insert({
      ride_id:      rideId,
      passenger_id: user!.id,
      driver_id:    driverId,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    reset();
    onSubmitted();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Rate your trip</Text>
          <Text style={styles.sub}>Your feedback helps other passengers</Text>

          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(driverName[0] ?? 'D').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driverName}</Text>
              <Text style={styles.route}>{route}</Text>
            </View>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => setRating(n)} style={styles.starBtn}>
                <Text style={[styles.star, { color: n <= rating ? '#F59E0B' : '#CBD5E1' }]}>★</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 0 ? 'Tap a star to rate' : LABELS[rating]}
          </Text>

          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Leave a comment (optional)…"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {error ? <Text style={styles.errorTxt}>⚠️ {error}</Text> : null}

          <Pressable
            style={[styles.submitBtn, (rating === 0 || saving) && { opacity: 0.5 }]}
            onPress={submit}
            disabled={saving || rating === 0}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitTxt}>Submit Review</Text>}
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={close}>
            <Text style={styles.skipTxt}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, gap: 16, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 4,
  },

  title: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  sub:   { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: -8 },

  driverRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#10B981' + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '900', color: '#10B981' },
  driverName:   { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  route:        { fontSize: 13, color: '#64748B', marginTop: 2 },

  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  starBtn:  { padding: 4 },
  star:     { fontSize: 42 },

  ratingLabel: {
    fontSize: 14, fontWeight: '600', color: '#64748B',
    textAlign: 'center', marginTop: -8,
  },

  commentInput: {
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1E293B', minHeight: 80,
  },

  errorTxt: { fontSize: 13, color: '#EF4444', fontWeight: '500' },

  submitBtn: {
    backgroundColor: '#3B82F6', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  submitTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  skipBtn: { alignItems: 'center' },
  skipTxt: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
});

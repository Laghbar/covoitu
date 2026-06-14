import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { RideItem } from '../passenger-dashboard';
import { calcPassengerPrice, PASSENGER_FEE_INAPP, calcDriverCommission } from '@/lib/commission';

const C = '#3B82F6';

const REVIEWS = [
  { name: 'Sara B.', initial: 'S', rating: 5, comment: 'Very punctual and friendly driver. Highly recommended!', date: 'May 2026' },
  { name: 'Omar L.', initial: 'O', rating: 5, comment: 'Clean car, good music, arrived on time.', date: 'Apr 2026' },
  { name: 'Fatima Z.', initial: 'F', rating: 4, comment: 'Good driver but 5 minutes late at departure.', date: 'Mar 2026' },
];

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SymbolView
          key={i}
          name={{ ios: i <= value ? 'star.fill' : 'star', android: i <= value ? 'star' : 'star_border' } as any}
          size={size}
          tintColor={i <= value ? '#F59E0B' : '#CBD5E1'}
        />
      ))}
    </View>
  );
}

type Props = { ride: RideItem; onBack: () => void; onNavigate: (key: string, payload?: any) => void };

export function PassengerRideDetail({ ride, onBack, onNavigate }: Props) {
  const { user }    = useAuth();
  const insets      = useSafeAreaInsets();
  const [seats,     setSeats]   = useState(1);
  const [message,   setMessage] = useState('');
  const [loading,   setLoading] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [booked,    setBooked]   = useState(false);
  const available      = ride.seats - ride.bookedSeats;
  const passengerPrice = calcPassengerPrice(ride.price, ride.paymentMethod);

  // Check if passenger already has an active booking for this ride
  useEffect(() => {
    if (!user) return;
    supabase
      .from('bookings')
      .select('id')
      .eq('ride_id', ride.id)
      .eq('passenger_id', user.id)
      .in('status', ['pending', 'accepted'])
      .maybeSingle()
      .then(({ data }) => { if (data) setBooked(true); });
  }, [ride.id, user]);

  const doBook = async () => {
    setLoading(true);
    setBookError(null);
    const { error } = await supabase.from('bookings').insert({
      ride_id:         ride.id,
      passenger_id:    user.id,
      seats_requested: seats,
      total_price:     seats * passengerPrice,
      status:          'pending',
      message:         message.trim() || null,
    });
    setLoading(false);
    if (error) { setBookError(error.message); return; }
    setBooked(true);
  };

  const book = () => {
    if (!user)          { setBookError('You must be logged in to book.'); return; }
    if (available === 0){ setBookError('This ride is full.'); return; }

    const summary = seats > 1
      ? `${seats} sièges × ${passengerPrice} MAD = ${seats * passengerPrice} MAD`
      : `${seats} siège · ${passengerPrice} MAD`;

    if (Platform.OS === 'web') {
      if (window.confirm(`Book on ${ride.from} → ${ride.to}?\n${summary}`)) doBook();
    } else {
      Alert.alert(
        'Confirm Booking',
        `${ride.from} → ${ride.to}\n${summary}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Book Now', onPress: doBook },
        ],
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={onBack}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' } as any} size={16} tintColor={C} />
          <Text style={[styles.backText, { color: C }]}>Back to results</Text>
        </Pressable>

        {/* Route hero */}
        <View style={[styles.heroCard, { backgroundColor: C }]}>
          <View style={styles.heroRoute}>
            <View style={styles.heroCity}>
              <SymbolView name={{ ios: 'location.fill', android: 'location_on' } as any} size={16} tintColor="rgba(255,255,255,0.7)" />
              <Text style={styles.heroCityText}>{ride.from}</Text>
            </View>
            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' } as any} size={18} tintColor="rgba(255,255,255,0.5)" />
            <View style={styles.heroCity}>
              <SymbolView name={{ ios: 'mappin', android: 'place' } as any} size={16} tintColor="rgba(255,255,255,0.7)" />
              <Text style={styles.heroCityText}>{ride.to}</Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroDate}>{ride.date} · {ride.time}</Text>
            <Text style={styles.heroPrice}>{passengerPrice} MAD / siège</Text>
          </View>
        </View>

        {/* Driver card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Driver</Text>
          <View style={styles.driverRow}>
            <View style={[styles.driverAvatar, { backgroundColor: C + '18' }]}>
              <Text style={[styles.driverInitial, { color: C }]}>{ride.driver.initial}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.driverName}>{ride.driver.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {ride.driver.rating != null ? (
                  <>
                    <Stars value={Math.round(ride.driver.rating)} />
                    <Text style={styles.driverRating}>
                      {ride.driver.rating.toFixed(1)} · {ride.driver.trips} avis
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.driverRating, { color: '#94A3B8', fontStyle: 'italic' }]}>
                    Nouveau conducteur
                  </Text>
                )}
              </View>
              <Text style={styles.driverMember}>Member since {ride.driver.memberSince}</Text>
            </View>
          </View>
          {ride.driver.bio ? (
            <View style={styles.bioBubble}>
              <Text style={styles.bioText}>"{ride.driver.bio}"</Text>
            </View>
          ) : null}
        </View>

        {/* Vehicle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle</Text>
          <View style={styles.vehicleRow}>
            <View style={[styles.vehicleIcon, { backgroundColor: C + '12' }]}>
              <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={24} tintColor={C} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              {(ride.car.make || ride.car.model || ride.car.year) ? (
                <Text style={styles.vehicleName}>
                  {[ride.car.make, ride.car.model, ride.car.year ? `(${ride.car.year})` : ''].filter(Boolean).join(' ')}
                </Text>
              ) : (
                <Text style={[styles.vehicleName, { color: '#94A3B8' }]}>Not specified</Text>
              )}
              {(ride.car.plate || ride.car.color) ? (
                <Text style={styles.vehiclePlate}>
                  {[ride.car.plate, ride.car.color].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Trip details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          {[
            { icon: { ios: 'arrow.up.circle.fill', android: 'trip_origin' }, color: C, label: 'PICKUP POINT', value: ride.pickupPoint || 'Not specified' },
            { icon: { ios: 'arrow.down.circle.fill', android: 'place' }, color: '#EF4444', label: 'DROP-OFF POINT', value: ride.dropoffPoint || 'Not specified' },
            { icon: { ios: 'person.2.fill', android: 'group' }, color: '#64748B', label: 'AVAILABLE SEATS', value: `${available} of ${ride.seats}` },
            { icon: { ios: 'creditcard.fill', android: 'payments' }, color: ride.paymentMethod === 'in_app' ? '#3B82F6' : '#16A34A', label: 'PAIEMENT', value: ride.paymentMethod === 'in_app' ? '📱 Via l\'application' : '💵 Espèces au conducteur' },
          ].map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <SymbolView name={d.icon as any} size={16} tintColor={d.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={[styles.detailValue, !['Not specified'].includes(d.value) ? {} : { color: '#94A3B8' }]}>{d.value}</Text>
              </View>
            </View>
          ))}
          {ride.note && (
            <View style={[styles.noteBox, { borderLeftColor: '#F59E0B' }]}>
              <SymbolView name={{ ios: 'info.circle.fill', android: 'info' } as any} size={14} tintColor="#F59E0B" />
              <Text style={styles.noteText}>{ride.note}</Text>
            </View>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>
          <View style={styles.prefGrid}>
            {ride.preferences.map((p) => (
              <View key={p} style={[styles.prefChip, { backgroundColor: C + '10', borderColor: C + '30' }]}>
                <Text style={[styles.prefText, { color: C }]}>✓ {p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.card}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.cardTitle}>Recent Reviews</Text>
            {ride.driver.rating != null && (
              <View style={styles.ratingBadge}>
                <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={13} tintColor="#F59E0B" />
                <Text style={styles.ratingBadgeText}>{ride.driver.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          {REVIEWS.map((r, i) => (
            <View key={i} style={[styles.reviewCard, i < REVIEWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12 }]}>
              <View style={styles.reviewTop}>
                <View style={[styles.reviewAvatar, { backgroundColor: '#E2E8F0' }]}>
                  <Text style={styles.reviewInitial}>{r.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewName}>{r.name}</Text>
                  <Text style={styles.reviewDate}>{r.date}</Text>
                </View>
                <Stars value={r.rating} size={12} />
              </View>
              <Text style={styles.reviewComment}>"{r.comment}"</Text>
            </View>
          ))}
        </View>

        {/* Message to driver */}
        {!booked && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Message to driver (optional)</Text>
            <TextInput
              style={styles.msgInput}
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. I'll be at the main entrance with luggage."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>
        )}

        <View style={{ height: 130 + insets.bottom }} />
      </ScrollView>

      {/* Sticky booking footer */}
      <View style={[styles.bookingFooter, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
        {/* Cash-only notice */}
        <View style={styles.cashRow}>
          <Text style={styles.cashText}>💵 Cash payment — pay the driver on the day</Text>
        </View>

        {/* Seats + Price + Book row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Seats stepper */}
          {!booked && (
            <View style={styles.seatsControl}>
              <Text style={styles.seatsLabel}>
                {available > 1 ? `Seats (max ${available})` : 'Seat'}
              </Text>
              <View style={styles.stepper}>
                <Pressable
                  style={[styles.stepperBtn, { borderColor: seats > 1 ? C : '#E2E8F0' }]}
                  onPress={() => setSeats((s) => Math.max(1, s - 1))}
                  disabled={seats <= 1}>
                  <Text style={[styles.stepperBtnText, { color: seats > 1 ? C : '#CBD5E1' }]}>−</Text>
                </Pressable>
                <Text style={styles.stepperVal}>{seats}</Text>
                <Pressable
                  style={[styles.stepperBtn, { borderColor: seats < available ? C : '#E2E8F0' }]}
                  onPress={() => setSeats((s) => Math.min(available, s + 1))}
                  disabled={seats >= available}>
                  <Text style={[styles.stepperBtnText, { color: seats < available ? C : '#CBD5E1' }]}>+</Text>
                </Pressable>
              </View>
            </View>
          )}

        {/* Price + action */}
        <View style={styles.bookRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.totalPrice}>{seats * passengerPrice} MAD</Text>
            {seats > 1 && (
              <Text style={styles.priceBreakdown}>{seats} × {passengerPrice} MAD</Text>
            )}
            {ride.paymentMethod === 'in_app' && (
              <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                incl. {PASSENGER_FEE_INAPP} MAD frais service
              </Text>
            )}
          </View>
          {booked ? (
            <Pressable style={[styles.bookBtn, { backgroundColor: C }]} onPress={() => onNavigate('bookings')}>
              <Text style={styles.bookBtnText}>✓ View Booking</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.bookBtn, { backgroundColor: available > 0 && !loading ? C : '#CBD5E1' }]}
              onPress={book}
              disabled={available === 0 || loading}>
              <Text style={styles.bookBtnText}>
                {loading ? 'Booking…' : available > 0 ? 'Book Now' : 'Full'}
              </Text>
            </Pressable>
          )}
        </View>
        </View>  {/* end seats+price row */}
      </View>
      {bookError && (
        <View style={styles.bookError}>
          <Text style={styles.bookErrorTxt}>{bookError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 20 },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, fontWeight: '600' },

  heroCard: { borderRadius: 18, padding: 20, gap: 12 },
  heroRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroCityText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroDate: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  heroPrice: { color: '#fff', fontSize: 20, fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },

  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: 20, fontWeight: '800' },
  driverName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  driverRating: { fontSize: 12, color: '#64748B' },
  driverMember: { fontSize: 12, color: '#94A3B8' },
  bioBubble: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: C },
  bioText: { fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 18 },

  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vehicleIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  vehiclePlate: { fontSize: 13, color: '#64748B' },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 1 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, borderLeftWidth: 3 },
  noteText: { flex: 1, fontSize: 13, color: '#92400E' },

  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  prefText: { fontSize: 12, fontWeight: '600' },

  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingBadgeText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  reviewCard: { gap: 6 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reviewInitial: { fontSize: 13, fontWeight: '700', color: '#475569' },
  reviewName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  reviewDate: { fontSize: 11, color: '#94A3B8' },
  reviewComment: { fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 18, marginLeft: 42 },

  bookingFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    flexDirection: 'column',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
    gap: 10,
  },
  cashRow: {
    backgroundColor: '#FFFBEB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    alignItems: 'center',
  },
  cashText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  seatsControl: { gap: 4 },
  seatsLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 16, fontWeight: '700' },
  stepperVal: { fontSize: 18, fontWeight: '800', color: '#1E293B', minWidth: 20, textAlign: 'center' },
  bookRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  totalPrice: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  priceBreakdown: { fontSize: 11, color: '#94A3B8', marginTop: -2 },
  bookBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bookError: { backgroundColor: '#FEF2F2', paddingHorizontal: 16, paddingVertical: 10 },
  bookErrorTxt: { color: '#EF4444', fontSize: 13, fontWeight: '500' },

  msgInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: '#1E293B',
    minHeight: 80, textAlignVertical: 'top',
  },
});

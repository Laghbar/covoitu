import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RideItem } from '../passenger-dashboard';

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
  const [seats, setSeats] = useState(1);
  const available = ride.seats - ride.bookedSeats;

  const book = () => {
    if (available === 0) { Alert.alert('No seats available', 'This ride is full.'); return; }
    Alert.alert(
      'Confirm Booking',
      `${ride.from} → ${ride.to}\n${ride.date} at ${ride.time}\n${seats} seat${seats > 1 ? 's' : ''} × ${ride.price} MAD = ${seats * ride.price} MAD`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now', onPress: () => {
            Alert.alert('Booking Confirmed! 🎉', 'Your seat has been reserved. Check My Bookings for details.', [
              { text: 'My Bookings', onPress: () => onNavigate('bookings') },
              { text: 'OK' },
            ]);
          },
        },
      ],
    );
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
            <Text style={styles.heroPrice}>{ride.price} MAD / seat</Text>
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
                <Stars value={Math.round(ride.driver.rating)} />
                <Text style={styles.driverRating}>{ride.driver.rating} · {ride.driver.trips} trips</Text>
              </View>
              <Text style={styles.driverMember}>Member since {ride.driver.memberSince}</Text>
            </View>
            <Pressable style={[styles.msgBtn, { borderColor: C + '40' }]} onPress={() => onNavigate('messages')}>
              <SymbolView name={{ ios: 'message.fill', android: 'chat' } as any} size={14} tintColor={C} />
              <Text style={[styles.msgBtnText, { color: C }]}>Message</Text>
            </Pressable>
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
              <Text style={styles.vehicleName}>{ride.car.make} {ride.car.model} ({ride.car.year})</Text>
              <Text style={styles.vehiclePlate}>{ride.car.plate} · {ride.car.color}</Text>
            </View>
          </View>
        </View>

        {/* Trip details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          {[
            { icon: { ios: 'arrow.up.circle.fill', android: 'trip_origin' }, color: C, label: 'Pickup point', value: ride.pickupPoint },
            { icon: { ios: 'arrow.down.circle.fill', android: 'place' }, color: '#EF4444', label: 'Drop-off point', value: ride.dropoffPoint },
            { icon: { ios: 'person.2.fill', android: 'group' }, color: '#64748B', label: 'Available seats', value: `${available} of ${ride.seats}` },
          ].map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <SymbolView name={d.icon as any} size={16} tintColor={d.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
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
            <View style={styles.ratingBadge}>
              <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={13} tintColor="#F59E0B" />
              <Text style={styles.ratingBadgeText}>{ride.driver.rating}</Text>
            </View>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky booking footer */}
      <View style={styles.bookingFooter}>
        <View style={styles.seatsControl}>
          <Text style={styles.seatsLabel}>Seats</Text>
          <View style={styles.stepper}>
            <Pressable style={[styles.stepperBtn, { borderColor: C }]} onPress={() => setSeats((s) => Math.max(1, s - 1))}>
              <Text style={[styles.stepperBtnText, { color: C }]}>−</Text>
            </Pressable>
            <Text style={styles.stepperVal}>{seats}</Text>
            <Pressable style={[styles.stepperBtn, { borderColor: C }]} onPress={() => setSeats((s) => Math.min(available, s + 1))}>
              <Text style={[styles.stepperBtnText, { color: C }]}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.bookRight}>
          <Text style={styles.totalPrice}>{seats * ride.price} MAD</Text>
          <Pressable style={[styles.bookBtn, { backgroundColor: available > 0 ? C : '#CBD5E1' }]} onPress={book}>
            <Text style={styles.bookBtnText}>{available > 0 ? 'Book Now' : 'Full'}</Text>
          </Pressable>
        </View>
      </View>
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
  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  msgBtnText: { fontSize: 12, fontWeight: '600' },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  seatsControl: { gap: 4 },
  seatsLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 16, fontWeight: '700' },
  stepperVal: { fontSize: 18, fontWeight: '800', color: '#1E293B', minWidth: 20, textAlign: 'center' },
  bookRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  totalPrice: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  bookBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

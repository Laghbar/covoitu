import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#3B82F6';

type Ride = {
  id: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price: number;
  seats: number;
  booked_seats: number;
  driver: { name: string } | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectRide: (ride: any) => void;
};

function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const available = ride.seats - ride.booked_seats;
  return (
    <Pressable style={styles.rideCard} onPress={onPress}>
      <View style={styles.rideRoute}>
        <Text style={styles.rideCity}>{ride.from_city}</Text>
        <Text style={styles.rideArrow}>→</Text>
        <Text style={styles.rideCity}>{ride.to_city}</Text>
      </View>
      <Text style={styles.rideMeta}>
        📅 {ride.departure_date}  🕐 {ride.departure_time}
      </Text>
      <View style={styles.rideFooter}>
        <Text style={styles.ridePrice}>{ride.price} MAD</Text>
        <Text style={styles.rideSeats}>{available} seat{available !== 1 ? 's' : ''} left</Text>
      </View>
    </Pressable>
  );
}

export function QRScannerModal({ visible, onClose, onSelectRide }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,    setScanned]        = useState(false);
  const [manualCode, setManualCode]     = useState('');
  const [loading,    setLoading]        = useState(false);
  const [error,      setError]          = useState('');
  const [driverName, setDriverName]     = useState('');
  const [rides,      setRides]          = useState<Ride[]>([]);
  const processingRef = useRef(false);

  const reset = () => {
    setScanned(false);
    setManualCode('');
    setError('');
    setDriverName('');
    setRides([]);
    processingRef.current = false;
  };

  const lookupDriver = useCallback(async (rawCode: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    // Extract UUID from harizana-driver:UUID or raw UUID
    const match = rawCode.match(/harizana-driver:([0-9a-f-]{36})/i) ?? rawCode.match(/([0-9a-f-]{36})/i);
    if (!match) {
      setError('Invalid QR code. Not a Harizana driver code.');
      processingRef.current = false;
      return;
    }

    const driverId = match[1];
    setLoading(true);
    setError('');
    setScanned(true);

    const today = new Date().toISOString().split('T')[0];
    const { data, error: dbError } = await supabase
      .from('rides')
      .select('id, from_city, to_city, departure_date, departure_time, price, seats, booked_seats, driver:driver_id(name)')
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .gte('departure_date', today)
      .order('departure_date', { ascending: true });

    if (dbError) { setError(dbError.message); setLoading(false); processingRef.current = false; return; }

    const list = (data ?? []) as unknown as Ride[];
    if (list.length > 0) setDriverName((list[0].driver as any)?.name ?? 'Driver');
    else {
      // try to get driver name from profiles
      const { data: profile } = await supabase
        .from('profiles').select('name').eq('id', driverId).single();
      setDriverName((profile as any)?.name ?? 'Driver');
    }

    setRides(list);
    setLoading(false);
  }, []);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanned) lookupDriver(data);
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    // Expand short code (8-char hex prefix) → not possible, accept full UUID or full harizana-driver string
    lookupDriver(code);
  };

  const toRideItem = (r: Ride) => ({
    id: r.id,
    from: r.from_city,
    to: r.to_city,
    date: r.departure_date,
    time: r.departure_time,
    price: r.price,
    seats: r.seats,
    bookedSeats: r.booked_seats,
    driver: {
      name: (r.driver as any)?.name ?? 'Driver',
      initial: ((r.driver as any)?.name?.[0] ?? 'D').toUpperCase(),
      rating: 4.8, trips: 0, memberSince: '2024', bio: '',
    },
    car: { make: '', model: '', year: '', color: '', plate: '' },
    preferences: [], pickupPoint: '', dropoffPoint: '',
  });

  const isWeb = Platform.OS === 'web';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={styles.overlay}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => { reset(); onClose(); }} style={styles.backBtn}>
            <Text style={styles.backTxt}>✕</Text>
          </Pressable>
          <Text style={styles.title}>
            {scanned ? 'Driver Rides' : 'Scan Driver QR'}
          </Text>
          {scanned && (
            <Pressable onPress={reset} style={styles.rescanBtn}>
              <Text style={styles.rescanTxt}>↩ Rescan</Text>
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ flexGrow: 1 }}>

          {!scanned ? (
            <>
              {/* Camera scanner — native or web */}
              {!isWeb ? (
                <View style={styles.scannerWrap}>
                  {!permission?.granted ? (
                    <View style={styles.permBox}>
                      <Text style={styles.permTxt}>Camera permission needed to scan QR codes.</Text>
                      <Pressable style={styles.permBtn} onPress={requestPermission}>
                        <Text style={styles.permBtnTxt}>Allow Camera</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <CameraView
                      style={styles.camera}
                      facing="back"
                      onBarcodeScanned={handleBarcodeScanned}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    >
                      <View style={styles.scanFrame}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                      </View>
                    </CameraView>
                  )}
                </View>
              ) : (
                <View style={styles.webScanBox}>
                  <Text style={styles.webScanIcon}>📷</Text>
                  <Text style={styles.webScanTitle}>Enter Driver Code</Text>
                  <Text style={styles.webScanSub}>
                    Ask the driver to share their code from their Profile → My QR Code
                  </Text>
                </View>
              )}

              {/* Manual code input */}
              <View style={styles.manualWrap}>
                <Text style={styles.manualLabel}>
                  {isWeb ? 'Paste the full driver code:' : 'Or enter driver code manually:'}
                </Text>
                <View style={styles.manualRow}>
                  <TextInput
                    style={styles.manualInput}
                    value={manualCode}
                    onChangeText={setManualCode}
                    placeholder="harizana-driver:xxxxxxxx-xxxx..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable
                    style={[styles.goBtn, !manualCode.trim() && { opacity: 0.5 }]}
                    onPress={handleManualSubmit}
                    disabled={!manualCode.trim()}>
                    <Text style={styles.goTxt}>Go</Text>
                  </Pressable>
                </View>
                {error ? <Text style={styles.errorTxt}>⚠️ {error}</Text> : null}
              </View>
            </>
          ) : (
            /* Results */
            <View style={styles.results}>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={C} size="large" />
                  <Text style={styles.loadingTxt}>Looking up rides…</Text>
                </View>
              ) : error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTxt}>⚠️ {error}</Text>
                  <Pressable onPress={reset} style={styles.retryBtn}>
                    <Text style={styles.retryTxt}>Try Again</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.driverBadge}>
                    <View style={styles.driverAvatar}>
                      <Text style={styles.driverInitial}>{driverName[0]?.toUpperCase() ?? 'D'}</Text>
                    </View>
                    <View>
                      <Text style={styles.driverBadgeName}>{driverName}</Text>
                      <Text style={styles.driverBadgeSub}>
                        {rides.length} upcoming ride{rides.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {rides.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyIcon}>🚗</Text>
                      <Text style={styles.emptyTxt}>No upcoming rides from this driver</Text>
                    </View>
                  ) : (
                    rides.map(r => (
                      <RideCard
                        key={r.id}
                        ride={r}
                        onPress={() => { onSelectRide(toRideItem(r)); reset(); onClose(); }}
                      />
                    ))
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const CORNER = 22;
const BORDER = 3;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 16, color: '#64748B', fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  rescanBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C + '15' },
  rescanTxt: { fontSize: 13, color: C, fontWeight: '600' },

  body: { flex: 1 },

  /* Camera */
  scannerWrap: { height: 300, margin: 20, borderRadius: 20, overflow: 'hidden' },
  camera: { flex: 1 },
  scanFrame: {
    position: 'absolute', top: '15%', left: '15%', right: '15%', bottom: '15%',
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderBottomRightRadius: 6 },

  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#1E293B' },
  permTxt: { color: '#94A3B8', fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  permBtn: { backgroundColor: C, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  permBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Web placeholder */
  webScanBox: {
    margin: 20, borderRadius: 20, padding: 40,
    backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: C + '30',
    alignItems: 'center', gap: 10,
  },
  webScanIcon: { fontSize: 48 },
  webScanTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  webScanSub: { fontSize: 13, color: '#64748B', textAlign: 'center' },

  /* Manual input */
  manualWrap: { paddingHorizontal: 20, gap: 10, paddingBottom: 20 },
  manualLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  manualRow: { flexDirection: 'row', gap: 10 },
  manualInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0',
  },
  goBtn: {
    backgroundColor: C, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  goTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Results */
  results: { padding: 20, gap: 14 },
  loadingBox: { alignItems: 'center', gap: 14, paddingTop: 40 },
  loadingTxt: { fontSize: 14, color: '#94A3B8' },
  errorBox: { alignItems: 'center', gap: 14, paddingTop: 40 },
  errorTxt: { color: '#EF4444', fontSize: 13, fontWeight: '500' },
  retryBtn: { backgroundColor: C, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  retryTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  driverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C + '20', alignItems: 'center', justifyContent: 'center',
  },
  driverInitial: { fontSize: 22, fontWeight: '900', color: C },
  driverBadgeName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  driverBadgeSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },

  rideCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rideRoute: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideCity: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  rideArrow: { fontSize: 14, color: '#94A3B8' },
  rideMeta: { fontSize: 13, color: '#64748B' },
  rideFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ridePrice: { fontSize: 17, fontWeight: '900', color: C },
  rideSeats: {
    fontSize: 12, fontWeight: '600', color: '#10B981',
    backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },

  emptyBox: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTxt: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
});

import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable,
  StyleSheet, Text, View,
} from 'react-native';

import { useAuth } from '@/context/auth';
import { useLang } from '@/context/language';
import { supabase } from '@/lib/supabase';

const C = '#3B82F6';

type ScanState = 'idle' | 'scanning' | 'validating' | 'success' | 'error';

type Props = {
  visible: boolean;
  bookingId: string;
  onClose: () => void;
  onValidated: () => void;
};

export function QRScannerModal({ visible, bookingId, onClose, onValidated }: Props) {
  const { user } = useAuth();
  const t = useLang();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const locked = useRef(false);

  useEffect(() => {
    if (visible) {
      setScanState('scanning');
      setErrorMsg('');
      locked.current = false;
    }
  }, [visible]);

  const handleScan = async ({ data }: { data: string }) => {
    if (locked.current || scanState !== 'scanning') return;
    locked.current = true;
    setScanState('validating');

    try {
      let parsed: { r?: string; t?: string };
      try { parsed = JSON.parse(data); } catch { throw new Error(t('QR not recognized', 'QR non reconnu')); }

      const rideId = parsed.r;
      const token  = parsed.t;
      if (!rideId || !token) throw new Error(t('Invalid QR', 'QR invalide'));

      // 1. Token matches the ride
      const { data: rideRow, error: rideErr } = await supabase
        .from('rides')
        .select('validation_token, driver_id, from_city, to_city')
        .eq('id', rideId)
        .single();

      if (rideErr || !rideRow) throw new Error(t('Ride not found', 'Trajet introuvable'));
      if (rideRow.validation_token !== token) throw new Error(t('Incorrect QR code', 'Code QR incorrect'));

      // 2. This booking belongs to this passenger and this ride
      const { data: bookingRow, error: bErr } = await supabase
        .from('bookings')
        .select('id, boarded_at')
        .eq('id', bookingId)
        .eq('ride_id', rideId)
        .eq('passenger_id', user!.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (bErr || !bookingRow) throw new Error(t('Booking not confirmed for this ride', 'Réservation non confirmée pour ce trajet'));
      if (bookingRow.boarded_at) {
        setScanState('success');
        return;
      }

      // 3. Mark boarded
      await supabase
        .from('bookings')
        .update({ boarded_at: new Date().toISOString() })
        .eq('id', bookingId);

      // 4. Notify driver
      await supabase.from('notifications').insert({
        user_id: rideRow.driver_id,
        type:    'passenger_boarded',
        title:   '✅ Passenger on board',
        body:    `${user?.name ?? 'A passenger'} scanned the QR and boarded the vehicle (${rideRow.from_city} → ${rideRow.to_city}).`,
        read:    false,
      });

      setScanState('success');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Erreur de validation');
      setScanState('error');
    }
  };

  const retry = () => {
    locked.current = false;
    setScanState('scanning');
    setErrorMsg('');
  };

  if (!visible) return null;

  // Web: expo-camera barcode scanning not supported
  if (Platform.OS === 'web') {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={s.overlay} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={{ fontSize: 40, textAlign: 'center' }}>🌐</Text>
          <Text style={s.heading}>{t('Not available on browser', 'Non disponible sur navigateur')}</Text>
          <Text style={s.body}>{t('QR scanning requires the Horizon mobile app.', 'Le scanner QR nécessite l\'application mobile Horizon.')}</Text>
          <Pressable style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeTxt}>{t('Close', 'Fermer')}</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  // Permission not yet determined
  if (!permission) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={s.overlay} />
        <View style={s.sheet}>
          <ActivityIndicator color={C} size="large" />
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={s.overlay} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={{ fontSize: 40, textAlign: 'center' }}>📷</Text>
          <Text style={s.heading}>{t('Camera access required', 'Accès à la caméra requis')}</Text>
          <Text style={s.body}>
            {t("The app needs camera access to scan the driver's QR code.", "L'application a besoin d'accéder à votre caméra pour scanner le code QR du conducteur.")}
          </Text>
          <Pressable style={[s.actionBtn, { backgroundColor: C }]} onPress={requestPermission}>
            <Text style={s.actionTxt}>{t('Allow camera', 'Autoriser la caméra')}</Text>
          </Pressable>
          <Pressable style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeTxt}>{t('Cancel', 'Annuler')}</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.fullScreen}>
        {/* Camera */}
        {scanState === 'scanning' && (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
        )}

        {/* Dark top / bottom bars */}
        <View style={s.topBar}>
          <Pressable style={s.topClose} onPress={onClose}>
            <Text style={s.topCloseTxt}>✕</Text>
          </Pressable>
          <Text style={s.topTitle}>{t("Scan the driver's QR code", 'Scanner le QR du conducteur')}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Scan frame */}
        {scanState === 'scanning' && (
          <View style={s.frameWrap}>
            <View style={s.frame}>
              <View style={[s.corner, s.tl]} />
              <View style={[s.corner, s.tr]} />
              <View style={[s.corner, s.bl]} />
              <View style={[s.corner, s.br]} />
            </View>
            <Text style={s.hint}>{t("Place the driver's QR code in the frame", 'Placez le QR du conducteur dans le cadre')}</Text>
          </View>
        )}

        {/* Validating */}
        {scanState === 'validating' && (
          <View style={s.stateBox}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={s.stateTxt}>{t('Validating…', 'Validation en cours…')}</Text>
          </View>
        )}

        {/* Success */}
        {scanState === 'success' && (
          <View style={s.resultSheet}>
            <Text style={s.resultIcon}>✅</Text>
            <Text style={s.resultTitle}>{t('Welcome on board!', 'Bienvenue à bord !')}</Text>
            <Text style={s.resultBody}>{t('Your presence has been confirmed. Enjoy the ride!', 'Votre présence a été confirmée. Bon voyage !')}</Text>
            <Pressable style={[s.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => { onValidated(); onClose(); }}>
              <Text style={s.actionTxt}>{t('Continue', 'Continuer')}</Text>
            </Pressable>
          </View>
        )}

        {/* Error */}
        {scanState === 'error' && (
          <View style={s.resultSheet}>
            <Text style={s.resultIcon}>❌</Text>
            <Text style={s.resultTitle}>{t('Validation failed', 'Validation échouée')}</Text>
            <Text style={s.resultBody}>{errorMsg}</Text>
            <Pressable style={[s.actionBtn, { backgroundColor: C }]} onPress={retry}>
              <Text style={s.actionTxt}>{t('Retry', 'Réessayer')}</Text>
            </Pressable>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeTxt}>{t('Cancel', 'Annuler')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const CORNER = 24;

const s = StyleSheet.create({
  overlay:    { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  fullScreen: { flex: 1, backgroundColor: '#000' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
  },
  topClose:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  topCloseTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  topTitle:    { color: '#fff', fontSize: 16, fontWeight: '800' },

  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  frame:     { width: 240, height: 240, position: 'relative' },
  corner:    { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0, borderBottomRightRadius: 6 },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  stateTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48, alignItems: 'center', gap: 12,
  },
  resultSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48, alignItems: 'center', gap: 12,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 4 },
  resultIcon:  { fontSize: 52 },
  resultTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  resultBody:  { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  heading: { fontSize: 18, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  body:    { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  actionBtn: { borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center' },
  actionTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  closeBtn:  { backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 13, width: '100%', alignItems: 'center' },
  closeTxt:  { fontSize: 15, fontWeight: '700', color: '#475569' },
});

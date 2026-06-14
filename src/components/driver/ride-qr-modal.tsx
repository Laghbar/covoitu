import QRCode from 'react-native-qrcode-svg';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLang } from '@/context/language';

const C = '#10B981';

export type QRRide = {
  id: string;
  validation_token: string;
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
};

type Props = { ride: QRRide | null; onClose: () => void };

export function RideQRModal({ ride, onClose }: Props) {
  const t = useLang();
  if (!ride) return null;

  const qrValue = JSON.stringify({ r: ride.id, t: ride.validation_token });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />

        <Text style={s.title}>{t('Ride QR Code', 'Code QR du trajet')}</Text>
        <Text style={s.route}>{ride.from_city} → {ride.to_city}</Text>
        <Text style={s.date}>
          {new Date(ride.departure_date).toLocaleDateString('fr-MA', {
            weekday: 'long', day: '2-digit', month: 'long',
          })} · {ride.departure_time.slice(0, 5)}
        </Text>

        {/* QR */}
        <View style={s.qrWrap}>
          <View style={s.qrInner}>
            <QRCode value={qrValue} size={220} color="#1E293B" backgroundColor="#fff" />
          </View>
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoIcon}>📱</Text>
          <Text style={s.infoTxt}>
            {t(
              "Show this code to each passenger as they board the vehicle.\nThe app confirms the right passenger is on board.",
              "Montrez ce code à chaque passager dès qu'il monte dans le véhicule.\nL'app confirme que le bon passager est à bord."
            )}
          </Text>
        </View>

        <Pressable style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeTxt}>{t('Close', 'Fermer')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 8 },
  title:  { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  route:  { fontSize: 15, fontWeight: '700', color: '#475569' },
  date:   { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  qrWrap: {
    backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20,
    borderWidth: 2, borderColor: C + '40', marginVertical: 8,
  },
  qrInner: {
    borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0', width: '100%', marginTop: 4,
  },
  infoIcon: { fontSize: 20 },
  infoTxt:  { flex: 1, fontSize: 13, color: '#166534', lineHeight: 20 },
  closeBtn: {
    backgroundColor: '#F1F5F9', borderRadius: 14,
    paddingHorizontal: 48, paddingVertical: 14, marginTop: 8,
  },
  closeTxt: { fontSize: 15, fontWeight: '800', color: '#475569' },
});

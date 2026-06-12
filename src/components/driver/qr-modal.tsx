import QRCode from 'react-native-qrcode-svg';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';

const C = '#10B981';

type Props = { visible: boolean; onClose: () => void };

export function DriverQRModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const driverCode = `harizana-driver:${user?.id ?? ''}`;

  const handleShare = async () => {
    const msg = `Find my rides on Harizana!\nPaste this code in the app:\n${driverCode}`;
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(driverCode); alert('Driver code copied! Share it with passengers to paste in the app.'); }
      catch { alert(driverCode); }
    } else {
      await Share.share({ message: msg });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dot} />
            <Text style={styles.title}>My Driver QR Code</Text>
            <Text style={styles.sub}>Passengers scan this to find your rides</Text>
          </View>

          {/* QR */}
          <View style={styles.qrWrap}>
            <QRCode
              value={driverCode}
              size={200}
              color="#1E293B"
              backgroundColor="#fff"
            />
          </View>

          {/* Identity */}
          <Text style={styles.driverName}>{user?.name ?? 'Driver'}</Text>
          <Text style={styles.hint}>Let passengers scan the QR above, or share your code via the button below</Text>

          {/* Actions */}
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareTxt}>
              {Platform.OS === 'web' ? '📋  Copy Driver Code' : '📤  Share My Code'}
            </Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheet: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    alignItems: 'center', gap: 14, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 16,
  },

  header: { alignItems: 'center', gap: 4 },
  dot: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B', letterSpacing: -0.4 },
  sub: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  qrWrap: {
    padding: 16, borderRadius: 20,
    borderWidth: 2, borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    shadowColor: C, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },

  driverName: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  hint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 12 },

  shareBtn: {
    backgroundColor: C, borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center',
  },
  shareTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  closeBtn: {
    backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 12,
    width: '100%', alignItems: 'center',
  },
  closeTxt: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});

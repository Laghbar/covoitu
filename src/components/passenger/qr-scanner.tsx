import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const C = '#3B82F6';

export type Props = {
  visible: boolean;
  onClose: () => void;
  onDriverFound: (driverId: string) => void;
};

function parseCode(raw: string): string | null {
  const t = raw.trim();
  if (t.startsWith('horizon-driver:')) return t.split('horizon-driver:')[1] || null;
  if (/^[0-9a-f-]{36}$/i.test(t)) return t;
  return null;
}

// ── Web: paste code manually ──────────────────────────────────────────────────
function WebScanner({ onDriverFound, onClose }: { onDriverFound: (id: string) => void; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [err,  setErr]  = useState('');

  const submit = () => {
    const id = parseCode(code);
    if (!id) { setErr('Invalid code. Paste the full driver code or UUID.'); return; }
    onDriverFound(id);
  };

  return (
    <View style={web.box}>
      <Text style={web.title}>Enter Driver Code</Text>
      <Text style={web.sub}>Paste the code the driver shared with you</Text>
      <TextInput
        style={web.input}
        value={code}
        onChangeText={(t) => { setCode(t); setErr(''); }}
        placeholder="horizon-driver:xxxxxxxx-xxxx-…"
        placeholderTextColor="#94A3B8"
        autoFocus
      />
      {err ? <Text style={web.err}>{err}</Text> : null}
      <Pressable style={web.btn} onPress={submit}>
        <Text style={web.btnTxt}>Find Driver</Text>
      </Pressable>
      <Pressable style={web.cancel} onPress={onClose}>
        <Text style={web.cancelTxt}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const web = StyleSheet.create({
  box:       { backgroundColor: '#fff', borderRadius: 20, padding: 28, gap: 14, width: '100%', maxWidth: 380, alignItems: 'center' },
  title:     { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  sub:       { fontSize: 13, color: '#64748B', textAlign: 'center' },
  input:     { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: '#1E293B' },
  err:       { fontSize: 12, color: '#EF4444', textAlign: 'center' },
  btn:       { width: '100%', backgroundColor: C, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnTxt:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancel:    { width: '100%', backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});

// ── Native: live camera scanner ───────────────────────────────────────────────
function NativeScanner({ onDriverFound, onClose }: { onDriverFound: (id: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  useEffect(() => { scanned.current = false; }, []);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={nat.permBox}>
        <Text style={nat.permTitle}>Camera Permission Needed</Text>
        <Text style={nat.permSub}>Allow camera access to scan the driver's QR code.</Text>
        <Pressable style={nat.permBtn} onPress={requestPermission}>
          <Text style={nat.permBtnTxt}>Allow Camera</Text>
        </Pressable>
        <Pressable style={nat.cancelWrap} onPress={onClose}>
          <Text style={nat.cancelTxt}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(e) => {
          if (scanned.current) return;
          const id = parseCode(e.data);
          if (!id) return;
          scanned.current = true;
          onDriverFound(id);
        }}
      />
      {/* Overlay with corner brackets */}
      <View style={nat.overlay}>
        <View style={nat.topDim} />
        <View style={nat.middle}>
          <View style={nat.sideDim} />
          <View style={nat.frame}>
            <View style={[nat.corner, nat.tl]} />
            <View style={[nat.corner, nat.tr]} />
            <View style={[nat.corner, nat.bl]} />
            <View style={[nat.corner, nat.br]} />
          </View>
          <View style={nat.sideDim} />
        </View>
        <View style={nat.bottomDim}>
          <Text style={nat.hint}>Point at the driver's QR code</Text>
          <Pressable style={nat.cancelBtn} onPress={onClose}>
            <Text style={nat.cancelBtnTxt}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const FRAME = 220;
const DIM = 'rgba(0,0,0,0.62)';
const nat = StyleSheet.create({
  overlay:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topDim:       { flex: 1, backgroundColor: DIM },
  middle:       { flexDirection: 'row', height: FRAME },
  sideDim:      { flex: 1, backgroundColor: DIM },
  frame:        { width: FRAME, height: FRAME },
  bottomDim:    { flex: 1, backgroundColor: DIM, alignItems: 'center', paddingTop: 28, gap: 18 },

  corner:       { position: 'absolute', width: 26, height: 26, borderColor: '#fff', borderRadius: 3 },
  tl: { top: 0,    left: 0,    borderTopWidth: 3,    borderLeftWidth: 3 },
  tr: { top: 0,    right: 0,   borderTopWidth: 3,    borderRightWidth: 3 },
  bl: { bottom: 0, left: 0,    borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0,   borderBottomWidth: 3, borderRightWidth: 3 },

  hint:         { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  cancelBtn:    { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 13 },
  cancelBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  permBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, backgroundColor: '#0F172A' },
  permTitle:    { fontSize: 20, fontWeight: '800', color: '#fff' },
  permSub:      { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  permBtn:      { backgroundColor: C, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnTxt:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelWrap:   { paddingVertical: 12 },
  cancelTxt:    { color: '#94A3B8', fontSize: 15 },
});

// ── Public component ──────────────────────────────────────────────────────────
export function QRScannerModal({ visible, onClose, onDriverFound }: Props) {
  const handleFound = (id: string) => { onClose(); onDriverFound(id); };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {Platform.OS === 'web' ? (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <WebScanner onDriverFound={handleFound} onClose={onClose} />
          </View>
        ) : (
          <NativeScanner onDriverFound={handleFound} onClose={onClose} />
        )}
      </View>
    </Modal>
  );
}

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { VerificationStatus } from '@/context/auth';
import { DocumentsModal } from './driver/documents';

const G = '#10B981';

type Props = { status: VerificationStatus | null };

export function DriverVerificationGate({ status }: Props) {
  const { logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [docsOpen, setDocsOpen] = useState(false);

  const handleDocsClose = async () => {
    setDocsOpen(false);
    await refreshUser();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={[s.logo, { backgroundColor: G }]}>
          <Text style={s.logoTxt}>H</Text>
        </View>
        <Text style={s.appName}>Horizon</Text>

        {status === 'pending_review' && (
          <>
            <View style={s.iconWrap}>
              <Text style={s.icon}>⏳</Text>
            </View>
            <Text style={s.title}>Under Review</Text>
            <Text style={s.body}>
              Your documents have been submitted and are being reviewed by our team.
              This usually takes 24–48 hours. You'll be able to create rides as soon as you're verified.
            </Text>
            <View style={s.infoCard}>
              <Row label="Status" value="Pending review" color="#D97706" />
              <Row label="Next step" value="Wait for admin approval" color="#64748B" />
            </View>
          </>
        )}

        {status === 'rejected' && (
          <>
            <View style={s.iconWrap}>
              <Text style={s.icon}>❌</Text>
            </View>
            <Text style={s.title}>Verification Rejected</Text>
            <Text style={s.body}>
              Your documents were not accepted. Please re-upload clearer, valid documents and resubmit for review.
            </Text>
            <Pressable style={[s.btn, { backgroundColor: '#EF4444' }]} onPress={() => setDocsOpen(true)}>
              <Text style={s.btnTxt}>Re-upload Documents</Text>
            </Pressable>
          </>
        )}

        {(status === 'unsubmitted' || !status) && (
          <>
            <View style={s.iconWrap}>
              <Text style={s.icon}>📋</Text>
            </View>
            <Text style={s.title}>Complete Verification</Text>
            <Text style={s.body}>
              To publish rides and earn on Horizon, you need to verify your identity. This protects passengers and ensures trust on the platform.
            </Text>

            <View style={s.infoCard}>
              <Row label="🪪" value="National ID (CIN) — front & back" />
              <Row label="🚗" value="Driver's licence" />
              <Row label="📄" value="Vehicle registration (carte grise)" />
              <Row label="🤳" value="Profile selfie" />
            </View>

            <Pressable style={[s.btn, { backgroundColor: G }]} onPress={() => setDocsOpen(true)}>
              <Text style={s.btnTxt}>Upload Documents</Text>
            </Pressable>
          </>
        )}

        <Pressable style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutTxt}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <DocumentsModal
        visible={docsOpen}
        onClose={handleDocsClose}
      />
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { alignItems: 'center', padding: 24, gap: 16 },

  logo:    { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  logoTxt: { fontSize: 32, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 8 },

  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  icon:     { fontSize: 36 },

  title: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  body:  { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, maxWidth: 340 },

  infoCard: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel:  { fontSize: 16, width: 28 },
  rowValue:  { fontSize: 14, color: '#1E293B', fontWeight: '500', flex: 1 },

  btn:    { width: '100%', maxWidth: 380, backgroundColor: G, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

  logoutBtn: { marginTop: 8, paddingVertical: 10 },
  logoutTxt: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
});

import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#10B981';

type DocType = 'national_id' | 'license' | 'registration';

const DOCS: { key: DocType; label: string; desc: string; emoji: string }[] = [
  { key: 'national_id',  label: 'National ID (CIN)',     desc: 'Front & back of your CIN card',    emoji: '🪪' },
  { key: 'license',      label: "Driver's Licence",      desc: 'Your valid driving licence',        emoji: '🚗' },
  { key: 'registration', label: 'Vehicle Registration',  desc: 'Carte grise de votre véhicule',     emoji: '📄' },
];

type UrlMap = Record<DocType, string | null>;
type UploadingMap = Partial<Record<DocType, boolean>>;

type Props = {
  visible: boolean;
  onClose: () => void;
  onStatusChange?: (uploaded: number, verified: boolean) => void;
};

export function DocumentsModal({ visible, onClose, onStatusChange }: Props) {
  const { user }    = useAuth();
  const insets      = useSafeAreaInsets();
  const [urls,       setUrls]       = useState<UrlMap>({ national_id: null, license: null, registration: null });
  const [uploading,  setUploading]  = useState<UploadingMap>({});
  const [verified,   setVerified]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const fileInputRef = useRef<Record<DocType, HTMLInputElement | null>>({
    national_id: null, license: null, registration: null,
  });

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('doc_national_id_url, doc_license_url, doc_registration_url, documents_verified')
      .eq('id', user.id)
      .single();
    if (data) {
      const map: UrlMap = {
        national_id:  data.doc_national_id_url  ?? null,
        license:      data.doc_license_url       ?? null,
        registration: data.doc_registration_url  ?? null,
      };
      setUrls(map);
      setVerified(data.documents_verified ?? false);
      const uploaded = Object.values(map).filter(Boolean).length;
      onStatusChange?.(uploaded, data.documents_verified ?? false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (visible) loadDocs(); }, [visible, loadDocs]);

  const uploadFile = async (docType: DocType, file: Blob | File, contentType: string) => {
    if (!user) return;
    setError(null);
    setUploading(prev => ({ ...prev, [docType]: true }));

    const path = `${user.id}/${docType}`;
    const { error: upErr } = await supabase.storage
      .from('driver-docs')
      .upload(path, file, { upsert: true, contentType });

    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setUploading(prev => ({ ...prev, [docType]: false }));
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('driver-docs').getPublicUrl(path);

    const colName = `doc_${docType}_url` as const;
    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ [colName]: publicUrl })
      .eq('id', user.id);

    if (dbErr) {
      setError(`Save failed: ${dbErr.message}`);
    } else {
      const newUrls: UrlMap = { ...urls, [docType]: publicUrl };
      const uploaded = Object.values(newUrls).filter(Boolean).length;
      setUrls(newUrls);
      onStatusChange?.(uploaded, verified);

      // Auto-submit for review when all 3 docs are uploaded
      if (uploaded === 3) {
        await supabase
          .from('driver_verifications')
          .update({ status: 'pending_review', submitted_at: new Date().toISOString() })
          .eq('driver_id', user.id)
          .in('status', ['unsubmitted', 'rejected']);
      }
    }
    setUploading(prev => ({ ...prev, [docType]: false }));
  };

  const pickNative = async (docType: DocType) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Allow photo library access in Settings to upload documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const response = await fetch(uri);
    const blob = await response.blob();
    await uploadFile(docType, blob, 'image/jpeg');
  };

  const pickWeb = (docType: DocType) => {
    if (!fileInputRef.current[docType]) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.onchange = async (e: any) => {
        const file: File = e.target?.files?.[0];
        if (!file) return;
        await uploadFile(docType, file, file.type || 'application/octet-stream');
      };
      fileInputRef.current[docType] = input;
    }
    fileInputRef.current[docType]!.value = '';
    fileInputRef.current[docType]!.click();
  };

  const handleUpload = (docType: DocType) => {
    if (Platform.OS === 'web') pickWeb(docType);
    else pickNative(docType);
  };

  const uploadedCount = Object.values(urls).filter(Boolean).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>My Documents</Text>
            <Text style={styles.subtitle}>{uploadedCount}/3 uploaded</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={C} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Verification status banner */}
            {verified ? (
              <View style={[styles.statusBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={styles.statusEmoji}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusTitle, { color: '#10B981' }]}>Verified by Admin</Text>
                  <Text style={styles.statusDesc}>Your documents have been reviewed and verified.</Text>
                </View>
              </View>
            ) : uploadedCount === 3 ? (
              <View style={[styles.statusBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={styles.statusEmoji}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusTitle, { color: '#D97706' }]}>Pending Review</Text>
                  <Text style={styles.statusDesc}>All documents uploaded. Admin will review shortly.</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.statusBanner, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Text style={styles.statusEmoji}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusTitle, { color: '#475569' }]}>Upload Required</Text>
                  <Text style={styles.statusDesc}>Upload all 3 documents to get verified and start accepting rides.</Text>
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorTxt}>⚠️ {error}</Text>
                <Pressable onPress={() => setError(null)}>
                  <Text style={{ color: '#EF4444', fontWeight: '700', paddingHorizontal: 6 }}>✕</Text>
                </Pressable>
              </View>
            )}

            {/* Document slots */}
            {DOCS.map(doc => {
              const uploaded  = !!urls[doc.key];
              const isLoading = !!uploading[doc.key];

              return (
                <View key={doc.key} style={[styles.docCard, uploaded && styles.docCardUploaded]}>
                  <View style={styles.docLeft}>
                    <View style={[styles.docIcon, { backgroundColor: uploaded ? C + '15' : '#F1F5F9' }]}>
                      <Text style={styles.docEmoji}>{doc.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docLabel}>{doc.label}</Text>
                      <Text style={styles.docDesc}>{doc.desc}</Text>
                      {uploaded && (
                        <Text style={[styles.uploadedTag, { color: C }]}>✓ Uploaded</Text>
                      )}
                    </View>
                  </View>

                  <Pressable
                    style={[
                      styles.uploadBtn,
                      uploaded ? styles.uploadBtnReplace : styles.uploadBtnPrimary,
                      isLoading && { opacity: 0.6 },
                    ]}
                    onPress={() => handleUpload(doc.key)}
                    disabled={isLoading}>
                    {isLoading
                      ? <ActivityIndicator color={uploaded ? C : '#fff'} size="small" />
                      : <Text style={[styles.uploadBtnTxt, !uploaded && { color: '#fff' }]}>
                          {uploaded ? 'Replace' : 'Upload'}
                        </Text>
                    }
                  </Pressable>
                </View>
              );
            })}

            <View style={styles.noteBox}>
              <Text style={styles.noteTxt}>
                📌 Accepted formats: photos (JPG, PNG) or PDF. Max size: 10 MB.{'\n'}
                Your documents are stored securely and only visible to platform admins.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:  {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  title:    { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 15, color: '#64748B', fontWeight: '700' },

  content: { padding: 20, gap: 14, paddingBottom: 40 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  statusEmoji: { fontSize: 24 },
  statusTitle: { fontSize: 14, fontWeight: '700' },
  statusDesc:  { fontSize: 12, color: '#64748B', marginTop: 2 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorTxt: { flex: 1, color: '#EF4444', fontSize: 13 },

  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: 'transparent',
  },
  docCardUploaded: { borderColor: C + '30' },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  docIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  docEmoji:   { fontSize: 22 },
  docLabel:   { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  docDesc:    { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  uploadedTag:{ fontSize: 11, fontWeight: '700', marginTop: 3 },

  uploadBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    minWidth: 72, alignItems: 'center',
  },
  uploadBtnPrimary: { backgroundColor: C },
  uploadBtnReplace: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  uploadBtnTxt: { fontSize: 13, fontWeight: '700', color: C },

  noteBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  noteTxt: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },
});

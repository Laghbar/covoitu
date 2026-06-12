import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

const C = '#6366F1';

type Profile = {
  id: string;
  name: string;
  role: string;
  is_admin: boolean;
  suspended: boolean;
  documents_verified: boolean;
  created_at: string;
};

type DocUrls = {
  doc_national_id_url:  string | null;
  doc_license_url:      string | null;
  doc_registration_url: string | null;
};

const DOC_LABELS: { key: keyof DocUrls; label: string; emoji: string }[] = [
  { key: 'doc_national_id_url',  label: 'National ID (CIN)',    emoji: '🪪' },
  { key: 'doc_license_url',      label: "Driver's Licence",     emoji: '🚗' },
  { key: 'doc_registration_url', label: 'Vehicle Registration', emoji: '📄' },
];

function DocsModal({
  driver,
  onClose,
  onVerified,
}: {
  driver: { id: string; name: string } | null;
  onClose: () => void;
  onVerified: (id: string) => void;
}) {
  const [docs,     setDocs]     = useState<DocUrls | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [verifying,setVerifying]= useState(false);

  useEffect(() => {
    if (!driver) return;
    setDocs(null);
    setLoading(true);
    supabase
      .from('profiles')
      .select('doc_national_id_url, doc_license_url, doc_registration_url')
      .eq('id', driver.id)
      .single()
      .then(({ data }) => {
        setDocs(data ?? { doc_national_id_url: null, doc_license_url: null, doc_registration_url: null });
        setLoading(false);
      });
  }, [driver?.id]);

  const handleVerify = async () => {
    if (!driver) return;
    setVerifying(true);
    const { error } = await supabase
      .from('profiles')
      .update({ documents_verified: true })
      .eq('id', driver.id);
    setVerifying(false);
    if (!error) { onVerified(driver.id); onClose(); }
  };

  const openDoc = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  if (!driver) return null;

  const uploadedCount = docs
    ? DOC_LABELS.filter(d => docs[d.key]).length
    : 0;

  return (
    <Modal visible={!!driver} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={dm.overlay} onPress={onClose} />
      <View style={dm.panel}>
        <View style={dm.handle} />
        <View style={dm.header}>
          <View>
            <Text style={dm.title}>Documents — {driver.name}</Text>
            <Text style={dm.sub}>{uploadedCount}/3 documents uploaded</Text>
          </View>
          <Pressable style={dm.closeBtn} onPress={onClose}>
            <Text style={dm.closeTxt}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={dm.content}>
          {loading ? (
            <ActivityIndicator color={C} style={{ marginTop: 20 }} />
          ) : (
            <>
              {DOC_LABELS.map(d => {
                const url = docs?.[d.key] ?? null;
                return (
                  <View key={d.key} style={[dm.docRow, url && dm.docRowUploaded]}>
                    <Text style={dm.docEmoji}>{d.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.docLabel}>{d.label}</Text>
                      <Text style={url ? dm.uploaded : dm.missing}>
                        {url ? '✓ Uploaded' : '✗ Not uploaded'}
                      </Text>
                    </View>
                    {url && (
                      <Pressable style={dm.viewBtn} onPress={() => openDoc(url)}>
                        <Text style={dm.viewTxt}>View 🔗</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}

              {uploadedCount === 0 && (
                <View style={dm.noDocsBox}>
                  <Text style={dm.noDocsTxt}>
                    This driver has not uploaded any documents yet. Ask them to upload via their profile → Verification.
                  </Text>
                </View>
              )}

              <Pressable
                style={[dm.verifyBtn, (uploadedCount === 0 || verifying) && { opacity: 0.5 }]}
                onPress={handleVerify}
                disabled={uploadedCount === 0 || verifying}>
                <Text style={dm.verifyTxt}>
                  {verifying ? 'Verifying…' : '✓ Mark as Verified'}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

type FilterKey = 'all' | 'drivers' | 'passengers' | 'suspended';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'drivers',    label: 'Drivers' },
  { key: 'passengers', label: 'Passengers' },
  { key: 'suspended',  label: 'Suspended' },
];

function avatarColor(profile: Profile) {
  if (profile.is_admin) return '#6366F1';
  if (profile.role === 'driver') return '#10B981';
  return '#3B82F6';
}

function roleLabel(profile: Profile) {
  if (profile.is_admin) return 'Admin';
  if (profile.role === 'driver') return 'Driver';
  return 'Passenger';
}

export function AdminUsers() {
  const [profiles,    setProfiles]    = useState<Profile[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [docsDriver,  setDocsDriver]  = useState<{ id: string; name: string } | null>(null);

  const fetchProfiles = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, name, role, is_admin, suspended, documents_verified, created_at')
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setProfiles(data ?? []);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchProfiles();
      setLoading(false);
    })();
  }, [fetchProfiles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfiles();
    setRefreshing(false);
  }, [fetchProfiles]);

  const suspendUser = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('profiles')
      .update({ suspended: true })
      .eq('id', id);
    if (!err) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, suspended: true } : p)),
      );
    }
  }, []);

  const unsuspendUser = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('profiles')
      .update({ suspended: false })
      .eq('id', id);
    if (!err) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, suspended: false } : p)),
      );
    }
  }, []);

  const onDriverVerified = useCallback((id: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, documents_verified: true } : p));
  }, []);

  const confirmSuspend = useCallback(
    (profile: Profile) => {
      const action = profile.suspended ? 'Unsuspend' : 'Suspend';
      const message = profile.suspended
        ? `Unsuspend ${profile.name}?`
        : `Suspend ${profile.name}? They will not be able to use the app.`;

      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          if (profile.suspended) unsuspendUser(profile.id);
          else suspendUser(profile.id);
        }
      } else {
        Alert.alert(action, message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action,
            style: profile.suspended ? 'default' : 'destructive',
            onPress: () => {
              if (profile.suspended) unsuspendUser(profile.id);
              else suspendUser(profile.id);
            },
          },
        ]);
      }
    },
    [suspendUser, unsuspendUser],
  );

  const filtered = profiles.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'drivers')    return p.role === 'driver';
    if (activeFilter === 'passengers') return p.role === 'passenger';
    if (activeFilter === 'suspended')  return p.suspended;
    return true;
  });

  if (loading) {
    return <ActivityIndicator color={C} size="large" style={{ marginTop: 40 }} />;
  }

  if (error) {
    return (
      <View style={styles.errorBanner}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={async () => {
            setLoading(true);
            await fetchProfiles();
            setLoading(false);
          }}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
    <DocsModal
      driver={docsDriver}
      onClose={() => setDocsDriver(null)}
      onVerified={onDriverVerified}
    />
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.chip,
                  activeFilter === f.key && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeFilter === f.key && styles.chipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: avatarColor(item) }]}>
              <Text style={styles.avatarText}>
                {(item.name?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: avatarColor(item) + '20' }]}>
                  <Text style={[styles.badgeText, { color: avatarColor(item) }]}>
                    {roleLabel(item)}
                  </Text>
                </View>
              </View>
              <Text style={styles.emailText}>ID: {item.id.slice(0, 8)}…</Text>
              <View style={styles.tagsRow}>
                {item.suspended && (
                  <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.badgeText, { color: '#EF4444' }]}>Suspended</Text>
                  </View>
                )}
                {item.role === 'driver' && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: item.documents_verified ? '#D1FAE5' : '#FEF3C7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: item.documents_verified ? '#10B981' : '#F59E0B' },
                      ]}
                    >
                      {item.documents_verified ? '✓ Verified' : '⏳ Unverified'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => confirmSuspend(item)}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: item.suspended ? '#D1FAE5' : '#FEE2E2',
                },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  { color: item.suspended ? '#10B981' : '#EF4444' },
                ]}
              >
                {item.suspended ? 'Unsuspend' : 'Suspend'}
              </Text>
            </TouchableOpacity>

            {item.role === 'driver' && !item.documents_verified && (
              <TouchableOpacity
                onPress={() => setDocsDriver({ id: item.id, name: item.name })}
                style={[styles.actionBtn, { backgroundColor: '#EDE9FE' }]}
              >
                <Text style={[styles.actionText, { color: C }]}>View Docs</Text>
              </TouchableOpacity>
            )}
            {item.role === 'driver' && item.documents_verified && (
              <View style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.actionText, { color: '#10B981' }]}>✓ Verified</Text>
              </View>
            )}
          </View>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No users found</Text>
      }
    />
    </>
  );
}

const dm = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  sub:   { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  content: { padding: 16, gap: 10, paddingBottom: 8 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  docRowUploaded: { borderColor: '#10B98130', backgroundColor: '#F0FDF4' },
  docEmoji: { fontSize: 22 },
  docLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  uploaded: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  missing:  { fontSize: 12, color: '#EF4444', marginTop: 2 },
  viewBtn: { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewTxt: { fontSize: 12, fontWeight: '700', color: C },
  noDocsBox: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  noDocsTxt: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  verifyBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  verifyTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  header: {
    gap: 10,
    marginBottom: 4,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: C,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  emailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  errorBanner: {
    margin: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
});

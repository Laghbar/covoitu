import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#3B82F6';

type MenuItem = {
  label: string; subtitle?: string;
  icon: { ios: string; android: string };
  iconBg: string; iconColor: string;
  onPress: () => void;
  danger?: boolean;
};

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Pressable style={styles.menuRow} onPress={item.onPress}>
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <SymbolView name={item.icon as any} size={16} tintColor={item.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, item.danger && { color: '#EF4444' }]}>{item.label}</Text>
        {item.subtitle && <Text style={styles.menuSub}>{item.subtitle}</Text>}
      </View>
      {!item.danger && (
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' } as any} size={14} tintColor="#CBD5E1" />
      )}
    </Pressable>
  );
}

export function PassengerProfile() {
  const { user, logout } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [name,     setName]     = useState(user?.name ?? '');
  const [phone,    setPhone]    = useState('');
  const [bio,      setBio]      = useState('');
  const [photo,    setPhoto]    = useState<string | null>(null);
  const [stats,    setStats]    = useState({ trips: 0, reviews: 0 });
  const [memberSince, setMemberSince] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initial = ((name || user?.name || 'P')[0]).toUpperCase();

  useEffect(() => {
    if (!user) return;

    supabase.from('profiles')
      .select('name, phone, bio, created_at')
      .eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.name)  setName(data.name);
        if (data?.phone) setPhone(data.phone);
        if (data?.bio)   setBio(data.bio);
        if (data?.created_at) {
          setMemberSince(new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        }
      });

    Promise.all([
      supabase.from('bookings')
        .select('ride_completed')
        .eq('passenger_id', user.id)
        .eq('status', 'accepted'),
      supabase.from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('passenger_id', user.id),
    ]).then(([bookingsRes, reviewsRes]) => {
      const bookings = bookingsRes.data ?? [];
      const trips = bookings.filter(b => b.ride_completed).length;
      setStats({ trips, reviews: reviewsRes.count ?? 0 });
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles').update({ name, phone, bio }).eq('id', user.id);
    setSaving(false);
    if (error) { Alert.alert('Save failed', error.message); return; }
    setEditing(false);
  };

  const pickWeb = () => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) setPhoto(URL.createObjectURL(file));
      };
      fileInputRef.current = input;
    }
    fileInputRef.current!.value = '';
    fileInputRef.current!.click();
  };

  const changePhoto = () => {
    if (Platform.OS === 'web') { pickWeb(); return; }
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return;
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.8 });
        if (!r.canceled) setPhoto(r.assets[0].uri);
      }},
      { text: 'Choose from Library', onPress: async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) return;
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 });
        if (!r.canceled) setPhoto(r.assets[0].uri);
      }},
      photo ? { text: 'Remove Photo', style: 'destructive' as const, onPress: () => setPhoto(null) } : null,
      { text: 'Cancel', style: 'cancel' as const },
    ].filter(Boolean) as any);
  };

  const menu: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          label: 'Notifications',
          icon: { ios: 'bell.fill', android: 'notifications' },
          iconBg: '#F59E0B15', iconColor: '#F59E0B',
          onPress: () => Alert.alert('Notifications', 'Notification settings coming soon.'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          label: 'Help & Support',
          icon: { ios: 'questionmark.circle.fill', android: 'help' },
          iconBg: '#0EA5E915', iconColor: '#0EA5E9',
          onPress: () => Alert.alert('Help', 'Help center coming soon.'),
        },
        {
          label: 'Privacy & Security',
          icon: { ios: 'lock.shield.fill', android: 'security' },
          iconBg: '#6366F115', iconColor: '#6366F1',
          onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon.'),
        },
      ],
    },
    {
      title: '',
      items: [
        {
          label: 'Log Out',
          icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
          iconBg: '#FEF2F2', iconColor: '#EF4444',
          danger: true, onPress: logout,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <Pressable style={styles.avatarWrap} onPress={changePhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: C }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={[styles.cameraBtn, { backgroundColor: C }]}>
            <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera' } as any} size={12} tintColor="#fff" />
          </View>
        </Pressable>

        <Text style={styles.avatarName}>{name || user?.name || 'Passenger'}</Text>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
        {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}

        <View style={styles.verifiedBadge}>
          <SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified' } as any} size={13} tintColor="#3B82F6" />
          <Text style={styles.verifiedText}>Verified Passenger</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: C }]}>{stats.trips}</Text>
          <Text style={styles.statLabel}>Trips done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: '#F59E0B' }]}>{stats.reviews}</Text>
          <Text style={styles.statLabel}>Reviews given</Text>
        </View>
      </View>

      {/* Personal info (editable) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Personal Info</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {editing && (
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.editBtn, { backgroundColor: editing ? C : '#F1F5F9', opacity: saving ? 0.6 : 1 }]}
              onPress={() => editing ? saveProfile() : setEditing(true)}
              disabled={saving}>
              <SymbolView
                name={{ ios: editing ? 'checkmark' : 'pencil', android: editing ? 'check' : 'edit' } as any}
                size={13} tintColor={editing ? '#fff' : '#475569'}
              />
              <Text style={[styles.editBtnText, { color: editing ? '#fff' : '#475569' }]}>
                {saving ? 'Saving…' : editing ? 'Save' : 'Edit'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Full name */}
        <View>
          <Text style={styles.fieldLabel}>Full name</Text>
          <View style={[styles.fieldBox, editing && { borderColor: C + '80' }]}>
            <SymbolView name={{ ios: 'person.fill', android: 'person' } as any} size={15} tintColor={editing ? C : '#94A3B8'} />
            {editing ? (
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholderTextColor="#94A3B8" />
            ) : (
              <Text style={styles.fieldValue}>{name || '—'}</Text>
            )}
          </View>
        </View>

        {/* Phone */}
        <View>
          <Text style={styles.fieldLabel}>Phone</Text>
          <View style={[styles.fieldBox, editing && { borderColor: C + '80' }]}>
            <SymbolView name={{ ios: 'phone.fill', android: 'phone' } as any} size={15} tintColor={editing ? C : '#94A3B8'} />
            {editing ? (
              <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#94A3B8" placeholder="+212 6XX XXX XXX" />
            ) : (
              <Text style={styles.fieldValue}>{phone || '—'}</Text>
            )}
          </View>
        </View>

        {/* Email (read-only) */}
        <View>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.fieldBox}>
            <SymbolView name={{ ios: 'envelope.fill', android: 'email' } as any} size={15} tintColor="#94A3B8" />
            <Text style={[styles.fieldValue, { color: '#94A3B8' }]}>{user?.email}</Text>
            <View style={styles.lockedBadge}>
              <SymbolView name={{ ios: 'lock.fill', android: 'lock' } as any} size={10} tintColor="#94A3B8" />
            </View>
          </View>
        </View>

        {/* Bio */}
        <View>
          <Text style={styles.fieldLabel}>About me</Text>
          {editing ? (
            <TextInput
              style={styles.bioInput}
              value={bio} onChangeText={setBio}
              multiline numberOfLines={3}
              placeholder="Tell drivers a bit about yourself…"
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <View style={styles.bioBox}>
              <Text style={[styles.bioText, !bio && { color: '#CBD5E1', fontStyle: 'italic' }]}>
                {bio || 'No bio yet. Tap Edit to add one.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu sections */}
      {menu.map((section, si) => (
        <View key={si} style={styles.card}>
          {section.title ? <Text style={styles.cardTitle}>{section.title}</Text> : null}
          {section.items.map((item, ii) => (
            <View key={item.label}>
              <MenuRow item={item} />
              {ii < section.items.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.version}>Horizon v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', gap: 5, paddingBottom: 4 },
  avatarWrap: { position: 'relative', marginBottom: 6 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F8FAFC',
  },
  avatarName:   { fontSize: 21, fontWeight: '800', color: '#1E293B' },
  avatarEmail:  { fontSize: 13, color: '#64748B' },
  memberSince:  { fontSize: 12, color: '#94A3B8' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  verifiedText:  { fontSize: 12, color: '#3B82F6', fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statItem:   { flex: 1, alignItems: 'center', gap: 3 },
  statVal:    { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  statLabel:  { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
  statDivider:{ width: 1, height: 32, backgroundColor: '#E2E8F0' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  cancelBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  fieldInput: { flex: 1, fontSize: 15, color: '#1E293B' },
  fieldValue: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },
  lockedBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },

  bioBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  bioText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  bioInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: C + '80', fontSize: 14, color: '#1E293B',
    minHeight: 80, textAlignVertical: 'top',
  },

  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  menuSub:   { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 48 },

  version: { textAlign: 'center', fontSize: 12, color: '#CBD5E1', paddingBottom: 8 },
});

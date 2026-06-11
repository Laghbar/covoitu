import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/auth';

const C = '#10B981';

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

export function DriverProfile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name,  setName]  = useState(user?.name ?? '');
  const [phone, setPhone] = useState('+212 6 12 34 56 78');
  const [bio,   setBio]   = useState('Driver based in Casablanca. Careful, punctual and friendly. 4+ years on Harizana.');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initial = ((name || user?.name || 'D')[0]).toUpperCase();

  const saveProfile = () => {
    Alert.alert('Profile Saved', 'Your changes have been saved.');
    setEditing(false);
  };

  // Web: use a hidden <input type="file">
  const pickWeb = () => {
    if (Platform.OS !== 'web') return;
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) setPhoto(URL.createObjectURL(file));
      };
      fileInputRef.current = input;
    }
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const changePhoto = () => {
    if (Platform.OS === 'web') {
      pickWeb();
      return;
    }
    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo',          onPress: pickFromCamera },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        photo ? { text: 'Remove Photo', style: 'destructive', onPress: () => setPhoto(null) } : null,
        { text: 'Cancel', style: 'cancel' },
      ].filter(Boolean) as any,
    );
  };

  const menu: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          label: 'Verification', subtitle: 'ID & driving licence',
          icon: { ios: 'checkmark.shield.fill', android: 'verified' },
          iconBg: C + '15', iconColor: C,
          onPress: () => Alert.alert('Verification', 'Verification screen coming soon.'),
        },
        {
          label: 'Payment Methods', subtitle: 'Cash · Bank transfer',
          icon: { ios: 'creditcard.fill', android: 'credit_card' },
          iconBg: '#3B82F615', iconColor: '#3B82F6',
          onPress: () => Alert.alert('Payments', 'Payment settings coming soon.'),
        },
        {
          label: 'Notifications',
          icon: { ios: 'bell.fill', android: 'notifications' },
          iconBg: '#F59E0B15', iconColor: '#F59E0B',
          onPress: () => Alert.alert('Notifications', 'Notification settings coming soon.'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Language', subtitle: 'French',
          icon: { ios: 'globe', android: 'language' },
          iconBg: '#8B5CF615', iconColor: '#8B5CF6',
          onPress: () => Alert.alert('Language', 'Language picker coming soon.'),
        },
        {
          label: 'Privacy & Security',
          icon: { ios: 'lock.shield.fill', android: 'security' },
          iconBg: '#6366F115', iconColor: '#6366F1',
          onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon.'),
        },
        {
          label: 'Help & Support',
          icon: { ios: 'questionmark.circle.fill', android: 'help' },
          iconBg: '#0EA5E915', iconColor: '#0EA5E9',
          onPress: () => Alert.alert('Help', 'Help center coming soon.'),
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
          danger: true,
          onPress: logout,
        },
      ],
    },
  ];

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Avatar + photo change */}
      <View style={styles.avatarSection}>
        <Pressable style={styles.avatarWrap} onPress={changePhoto}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: C }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera' } as any} size={12} tintColor="#fff" />
          </View>
        </Pressable>
        <Text style={styles.avatarName}>{name || user?.name || 'Driver'}</Text>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
        <Pressable onPress={changePhoto}>
          <Text style={[styles.changePhotoText, { color: C }]}>Change profile photo</Text>
        </Pressable>

        {/* Rating + stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: C }]}>4.9</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={10} tintColor="#FCD34D" />
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>48</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: C }]}>2 yrs</Text>
            <Text style={styles.statLabel}>Member</Text>
          </View>
        </View>
      </View>

      {/* Editable info card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Personal Info</Text>
          <Pressable
            style={[styles.editBtn, { backgroundColor: editing ? C : '#F1F5F9' }]}
            onPress={() => editing ? saveProfile() : setEditing(true)}>
            <SymbolView
              name={{ ios: editing ? 'checkmark' : 'pencil', android: editing ? 'check' : 'edit' } as any}
              size={13}
              tintColor={editing ? '#fff' : '#475569'}
            />
            <Text style={[styles.editBtnText, { color: editing ? '#fff' : '#475569' }]}>
              {editing ? 'Save' : 'Edit'}
            </Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.fieldLabel}>Full name</Text>
          <View style={[styles.fieldBox, editing && { borderColor: C + '80' }]}>
            <SymbolView name={{ ios: 'person.fill', android: 'person' } as any} size={15} tintColor={editing ? C : '#94A3B8'} />
            {editing ? (
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
            ) : (
              <Text style={styles.fieldValue}>{name}</Text>
            )}
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>Phone</Text>
          <View style={[styles.fieldBox, editing && { borderColor: C + '80' }]}>
            <SymbolView name={{ ios: 'phone.fill', android: 'phone' } as any} size={15} tintColor={editing ? C : '#94A3B8'} />
            {editing ? (
              <TextInput style={styles.fieldInput} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            ) : (
              <Text style={styles.fieldValue}>{phone}</Text>
            )}
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>Email (read-only)</Text>
          <View style={styles.fieldBox}>
            <SymbolView name={{ ios: 'envelope.fill', android: 'email' } as any} size={15} tintColor="#94A3B8" />
            <Text style={[styles.fieldValue, { color: '#94A3B8' }]}>{user?.email}</Text>
            <View style={styles.lockedBadge}>
              <SymbolView name={{ ios: 'lock.fill', android: 'lock' } as any} size={10} tintColor="#94A3B8" />
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>About me</Text>
          {editing ? (
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <View style={styles.bioBox}>
              <Text style={styles.bioText}>{bio}</Text>
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

      <Text style={styles.version}>Harizana v1.0.0 · Driver Edition</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', gap: 6, paddingBottom: 4 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#F0FDF4',
  },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  avatarEmail: { fontSize: 13, color: '#94A3B8' },
  changePhotoText: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 4, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#94A3B8' },
  statDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600' },

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
  menuSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 48 },

  version: { textAlign: 'center', fontSize: 12, color: '#CBD5E1', paddingBottom: 8 },
});

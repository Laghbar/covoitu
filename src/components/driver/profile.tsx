import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { useLang } from '@/context/language';
import { supabase } from '@/lib/supabase';
import { DriverQRModal }   from './qr-modal';
import { DocumentsModal } from './documents';

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
  const t = useLang();
  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [showQR,     setShowQR]     = useState(false);
  const [showDocs,   setShowDocs]   = useState(false);
  const [docsUploaded, setDocsUploaded] = useState(0);
  const [docsVerified, setDocsVerified] = useState(false);
  const [profileStats, setProfileStats] = useState({ trips: 0, avgRating: 0, reviewCount: 0 });
  const [name,       setName]       = useState(user?.name ?? '');
  const [phone,      setPhone]      = useState('');
  const [bio,        setBio]        = useState('');
  const [photo,      setPhoto]      = useState<string | null>(null);
  const [memberSinceDate, setMemberSinceDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initial = ((name || user?.name || 'D')[0]).toUpperCase();

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles')
      .select('name, phone, bio, created_at, doc_national_id_url, doc_license_url, doc_registration_url, documents_verified')
      .eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.name)  setName(data.name);
        if (data?.phone) setPhone(data.phone);
        if (data?.bio)   setBio(data.bio);
        if (data?.created_at) setMemberSinceDate(data.created_at);
        const uploaded = [data?.doc_national_id_url, data?.doc_license_url, data?.doc_registration_url]
          .filter(Boolean).length;
        setDocsUploaded(uploaded);
        setDocsVerified(data?.documents_verified ?? false);
      });

    Promise.all([
      supabase.from('rides').select('id', { count: 'exact', head: true })
        .eq('driver_id', user.id).eq('status', 'completed'),
      supabase.from('reviews').select('rating').eq('driver_id', user.id),
    ]).then(([tripsRes, reviewsRes]) => {
      const reviews     = reviewsRes.data ?? [];
      const reviewCount = reviews.length;
      const avgRating   = reviewCount > 0
        ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviewCount * 10) / 10
        : 0;
      setProfileStats({ trips: tripsRes.count ?? 0, avgRating, reviewCount });
    });
  }, [user]);

  const memberSince = memberSinceDate
    ? new Date(memberSinceDate).toLocaleDateString(t('en-US', 'fr-FR'), { month: 'long', year: 'numeric' })
    : null;

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name, phone, bio })
      .eq('id', user.id);
    setSaving(false);
    if (error) { Alert.alert(t('Save failed', 'Échec de la sauvegarde'), error.message); return; }
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
      Alert.alert(t('Permission required', 'Permission requise'), t('Allow access to your photo library in Settings.', 'Autorisez l\'accès à votre bibliothèque photo dans les Réglages.'));
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
      Alert.alert(t('Permission required', 'Permission requise'), t('Allow camera access in Settings.', 'Autorisez l\'accès à la caméra dans les Réglages.'));
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
      t('Profile Photo', 'Photo de profil'),
      t('Choose an option', 'Choisissez une option'),
      [
        { text: t('Take Photo', 'Prendre une photo'), onPress: pickFromCamera },
        { text: t('Choose from Library', 'Choisir depuis la bibliothèque'), onPress: pickFromLibrary },
        photo ? { text: t('Remove Photo', 'Supprimer la photo'), style: 'destructive', onPress: () => setPhoto(null) } : null,
        { text: t('Cancel', 'Annuler'), style: 'cancel' },
      ].filter(Boolean) as any,
    );
  };

  const menu: { title: string; items: MenuItem[] }[] = [
    {
      title: t('Account', 'Compte'),
      items: [
        {
          label: t('My QR Code', 'Mon code QR'),
          subtitle: t('Share your driver code with passengers', 'Partagez votre code conducteur avec les passagers'),
          icon: { ios: 'qrcode', android: 'qr_code' },
          iconBg: '#8B5CF615', iconColor: '#8B5CF6',
          onPress: () => setShowQR(true),
        },
        {
          label: t('Verification', 'Vérification'),
          subtitle: docsVerified
            ? t('✓ Verified by admin', '✓ Vérifié par l\'administrateur')
            : docsUploaded === 3
            ? t('⏳ Pending review', '⏳ En attente de vérification')
            : t(`${docsUploaded}/3 documents uploaded`, `${docsUploaded}/3 documents téléchargés`),
          icon: { ios: 'checkmark.shield.fill', android: 'verified' },
          iconBg: docsVerified ? C + '15' : '#FEF3C715', iconColor: docsVerified ? C : '#D97706',
          onPress: () => setShowDocs(true),
        },
        {
          label: t('Notifications', 'Notifications'),
          icon: { ios: 'bell.fill', android: 'notifications' },
          iconBg: '#F59E0B15', iconColor: '#F59E0B',
          onPress: () => Alert.alert(t('Notifications', 'Notifications'), t('Notification settings coming soon.', 'Paramètres de notification bientôt disponibles.')),
        },
      ],
    },
    {
      title: t('Preferences', 'Préférences'),
      items: [
        {
          label: t('Language', 'Langue'),
          subtitle: t('English', 'Français'),
          icon: { ios: 'globe', android: 'language' },
          iconBg: '#8B5CF615', iconColor: '#8B5CF6',
          onPress: () => Alert.alert(t('Language', 'Langue'), t('Use the toggle at the top of the screen to switch languages.', 'Utilisez le bouton en haut de l\'écran pour changer de langue.')),
        },
        {
          label: t('Privacy & Security', 'Confidentialité & Sécurité'),
          icon: { ios: 'lock.shield.fill', android: 'security' },
          iconBg: '#6366F115', iconColor: '#6366F1',
          onPress: () => Alert.alert(t('Privacy', 'Confidentialité'), t('Privacy settings coming soon.', 'Paramètres de confidentialité bientôt disponibles.')),
        },
        {
          label: t('Help & Support', 'Aide & Support'),
          icon: { ios: 'questionmark.circle.fill', android: 'help' },
          iconBg: '#0EA5E915', iconColor: '#0EA5E9',
          onPress: () => Alert.alert(t('Help', 'Aide'), t('Help center coming soon.', 'Centre d\'aide bientôt disponible.')),
        },
      ],
    },
    {
      title: '',
      items: [
        {
          label: t('Log Out', 'Se déconnecter'),
          icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
          iconBg: '#FEF2F2', iconColor: '#EF4444',
          danger: true,
          onPress: logout,
        },
      ],
    },
  ];

  return (
    <>
    <DriverQRModal visible={showQR} onClose={() => setShowQR(false)} />
    <DocumentsModal
      visible={showDocs}
      onClose={() => setShowDocs(false)}
      onStatusChange={(uploaded, verified) => { setDocsUploaded(uploaded); setDocsVerified(verified); }}
    />
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
        <Text style={styles.avatarName}>{name || user?.name || t('Driver', 'Conducteur')}</Text>
        <Text style={styles.avatarEmail}>{user?.email}</Text>
        {memberSince ? <Text style={styles.memberSince}>{t('Member since', 'Membre depuis')} {memberSince}</Text> : null}

        <View style={[styles.verifiedBadge, { backgroundColor: docsVerified ? '#F0FDF4' : '#FFFBEB' }]}>
          <SymbolView
            name={{ ios: docsVerified ? 'checkmark.seal.fill' : 'clock.fill', android: docsVerified ? 'verified' : 'schedule' } as any}
            size={13} tintColor={docsVerified ? '#16A34A' : '#D97706'}
          />
          <Text style={[styles.verifiedText, { color: docsVerified ? '#16A34A' : '#D97706' }]}>
            {docsVerified
              ? t('Verified Driver', 'Conducteur vérifié')
              : docsUploaded === 3
              ? t('Pending Review', 'En attente de vérification')
              : `${docsUploaded}/3 ${t('Documents', 'Documents')}`}
          </Text>
        </View>

        {/* Rating + stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#F59E0B' }]}>
              {profileStats.reviewCount > 0 ? profileStats.avgRating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>
              ⭐ {profileStats.reviewCount > 0
                ? `${profileStats.reviewCount} ${t('reviews', 'avis')}`
                : t('No reviews', 'Aucun avis')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: C }]}>{profileStats.trips}</Text>
            <Text style={styles.statLabel}>{t('Trips done', 'Trajets effectués')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: C }]}>{t('Active', 'Actif')}</Text>
            <Text style={styles.statLabel}>{t('Status', 'Statut')}</Text>
          </View>
        </View>
      </View>

      {/* Editable info card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('Personal Info', 'Informations personnelles')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {editing && (
              <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>{t('Cancel', 'Annuler')}</Text>
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
                {saving ? t('Saving…', 'Enregistrement…') : editing ? t('Save', 'Enregistrer') : t('Edit', 'Modifier')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>{t('Full name', 'Nom complet')}</Text>
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
          <Text style={styles.fieldLabel}>{t('Phone', 'Téléphone')}</Text>
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
          <Text style={styles.fieldLabel}>{t('Email (read-only)', 'E-mail (lecture seule)')}</Text>
          <View style={styles.fieldBox}>
            <SymbolView name={{ ios: 'envelope.fill', android: 'email' } as any} size={15} tintColor="#94A3B8" />
            <Text style={[styles.fieldValue, { color: '#94A3B8' }]}>{user?.email}</Text>
            <View style={styles.lockedBadge}>
              <SymbolView name={{ ios: 'lock.fill', android: 'lock' } as any} size={10} tintColor="#94A3B8" />
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.fieldLabel}>{t('About me', 'À propos de moi')}</Text>
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
              <Text style={[styles.bioText, !bio && { color: '#CBD5E1', fontStyle: 'italic' }]}>
                {bio || t('No bio yet. Tap Edit to add one.', 'Pas encore de bio. Appuyez sur Modifier pour en ajouter une.')}
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

      <Text style={styles.version}>{t('Horizon v1.0.0 · Driver Edition', 'Horizon v1.0.0 · Édition Conducteur')}</Text>
    </ScrollView>
    </>
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
  avatarName:  { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  avatarEmail: { fontSize: 13, color: '#64748B' },
  memberSince: { fontSize: 12, color: '#94A3B8' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  verifiedText:  { fontSize: 12, fontWeight: '700' },
  cancelBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

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

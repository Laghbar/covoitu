import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';

const C = '#3B82F6';

const STATS = [
  { label: 'Trips', value: '7', icon: { ios: 'car.fill', android: 'directions_car' } },
  { label: 'Reviews', value: '5', icon: { ios: 'star.fill', android: 'star' } },
  { label: 'Saved', value: '320 MAD', icon: { ios: 'banknote.fill', android: 'payments' } },
];

type MenuRow = { label: string; icon: { ios: string; android: string }; danger?: boolean };

const MENU: MenuRow[][] = [
  [
    { label: 'Personal Information', icon: { ios: 'person.fill', android: 'person' } },
    { label: 'Phone Verification', icon: { ios: 'phone.fill', android: 'phone' } },
    { label: 'Payment Methods', icon: { ios: 'creditcard.fill', android: 'credit_card' } },
  ],
  [
    { label: 'Ride History', icon: { ios: 'clock.fill', android: 'history' } },
    { label: 'My Reviews', icon: { ios: 'star.fill', android: 'star' } },
    { label: 'Notifications', icon: { ios: 'bell.fill', android: 'notifications' } },
  ],
  [
    { label: 'Privacy & Security', icon: { ios: 'lock.fill', android: 'lock' } },
    { label: 'Help & Support', icon: { ios: 'questionmark.circle.fill', android: 'help' } },
    { label: 'Sign Out', icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' }, danger: true },
  ],
];

export function PassengerProfile() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const initial = (user?.name?.[0] ?? '?').toUpperCase();

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>

      {/* Avatar + name */}
      <View style={styles.header}>
        <View style={[styles.bigAvatar, { backgroundColor: C }]}>
          <Text style={styles.bigAvatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={[styles.verifiedBadge, { backgroundColor: '#F0FDF4' }]}>
          <SymbolView name={{ ios: 'checkmark.seal.fill', android: 'verified' } as any} size={13} tintColor="#16A34A" />
          <Text style={styles.verifiedText}>Verified Passenger</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <SymbolView name={s.icon as any} size={20} tintColor={C} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Menu sections */}
      {MENU.map((section, i) => (
        <View key={i} style={styles.menuSection}>
          {section.map((item, j) => (
            <Pressable
              key={item.label}
              style={[styles.menuRow, j < section.length - 1 && styles.menuDivider]}
              onPress={item.label === 'Sign Out' ? logout : undefined}>
              <View style={[styles.menuIcon, { backgroundColor: item.danger ? '#FEF2F2' : '#F1F5F9' }]}>
                <SymbolView
                  name={item.icon as any}
                  size={16}
                  tintColor={item.danger ? '#DC2626' : '#475569'}
                />
              </View>
              <Text style={[styles.menuLabel, item.danger && { color: '#DC2626' }]}>{item.label}</Text>
              {!item.danger && (
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' } as any} size={14} tintColor="#CBD5E1" />
              )}
            </Pressable>
          ))}
        </View>
      ))}

      <Text style={styles.version}>Harizana v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },

  header: { alignItems: 'center', gap: 6 },
  bigAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bigAvatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  userEmail: { fontSize: 14, color: '#64748B' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  verifiedText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  menuSection: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E293B' },

  version: { textAlign: 'center', fontSize: 12, color: '#CBD5E1', marginTop: 4 },
});

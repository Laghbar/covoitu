import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

const ROLE_COLOR: Record<string, string> = {
  passenger: '#3c87f7',
  driver: '#43a047',
};

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const accentColor = ROLE_COLOR[user?.role ?? 'passenger'];
  const initial = (user?.name?.[0] ?? '?').toUpperCase();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>

        {/* Header row */}
        <View style={styles.header}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">Good day,</ThemedText>
            <ThemedText type="subtitle" style={styles.userName}>{user?.name}</ThemedText>
          </View>

          {/* Avatar + logout */}
          <Pressable onPress={logout} style={[styles.avatar, { backgroundColor: accentColor }]}>
            <ThemedText style={styles.avatarLetter}>{initial}</ThemedText>
          </Pressable>
        </View>

        {/* Role badge */}
        <View style={[styles.roleBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '40' }]}>
          <SymbolView
            name={user?.role === 'driver'
              ? { ios: 'car.fill', android: 'directions_car', web: 'directions_car' }
              : { ios: 'person.2.fill', android: 'group', web: 'group' }}
            size={16}
            tintColor={accentColor}
          />
          <ThemedText style={[styles.roleText, { color: accentColor }]}>
            {user?.role === 'driver' ? 'Driver' : 'Passenger'}
          </ThemedText>
        </View>

        {/* Placeholder content */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.cardLabel}>
            YOUR DASHBOARD
          </ThemedText>
          <ThemedText style={styles.cardNote}>
            {user?.role === 'driver'
              ? 'Start offering rides and earn from empty seats.'
              : 'Search for rides near you and book in seconds.'}
          </ThemedText>
        </View>

        {/* Logout button */}
        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logoutBtn, { borderColor: theme.backgroundSelected }, pressed && { opacity: 0.6 }]}>
          <SymbolView
            name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
            size={16}
            tintColor={theme.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary">Sign out</ThemedText>
        </Pressable>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', justifyContent: 'center' },
  safe: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: { letterSpacing: -0.3 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 26 },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleText: { fontSize: 13, fontWeight: '600' },

  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardLabel: { letterSpacing: 0.5, fontSize: 11 },
  cardNote: { fontSize: 15, lineHeight: 24 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: 'auto',
  },
});

import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { Role } from '@/lib/api';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type Mode = 'login' | 'register';

const ROLE_META: Record<Role, { color: string; label: string; heroSub: string }> = {
  passenger: {
    color: '#3c87f7',
    label: 'Passenger',
    heroSub: 'Find rides and travel smarter',
  },
  driver: {
    color: '#43a047',
    label: 'Driver',
    heroSub: 'Share rides and earn money',
  },
};

type Props = {
  role: Role;
  onChangeRole: () => void;
};

export function AuthScreen({ role, onChangeRole }: Props) {
  const theme  = useTheme();
  const { login, register } = useAuth();
  const meta   = ROLE_META[role];

  const [mode, setMode]     = useState<Mode>('login');
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const indicatorX = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: containerWidth > 0 ? containerWidth / 2 - 4 : 0,
  }));

  const handleTabsLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const w = e.nativeEvent.layout.width;
      setContainerWidth(w);
      indicatorX.value = mode === 'login' ? 2 : w / 2;
    },
    [mode],
  );

  const switchMode = useCallback(
    (m: Mode) => {
      setMode(m);
      setError(null);
      if (containerWidth > 0) {
        indicatorX.value = withSpring(m === 'login' ? 2 : containerWidth / 2, {
          damping: 22,
          stiffness: 250,
        });
      }
      setName(''); setEmail(''); setPassword('');
    },
    [containerWidth],
  );

  const handleSubmit = async () => {
    setError(null);
    if (mode === 'register' && !name.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim())  { setError('Please enter your email address.'); return; }
    if (!password)      { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password, role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.background, color: theme.text, borderColor: theme.backgroundSelected },
  ];

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Hero */}
            <View style={styles.hero}>
              <View style={[styles.logoMark, { backgroundColor: meta.color }]}>
                <ThemedText style={styles.logoLetter}>H</ThemedText>
              </View>
              <ThemedText type="title" style={styles.appName}>Harizana</ThemedText>

              {/* Role badge */}
              <Pressable onPress={onChangeRole} style={[styles.roleBadge, { backgroundColor: meta.color + '15', borderColor: meta.color + '40' }]}>
                <SymbolView
                  name={role === 'passenger'
                    ? { ios: 'person.2.fill', android: 'group', web: 'group' }
                    : { ios: 'car.fill', android: 'directions_car', web: 'directions_car' }}
                  size={14}
                  tintColor={meta.color}
                />
                <ThemedText style={[styles.roleBadgeText, { color: meta.color }]}>
                  {meta.label}
                </ThemedText>
                <ThemedText style={[styles.roleBadgeChange, { color: meta.color + 'AA' }]}>
                  · change
                </ThemedText>
              </Pressable>

              <ThemedText themeColor="textSecondary" style={styles.heroSub}>
                {meta.heroSub}
              </ThemedText>
            </View>

            {/* Card */}
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, shadowColor: theme.text }]}>

              {/* Tabs */}
              <View
                onLayout={handleTabsLayout}
                style={[styles.tabs, { backgroundColor: theme.backgroundSelected }]}>
                <Animated.View
                  style={[styles.tabIndicator, { backgroundColor: theme.background }, indicatorStyle]}
                />
                {(['login', 'register'] as Mode[]).map((m) => (
                  <Pressable key={m} style={styles.tab} onPress={() => switchMode(m)}>
                    <ThemedText
                      type="smallBold"
                      style={mode !== m ? { color: theme.textSecondary } : undefined}>
                      {m === 'login' ? 'Login' : 'Register'}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {/* Form */}
              <View style={styles.form}>
                {mode === 'register' && (
                  <View>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                      Full name
                    </ThemedText>
                    <TextInput
                      style={inputStyle}
                      placeholder="Jane Doe"
                      placeholderTextColor={theme.textSecondary}
                      value={name}
                      onChangeText={(v) => { setName(v); setError(null); }}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                )}

                <View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                    Email address
                  </ThemedText>
                  <TextInput
                    style={inputStyle}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
                    Password
                  </ThemedText>
                  <TextInput
                    style={inputStyle}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(null); }}
                    secureTextEntry
                  />
                </View>

                {mode === 'login' && (
                  <Pressable style={styles.forgotRow}>
                    <ThemedText type="small" style={[styles.forgotLink, { color: meta.color }]}>
                      Forgot password?
                    </ThemedText>
                  </Pressable>
                )}

                {error && (
                  <View style={styles.errorBox}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: meta.color },
                    (loading || pressed) && styles.buttonPressed,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={styles.buttonText}>
                      {mode === 'login' ? 'Sign in' : 'Create account'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === 'login' ? "Don't have an account?  " : 'Already have an account?  '}
                </ThemedText>
                <Pressable onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                  <ThemedText type="small" style={[styles.footerLink, { color: meta.color }]}>
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Hero
  hero: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two,
  },
  logoLetter: { fontSize: 40, fontWeight: '700', color: '#fff', lineHeight: 48 },
  appName: { letterSpacing: -1 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.three, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 13, fontWeight: '600' },
  roleBadgeChange: { fontSize: 13 },
  heroSub: { fontSize: 15, lineHeight: 22 },

  // Card
  card: {
    width: '100%', maxWidth: MaxContentWidth,
    borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 4,
  },

  // Tabs
  tabs: {
    flexDirection: 'row', borderRadius: Spacing.three,
    padding: 2, position: 'relative', overflow: 'hidden',
  },
  tabIndicator: { position: 'absolute', top: 2, bottom: 2, borderRadius: Spacing.two + 2 },
  tab: { flex: 1, paddingVertical: Spacing.two + 2, alignItems: 'center', zIndex: 1 },

  // Form
  form: { gap: Spacing.three },
  label: { marginBottom: Spacing.one, marginLeft: 2 },
  input: { height: 52, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, fontSize: 16, borderWidth: 1.5 },
  forgotRow: { alignSelf: 'flex-end', marginTop: -Spacing.two },
  forgotLink: { fontWeight: '500' },
  errorBox: { backgroundColor: '#fdecea', borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  errorText: { color: '#e53935', fontSize: 14, lineHeight: 20 },
  button: { height: 52, borderRadius: Spacing.three, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.one },
  buttonPressed: { opacity: 0.75 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: Spacing.one },
  footerLink: { fontWeight: '600' },
});

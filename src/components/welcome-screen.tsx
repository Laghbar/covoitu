import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useLang, useLanguage } from '@/context/language';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const ACCENT = '#3c87f7';
const DURATION = 500;

const avatarIn = new Keyframe({
  0:   { opacity: 0, transform: [{ scale: 0.6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.elastic(0.9) },
});

const slideUp = new Keyframe({
  0:   { opacity: 0, transform: [{ translateY: 28 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
});

type Props = { onContinue: () => void };

export function WelcomeScreen({ onContinue }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const t = useLang();
  const { lang, toggle } = useLanguage();
  const initial = (user?.name?.[0] ?? '?').toUpperCase();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Language toggle */}
        <View style={styles.langRow}>
          <Pressable style={styles.langBtn} onPress={toggle}>
            <Text style={styles.langTxt}>{lang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN'}</Text>
          </Pressable>
        </View>

        <View style={styles.content}>

          {/* Avatar circle */}
          <Animated.View entering={avatarIn.duration(DURATION)} style={[styles.avatar, { backgroundColor: ACCENT }]}>
            <ThemedText style={styles.initial}>{initial}</ThemedText>
          </Animated.View>

          {/* Greeting text */}
          <Animated.View entering={slideUp.delay(180).duration(DURATION)} style={styles.textBlock}>
            <ThemedText type="subtitle" style={styles.line}>{t('Welcome,', 'Bienvenue,')}</ThemedText>
            <ThemedText type="subtitle" style={[styles.line, { color: ACCENT }]}>
              {user?.name}!
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sub}>
              {t("Your account is ready. Let's get started.", "Votre compte est prêt. Commençons !")}
            </ThemedText>
          </Animated.View>

          {/* CTA button */}
          <Animated.View entering={slideUp.delay(340).duration(DURATION)} style={styles.btnWrap}>
            <Pressable
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
              onPress={onContinue}>
              <ThemedText style={styles.btnText}>{t('Get started', 'Commencer')}</ThemedText>
            </Pressable>
          </Animated.View>

        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  langBtn: { backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  langTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 44,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 52,
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  line: {
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sub: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginTop: Spacing.two,
  },
  btnWrap: { width: '100%' },
  btn: {
    height: 52,
    borderRadius: Spacing.three,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.75 },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useLang, useLanguage } from '@/context/language';
import { useTheme } from '@/hooks/use-theme';
import { Role } from '@/lib/api';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type { Role };

const PASSENGER_COLOR = '#3c87f7';
const DRIVER_COLOR    = '#43a047';

const ROLES = [
  {
    key: 'passenger' as Role,
    label: 'Passenger',
    color: PASSENGER_COLOR,
    icon: { ios: 'person.2.fill', android: 'group', web: 'group' } as const,
    description: 'Find available rides, book seats, travel safely, and save money.',
  },
  {
    key: 'driver' as Role,
    label: 'Driver',
    color: DRIVER_COLOR,
    icon: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' } as const,
    description: 'Offer rides, earn money from empty seats, manage trips, and help reduce traffic.',
  },
] as const;

// ── Header illustration ──────────────────────────────────────────────────────

function Illustration() {
  const theme = useTheme();
  return (
    <View style={styles.illus}>
      {/* Passenger bubbles */}
      {([PASSENGER_COLOR, '#7eb8fa', PASSENGER_COLOR] as const).map((c, i) => (
        <View key={i} style={[styles.illusPersonBubble, { backgroundColor: c + '22' }]}>
          <SymbolView
            name={{ ios: 'person.fill', android: 'person', web: 'person' }}
            size={20}
            tintColor={c}
          />
        </View>
      ))}

      {/* Connector */}
      <View style={styles.illusConnector}>
        <View style={[styles.illusLine, { backgroundColor: theme.backgroundSelected }]} />
        <SymbolView
          name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
          size={14}
          tintColor={theme.textSecondary}
        />
      </View>

      {/* Car bubble */}
      <View style={[styles.illusCarBubble, { backgroundColor: DRIVER_COLOR + '1A' }]}>
        <SymbolView
          name={{ ios: 'car.fill', android: 'directions_car', web: 'directions_car' }}
          size={30}
          tintColor={DRIVER_COLOR}
        />
      </View>
    </View>
  );
}

// ── Role card ────────────────────────────────────────────────────────────────

type CardProps = {
  item: { key: Role; label: string; color: string; icon: any; description: string };
  selected: boolean;
  onPress: () => void;
  flex: boolean;
};

function RoleCard({ item, selected, onPress, flex }: CardProps) {
  const theme  = useTheme();
  const scale  = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn  = () => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(selected ? 1.02 : 1, { damping: 15, stiffness: 300 }); };

  return (
    <Animated.View style={[styles.cardWrap, flex && styles.cardWrapFlex, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
          selected && { borderColor: item.color, backgroundColor: item.color + '0D' },
        ]}>

        {/* Checkmark */}
        {selected && (
          <View style={[styles.checkmark, { backgroundColor: item.color }]}>
            <SymbolView
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={11}
              tintColor="#fff"
            />
          </View>
        )}

        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: item.color + '1A' }]}>
          <SymbolView name={item.icon} size={38} tintColor={item.color} />
        </View>

        <ThemedText
          type="subtitle"
          style={[styles.roleLabel, selected && { color: item.color }]}>
          {item.label}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.roleDesc}>
          {item.description}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

const enterAnim = new Keyframe({
  0:   { opacity: 0, transform: [{ translateY: 24 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
});

type Props = { onContinue: (role: Role) => void };

export function RoleSelectionScreen({ onContinue }: Props) {
  const { width }  = useWindowDimensions();
  const isDesktop  = width >= 640;
  const [selected, setSelected] = useState<Role | null>(null);
  const t = useLang();
  const { lang, toggle } = useLanguage();

  const roleColor = selected === 'driver' ? DRIVER_COLOR : PASSENGER_COLOR;

  const roles = [
    {
      ...ROLES[0],
      label: t('Passenger', 'Passager'),
      description: t(
        'Find available rides, book seats, travel safely, and save money.',
        'Trouvez des covoiturages, réservez des places, voyagez en sécurité et économisez.',
      ),
    },
    {
      ...ROLES[1],
      label: t('Driver', 'Conducteur'),
      description: t(
        'Offer rides, earn money from empty seats, manage trips, and help reduce traffic.',
        "Proposez des covoiturages, gagnez de l'argent, gérez vos trajets et contribuez à réduire le trafic.",
      ),
    },
  ];

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Language toggle — top-right */}
        <View style={styles.langRow}>
          <Pressable style={styles.langBtn} onPress={toggle}>
            <Text style={styles.langTxt}>{lang === 'en' ? '🇫🇷 FR' : '🇬🇧 EN'}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          <Animated.View entering={enterAnim.duration(500)} style={styles.inner}>

            <Illustration />

            {/* Headline */}
            <View style={styles.headline}>
              <ThemedText type="subtitle" style={styles.headlineTitle}>
                {t('How will you travel?', 'Comment voulez-vous voyager ?')}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.headlineSub}>
                {t('Choose your role to get started', 'Choisissez votre rôle pour commencer')}
              </ThemedText>
            </View>

            {/* Cards */}
            <View style={[styles.cards, isDesktop && styles.cardsRow]}>
              {roles.map((item) => (
                <RoleCard
                  key={item.key}
                  item={item}
                  selected={selected === item.key}
                  onPress={() => setSelected(item.key)}
                  flex={isDesktop}
                />
              ))}
            </View>

            {/* Continue */}
            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                { backgroundColor: selected ? roleColor : '#C4C7CC' },
                pressed && selected && { opacity: 0.82 },
              ]}
              onPress={() => selected && onContinue(selected)}
              disabled={!selected}>
              <ThemedText style={[styles.continueBtnText, !selected && styles.continueBtnTextOff]}>
                {t('Continue', 'Continuer')}
              </ThemedText>
              {selected && (
                <SymbolView
                  name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                  size={16}
                  tintColor="#fff"
                />
              )}
            </Pressable>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  langBtn: { backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  langTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: Spacing.four,
  },

  // Illustration
  illus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  illusPersonBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illusConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 4,
  },
  illusLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  illusCarBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Headline
  headline: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  headlineTitle: {
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headlineSub: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },

  // Cards
  cards: {
    width: '100%',
    gap: Spacing.three,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardWrap: {
    width: '100%',
  },
  cardWrapFlex: {
    flex: 1,
    width: undefined,
  },
  card: {
    borderRadius: Spacing.four,
    borderWidth: 2,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
    position: 'relative',
    minHeight: 210,
    justifyContent: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  roleLabel: {
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  roleDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },

  // Continue button
  continueBtn: {
    width: '100%',
    height: 52,
    borderRadius: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueBtnTextOff: {
    color: '#888',
  },
});

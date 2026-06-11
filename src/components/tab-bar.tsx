import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabDef = {
  key: string;
  label: string;
  icon: { ios: string; android: string };
};

type Props = {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  color: string;
};

export function TabBar({ tabs, active, onChange, color }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const focused = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={tab.label}>
            <View style={[styles.iconWrap, focused && { backgroundColor: color + '18' }]}>
              <SymbolView
                name={{ ios: tab.icon.ios as any, android: tab.icon.android as any }}
                size={22}
                tintColor={focused ? color : '#94A3B8'}
              />
            </View>
            <Text style={[styles.label, { color: focused ? color : '#94A3B8' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: { padding: 4, borderRadius: 10 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
});

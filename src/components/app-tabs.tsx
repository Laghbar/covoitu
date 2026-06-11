import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#3c87f7';

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps & { icon?: any }) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={styles.tab}>
      <ThemedText
        type="small"
        style={[styles.tabLabel, { color: isFocused ? ACCENT : theme.textSecondary }]}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <ThemedView type="backgroundElement" style={styles.tabBar}>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger>
        </ThemedView>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});

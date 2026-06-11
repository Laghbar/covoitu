import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Pressable, View } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      {/* TabTriggers must exist for the router to register screens, but are hidden */}
      <TabList asChild>
        <View style={{ height: 0, overflow: 'hidden' }}>
          <TabTrigger name="home" href="/" asChild>
            <Pressable />
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <Pressable />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

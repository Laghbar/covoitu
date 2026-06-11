import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = '#3B82F6';

const CONVOS = [
  { id: '1', initial: 'M', name: 'Mohammed A.', last: 'See you at the station 👍', time: '09:12', unread: 2 },
  { id: '2', initial: 'S', name: 'Samira B.',   last: 'The ride is confirmed!',    time: 'Yesterday', unread: 0 },
  { id: '3', initial: 'K', name: 'Karim L.',    last: 'Thank you, safe travels!',  time: 'Mon', unread: 0 },
];

const MESSAGES = [
  { id: '1', mine: false, text: 'Hello! I confirmed your booking for tomorrow.', time: '09:00' },
  { id: '2', mine: true,  text: 'Great, thank you! Where exactly should I meet you?', time: '09:05' },
  { id: '3', mine: false, text: 'At the main entrance of Gare Casa-Voyageurs, I will be in a white Dacia Logan.', time: '09:08' },
  { id: '4', mine: true,  text: 'Perfect, I will be there 5 minutes early.', time: '09:10' },
  { id: '5', mine: false, text: 'See you at the station 👍', time: '09:12' },
];

export function PassengerMessages() {
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  if (openId) {
    const convo = CONVOS.find((c) => c.id === openId)!;
    return (
      <View style={[styles.chatRoot, { paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => setOpenId(null)} style={styles.backBtn}>
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back' } as any} size={20} tintColor={C} />
          </Pressable>
          <View style={[styles.chatAvatar, { backgroundColor: C + '18' }]}>
            <Text style={[styles.chatAvatarText, { color: C }]}>{convo.initial}</Text>
          </View>
          <Text style={styles.chatName}>{convo.name}</Text>
        </View>

        <ScrollView style={styles.chatMessages} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {MESSAGES.map((m) => (
            <View key={m.id} style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, m.mine && { color: '#fff' }]}>{m.text}</Text>
              <Text style={[styles.bubbleTime, m.mine && { color: 'rgba(255,255,255,0.7)' }]}>{m.time}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.msgInput}
            value={msg}
            onChangeText={setMsg}
            placeholder="Type a message…"
            placeholderTextColor="#94A3B8"
          />
          <Pressable style={[styles.sendBtn, { backgroundColor: C }]} onPress={() => setMsg('')}>
            <SymbolView name={{ ios: 'paperplane.fill', android: 'send' } as any} size={16} tintColor="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Messages</Text>

      {CONVOS.map((c) => (
        <Pressable key={c.id} style={styles.convoCard} onPress={() => setOpenId(c.id)}>
          <View style={[styles.convoAvatar, { backgroundColor: C + '18' }]}>
            <Text style={[styles.convoAvatarText, { color: C }]}>{c.initial}</Text>
          </View>
          <View style={styles.convoBody}>
            <Text style={styles.convoName}>{c.name}</Text>
            <Text style={styles.convoLast} numberOfLines={1}>{c.last}</Text>
          </View>
          <View style={styles.convoRight}>
            <Text style={styles.convoTime}>{c.time}</Text>
            {c.unread > 0 && (
              <View style={[styles.badge, { backgroundColor: C }]}>
                <Text style={styles.badgeText}>{c.unread}</Text>
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B', letterSpacing: -0.5, marginBottom: 8 },

  convoCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  convoAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  convoAvatarText: { fontSize: 18, fontWeight: '700' },
  convoBody: { flex: 1, gap: 3 },
  convoName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  convoLast: { fontSize: 13, color: '#94A3B8' },
  convoRight: { alignItems: 'flex-end', gap: 6 },
  convoTime: { fontSize: 11, color: '#94A3B8' },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  chatRoot: { flex: 1, backgroundColor: '#F8FAFC' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 4 },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chatAvatarText: { fontSize: 14, fontWeight: '700' },
  chatName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  chatMessages: { flex: 1 },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, gap: 4 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: C, borderBottomRightRadius: 4 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, color: '#1E293B', lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: '#94A3B8', alignSelf: 'flex-end' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  msgInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1E293B' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

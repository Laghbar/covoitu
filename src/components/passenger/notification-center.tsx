import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable,
  RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

const C = '#3B82F6';

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  booking_accepted:  '✅',
  booking_rejected:  '❌',
  ride_cancelled:    '🚫',
  rate_driver:       '⭐',
  request_accepted:  '🎉',
  request_rejected:  '👎',
  new_proposal:      '🚗',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onClearCount: () => void;
};

export function NotificationCenter({ visible, onClose, onClearCount }: Props) {
  const { user }  = useAuth();
  const insets    = useSafeAreaInsets();
  const [notifs,     setNotifs]     = useState<Notif[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifs((data ?? []) as Notif[]);
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onClearCount();
  }, [user, onClearCount]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      await fetch();
      setLoading(false);
      await markAllRead();
    })();
  }, [visible]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />

      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Handle */}
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={s.subtitle}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
            )}
          </View>
          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={C} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={notifs}
            keyExtractor={n => n.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C} />}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[s.card, !item.read && s.cardUnread]}>
                <View style={[s.iconWrap, !item.read && { backgroundColor: C + '18' }]}>
                  <Text style={s.icon}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.notifTitle}>{item.title}</Text>
                  <Text style={s.notifBody}>{item.body}</Text>
                  <Text style={s.time}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.read && <View style={s.dot} />}
              </View>
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>🔔</Text>
                <Text style={s.emptyTxt}>Aucune notification</Text>
                <Text style={s.emptySub}>Vous serez notifié ici lorsqu'un conducteur accepte votre réservation.</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title:    { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  subtitle: { fontSize: 12, color: C, fontWeight: '600', marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 14, color: '#64748B', fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  cardUnread: {
    backgroundColor: '#EFF6FF', borderColor: '#BFDBFE',
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  icon:       { fontSize: 20 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  notifBody:  { fontSize: 13, color: '#475569', lineHeight: 18 },
  time:       { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C, marginTop: 4,
  },

  empty:    { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 10 },
  emptyTxt: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});

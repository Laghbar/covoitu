import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const C = '#10B981';

type InvStatus = 'pending' | 'accepted' | 'rejected';

type Invitation = {
  id: string;
  passenger: string; initial: string; rating: number; trips: number;
  from: string; to: string; date: string; time: string;
  seats: number; message?: string;
  status: InvStatus;
};

const INITIAL_INVITATIONS: Invitation[] = [
  {
    id: '1', passenger: 'Fatima Zahra', initial: 'F', rating: 4.8, trips: 23,
    from: 'Casablanca', to: 'Rabat', date: 'Lun 15 Jun', time: '08:30', seats: 1,
    message: 'Bonjour, je suis ponctuelle et calme. Merci!',
    status: 'pending',
  },
  {
    id: '2', passenger: 'Omar Soussi', initial: 'O', rating: 4.5, trips: 11,
    from: 'Casablanca', to: 'Rabat', date: 'Lun 15 Jun', time: '08:30', seats: 2,
    message: 'Je voyage avec un collègue, on est sérieux.',
    status: 'pending',
  },
  {
    id: '3', passenger: 'Aicha Moukrim', initial: 'A', rating: 4.9, trips: 47,
    from: 'Rabat', to: 'Casablanca', date: 'Mer 18 Jun', time: '17:00', seats: 1,
    status: 'pending',
  },
  {
    id: '4', passenger: 'Yassine El Alami', initial: 'Y', rating: 4.7, trips: 8,
    from: 'Casablanca', to: 'Marrakech', date: 'Sam 21 Jun', time: '07:00', seats: 1,
    message: 'Merci beaucoup, à bientôt!',
    status: 'accepted',
  },
  {
    id: '5', passenger: 'Sara Benali', initial: 'S', rating: 4.2, trips: 5,
    from: 'Fès', to: 'Meknès', date: 'Mar 10 Jun', time: '09:00', seats: 1,
    status: 'rejected',
  },
];

function StarRating({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <SymbolView name={{ ios: 'star.fill', android: 'star' } as any} size={11} tintColor="#FCD34D" />
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>{value.toFixed(1)}</Text>
    </View>
  );
}

function InvitationCard({ inv, onAccept, onReject }: {
  inv: Invitation;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const isPending = inv.status === 'pending';

  return (
    <View style={[styles.card, !isPending && { opacity: 0.72 }]}>
      {/* Passenger row */}
      <View style={styles.passengerRow}>
        <View style={[styles.avatar, { backgroundColor: '#3B82F6' + '18' }]}>
          <Text style={[styles.avatarInitial, { color: '#3B82F6' }]}>{inv.initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.passengerName}>{inv.passenger}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <StarRating value={inv.rating} />
            <Text style={styles.tripCount}>{inv.trips} trips</Text>
          </View>
        </View>
        {!isPending && (
          <View style={[styles.statusPill, {
            backgroundColor: inv.status === 'accepted' ? '#F0FDF4' : '#FEF2F2',
          }]}>
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: inv.status === 'accepted' ? C : '#EF4444',
            }}>
              {inv.status === 'accepted' ? '✓ Accepted' : '✗ Rejected'}
            </Text>
          </View>
        )}
      </View>

      {/* Trip info */}
      <View style={styles.tripBox}>
        <View style={styles.tripRow}>
          <SymbolView name={{ ios: 'location.fill', android: 'location_on' } as any} size={12} tintColor={C} />
          <Text style={styles.tripText}>{inv.from} → {inv.to}</Text>
        </View>
        <View style={styles.tripRow}>
          <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={12} tintColor="#94A3B8" />
          <Text style={styles.tripMeta}>{inv.date} · {inv.time}</Text>
        </View>
        <View style={styles.tripRow}>
          <SymbolView name={{ ios: 'person.fill', android: 'person' } as any} size={12} tintColor="#94A3B8" />
          <Text style={styles.tripMeta}>{inv.seats} seat{inv.seats > 1 ? 's' : ''} requested</Text>
        </View>
      </View>

      {/* Optional message */}
      {inv.message && (
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>"{inv.message}"</Text>
        </View>
      )}

      {/* Actions (pending only) */}
      {isPending && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { flex: 1, backgroundColor: '#FEF2F2', borderColor: '#EF444430' }]}
            onPress={() => onReject(inv.id)}>
            <SymbolView name={{ ios: 'xmark', android: 'close' } as any} size={14} tintColor="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Decline</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { flex: 1, backgroundColor: C, borderColor: C }]}
            onPress={() => onAccept(inv.id)}>
            <SymbolView name={{ ios: 'checkmark', android: 'check' } as any} size={14} tintColor="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Accept</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

type Tab = 'pending' | 'history';

export function DriverInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>(INITIAL_INVITATIONS);
  const [tab, setTab] = useState<Tab>('pending');

  const accept = (id: string) => {
    Alert.alert('Accept Request', 'Accept this passenger?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: () =>
          setInvitations((prev) => prev.map((i) => i.id === id ? { ...i, status: 'accepted' } : i)),
      },
    ]);
  };

  const reject = (id: string) => {
    Alert.alert('Decline Request', 'Are you sure you want to decline?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: () =>
          setInvitations((prev) => prev.map((i) => i.id === id ? { ...i, status: 'rejected' } : i)),
      },
    ]);
  };

  const pending  = invitations.filter((i) => i.status === 'pending');
  const history  = invitations.filter((i) => i.status !== 'pending');
  const shown    = tab === 'pending' ? pending : history;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>Invitations</Text>
      <Text style={styles.pageSub}>Passengers who want to join your trips.</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable style={[styles.tabChip, tab === 'pending'  && { backgroundColor: C }]} onPress={() => setTab('pending')}>
          <Text style={[styles.tabText, tab === 'pending'  && { color: '#fff' }]}>
            Pending {pending.length > 0 ? `(${pending.length})` : ''}
          </Text>
        </Pressable>
        <Pressable style={[styles.tabChip, tab === 'history' && { backgroundColor: C }]} onPress={() => setTab('history')}>
          <Text style={[styles.tabText, tab === 'history' && { color: '#fff' }]}>History</Text>
        </Pressable>
      </View>

      {shown.length === 0 ? (
        <View style={styles.empty}>
          <SymbolView name={{ ios: 'envelope.open.fill', android: 'drafts' } as any} size={52} tintColor="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {tab === 'pending' ? 'No pending requests' : 'No history yet'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'pending' ? 'Passenger booking requests will appear here.' : 'Accepted and declined requests will show here.'}
          </Text>
        </View>
      ) : (
        shown.map((inv) => (
          <InvitationCard key={inv.id} inv={inv} onAccept={accept} onReject={reject} />
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, color: '#64748B', marginTop: -8 },

  tabs: { flexDirection: 'row', gap: 8 },
  tabChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },

  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 17, fontWeight: '800' },
  passengerName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  tripCount: { fontSize: 12, color: '#94A3B8' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },

  tripBox: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, gap: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripText: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  tripMeta: { fontSize: 13, color: '#64748B' },

  messageBubble: {
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: C,
  },
  messageText: { fontSize: 13, color: '#374151', fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1,
  },
  actionText: { fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 56, gap: 10 },
  emptyTitle: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  emptySub: { fontSize: 13, color: '#CBD5E1', textAlign: 'center', paddingHorizontal: 20 },
});

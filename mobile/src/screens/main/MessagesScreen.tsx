import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { RecentChat, getRecentChats } from '../../services/chatService';

// ── Param list (exported for MessagesStack) ───────────────────────────────────

export type MessagesStackParamList = {
  MessagesScreen: undefined;
  ChatScreen: {
    userId:     string;
    userName:   string;
    userAvatar?: string;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days  < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessagesScreen({ navigation }: { navigation: any }) {
  const [chats,   setChats]   = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  // Reload every time the tab is focused so it picks up new chats from ChatScreen
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getRecentChats()
        .then(setChats)
        .finally(() => setLoading(false));
    }, []),
  );

  const filtered = search.trim()
    ? chats.filter((c) =>
        c.userName.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : chats;

  // ── Render item ─────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: RecentChat }) => (
      <Pressable
        style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
        onPress={() =>
          navigation.navigate('ChatScreen', {
            userId:     item.userId,
            userName:   item.userName,
            userAvatar: item.userAvatar,
          })
        }
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.userName)}</Text>
        </View>

        {/* Text content */}
        <View style={styles.chatInfo}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.userName}
            </Text>
            {item.lastMessageTime ? (
              <Text style={styles.chatTime}>{formatTime(item.lastMessageTime)}</Text>
            ) : null}
          </View>
          <Text
            style={item.lastMessage ? styles.chatPreview : styles.chatPreviewEmpty}
            numberOfLines={1}
          >
            {item.lastMessage ?? 'Tap to start chatting'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#3A3D5C" />
      </Pressable>
    ),
    [navigation],
  );

  // ── Empty state ─────────────────────────────────────────────────────────────

  const EmptyComponent = (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconRing}>
        <Ionicons name="chatbubbles-outline" size={52} color="#3A3D60" />
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyBody}>
        Visit someone&apos;s profile and tap{' '}
        <Text style={styles.emptyAccent}>"Message"</Text>
        {'\n'}to start a conversation.
      </Text>

      {/* Decorative tip card */}
      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={16} color="#5B8BFF" />
        <Text style={styles.tipText}>
          Go to{' '}
          <Text style={styles.tipAccent}>Feed → any post author</Text>
          {' '}or{' '}
          <Text style={styles.tipAccent}>Groups → a member</Text>
          {' '}to open their profile.
        </Text>
      </View>
    </View>
  );

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>Direct conversations</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color="#44476A" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations…"
          placeholderTextColor="#44476A"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#44476A" />
          </Pressable>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B8BFF" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.userId}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={EmptyComponent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT   = '#5B8BFF';
const BG       = '#0D0F1E';
const CARD_BG  = '#141626';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
  },
  headerTitle:    { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: '#7A7D9A', fontSize: 13, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141626',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2138',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  divider: {
    height: 1,
    backgroundColor: '#1A1D30',
    marginTop: 14,
  },

  // List
  listContent: { paddingBottom: 32 },
  listEmpty:   { flex: 1 },

  // Chat row
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  chatRowPressed: { backgroundColor: '#131525' },
  separator: { height: 1, backgroundColor: '#1A1D2E', marginLeft: 78 },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(91,139,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(91,139,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: ACCENT, fontSize: 18, fontWeight: '700' },

  chatInfo: { flex: 1, gap: 4 },
  chatTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  chatName:         { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  chatTime:         { color: '#55557A', fontSize: 11 },
  chatPreview:      { color: '#7A7D9A', fontSize: 13, lineHeight: 18 },
  chatPreviewEmpty: { color: '#3A3D5C', fontSize: 13, fontStyle: 'italic' },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    gap: 14,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#141626',
    borderWidth: 1,
    borderColor: '#252840',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    color: '#7A7D9A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAccent: { color: ACCENT, fontWeight: '600' },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2138',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  tipText:   { flex: 1, color: '#7A7D9A', fontSize: 12, lineHeight: 18 },
  tipAccent: { color: ACCENT, fontWeight: '600' },
});

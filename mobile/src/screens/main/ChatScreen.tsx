import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useAuth } from '../../context/AuthContext';
import {
  buildChatId,
  ChatSocket,
  getHistory,
  upsertRecentChat,
  WsOutbound,
} from '../../services/chatService';

// ── Local message type ────────────────────────────────────────────────────────
// Normalises REST Message + WS OutboundMessage into one shape.

interface ChatMsg {
  id:        string;
  senderId:  string;
  content:   string;
  createdAt: string; // ISO 8601
  pending?:  boolean;
}

// ── Date-separator helpers ────────────────────────────────────────────────────

type ListItem = { type: 'msg'; data: ChatMsg } | { type: 'date'; label: string };

function dateLabel(iso: string): string {
  const d   = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString())       return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function buildListItems(msgs: ChatMsg[]): ListItem[] {
  // msgs is newest-first (for inverted FlatList)
  // Walk oldest-first to insert date headers, then reverse for inverted display
  const reversed = [...msgs].reverse(); // oldest → newest
  const items: ListItem[] = [];
  let lastDate = '';

  for (const msg of reversed) {
    const label = dateLabel(msg.createdAt);
    if (label !== lastDate) {
      items.push({ type: 'date', label });
      lastDate = label;
    }
    items.push({ type: 'msg', data: msg });
  }

  return items.reverse(); // back to newest-first for inverted FlatList
}

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { navigation: any; route: any };

export default function ChatScreen({ navigation, route }: Props) {
  const { userId: theirId, userName, userAvatar } = route.params as {
    userId: string;
    userName: string;
    userAvatar?: string;
  };

  const { user: me } = useAuth();

  const [msgs,       setMsgs]       = useState<ChatMsg[]>([]);
  const [text,       setText]       = useState('');
  const [wsReady,    setWsReady]    = useState(false);
  const [wsError,    setWsError]    = useState(false);
  const [histLoading, setHistLoading] = useState(true);

  const socketRef = useRef<ChatSocket | null>(null);
  const chatId    = useMemo(
    () => (me?.id ? buildChatId(me.id, theirId) : ''),
    [me?.id, theirId],
  );

  // ── Connect WS + load history on mount ───────────────────────────────────

  useEffect(() => {
    if (!me?.id || !chatId) return;

    let socket: ChatSocket;

    (async () => {
      // 1. Get fresh Firebase ID token (force-refresh so it isn't expired)
      let firebaseToken: string | undefined;
      try {
        firebaseToken = await auth().currentUser?.getIdToken(true);
      } catch {
        setWsError(true);
      }

      if (firebaseToken) {
        socket = new ChatSocket(firebaseToken);
        socketRef.current = socket;

        socket
          .onOpen(() => setWsReady(true))
          .onClose(() => setWsReady(false))
          .onError(() => setWsError(true))
          .onMessage((wsMsg: WsOutbound) => {
            // Only show messages belonging to this conversation
            if (
              (wsMsg.from === me.id   && wsMsg.to === theirId) ||
              (wsMsg.from === theirId && wsMsg.to === me.id)
            ) {
              const incoming: ChatMsg = {
                id:        wsMsg.id,
                senderId:  wsMsg.from,
                content:   wsMsg.content,
                createdAt: wsMsg.created_at,
              };
              // Deduplicate: remove optimistic echo then prepend confirmed msg
              setMsgs((prev) => {
                const deduped = prev.filter(
                  (m) => m.id !== wsMsg.id && !(m.pending && m.content === wsMsg.content && m.senderId === wsMsg.from),
                );
                return [incoming, ...deduped];
              });
            }
          });

        socket.connect();
      }

      // 2. Load REST history (newest-first from backend)
      try {
        const history = await getHistory(chatId, { limit: 50 });
        const normalised: ChatMsg[] = history.map((m: any) => ({
          id:        m.id,
          senderId:  m.sender_id,
          content:   m.content,
          createdAt: typeof m.created_at === 'string'
            ? m.created_at
            : new Date(m.created_at).toISOString(),
        }));
        // History comes newest-first — use as-is for inverted FlatList
        setMsgs(normalised);
      } catch {
        // Non-critical: WS still works for new messages
      } finally {
        setHistLoading(false);
      }

      // 3. Save to recent chats so MessagesScreen shows this conversation
      upsertRecentChat({
        userId:    theirId,
        userName,
        userAvatar,
        lastMessageTime: new Date().toISOString(),
      });
    })();

    return () => {
      socket?.disconnect();
    };
  }, [me?.id, theirId, chatId, userName, userAvatar]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !me?.id) return;
    setText('');

    // Optimistic: prepend a pending bubble immediately
    const optimisticId = `pending_${Date.now()}`;
    const optimistic: ChatMsg = {
      id:        optimisticId,
      senderId:  me.id,
      content:   trimmed,
      createdAt: new Date().toISOString(),
      pending:   true,
    };
    setMsgs((prev) => [optimistic, ...prev]);

    // Send over WebSocket
    socketRef.current?.send(theirId, trimmed);

    // Update recent chats with this last message
    upsertRecentChat({
      userId:          theirId,
      userName,
      userAvatar,
      lastMessage:     trimmed,
      lastMessageTime: new Date().toISOString(),
    });
  }, [text, me?.id, theirId, userName, userAvatar]);

  // ── List items with date separators ──────────────────────────────────────

  const listItems = useMemo(() => buildListItems(msgs), [msgs]);

  // ── Render item ───────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.dateRow}>
            <View style={styles.dateLine} />
            <Text style={styles.dateLabel}>{item.label}</Text>
            <View style={styles.dateLine} />
          </View>
        );
      }

      const { data: msg } = item;
      const isMine = msg.senderId === me?.id;

      return (
        <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
          {/* Their avatar (left side only) */}
          {!isMine && (
            <View style={styles.tinyAvatar}>
              <Text style={styles.tinyAvatarText}>{getInitials(userName)}</Text>
            </View>
          )}

          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
              {msg.content}
            </Text>
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
              {formatMsgTime(msg.createdAt)}
              {msg.pending && (
                <Text style={styles.pendingDot}> ·</Text>
              )}
            </Text>
          </View>
        </View>
      );
    },
    [me?.id, userName],
  );

  // ── Header ────────────────────────────────────────────────────────────────

  const initials = getInitials(userName);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{userName}</Text>
          <Text style={[styles.headerStatus, wsReady && styles.headerStatusOnline]}>
            {wsReady ? '● Connected' : wsError ? '● Error' : '● Connecting…'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list — inverted so newest is at bottom */}
        {histLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#5B8BFF" />
          </View>
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={(item, idx) =>
              item.type === 'date' ? `date_${item.label}_${idx}` : item.data.id
            }
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={44} color="#252840" />
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSub}>Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor="#44476A"
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? '#FFFFFF' : '#44476A'}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT    = '#5B8BFF';
const BG        = '#0D0F1E';
const INPUT_BG  = '#141626';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  flex:      { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#0D0F1E',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1D30',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#141626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(91,139,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(91,139,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: ACCENT, fontSize: 14, fontWeight: '700' },
  headerInfo:       { flex: 1 },
  headerName:       { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  headerStatus:     { color: '#55557A', fontSize: 11, marginTop: 1 },
  headerStatusOnline: { color: '#4ADE80' },

  // List
  listContent: { paddingHorizontal: 12, paddingVertical: 12 },

  // Date separator
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dateLine:  { flex: 1, height: 1, backgroundColor: '#1E2138' },
  dateLabel: { color: '#44476A', fontSize: 11, fontWeight: '600' },

  // Message row
  msgRow: {
    flexDirection: 'row',
    marginVertical: 3,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowMine:   { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },

  // Tiny avatar (for their messages)
  tinyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(91,139,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(91,139,255,0.25)',
  },
  tinyAvatarText: { color: ACCENT, fontSize: 10, fontWeight: '700' },

  // Bubble
  bubble: {
    maxWidth: '72%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#1E2138',
    borderBottomLeftRadius: 4,
  },
  bubbleText:     { color: '#CCCCDD', fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#FFFFFF' },
  bubbleTime:     { color: 'rgba(170,170,190,0.6)', fontSize: 10, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.55)' },
  pendingDot:     { color: 'rgba(255,255,255,0.4)' },

  // Empty chat
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyChatText: { color: '#55557A', fontSize: 16, fontWeight: '700' },
  emptyChatSub:  { color: '#44476A', fontSize: 13 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: INPUT_BG,
    borderTopWidth: 1,
    borderTopColor: '#1A1D30',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0D0F1E',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#252840',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#1E2138',
    shadowOpacity: 0,
    elevation: 0,
  },
});

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Notification } from '../../types';
import {
  getNotifications,
  markAllRead,
  notificationLabel,
} from '../../services/notificationsService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days  < 7)  return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Icon per notification type ─────────────────────────────────────────────────
const TYPE_ICON: Record<Notification['type'], { name: string; color: string }> = {
  follow:     { name: 'person-add',         color: '#5B8BFF' },
  like:       { name: 'heart',              color: '#FF6B8A' },
  comment:    { name: 'chatbubble',         color: '#A78BFA' },
  message:    { name: 'mail',               color: '#34D399' },
  group_join: { name: 'people',             color: '#FBBF24' },
  event:      { name: 'calendar',           color: '#F97316' },
};

// ── Tab types ─────────────────────────────────────────────────────────────────
type NTab = 'All' | 'Unread';

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }: { navigation: any }) {
  const [tab,      setTab]      = useState<NTab>('All');
  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [marking,  setMarking]  = useState(false);

  // Reload each time screen is focused
  const load = useCallback(async (unreadOnly: boolean) => {
    setLoading(true);
    try {
      const data = await getNotifications(unreadOnly);
      setNotifs(data);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab === 'Unread');
    }, [load, tab]),
  );

  // Switch tab
  const switchTab = useCallback((t: NTab) => {
    setTab(t);
    load(t === 'Unread');
  }, [load]);

  // Mark all read
  const handleMarkAll = useCallback(async () => {
    if (marking) return;
    setMarking(true);
    try {
      await markAllRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // fail silently
    } finally {
      setMarking(false);
    }
  }, [marking]);

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: Notification }) => {
    const icon = TYPE_ICON[item.type] ?? { name: 'notifications', color: '#5B8BFF' };
    return (
      <View style={[styles.row, !item.is_read && styles.rowUnread]}>
        {/* Unread indicator */}
        <View style={styles.dotWrap}>
          {!item.is_read && <View style={styles.dot} />}
        </View>

        {/* Avatar with type icon badge */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.actor_name)}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: icon.color + '22' }]}>
            <Ionicons name={icon.name as any} size={11} color={icon.color} />
          </View>
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={styles.notifText} numberOfLines={2}>
            <Text style={styles.actorName}>
              {item.actor_name ?? 'Someone'}
            </Text>
            {'  '}
            <Text style={styles.actionText}>{notificationLabel(item.type)}</Text>
          </Text>
          {item.message ? (
            <Text style={styles.preview} numberOfLines={1}>{item.message}</Text>
          ) : null}
          <Text style={styles.time}>{formatRelative(item.created_at)}</Text>
        </View>
      </View>
    );
  }, []);

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyComponent = (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconRing}>
        <Ionicons name="notifications-off-outline" size={48} color="#2A2D45" />
      </View>
      <Text style={styles.emptyTitle}>
        {tab === 'Unread' ? 'All caught up!' : 'No notifications yet'}
      </Text>
      <Text style={styles.emptyBody}>
        {tab === 'Unread'
          ? 'You have no unread notifications.'
          : 'Activity from followers, likes and comments will appear here.'}
      </Text>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Pressable
          style={[styles.markAllBtn, marking && styles.markAllBtnDisabled]}
          onPress={handleMarkAll}
          disabled={marking || unreadCount === 0}
        >
          <Text style={[styles.markAllText, unreadCount === 0 && styles.markAllTextDim]}>
            Mark all read
          </Text>
        </Pressable>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['All', 'Unread'] as NTab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabPill, tab === t && styles.tabPillActive]}
            onPress={() => switchTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t}
            </Text>
          </Pressable>
        ))}
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
          data={notifs}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            notifs.length === 0 && styles.listEmpty,
          ]}
          ListEmptyComponent={EmptyComponent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT  = '#5B8BFF';
const BG      = '#0D0F1E';
const CARD_BG = '#141626';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1D30',
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  headerTitle:       { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  markAllBtn:         { paddingHorizontal: 10, paddingVertical: 6 },
  markAllBtnDisabled: { opacity: 0.4 },
  markAllText:        { color: ACCENT, fontSize: 12, fontWeight: '600' },
  markAllTextDim:     { color: '#44476A' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1A1D2E',
    borderWidth: 1,
    borderColor: '#252840',
  },
  tabPillActive: {
    backgroundColor: 'rgba(91,139,255,0.15)',
    borderColor: ACCENT,
  },
  tabLabel:       { color: '#55557A', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: ACCENT },

  divider: { height: 1, backgroundColor: '#1A1D30', marginTop: 8 },

  // List
  listContent: { paddingBottom: 40 },
  listEmpty:   { flex: 1 },
  separator:   { height: 1, backgroundColor: '#131525', marginLeft: 68 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingRight: 16,
    gap: 0,
  },
  rowUnread: { backgroundColor: 'rgba(91,139,255,0.04)' },

  // Unread dot
  dotWrap: { width: 20, alignItems: 'center', paddingTop: 8 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT,
  },

  // Avatar
  avatarWrap: { width: 46, marginRight: 12, position: 'relative' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(91,139,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(91,139,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: ACCENT, fontSize: 15, fontWeight: '700' },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BG,
  },

  // Text
  textWrap:   { flex: 1, gap: 3 },
  notifText:  { fontSize: 13.5, lineHeight: 19, flexWrap: 'wrap' },
  actorName:  { color: '#FFFFFF', fontWeight: '700' },
  actionText: { color: '#9999BB' },
  preview:    { color: '#55557A', fontSize: 12, fontStyle: 'italic' },
  time:       { color: '#44476A', fontSize: 11, marginTop: 2 },

  // Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 60,
    gap: 12,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#252840',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody:  { color: '#7A7D9A', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

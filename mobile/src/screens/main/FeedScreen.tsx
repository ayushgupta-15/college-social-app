import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import { Post } from '../../types';
import PostCard from '../../components/PostCard';
import CreatePostSheet from '../../components/CreatePostSheet';
import {
  getFeed,
  toggleLike,
  createPost,
  PostType,
} from '../../services/postsService';
import { FeedStackParamList } from '../../navigation/FeedStack';
import { getUnreadCount } from '../../services/notificationsService';

// ── Tab switcher ──────────────────────────────────────────────────────────────

type FeedTab = 'for_you' | 'following';

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
  const [activeTab, setActiveTab]     = useState<FeedTab>('for_you');
  const [posts, setPosts]             = useState<Post[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor]   = useState<string | null>(null);
  const [hasMore, setHasMore]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const sheetRef = useRef<BottomSheet>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const loadFeed = useCallback(async (cursor?: string) => {
    try {
      const res = await getFeed(cursor);
      const newPosts = res.posts ?? [];

      if (cursor) {
        // Append next page
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        // Fresh load / refresh
        setPosts(newPosts);
      }

      if (res.next_cursor && newPosts.length > 0) {
        setNextCursor(res.next_cursor);
        setHasMore(true);
      } else {
        setNextCursor(null);
        setHasMore(false);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load feed.');
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadFeed().finally(() => setLoading(false));
  }, [loadFeed]);

  // Refresh unread count on focus
  useFocusEffect(
    useCallback(() => {
      getUnreadCount().then(setUnreadCount).catch(() => {});
    }, [])
  );

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setHasMore(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  // Infinite scroll — called when FlatList reaches end
  const handleEndReached = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    await loadFeed(nextCursor);
    setLoadingMore(false);
  }, [loadingMore, hasMore, nextCursor, loadFeed]);

  // ── Optimistic like ───────────────────────────────────────────────────────
  // Flip state immediately, revert on API error.

  const handleLike = useCallback(async (postId: string) => {
    // Snapshot for rollback
    const snapshot = posts.map((p) => ({ ...p }));

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nowLiked = !p.liked_by_me;
        return {
          ...p,
          liked_by_me: nowLiked,
          like_count: p.like_count + (nowLiked ? 1 : -1),
        };
      }),
    );

    try {
      // Sync with backend
      const res = await toggleLike(postId);
      // Reconcile with server truth
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: res.liked, like_count: res.like_count }
            : p,
        ),
      );
    } catch {
      // Revert on failure
      setPosts(snapshot);
    }
  }, [posts]);

  // ── Create post ───────────────────────────────────────────────────────────

  const handleCreatePost = useCallback(
    async (content: string, type: PostType) => {
      const newPost = await createPost({ content, post_type: type });
      // Prepend to feed
      setPosts((prev) => [newPost, ...prev]);
    },
    [],
  );

  // ── Navigate to author profile ─────────────────────────────────────────────

  const handleAuthorPress = useCallback((authorId: string) => {
    navigation.push('ProfileScreen', { userId: authorId });
  }, [navigation]);

  // ── Comment (placeholder) ─────────────────────────────────────────────────

  const handleComment = useCallback((_postId: string) => {
    // TODO Sprint M4: open comment sheet
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onAuthorPress={handleAuthorPress}
      />
    ),
    [handleLike, handleComment, handleAuthorPress],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const ListHeader = (
    <>
      {/* Search bar row */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color="#44476A" />
        <Text style={styles.searchPlaceholder}>Search Campus Connect</Text>
        <Pressable onPress={() => navigation.push('NotificationsScreen')} style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={22} color="#7A7D9A" />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* For You / Following tabs */}
      <View style={styles.tabRow}>
        {(['for_you', 'following'] as FeedTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab === 'for_you' ? 'For You' : 'Following'}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
      </View>
    </>
  );

  const ListFooter = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color="#7C6FE0" />
    </View>
  ) : !hasMore && posts.length > 0 ? (
    <Text style={styles.endText}>You're all caught up ✨</Text>
  ) : null;

  const ListEmpty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#7C6FE0" />
    </View>
  ) : error ? (
    <View style={styles.center}>
      <Text style={styles.errorText}>⚠ {error}</Text>
      <Pressable style={styles.retryBtn} onPress={handleRefresh}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.emptyText}>No posts yet.{'\n'}Be the first to post! 🚀</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#7C6FE0"
            colors={['#7C6FE0']}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Floating compose button */}
      <Pressable
        style={styles.fab}
        onPress={() => sheetRef.current?.snapToIndex(0)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Create post bottom sheet */}
      <CreatePostSheet ref={sheetRef} onSubmit={handleCreatePost} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#5B8BFF';
const BG     = '#0D0F1E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1E',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
  },

  // ── Search bar ─────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141626',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2138',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#44476A',
    fontSize: 14,
  },
  bellBtn: {
    position: 'relative',
    padding: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#141626',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Tabs ───────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E38',
  },
  tabItem: {
    marginRight: 24,
    paddingBottom: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#55557A',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
  },

  // ── States ─────────────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    color: '#55557A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: 'rgba(124, 111, 224, 0.15)',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  endText: {
    color: '#44445A',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },

  // ── FAB ────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});

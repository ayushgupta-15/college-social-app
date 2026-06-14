import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const POST_TYPE_BADGE: Record<Post['post_type'], { label: string; color: string; bg: string }> = {
  general:      { label: 'General',      color: '#8888AA', bg: 'rgba(136,136,170,0.12)' },
  opportunity:  { label: 'Opportunity',  color: '#4FC3F7', bg: 'rgba(79,195,247,0.12)'  },
  announcement: { label: 'Announcement', color: '#FFB74D', bg: 'rgba(255,183,77,0.12)'  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PostCard({ post, onLike, onComment, onAuthorPress }: Props) {
  const badge         = POST_TYPE_BADGE[post.post_type] ?? POST_TYPE_BADGE.general;
  const handleLike    = useCallback(() => onLike(post.id),        [post.id, onLike]);
  const handleComment = useCallback(() => onComment(post.id),     [post.id, onComment]);
  const handleAuthor  = useCallback(() => onAuthorPress?.(post.author_id), [post.author_id, onAuthorPress]);

  return (
    <View style={styles.card}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.avatarAndMeta} onPress={handleAuthor} hitSlop={4}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(post.author_name)}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.authorName} numberOfLines={1}>{post.author_name}</Text>
            <Text style={styles.timestamp}>{timeAgo(post.created_at as unknown as string)}</Text>
          </View>
        </Pressable>

        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* ── Content ── */}
      <Text style={styles.content}>{post.content}</Text>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        {/* Like */}
        <Pressable style={styles.actionBtn} onPress={handleLike} hitSlop={8}>
          <Ionicons
            name={post.liked_by_me ? 'heart' : 'heart-outline'}
            size={20}
            color={post.liked_by_me ? '#FF6B8A' : '#55557A'}
          />
          <Text style={[styles.actionCount, post.liked_by_me && styles.likedCount]}>
            {post.like_count}
          </Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={styles.actionBtn} onPress={handleComment} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={19} color="#55557A" />
          <Text style={styles.actionCount}>{post.comment_count ?? 0}</Text>
        </Pressable>

        {/* Share */}
        <Pressable style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="share-social-outline" size={20} color="#55557A" />
          <Text style={styles.actionCount}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_BG = '#141626';
const BORDER  = '#1E2138';
const ACCENT  = '#5B8BFF';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatarAndMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 139, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: { flex: 1 },
  authorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  timestamp: {
    color: '#55557A',
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Content ────────────────────────────────────────────────────────────────
  content: {
    color: '#CCCCDD',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    color: '#55557A',
    fontSize: 13,
    fontWeight: '600',
  },
  likedCount: {
    color: '#FF6B8A',
  },
});

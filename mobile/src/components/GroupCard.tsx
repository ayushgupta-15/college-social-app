import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// Subject chip colours — matches Figma palette
const SUBJECT_COLORS: Record<string, { color: string; bg: string }> = {
  'Web Dev':        { color: '#5B8BFF', bg: 'rgba(91,139,255,0.12)' },
  'DSA':            { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  'ML':             { color: '#4FC3F7', bg: 'rgba(79,195,247,0.12)' },
  'UI/UX':          { color: '#F472B6', bg: 'rgba(244,114,182,0.12)' },
  'Algorithms':     { color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  'Entrepreneurship': { color: '#FFB74D', bg: 'rgba(255,183,77,0.12)' },
  'Cloud':          { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
};
const DEFAULT_SUBJECT_COLOR = { color: '#8888AA', bg: 'rgba(136,136,170,0.12)' };

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  group: Group;
  onPress: (group: Group) => void;
  onJoin: (groupId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupCard({ group, onPress, onJoin }: Props) {
  const subjectStyle = group.subject
    ? (SUBJECT_COLORS[group.subject] ?? DEFAULT_SUBJECT_COLOR)
    : DEFAULT_SUBJECT_COLOR;

  const handleJoin = useCallback(
    (e: any) => {
      e.stopPropagation?.();
      onJoin(group.id);
    },
    [group.id, onJoin],
  );

  return (
    <Pressable style={styles.card} onPress={() => onPress(group)}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={[styles.avatar, { borderColor: subjectStyle.color }]}>
          <Text style={[styles.avatarText, { color: subjectStyle.color }]}>
            {getInitials(group.name)}
          </Text>
        </View>
        {group.is_private && (
          <View style={styles.privateBadge}>
            <Ionicons name="lock-closed" size={9} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={2}>{group.name}</Text>

      {/* Subject chip */}
      {group.subject && (
        <View style={[styles.subjectChip, { backgroundColor: subjectStyle.bg }]}>
          <Text style={[styles.subjectText, { color: subjectStyle.color }]}>
            {group.subject}
          </Text>
        </View>
      )}

      {/* Member count */}
      <View style={styles.memberRow}>
        <Ionicons name="people-outline" size={13} color="#7A7D9A" />
        <Text style={styles.memberCount}>{formatCount(group.member_count)} Members</Text>
      </View>

      {/* Join / Joined button */}
      <Pressable
        style={[styles.joinBtn, group.is_member && styles.joinedBtn]}
        onPress={handleJoin}
        hitSlop={4}
      >
        <Text style={[styles.joinBtnText, group.is_member && styles.joinedBtnText]}>
          {group.is_member ? 'Joined ✓' : 'Join'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#5B8BFF';
const CARD_BG = '#141626';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2138',
    padding: 14,
    gap: 8,
  },

  // ── Avatar ─────────────────────────────────────────────────────────────────
  avatarWrapper: { position: 'relative', alignSelf: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  privateBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#5B8BFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: CARD_BG,
  },

  // ── Info ───────────────────────────────────────────────────────────────────
  name: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  subjectChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  subjectText: { fontSize: 11, fontWeight: '700' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberCount: { color: '#7A7D9A', fontSize: 12 },

  // ── Button ─────────────────────────────────────────────────────────────────
  joinBtn: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 2,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  joinedBtn: {
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1,
    borderColor: ACCENT,
    shadowOpacity: 0,
    elevation: 0,
  },
  joinBtnText:   { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  joinedBtnText: { color: ACCENT },
});

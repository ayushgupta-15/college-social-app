import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  user: User;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  onEdit?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  onAvatarPress?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing = false,
  onEdit,
  onFollow,
  onMessage,
  onAvatarPress,
}: Props) {
  return (
    <View style={styles.container}>

      {/* ── Avatar row ── */}
      <View style={styles.avatarRow}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={onAvatarPress} activeOpacity={0.85}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
          </View>
          {isOwnProfile && (
            <View style={styles.cameraChip}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.post_count ?? 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.follower_count}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.following_count}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* ── Name & info ── */}
      <Text style={styles.fullName}>{user.full_name}</Text>
      {user.major && user.college && (
        <Text style={styles.subline}>
          {user.major} · {user.college}
          {user.grad_year ? ` · ${user.grad_year}` : ''}
        </Text>
      )}
      {user.bio ? (
        <Text style={styles.bio}>{user.bio}</Text>
      ) : isOwnProfile ? (
        <TouchableOpacity onPress={onEdit}>
          <Text style={styles.bioPlaceholder}>+ Add a bio</Text>
        </TouchableOpacity>
      ) : null}

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        {isOwnProfile ? (
          <Pressable style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={onFollow}
            >
              <Ionicons
                name={isFollowing ? 'checkmark' : 'person-add-outline'}
                size={16}
                color={isFollowing ? '#5B8BFF' : '#FFFFFF'}
              />
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Connect'}
              </Text>
            </Pressable>

            <Pressable style={styles.messageBtn} onPress={onMessage}>
              <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
              <Text style={styles.messageBtnText}>Message</Text>
            </Pressable>

            <Pressable style={styles.moreBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#8888AA" />
            </Pressable>
          </>
        )}
      </View>

      {/* ── Open to referral badge ── */}
      {user.is_open_to_referral && (
        <View style={styles.referralBadge}>
          <Ionicons name="briefcase-outline" size={13} color="#4FC3F7" />
          <Text style={styles.referralText}>Open to referrals</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#5B8BFF';
const BG     = '#141626';

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  // ── Avatar + Stats ─────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(91,139,255,0.15)',
    borderWidth: 2.5,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: ACCENT,
    fontSize: 26,
    fontWeight: '700',
  },
  cameraChip: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BG,
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#7A7D9A',
    fontSize: 11,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#1E2138',
  },

  // ── Name & bio ─────────────────────────────────────────────────────────────
  fullName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subline: {
    color: '#7A7D9A',
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  bio: {
    color: '#BBBBD0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  bioPlaceholder: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(91,139,255,0.15)',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  followingBtn: {
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1,
    borderColor: ACCENT,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  followingBtnText: {
    color: ACCENT,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E2138',
    borderRadius: 10,
    paddingVertical: 10,
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  moreBtn: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2138',
    borderRadius: 10,
  },

  // ── Referral badge ─────────────────────────────────────────────────────────
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79,195,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  referralText: {
    color: '#4FC3F7',
    fontSize: 12,
    fontWeight: '600',
  },
});

import React from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
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
  // Placeholder cover image to match the beautiful building cover in the design
  const COVER_URL = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop';

  return (
    <View style={styles.container}>
      {/* ── Cover Image ── */}
      <ImageBackground source={{ uri: COVER_URL }} style={styles.coverImage}>
        <View style={styles.coverOverlay} />
      </ImageBackground>

      {/* ── Main Content Area ── */}
      <View style={styles.content}>
        {/* ── Avatar (Centered, Overlapping) ── */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={onAvatarPress} activeOpacity={0.85}>
            <View style={styles.avatar}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
              )}
            </View>
            {isOwnProfile && (
              <View style={styles.cameraChip}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Name & Info (Centered) ── */}
        <View style={styles.nameContainer}>
          <Text style={styles.fullName}>
            {user.full_name}
          </Text>
          {user.major && user.college && (
            <Text style={styles.subline}>
              {user.major} · {user.college}
              {user.grad_year ? ` '${user.grad_year.toString().slice(-2)}` : ''}
            </Text>
          )}
        </View>

        {/* ── Stats (Centered, No Dividers) ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.post_count ?? 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.follower_count}</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.following_count ?? 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

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
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Following' : 'Connect'}
                </Text>
              </Pressable>

              <Pressable style={styles.messageBtn} onPress={onMessage}>
                <Text style={styles.messageBtnText}>Message</Text>
              </Pressable>

              <Pressable style={styles.moreBtn}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#8888AA" />
              </Pressable>
            </>
          )}
        </View>

        {/* ── Open to referral badge (if any) ── */}
        {user.is_open_to_referral && (
          <View style={styles.referralBadge}>
            <Ionicons name="briefcase-outline" size={13} color="#4FC3F7" />
            <Text style={styles.referralText}>Open to referrals</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#5B8BFF';
const BG     = '#0D0F1E'; // Match screen background

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    width: '100%',
  },

  // ── Cover Image ────────────────────────────────────────────────────────────
  coverImage: {
    width: '100%',
    height: 140, // Nice height for cover
    backgroundColor: '#1E2138',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slight dark overlay
  },

  // ── Content Area ───────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },

  // ── Avatar ─────────────────────────────────────────────────────────────────
  avatarContainer: {
    marginTop: -45, // Pull avatar up to overlap cover image
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1A1C2E',
    borderWidth: 4,
    borderColor: BG, // Border matches background to create cut-out effect
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: ACCENT,
    fontSize: 28,
    fontWeight: '700',
  },
  cameraChip: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BG,
  },

  // ── Name & Info ────────────────────────────────────────────────────────────
  nameContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  fullName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subline: {
    color: '#8A8DAB',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40, // Space between stat items
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#7A7D9A',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
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
    borderRadius: 12,
    paddingVertical: 12,
  },
  editBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  followBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
  },
  followingBtn: {
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  followingBtnText: {
    color: ACCENT,
  },
  messageBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2138', // Dark button
    borderWidth: 1,
    borderColor: '#2A2D45',
    borderRadius: 12,
    paddingVertical: 12,
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  moreBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2138',
    borderWidth: 1,
    borderColor: '#2A2D45',
    borderRadius: 12,
  },

  // ── Referral badge ─────────────────────────────────────────────────────────
  referralBadge: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79,195,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.25)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  referralText: {
    color: '#4FC3F7',
    fontSize: 13,
    fontWeight: '600',
  },
});


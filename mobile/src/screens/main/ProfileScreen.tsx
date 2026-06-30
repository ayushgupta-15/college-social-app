import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../types';
import ProfileHeader from '../../components/ProfileHeader';
import { useAuth } from '../../context/AuthContext';
import { getUser, followUser, unfollowUser } from '../../services/usersService';

// ProfileScreen is mounted inside both FeedStack (other users) and ProfileStack
// (own profile tab). Using 'any' for navigation/route avoids duplicating param lists.
export type FeedStackParamList = {
  FeedScreen:        undefined;
  ProfileScreen:     { userId?: string };
  EditProfileScreen: undefined;
};

type Props = {
  navigation: any;
  route:      any;
};

// ── Tab data ──────────────────────────────────────────────────────────────────

type ProfileTab = 'About' | 'Skills' | 'Projects' | 'Activity';
const TABS: ProfileTab[] = ['About', 'Skills', 'Projects', 'Activity'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH / TABS.length;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation, route }: Props) {
  const { user: me, updateUser, logout } = useAuth();
  const paramUserId = route.params?.userId;
  const isOwnProfile = !paramUserId || paramUserId === me?.id;
  const targetUserId = isOwnProfile ? me?.id : paramUserId;

  const [profile, setProfile]       = useState<User | null>(isOwnProfile ? me : null);
  const [loading, setLoading]       = useState(!isOwnProfile);
  const [error, setError]           = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<ProfileTab>('About');
  const [isFollowing, setIsFollowing] = useState(false);

  // Animated underline position
  const tabUnderlineX = useRef(new Animated.Value(0)).current;

  // ── Load profile ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOwnProfile) {
      setProfile(me);
      return;
    }
    if (!targetUserId) return;
    setLoading(true);
    getUser(targetUserId)
      .then(setProfile)
      .catch((e) => setError(e?.message ?? 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [targetUserId, isOwnProfile, me]);

  // ── Tab animation ───────────────────────────────────────────────────────────

  const switchTab = useCallback((tab: ProfileTab, index: number) => {
    setActiveTab(tab);
    Animated.spring(tabUnderlineX, {
      toValue: index * TAB_WIDTH,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [tabUnderlineX]);

  // ── Follow — optimistic ─────────────────────────────────────────────────────

  const handleFollow = useCallback(async () => {
    if (!targetUserId) return;
    const prev = isFollowing;
    setIsFollowing(!prev);
    setProfile((p) => p
      ? { ...p, follower_count: p.follower_count + (prev ? -1 : 1) }
      : p);

    try {
      if (prev) await unfollowUser(targetUserId);
      else       await followUser(targetUserId);
    } catch {
      // Revert
      setIsFollowing(prev);
      setProfile((p) => p
        ? { ...p, follower_count: p.follower_count + (prev ? 1 : -1) }
        : p);
      Alert.alert('Error', 'Could not update follow status. Try again.');
    }
  }, [isFollowing, targetUserId]);

  // ── Avatar press ────────────────────────────────────────────────────────────

  const handleAvatarPress = useCallback(() => {
    if (isOwnProfile) {
      Alert.alert('Coming Soon', 'Avatar upload will be available in a future update.');
    }
  }, [isOwnProfile]);

  // ── Navigate to edit ────────────────────────────────────────────────────────

  const handleEdit = useCallback(() => {
    navigation.navigate('EditProfileScreen' as any);
  }, [navigation]);

  // ── Logout ──────────────────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ],
    );
  }, [logout]);

  // ── Tab content ─────────────────────────────────────────────────────────────

  const renderAbout = () => {
    const placeholderSkills = ['React Native', 'UI Design', 'Python', 'Cloud', 'Firebase', 'DSA'];
    return (
      <View style={styles.tabContent}>
        {/* Bio text (or placeholder if no bio) */}
        <Text style={styles.bioText}>
          {profile?.bio || 'Passionate about software development, UI/UX and building products that solve real-world problems.'}
        </Text>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsWrap}>
            {placeholderSkills.map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderSkills = () => {
    // Skills are not yet a backend field — show placeholder
    const placeholderSkills = ['React Native', 'Node.js', 'Firebase', 'TypeScript'];
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsWrap}>
          {placeholderSkills.map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {isOwnProfile && (
            <Pressable style={styles.addSkillChip} onPress={handleEdit}>
              <Ionicons name="add" size={14} color="#5B8BFF" />
              <Text style={styles.addSkillText}>Add skill</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyTab = (label: string) => (
    <View style={styles.emptyTab}>
      <Ionicons name="folder-open-outline" size={48} color="#2A2D45" />
      <Text style={styles.emptyTabText}>No {label} yet</Text>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <ActivityIndicator size="large" color="#5B8BFF" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        <Ionicons name="warning-outline" size={44} color="#FF6B6B" />
        <Text style={styles.errorText}>{error ?? 'Profile not found'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Back button for other profiles */}
      {!isOwnProfile && (
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topBarTitle}>{profile.full_name}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header component */}
        <ProfileHeader
          user={profile}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          onEdit={handleEdit}
          onFollow={handleFollow}
          onAvatarPress={handleAvatarPress}
          onMessage={
            !isOwnProfile
              ? () =>
                  navigation.navigate('Messages', {
                    screen: 'ChatScreen',
                    params: {
                      userId:     profile.id,
                      userName:   profile.full_name,
                      userAvatar: profile.avatar_url,
                    },
                  })
              : undefined
          }
        />

        {/* ── Tab switcher ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab, index) => (
            <Pressable
              key={tab}
              style={styles.tabItem}
              onPress={() => switchTab(tab, index)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
          <Animated.View
            style={[styles.tabUnderline, { transform: [{ translateX: tabUnderlineX }] }]}
          />
        </View>

        {/* ── Tab content ── */}
        {activeTab === 'About'    && renderAbout()}
        {activeTab === 'Skills'   && renderSkills()}
        {activeTab === 'Projects' && renderEmptyTab('Projects')}
        {activeTab === 'Activity' && renderEmptyTab('Activity')}

        {/* ── Logout (own profile only) ── */}
        {isOwnProfile && (
          <View style={styles.logoutSection}>
            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#5B8BFF';
const BG     = '#0D0F1E';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 16 },

  // ── Top bar (other profiles only) ──────────────────────────────────────────
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20,22,38,0.6)', // Semi-transparent dark background for visibility on cover image
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#141626',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2138',
    position: 'relative',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
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
    width: TAB_WIDTH,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
  },

  // ── Tab content ────────────────────────────────────────────────────────────
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  infoSection: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A7D9A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    color: '#CCCCDD',
    fontSize: 14,
    lineHeight: 20,
  },
  bioText: {
    color: '#BBBBD0',
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillChip: {
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91,139,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
  },
  addSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#252840',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderStyle: 'dashed',
  },
  addSkillText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Empty tab ──────────────────────────────────────────────────────────────
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTabText: {
    color: '#44476A',
    fontSize: 14,
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logoutSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.35)',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,107,107,0.07)',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  retryBtn:  { backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: ACCENT, fontWeight: '700', fontSize: 14 },
});

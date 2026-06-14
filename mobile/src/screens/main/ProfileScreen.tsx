import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation, route }: Props) {
  const { user: me, updateUser } = useAuth();
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
  const TAB_WIDTH = 80; // approximate — works fine for 4 tabs

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

  // ── Tab content ─────────────────────────────────────────────────────────────

  const renderAbout = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Details</Text>

        {profile?.college && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color="#5B8BFF" />
            <Text style={styles.infoText}>{profile.college}</Text>
          </View>
        )}
        {profile?.major && (
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={16} color="#5B8BFF" />
            <Text style={styles.infoText}>{profile.major}</Text>
          </View>
        )}
        {profile?.grad_year && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#5B8BFF" />
            <Text style={styles.infoText}>Class of {profile.grad_year}</Text>
          </View>
        )}
        {profile?.email && (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color="#5B8BFF" />
            <Text style={styles.infoText}>{profile.email}</Text>
          </View>
        )}
      </View>

      {profile?.bio && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      )}
    </View>
  );

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
        <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
        <ActivityIndicator size="large" color="#5B8BFF" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
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
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

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
          onMessage={() => Alert.alert('Coming Soon', 'Messaging is in Sprint M6.')}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 8,
    backgroundColor: BG,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    width: 80,  // 320 / 4 tabs
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

  // ── Error ──────────────────────────────────────────────────────────────────
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  retryBtn:  { backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: ACCENT, fontWeight: '700', fontSize: 14 },
});

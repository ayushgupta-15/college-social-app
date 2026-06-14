import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Group } from '../../types';
import PostCard from '../../components/PostCard';
import { getGroup, joinGroup, leaveGroup } from '../../services/groupsService';
import { GroupsStackParamList } from './GroupsScreen';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupDetailScreen'>;

type DetailTab = 'Discussion' | 'Members' | 'Resources';
const TABS: DetailTab[] = ['Discussion', 'Members', 'Resources'];

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;

  const [group, setGroup]       = useState<Group | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('Discussion');

  // ── Load group ───────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    getGroup(groupId)
      .then(setGroup)
      .catch((e) => setError(e?.message ?? 'Failed to load group'))
      .finally(() => setLoading(false));
  }, [groupId]);

  // ── Join / Leave — optimistic ────────────────────────────────────────────

  const handleJoinLeave = useCallback(async () => {
    if (!group) return;
    const joining = !group.is_member;

    if (!joining) {
      Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave', style: 'destructive',
          onPress: async () => {
            const prev = { ...group };
            setGroup((g) => g ? { ...g, is_member: false, member_count: Math.max(0, g.member_count - 1) } : g);
            try {
              await leaveGroup(groupId);
            } catch (err: any) {
              setGroup(prev);
              const msg = err?.response?.data?.message ?? '';
              if (msg.includes('admin')) {
                Alert.alert('Cannot Leave', 'Transfer admin role before leaving this group.');
              } else {
                Alert.alert('Error', 'Could not leave group. Try again.');
              }
            }
          },
        },
      ]);
      return;
    }

    const prev = { ...group };
    setGroup((g) => g ? { ...g, is_member: true, member_count: g.member_count + 1 } : g);
    try {
      await joinGroup(groupId);
    } catch {
      setGroup(prev);
      Alert.alert('Error', 'Could not join group. Try again.');
    }
  }, [group, groupId]);

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
        <ActivityIndicator size="large" color="#5B8BFF" />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
        <Ionicons name="warning-outline" size={44} color="#FF6B6B" />
        <Text style={styles.errorText}>{error ?? 'Group not found'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Tab content ───────────────────────────────────────────────────────────

  const renderDiscussion = () => (
    <View style={styles.emptyTab}>
      <Ionicons name="chatbubbles-outline" size={52} color="#2A2D45" />
      <Text style={styles.emptyTabTitle}>No posts yet</Text>
      <Text style={styles.emptyTabSubtext}>
        {group.is_member ? 'Start the conversation!' : 'Join to participate in discussions.'}
      </Text>
    </View>
  );

  const renderMembers = () => (
    <View style={styles.emptyTab}>
      <Ionicons name="people-outline" size={52} color="#2A2D45" />
      <Text style={styles.emptyTabTitle}>{group.member_count} Members</Text>
      <Text style={styles.emptyTabSubtext}>Member list coming soon.</Text>
    </View>
  );

  const renderResources = () => (
    <View style={styles.emptyTab}>
      <Ionicons name="folder-open-outline" size={52} color="#2A2D45" />
      <Text style={styles.emptyTabTitle}>No resources yet</Text>
      <Text style={styles.emptyTabSubtext}>Share links, notes, and files here.</Text>
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>{group.name}</Text>
        <Pressable style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#8888AA" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Group hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{getInitials(group.name)}</Text>
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{group.name}</Text>

            {group.subject && (
              <View style={styles.subjectChip}>
                <Text style={styles.subjectText}>{group.subject}</Text>
              </View>
            )}

            {group.description && (
              <Text style={styles.heroDesc}>{group.description}</Text>
            )}

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="people-outline" size={14} color="#7A7D9A" />
                <Text style={styles.heroStatText}>{group.member_count} Members</Text>
              </View>
              {group.admin_name && (
                <View style={styles.heroStat}>
                  <Ionicons name="shield-outline" size={14} color="#7A7D9A" />
                  <Text style={styles.heroStatText}>Admin: {group.admin_name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Join / Joined button */}
          <Pressable
            style={[styles.joinBtn, group.is_member && styles.joinedBtn]}
            onPress={handleJoinLeave}
          >
            <Ionicons
              name={group.is_member ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={group.is_member ? '#5B8BFF' : '#FFFFFF'}
            />
            <Text style={[styles.joinBtnText, group.is_member && styles.joinedBtnText]}>
              {group.is_member ? 'Joined' : 'Join'}
            </Text>
          </Pressable>
        </View>

        {/* ── Tab bar ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {/* ── Tab content ── */}
        {activeTab === 'Discussion' && renderDiscussion()}
        {activeTab === 'Members'    && renderMembers()}
        {activeTab === 'Resources'  && renderResources()}
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

  // ── Top bar ────────────────────────────────────────────────────────────────
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#141626',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center', marginHorizontal: 8 },
  moreBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#141626',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: '#141626',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2138',
    padding: 20,
    gap: 14,
  },
  heroAvatar: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(91,139,255,0.15)',
    borderWidth: 2, borderColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  heroAvatarText: { color: ACCENT, fontSize: 22, fontWeight: '700' },
  heroInfo: { gap: 8 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  subjectChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subjectText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  heroDesc: { color: '#BBBBD0', fontSize: 14, lineHeight: 20 },
  heroStats: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroStatText: { color: '#7A7D9A', fontSize: 13 },

  // ── Join button ────────────────────────────────────────────────────────────
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 13,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  joinedBtn: {
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1, borderColor: ACCENT, shadowOpacity: 0, elevation: 0,
  },
  joinBtnText:   { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  joinedBtnText: { color: ACCENT },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#141626',
    borderBottomWidth: 1, borderBottomColor: '#1E2138',
  },
  tabItem: {
    flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative',
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#55557A' },
  tabLabelActive: { color: '#FFFFFF' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '10%', right: '10%',
    height: 2, backgroundColor: ACCENT, borderRadius: 1,
  },

  // ── Empty tabs ─────────────────────────────────────────────────────────────
  emptyTab: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 60, paddingHorizontal: 32, gap: 10,
  },
  emptyTabTitle:   { color: '#55557A', fontSize: 16, fontWeight: '700' },
  emptyTabSubtext: { color: '#44476A', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  retryBtn:  { backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: ACCENT, fontWeight: '700', fontSize: 14 },
});

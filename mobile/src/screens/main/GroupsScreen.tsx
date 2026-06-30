import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Group } from '../../types';
import GroupCard from '../../components/GroupCard';
import { listGroups, joinGroup, leaveGroup, createGroup } from '../../services/groupsService';

// ── Param list (exported for GroupsStack) ─────────────────────────────────────

export type GroupsStackParamList = {
  GroupsScreen:      undefined;
  GroupDetailScreen: { groupId: string };
};

// ── Subject filter chips — matches Figma ──────────────────────────────────────

const SUBJECTS = ['All', 'Web Dev', 'DSA', 'ML', 'UI/UX', 'Cloud', 'Algorithms', 'Entrepreneurship'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupsScreen({ navigation }: { navigation: any }) {
  const [groups, setGroups]         = useState<Group[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeSubject, setActiveSubject] = useState('All');

  // Create group sheet
  const sheetRef = useRef<BottomSheet>(null);
  const [newName,     setNewName]     = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newSubject,  setNewSubject]  = useState('');
  const [newPrivate,  setNewPrivate]  = useState(false);
  const [creating,    setCreating]    = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadGroups = useCallback(async (subject?: string, search?: string) => {
    try {
      const params: Record<string, string> = {};
      if (subject && subject !== 'All') params.subject = subject;
      if (search?.trim()) params.search = search.trim();
      const data = await listGroups(params);
      setGroups(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load groups');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadGroups().finally(() => setLoading(false));
  }, [loadGroups]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups(activeSubject, searchText);
    setRefreshing(false);
  }, [loadGroups, activeSubject, searchText]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => loadGroups(activeSubject, searchText), 400);
    return () => clearTimeout(timer);
  }, [searchText, activeSubject, loadGroups]);

  // ── Optimistic join / leave ───────────────────────────────────────────────

  const handleJoin = useCallback(async (groupId: string) => {
    const snapshot = groups.map((g) => ({ ...g }));
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const joining = !target.is_member;

    // Admin leave guard
    if (!joining) {
      Alert.alert(
        'Leave Group',
        joining ? '' : 'Are you sure you want to leave this group?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              setGroups((prev) =>
                prev.map((g) =>
                  g.id === groupId
                    ? { ...g, is_member: false, member_count: Math.max(0, g.member_count - 1) }
                    : g,
                ),
              );
              try {
                await leaveGroup(groupId);
              } catch (err: any) {
                setGroups(snapshot);
                const msg = err?.response?.data?.message ?? err?.message ?? '';
                if (msg.includes('admin')) {
                  Alert.alert('Cannot Leave', 'Transfer admin role before leaving the group.');
                } else {
                  Alert.alert('Error', 'Could not leave group. Try again.');
                }
              }
            },
          },
        ],
      );
      return;
    }

    // Optimistic join
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, is_member: true, member_count: g.member_count + 1 }
          : g,
      ),
    );
    try {
      await joinGroup(groupId);
    } catch (err: any) {
      setGroups(snapshot);
      Alert.alert('Error', 'Could not join group. Try again.');
    }
  }, [groups]);

  // ── Create group ──────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a group name.');
      return;
    }
    setCreating(true);
    try {
      const created = await createGroup({
        name:        newName.trim(),
        description: newDesc.trim() || undefined,
        subject:     newSubject.trim() || undefined,
        is_private:  newPrivate,
      });
      setGroups((prev) => [created, ...prev]);
      setNewName(''); setNewDesc(''); setNewSubject(''); setNewPrivate(false);
      sheetRef.current?.close();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create group.');
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, newSubject, newPrivate]);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: Group; index: number }) => (
      <View style={[styles.gridItem, index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight]}>
        <GroupCard
          group={item}
          onPress={(g) => navigation.navigate('GroupDetailScreen', { groupId: g.id })}
          onJoin={handleJoin}
        />
      </View>
    ),
    [navigation, handleJoin],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  );

  const snapPoints = ['70%'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <Text style={styles.headerSubtitle}>Find your community</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color="#44476A" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups…"
          placeholderTextColor="#44476A"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color="#44476A" />
          </Pressable>
        )}
      </View>

      {/* ── Subject filter chips ── */}
      <FlatList
        data={SUBJECTS}
        keyExtractor={(s) => s}
        horizontal
        style={{ flexGrow: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipList}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, activeSubject === item && styles.chipActive]}
            onPress={() => setActiveSubject(item)}
          >
            <Text style={[styles.chipText, activeSubject === item && styles.chipTextActive]}>
              {item}
            </Text>
          </Pressable>
        )}
      />

      {/* ── Groups grid ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B8BFF" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={44} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5B8BFF" colors={['#5B8BFF']} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={52} color="#2A2D45" />
              <Text style={styles.emptyText}>No groups found</Text>
              <Text style={styles.emptySubtext}>Be the first to create one!</Text>
            </View>
          }
        />
      )}

      {/* ── FAB ── */}
      <Pressable style={styles.fab} onPress={() => sheetRef.current?.snapToIndex(0)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* ── Create Group Sheet ── */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => sheetRef.current?.close()}>
              <Ionicons name="close" size={22} color="#8888AA" />
            </Pressable>
            <Text style={styles.sheetTitle}>Create Group</Text>
            <Pressable
              style={[styles.createBtn, (!newName.trim() || creating) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim() || creating}
            >
              {creating
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.createBtnText}>Create</Text>}
            </Pressable>
          </View>

          <View style={styles.sheetField}>
            <Text style={styles.sheetLabel}>Group Name *</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="e.g. DSA & Algorithms"
              placeholderTextColor="#3A3D55"
              value={newName}
              onChangeText={setNewName}
              maxLength={100}
            />
          </View>
          <View style={styles.sheetField}>
            <Text style={styles.sheetLabel}>Description</Text>
            <TextInput
              style={[styles.sheetInput, { minHeight: 72, textAlignVertical: 'top' }]}
              placeholder="What's this group about?"
              placeholderTextColor="#3A3D55"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              maxLength={300}
            />
          </View>
          <View style={styles.sheetField}>
            <Text style={styles.sheetLabel}>Subject</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="e.g. Web Dev, DSA, ML…"
              placeholderTextColor="#3A3D55"
              value={newSubject}
              onChangeText={setNewSubject}
              maxLength={50}
            />
          </View>
          <Pressable style={styles.privateRow} onPress={() => setNewPrivate((v) => !v)}>
            <View style={[styles.checkbox, newPrivate && styles.checkboxChecked]}>
              {newPrivate && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
            <View>
              <Text style={styles.privateLabel}>Private Group</Text>
              <Text style={styles.privateSubtext}>Only invited members can join</Text>
            </View>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT   = '#5B8BFF';
const BG       = '#0D0F1E';
const INPUT_BG = '#1A1D2E';
const BORDER   = '#252840';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle:    { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: '#7A7D9A', fontSize: 13, marginTop: 2 },

  // ── Search ─────────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141626',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2138',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  // ── Filter chips ───────────────────────────────────────────────────────────
  chipList: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#141626',
    borderWidth: 1,
    borderColor: '#1E2138',
  },
  chipActive:     { backgroundColor: 'rgba(91,139,255,0.15)', borderColor: ACCENT },
  chipText:       { color: '#7A7D9A', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: ACCENT },

  // ── Grid ───────────────────────────────────────────────────────────────────
  grid:          { paddingHorizontal: 12, paddingBottom: 100 },
  gridItem:      { flex: 1, padding: 4 },
  gridItemLeft:  { paddingRight: 4 },
  gridItemRight: { paddingLeft: 4 },

  // ── States ─────────────────────────────────────────────────────────────────
  errorText:   { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  emptyText:   { color: '#55557A', fontSize: 16, fontWeight: '700' },
  emptySubtext:{ color: '#44476A', fontSize: 13 },
  retryBtn:    { backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:   { color: ACCENT, fontWeight: '700', fontSize: 14 },

  // ── FAB ────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },

  // ── Create Group Sheet ─────────────────────────────────────────────────────
  sheetBg:     { backgroundColor: '#141626' },
  sheetHandle: { backgroundColor: '#3A3A5C', width: 40 },
  sheetContainer: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 8 },
  sheetTitle:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  createBtn:   { backgroundColor: ACCENT, paddingHorizontal: 18, height: 32, justifyContent: 'center', borderRadius: 16 },
  createBtnDisabled: { backgroundColor: 'rgba(91,139,255,0.3)' },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  sheetField:  { marginBottom: 14 },
  sheetLabel:  { fontSize: 13, color: '#9A9DB8', fontWeight: '600', marginBottom: 8 },
  sheetInput:  { backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#FFFFFF' },

  privateRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  checkbox:       { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: BORDER, backgroundColor: INPUT_BG, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  privateLabel:   { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  privateSubtext: { color: '#7A7D9A', fontSize: 12, marginTop: 2 },
});

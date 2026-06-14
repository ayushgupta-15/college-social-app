import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Event } from '../../types';
import EventCard from '../../components/EventCard';
import {
  listEvents,
  registerForEvent,
  cancelRegistration,
  createEvent,
  filterUpcoming,
  filterPast,
  filterMyEvents,
} from '../../services/eventsService';

// ── Param list (exported for EventsStack) ─────────────────────────────────────

export type EventsStackParamList = {
  EventsScreen:      undefined;
  EventDetailScreen: { eventId: string };
};

// ── Tab type ──────────────────────────────────────────────────────────────────

type EventTab = 'Upcoming' | 'My Events' | 'Past';
const TABS: EventTab[] = ['Upcoming', 'My Events', 'Past'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventsScreen({ navigation }: { navigation: any }) {
  const [allEvents, setAllEvents]   = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<EventTab>('Upcoming');

  // Create event sheet state
  const sheetRef    = useRef<BottomSheet>(null);
  const [newTitle,    setNewTitle]    = useState('');
  const [newDesc,     setNewDesc]     = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newOnline,   setNewOnline]   = useState(false);
  const [newMeetLink, setNewMeetLink] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newDate,     setNewDate]     = useState(new Date(Date.now() + 86_400_000)); // tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [creating,    setCreating]    = useState(false);

  // ── Derived tab lists ────────────────────────────────────────────────────

  const tabEvents = useMemo<Event[]>(() => {
    if (activeTab === 'Upcoming')   return filterUpcoming(allEvents);
    if (activeTab === 'Past')       return filterPast(allEvents);
    if (activeTab === 'My Events')  return filterMyEvents(allEvents);
    return allEvents;
  }, [allEvents, activeTab]);

  // ── Load ─────────────────────────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    try {
      const data = await listEvents();
      setAllEvents(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load events');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  // ── Optimistic register / cancel ─────────────────────────────────────────

  const handleRegister = useCallback(async (eventId: string) => {
    const snapshot = allEvents.map((e) => ({ ...e }));
    const target   = allEvents.find((e) => e.id === eventId);
    if (!target) return;

    const registering = !target.is_registered;

    // Optimistic update
    setAllEvents((prev) =>
      prev.map((e) =>
        e.id !== eventId ? e : {
          ...e,
          is_registered:      registering,
          registration_count: e.registration_count + (registering ? 1 : -1),
        },
      ),
    );

    try {
      if (registering) await registerForEvent(eventId);
      else             await cancelRegistration(eventId);
    } catch (err: any) {
      setAllEvents(snapshot);
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert('Event Full', 'This event has reached its maximum capacity.');
      } else {
        Alert.alert('Error', 'Could not update registration. Try again.');
      }
    }
  }, [allEvents]);

  // ── Create event ─────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }
    setCreating(true);
    try {
      const created = await createEvent({
        title:        newTitle.trim(),
        description:  newDesc.trim() || undefined,
        location:     !newOnline && newLocation.trim() ? newLocation.trim() : undefined,
        event_date:   newDate.toISOString(),
        is_online:    newOnline,
        meet_link:    newOnline && newMeetLink.trim() ? newMeetLink.trim() : undefined,
        max_capacity: newCapacity ? parseInt(newCapacity, 10) : undefined,
      });
      setAllEvents((prev) => [created, ...prev]);
      // Reset form
      setNewTitle(''); setNewDesc(''); setNewLocation('');
      setNewOnline(false); setNewMeetLink(''); setNewCapacity('');
      setNewDate(new Date(Date.now() + 86_400_000));
      sheetRef.current?.close();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to create event.');
    } finally {
      setCreating(false);
    }
  }, [newTitle, newDesc, newLocation, newOnline, newMeetLink, newCapacity, newDate]);

  // ── Date / Time picker handlers ──────────────────────────────────────────

  const onDateChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      setNewDate((prev) => {
        const d = new Date(selected);
        d.setHours(prev.getHours(), prev.getMinutes());
        return d;
      });
    }
  }, []);

  const onTimeChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      setNewDate((prev) => {
        const d = new Date(prev);
        d.setHours(selected.getHours(), selected.getMinutes());
        return d;
      });
    }
  }, []);

  // ── Render item ──────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard
        event={item}
        onPress={(ev) => navigation.navigate('EventDetailScreen', { eventId: ev.id })}
        onRegister={handleRegister}
      />
    ),
    [navigation, handleRegister],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  );

  const snapPoints = useMemo(() => ['85%'], []);

  // ── Format date for display ──────────────────────────────────────────────

  const displayDate = newDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const displayTime = newDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSubtitle}>Discover what's happening on campus</Text>
        </View>
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

      {/* ── Content ── */}
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
          data={tabEvents}
          keyExtractor={(e) => e.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#5B8BFF"
              colors={['#5B8BFF']}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={52} color="#2A2D45" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'My Events' ? 'No registered events' :
                 activeTab === 'Past'      ? 'No past events' :
                                            'No upcoming events'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'My Events' ? 'Register for events to see them here.' :
                 activeTab === 'Upcoming'  ? 'Be the first to create one!' : ''}
              </Text>
            </View>
          }
        />
      )}

      {/* ── FAB ── */}
      <Pressable style={styles.fab} onPress={() => sheetRef.current?.snapToIndex(0)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* ── Create Event Sheet ── */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        keyboardBehavior="extend"
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContainer} keyboardShouldPersistTaps="handled">

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => sheetRef.current?.close()}>
              <Ionicons name="close" size={22} color="#8888AA" />
            </Pressable>
            <Text style={styles.sheetTitle}>Create Event</Text>
            <Pressable
              style={[styles.createBtn, (!newTitle.trim() || creating) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!newTitle.trim() || creating}
            >
              {creating
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.createBtnText}>Create</Text>}
            </Pressable>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle}
              placeholder="e.g. React Native Workshop" placeholderTextColor="#3A3D55" maxLength={150} />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.multilineInput]} value={newDesc} onChangeText={setNewDesc}
              placeholder="What's this event about?" placeholderTextColor="#3A3D55" multiline maxLength={500} />
          </View>

          {/* Date + Time row */}
          <View style={styles.field}>
            <Text style={styles.label}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <Pressable style={[styles.input, styles.dateTimeBtn]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={15} color="#5B8BFF" />
                <Text style={styles.dateTimeText}>{displayDate}</Text>
              </Pressable>
              <Pressable style={[styles.input, styles.dateTimeBtn]} onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={15} color="#5B8BFF" />
                <Text style={styles.dateTimeText}>{displayTime}</Text>
              </Pressable>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker value={newDate} mode="date" display="default"
              minimumDate={new Date()} onChange={onDateChange} />
          )}
          {showTimePicker && (
            <DateTimePicker value={newDate} mode="time" display="default" onChange={onTimeChange} />
          )}

          {/* Online toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Ionicons name="videocam-outline" size={18} color="#4FC3F7" />
              <Text style={styles.switchTitle}>Online Event</Text>
            </View>
            <Switch
              value={newOnline}
              onValueChange={setNewOnline}
              trackColor={{ false: '#252840', true: 'rgba(91,139,255,0.4)' }}
              thumbColor={newOnline ? '#5B8BFF' : '#5A5D7A'}
            />
          </View>

          {/* Location or Meet Link */}
          {newOnline ? (
            <View style={styles.field}>
              <Text style={styles.label}>Meet Link</Text>
              <TextInput style={styles.input} value={newMeetLink} onChangeText={setNewMeetLink}
                placeholder="https://meet.google.com/..." placeholderTextColor="#3A3D55" keyboardType="url" />
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} value={newLocation} onChangeText={setNewLocation}
                placeholder="e.g. Seminar Hall, Block A" placeholderTextColor="#3A3D55" />
            </View>
          )}

          {/* Capacity */}
          <View style={styles.field}>
            <Text style={styles.label}>Max Capacity (optional)</Text>
            <TextInput style={styles.input} value={newCapacity} onChangeText={setNewCapacity}
              placeholder="Leave empty for unlimited" placeholderTextColor="#3A3D55" keyboardType="numeric" />
          </View>

        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT    = '#5B8BFF';
const BG        = '#0D0F1E';
const INPUT_BG  = '#1A1D2E';
const BORDER    = '#252840';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle:    { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: '#7A7D9A', fontSize: 13, marginTop: 2 },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#141626',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2138',
    marginBottom: 8,
  },
  tabItem:       { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabLabel:      { fontSize: 13, fontWeight: '600', color: '#55557A' },
  tabLabelActive: { color: '#FFFFFF' },
  tabUnderline:  {
    position: 'absolute', bottom: 0, left: '10%', right: '10%',
    height: 2, backgroundColor: ACCENT, borderRadius: 1,
  },

  // ── List ───────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },

  // ── Empty / Error ──────────────────────────────────────────────────────────
  emptyTitle:   { color: '#55557A', fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: '#44476A', fontSize: 13, textAlign: 'center' },
  errorText:    { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  retryBtn:     { backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:    { color: ACCENT, fontWeight: '700', fontSize: 14 },

  // ── FAB ────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },

  // ── Create Event Sheet ─────────────────────────────────────────────────────
  sheetBg:        { backgroundColor: '#141626' },
  sheetHandle:    { backgroundColor: '#3A3A5C', width: 40 },
  sheetContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginBottom: 4 },
  sheetTitle:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  createBtn:      { backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20 },
  createBtnDisabled: { backgroundColor: 'rgba(91,139,255,0.3)' },
  createBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  field:          { marginBottom: 16 },
  label:          { fontSize: 13, color: '#9A9DB8', fontWeight: '600', marginBottom: 8 },
  input:          { backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#FFFFFF' },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },

  dateTimeRow:    { flexDirection: 'row', gap: 10 },
  dateTimeBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
  dateTimeText:   { color: '#FFFFFF', fontSize: 14 },

  switchRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1D2E', borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 16 },
  switchLabel:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchTitle:    { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

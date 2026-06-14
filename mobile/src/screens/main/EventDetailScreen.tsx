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
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Event } from '../../types';
import { getEvent, registerForEvent, cancelRegistration } from '../../services/eventsService';
import { EventsStackParamList } from './EventsScreen';

type Props = NativeStackScreenProps<EventsStackParamList, 'EventDetailScreen'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatEventTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const GRADIENTS: [string, string][] = [
  ['#1a1f5e', '#3d5afe'], ['#1b0036', '#7b1fa2'],
  ['#001f3f', '#0288d1'], ['#1b2631', '#117a65'],
  ['#3b0000', '#c62828'],
];
function gradientForId(id: string): [string, string] {
  return GRADIENTS[id.charCodeAt(0) % GRADIENTS.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;

  const [event, setEvent]       = useState<Event | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false); // local state only

  useEffect(() => {
    setLoading(true);
    getEvent(eventId)
      .then(setEvent)
      .catch((e) => setError(e?.message ?? 'Failed to load event'))
      .finally(() => setLoading(false));
  }, [eventId]);

  // ── Optimistic register / cancel ──────────────────────────────────────────

  const handleRegister = useCallback(async () => {
    if (!event) return;
    const registering = !event.is_registered;

    const prev = { ...event };
    setEvent((e) => e ? {
      ...e,
      is_registered:      registering,
      registration_count: e.registration_count + (registering ? 1 : -1),
    } : e);

    try {
      if (registering) await registerForEvent(eventId);
      else             await cancelRegistration(eventId);
    } catch (err: any) {
      setEvent(prev);
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert('Event Full', 'This event has reached maximum capacity.');
      } else {
        Alert.alert('Error', 'Could not update registration. Try again.');
      }
    }
  }, [event, eventId]);

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
        <ActivityIndicator size="large" color="#5B8BFF" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
        <Ionicons name="warning-outline" size={44} color="#FF6B6B" />
        <Text style={styles.errorText}>{error ?? 'Event not found'}</Text>
        <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isFull = event.max_capacity != null && event.registration_count >= event.max_capacity;
  const gradient = gradientForId(event.id);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Banner ── */}
        <LinearGradient colors={gradient} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* Header controls overlaid on banner */}
          <View style={styles.bannerControls}>
            <Pressable style={styles.bannerBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable style={styles.bannerBtn} onPress={() => setBookmarked((v) => !v)}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={bookmarked ? '#FFD700' : '#FFFFFF'}
              />
            </Pressable>
          </View>

          {/* Online badge */}
          {event.is_online && (
            <View style={styles.onlineBadge}>
              <Ionicons name="videocam" size={13} color="#FFFFFF" />
              <Text style={styles.onlineBadgeText}>Online Event</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Info rows */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar" size={18} color="#5B8BFF" />
              </View>
              <View>
                <Text style={styles.infoLabel}>{formatEventDate(event.event_date)}</Text>
                <Text style={styles.infoSub}>{formatEventTime(event.event_date)}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name={event.is_online ? 'videocam' : 'location'}
                  size={18}
                  color="#5B8BFF"
                />
              </View>
              <View>
                <Text style={styles.infoLabel}>
                  {event.is_online ? 'Online' : (event.location ?? 'TBA')}
                </Text>
                {event.is_online && event.meet_link && (
                  <Text style={styles.meetLink} numberOfLines={1}>{event.meet_link}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="people" size={18} color="#5B8BFF" />
              </View>
              <View>
                <Text style={styles.infoLabel}>
                  {event.registration_count} Registered
                  {event.max_capacity ? ` / ${event.max_capacity} max` : ''}
                </Text>
                {isFull && <Text style={styles.fullTag}>At Capacity</Text>}
              </View>
            </View>
          </View>

          {/* Organiser */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organiser</Text>
            <View style={styles.organiserRow}>
              <View style={styles.organiserAvatar}>
                <Text style={styles.organiserAvatarText}>{getInitials(event.organizer_name)}</Text>
              </View>
              <Text style={styles.organiserName}>{event.organizer_name}</Text>
            </View>
          </View>

          {/* About */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Pinned Register button ── */}
      <View style={styles.registerBar}>
        <View style={styles.registerBarLeft}>
          <Text style={styles.registerBarCount}>{event.registration_count}</Text>
          <Text style={styles.registerBarLabel}> going</Text>
        </View>
        <Pressable
          style={[
            styles.registerBtn,
            event.is_registered && styles.registeredBtn,
            isFull && !event.is_registered && styles.fullBtn,
          ]}
          onPress={handleRegister}
          disabled={isFull && !event.is_registered}
        >
          <Ionicons
            name={event.is_registered ? 'checkmark-circle' : isFull ? 'close-circle' : 'add-circle-outline'}
            size={20}
            color={event.is_registered ? '#5B8BFF' : isFull ? '#55557A' : '#FFFFFF'}
          />
          <Text style={[
            styles.registerBtnText,
            event.is_registered && styles.registeredBtnText,
            isFull && !event.is_registered && styles.fullBtnText,
          ]}>
            {event.is_registered ? 'Registered' : isFull ? 'Event Full' : 'Register Now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT = '#5B8BFF';
const BG     = '#0D0F1E';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center:    { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 16 },

  // ── Banner ─────────────────────────────────────────────────────────────────
  banner: { height: 240, paddingTop: 52, paddingHorizontal: 16, justifyContent: 'space-between', paddingBottom: 20 },
  bannerControls: { flexDirection: 'row', justifyContent: 'space-between' },
  bannerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(91,139,255,0.75)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  onlineBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // ── Content ────────────────────────────────────────────────────────────────
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 20 },
  title:   { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 30 },

  // ── Info card ──────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: '#141626', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E2138', padding: 16, gap: 12,
  },
  infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  infoIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(91,139,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  infoLabel:  { color: '#FFFFFF', fontSize: 14, fontWeight: '600', flex: 1 },
  infoSub:    { color: '#7A7D9A', fontSize: 12, marginTop: 2 },
  meetLink:   { color: ACCENT, fontSize: 12, marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: '#1E2138', marginLeft: 50 },
  fullTag:    { color: '#FF6B6B', fontSize: 11, fontWeight: '700', marginTop: 2 },

  // ── Sections ───────────────────────────────────────────────────────────────
  section:      { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#7A7D9A', textTransform: 'uppercase', letterSpacing: 0.8 },
  descText:     { color: '#BBBBD0', fontSize: 14, lineHeight: 22 },

  organiserRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  organiserAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1.5, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  organiserAvatarText: { color: ACCENT, fontSize: 15, fontWeight: '700' },
  organiserName:      { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // ── Register bar ───────────────────────────────────────────────────────────
  registerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#13131F',
    borderTopWidth: 1, borderTopColor: '#1E2138',
    paddingHorizontal: 20, paddingVertical: 14, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  registerBarLeft:  { flexDirection: 'row', alignItems: 'baseline' },
  registerBarCount: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  registerBarLabel: { color: '#7A7D9A', fontSize: 14 },
  registerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginLeft: 20, backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 14,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  registeredBtn:     { backgroundColor: 'rgba(91,139,255,0.12)', borderWidth: 1, borderColor: ACCENT, shadowOpacity: 0, elevation: 0 },
  fullBtn:           { backgroundColor: '#1E2138', shadowOpacity: 0, elevation: 0 },
  registerBtnText:   { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  registeredBtnText: { color: ACCENT },
  fullBtnText:       { color: '#55557A' },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center' },
  retryBtn:  { backgroundColor: 'rgba(91,139,255,0.15)', borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: ACCENT, fontWeight: '700', fontSize: 14 },
});

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Event } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

function timeFromNow(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  if (days < 0)   return 'Past';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7)  return `In ${days} days`;
  return `In ${Math.ceil(days / 7)} weeks`;
}

// Gradient fallbacks for events without a banner
const GRADIENTS: [string, string][] = [
  ['#1a1f5e', '#3d5afe'],
  ['#1b0036', '#7b1fa2'],
  ['#001f3f', '#0288d1'],
  ['#1b2631', '#117a65'],
  ['#3b0000', '#c62828'],
];

function gradientForId(id: string): [string, string] {
  const idx = id.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  event: Event;
  onPress: (event: Event) => void;
  onRegister: (eventId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventCard({ event, onPress, onRegister }: Props) {
  const { date, time } = formatEventDate(event.event_date);
  const countdown = timeFromNow(event.event_date);
  const gradient  = gradientForId(event.id);

  const isFull = event.max_capacity != null && event.registration_count >= event.max_capacity;
  const canRegister = !event.is_registered && !isFull;

  const handleRegister = useCallback((e: any) => {
    e.stopPropagation?.();
    onRegister(event.id);
  }, [event.id, onRegister]);

  return (
    <Pressable style={styles.card} onPress={() => onPress(event)}>

      {/* ── Banner ── */}
      <LinearGradient colors={gradient} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Countdown pill */}
        <View style={styles.countdownPill}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>

        {/* Online badge */}
        {event.is_online && (
          <View style={styles.onlineBadge}>
            <Ionicons name="videocam" size={11} color="#FFFFFF" />
            <Text style={styles.onlineBadgeText}>Online</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        {/* Date + Time */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={13} color="#5B8BFF" />
          <Text style={styles.infoText}>{date} · {time}</Text>
        </View>

        {/* Location */}
        <View style={styles.infoRow}>
          <Ionicons
            name={event.is_online ? 'link-outline' : 'location-outline'}
            size={13}
            color="#5B8BFF"
          />
          <Text style={styles.infoText} numberOfLines={1}>
            {event.is_online ? 'Virtual Event' : (event.location ?? 'TBA')}
          </Text>
        </View>

        {/* Attendees + Register */}
        <View style={styles.footer}>
          <View style={styles.attendeeRow}>
            <Ionicons name="people-outline" size={14} color="#7A7D9A" />
            <Text style={styles.attendeeText}>
              {event.registration_count}
              {event.max_capacity ? `/${event.max_capacity}` : ''} going
            </Text>
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
            <Text style={[
              styles.registerBtnText,
              event.is_registered && styles.registeredBtnText,
              isFull && !event.is_registered && styles.fullBtnText,
            ]}>
              {event.is_registered ? 'Registered ✓' : isFull ? 'Full' : 'Register'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT   = '#5B8BFF';
const CARD_BG  = '#141626';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2138',
    overflow: 'hidden',
    marginBottom: 12,
  },

  // ── Banner ─────────────────────────────────────────────────────────────────
  banner: {
    height: 110,
    position: 'relative',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  countdownPill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  countdownText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91,139,255,0.7)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  onlineBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // ── Body ───────────────────────────────────────────────────────────────────
  body:     { padding: 14, gap: 6 },
  title:    { color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 21, marginBottom: 2 },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: '#BBBBD0', fontSize: 12, flex: 1 },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attendeeText: { color: '#7A7D9A', fontSize: 12 },

  registerBtn: {
    backgroundColor: ACCENT,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  registeredBtn: {
    backgroundColor: 'rgba(91,139,255,0.12)',
    borderWidth: 1,
    borderColor: ACCENT,
    shadowOpacity: 0,
    elevation: 0,
  },
  fullBtn:          { backgroundColor: '#1E2138', shadowOpacity: 0, elevation: 0 },
  registerBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  registeredBtnText: { color: ACCENT },
  fullBtnText:      { color: '#55557A' },
});

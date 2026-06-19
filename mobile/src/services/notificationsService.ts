import api from './api';
import { Notification } from '../types';

// ── API response envelope ─────────────────────────────────────────────────────
interface NotificationsResponse {
  notifications: Notification[];
}

// ── Type → human-readable label ───────────────────────────────────────────────
const TYPE_LABELS: Record<Notification['type'], string> = {
  follow:     'started following you',
  like:       'liked your post',
  comment:    'commented on your post',
  message:    'sent you a message',
  group_join: 'joined your group',
  event:      'shared a new event',
};

export function notificationLabel(type: Notification['type']): string {
  return TYPE_LABELS[type] ?? 'interacted with you';
}

// ── REST — get notifications ──────────────────────────────────────────────────
// GET /notifications          → all notifications
// GET /notifications?unread=true → unread only
export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data } = await api.get<NotificationsResponse>('/notifications', {
    params: unreadOnly ? { unread: true } : undefined,
  });
  return data.notifications ?? [];
}

// ── REST — unread count (used for badge) ──────────────────────────────────────
// Fetches unread list and returns its length. Non-throwing.
export async function getUnreadCount(): Promise<number> {
  try {
    const list = await getNotifications(true);
    return list.length;
  } catch {
    return 0;
  }
}

// ── REST — mark all read ─────────────────────────────────────────────────────
// POST /notifications/read-all
export async function markAllRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

// ── FCM token registration ────────────────────────────────────────────────────
// PATCH /users/me { fcm_token: token }
// Called from AuthContext after login / boot so the backend can deliver pushes.
export async function registerFcmToken(fcmToken: string): Promise<void> {
  await api.patch('/users/me', { fcm_token: fcmToken });
}

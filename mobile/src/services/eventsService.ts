import api from './api';
import { Event } from '../types';

// ── List ──────────────────────────────────────────────────────────────────────
// Backend supports: is_online (boolean), from_date (RFC3339)
// Upcoming/Past/My Events are handled client-side by comparing event_date to now().

export interface ListEventsParams {
  is_online?: boolean;
  from_date?: string; // RFC3339
}

export async function listEvents(params?: ListEventsParams): Promise<Event[]> {
  const { data } = await api.get<Event[] | null>('/events', { params });
  return data ?? [];
}

// ── Single event ──────────────────────────────────────────────────────────────

export async function getEvent(eventId: string): Promise<Event> {
  const { data } = await api.get<Event>(`/events/${eventId}`);
  return data;
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string;
  description?: string;
  location?: string;
  event_date: string; // RFC3339
  banner_url?: string;
  max_capacity?: number;
  is_online?: boolean;
  meet_link?: string;
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const { data } = await api.post<Event>('/events', payload);
  return data;
}

// ── Register / Cancel ─────────────────────────────────────────────────────────
// Register → POST /events/:id/register  → 201 Created | 409 Conflict (capacity full)
// Cancel   → DELETE /events/:id/register → 204 No Content

export async function registerForEvent(eventId: string): Promise<void> {
  await api.post(`/events/${eventId}/register`);
}

export async function cancelRegistration(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}/register`);
}

// ── Client-side tab filters ───────────────────────────────────────────────────
// Used in EventsScreen to split the single cached list into 3 tabs.

const now = () => new Date();

export function filterUpcoming(events: Event[]): Event[] {
  return events.filter((e) => new Date(e.event_date) >= now());
}

export function filterPast(events: Event[]): Event[] {
  return events.filter((e) => new Date(e.event_date) < now());
}

export function filterMyEvents(events: Event[]): Event[] {
  return events.filter((e) => e.is_registered);
}

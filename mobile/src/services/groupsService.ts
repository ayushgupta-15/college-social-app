import api from './api';
import { Group } from '../types';

// ── List / Search ──────────────────────────────────────────────────────────────

export interface ListGroupsParams {
  subject?: string;
  search?: string;
}

export async function listGroups(params?: ListGroupsParams): Promise<Group[]> {
  const { data } = await api.get<Group[] | null>('/groups', { params });
  return data ?? [];
}

// ── Single group ──────────────────────────────────────────────────────────────

export async function getGroup(groupId: string): Promise<Group> {
  const { data } = await api.get<Group>(`/groups/${groupId}`);
  return data;
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateGroupPayload {
  name: string;
  description?: string;
  subject?: string;
  is_private?: boolean;
}

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  const { data } = await api.post<Group>('/groups', payload);
  return data;
}

// ── Join / Leave ──────────────────────────────────────────────────────────────
// Both return 204 No Content.

export async function joinGroup(groupId: string): Promise<void> {
  await api.post(`/groups/${groupId}/join`);
}

export async function leaveGroup(groupId: string): Promise<void> {
  await api.post(`/groups/${groupId}/leave`);
}

// NOTE: GET /groups/:id/members is not yet implemented on the backend.
// GroupDetailScreen shows an "Available soon" empty state for the Members tab.

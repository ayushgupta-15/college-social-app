import api from './api';
import { User } from '../types';

// ── Own profile ────────────────────────────────────────────────────────────────

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/users/me');
  return data;
}

export interface UpdateMePayload {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  college?: string;
  major?: string;
  grad_year?: number;
  is_open_to_referral?: boolean;
}

export async function updateMe(payload: UpdateMePayload): Promise<User> {
  const { data } = await api.patch<User>('/users/me', payload);
  return data;
}

// ── Public profiles ────────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<User> {
  const { data } = await api.get<User>(`/users/${userId}`);
  return data;
}

// ── Follow / Unfollow ─────────────────────────────────────────────────────────
// Both return 204 No Content — no body to parse.

export async function followUser(userId: string): Promise<void> {
  await api.post(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}/follow`);
}

// ── Followers / Following ──────────────────────────────────────────────────────

export async function getFollowers(userId: string): Promise<User[]> {
  const { data } = await api.get<User[] | null>(`/users/${userId}/followers`);
  return data ?? [];
}

export async function getFollowing(userId: string): Promise<User[]> {
  const { data } = await api.get<User[] | null>(`/users/${userId}/following`);
  return data ?? [];
}

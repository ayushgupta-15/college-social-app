import api from './api';
import { Post, Comment, FeedResponse } from '../types';

// ── Feed ──────────────────────────────────────────────────────────────────────

/**
 * Fetch a page of posts.
 * @param before  RFC3339 cursor from the previous page's next_cursor field.
 *                Omit for the first page.
 */
export async function getFeed(before?: string): Promise<FeedResponse> {
  const params: Record<string, string> = {};
  if (before) params.before = before;

  const { data } = await api.get<FeedResponse | null>('/posts', { params });
  return data ?? { posts: [], next_cursor: undefined };
}

// ── Create ────────────────────────────────────────────────────────────────────

export type PostType = 'general' | 'opportunity' | 'announcement';

export interface CreatePostPayload {
  content: string;
  post_type: PostType;
  media_url?: string;
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const { data } = await api.post<Post>('/posts', payload);
  return data;
}

// ── Like ──────────────────────────────────────────────────────────────────────

export interface LikeResponse {
  liked: boolean;
  like_count: number;
}

export async function toggleLike(postId: string): Promise<LikeResponse> {
  const { data } = await api.post<LikeResponse>(`/posts/${postId}/like`);
  return data;
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<Comment[]> {
  const { data } = await api.get<Comment[] | null>(`/posts/${postId}/comments`);
  return data ?? [];
}

export async function addComment(postId: string, content: string): Promise<Comment> {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, { content });
  return data;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

// src/types/index.ts
// Mirrors the Go backend structs — keep in sync with API responses

export interface User {
  id: string;
  firebase_uid?: string;
  username: string;
  full_name: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  college?: string;
  major?: string;
  grad_year?: number;
  is_open_to_referral: boolean;
  post_count: number;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export type PostType = 'general' | 'opportunity' | 'announcement';

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  media_url?: string;
  post_type: PostType;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  admin_id: string;
  admin_name: string;
  avatar_url?: string;
  is_private: boolean;
  member_count: number;
  is_member: boolean;
  created_at: string;
}

export type MemberRole = 'admin' | 'moderator' | 'member';

export interface GroupMember {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  role: MemberRole;
  joined_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  organizer_id: string;
  organizer_name: string;
  organizer_avatar?: string;
  event_date: string;
  location?: string;
  banner_url?: string;
  max_capacity?: number;
  is_online: boolean;
  meet_link?: string;
  registration_count: number;
  is_registered: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  actor_name?: string;
  type: 'like' | 'comment' | 'follow' | 'group_join' | 'event' | 'message';
  entity_id?: string;
  entity_type?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

// API pagination envelopes
export interface FeedResponse {
  posts: Post[];
  next_cursor?: string;
}

export interface HistoryResponse {
  messages: Message[];
  next_cursor?: string;
}

// Auth
export interface AuthTokens {
  token: string;     // Firebase ID token
  user: User;
}

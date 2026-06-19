import api from './api';
import * as SecureStore from 'expo-secure-store';
import { Message, HistoryResponse } from '../types';

// ── WebSocket URL ─────────────────────────────────────────────────────────────
// Note: /ws lives on the root — NOT under /api/v1
export const WS_URL = 'wss://college-social-app-d7mm.onrender.com/ws';

const RECENT_CHATS_KEY = 'recent_chats';

// ── chatId helper ─────────────────────────────────────────────────────────────
// Mirrors backend buildChatID: sort two UUIDs, join with '_'
// Format: "<uuid-aaa>_<uuid-zzz>" (73 chars: 36 + 1 + 36)
export function buildChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// ── Recent Chats (local persistence via SecureStore) ──────────────────────────
// Stored under RECENT_CHATS_KEY as a JSON array, capped at 30 entries.
// Updated by ChatScreen on mount so MessagesScreen can show a conversation list.

export interface RecentChat {
  userId:          string;
  userName:        string;
  userAvatar?:     string;
  lastMessage?:    string;
  lastMessageTime?: string; // ISO string
}

export async function getRecentChats(): Promise<RecentChat[]> {
  try {
    const raw = await SecureStore.getItemAsync(RECENT_CHATS_KEY);
    return raw ? (JSON.parse(raw) as RecentChat[]) : [];
  } catch {
    return [];
  }
}

// Upserts a chat entry — moves it to the top if already present.
export async function upsertRecentChat(chat: RecentChat): Promise<void> {
  try {
    const list    = await getRecentChats();
    const filtered = list.filter((c) => c.userId !== chat.userId);
    const updated  = [chat, ...filtered].slice(0, 30);
    await SecureStore.setItemAsync(RECENT_CHATS_KEY, JSON.stringify(updated));
  } catch {
    // Non-critical — fail silently
  }
}

// ── REST: paginated message history ──────────────────────────────────────────
// GET /messages/:chatId  — returns newest-first (DESC) messages
export async function getHistory(
  chatId: string,
  params?: { before?: string; limit?: number },
): Promise<Message[]> {
  const { data } = await api.get<HistoryResponse>(`/messages/${chatId}`, { params });
  return data.messages ?? [];
}

// ── WebSocket types ───────────────────────────────────────────────────────────

// What the server pushes to connected clients
export interface WsOutbound {
  id:         string;
  from:       string;   // sender's internal UUID
  to:         string;   // recipient's internal UUID
  content:    string;
  media_url?: string | null;
  created_at: string;   // ISO 8601
}

// ── ChatSocket class ──────────────────────────────────────────────────────────
// Usage:
//   const socket = new ChatSocket(firebaseIdToken);
//   socket.onOpen(() => ...).onMessage(msg => ...).onClose(() => ...);
//   socket.connect();
//   socket.send(recipientId, text);
//   socket.disconnect();

export class ChatSocket {
  private ws: WebSocket | null = null;
  private _onMessage: ((msg: WsOutbound) => void) | null = null;
  private _onOpen:    (() => void) | null = null;
  private _onClose:   (() => void) | null = null;
  private _onError:   ((e: Event) => void) | null = null;

  constructor(private readonly token: string) {}

  connect(): void {
    const url = `${WS_URL}?token=${encodeURIComponent(this.token)}`;
    const ws  = new WebSocket(url);
    this.ws   = ws;

    ws.onopen    = () => this._onOpen?.();
    ws.onclose   = () => this._onClose?.();
    ws.onerror   = (e) => this._onError?.(e);
    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data as string) as WsOutbound;
        this._onMessage?.(msg);
      } catch {
        // ignore malformed frames
      }
    };
  }

  // Send an InboundMessage to the backend
  send(to: string, content: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ to, content }));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Fluent callback setters
  onMessage(cb: (msg: WsOutbound) => void): this { this._onMessage = cb; return this; }
  onOpen(cb: () => void): this                   { this._onOpen    = cb; return this; }
  onClose(cb: () => void): this                  { this._onClose   = cb; return this; }
  onError(cb: (e: Event) => void): this          { this._onError   = cb; return this; }
}

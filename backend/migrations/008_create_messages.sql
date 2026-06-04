-- Migration: 008_create_messages
-- Description: Direct messages between two users
-- Depends on: 001_create_users

CREATE TABLE messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    receiver_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    media_url   TEXT,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_no_self_message CHECK (sender_id <> receiver_id)
);

-- Fetch conversation thread between two users (ordered)
CREATE INDEX idx_messages_sender_receiver ON messages (sender_id, receiver_id, created_at DESC);

-- Fetch inbox: all messages received by a user
CREATE INDEX idx_messages_receiver_id ON messages (receiver_id, created_at DESC);

-- Quickly count unread messages for a user
CREATE INDEX idx_messages_unread ON messages (receiver_id) WHERE is_read = FALSE;

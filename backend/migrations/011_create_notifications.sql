-- Migration: 011_create_notifications
-- Description: System notifications (likes, comments, follows, events, messages)
-- Depends on: 001_create_users

CREATE TYPE notification_type_enum AS ENUM (
    'like',
    'comment',
    'follow',
    'group_join',
    'event',
    'message'
);

CREATE TYPE entity_type_enum AS ENUM (
    'post',
    'comment',
    'group',
    'event',
    'message'
);

CREATE TABLE notifications (
    id          UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID                    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    actor_id    UUID                    REFERENCES users (id) ON DELETE SET NULL,  -- who triggered it
    type        notification_type_enum  NOT NULL,
    entity_id   UUID,                   -- polymorphic FK: post_id | group_id | event_id
    entity_type entity_type_enum,
    message     TEXT,
    is_read     BOOLEAN                 NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- Fetch all notifications for a user, unread first
CREATE INDEX idx_notifications_user_id ON notifications (user_id, created_at DESC);

-- Fast unread count badge
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;

-- Migration: 002_create_follows
-- Description: User follow relationships (follower → following)
-- Depends on: 001_create_users

CREATE TABLE follows (
    follower_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    following_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (follower_id, following_id),
    -- Prevent self-follows
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

-- Index to quickly get "who does this user follow"
CREATE INDEX idx_follows_follower ON follows (follower_id);

-- Index to quickly get "who follows this user" (followers count / feed)
CREATE INDEX idx_follows_following ON follows (following_id);

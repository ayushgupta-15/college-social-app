-- Migration: 003_create_posts
-- Description: Posts (social feed — general, opportunities, announcements)
-- Depends on: 001_create_users

CREATE TYPE post_type_enum AS ENUM ('general', 'opportunity', 'announcement');

CREATE TABLE posts (
    id         UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id  UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content    TEXT           NOT NULL,
    media_url  TEXT,
    post_type  post_type_enum NOT NULL DEFAULT 'general',
    like_count INT            NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Feed query: posts by a specific user ordered by recency
CREATE INDEX idx_posts_author_id ON posts (author_id, created_at DESC);

-- Feed query: all recent posts (home feed)
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);

CREATE TRIGGER set_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

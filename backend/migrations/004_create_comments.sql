-- Migration: 004_create_comments
-- Description: Comments on posts
-- Depends on: 001_create_users, 003_create_posts

CREATE TABLE comments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    author_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fetch all comments for a post ordered by time
CREATE INDEX idx_comments_post_id ON comments (post_id, created_at ASC);

-- Fetch all comments by a user (profile page)
CREATE INDEX idx_comments_author_id ON comments (author_id);

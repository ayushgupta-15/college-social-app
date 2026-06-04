-- Migration: 005_create_post_likes
-- Description: Junction table tracking which user liked which post
-- Depends on: 001_create_users, 003_create_posts

CREATE TABLE post_likes (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id    UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, post_id)
);

-- Lookup: did this user like this post? (toggle check)
CREATE INDEX idx_post_likes_post_id ON post_likes (post_id);

-- Trigger: keep posts.like_count in sync automatically

CREATE OR REPLACE FUNCTION sync_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_like_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION sync_post_like_count();

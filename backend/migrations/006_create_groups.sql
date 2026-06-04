-- Migration: 006_create_groups
-- Description: Study groups (admin-owned, optional privacy)
-- Depends on: 001_create_users

CREATE TABLE groups (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    subject     VARCHAR(100),
    admin_id    UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    avatar_url  TEXT,
    is_private  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search groups by name (LIKE queries)
CREATE INDEX idx_groups_name ON groups (name);

-- Fetch all groups owned by a user
CREATE INDEX idx_groups_admin_id ON groups (admin_id);

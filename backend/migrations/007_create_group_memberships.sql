-- Migration: 007_create_group_memberships
-- Description: User ↔ Group many-to-many with role
-- Depends on: 001_create_users, 006_create_groups

CREATE TYPE group_role_enum AS ENUM ('admin', 'moderator', 'member');

CREATE TABLE group_memberships (
    user_id   UUID           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    group_id  UUID           NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
    role      group_role_enum NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, group_id)
);

-- Fetch all members of a group
CREATE INDEX idx_group_memberships_group_id ON group_memberships (group_id);

-- Fetch all groups a user belongs to
CREATE INDEX idx_group_memberships_user_id ON group_memberships (user_id);

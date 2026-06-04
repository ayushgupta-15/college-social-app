-- Migration: 009_create_events
-- Description: Campus events (in-person or online)
-- Depends on: 001_create_users

CREATE TABLE events (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title         VARCHAR(150) NOT NULL,
    description   TEXT,
    location      VARCHAR(200),
    event_date    TIMESTAMPTZ  NOT NULL,
    banner_url    TEXT,
    max_capacity  INT,
    is_online     BOOLEAN      NOT NULL DEFAULT FALSE,
    meet_link     TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Browse upcoming events
CREATE INDEX idx_events_event_date ON events (event_date ASC);

-- Events organized by a user
CREATE INDEX idx_events_organizer_id ON events (organizer_id);

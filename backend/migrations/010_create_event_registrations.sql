-- Migration: 010_create_event_registrations
-- Description: User ↔ Event registration junction
-- Depends on: 001_create_users, 009_create_events

CREATE TYPE registration_status_enum AS ENUM ('confirmed', 'waitlisted', 'cancelled');

CREATE TABLE event_registrations (
    user_id       UUID                    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id      UUID                    NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    status        registration_status_enum NOT NULL DEFAULT 'confirmed',
    registered_at TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, event_id)
);

-- Fetch all registrations for an event (attendee list)
CREATE INDEX idx_event_registrations_event_id ON event_registrations (event_id, status);

-- Fetch all events a user has registered for
CREATE INDEX idx_event_registrations_user_id ON event_registrations (user_id);

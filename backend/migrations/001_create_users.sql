-- Migration: 001_create_users
-- Description: Creates the users table (foundation for all other tables)
-- Run on: Neon PostgreSQL

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid        VARCHAR(128) UNIQUE NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    username            VARCHAR(50)  UNIQUE NOT NULL,
    full_name           VARCHAR(100) NOT NULL,
    bio                 TEXT,
    avatar_url          TEXT,
    college             VARCHAR(150),
    major               VARCHAR(100),
    grad_year           SMALLINT,
    is_open_to_referral BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for fast Firebase UID lookups (used on every auth call)
CREATE INDEX idx_users_firebase_uid ON users (firebase_uid);

-- Index for username search / profile lookups
CREATE INDEX idx_users_username ON users (username);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

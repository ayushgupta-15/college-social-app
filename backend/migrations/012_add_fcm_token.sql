-- Migration: 012_add_fcm_token
-- Description: Add FCM device token column to users for push notification delivery
-- Run on: Neon SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index speeds up "is this token still valid?" queries (future use)
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users (fcm_token) WHERE fcm_token IS NOT NULL;

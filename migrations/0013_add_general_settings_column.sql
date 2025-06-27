
-- Add generalSettings column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS "generalSettings" text;


-- Add options column to custom_fields table
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS options TEXT;

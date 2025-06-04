
-- Fix casting issues for date columns in sms_messages table

-- First, backup the existing data with a new temporary column
ALTER TABLE "sms_messages" ADD COLUMN IF NOT EXISTS "booking_date_from_backup" text;
ALTER TABLE "sms_messages" ADD COLUMN IF NOT EXISTS "booking_date_to_backup" text;

-- Copy existing data to backup columns
UPDATE "sms_messages" SET 
  "booking_date_from_backup" = "booking_date_from",
  "booking_date_to_backup" = "booking_date_to";

-- Drop the problematic columns
ALTER TABLE "sms_messages" DROP COLUMN IF EXISTS "booking_date_from";
ALTER TABLE "sms_messages" DROP COLUMN IF EXISTS "booking_date_to";

-- Add them back as date type
ALTER TABLE "sms_messages" ADD COLUMN "booking_date_from" date;
ALTER TABLE "sms_messages" ADD COLUMN "booking_date_to" date;

-- Convert and restore data where possible (only valid dates)
UPDATE "sms_messages" SET 
  "booking_date_from" = CASE 
    WHEN "booking_date_from_backup" ~ '^\d{4}-\d{2}-\d{2}$' 
    THEN "booking_date_from_backup"::date 
    ELSE NULL 
  END,
  "booking_date_to" = CASE 
    WHEN "booking_date_to_backup" ~ '^\d{4}-\d{2}-\d{2}$' 
    THEN "booking_date_to_backup"::date 
    ELSE NULL 
  END;

-- Clean up backup columns
ALTER TABLE "sms_messages" DROP COLUMN "booking_date_from_backup";
ALTER TABLE "sms_messages" DROP COLUMN "booking_date_to_backup";

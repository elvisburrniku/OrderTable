
-- Fix casting issues for date columns in sms_messages table
ALTER TABLE "sms_messages" 
ALTER COLUMN "booking_date_from" TYPE date USING "booking_date_from"::date;

ALTER TABLE "sms_messages" 
ALTER COLUMN "booking_date_to" TYPE date USING "booking_date_to"::date;


-- Add missing room_id column to tables
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "room_id" integer;

-- Add missing timestamp columns to tables
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- Fix table_number column type
ALTER TABLE "tables" ALTER COLUMN "table_number" TYPE varchar(50);

-- Add foreign key constraint for room_id
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tables_room_id_rooms_id_fk'
    ) THEN
        ALTER TABLE "tables" ADD CONSTRAINT "tables_room_id_rooms_id_fk" 
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;

-- Fix SMS messages date columns by dropping and recreating them
ALTER TABLE "sms_messages" DROP COLUMN IF EXISTS "booking_date_from";
ALTER TABLE "sms_messages" DROP COLUMN IF EXISTS "booking_date_to";
ALTER TABLE "sms_messages" ADD COLUMN "booking_date_from" date;
ALTER TABLE "sms_messages" ADD COLUMN "booking_date_to" date;

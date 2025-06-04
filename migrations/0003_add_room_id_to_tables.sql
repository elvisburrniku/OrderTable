
ALTER TABLE "tables" ADD COLUMN "room_id" integer;

DO $$ BEGIN
 ALTER TABLE "tables" ADD CONSTRAINT "tables_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add created_at and updated_at columns to tables if they don't exist
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- Update table_number column to be varchar(50) instead of text for consistency
ALTER TABLE "tables" ALTER COLUMN "table_number" TYPE varchar(50);


import { db } from './server/db-storage.js';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL);

async function fixSchema() {
  try {
    console.log('Starting schema fixes...');
    
    // Add missing room_id column to tables
    await sql`ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "room_id" integer`;
    console.log('✓ Added room_id column');

    // Add missing timestamp columns to tables
    await sql`ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`;
    await sql`ALTER TABLE "tables" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now()`;
    console.log('✓ Added timestamp columns');

    // Fix table_number column type
    await sql`ALTER TABLE "tables" ALTER COLUMN "table_number" TYPE varchar(50)`;
    console.log('✓ Fixed table_number column type');

    // Add foreign key constraint for room_id if it doesn't exist
    try {
      await sql`ALTER TABLE "tables" ADD CONSTRAINT "tables_room_id_rooms_id_fk" 
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE no action ON UPDATE no action`;
      console.log('✓ Added room_id foreign key constraint');
    } catch (err) {
      if (err.code === '42710') {
        console.log('✓ Room_id foreign key constraint already exists');
      } else {
        throw err;
      }
    }

    // Fix SMS messages date columns by dropping and recreating them with proper type
    await sql`ALTER TABLE "sms_messages" DROP COLUMN IF EXISTS "booking_date_from"`;
    await sql`ALTER TABLE "sms_messages" DROP COLUMN IF EXISTS "booking_date_to"`;
    await sql`ALTER TABLE "sms_messages" ADD COLUMN "booking_date_from" date`;
    await sql`ALTER TABLE "sms_messages" ADD COLUMN "booking_date_to" date`;
    console.log('✓ Fixed SMS messages date columns');

    console.log('All schema fixes completed successfully!');
  } catch (error) {
    console.error('Error fixing schema:', error);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

fixSchema();

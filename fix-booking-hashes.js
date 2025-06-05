import { neon } from "@neondatabase/serverless";
import crypto from 'crypto';

const SECRET_KEY = process.env.BOOKING_HASH_SECRET || 'your-secret-key-change-in-production';

function generateHash(bookingId, tenantId, restaurantId, action) {
  const data = `${bookingId}-${tenantId}-${restaurantId}-${action}`;
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  return hash;
}

async function fixBookingHashes() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Get all bookings that need hashes
    const bookings = await sql`
      SELECT id, tenant_id, restaurant_id 
      FROM bookings 
      WHERE management_hash IS NULL OR management_hash = ''
    `;
    
    console.log(`Found ${bookings.length} bookings to update`);
    
    // Update each booking with its management hash
    for (const booking of bookings) {
      const managementHash = generateHash(
        booking.id,
        booking.tenant_id,
        booking.restaurant_id,
        'manage'
      );
      
      await sql`
        UPDATE bookings 
        SET management_hash = ${managementHash}
        WHERE id = ${booking.id}
      `;
      
      console.log(`Updated booking ${booking.id} with hash ${managementHash}`);
    }
    
    console.log('All booking hashes updated successfully');
  } catch (error) {
    console.error('Error updating booking hashes:', error);
  }
}

fixBookingHashes();
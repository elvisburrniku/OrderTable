import { neon } from "@neondatabase/serverless";
import crypto from 'crypto';

const SECRET_KEY = process.env.BOOKING_HASH_SECRET || 'your-secret-key-change-in-production';

function generateHash(bookingId, tenantId, restaurantId, action) {
  const data = `${bookingId}-${tenantId}-${restaurantId}-${action}`;
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  return hash;
}

async function testBookingHash() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Get booking 178 details
    const booking = await sql`
      SELECT id, tenant_id, restaurant_id, management_hash, customer_name
      FROM bookings 
      WHERE id = 178
    `;
    
    if (booking.length === 0) {
      console.log('Booking 178 not found');
      return;
    }
    
    const bookingData = booking[0];
    console.log('Booking 178 details:', bookingData);
    
    // Generate the correct management hash
    const correctHash = generateHash(bookingData.id, bookingData.tenant_id, bookingData.restaurant_id, 'manage');
    console.log('Expected management hash:', correctHash);
    console.log('Stored management hash:', bookingData.management_hash);
    console.log('Hashes match:', correctHash === bookingData.management_hash);
    
    // Generate the correct management URL
    const baseUrl = 'https://67ed52fc-f941-43de-936b-145598f02f97-00-222z68o7hqqgk.janeway.replit.dev';
    const correctUrl = `${baseUrl}/manage-booking/${bookingData.id}/${correctHash}`;
    console.log('Correct management URL:', correctUrl);
    
    // The incorrect URL from user
    const incorrectUrl = 'https://67ed52fc-f941-43de-936b-145598f02f97-00-222z68o7hqqgk.janeway.replit.dev/manage-booking/178/92291b9b4e17db3edc67d64cc35d0f74b9431e3cd1c19fbebdf371d77c8c7dd5';
    console.log('Incorrect URL from user:', incorrectUrl);
    
  } catch (error) {
    console.error('Error testing booking hash:', error);
  }
}

testBookingHash();
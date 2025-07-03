// Test the prepayment API endpoints
const crypto = require('crypto');

const SECRET_KEY = process.env.BOOKING_HASH_SECRET || 'your-secret-key-change-in-production';

function generateHash(bookingId, tenantId, restaurantId, action) {
  const data = `${bookingId}-${tenantId}-${restaurantId}-${action}`;
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
  return hash;
}

async function testEndpoints() {
  const bookingId = 1;
  const tenantId = 1;
  const restaurantId = 1;
  
  // Generate valid hash
  const validHash = generateHash(bookingId, tenantId, restaurantId, 'payment');
  console.log('Generated valid hash:', validHash);
  
  const baseUrl = 'http://localhost:5000';
  const testUrl = `${baseUrl}/api/secure/prepayment/${bookingId}?tenant=${tenantId}&restaurant=${restaurantId}&hash=${validHash}`;
  
  console.log('Testing URL:', testUrl);
  
  try {
    const response = await fetch(testUrl);
    const data = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

testEndpoints();
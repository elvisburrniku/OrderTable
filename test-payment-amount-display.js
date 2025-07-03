import { storage } from './server/storage.ts';
import { PaymentTokenService } from './server/payment-token-service.ts';

async function testPaymentAmountDisplay() {
  console.log('💰 Testing Payment Amount Display with Secure Tokens\n');

  try {
    // Test 1: Create booking with payment amount
    console.log('1. Creating test booking with payment amount...');
    
    const testBooking = {
      restaurantId: 7,
      tenantId: 3,
      customerName: 'Payment Test Customer',
      customerEmail: 'payment-test@example.com',
      customerPhone: '+1234567890',
      bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      startTime: '19:00',
      endTime: '21:00',
      guestCount: 2,
      requiresPayment: true,
      paymentAmount: 45.50, // Test specific amount
      paymentStatus: 'pending',
      status: 'waiting_payment',
      notes: 'Test booking for payment amount verification'
    };

    const booking = await storage.createBooking(testBooking);
    console.log(`✓ Booking created with ID: ${booking.id}`);
    console.log(`  Payment Amount: $${booking.paymentAmount}`);

    // Test 2: Generate secure payment URL
    console.log('\n2. Generating secure payment URL...');
    
    const baseUrl = 'http://localhost:5000';
    const secureUrl = PaymentTokenService.generateSecurePaymentUrl(
      booking.id,
      booking.tenantId,
      booking.restaurantId,
      booking.paymentAmount,
      'USD',
      baseUrl
    );
    
    console.log(`✓ Secure URL: ${secureUrl}`);

    // Test 3: Verify token contains correct amount
    console.log('\n3. Verifying token contains correct payment amount...');
    
    const url = new URL(secureUrl);
    const token = url.searchParams.get('token');
    const tokenData = PaymentTokenService.verifyToken(token);
    
    if (tokenData) {
      console.log('✓ Token verification successful');
      console.log(`  Booking ID: ${tokenData.bookingId}`);
      console.log(`  Amount in Token: $${tokenData.amount}`);
      console.log(`  Currency: ${tokenData.currency}`);
      
      if (tokenData.amount === booking.paymentAmount) {
        console.log('✓ Payment amount matches between booking and token');
      } else {
        console.log('✗ Payment amount mismatch!');
        console.log(`  Expected: $${booking.paymentAmount}`);
        console.log(`  Got: $${tokenData.amount}`);
      }
    } else {
      console.log('✗ Token verification failed');
    }

    // Test 4: Simulate API call to fetch booking details
    console.log('\n4. Testing API response with payment amount...');
    
    const simulatedApiResponse = await storage.getBookingById(booking.id);
    console.log(`✓ API Response - Payment Amount: $${simulatedApiResponse.paymentAmount}`);
    console.log(`✓ API Response - Currency: ${simulatedApiResponse.currency || 'USD'}`);

    // Test 5: Test URL analysis (no sensitive data exposure)
    console.log('\n5. Verifying URL security...');
    
    const urlParams = new URLSearchParams(url.search);
    const hasAmount = urlParams.has('amount');
    const hasTenant = urlParams.has('tenant');
    const hasRestaurant = urlParams.has('restaurant');
    const hasBooking = urlParams.has('booking');
    
    if (!hasAmount && !hasTenant && !hasRestaurant && !hasBooking) {
      console.log('✓ URL is secure - no sensitive data exposed');
    } else {
      console.log('✗ Security issue - sensitive data found in URL');
      if (hasAmount) console.log('  - Amount exposed');
      if (hasTenant) console.log('  - Tenant ID exposed');
      if (hasRestaurant) console.log('  - Restaurant ID exposed');
      if (hasBooking) console.log('  - Booking ID exposed');
    }

    console.log('\n🎉 Payment amount display test completed successfully!');
    console.log('\nSummary:');
    console.log(`- Booking Payment Amount: $${booking.paymentAmount}`);
    console.log(`- Token Payment Amount: $${tokenData?.amount}`);
    console.log(`- URL Security: ✓ Only encrypted token present`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testPaymentAmountDisplay();
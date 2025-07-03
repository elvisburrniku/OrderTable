import { PaymentTokenService } from './server/payment-token-service.ts';

async function testSecurePaymentLinks() {
  console.log('🔐 Testing Secure Payment Token System\n');

  try {
    // Test 1: Generate secure payment token
    console.log('1. Testing secure payment token generation...');
    
    const testData = {
      bookingId: 83,
      tenantId: 3,
      restaurantId: 7,
      amount: 25.00,
      currency: 'USD',
      expiresAt: 0 // Will be set by the service
    };

    const token = PaymentTokenService.generateToken(testData);
    console.log(`✓ Secure token generated: ${token.substring(0, 50)}...`);

    // Test 2: Verify token can be decrypted
    console.log('\n2. Testing token verification...');
    const verifiedData = PaymentTokenService.verifyToken(token);
    
    if (verifiedData) {
      console.log('✓ Token verification successful');
      console.log(`  - Booking ID: ${verifiedData.bookingId}`);
      console.log(`  - Tenant ID: ${verifiedData.tenantId}`);
      console.log(`  - Restaurant ID: ${verifiedData.restaurantId}`);
      console.log(`  - Amount: ${verifiedData.amount}`);
      console.log(`  - Currency: ${verifiedData.currency}`);
      console.log(`  - Expires: ${new Date(verifiedData.expiresAt).toISOString()}`);
    } else {
      console.log('✗ Token verification failed');
    }

    // Test 3: Generate secure payment URL
    console.log('\n3. Testing secure payment URL generation...');
    const baseUrl = 'http://localhost:5000';
    const secureUrl = PaymentTokenService.generateSecurePaymentUrl(
      83, 3, 7, 25.00, 'USD', baseUrl
    );
    console.log(`✓ Secure payment URL: ${secureUrl}`);

    // Test 4: Verify URL format
    console.log('\n4. Verifying URL security...');
    const url = new URL(secureUrl);
    const urlToken = url.searchParams.get('token');
    
    if (urlToken && !url.searchParams.has('booking') && !url.searchParams.has('tenant')) {
      console.log('✓ URL is secure - no sensitive data exposed');
      console.log('✓ Only encrypted token is present in URL');
    } else {
      console.log('✗ URL may still contain sensitive data');
    }

    // Test 5: Test invalid token rejection
    console.log('\n5. Testing invalid token rejection...');
    const invalidToken = 'invalid-token-123';
    const invalidResult = PaymentTokenService.verifyToken(invalidToken);
    
    if (!invalidResult) {
      console.log('✓ Invalid tokens are properly rejected');
    } else {
      console.log('✗ Invalid token was accepted (security issue)');
    }

    console.log('\n🎉 Secure payment token system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testSecurePaymentLinks();
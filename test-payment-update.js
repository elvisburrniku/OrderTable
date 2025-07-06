import crypto from 'crypto';
import http from 'http';

async function testPaymentUpdate() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';
  
  // Create test event with actual booking ID
  const testEvent = {
    id: 'evt_test_payment_update',
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'pi_test_with_booking_123',
        object: 'payment_intent',
        amount: 5000,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: 'ch_test_charge_123',
        metadata: {
          bookingId: '123', // This should match an actual booking ID
          customerEmail: 'test@example.com',
          customerName: 'Test Customer',
          restaurantName: 'Test Restaurant',
          type: 'booking_payment'
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: 'req_test_request',
      idempotency_key: null
    },
    type: 'payment_intent.succeeded'
  };
  
  const payload = JSON.stringify(testEvent);
  const timestamp = Math.floor(Date.now() / 1000);
  
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');
  
  const stripeSignature = `t=${timestamp},v1=${signature}`;
  
  console.log('Testing payment update webhook...');
  console.log('Booking ID in metadata:', testEvent.data.object.metadata.bookingId);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/webhooks/stripe',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Stripe-Signature': stripeSignature
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`\nWebhook Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      if (res.statusCode === 200) {
        console.log('\n✅ Webhook processed successfully!');
        console.log('\nNext steps:');
        console.log('1. Check the server logs for detailed processing info');
        console.log('2. Verify booking #123 payment status is updated to "paid"');
        console.log('3. Check if invoice was created for the booking');
      } else {
        console.log('\n❌ Webhook processing failed');
      }
    });
  });
  
  req.on('error', (err) => {
    console.error('Request error:', err);
  });
  
  req.write(payload);
  req.end();
}

testPaymentUpdate().catch(console.error);
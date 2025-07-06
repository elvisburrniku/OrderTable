import fetch from 'node-fetch';
import crypto from 'crypto';

// Simulate a Stripe webhook for payment confirmation
async function simulatePaymentWebhook() {
  console.log("Simulating Stripe payment_intent.succeeded webhook...\n");

  // First, let's create a test Stripe payment record for booking 106
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  
  // Mock payment intent data
  const paymentIntent = {
    id: 'pi_test_' + Date.now(),
    object: 'payment_intent',
    amount: 8000, // 80.00 EUR in cents
    currency: 'eur',
    status: 'succeeded',
    charges: {
      data: [{
        receipt_url: 'https://pay.stripe.com/receipts/test_receipt_' + Date.now()
      }]
    }
  };

  // Create webhook event
  const event = {
    id: 'evt_test_' + Date.now(),
    type: 'payment_intent.succeeded',
    data: {
      object: paymentIntent
    }
  };

  // First, create a Stripe payment record
  console.log("1. Creating Stripe payment record for booking #106...");
  
  const createPaymentResponse = await fetch(`${baseUrl}/api/admin/stripe-payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer admin-token' // You'll need to get a valid admin token
    },
    body: JSON.stringify({
      tenantId: 3, // From the test data
      restaurantId: 7, // Bella Vue
      bookingId: 106,
      stripePaymentIntentId: paymentIntent.id,
      stripeConnectAccountId: 'acct_test_123',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      customerEmail: 'elvis.burrniku99@gmail.com',
      customerName: 'Elvis Burrniku',
      description: 'Payment for booking #106'
    })
  });

  if (createPaymentResponse.ok) {
    console.log("✓ Stripe payment record created successfully\n");
  } else {
    console.log("✗ Failed to create payment record:", await createPaymentResponse.text());
    return;
  }

  // Now send the webhook
  console.log("2. Sending webhook to /api/stripe/webhook...");
  
  // Create a mock signature (in production, Stripe would sign this)
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(event);
  const signature = `t=${timestamp},v1=mock_signature`;

  const webhookResponse = await fetch(`${baseUrl}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature
    },
    body: payload
  });

  console.log("Webhook response status:", webhookResponse.status);
  const responseData = await webhookResponse.text();
  console.log("Webhook response:", responseData);

  // Check results
  console.log("\n3. Checking results...");
  
  // You can run the test script again to see if the booking status changed
  console.log("\nRun 'node test-payment-confirmation.cjs' to verify:");
  console.log("- Booking #106 status should change from 'waiting_payment' to 'confirmed'");
  console.log("- Payment status should change from 'pending' to 'paid'");
  console.log("- An invoice should be created for booking #106");
  console.log("- Email notifications should be sent (check logs)");
}

// Run the simulation
simulatePaymentWebhook().catch(console.error);
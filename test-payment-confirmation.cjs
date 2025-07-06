const { neon } = require("@neondatabase/serverless");

async function testPaymentConfirmation() {
  console.log("Testing Payment Confirmation System...\n");

  // Connect to database
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Check for a booking with waiting_payment status
    console.log("1. Finding bookings with waiting_payment status...");
    const waitingBookings = await sql`
      SELECT b.*, r.name as restaurant_name, t.name as tenant_name
      FROM bookings b
      JOIN restaurants r ON b.restaurant_id = r.id
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.status = 'waiting_payment'
      AND b.requires_payment = true
      LIMIT 5
    `;
    
    console.log(`Found ${waitingBookings.length} bookings waiting for payment\n`);
    
    if (waitingBookings.length > 0) {
      waitingBookings.forEach(booking => {
        console.log(`- Booking #${booking.id}: ${booking.customer_name}`);
        console.log(`  Restaurant: ${booking.restaurant_name}`);
        console.log(`  Amount: ${booking.payment_amount} EUR`);
        console.log(`  Status: ${booking.status}`);
        console.log(`  Payment Status: ${booking.payment_status}\n`);
      });
    }

    // 2. Check for existing invoices
    console.log("2. Checking existing invoices...");
    const invoices = await sql`
      SELECT i.*, b.customer_name, r.name as restaurant_name
      FROM invoices i
      JOIN bookings b ON i.booking_id = b.id
      JOIN restaurants r ON i.restaurant_id = r.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `;
    
    console.log(`Found ${invoices.length} invoices\n`);
    
    if (invoices.length > 0) {
      invoices.forEach(invoice => {
        console.log(`- Invoice #${invoice.invoice_number}`);
        console.log(`  Booking: #${invoice.booking_id} - ${invoice.customer_name}`);
        console.log(`  Restaurant: ${invoice.restaurant_name}`);
        console.log(`  Amount: ${invoice.amount} ${invoice.currency}`);
        console.log(`  Status: ${invoice.status}`);
        console.log(`  Receipt URL: ${invoice.stripe_receipt_url || 'Not available'}\n`);
      });
    }

    // 3. Check for successful payments
    console.log("3. Checking confirmed bookings with payments...");
    const confirmedBookings = await sql`
      SELECT b.*, r.name as restaurant_name
      FROM bookings b
      JOIN restaurants r ON b.restaurant_id = r.id
      WHERE b.status = 'confirmed'
      AND b.payment_status = 'paid'
      AND b.payment_paid_at IS NOT NULL
      ORDER BY b.payment_paid_at DESC
      LIMIT 5
    `;
    
    console.log(`Found ${confirmedBookings.length} confirmed bookings with payments\n`);
    
    if (confirmedBookings.length > 0) {
      confirmedBookings.forEach(booking => {
        console.log(`- Booking #${booking.id}: ${booking.customer_name}`);
        console.log(`  Restaurant: ${booking.restaurant_name}`);
        console.log(`  Status: ${booking.status} ✓`);
        console.log(`  Payment Status: ${booking.payment_status} ✓`);
        console.log(`  Paid At: ${booking.payment_paid_at}`);
        console.log(`  Payment Intent: ${booking.payment_intent_id || 'N/A'}\n`);
      });
    }

    // 4. Check Stripe payment records
    console.log("4. Checking Stripe payment records...");
    const stripePayments = await sql`
      SELECT sp.*, b.customer_name, r.name as restaurant_name
      FROM stripe_payments sp
      LEFT JOIN bookings b ON sp.booking_id = b.id
      LEFT JOIN restaurants r ON sp.restaurant_id = r.id
      WHERE sp.status = 'succeeded'
      ORDER BY sp.created_at DESC
      LIMIT 5
    `;
    
    console.log(`Found ${stripePayments.length} successful Stripe payments\n`);
    
    if (stripePayments.length > 0) {
      stripePayments.forEach(payment => {
        console.log(`- Payment ${payment.stripe_payment_intent_id}`);
        console.log(`  Booking: #${payment.booking_id || 'N/A'} - ${payment.customer_name || payment.customer_email}`);
        console.log(`  Restaurant: ${payment.restaurant_name || 'N/A'}`);
        console.log(`  Amount: ${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()}`);
        console.log(`  Status: ${payment.status} ✓\n`);
      });
    }

    // 5. Summary
    console.log("\n=== SUMMARY ===");
    console.log(`Bookings waiting for payment: ${waitingBookings.length}`);
    console.log(`Invoices generated: ${invoices.length}`);
    console.log(`Confirmed bookings with payments: ${confirmedBookings.length}`);
    console.log(`Successful Stripe payments: ${stripePayments.length}`);
    
    // Check for webhook configuration
    console.log("\n=== WEBHOOK CONFIGURATION ===");
    console.log(`Stripe webhook endpoint: /api/stripe/webhook`);
    console.log(`Expected webhook events: payment_intent.succeeded`);
    console.log("\nMake sure your Stripe webhook is configured to send payment_intent.succeeded events to:");
    console.log(`${process.env.BASE_URL || 'http://localhost:5000'}/api/stripe/webhook`);

  } catch (error) {
    console.error("Error testing payment confirmation:", error);
  }
}

// Run the test
testPaymentConfirmation();
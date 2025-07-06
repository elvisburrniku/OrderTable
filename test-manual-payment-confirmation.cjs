const { neon } = require("@neondatabase/serverless");

async function testManualPaymentConfirmation() {
  console.log("Testing Manual Payment Confirmation...\n");

  // Connect to database
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Take booking #106 and simulate payment confirmation
    const bookingId = 106;
    console.log(`1. Simulating payment confirmation for booking #${bookingId}...\n`);

    // Get booking details
    const [booking] = await sql`
      SELECT b.*, r.name as restaurant_name
      FROM bookings b
      JOIN restaurants r ON b.restaurant_id = r.id
      WHERE b.id = ${bookingId}
    `;

    if (!booking) {
      console.log("Booking not found!");
      return;
    }

    console.log("Current booking status:");
    console.log(`- Status: ${booking.status}`);
    console.log(`- Payment Status: ${booking.payment_status}`);
    console.log(`- Amount: ${booking.payment_amount} EUR\n`);

    // 2. Update booking to confirmed status
    console.log("2. Updating booking status to 'confirmed' with payment...");
    
    const paymentIntentId = 'pi_test_manual_' + Date.now();
    const paidAt = new Date();
    
    await sql`
      UPDATE bookings
      SET 
        status = 'confirmed',
        payment_status = 'paid',
        payment_intent_id = ${paymentIntentId},
        payment_paid_at = ${paidAt}
      WHERE id = ${bookingId}
    `;
    
    console.log("✓ Booking updated successfully\n");

    // 3. Create invoice
    console.log("3. Creating invoice for the payment...");
    
    const invoiceNumber = `INV-${booking.tenant_id}-${booking.restaurant_id}-${bookingId}-${Date.now()}`;
    const receiptUrl = `https://pay.stripe.com/receipts/test_${Date.now()}`;
    
    await sql`
      INSERT INTO invoices (
        tenant_id,
        restaurant_id,
        booking_id,
        invoice_number,
        payment_intent_id,
        stripe_receipt_url,
        customer_name,
        customer_email,
        amount,
        currency,
        status,
        description,
        paid_at
      ) VALUES (
        ${booking.tenant_id},
        ${booking.restaurant_id},
        ${bookingId},
        ${invoiceNumber},
        ${paymentIntentId},
        ${receiptUrl},
        ${booking.customer_name},
        ${booking.customer_email || 'customer@example.com'},
        ${booking.payment_amount},
        'EUR',
        'paid',
        ${`Payment for booking #${bookingId} on ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.start_time}`},
        ${paidAt}
      )
    `;
    
    console.log("✓ Invoice created successfully");
    console.log(`  Invoice Number: ${invoiceNumber}`);
    console.log(`  Receipt URL: ${receiptUrl}\n`);

    // 4. Verify the changes
    console.log("4. Verifying changes...\n");
    
    const [updatedBooking] = await sql`
      SELECT * FROM bookings WHERE id = ${bookingId}
    `;
    
    const [invoice] = await sql`
      SELECT * FROM invoices WHERE booking_id = ${bookingId}
    `;

    console.log("Updated booking:");
    console.log(`- Status: ${updatedBooking.status} ✓`);
    console.log(`- Payment Status: ${updatedBooking.payment_status} ✓`);
    console.log(`- Payment Intent: ${updatedBooking.payment_intent_id}`);
    console.log(`- Paid At: ${updatedBooking.payment_paid_at}\n`);

    console.log("Created invoice:");
    console.log(`- Invoice Number: ${invoice.invoice_number}`);
    console.log(`- Amount: ${invoice.amount} ${invoice.currency}`);
    console.log(`- Status: ${invoice.status}`);
    console.log(`- Receipt URL: ${invoice.stripe_receipt_url}\n`);

    console.log("✅ Payment confirmation test completed successfully!");
    console.log("\nNote: In production, this process happens automatically via Stripe webhooks.");
    console.log("Email notifications would also be sent to the customer and restaurant.");

  } catch (error) {
    console.error("Error in manual payment confirmation:", error);
  }
}

// Run the test
testManualPaymentConfirmation();
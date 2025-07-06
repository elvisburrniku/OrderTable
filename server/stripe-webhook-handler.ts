import { IStorage } from "./storage";
import { SubscriptionService } from "./subscription-service";
import Stripe from "stripe";

export async function handleStripeWebhook(event: Stripe.Event, storage: IStorage) {
  console.log(`Processing webhook event: ${event.type} (ID: ${event.id})`);
  
  // Create webhook log data
  const webhookLogData = {
    eventId: event.id,
    eventType: event.type,
    source: 'stripe',
    status: 'processing' as const,
    httpMethod: 'POST',
    requestUrl: '/api/webhooks/stripe',
    requestHeaders: {},
    requestBody: event,
    responseStatus: 200,
    responseBody: {},
    errorMessage: '',
    processingTime: 0,
    metadata: {
      stripeAccountId: event.account || '',
      apiVersion: event.api_version || '',
      created: event.created,
      livemode: event.livemode,
    }
  };
  
  const startTime = Date.now();

  try {
    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        // Handle booking payment success
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Processing payment_intent.succeeded webhook: ${paymentIntent.id}`);
        console.log(`Payment intent metadata:`, JSON.stringify(paymentIntent.metadata, null, 2));
        
        // Check for duplicate processing
        const existingPayment = await storage.getStripePaymentByIntentId(paymentIntent.id);
        if (existingPayment && existingPayment.status === 'succeeded') {
          console.log(`Payment intent ${paymentIntent.id} already processed - skipping duplicate`);
          webhookLogData.status = 'completed';
          webhookLogData.metadata.note = 'Duplicate webhook - payment already processed';
          break;
        }
        
        // Update payment record
        const updatedPayment = await storage.updateStripePaymentByIntentId(paymentIntent.id, {
          status: 'succeeded',
          metadata: paymentIntent.metadata,
          updatedAt: new Date()
        });
        console.log(`Updated payment record: ${updatedPayment ? 'Success' : 'Failed'}`);
        
        // Handle guest booking payment
        if (paymentIntent.metadata?.bookingId === 'guest_booking') {
          console.log('Processing guest booking payment completion');
          console.log('Guest booking payment metadata:', paymentIntent.metadata);
          
          // For guest bookings, we need to find the booking that was created after payment
          // The booking might have been created with the payment intent ID
          if (paymentIntent.metadata.customerEmail) {
            try {
              // Find recently created booking by customer email and details
              const { and, eq, desc } = await import("drizzle-orm");
              const recentBookings = await storage.db
                .select()
                .from(storage.bookings)
                .where(and(
                  eq(storage.bookings.customerEmail, paymentIntent.metadata.customerEmail),
                  eq(storage.bookings.bookingDate, new Date(paymentIntent.metadata.bookingDate)),
                  eq(storage.bookings.startTime, paymentIntent.metadata.startTime),
                  eq(storage.bookings.guestCount, parseInt(paymentIntent.metadata.guestCount))
                ))
                .orderBy(desc(storage.bookings.createdAt))
                .limit(1);
              
              if (recentBookings.length > 0) {
                const booking = recentBookings[0];
                console.log(`Found guest booking ${booking.id} for payment intent ${paymentIntent.id}`);
                
                // Update booking with payment information
                const updateData: any = {
                  paymentStatus: 'paid',
                  paymentIntentId: paymentIntent.id,
                  paymentPaidAt: new Date()
                };
                
                // Change booking status from waiting_payment to confirmed
                if (booking.status === 'waiting_payment') {
                  updateData.status = 'confirmed';
                  console.log(`Updating guest booking ${booking.id} status from waiting_payment to confirmed`);
                }
                
                await storage.updateBooking(booking.id, updateData);
                console.log(`Updated guest booking ${booking.id} with payment status: paid`);
                
                // Create invoice record
                const { invoices } = await import("../shared/schema");
                const invoiceData = {
                  bookingId: booking.id,
                  tenantId: booking.tenantId,
                  restaurantId: booking.restaurantId,
                  invoiceNumber: `INV-${Date.now()}-${booking.id}`,
                  paymentIntentId: paymentIntent.id,
                  stripeReceiptUrl: null, // Will be updated when charge.succeeded webhook fires
                  customerName: booking.customerName || paymentIntent.metadata.customerName || 'Guest',
                  customerEmail: booking.customerEmail || paymentIntent.metadata.customerEmail || '',
                  amount: paymentIntent.amount / 100,
                  currency: paymentIntent.currency.toUpperCase(),
                  paymentMethod: 'card',
                  issuedAt: new Date(),
                  paidAt: new Date(),
                  metadata: paymentIntent.metadata
                };
                
                await storage.db.insert(invoices).values(invoiceData);
                console.log(`Created invoice for guest booking ${booking.id}`);
                
                // Send confirmation emails
                const { emailService } = await import("./email-service");
                const { default: formatInTimeZone } = await import("date-fns-tz");
                const restaurant = await storage.getRestaurantById(booking.restaurantId);
                
                if (emailService && booking.customerEmail && restaurant) {
                  try {
                    // Send payment confirmation to customer
                    await emailService.sendPaymentConfirmation({
                      to: [{ email: booking.customerEmail, name: booking.customerName || 'Valued Customer' }],
                      bookingId: booking.id,
                      restaurantName: restaurant.name,
                      amount: paymentIntent.amount / 100,
                      currency: paymentIntent.currency.toUpperCase(),
                      bookingDate: formatInTimeZone(
                        new Date(booking.bookingDate),
                        restaurant.timezone || 'UTC',
                        'EEEE, MMMM d, yyyy'
                      ),
                      bookingTime: booking.startTime,
                      guestCount: booking.guestCount,
                      invoiceNumber: invoiceData.invoiceNumber,
                      stripeReceiptUrl: null // Will be sent in a follow-up email when available
                    });
                    console.log(`Sent payment confirmation email to customer for guest booking ${booking.id}`);
                    
                    // Send notification to restaurant
                    if (restaurant.email) {
                      await emailService.sendPaymentNotificationToRestaurant({
                        to: [{ email: restaurant.email, name: restaurant.name }],
                        bookingId: booking.id,
                        customerName: booking.customerName || 'Guest',
                        amount: paymentIntent.amount / 100,
                        currency: paymentIntent.currency.toUpperCase(),
                        bookingDate: formatInTimeZone(
                          new Date(booking.bookingDate),
                          restaurant.timezone || 'UTC',
                          'EEEE, MMMM d, yyyy'
                        ),
                        bookingTime: booking.startTime,
                        guestCount: booking.guestCount
                      });
                      console.log(`Sent payment notification to restaurant for guest booking ${booking.id}`);
                    }
                  } catch (emailError) {
                    console.error("Error sending guest booking payment emails:", emailError);
                  }
                }
              } else {
                console.log(`No matching guest booking found for payment intent ${paymentIntent.id}`);
                // The booking might not have been created yet - this is okay
                // The frontend will create it after payment confirmation
              }
            } catch (error) {
              console.error('Error processing guest booking payment:', error);
            }
          }
          break;
        }
        
        // Handle regular booking payment
        if (paymentIntent.metadata?.bookingId) {
          const bookingId = parseInt(paymentIntent.metadata.bookingId);
          console.log(`Processing payment for booking ID: ${bookingId}`);
          
          const booking = await storage.getBookingById(bookingId);
          console.log(`Found booking: ${booking ? 'Yes' : 'No'}, Status: ${booking?.status}, Payment Status: ${booking?.paymentStatus}`);
          
          if (booking) {
            // Update booking payment status and booking status in one call
            const updateData: any = {
              paymentStatus: 'paid',
              paymentIntentId: paymentIntent.id,
              paymentPaidAt: new Date()
            };
            
            // Change booking status from waiting_payment to confirmed
            if (booking.status === 'waiting_payment') {
              updateData.status = 'confirmed';
              console.log(`Updating booking ${bookingId} status from waiting_payment to confirmed`);
            }
            
            await storage.updateBooking(bookingId, updateData);
            console.log(`Updated booking ${bookingId} with payment status: paid and intent: ${paymentIntent.id}`);
            
            // Create invoice record
            const { invoices } = await import("../shared/schema");
            const invoiceData = {
              bookingId: bookingId,
              tenantId: booking.tenantId,
              restaurantId: booking.restaurantId,
              invoiceNumber: `INV-${Date.now()}-${bookingId}`,
              paymentIntentId: paymentIntent.id,
              stripeReceiptUrl: null, // Will be updated when available
              customerName: booking.customerName || paymentIntent.metadata.customerName || 'Guest',
              customerEmail: booking.customerEmail || paymentIntent.metadata.customerEmail || '',
              amount: (paymentIntent.amount / 100).toString(), // Convert from cents to decimal string
              currency: paymentIntent.currency.toUpperCase(),
              status: 'paid' as const,
              description: `Payment for booking #${bookingId}`,
              paidAt: new Date(),
              createdAt: new Date()
            };
            
            await storage.db.insert(invoices).values(invoiceData);
            console.log(`Created invoice for booking ${bookingId}`);
            
            // Send payment confirmation emails
            try {
              const emailService = await import("./brevo-service").then(m => new m.BrevoEmailService());
              const restaurant = await storage.getRestaurantById(booking.restaurantId);
              
              // Send confirmation to customer using generic email method
              if (booking.customerEmail && emailService.sendEmail) {
                const subject = `Payment Confirmation - ${restaurant?.name || "Restaurant"}`;
                const htmlContent = `
                  <h1>Payment Confirmed</h1>
                  <p>Dear ${booking.customerName},</p>
                  <p>Your payment of ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)} has been confirmed for your booking.</p>
                  <p><strong>Booking Details:</strong></p>
                  <ul>
                    <li>Booking ID: ${booking.id}</li>
                    <li>Restaurant: ${restaurant?.name || "Restaurant"}</li>
                    <li>Invoice Number: ${invoiceData.invoiceNumber}</li>
                  </ul>
                  <p>Thank you for your payment!</p>
                `;
                
                await emailService.sendEmail({
                  to: [{ email: booking.customerEmail, name: booking.customerName }],
                  subject: subject,
                  htmlContent: htmlContent
                });
                console.log(`Payment confirmation email sent to ${booking.customerEmail}`);
              }
            } catch (emailError) {
              console.error("Error sending payment confirmation email:", emailError);
              // Don't fail the webhook if email fails
            }
            
            // Send notification to restaurant team
            try {
              const emailService = await import("./brevo-service").then(m => new m.BrevoEmailService());
              const restaurant = await storage.getRestaurantById(booking.restaurantId);
              if (restaurant?.email) {
                // Try to use the specific payment notification method if it exists
                if (typeof emailService.sendPaymentNotificationToRestaurant === 'function') {
                  await emailService.sendPaymentNotificationToRestaurant(
                    restaurant.email,
                    {
                      bookingId: booking.id,
                      amount: paymentIntent.amount / 100,
                      currency: paymentIntent.currency.toUpperCase(),
                      customerName: booking.customerName,
                      restaurantName: restaurant.name,
                      bookingDate: new Date(booking.bookingDate).toLocaleDateString(),
                      bookingTime: booking.startTime,
                      guestCount: booking.guestCount,
                      invoiceNumber: invoiceData.invoiceNumber
                    }
                  );
                } else {
                  // Fallback to generic email method
                  const notificationSubject = `Payment Received - Booking #${booking.id}`;
                  const notificationHtml = `
                    <h1>Payment Received</h1>
                    <p>A payment has been received for booking #${booking.id}</p>
                    <p><strong>Details:</strong></p>
                    <ul>
                      <li>Customer: ${booking.customerName}</li>
                      <li>Amount: ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)}</li>
                      <li>Date: ${new Date(booking.bookingDate).toLocaleDateString()}</li>
                      <li>Time: ${booking.startTime}</li>
                      <li>Guests: ${booking.guestCount}</li>
                      <li>Invoice Number: ${invoiceData.invoiceNumber}</li>
                    </ul>
                  `;
                  
                  await emailService.sendEmail({
                    to: [{ email: restaurant.email, name: restaurant.name }],
                    subject: notificationSubject,
                    htmlContent: notificationHtml
                  });
                }
                console.log(`Payment notification sent to restaurant ${restaurant.name}`);
              }
            } catch (notificationError) {
              console.error("Error sending restaurant payment notification:", notificationError);
              // Don't fail the webhook if notifications fail
            }
          }
        }
        break;

      case "charge.succeeded":
        // Update receipt URL when charge succeeds
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          // Update invoice with receipt URL (stripePayments table doesn't have receiptUrl field)
          const { invoices } = await import("../shared/schema");
          const { eq } = await import("drizzle-orm");
          await storage.db
            .update(invoices)
            .set({ stripeReceiptUrl: charge.receipt_url })
            .where(eq(invoices.paymentIntentId, charge.payment_intent as string));
          
          console.log(`Updated receipt URL for payment intent: ${charge.payment_intent}`);
        }
        break;

      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Payment successful:", session.id);
        
        // Process the completed checkout session
        if (session.metadata) {
          const { tenantId, planId, userId } = session.metadata;
          if (tenantId && planId) {
            try {
              await SubscriptionService.handleCheckoutCompleted(session);
              console.log(`✅ Processed checkout completion for tenant ${tenantId}`);
            } catch (error) {
              console.error("Error processing checkout completion:", error);
            }
          }
        }
        break;

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Subscription payment succeeded:", invoice.subscription);
        
        // Update subscription status based on invoice payment
        const subscriptionId = invoice.subscription as string;

        // Find user subscription by Stripe subscription ID and extend their period
        const userSubscription = await storage.getUserSubscriptionByStripeId(subscriptionId);
        if (userSubscription) {
          await storage.updateUserSubscription(userSubscription.id, {
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "active",
          });
          console.log(`Extended subscription for user ${userSubscription.userId}`);
        }
        break;

      case "customer.subscription.deleted":
        const subscription = event.data.object as Stripe.Subscription;
        const userSub = await storage.getUserSubscriptionByStripeId(subscription.id);
        if (userSub) {
          await storage.updateUserSubscription(userSub.id, {
            status: "cancelled",
          });
          console.log(`Cancelled subscription for user ${userSub.userId}`);
        }
        break;

      case "account.updated":
        // Handle Stripe Connect account updates
        const account = event.data.object as Stripe.Account;
        const tenant = await storage.getTenantByStripeConnectAccountId(account.id);
        if (tenant) {
          await storage.updateTenant(tenant.id, {
            stripeConnectStatus:
              account.details_submitted && account.charges_enabled
                ? "connected"
                : "pending",
            stripeConnectOnboardingCompleted: account.details_submitted,
            stripeConnectChargesEnabled: account.charges_enabled,
            stripeConnectPayoutsEnabled: account.payouts_enabled,
          });
        }
        break;

      default:
        // Handle subscription events and other events through SubscriptionService
        console.log(`Delegating ${event.type} to SubscriptionService`);
        await SubscriptionService.handleStripeWebhook(event);
        webhookLogData.metadata.delegated = 'SubscriptionService';
        break;
    }

    // Mark as completed and log success
    webhookLogData.status = 'completed';
    webhookLogData.responseStatus = 200;
    webhookLogData.processingTime = Date.now() - startTime;
    webhookLogData.responseBody = { received: true };
    
    // Log the successful webhook processing
    await storage.createWebhookLog(webhookLogData);
    
    console.log(`Webhook ${event.type} processed successfully in ${webhookLogData.processingTime}ms`);

  } catch (error) {
    console.error("Error handling webhook:", error);
    
    // Log the error
    webhookLogData.status = 'failed';
    webhookLogData.errorMessage = error.message || 'Unknown webhook processing error';
    webhookLogData.responseStatus = 500;
    webhookLogData.processingTime = Date.now() - startTime;
    webhookLogData.responseBody = { error: "Webhook processing failed" };
    
    await storage.createWebhookLog(webhookLogData);
    
    throw error;
  }
}
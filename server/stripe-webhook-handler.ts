import { IStorage } from "./storage";
import { SubscriptionService } from "./SubscriptionService";
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
        
        // Check for duplicate processing
        const existingPayment = await storage.getStripePaymentByIntentId(paymentIntent.id);
        if (existingPayment && existingPayment.status === 'succeeded') {
          console.log(`Payment intent ${paymentIntent.id} already processed - skipping duplicate`);
          webhookLogData.status = 'completed';
          webhookLogData.metadata.note = 'Duplicate webhook - payment already processed';
          break;
        }
        
        // Update payment record
        await storage.updateStripePaymentByIntentId(paymentIntent.id, {
          status: 'succeeded',
          chargeId: paymentIntent.latest_charge as string,
          receiptUrl: null, // Will be updated when charge.succeeded webhook arrives
          metadata: paymentIntent.metadata
        });
        
        // Handle guest booking payment
        if (paymentIntent.metadata?.bookingId === 'guest_booking') {
          console.log('Processing guest booking payment completion');
          // Guest booking payments are handled differently
          // The actual booking creation happens on the frontend after payment
          break;
        }
        
        // Handle regular booking payment
        if (paymentIntent.metadata?.bookingId) {
          const bookingId = parseInt(paymentIntent.metadata.bookingId);
          const booking = await storage.getBookingById(bookingId);
          
          if (booking) {
            // Update booking payment status
            await storage.updateBooking(bookingId, {
              paymentStatus: 'paid',
              paymentIntentId: paymentIntent.id
            });
            
            // Change booking status from waiting_payment to confirmed
            if (booking.status === 'waiting_payment') {
              await storage.updateBooking(bookingId, {
                status: 'confirmed'
              });
              console.log(`Updated booking ${bookingId} status from waiting_payment to confirmed`);
            }
            
            // Create invoice record
            const { invoices } = await import("../shared/schema");
            const invoiceData = {
              bookingId: bookingId,
              tenantId: booking.tenantId,
              restaurantId: booking.restaurantId,
              customerId: booking.customerId,
              invoiceNumber: `INV-${Date.now()}-${bookingId}`,
              amount: paymentIntent.amount / 100, // Convert from cents
              currency: paymentIntent.currency.toUpperCase(),
              status: 'paid' as const,
              paymentMethod: 'stripe',
              stripePaymentIntentId: paymentIntent.id,
              stripeChargeId: paymentIntent.latest_charge as string,
              stripeReceiptUrl: null, // Will be updated when available
              metadata: {
                customerName: paymentIntent.metadata.customerName,
                customerEmail: paymentIntent.metadata.customerEmail,
                bookingDate: paymentIntent.metadata.bookingDate,
                restaurantName: paymentIntent.metadata.restaurantName
              },
              paidAt: new Date(),
              createdAt: new Date()
            };
            
            await storage.db.insert(invoices).values(invoiceData);
            console.log(`Created invoice for booking ${bookingId}`);
            
            // Send payment confirmation emails
            const emailService = await import("./brevo-service").then(m => new m.BrevoEmailService());
            const restaurant = await storage.getRestaurantById(booking.restaurantId);
            
            // Send confirmation to customer
            if (booking.customerEmail) {
              await emailService.sendPaymentConfirmation(
                booking.customerEmail,
                booking.customerName,
                {
                  bookingId: booking.id,
                  amount: paymentIntent.amount / 100,
                  currency: paymentIntent.currency.toUpperCase(),
                  restaurantName: restaurant?.name || "Restaurant",
                  invoiceNumber: invoiceData.invoiceNumber
                }
              );
            }
            
            // Send notification to restaurant
            if (restaurant?.email) {
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
            }
          }
        }
        break;

      case "charge.succeeded":
        // Update receipt URL when charge succeeds
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await storage.updateStripePaymentByIntentId(charge.payment_intent as string, {
            receiptUrl: charge.receipt_url
          });
          
          // Update invoice with receipt URL
          const { invoices } = await import("../shared/schema");
          const { eq } = await import("drizzle-orm");
          await storage.db
            .update(invoices)
            .set({ stripeReceiptUrl: charge.receipt_url })
            .where(eq(invoices.stripePaymentIntentId, charge.payment_intent as string));
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
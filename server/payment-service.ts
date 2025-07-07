import Stripe from "stripe";

// Initialize Stripe
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });
}

export class PaymentService {
  private stripe: Stripe | null;

  constructor() {
    this.stripe = stripe;
  }

  /**
   * Create a payment intent for booking deposit/payment with support for reservation
   */
  async createBookingPaymentIntent(
    amount: number,
    currency: string = "usd",
    tenantStripeAccountId: string,
    bookingDetails: {
      bookingId: number | null;
      customerEmail: string;
      customerName: string;
      restaurantName: string;
      bookingDate: string;
      startTime: string;
      guestCount: number;
    },
    paymentType: string = "capture", // 'capture' for immediate, 'reserve' for authorization only
    captureMethod: string = "automatic" // 'automatic' or 'manual'
  ) {
    if (!this.stripe) {
      throw new Error("Stripe not initialized - payment processing unavailable");
    }

    if (!tenantStripeAccountId) {
      throw new Error("Restaurant Stripe Connect account not configured");
    }

    try {
      // Calculate application fee (5% platform fee)
      const applicationFeeAmount = Math.round(amount * 0.05);

      // Configure payment intent based on payment type
      const paymentIntentConfig: any = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: tenantStripeAccountId,
        },
        metadata: {
          bookingId: bookingDetails.bookingId ? bookingDetails.bookingId.toString() : "guest_booking",
          customerEmail: bookingDetails.customerEmail,
          customerName: bookingDetails.customerName,
          restaurantName: bookingDetails.restaurantName,
          bookingDate: bookingDetails.bookingDate,
          startTime: bookingDetails.startTime,
          guestCount: bookingDetails.guestCount.toString(),
          type: bookingDetails.bookingId ? "booking_payment" : "guest_booking",
          paymentType: paymentType
        },
        description: `${paymentType === 'reserve' ? 'Money reservation' : 'Booking payment'} for ${bookingDetails.restaurantName} - ${bookingDetails.guestCount} guests on ${bookingDetails.bookingDate} at ${bookingDetails.startTime}`,
      };

      // For reservation (authorization only), set capture_method to manual
      if (paymentType === 'reserve') {
        paymentIntentConfig.capture_method = 'manual';
        paymentIntentConfig.confirmation_method = 'manual';
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentConfig);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency,
        applicationFee: applicationFeeAmount / 100, // Convert back to dollars
        paymentType: paymentType,
        captureMethod: paymentIntent.capture_method
      };
    } catch (error) {
      console.error("Error creating booking payment intent:", error);
      throw error;
    }
  }

  /**
   * Capture a reserved payment (for manual capture)
   */
  async captureReservedPayment(
    paymentIntentId: string,
    amountToCapture?: number // Optional: capture partial amount
  ) {
    if (!this.stripe) {
      throw new Error("Stripe not initialized - payment processing unavailable");
    }

    try {
      const captureConfig: any = {};
      
      if (amountToCapture) {
        captureConfig.amount_to_capture = Math.round(amountToCapture * 100);
      }

      const paymentIntent = await this.stripe.paymentIntents.capture(
        paymentIntentId,
        captureConfig
      );

      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        captured: paymentIntent.amount_capturable === 0
      };
    } catch (error) {
      console.error("Error capturing reserved payment:", error);
      throw error;
    }
  }

  /**
   * Cancel a reserved payment (release authorization)
   */
  async cancelReservedPayment(paymentIntentId: string) {
    if (!this.stripe) {
      throw new Error("Stripe not initialized - payment processing unavailable");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        cancelled: paymentIntent.status === 'canceled'
      };
    } catch (error) {
      console.error("Error cancelling reserved payment:", error);
      throw error;
    }
  }

  /**
   * Create a payment link for booking
   */
  async createBookingPaymentLink(
    amount: number,
    currency: string = "usd",
    tenantStripeAccountId: string,
    bookingDetails: {
      bookingId: number | null;
      customerEmail: string;
      customerName: string;
      restaurantName: string;
      bookingDate: string;
      startTime: string;
      guestCount: number;
    },
    successUrl?: string,
    cancelUrl?: string
  ) {
    if (!this.stripe) {
      throw new Error("Stripe not initialized - payment processing unavailable");
    }

    if (!tenantStripeAccountId) {
      throw new Error("Restaurant Stripe Connect account not configured");
    }

    try {
      // Calculate application fee (5% platform fee)
      const applicationFeeAmount = Math.round(amount * 0.05);

      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `Booking Payment - ${bookingDetails.restaurantName}`,
                description: `Booking for ${bookingDetails.guestCount} guests on ${bookingDetails.bookingDate} at ${bookingDetails.startTime}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: tenantStripeAccountId,
        transfer_data: {
          destination: tenantStripeAccountId,
        },
        metadata: {
          bookingId: bookingDetails.bookingId ? bookingDetails.bookingId.toString() : "guest_booking",
          customerEmail: bookingDetails.customerEmail,
          customerName: bookingDetails.customerName,
          restaurantName: bookingDetails.restaurantName,
          bookingDate: bookingDetails.bookingDate,
          startTime: bookingDetails.startTime,
          guestCount: bookingDetails.guestCount.toString(),
          type: bookingDetails.bookingId ? "booking_payment" : "guest_booking"
        },
        after_completion: {
          type: "redirect",
          redirect: {
            url: successUrl || `${process.env.BASE_URL || 'http://localhost:5000'}/booking-payment-success`,
          },
        },
      });

      return {
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.url,
        amount: amount,
        currency: currency,
        applicationFee: applicationFeeAmount / 100,
      };
    } catch (error) {
      console.error("Error creating booking payment link:", error);
      throw error;
    }
  }

  /**
   * Retrieve payment intent status
   */
  async getPaymentIntentStatus(paymentIntentId: string) {
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error("Error retrieving payment intent:", error);
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string) {
    if (!this.stripe) {
      throw new Error("Stripe not initialized");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error("Error canceling payment intent:", error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
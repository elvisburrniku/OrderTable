import { storage } from './storage';
import { PaymentService } from './payment-service';

export class ReservationScheduler {
  private paymentService: PaymentService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Start the reservation scheduler service
   */
  start() {
    if (this.intervalId) {
      return; // Already running
    }

    console.log('🔄 Starting reservation scheduler service...');
    
    // Run immediately on startup
    this.processReservations();
    
    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.processReservations();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop the reservation scheduler service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🔄 Reservation scheduler service stopped');
    }
  }

  /**
   * Process all reservations that need to be captured
   */
  private async processReservations() {
    try {
      console.log('🔄 Checking for reservations to process...');
      
      // Get all bookings with pending payment reservations
      const pendingReservations = await this.getPendingReservations();
      
      if (pendingReservations.length === 0) {
        console.log('✅ No reservations need processing at this time');
        return;
      }

      console.log(`📋 Found ${pendingReservations.length} reservation(s) to process`);

      for (const booking of pendingReservations) {
        await this.processBookingReservation(booking);
      }
    } catch (error) {
      console.error('❌ Error processing reservations:', error);
    }
  }

  /**
   * Get all bookings with pending payment reservations that need processing
   */
  private async getPendingReservations(): Promise<any[]> {
    try {
      // Use database storage directly to get all bookings with pending payment status
      if (storage.constructor.name === 'DatabaseStorage') {
        const dbStorage = storage as any;
        const { bookings } = await import('../shared/schema');
        const { eq, and } = await import('drizzle-orm');
        
        const pendingBookings = await dbStorage.db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.paymentStatus, 'pending'),
              // Only get bookings that have payment intent IDs
            )
          );

        const now = new Date();
        const pendingReservations = [];

        for (const booking of pendingBookings) {
          // Skip if no payment intent
          if (!booking.paymentIntentId) {
            continue;
          }

          // Check if this booking has a "reserve" payment setup
          const paymentSetup = await this.getPaymentSetupForBooking(booking);
          if (!paymentSetup || paymentSetup.type !== 'reserve') {
            continue;
          }

          // Calculate 6 hours before arrival
          const bookingDateTime = new Date(booking.bookingDate);
          const [hours, minutes] = booking.startTime.split(':');
          bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          const sixHoursBeforeArrival = new Date(bookingDateTime.getTime() - (6 * 60 * 60 * 1000));

          // Check if it's time to capture the payment (6 hours before arrival)
          if (now >= sixHoursBeforeArrival) {
            pendingReservations.push({
              ...booking,
              paymentSetup,
              captureReason: 'arrival_time',
              sixHoursBeforeArrival: sixHoursBeforeArrival.toISOString()
            });
          }
        }

        return pendingReservations;
      } else {
        // For memory storage, we'll skip automatic processing
        return [];
      }
    } catch (error) {
      console.error('❌ Error getting pending reservations:', error);
      return [];
    }
  }

  /**
   * Get payment setup for a booking
   */
  private async getPaymentSetupForBooking(booking: any): Promise<any> {
    try {
      const paymentSetups = await storage.getPaymentSetupsByRestaurant(booking.restaurantId);
      return paymentSetups.find(setup => setup.isActive) || null;
    } catch (error) {
      console.error('❌ Error getting payment setup for booking:', booking.id, error);
      return null;
    }
  }

  /**
   * Process a single booking reservation
   */
  private async processBookingReservation(booking: any) {
    try {
      console.log(`💳 Processing reservation for booking ${booking.id} (${booking.customerName})`);
      
      // Get Stripe Connect account for this restaurant
      const stripeAccount = await storage.getStripeAccountByRestaurant(booking.restaurantId);
      if (!stripeAccount) {
        console.error(`❌ No Stripe Connect account found for restaurant ${booking.restaurantId}`);
        return;
      }

      // Capture the reserved payment
      const result = await this.paymentService.captureReservedPayment(
        booking.paymentIntentId,
        stripeAccount.stripeAccountId,
        booking.paymentAmount
      );

      if (result.success) {
        // Update booking payment status
        await storage.updateBookingPaymentStatus(booking.id, 'paid');
        
        // Log the activity
        await storage.createActivityLog({
          tenantId: booking.tenantId,
          restaurantId: booking.restaurantId,
          entityType: 'booking',
          entityId: booking.id,
          action: 'payment_captured_automatically',
          details: {
            paymentIntentId: booking.paymentIntentId,
            amount: booking.paymentAmount,
            currency: booking.currency || 'EUR',
            reason: booking.captureReason,
            captureTime: new Date().toISOString(),
            sixHoursBeforeArrival: booking.sixHoursBeforeArrival
          },
          performedBy: null, // System action
          performedAt: new Date()
        });

        console.log(`✅ Successfully captured reservation for booking ${booking.id} - ${booking.paymentAmount} ${booking.currency || 'EUR'}`);
        
        // Send notification email to customer
        await this.sendPaymentCapturedNotification(booking);
        
      } else {
        console.error(`❌ Failed to capture reservation for booking ${booking.id}:`, result.error);
        
        // Log the failure
        await storage.createActivityLog({
          tenantId: booking.tenantId,
          restaurantId: booking.restaurantId,
          entityType: 'booking',
          entityId: booking.id,
          action: 'payment_capture_failed',
          details: {
            paymentIntentId: booking.paymentIntentId,
            error: result.error,
            reason: booking.captureReason,
            attemptTime: new Date().toISOString()
          },
          performedBy: null,
          performedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`❌ Error processing reservation for booking ${booking.id}:`, error);
    }
  }

  /**
   * Send notification email when payment is captured
   */
  private async sendPaymentCapturedNotification(booking: any) {
    try {
      // Get restaurant info for the email
      const restaurant = await storage.getRestaurantById(booking.restaurantId);
      if (!restaurant) return;

      const emailService = await import('./brevo-email-service');
      const brevoService = emailService.default;

      const emailData = {
        to: [{ email: booking.customerEmail, name: booking.customerName }],
        subject: `Payment Processed - ${restaurant.name}`,
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
              <h2>Payment Processed</h2>
              <p>Dear ${booking.customerName},</p>
              <p>Your reserved payment has been automatically processed for your upcoming reservation.</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Payment Details:</h3>
                <ul>
                  <li><strong>Amount:</strong> ${booking.paymentAmount} ${booking.currency || 'EUR'}</li>
                  <li><strong>Restaurant:</strong> ${restaurant.name}</li>
                  <li><strong>Reservation Date:</strong> ${new Date(booking.bookingDate).toLocaleDateString()}</li>
                  <li><strong>Time:</strong> ${booking.startTime}</li>
                  <li><strong>Party Size:</strong> ${booking.guestCount} guests</li>
                </ul>
              </div>
              <p>This payment was automatically processed 6 hours before your arrival time as per our reservation policy.</p>
              <p>We look forward to serving you!</p>
              <p>Best regards,<br>${restaurant.name}</p>
            </body>
          </html>
        `
      };

      await brevoService.sendEmail(emailData);
      console.log(`📧 Payment captured notification sent to ${booking.customerEmail}`);
    } catch (error) {
      console.error('❌ Error sending payment captured notification:', error);
    }
  }

  /**
   * Process late cancellation reservations
   */
  async processLateCancellation(bookingId: number, reason: string = 'late_cancellation') {
    try {
      const booking = await storage.getBookingById(bookingId);
      if (!booking || booking.paymentStatus !== 'pending' || !booking.paymentIntentId) {
        return { success: false, error: 'Booking not found or not eligible for late cancellation charge' };
      }

      // Get payment setup to verify it's a reserve type
      const paymentSetup = await this.getPaymentSetupForBooking(booking);
      if (!paymentSetup || paymentSetup.type !== 'reserve') {
        return { success: false, error: 'Booking does not have a reserve payment setup' };
      }

      // Get Stripe Connect account
      const stripeAccount = await storage.getStripeAccountByRestaurant(booking.restaurantId);
      if (!stripeAccount) {
        return { success: false, error: 'No Stripe Connect account found' };
      }

      // Capture the reserved payment for late cancellation
      const result = await this.paymentService.captureReservedPayment(
        booking.paymentIntentId,
        stripeAccount.stripeAccountId,
        booking.paymentAmount
      );

      if (result.success) {
        // Update booking payment status
        await storage.updateBookingPaymentStatus(bookingId, 'paid');
        
        // Log the activity
        await storage.createActivityLog({
          tenantId: booking.tenantId,
          restaurantId: booking.restaurantId,
          entityType: 'booking',
          entityId: bookingId,
          action: 'late_cancellation_charge',
          details: {
            paymentIntentId: booking.paymentIntentId,
            amount: booking.paymentAmount,
            currency: booking.currency || 'EUR',
            reason: reason,
            captureTime: new Date().toISOString()
          },
          performedBy: null,
          performedAt: new Date()
        });

        console.log(`✅ Late cancellation charge processed for booking ${bookingId}`);
        return { success: true, amount: booking.paymentAmount, currency: booking.currency || 'EUR' };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error processing late cancellation:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const reservationScheduler = new ReservationScheduler();
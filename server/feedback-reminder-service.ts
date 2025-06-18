import { storage } from "./storage";
import { BrevoEmailService } from "./brevo-service";
import { QRCodeService } from "./qr-service";

export class FeedbackReminderService {
  private emailService: BrevoEmailService | null = null;
  private isRunning = false;

  constructor() {
    try {
      if (process.env.BREVO_API_KEY) {
        this.emailService = new BrevoEmailService();
        console.log("Feedback reminder service: Email service initialized");
      } else {
        console.log("Feedback reminder service: No email service configured");
      }
    } catch (error) {
      console.error("Feedback reminder service: Error initializing email service:", error);
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log("Starting feedback reminder service...");
    
    // Check for completed bookings every 30 minutes
    setInterval(() => {
      this.checkCompletedBookings();
    }, 30 * 60 * 1000);
    
    // Run initial check after 1 minute
    setTimeout(() => {
      this.checkCompletedBookings();
    }, 60 * 1000);
  }

  stop() {
    this.isRunning = false;
    console.log("Feedback reminder service stopped");
  }

  private async checkCompletedBookings() {
    try {
      console.log("Checking for completed bookings requiring feedback requests...");
      
      // Get all restaurants to check their bookings
      const tenants = await storage.getAllTenants();
      
      for (const tenant of tenants) {
        const restaurants = await storage.getRestaurantsByTenantId(tenant.id);
        
        for (const restaurant of restaurants) {
          await this.processRestaurantBookings(restaurant, tenant.id);
        }
      }
    } catch (error) {
      console.error("Error checking completed bookings:", error);
    }
  }

  private async processRestaurantBookings(restaurant: any, tenantId: number) {
    try {
      const bookings = await storage.getBookingsByRestaurant(restaurant.id);
      const now = new Date();
      
      // Filter for completed bookings that need feedback requests
      const completedBookings = bookings.filter(booking => {
        // Only process bookings from the correct tenant
        if (booking.tenantId !== tenantId) return false;
        
        // Only process confirmed bookings
        if (booking.status !== 'confirmed') return false;
        
        // Check if booking end time has passed
        const bookingDate = new Date(booking.bookingDate);
        const endTime = booking.endTime || '22:00'; // Default end time if not specified
        const [hours, minutes] = endTime.split(':').map(Number);
        
        const bookingEndDateTime = new Date(bookingDate);
        bookingEndDateTime.setHours(hours, minutes, 0, 0);
        
        // Only process bookings that ended more than 1 hour ago but less than 24 hours ago
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        return bookingEndDateTime <= oneHourAgo && bookingEndDateTime >= twentyFourHoursAgo;
      });

      console.log(`Found ${completedBookings.length} completed bookings for restaurant ${restaurant.name}`);

      // Check if feedback requests have already been sent
      for (const booking of completedBookings) {
        const hasExistingFeedback = await this.checkExistingFeedback(booking.id, restaurant.id, tenantId);
        
        if (!hasExistingFeedback) {
          await this.sendFeedbackRequest(booking, restaurant, tenantId);
        }
      }
    } catch (error) {
      console.error(`Error processing bookings for restaurant ${restaurant.id}:`, error);
    }
  }

  private async checkExistingFeedback(bookingId: number, restaurantId: number, tenantId: number): Promise<boolean> {
    try {
      const feedback = await storage.getFeedbackResponses(restaurantId, tenantId);
      return feedback.some(f => f.bookingId === bookingId);
    } catch (error) {
      console.error("Error checking existing feedback:", error);
      return false;
    }
  }

  async sendFeedbackRequest(booking: any, restaurant: any, tenantId: number) {
    if (!this.emailService || !booking.customerEmail) {
      console.log(`Skipping feedback request for booking ${booking.id} - no email service or customer email`);
      return;
    }

    try {
      // Generate QR code for direct feedback access
      const feedbackUrl = `${process.env.BASE_URL || 'https://your-domain.com'}/guest-feedback/${tenantId}/${restaurant.id}?table=${booking.tableId || 'booking'}`;
      const qrCodeDataUrl = await QRCodeService.generateTableQRCode(
        booking.tableId || 1,
        booking.tableId?.toString() || 'booking',
        restaurant.id,
        tenantId
      );

      // Create email content
      const subject = `How was your experience at ${restaurant.name}?`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">Thank you for dining with us!</h1>
            <h2 style="color: #64748b; font-weight: normal; margin-top: 0;">${restaurant.name}</h2>
          </div>
          
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 15px;">
              Hi ${booking.customerName},
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 15px;">
              We hope you enjoyed your recent visit to ${restaurant.name} on ${new Date(booking.bookingDate).toLocaleDateString()}.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 0;">
              Your feedback is incredibly valuable to us and helps us continue to improve our service. We would greatly appreciate if you could take a moment to share your experience.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: white; display: inline-block; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <p style="margin-bottom: 15px; font-weight: bold; color: #374151;">Scan to leave feedback:</p>
              <img src="cid:qrcode" alt="Feedback QR Code" style="width: 150px; height: 150px;" />
            </div>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${feedbackUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Leave Feedback Online
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
              Thank you for choosing ${restaurant.name}. We look forward to serving you again soon!
            </p>
          </div>
        </div>
      `;

      const textContent = `
        Hi ${booking.customerName},

        Thank you for dining with us at ${restaurant.name} on ${new Date(booking.bookingDate).toLocaleDateString()}.

        We hope you enjoyed your visit and would love to hear about your experience. Your feedback helps us continue to improve our service.

        Please visit this link to share your feedback: ${feedbackUrl}

        Thank you for choosing ${restaurant.name}. We look forward to serving you again soon!
      `;

      // Send email with QR code attachment
      await this.emailService.sendEmail({
        to: [{ email: booking.customerEmail, name: booking.customerName }],
        subject,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            content: qrCodeDataUrl.split(',')[1], // Remove data:image/png;base64, prefix
            filename: 'feedback-qr.png',
            type: 'image/png',
            disposition: 'inline',
            content_id: 'qrcode'
          }
        ]
      });

      console.log(`Feedback request sent to ${booking.customerEmail} for booking ${booking.id}`);
      
      // Log the activity
      await storage.createActivityLog({
        restaurantId: restaurant.id,
        tenantId,
        action: 'feedback_request_sent',
        details: `Automated feedback request sent to ${booking.customerName} (${booking.customerEmail}) for booking on ${new Date(booking.bookingDate).toLocaleDateString()}`,
        timestamp: new Date(),
      });

    } catch (error) {
      console.error(`Error sending feedback request for booking ${booking.id}:`, error);
    }
  }
}

// Export singleton instance
export const feedbackReminderService = new FeedbackReminderService();
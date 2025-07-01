
import { storage } from "./storage";
import { BrevoEmailService } from "./brevo-service";

export class ReminderService {
  private emailService: BrevoEmailService | null = null;
  private smsService: any = null;
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor() {
    try {
      this.emailService = new BrevoEmailService();
    } catch (error) {
      console.warn('Reminder service: Brevo email service not available');
    }
    
    this.initializeSMSService();
  }

  private async initializeSMSService() {
    try {
      const { twilioSMSService } = await import('./twilio-sms-service.js');
      if (twilioSMSService.isConfigured()) {
        this.smsService = twilioSMSService;
        console.log('Reminder service: Twilio SMS service initialized');
      } else {
        console.warn('Reminder service: Twilio SMS service not configured');
      }
    } catch (error) {
      console.warn('Reminder service: Failed to initialize SMS service:', error);
    }
  }

  startReminderScheduler() {
    // Check for reminders every hour
    this.reminderInterval = setInterval(() => {
      this.processReminders();
    }, 60 * 60 * 1000); // 1 hour

    console.log('Reminder scheduler started');
  }

  stopReminderScheduler() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('Reminder scheduler stopped');
    }
  }

  private async processReminders() {
    try {
      console.log('Processing booking reminders...');
      
      // Get all confirmed bookings for the next 48 hours
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setHours(twoDaysFromNow.getHours() + 48);
      
      const bookings = await storage.getUpcomingBookings(twoDaysFromNow);
      
      for (const booking of bookings) {
        const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
        const now = new Date();
        const hoursUntilBooking = Math.floor((bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        // Send reminder 24 hours before (with 1 hour tolerance)
        if (hoursUntilBooking >= 23 && hoursUntilBooking <= 25) {
          await this.sendReminder(booking, 24);
        }
        
        // Send reminder 2 hours before (with 30 minute tolerance)
        if (hoursUntilBooking >= 1.5 && hoursUntilBooking <= 2.5) {
          await this.sendReminder(booking, 2);
        }
      }
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }

  private async sendReminder(booking: any, hoursBeforeVisit: number) {
    try {
      // Check if reminder was already sent
      const reminderKey = `reminder_${booking.id}_${hoursBeforeVisit}h`;
      const alreadySent = await storage.checkReminderSent(reminderKey);
      
      if (alreadySent) return;

      // Get restaurant settings
      const restaurant = await storage.getRestaurantById(booking.restaurantId);
      let emailSettings = null;
      let smsSettings = null;
      
      if (restaurant?.emailSettings) {
        try {
          emailSettings = JSON.parse(restaurant.emailSettings);
        } catch (e) {
          console.warn("Failed to parse email settings for reminders");
        }
      }

      // Get SMS settings
      try {
        smsSettings = await storage.getSmsSettings(booking.restaurantId, booking.tenantId);
      } catch (e) {
        console.warn("Failed to get SMS settings for reminders");
      }

      // Check if reminders are enabled (default: true)
      const shouldSendEmailReminder = emailSettings?.guestSettings?.sendReminder !== false;
      const shouldSendSmsReminder = smsSettings?.reminderEnabled === true;

      if (!shouldSendEmailReminder && !shouldSendSmsReminder) return;

      // Check if this is the correct reminder timing
      const emailConfiguredHours = parseInt(emailSettings?.guestSettings?.reminderHours || "24");
      const smsConfiguredHours = parseInt(smsSettings?.reminderHours || "2");
      
      const isEmailTiming = hoursBeforeVisit === emailConfiguredHours;
      const isSmsTiming = hoursBeforeVisit === smsConfiguredHours;
      
      if (!isEmailTiming && !isSmsTiming) return;

      // Get customer details
      const customer = await storage.getCustomerById(booking.customerId);
      if (!customer) return;

      let reminderSent = false;

      // Send email reminder
      if (shouldSendEmailReminder && isEmailTiming && this.emailService && customer.email) {
        try {
          await this.emailService.sendBookingReminder(
            customer.email,
            customer.name,
            booking,
            hoursBeforeVisit
          );
          console.log(`Sent ${hoursBeforeVisit}h email reminder for booking ${booking.id}`);
          reminderSent = true;
        } catch (error) {
          console.error(`Error sending email reminder for booking ${booking.id}:`, error);
        }
      }

      // Send SMS reminder
      if (shouldSendSmsReminder && isSmsTiming && this.smsService && customer.phone) {
        try {
          const bookingDetails = {
            id: booking.id,
            restaurantName: restaurant.name,
            time: booking.time,
            guests: booking.guests
          };

          const result = await this.smsService.sendBookingReminder(
            customer.phone,
            bookingDetails,
            booking.restaurantId,
            booking.tenantId
          );

          if (result.success) {
            console.log(`Sent ${hoursBeforeVisit}h SMS reminder for booking ${booking.id}`);
            reminderSent = true;
          } else {
            console.error(`Failed to send SMS reminder for booking ${booking.id}:`, result.error);
          }
        } catch (error) {
          console.error(`Error sending SMS reminder for booking ${booking.id}:`, error);
        }
      }

      // Mark reminder as sent if any reminder was successfully sent
      if (reminderSent) {
        await storage.markReminderSent(reminderKey);
      }
      
    } catch (error) {
      console.error(`Error sending reminder for booking ${booking.id}:`, error);
    }
  }
}

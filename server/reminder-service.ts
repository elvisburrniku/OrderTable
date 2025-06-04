
import { storage } from "./storage";
import { BrevoEmailService } from "./brevo-service";

export class ReminderService {
  private emailService: BrevoEmailService | null = null;
  private reminderInterval: NodeJS.Timeout | null = null;

  constructor() {
    try {
      this.emailService = new BrevoEmailService();
    } catch (error) {
      console.warn('Reminder service: Brevo email service not available');
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
    if (!this.emailService) return;

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
    if (!this.emailService) return;

    try {
      // Check if reminder was already sent
      const reminderKey = `reminder_${booking.id}_${hoursBeforeVisit}h`;
      const alreadySent = await storage.checkReminderSent(reminderKey);
      
      if (alreadySent) return;

      // Get customer details
      const customer = await storage.getCustomerById(booking.customerId);
      if (!customer?.email) return;

      await this.emailService.sendBookingReminder(
        customer.email,
        customer.name,
        booking,
        hoursBeforeVisit
      );

      // Mark reminder as sent
      await storage.markReminderSent(reminderKey);
      
      console.log(`Sent ${hoursBeforeVisit}h reminder for booking ${booking.id}`);
    } catch (error) {
      console.error(`Error sending reminder for booking ${booking.id}:`, error);
    }
  }
}

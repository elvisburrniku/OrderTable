
import { TransactionalEmailsApi, SendSmtpEmail, ApiKeyAuth } from '@getbrevo/brevo';

export class BrevoEmailService {
  private apiInstance: TransactionalEmailsApi;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error('BREVO_API_KEY environment variable is required');
    }

    this.apiInstance = new TransactionalEmailsApi();
    this.apiInstance.setApiKey(ApiKeyAuth, apiKey);
  }

  async sendBookingConfirmation(customerEmail: string, customerName: string, bookingData: any): Promise<void> {
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email: customerEmail, name: customerName }];
    sendSmtpEmail.sender = { email: 'noreply@restaurant.com', name: 'Restaurant Booking' };
    sendSmtpEmail.subject = 'Booking Confirmation';
    sendSmtpEmail.htmlContent = `
      <h2>Booking Confirmation</h2>
      <p>Dear ${customerName},</p>
      <p>Your booking has been confirmed for ${new Date(bookingData.bookingDate).toLocaleDateString()} at ${bookingData.startTime}.</p>
      <p>Guest count: ${bookingData.guestCount}</p>
      <p>Thank you for choosing us!</p>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw error;
    }
  }

  async sendRestaurantNotification(restaurantEmail: string, bookingData: any): Promise<void> {
    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.to = [{ email: restaurantEmail }];
    sendSmtpEmail.sender = { email: 'noreply@restaurant.com', name: 'Restaurant Booking System' };
    sendSmtpEmail.subject = 'New Booking Received';
    sendSmtpEmail.htmlContent = `
      <h2>New Booking Received</h2>
      <p>Customer: ${bookingData.customerName}</p>
      <p>Email: ${bookingData.customerEmail}</p>
      <p>Phone: ${bookingData.customerPhone}</p>
      <p>Date: ${new Date(bookingData.bookingDate).toLocaleDateString()}</p>
      <p>Time: ${bookingData.startTime}</p>
      <p>Guest count: ${bookingData.guestCount}</p>
    `;

    try {
      await this.apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
      console.error('Error sending restaurant notification email:', error);
      throw error;
    }
  }

  async sendBookingConfirmation(customerEmail: string, customerName: string, bookingDetails: any) {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = "Booking Confirmation - Your reservation is confirmed";
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <h2>Booking Confirmation</h2>
          <p>Dear ${customerName},</p>
          <p>Your booking has been confirmed with the following details:</p>
          <ul>
            <li><strong>Date:</strong> ${new Date(bookingDetails.bookingDate).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${bookingDetails.startTime}</li>
            <li><strong>Party Size:</strong> ${bookingDetails.guestCount} guests</li>
            <li><strong>Table:</strong> ${bookingDetails.tableNumber || 'To be assigned'}</li>
          </ul>
          <p>We look forward to serving you!</p>
          <p>Best regards,<br>The Restaurant Team</p>
        </body>
      </html>
    `;
    
    sendSmtpEmail.sender = {
      name: "Restaurant Booking System",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com"
    };
    
    sendSmtpEmail.to = [{
      email: customerEmail,
      name: customerName
    }];

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Booking confirmation email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw error;
    }
  }

  async sendBookingReminder(customerEmail: string, customerName: string, bookingDetails: any, hoursBeforeVisit: number) {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = `Reminder: Your reservation is in ${hoursBeforeVisit} hours`;
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <h2>Booking Reminder</h2>
          <p>Dear ${customerName},</p>
          <p>This is a friendly reminder about your upcoming reservation:</p>
          <ul>
            <li><strong>Date:</strong> ${new Date(bookingDetails.bookingDate).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${bookingDetails.startTime}</li>
            <li><strong>Party Size:</strong> ${bookingDetails.guestCount} guests</li>
            <li><strong>Table:</strong> ${bookingDetails.tableNumber || 'To be assigned'}</li>
          </ul>
          <p>We're excited to see you soon!</p>
          <p>Best regards,<br>The Restaurant Team</p>
        </body>
      </html>
    `;
    
    sendSmtpEmail.sender = {
      name: "Restaurant Booking System",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com"
    };
    
    sendSmtpEmail.to = [{
      email: customerEmail,
      name: customerName
    }];

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Booking reminder email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending booking reminder email:', error);
      throw error;
    }
  }

  async sendRestaurantNotification(restaurantEmail: string, bookingDetails: any) {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = "New Booking Received";
    sendSmtpEmail.htmlContent = `
      <html>
        <body>
          <h2>New Booking Alert</h2>
          <p>A new booking has been received:</p>
          <ul>
            <li><strong>Customer:</strong> ${bookingDetails.customerName}</li>
            <li><strong>Email:</strong> ${bookingDetails.customerEmail}</li>
            <li><strong>Phone:</strong> ${bookingDetails.customerPhone || 'Not provided'}</li>
            <li><strong>Date:</strong> ${new Date(bookingDetails.bookingDate).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${bookingDetails.startTime}</li>
            <li><strong>Party Size:</strong> ${bookingDetails.guestCount} guests</li>
            <li><strong>Special Requests:</strong> ${bookingDetails.specialRequests || 'None'}</li>
          </ul>
        </body>
      </html>
    `;
    
    sendSmtpEmail.sender = {
      name: "Restaurant Booking System",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com"
    };
    
    sendSmtpEmail.to = [{
      email: restaurantEmail,
      name: "Restaurant Team"
    }];

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Restaurant notification email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending restaurant notification email:', error);
      throw error;
    }
  }
}

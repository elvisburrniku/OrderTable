
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';

export class BrevoEmailService {
  private apiInstance: TransactionalEmailsApi;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error('BREVO_API_KEY environment variable is required');
    }

    this.apiInstance = new TransactionalEmailsApi();
    
    // Set the default headers for authentication
    this.apiInstance.defaultHeaders = {
      'api-key': apiKey
    };
  }

  

  async sendBookingConfirmation(customerEmail: string, customerName: string, bookingDetails: any) {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = "Booking Confirmation - Your reservation is confirmed";
    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #16a34a; margin-bottom: 20px;">Booking Confirmation ✓</h2>
            <p>Dear ${customerName},</p>
            <p>Your booking has been <strong>confirmed</strong> with the following details:</p>
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 5px 0;"><strong>📅 Date:</strong> ${new Date(bookingDetails.bookingDate).toLocaleDateString()}</li>
                <li style="padding: 5px 0;"><strong>🕐 Time:</strong> ${bookingDetails.startTime}</li>
                <li style="padding: 5px 0;"><strong>👥 Party Size:</strong> ${bookingDetails.guestCount} guests</li>
                <li style="padding: 5px 0;"><strong>🪑 Table:</strong> ${bookingDetails.tableNumber || 'To be assigned'}</li>
                ${bookingDetails.specialRequests ? `<li style="padding: 5px 0;"><strong>📝 Special Requests:</strong> ${bookingDetails.specialRequests}</li>` : ''}
              </ul>
            </div>
            <p>We look forward to serving you!</p>
            <p>Best regards,<br><strong>The Restaurant Team</strong></p>
          </div>
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

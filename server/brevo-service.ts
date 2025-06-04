
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

  

  private generateICSContent(customerName: string, bookingDetails: any): string {
    const startDate = new Date(bookingDetails.bookingDate);
    const [hours, minutes] = bookingDetails.startTime.split(':');
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // Assume 2-hour dining duration
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Restaurant Booking System//EN',
      'BEGIN:VEVENT',
      `UID:booking-${bookingDetails.id || Date.now()}@restaurant.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:Restaurant Reservation - ${customerName}`,
      `DESCRIPTION:Restaurant reservation for ${bookingDetails.guestCount} guests${bookingDetails.specialRequests ? '\\nSpecial requests: ' + bookingDetails.specialRequests : ''}`,
      'LOCATION:Restaurant',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Restaurant reservation reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
  }

  async sendBookingConfirmation(customerEmail: string, customerName: string, bookingDetails: any) {
    const sendSmtpEmail = new SendSmtpEmail();
    
    sendSmtpEmail.subject = "Booking Confirmation";
    
    const bookingDate = new Date(bookingDetails.bookingDate);
    const formattedDate = bookingDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const [hours, minutes] = bookingDetails.startTime.split(':');
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours), parseInt(minutes));
    const formattedTime = timeDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background-color: #ffffff; padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #333; letter-spacing: -0.5px;">Booking Confirmation</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${customerName},</p>
              
              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                Thank you very much for your booking for <strong>${bookingDetails.guestCount} guests</strong>. 
                We are looking forward to your visit <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.
              </p>
              
              <!-- Booking Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #007bff;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Reservation Details</h3>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Date:</span>
                    <span style="color: #333; font-weight: 600;">${formattedDate}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Time:</span>
                    <span style="color: #333; font-weight: 600;">${formattedTime}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Party Size:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.guestCount} guests</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; ${bookingDetails.tableNumber ? 'border-bottom: 1px solid #e9ecef;' : ''}">
                    <span style="color: #666; font-weight: 500;">Table:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.tableNumber || 'To be assigned'}</span>
                  </div>
                  ${bookingDetails.specialRequests ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Special Requests:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.specialRequests}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px;">Change or cancel booking</a>
              </div>
              
              <p style="margin: 20px 0; font-size: 16px; color: #666; line-height: 1.6;">
                For other enquiries, please call <strong>+38349854504</strong>.
              </p>
              
              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">Trofta</p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
                Your personal data is processed in order to improve the customer experience. 
                You can at any time withdraw your consent or have your personal data deleted by contacting Trofta.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Generate ICS calendar file
    const icsContent = this.generateICSContent(customerName, bookingDetails);
    const icsBase64 = Buffer.from(icsContent).toString('base64');
    
    sendSmtpEmail.sender = {
      name: "Trofta",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com"
    };
    
    sendSmtpEmail.to = [{
      email: customerEmail,
      name: customerName
    }];
    
    // Add ICS calendar attachment
    sendSmtpEmail.attachment = [{
      name: `booking${bookingDetails.id || Date.now()}.ics`,
      content: icsBase64
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

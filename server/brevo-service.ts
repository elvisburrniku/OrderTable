import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo';
import { BookingHash } from './booking-hash';

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
      // Format as local time without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const second = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hour}${minute}${second}`;
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

    // Ensure booking ID is properly set
    const bookingId = bookingDetails.id || bookingDetails.bookingId;
    if (!bookingId) {
      throw new Error('Booking ID is required for generating management URLs');
    }

    // Use stored management hash or generate if not available
    const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    let manageUrl, cancelUrl;
    
    if (bookingDetails.managementHash) {
      // Use stored management hash
      manageUrl = `${baseUrl}/booking-manage/${bookingId}?hash=${bookingDetails.managementHash}`;
      cancelUrl = `${baseUrl}/booking-manage/${bookingId}?action=cancel&hash=${bookingDetails.managementHash}`;
    } else {
      // Fallback to generating new URLs
      const managementUrls = BookingHash.generateManagementUrls(
        bookingId,
        bookingDetails.tenantId,
        bookingDetails.restaurantId,
        baseUrl
      );
      manageUrl = managementUrls.manageUrl;
      cancelUrl = managementUrls.cancelUrl;
    }

    console.log(`Generated management URLs for booking ${bookingId}:`, { cancelUrl, manageUrl });

    sendSmtpEmail.subject = "Booking Confirmation";
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
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${bookingDetails.customerName || customerName},</p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                Thank you very much for your booking for <strong>${bookingDetails.guestCount} guests</strong>. 
                We are looking forward to your visit <strong>${new Date(bookingDetails.bookingDate).toLocaleDateString()}</strong> at <strong>${bookingDetails.startTime}</strong>.
              </p>

              <!-- Booking Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #007bff;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Reservation Details</h3>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Date:</span>
                    <span style="color: #333; font-weight: 600;">${new Date(bookingDetails.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Time:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.startTime}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Party Size:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.guestCount} guests</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; ${bookingDetails.tableNumber ? 'border-bottom: 1px solid #e9ecef;' : ''}">
                    <span style="color: #666; font-weight: 500;">Table:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.tableNumber || 'To be assigned'}</span>
                  </div>
                  ${bookingDetails.specialRequests || bookingDetails.notes ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Special Requests:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.specialRequests || bookingDetails.notes}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; margin: 5px;">
                  <a href="${manageUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; min-width: 140px;">Change booking</a>
                </div>
                <div style="display: inline-block; margin: 5px;">
                  <a href="${cancelUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; min-width: 140px;">Cancel booking</a>
                </div>
              </div>

              <p style="margin: 20px 0; font-size: 16px; color: #666; line-height: 1.6;">
                For other enquiries, please call <strong>+38349854504</strong>.
              </p>

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">Trofta</p>

              <!-- Booking ID at bottom -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                  booking${bookingId}
                </p>
              </div>
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

    const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log('Using sender email:', senderEmail);

    sendSmtpEmail.sender = {
      name: "Trofta",
      email: senderEmail
    };

    sendSmtpEmail.to = [{
      email: customerEmail,
      name: customerName
    }];

    // Add ICS calendar attachment
    sendSmtpEmail.attachment = [{
      name: `booking${bookingId}.ics`,
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

  async sendBookingChangeRequest(restaurantEmail: string, changeRequestDetails: any, bookingDetails: any) {
    const sendSmtpEmail = new SendSmtpEmail();

    const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    const approveHash = BookingHash.generateHash(changeRequestDetails.id, bookingDetails.tenantId, bookingDetails.restaurantId, 'change');
    const rejectHash = BookingHash.generateHash(changeRequestDetails.id, bookingDetails.tenantId, bookingDetails.restaurantId, 'cancel');

    sendSmtpEmail.subject = "Booking Change Request";
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
            <div style="background-color: #fff3cd; padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #856404; letter-spacing: -0.5px;">Booking Change Request</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">A customer has requested changes to their booking:</p>

              <!-- Original Booking Details -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #6c757d;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Original Booking</h3>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Customer:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.customerName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Date:</span>
                    <span style="color: #333; font-weight: 600;">${new Date(bookingDetails.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Time:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.startTime}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666; font-weight: 500;">Party Size:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.guestCount} guests</span>
                  </div>
                </div>
              </div>

              <!-- Requested Changes -->
              <div style="background-color: #fff3cd; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Requested Changes</h3>
                <div style="display: grid; gap: 10px;">
                  ${changeRequestDetails.requestedDate ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0d89e;">
                      <span style="color: #666; font-weight: 500;">New Date:</span>
                      <span style="color: #333; font-weight: 600;">${new Date(changeRequestDetails.requestedDate).toLocaleDateString()}</span>
                    </div>
                  ` : ''}
                  ${changeRequestDetails.requestedTime ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0d89e;">
                      <span style="color: #666; font-weight: 500;">New Time:</span>
                      <span style="color: #333; font-weight: 600;">${changeRequestDetails.requestedTime}</span>
                    </div>
                  ` : ''}
                  ${changeRequestDetails.requestedGuestCount ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0d89e;">
                      <span style="color: #666; font-weight: 500;">New Party Size:</span>
                      <span style="color: #333; font-weight: 600;">${changeRequestDetails.requestedGuestCount} guests</span>
                    </div>
                  ` : ''}
                  ${changeRequestDetails.requestNotes ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Notes:</span>
                      <span style="color: #333; font-weight: 600;">${changeRequestDetails.requestNotes}</span>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; margin: 5px;">
                  <a href="${baseUrl}/booking-change-response/${changeRequestDetails.id}?action=approve&hash=${approveHash}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; min-width: 140px;">Approve Changes</a>
                </div>
                <div style="display: inline-block; margin: 5px;">
                  <a href="${baseUrl}/booking-change-response/${changeRequestDetails.id}?action=reject&hash=${rejectHash}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; min-width: 140px;">Reject Changes</a>
                </div>
              </div>

              <p style="margin: 20px 0; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
                Click the buttons above to respond to this change request. The customer will be notified of your decision automatically.
              </p>

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">Restaurant Booking System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log('Using sender email:', senderEmail);

    sendSmtpEmail.sender = {
      name: "Restaurant Booking System",
      email: senderEmail
    };

    sendSmtpEmail.to = [{
      email: restaurantEmail,
      name: "Restaurant Team"
    }];

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Booking change request email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending booking change request email:', error);
      throw error;
    }
  }

  async sendChangeRequestResponse(customerEmail: string, customerName: string, approved: boolean, bookingDetails: any, changeDetails: any, restaurantResponse?: string) {
    const sendSmtpEmail = new SendSmtpEmail();

    const baseUrl = process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    const cancelHash = BookingHash.generateHash(bookingDetails.id, bookingDetails.tenantId, bookingDetails.restaurantId, 'cancel');

    sendSmtpEmail.subject = approved ? "Booking Changes Approved" : "Booking Changes Rejected";
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
            <div style="background-color: ${approved ? '#d4edda' : '#f8d7da'}; padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: ${approved ? '#155724' : '#721c24'}; letter-spacing: -0.5px;">
                ${approved ? 'Changes Approved' : 'Changes Rejected'}
              </h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${customerName},</p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                ${approved 
                  ? 'Great news! Your requested booking changes have been approved by the restaurant.'
                  : 'We apologize, but your requested booking changes could not be approved at this time.'
                }
              </p>

              ${approved ? `
                <!-- Updated Booking Details -->
                <div style="background-color: #d4edda; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #28a745;">
                  <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Updated Booking Details</h3>
                  <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c3e6cb;">
                      <span style="color: #666; font-weight: 500;">Date:</span>
                      <span style="color: #333; font-weight: 600;">${changeDetails.requestedDate ? new Date(changeDetails.requestedDate).toLocaleDateString() : new Date(bookingDetails.bookingDate).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c3e6cb;">
                      <span style="color: #666; font-weight: 500;">Time:</span>
                      <span style="color: #333; font-weight: 600;">${changeDetails.requestedTime || bookingDetails.startTime}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Party Size:</span>
                      <span style="color: #333; font-weight: 600;">${changeDetails.requestedGuestCount || bookingDetails.guestCount} guests</span>
                    </div>
                  </div>
                </div>
              ` : `
                <!-- Original Booking Remains -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #6c757d;">
                  <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Your Original Booking Remains</h3>
                  <div style="display: grid; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                      <span style="color: #666; font-weight: 500;">Date:</span>
                      <span style="color: #333; font-weight: 600;">${new Date(bookingDetails.bookingDate).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                      <span style="color: #666; font-weight: 500;">Time:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.startTime}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Party Size:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.guestCount} guests</span>
                    </div>
                  </div>
                </div>

                <!-- Option to Cancel -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/booking-manage/${bookingDetails.id}?action=cancel&hash=${cancelHash}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Cancel Booking</a>
                </div>
              `}

              ${restaurantResponse ? `
                <div style="background-color: #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
                  <h4 style="margin: 0 0 10px; color: #333;">Message from Restaurant:</h4>
                  <p style="margin: 0; color: #666; font-style: italic;">"${restaurantResponse}"</p>
                </div>
              ` : ''}

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">Trofta</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log('Using sender email:', senderEmail);

    sendSmtpEmail.sender = {
      name: "Trofta",
      email: senderEmail
    };

    sendSmtpEmail.to = [{
      email: customerEmail,
      name: customerName
    }];

    try {
      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Change request response email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending change request response email:', error);
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

  async sendContactFormNotification(contactData: any) {
    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = `New Contact Form Submission: ${contactData.subject}`;
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
            <div style="background-color: #007bff; padding: 30px 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white; letter-spacing: -0.5px;">New Contact Form Submission</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 20px; font-size: 18px; color: #333; font-weight: 600;">Contact Details</h3>
                
                <div style="display: grid; gap: 15px;">
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Name:</span>
                    <span style="color: #333; font-weight: 600;">${contactData.name}</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Email:</span>
                    <span style="color: #333; font-weight: 600;">${contactData.email}</span>
                  </div>
                  
                  ${contactData.company ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                      <span style="color: #666; font-weight: 500;">Company:</span>
                      <span style="color: #333; font-weight: 600;">${contactData.company}</span>
                    </div>
                  ` : ''}
                  
                  ${contactData.phone ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                      <span style="color: #666; font-weight: 500;">Phone:</span>
                      <span style="color: #333; font-weight: 600;">${contactData.phone}</span>
                    </div>
                  ` : ''}
                  
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Category:</span>
                    <span style="color: #333; font-weight: 600;">${contactData.category}</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Subject:</span>
                    <span style="color: #333; font-weight: 600;">${contactData.subject}</span>
                  </div>
                </div>
              </div>

              <!-- Message -->
              <div style="background-color: #e3f2fd; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Message</h3>
                <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${contactData.message}</p>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Please respond to this inquiry within 24 hours for best customer experience.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    sendSmtpEmail.sender = {
      name: "MozRest Contact Form",
      email: process.env.BREVO_SENDER_EMAIL || "no-reply@mozrest.com"
    };

    sendSmtpEmail.to = [{
      email: process.env.CONTACT_NOTIFICATION_EMAIL || "support@mozrest.com",
      name: "MozRest Support"
    }];

    // Also send auto-reply to customer
    const autoReply = new SendSmtpEmail();
    autoReply.subject = "Thank you for contacting MozRest";
    autoReply.htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px;">
            <h2 style="color: #007bff; margin-bottom: 20px;">Thank you for contacting us!</h2>
            
            <p>Hi ${contactData.name},</p>
            
            <p>We've received your message regarding: <strong>${contactData.subject}</strong></p>
            
            <p>Our team will review your inquiry and respond within 24 hours. If your matter is urgent, please call us directly.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px;">Your message:</h3>
              <p style="margin: 0; color: #666; font-style: italic;">"${contactData.message}"</p>
            </div>
            
            <p>Best regards,<br>The MozRest Team</p>
          </div>
        </body>
      </html>
    `;

    autoReply.sender = {
      name: "MozRest Support",
      email: process.env.BREVO_SENDER_EMAIL || "no-reply@mozrest.com"
    };

    autoReply.to = [{
      email: contactData.email,
      name: contactData.name
    }];

    try {
      // Send notification to support team
      const supportResult = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Contact form notification sent to support:', supportResult);

      // Send auto-reply to customer
      const customerResult = await this.apiInstance.sendTransacEmail(autoReply);
      console.log('Contact form auto-reply sent to customer:', customerResult);

      return { supportResult, customerResult };
    } catch (error) {
      console.error('Error sending contact form emails:', error);
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
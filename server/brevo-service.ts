import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";
import { BookingHash } from "./booking-hash";
import { PaymentTokenService } from "./payment-token-service";
import { systemSettings } from "./system-settings";

export class BrevoEmailService {
  private apiInstance: TransactionalEmailsApi | null = null;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    this.isEnabled = !!apiKey;

    if (apiKey) {
      this.apiInstance = new TransactionalEmailsApi();
      // Set the default headers for authentication
      this.apiInstance.defaultHeaders = {
        "api-key": apiKey,
      };
    } else {
      console.log("BREVO_API_KEY not found - email notifications disabled");
    }
  }

  private async checkEnabled(): Promise<boolean> {
    if (!this.isEnabled || !this.apiInstance) {
      console.log("Email service not enabled - skipping email notification");
      return false;
    }

    // Check system settings for email notifications
    const emailNotificationsEnabled = await systemSettings.isFeatureEnabled(
      "enable_email_notifications",
    );
    if (!emailNotificationsEnabled) {
      console.log("Email notifications disabled in system settings");
      return false;
    }

    return true;
  }

  private generateInvoiceHTML(bookingDetails: any, restaurantDetails: any): string {
    const formatCurrency = (amount: number | string, currency: string = 'EUR') => {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2
      }).format(numAmount);
    };

    const formatDate = (date: string | Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatDateTime = (date: string | Date) => {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return `
      <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #16a34a; margin-bottom: 5px;">Payment Invoice</h2>
          <p style="color: #666; margin: 0;">Invoice #${bookingDetails.id.toString().padStart(6, '0')}</p>
          <div style="display: inline-block; background: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 10px;">
            ✓ PAID
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div>
            <h3 style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">From</h3>
            <p style="font-weight: bold; margin: 0; margin-bottom: 5px;">${restaurantDetails?.name || 'Restaurant'}</p>
            ${restaurantDetails?.address ? `<p style="margin: 0; color: #666; font-size: 14px;">${restaurantDetails.address}</p>` : ''}
            ${restaurantDetails?.phone ? `<p style="margin: 0; color: #666; font-size: 14px;">${restaurantDetails.phone}</p>` : ''}
            ${restaurantDetails?.email ? `<p style="margin: 0; color: #666; font-size: 14px;">${restaurantDetails.email}</p>` : ''}
          </div>
          
          <div>
            <h3 style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 10px;">To</h3>
            <p style="font-weight: bold; margin: 0; margin-bottom: 5px;">${bookingDetails.customerName}</p>
            <p style="margin: 0; color: #666; font-size: 14px;">${bookingDetails.customerEmail}</p>
            ${bookingDetails.customerPhone ? `<p style="margin: 0; color: #666; font-size: 14px;">${bookingDetails.customerPhone}</p>` : ''}
          </div>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-bottom: 20px;">
          <h3 style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 15px;">Booking Details</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">Date</p>
              <p style="margin: 0; font-weight: 500;">${formatDate(bookingDetails.bookingDate)}</p>
            </div>
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">Time</p>
              <p style="margin: 0; font-weight: 500;">${bookingDetails.startTime}</p>
            </div>
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">Party Size</p>
              <p style="margin: 0; font-weight: 500;">${bookingDetails.guestCount} guests</p>
            </div>
            <div>
              <p style="margin: 0; color: #666; font-size: 12px;">Booking ID</p>
              <p style="margin: 0; font-weight: 500;">#${bookingDetails.id}</p>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-bottom: 20px;">
          <h3 style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 15px;">Payment Summary</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Booking Payment</span>
            <span style="font-weight: 500;">${formatCurrency(bookingDetails.paymentAmount || 0, 'EUR')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Payment Processing</span>
            <span style="font-weight: 500;">€0.00</span>
          </div>
          <div style="border-top: 1px solid #e0e0e0; padding-top: 10px; display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">Total Paid</span>
            <span style="font-weight: bold; font-size: 18px;">${formatCurrency(bookingDetails.paymentAmount || 0, 'EUR')}</span>
          </div>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <h3 style="color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 15px;">Payment Information</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Payment Method</span>
              <span style="font-weight: 500;">Credit Card</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Transaction ID</span>
              <span style="font-weight: 500; font-family: monospace;">${bookingDetails.paymentIntentId || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Payment Date</span>
              <span style="font-weight: 500;">${formatDateTime(bookingDetails.paymentPaidAt)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #666;">Status</span>
              <span style="color: #16a34a; font-weight: 500;">Paid</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 12px; margin: 0;">Thank you for your payment!</p>
        </div>
      </div>
    `;
  }

  private generateICSContent(
    customerName: string,
    bookingDetails: any,
  ): string {
    const startDate = new Date(bookingDetails.bookingDate);
    const [hours, minutes] = bookingDetails.startTime.split(":");
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // Assume 2-hour dining duration

    const formatDate = (date: Date) => {
      // Format as local time without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      const second = String(date.getSeconds()).padStart(2, "0");
      return `${year}${month}${day}T${hour}${minute}${second}`;
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Restaurant Booking System//EN",
      "BEGIN:VEVENT",
      `UID:booking-${bookingDetails.id || Date.now()}@restaurant.com`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:Restaurant Reservation - ${customerName}`,
      `DESCRIPTION:Restaurant reservation for ${bookingDetails.guestCount} guests${bookingDetails.specialRequests ? "\\nSpecial requests: " + bookingDetails.specialRequests : ""}`,
      "LOCATION:Restaurant",
      "STATUS:CONFIRMED",
      "BEGIN:VALARM",
      "TRIGGER:-PT30M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Restaurant reservation reminder",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return icsContent;
  }

  async sendBookingConfirmation(
    customerEmail: string,
    customerName: string,
    bookingDetails: any,
    restaurantDetails?: any,
  ) {
    // Get restaurant settings for email customization
    let settings = {};
    let fromEmail = "noreply@booking.com";
    let fromName = bookingDetails.restaurantName || "Restaurant";
    
    try {
      const { SettingsIntegration } = await import('./settings-integration.js');
      const settingsService = new SettingsIntegration();
      settings = await settingsService.getRestaurantSettings(
        bookingDetails.restaurantId || restaurantDetails?.id,
        bookingDetails.tenantId
      );
      
      // Use custom email settings if available
      const emailSettings = (settings as any)?.emailSettings || {};
      if (emailSettings.fromEmail) fromEmail = emailSettings.fromEmail;
      if (emailSettings.fromName) fromName = emailSettings.fromName;
    } catch (error) {
      console.warn("Could not load restaurant settings for email:", error);
    }

    const subject = `Booking Confirmation - ${fromName}`;

    // Generate management and cancel URLs
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const bookingId = bookingDetails.id;
    const manageUrl = `${baseUrl}/manage-booking/${bookingId}/${bookingDetails.managementHash || bookingDetails.hash}`;
    const cancelUrl = `${baseUrl}/cancel-booking/${bookingId}/${bookingDetails.managementHash || bookingDetails.hash}`;

    // Only show payment section if payment is required AND not yet paid
    const isPaymentRequired =
      bookingDetails.requiresPayment || bookingDetails.paymentRequired;
    const isPaymentPaid =
      bookingDetails.paymentStatus === "paid" || bookingDetails.paymentPaidAt;
    const showPaymentSection = isPaymentRequired && !isPaymentPaid;

    const paymentSection = showPaymentSection
      ? `
      <div style="background-color: #fff3cd; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #ffc107;">
        <h3 style="margin: 0 0 15px; font-size: 18px; color: #856404; font-weight: 600;">Payment Required</h3>
        <div style="display: grid; gap: 10px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5e79e;">
            <span style="color: #856404; font-weight: 500;">Amount:</span>
            <span style="color: #856404; font-weight: 600;">€${bookingDetails.paymentAmount || "0.00"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5e79e;">
            <span style="color: #856404; font-weight: 500;">Payment Deadline:</span>
            <span style="color: #856404; font-weight: 600;">${bookingDetails.paymentDeadlineHours || bookingDetails.paymentDeadline || 24} hours before booking</span>
          </div>
          ${
            bookingDetails.requiresPayment && bookingDetails.paymentAmount
              ? `
            <div style="text-align: center; margin-top: 15px;">
              <a href="${PaymentTokenService.generateSecurePaymentUrl(
                bookingDetails.id,
                bookingDetails.tenantId,
                bookingDetails.restaurantId,
                bookingDetails.paymentAmount,
                "EUR",
                baseUrl,
              )}" style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Complete Payment Now
              </a>
              <p style="margin: 10px 0 0; font-size: 12px; color: #856404;">
                Click the button above to securely complete your payment
              </p>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `
      : isPaymentRequired && isPaymentPaid
        ? `
      <div style="background-color: #d4edda; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #28a745;">
        <h3 style="margin: 0 0 15px; font-size: 18px; color: #155724; font-weight: 600;">Payment Confirmed</h3>
        <div style="display: grid; gap: 10px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #c3e6cb;">
            <span style="color: #155724; font-weight: 500;">Amount Paid:</span>
            <span style="color: #155724; font-weight: 600;">€${bookingDetails.paymentAmount || "0.00"}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: #155724; font-weight: 500;">Status:</span>
            <span style="color: #155724; font-weight: 600;">✓ Payment Confirmed</span>
          </div>
        </div>
      </div>
      
      <!-- Payment Invoice Section -->
      ${isPaymentRequired && isPaymentPaid ? this.generateInvoiceHTML(bookingDetails, restaurantDetails) : ''}
    `
        : "";

    const htmlContent = `
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
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; ${bookingDetails.tableNumber ? "border-bottom: 1px solid #e9ecef;" : ""}">
                    <span style="color: #666; font-weight: 500;">Table:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.tableNumber || "To be assigned"}</span>
                  </div>
                  ${
                    bookingDetails.specialRequests || bookingDetails.notes
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Special Requests:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.specialRequests || bookingDetails.notes}</span>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>

              <!-- Payment Section -->
              ${paymentSection}

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
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">${bookingDetails.restaurantName || "Restaurant"}</p>

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
                You can at any time withdraw your consent or have your personal data deleted by contacting ${bookingDetails.restaurantName || "Restaurant"}.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Generate ICS calendar file
    const icsContent = this.generateICSContent(customerName, bookingDetails);
    const icsBase64 = Buffer.from(icsContent).toString("base64");

    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log("Using sender email:", senderEmail);

    const sendSmtpEmail = new SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: bookingDetails.restaurantName || "Restaurant",
      email: senderEmail,
    };

    sendSmtpEmail.to = [
      {
        email: customerEmail,
        name: customerName,
      },
    ];

    // Add ICS calendar attachment
    sendSmtpEmail.attachment = [
      {
        name: `booking${bookingId}.ics`,
        content: icsBase64,
      },
    ];

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Booking confirmation email sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending booking confirmation email:", error);
      throw error;
    }
  }

  async sendBookingChangeRequest(
    restaurantEmail: string,
    changeRequestDetails: any,
    bookingDetails: any,
  ) {
    if (!this.checkEnabled()) return;

    const sendSmtpEmail = new SendSmtpEmail();

    const baseUrl =
      process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";
    const approveHash = BookingHash.generateHash(
      changeRequestDetails.id,
      bookingDetails.tenantId,
      bookingDetails.restaurantId,
      "approve",
    );
    const rejectHash = BookingHash.generateHash(
      changeRequestDetails.id,
      bookingDetails.tenantId,
      bookingDetails.restaurantId,
      "reject",
    );

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
                  ${
                    changeRequestDetails.requestedDate
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0d89e;">
                      <span style="color: #666; font-weight: 500;">New Date:</span>
                      <span style="color: #333; font-weight: 600;">${new Date(changeRequestDetails.requestedDate).toLocaleDateString()}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    changeRequestDetails.requestedTime
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0d89e;">
                      <span style="color: #666; font-weight: 500;">New Time:</span>
                      <span style="color: #333; font-weight: 600;">${changeRequestDetails.requestedTime}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    changeRequestDetails.requestedGuestCount
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0d89e;">
                      <span style="color: #666; font-weight: 500;">New Party Size:</span>
                      <span style="color: #333; font-weight: 600;">${changeRequestDetails.requestedGuestCount} guests</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    changeRequestDetails.requestNotes
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #666; font-weight: 500;">Notes:</span>
                      <span style="color: #333; font-weight: 600;">${changeRequestDetails.requestNotes}</span>
                    </div>
                  `
                      : ""
                  }
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

    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log("Using sender email:", senderEmail);

    sendSmtpEmail.sender = {
      name: "Restaurant Booking System",
      email: senderEmail,
    };

    sendSmtpEmail.to = [
      {
        email: restaurantEmail,
        name: "Restaurant Team",
      },
    ];

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Booking change request email sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending booking change request email:", error);
      throw error;
    }
  }

  async sendChangeRequestResponse(
    customerEmail: string,
    customerName: string,
    approved: boolean,
    bookingDetails: any,
    changeDetails: any,
    restaurantResponse?: string,
  ) {
    if (!this.checkEnabled()) return;

    const sendSmtpEmail = new SendSmtpEmail();

    const baseUrl =
      process.env.APP_BASE_URL || process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";

    // Use stored management hash for cancel URL
    let cancelUrl = "";
    if (bookingDetails.managementHash) {
      cancelUrl = `${baseUrl}/booking-manage/${bookingDetails.id}?action=cancel&hash=${bookingDetails.managementHash}`;
    } else {
      // Fallback to generating new hash
      const cancelHash = BookingHash.generateHash(
        bookingDetails.id,
        bookingDetails.tenantId,
        bookingDetails.restaurantId,
        "cancel",
      );
      cancelUrl = `${baseUrl}/booking-manage/${bookingDetails.id}?action=cancel&hash=${cancelHash}`;
    }

    sendSmtpEmail.subject = approved
      ? "Booking Changes Approved"
      : "Booking Changes Rejected";
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
            <div style="background-color: ${approved ? "#d4edda" : "#f8d7da"}; padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: ${approved ? "#155724" : "#721c24"}; letter-spacing: -0.5px;">
                ${approved ? "Changes Approved" : "Changes Rejected"}
              </h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${customerName},</p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                ${
                  approved
                    ? "Great news! Your requested booking changes have been approved by the restaurant."
                    : "We apologize, but your requested booking changes could not be approved at this time."
                }
              </p>

              ${
                approved
                  ? `
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
              `
                  : `
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
                  <a href="${cancelUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Cancel Booking</a>
                </div>
              `
              }

              ${
                restaurantResponse
                  ? `
                <div style="background-color: #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
                  <h4 style="margin: 0 0 10px; color: #333;">Message from Restaurant:</h4>
                  <p style="margin: 0; color: #666; font-style: italic;">"${restaurantResponse}"</p>
                </div>
              `
                  : ""
              }

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">${bookingDetails.restaurantName || "Restaurant"}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log("Using sender email:", senderEmail);

    sendSmtpEmail.sender = {
      name: bookingDetails.restaurantName || "Restaurant",
      email: senderEmail,
    };

    sendSmtpEmail.to = [
      {
        email: customerEmail,
        name: customerName,
      },
    ];

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Change request response email sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending change request response email:", error);
      throw error;
    }
  }



  async sendPaymentReminder(reminderData: any) {
    if (!(await this.checkEnabled())) return false;

    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = `Payment Reminder for Your Reservation at ${reminderData.restaurantName}`;
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
            <div style="background-color: #ffc107; padding: 30px 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #212529; letter-spacing: -0.5px;">Payment Reminder</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${reminderData.customerName},</p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                This is a friendly reminder that your payment for the following reservation is still pending:
              </p>

              <!-- Booking Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Reservation Details</h3>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Restaurant:</span>
                    <span style="color: #333; font-weight: 600;">${reminderData.restaurantName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Date:</span>
                    <span style="color: #333; font-weight: 600;">${new Date(reminderData.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Time:</span>
                    <span style="color: #333; font-weight: 600;">${reminderData.startTime}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Party Size:</span>
                    <span style="color: #333; font-weight: 600;">${reminderData.guestCount} guests</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666; font-weight: 500;">Amount Due:</span>
                    <span style="color: #dc3545; font-weight: 600; font-size: 18px;">€${reminderData.paymentAmount}</span>
                  </div>
                </div>
              </div>

              <!-- Payment Status Card -->
              <div style="background-color: #fff3cd; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #856404; font-weight: 600;">⚠️ Payment Required</h3>
                <p style="margin: 0; color: #856404; line-height: 1.6;">
                  Please complete your payment to secure your reservation. You can pay online using our secure payment system.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${reminderData.paymentUrl || '#'}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                  Complete Payment Now
                </a>
              </div>

              <p style="margin: 30px 0 20px; font-size: 16px; color: #666; line-height: 1.6;">
                If you have any questions about your payment or need assistance, please don't hesitate to contact us.
              </p>

              ${reminderData.paymentUrl ? `
              <!-- Plain Text Payment Link -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #17a2b8;">
                <h4 style="margin: 0 0 10px; font-size: 16px; color: #333; font-weight: 600;">🔗 Payment Link</h4>
                <p style="margin: 0 0 10px; font-size: 14px; color: #666;">You can also copy and paste this link into your browser:</p>
                <p style="margin: 0; font-size: 12px; color: #007bff; word-break: break-all; font-family: monospace; background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6;">
                  ${reminderData.paymentUrl}
                </p>
              </div>
              ` : ''}

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">${reminderData.restaurantName}</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
                This is an automated payment reminder for your reservation.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    sendSmtpEmail.sender = {
      name: reminderData.restaurantName || "Restaurant System",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com",
    };

    sendSmtpEmail.to = [
      {
        email: reminderData.customerEmail,
        name: reminderData.customerName,
      },
    ];

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Payment reminder email sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending payment reminder email:", error);
      return false;
    }
  }

  /**
   * Generate ICS calendar attachment for booking
   */
  private generateICSCalendar(reminderData: any): string {
    const startDate = new Date(`${reminderData.bookingDate}T${reminderData.startTime}`);
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hours duration
    
    // Format dates to ICS format (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Restaurant Booking System//Event//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:booking-${Date.now()}@restaurant.com`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:Dinner at ${reminderData.restaurantName}`,
      `DESCRIPTION:Restaurant reservation for ${reminderData.guestCount} guests at ${reminderData.restaurantName}`,
      `LOCATION:${reminderData.restaurantName}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'DESCRIPTION:Reminder: Dinner reservation in 15 minutes',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  // Overloaded method to support old signature
  async sendBookingReminder(
    customerEmailOrData: string | any,
    customerName?: string,
    bookingDetails?: any,
    hoursBeforeVisit?: number,
  ) {
    if (!(await this.checkEnabled())) return false;

    // Handle both old signature and new object-based signature
    let reminderData;
    if (typeof customerEmailOrData === 'object') {
      // New signature - called with reminderData object
      reminderData = customerEmailOrData;
    } else {
      // Old signature - called with individual parameters
      reminderData = {
        customerEmail: customerEmailOrData,
        customerName,
        restaurantName: bookingDetails?.restaurantName,
        bookingDate: bookingDetails?.bookingDate,
        startTime: bookingDetails?.startTime,
        guestCount: bookingDetails?.guestCount,
      };
      hoursBeforeVisit = hoursBeforeVisit || 2; // Default to 2 hours
    }

    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = `Reminder: Your reservation at ${reminderData.restaurantName}`;
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
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: white; letter-spacing: -0.5px;">Booking Reminder</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${reminderData.customerName},</p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                This is a friendly reminder about your upcoming reservation:
              </p>

              <!-- Booking Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #007bff;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Reservation Details</h3>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Restaurant:</span>
                    <span style="color: #333; font-weight: 600;">${reminderData.restaurantName}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Date:</span>
                    <span style="color: #333; font-weight: 600;">${new Date(reminderData.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                    <span style="color: #666; font-weight: 500;">Time:</span>
                    <span style="color: #333; font-weight: 600;">${reminderData.startTime}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666; font-weight: 500;">Party Size:</span>
                    <span style="color: #333; font-weight: 600;">${reminderData.guestCount} guests</span>
                  </div>
                </div>
              </div>

              <!-- Calendar Notice -->
              <div style="background-color: #e7f3ff; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #007bff;">
                <h4 style="margin: 0 0 10px; font-size: 16px; color: #333; font-weight: 600;">📅 Add to Your Calendar</h4>
                <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
                  We've attached a calendar file (.ics) to this email so you can easily add this reservation to your calendar. 
                  Simply open the attachment or click on it to add the event to your calendar app.
                </p>
              </div>

              <p style="margin: 30px 0 20px; font-size: 16px; color: #666; line-height: 1.6;">
                We're excited to see you soon! If you need to make any changes to your reservation, please contact us as soon as possible.
              </p>

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">${reminderData.restaurantName}</p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.5; text-align: center;">
                This is an automated reminder for your upcoming reservation.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    sendSmtpEmail.sender = {
      name: reminderData.restaurantName || "Restaurant System",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com",
    };

    sendSmtpEmail.to = [
      {
        email: reminderData.customerEmail,
        name: reminderData.customerName,
      },
    ];

    // Add ICS calendar attachment for booking reminders
    try {
      const icsContent = this.generateICSCalendar(reminderData);
      const icsBuffer = Buffer.from(icsContent, 'utf8');
      const icsBase64 = icsBuffer.toString('base64');
      
      sendSmtpEmail.attachment = [
        {
          content: icsBase64,
          name: `reservation-${reminderData.restaurantName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.ics`,
          type: 'text/calendar'
        }
      ];
    } catch (icsError) {
      console.log("Could not generate ICS attachment:", icsError);
      // Continue without attachment if ICS generation fails
    }

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Booking reminder email sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending booking reminder email:", error);
      return false;
    }
  }

  async sendContactFormNotification(contactData: any) {
    if (!this.checkEnabled()) return;

    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = `New Contact Form Submission: ${contactData.subject}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">          <meta name="viewport          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

                  ${
                    contactData.company
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                      <span style="color: #666; font-weight: 500;">Company:</span>
                      <span style="color: #333; font-weight: 600;">${contactData.company}</span>
                    </div>
                  `
                      : ""
                  }

                  ${
                    contactData.phone
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                      <span style="color: #666; font-weight: 500;">Phone:</span>
                      <span style="color: #333; font-weight: 600;">${contactData.phone}</span>
                    </div>
                  `
                      : ""
                  }

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
      email: process.env.BREVO_SENDER_EMAIL || "no-reply@mozrest.com",
    };

    sendSmtpEmail.to = [
      {
        email: process.env.CONTACT_NOTIFICATION_EMAIL || "support@mozrest.com",
        name: "MozRest Support",
      },
    ];

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
      email: process.env.BREVO_SENDER_EMAIL || "no-reply@mozrest.com",
    };

    autoReply.to = [
      {
        email: contactData.email,
        name: contactData.name,
      },
    ];

    try {
      // Send notification to support team
      const supportResult =
        await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Contact form notification sent to support:", supportResult);

      // Send auto-reply to customer
      const customerResult =
        await this.apiInstance!.sendTransacEmail(autoReply);
      console.log("Contact form auto-reply sent to customer:", customerResult);

      return { supportResult, customerResult };
    } catch (error) {
      console.error("Error sending contact form emails:", error);
      throw error;
    }
  }

  async sendRestaurantNotification(
    restaurantEmail: string,
    bookingDetails: any,
  ) {
    if (!this.checkEnabled()) return;

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
            <li><strong>Phone:</strong> ${bookingDetails.customerPhone || "Not provided"}</li>
            <li><strong>Date:</strong> ${new Date(bookingDetails.bookingDate).toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${bookingDetails.startTime}</li>
            <li><strong>Party Size:</strong> ${bookingDetails.guestCount} guests</li>
            <li><strong>Special Requests:</strong> ${bookingDetails.specialRequests || "None"}</li>
          </ul>
        </body>
      </html>
    `;

    sendSmtpEmail.sender = {
      name: "Restaurant Booking System",
      email: process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com",
    };

    sendSmtpEmail.to = [
      {
        email: restaurantEmail,
        name: "Restaurant Team",
      },
    ];

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Restaurant notification email sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending restaurant notification email:", error);
      throw error;
    }
  }

  async sendSubscriptionChangeNotification(subscriptionData: {
    tenantName: string;
    customerEmail: string;
    customerName: string;
    action: "upgrade" | "downgrade" | "cancel" | "reactivate";
    fromPlan: string;
    toPlan?: string;
    amount?: number;
    currency?: string;
  }) {
    if (!this.checkEnabled()) return;

    const sendSmtpEmail = new SendSmtpEmail();

    const actionText = {
      upgrade: "upgraded",
      downgrade: "downgraded",
      cancel: "cancelled",
      reactivate: "reactivated",
    }[subscriptionData.action];

    const planChangeText = subscriptionData.toPlan
      ? `from ${subscriptionData.fromPlan} to ${subscriptionData.toPlan}`
      : `their ${subscriptionData.fromPlan} subscription`;

    sendSmtpEmail.subject = `Subscription ${actionText} - ${subscriptionData.tenantName}`;
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
            <div style="background-color: #e3f2fd; padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1976d2; letter-spacing: -0.5px;">Subscription ${actionText}</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">A customer has ${actionText} their subscription:</p>

              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #1976d2;">Customer Details</h3>
                <p style="margin: 0 0 8px; color: #333;"><strong>Restaurant:</strong> ${subscriptionData.tenantName}</p>
                <p style="margin: 0 0 8px; color: #333;"><strong>Customer:</strong> ${subscriptionData.customerName}</p>
                <p style="margin: 0 0 8px; color: #333;"><strong>Email:</strong> ${subscriptionData.customerEmail}</p>
                <p style="margin: 0 0 8px; color: #333;"><strong>Action:</strong> ${planChangeText}</p>
                ${subscriptionData.amount ? `<p style="margin: 0; color: #333;"><strong>Amount:</strong> ${subscriptionData.currency || "$"}${subscriptionData.amount}</p>` : ""}
              </div>

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">This notification was sent automatically from the subscription management system.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";

    sendSmtpEmail.sender = {
      name: "Restaurant Management System",
      email: senderEmail,
    };

    const adminEmail = process.env.ADMIN_EMAIL || "admin@restaurant.com";

    sendSmtpEmail.to = [
      {
        email: adminEmail,
        name: "System Administrator",
      },
    ];

    console.log(`Sending subscription notification email:`, {
      to: adminEmail,
      from: senderEmail,
      action: subscriptionData.action,
      restaurant: subscriptionData.tenantName,
      subject: sendSmtpEmail.subject,
    });

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log(
        `Subscription change notification sent successfully to ${adminEmail}:`,
        {
          messageId: result.body?.messageId,
          action: subscriptionData.action,
          restaurant: subscriptionData.tenantName,
          from: senderEmail,
          subject: sendSmtpEmail.subject,
          brevoResponse: result.response?.statusCode,
        },
      );
      return result;
    } catch (error) {
      console.error(
        `Error sending subscription change notification to ${adminEmail}:`,
        error,
      );
      throw error;
    }
  }

  async sendEmail(emailData: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachment?: Array<{ content: string; name: string }>;
  }) {
    if (!this.checkEnabled()) {
      return;
    }

    const sendSmtpEmail = new SendSmtpEmail();
    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";

    sendSmtpEmail.sender = { email: senderEmail, name: "Restaurant System" };
    sendSmtpEmail.to = emailData.to;
    sendSmtpEmail.subject = emailData.subject;
    sendSmtpEmail.htmlContent = emailData.htmlContent;

    if (emailData.textContent) {
      sendSmtpEmail.textContent = emailData.textContent;
    }

    if (emailData.attachment) {
      sendSmtpEmail.attachment = emailData.attachment;
    }

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log(
        `Email sent successfully to ${emailData.to.map((t) => t.email).join(", ")}:`,
        {
          messageId: result.body?.messageId,
          subject: emailData.subject,
          brevoResponse: result.response?.statusCode,
        },
      );
      return result;
    } catch (error) {
      console.error(
        `Error sending email to ${emailData.to.map((t) => t.email).join(", ")}:`,
        error,
      );
      throw error;
    }
  }

  async sendPrintOrderConfirmation(customerEmail: string, orderDetails: any) {
    if (!this.checkEnabled()) {
      return;
    }

    const sendSmtpEmail = new SendSmtpEmail();
    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";

    sendSmtpEmail.sender = {
      email: senderEmail,
      name: "Restaurant Print Services",
    };
    sendSmtpEmail.to = [
      { email: customerEmail, name: orderDetails.customerName },
    ];
    sendSmtpEmail.subject = `Print Order Confirmation - ${orderDetails.orderNumber}`;

    const estimatedCompletion = new Date(
      orderDetails.estimatedCompletion,
    ).toLocaleDateString();
    const totalAmount = (orderDetails.totalAmount / 100).toFixed(2);

    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Print Order Confirmed</h1>
              <p style="font-size: 18px; color: #666;">Order #${orderDetails.orderNumber}</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1f2937; margin-top: 0;">Order Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">Print Type:</td>
                  <td style="padding: 8px 0; text-transform: capitalize;">${orderDetails.printType}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">Size & Quality:</td>
                  <td style="padding: 8px 0;">${orderDetails.printSize} - ${orderDetails.printQuality}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">Quantity:</td>
                  <td style="padding: 8px 0;">${orderDetails.quantity} copies</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-weight: bold;">Delivery Method:</td>
                  <td style="padding: 8px 0; text-transform: capitalize;">${orderDetails.deliveryMethod}</td>
                </tr>
                ${orderDetails.rushOrder ? '<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold;">Rush Order:</td><td style="padding: 8px 0; color: #dc2626;">Yes (+50% fee)</td></tr>' : ""}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; font-size: 18px;">Total Paid:</td>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #059669;">$${totalAmount}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 20px;">
              <h3 style="color: #065f46; margin-top: 0;">Production Timeline</h3>
              <p style="margin: 0; color: #047857;">
                <strong>Estimated Completion:</strong> ${estimatedCompletion}<br>
                ${orderDetails.rushOrder ? "Your rush order will be prioritized and completed within 24 hours." : "Standard processing time is 2-3 business days."}
              </p>
            </div>

            ${
              orderDetails.deliveryAddress
                ? `
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #374151; margin-top: 0;">Delivery Information</h3>
              <p style="margin: 0; color: #6b7280;">${orderDetails.deliveryAddress}</p>
            </div>
            `
                : ""
            }

            ${
              orderDetails.specialInstructions
                ? `
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #92400e; margin-top: 0;">Special Instructions</h3>
              <p style="margin: 0; color: #b45309;">${orderDetails.specialInstructions}</p>
            </div>
            `
                : ""
            }

            <div style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
              <h3 style="color: #374151; margin-top: 0;">What's Next?</h3>
              <p style="margin-bottom: 15px; color: #6b7280;">
                Our print specialists will review your order and begin production. You'll receive updates as your order progresses.
              </p>
              <p style="margin: 0; color: #6b7280;">
                Questions? Contact us at <a href="mailto:support@restaurant.com" style="color: #2563eb;">support@restaurant.com</a>
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Thank you for choosing our professional print services!
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log(
        `Print order confirmation sent successfully to ${customerEmail}:`,
        {
          messageId: result.body?.messageId,
          orderNumber: orderDetails.orderNumber,
          brevoResponse: result.response?.statusCode,
        },
      );
      return result;
    } catch (error) {
      console.error(
        `Error sending print order confirmation to ${customerEmail}:`,
        error,
      );
      throw error;
    }
  }

  async sendBookingCancellationNotification(
    restaurantEmail: string,
    restaurantName: string,
    bookingDetails: any,
  ) {
    if (!this.checkEnabled()) return;

    const sendSmtpEmail = new SendSmtpEmail();

    sendSmtpEmail.subject = `Booking Cancellation - ${bookingDetails.customerName}`;
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
            <div style="background-color: #f8d7da; padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #721c24; letter-spacing: -0.5px;">Booking Cancelled</h1>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333; line-height: 1.5;">Dear ${restaurantName} Team,</p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #666; line-height: 1.6;">
                A customer has cancelled their booking. Here are the details:
              </p>

              <!-- Cancelled Booking Details -->
              <div style="background-color: #f8d7da; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #dc3545;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #333; font-weight: 600;">Cancelled Booking</h3>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1aeb5;">
                    <span style="color: #666; font-weight: 500;">Customer:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.customerName}</span>
                  </div>
                  ${
                    bookingDetails.customerEmail
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1aeb5;">
                      <span style="color: #666; font-weight: 500;">Email:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.customerEmail}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    bookingDetails.customerPhone
                      ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1aeb5;">
                      <span style="color: #666; font-weight: 500;">Phone:</span>
                      <span style="color: #333; font-weight: 600;">${bookingDetails.customerPhone}</span>
                    </div>
                  `
                      : ""
                  }
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1aeb5;">
                    <span style="color: #666; font-weight: 500;">Date:</span>
                    <span style="color: #333; font-weight: 600;">${new Date(bookingDetails.bookingDate).toLocaleDateString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1aeb5;">
                    <span style="color: #666; font-weight: 500;">Time:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.startTime}${bookingDetails.endTime ? ` - ${bookingDetails.endTime}` : ""}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1aeb5;">
                    <span style="color: #666; font-weight: 500;">Party Size:</span>
                    <span style="color: #333; font-weight: 600;">${bookingDetails.guestCount} guests</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666; font-weight: 500;">Cancellation Time:</span>
                    <span style="color: #333; font-weight: 600;">${new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              ${
                bookingDetails.notes
                  ? `
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                  <h4 style="margin: 0 0 10px; color: #333;">Original Notes:</h4>
                  <p style="margin: 0; color: #666; font-style: italic;">"${bookingDetails.notes}"</p>
                </div>
              `
                  : ""
              }

              <div style="background-color: #d1ecf1; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #17a2b8;">
                <p style="margin: 0; color: #0c5460; font-weight: 500;">
                  📅 This table is now available for other bookings at this time slot.
                </p>
              </div>

              <p style="margin: 30px 0 10px; font-size: 16px; color: #333;">Best regards,</p>
              <p style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">${restaurantName || "Restaurant"} Booking System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const senderEmail =
      process.env.BREVO_SENDER_EMAIL || "noreply@restaurant.com";
    console.log("Using sender email:", senderEmail);

    sendSmtpEmail.sender = {
      name: restaurantName || "Restaurant",
      email: senderEmail,
    };

    sendSmtpEmail.to = [
      {
        email: restaurantEmail,
        name: restaurantName,
      },
    ];

    try {
      const result = await this.apiInstance!.sendTransacEmail(sendSmtpEmail);
      console.log("Booking cancellation notification email sent:", result);
      return result;
    } catch (error) {
      console.error(
        "Error sending booking cancellation notification email:",
        error,
      );
      throw error;
    }
  }

}

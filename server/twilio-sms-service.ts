import twilio from 'twilio';
import { storage } from './storage';

interface SMSMessage {
  to: string;
  message: string;
  type: 'confirmation' | 'reminder' | 'cancellation' | 'test' | 'survey';
  bookingId?: number;
  restaurantId: number;
  tenantId: number;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  status?: string;
}

class TwilioSMSService {
  private client: any = null;
  private accountSid: string | null = null;
  private authToken: string | null = null;
  private fromNumber: string | null = null;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || null;
    this.authToken = process.env.TWILIO_AUTH_TOKEN || null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || null;

    if (this.accountSid && this.authToken && this.fromNumber) {
      try {
        this.client = twilio(this.accountSid, this.authToken);
        console.log('Twilio SMS service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Twilio:', error);
        this.client = null;
      }
    } else {
      console.log('Twilio SMS service: Missing required environment variables');
      console.log('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
    }
  }

  public isConfigured(): boolean {
    return this.client !== null && this.fromNumber !== null;
  }

  public async sendSMS(messageData: SMSMessage): Promise<SMSResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Twilio SMS service is not properly configured'
      };
    }

    try {
      // Check SMS balance first
      const balance = await storage.getSmsBalance(messageData.tenantId);
      const currentBalance = parseFloat(balance.balance || '0');
      
      if (currentBalance <= 0) {
        return {
          success: false,
          error: 'Insufficient SMS balance'
        };
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(messageData.to);
      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Send SMS via Twilio
      const message = await this.client!.messages.create({
        body: messageData.message,
        from: this.fromNumber!,
        to: formattedPhone
      });

      // Calculate cost (approximate - Twilio pricing varies by destination)
      const estimatedCost = this.calculateSMSCost(formattedPhone);

      // Deduct from balance
      await storage.deductSmsBalance(messageData.tenantId, estimatedCost);

      // Log the SMS in database
      await this.logSMSMessage({
        ...messageData,
        to: formattedPhone,
        messageId: message.sid,
        status: message.status,
        cost: estimatedCost
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        cost: estimatedCost
      };

    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      
      // Log failed SMS attempt
      await this.logSMSMessage({
        ...messageData,
        error: error.message,
        status: 'failed'
      });

      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +, it's already formatted
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If it starts with 00, replace with +
    if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    }
    
    // If it doesn't start with country code, assume it's a local number
    // You might want to customize this based on your default country
    if (cleaned.length >= 10) {
      // Assume US/Canada if no country code
      return '+1' + cleaned;
    }
    
    return null;
  }

  private calculateSMSCost(phoneNumber: string): number {
    // Basic cost calculation - you should update this based on Twilio's pricing
    // This is a simplified version
    
    if (phoneNumber.startsWith('+1')) {
      // US/Canada
      return 0.0075; // $0.0075 per SMS
    } else if (phoneNumber.startsWith('+44') || phoneNumber.startsWith('+33') || phoneNumber.startsWith('+49')) {
      // UK, France, Germany
      return 0.05; // €0.05 per SMS
    } else {
      // International
      return 0.10; // €0.10 per SMS
    }
  }

  private async logSMSMessage(data: any): Promise<void> {
    try {
      await storage.logSmsMessage({
        restaurantId: data.restaurantId,
        tenantId: data.tenantId,
        phoneNumber: data.to,
        message: data.message,
        type: data.type,
        bookingId: data.bookingId,
        messageId: data.messageId,
        status: data.status || 'sent',
        cost: data.cost,
        error: data.error,
        provider: 'twilio'
      });
    } catch (error) {
      console.error('Failed to log SMS message:', error);
    }
  }

  // Webhook handler for Twilio status updates
  public async handleStatusWebhook(webhookData: any): Promise<void> {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = webhookData;
      
      if (MessageSid) {
        await storage.updateSmsMessageStatus(MessageSid, {
          status: MessageStatus,
          errorCode: ErrorCode,
          errorMessage: ErrorMessage,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to handle Twilio webhook:', error);
    }
  }

  // Test SMS functionality
  public async sendTestSMS(phoneNumber: string, tenantId: number, restaurantId: number): Promise<SMSResponse> {
    const testMessage = {
      to: phoneNumber,
      message: 'Test SMS from your restaurant booking system. Twilio integration is working correctly!',
      type: 'test' as const,
      restaurantId,
      tenantId
    };

    return await this.sendSMS(testMessage);
  }

  // Send booking confirmation SMS
  public async sendBookingConfirmation(
    phoneNumber: string, 
    bookingDetails: any, 
    restaurantId: number, 
    tenantId: number
  ): Promise<SMSResponse> {
    const message = `Booking Confirmed! 
${bookingDetails.restaurantName}
Date: ${bookingDetails.date}
Time: ${bookingDetails.time}
Guests: ${bookingDetails.guests}
Reference: ${bookingDetails.hash}

Thank you for choosing us!`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
      type: 'confirmation',
      bookingId: bookingDetails.id,
      restaurantId,
      tenantId
    });
  }

  // Send booking reminder SMS
  public async sendBookingReminder(
    phoneNumber: string, 
    bookingDetails: any, 
    restaurantId: number, 
    tenantId: number
  ): Promise<SMSResponse> {
    const message = `Reminder: You have a booking today!
${bookingDetails.restaurantName}
Time: ${bookingDetails.time}
Guests: ${bookingDetails.guests}

We look forward to seeing you!`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
      type: 'reminder',
      bookingId: bookingDetails.id,
      restaurantId,
      tenantId
    });
  }

  // Get account info and balance from Twilio
  public async getTwilioAccountInfo(): Promise<any> {
    if (!this.isConfigured()) {
      return { error: 'Twilio not configured' };
    }

    try {
      const account = await this.client!.api.accounts(this.accountSid!).fetch();
      const balance = await this.client!.balance.fetch();

      return {
        accountSid: account.sid,
        accountName: account.friendlyName,
        status: account.status,
        balance: balance.balance,
        currency: balance.currency
      };
    } catch (error: any) {
      console.error('Failed to fetch Twilio account info:', error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
export const twilioSMSService = new TwilioSMSService();
export default twilioSMSService;
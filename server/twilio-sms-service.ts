import twilio from 'twilio';
import { storage } from './storage';
import { smsPricingService } from './sms-pricing-service';

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
          error: 'Insufficient SMS balance. Please add balance to your account before sending SMS messages.'
        };
      }

      // Format phone number
      console.log('Original phone number:', messageData.to);
      const formattedPhone = this.formatPhoneNumber(messageData.to);
      console.log('Formatted phone number:', formattedPhone);
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
      
      // Handle specific Twilio error codes with user-friendly messages
      let userFriendlyError = error.message;
      if (error.code === 21408) {
        const country = this.getCountryFromPhone(messageData.to);
        userFriendlyError = `SMS permission not enabled for ${country}. Please enable SMS permissions for this region in your Twilio Console.`;
      } else if (error.code === 21614) {
        userFriendlyError = `Phone number ${messageData.to} is not verified. For trial accounts, you can only send SMS to verified phone numbers.`;
      } else if (error.code === 21211) {
        userFriendlyError = `Invalid phone number format: ${messageData.to}`;
      } else if (error.code === 21610) {
        userFriendlyError = `Phone number ${messageData.to} is unreachable or invalid.`;
      }
      
      // Log failed SMS attempt
      await this.logSMSMessage({
        ...messageData,
        error: userFriendlyError,
        status: 'failed'
      });

      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  private formatPhoneNumber(phone: string): string | null {
    console.log('formatPhoneNumber input:', phone);
    
    // Remove all non-numeric characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    console.log('formatPhoneNumber cleaned:', cleaned);
    
    // If it starts with +, it's already formatted
    if (cleaned.startsWith('+')) {
      console.log('formatPhoneNumber returning cleaned:', cleaned);
      return cleaned;
    }
    
    // If it starts with 00, replace with +
    if (cleaned.startsWith('00')) {
      const result = '+' + cleaned.substring(2);
      console.log('formatPhoneNumber returning 00 format:', result);
      return result;
    }
    
    // If it doesn't start with country code, assume it's a local number
    // You might want to customize this based on your default country
    if (cleaned.length >= 10) {
      // Assume US/Canada if no country code
      const result = '+1' + cleaned;
      console.log('formatPhoneNumber returning US format:', result);
      return result;
    }
    
    console.log('formatPhoneNumber returning null');
    return null;
  }

  private calculateSMSCost(phoneNumber: string): number {
    // Use the comprehensive SMS pricing service based on country data
    return smsPricingService.calculateSMSCost(phoneNumber);
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

  private getCountryFromPhone(phoneNumber: string): string {
    const countryMap: { [key: string]: string } = {
      '+1': 'US/Canada',
      '+44': 'United Kingdom',
      '+49': 'Germany',
      '+33': 'France',
      '+34': 'Spain',
      '+39': 'Italy',
      '+46': 'Sweden',
      '+47': 'Norway',
      '+45': 'Denmark',
      '+31': 'Netherlands',
      '+32': 'Belgium',
      '+41': 'Switzerland',
      '+43': 'Austria',
      '+351': 'Portugal',
      '+358': 'Finland',
      '+91': 'India',
      '+86': 'China',
      '+81': 'Japan',
      '+82': 'South Korea',
      '+61': 'Australia',
      '+64': 'New Zealand',
      '+27': 'South Africa',
      '+55': 'Brazil',
      '+52': 'Mexico',
      '+54': 'Argentina',
      '+7': 'Russia',
      '+380': 'Ukraine',
      '+48': 'Poland',
      '+90': 'Turkey',
      '+30': 'Greece',
      '+353': 'Ireland',
      '+354': 'Iceland',
      '+356': 'Malta',
      '+357': 'Cyprus',
      '+377': 'Monaco',
      '+378': 'San Marino',
      '+379': 'Vatican City',
      '+852': 'Hong Kong',
      '+853': 'Macau',
      '+886': 'Taiwan',
      '+65': 'Singapore',
      '+60': 'Malaysia',
      '+66': 'Thailand',
      '+84': 'Vietnam',
      '+62': 'Indonesia',
      '+63': 'Philippines',
      '+92': 'Pakistan',
      '+98': 'Iran',
      '+972': 'Israel',
      '+971': 'UAE',
      '+966': 'Saudi Arabia',
      '+20': 'Egypt',
      '+212': 'Morocco',
      '+213': 'Algeria',
      '+216': 'Tunisia',
      '+218': 'Libya',
      '+249': 'Sudan',
      '+251': 'Ethiopia',
      '+254': 'Kenya',
      '+255': 'Tanzania',
      '+256': 'Uganda',
      '+260': 'Zambia',
      '+263': 'Zimbabwe',
      '+264': 'Namibia',
      '+265': 'Malawi',
      '+266': 'Lesotho',
      '+267': 'Botswana',
      '+268': 'Eswatini'
    };

    // Check for exact match first
    for (const [code, country] of Object.entries(countryMap)) {
      if (phoneNumber.startsWith(code)) {
        return country;
      }
    }
    
    return 'Unknown Region';
  }
}

// Export singleton instance
export const twilioSMSService = new TwilioSMSService();
export default twilioSMSService;
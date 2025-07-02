import { DatabaseStorage } from './db-storage.js';
import { BrevoEmailService } from './brevo-service.js';
import { twilioSMSService } from './twilio-sms-service.js';
import { surveySchedules, bookings, restaurants } from '../shared/schema.js';
import { eq, and, lt, desc } from 'drizzle-orm';
import crypto from 'crypto';

export class SurveySchedulerService {
  private storage: DatabaseStorage;
  private emailService: BrevoEmailService | null = null;
  private smsService: any = null;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
    this.initializeServices();
  }

  private initializeServices() {
    try {
      this.emailService = new BrevoEmailService();
      console.log('Survey scheduler: Email service initialized');
    } catch (error) {
      console.log('Survey scheduler: Email service not available:', error);
    }

    try {
      this.smsService = twilioSMSService;
      console.log('Survey scheduler: SMS service initialized');
    } catch (error) {
      console.log('Survey scheduler: SMS service not available:', error);
    }
  }

  // Schedule a survey for a booking after dining is complete
  async scheduleSurvey(
    restaurantId: number,
    tenantId: number,
    bookingId: number,
    customerName: string,
    customerEmail?: string,
    customerPhone?: string,
    hoursAfterBooking: number = 2 // Default: 2 hours after booking end time
  ): Promise<void> {
    try {
      // Get the booking details to calculate when dining should be complete
      const booking = await this.storage.getBookingById(tenantId, restaurantId, bookingId);
      if (!booking) {
        console.log(`Survey scheduler: Booking ${bookingId} not found`);
        return;
      }

      // Calculate when to send the survey (booking end time + buffer hours)
      const bookingEndDateTime = new Date(`${booking.bookingDate.toISOString().split('T')[0]}T${booking.endTime}:00`);
      const scheduledFor = new Date(bookingEndDateTime.getTime() + (hoursAfterBooking * 60 * 60 * 1000));

      // Generate unique response token
      const responseToken = crypto.randomBytes(32).toString('hex');

      // Determine delivery method based on available contact info
      let deliveryMethod = 'email';
      if (customerEmail && customerPhone) {
        deliveryMethod = 'both';
      } else if (customerPhone && !customerEmail) {
        deliveryMethod = 'sms';
      }

      // Skip if no contact method available
      if (!customerEmail && !customerPhone) {
        console.log(`Survey scheduler: No contact information for booking ${bookingId}`);
        return;
      }

      // Generate survey link
      const surveyLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/survey/${responseToken}`;

      // Insert survey schedule
      await this.storage.db.insert(surveySchedules).values({
        restaurantId,
        tenantId,
        bookingId,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        scheduledFor,
        deliveryMethod,
        responseToken,
        surveyLink,
        status: 'pending'
      });

      console.log(`Survey scheduler: Survey scheduled for booking ${bookingId} at ${scheduledFor.toISOString()}`);
    } catch (error) {
      console.error('Survey scheduler: Error scheduling survey:', error);
    }
  }

  // Process pending surveys that are ready to be sent
  async processPendingSurveys(): Promise<void> {
    try {
      if (!this.storage.db) {
        console.log('Survey scheduler: Database not available - skipping survey processing');
        return;
      }
      
      const now = new Date();
      
      // Get all pending surveys that are ready to be sent
      const pendingSurveys = await this.storage.db
        .select()
        .from(surveySchedules)
        .where(
          and(
            eq(surveySchedules.status, 'pending'),
            lt(surveySchedules.scheduledFor, now)
          )
        )
        .orderBy(desc(surveySchedules.scheduledFor))
        .limit(50); // Process 50 at a time

      console.log(`Survey scheduler: Found ${pendingSurveys.length} pending surveys to process`);

      for (const survey of pendingSurveys) {
        await this.sendSurvey(survey);
        // Small delay between sends to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Survey scheduler: Error processing pending surveys:', error);
    }
  }

  // Send a specific survey
  private async sendSurvey(survey: any): Promise<void> {
    try {
      // Update attempt count
      await this.storage.db
        .update(surveySchedules)
        .set({
          attemptCount: survey.attemptCount + 1,
          lastAttemptAt: new Date()
        })
        .where(eq(surveySchedules.id, survey.id));

      // Get restaurant details for branding
      const restaurant = await this.storage.db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, survey.restaurantId))
        .limit(1);

      const restaurantName = restaurant[0]?.name || 'Our Restaurant';

      let emailSent = false;
      let smsSent = false;
      let errorMessage = '';

      // Send email if required
      if ((survey.deliveryMethod === 'email' || survey.deliveryMethod === 'both') && survey.customerEmail) {
        try {
          if (this.emailService) {
            await this.sendSurveyEmail(survey, restaurantName);
            emailSent = true;
            console.log(`Survey scheduler: Email sent to ${survey.customerEmail} for booking ${survey.bookingId}`);
          } else {
            errorMessage += 'Email service not available. ';
          }
        } catch (error) {
          errorMessage += `Email error: ${error}. `;
          console.error('Survey scheduler: Email send error:', error);
        }
      }

      // Send SMS if required
      if ((survey.deliveryMethod === 'sms' || survey.deliveryMethod === 'both') && survey.customerPhone) {
        try {
          if (this.smsService) {
            await this.sendSurveySMS(survey, restaurantName);
            smsSent = true;
            console.log(`Survey scheduler: SMS sent to ${survey.customerPhone} for booking ${survey.bookingId}`);
          } else {
            errorMessage += 'SMS service not available. ';
          }
        } catch (error) {
          errorMessage += `SMS error: ${error}. `;
          console.error('Survey scheduler: SMS send error:', error);
        }
      }

      // Update survey status
      const isSuccess = (survey.deliveryMethod === 'email' && emailSent) ||
                       (survey.deliveryMethod === 'sms' && smsSent) ||
                       (survey.deliveryMethod === 'both' && (emailSent || smsSent));

      await this.storage.db
        .update(surveySchedules)
        .set({
          status: isSuccess ? 'sent' : 'failed',
          sentAt: isSuccess ? new Date() : null,
          errorMessage: errorMessage || null
        })
        .where(eq(surveySchedules.id, survey.id));

    } catch (error) {
      console.error('Survey scheduler: Error sending survey:', error);
      
      // Mark as failed
      await this.storage.db
        .update(surveySchedules)
        .set({
          status: 'failed',
          errorMessage: `Send error: ${error}`
        })
        .where(eq(surveySchedules.id, survey.id));
    }
  }

  // Send survey via email
  private async sendSurveyEmail(survey: any, restaurantName: string): Promise<void> {
    if (!this.emailService) {
      throw new Error('Email service not available');
    }

    const subject = `How was your dining experience at ${restaurantName}?`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Feedback Request</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px 20px; }
            .message { font-size: 16px; margin-bottom: 25px; color: #555; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; text-align: center; }
            .cta-button:hover { transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #eee; }
            .rating-preview { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
            .stars { font-size: 24px; color: #ffd700; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 We'd Love Your Feedback!</h1>
            </div>
            
            <div class="content">
              <div class="message">
                <p>Hi ${survey.customerName},</p>
                
                <p>Thank you for dining with us at <strong>${restaurantName}</strong>! We hope you had a wonderful experience.</p>
                
                <p>Your feedback is incredibly valuable to us and helps us continue to improve our service. Would you mind taking a moment to share your thoughts about your recent visit?</p>
              </div>
              
              <div class="rating-preview">
                <p><strong>Quick & Easy Feedback</strong></p>
                <div class="stars">⭐⭐⭐⭐⭐</div>
                <p>Just a few clicks to help us serve you better!</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${survey.surveyLink}" class="cta-button">Share Your Feedback</a>
              </div>
              
              <div class="message">
                <p>The survey takes less than 2 minutes to complete, and your responses help us:</p>
                <ul>
                  <li>Improve our food quality and service</li>
                  <li>Train our staff better</li>
                  <li>Create an even better dining experience</li>
                </ul>
                
                <p>Thank you for choosing ${restaurantName}. We look forward to welcoming you back soon!</p>
              </div>
            </div>
            
            <div class="footer">
              <p>This survey link is unique to your recent visit and will expire in 7 days.</p>
              <p>If you have any immediate concerns, please contact us directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.emailService.sendEmail(
      survey.customerEmail,
      subject,
      htmlContent,
      survey.customerName
    );
  }

  // Send survey via SMS
  private async sendSurveySMS(survey: any, restaurantName: string): Promise<void> {
    if (!this.smsService) {
      throw new Error('SMS service not available');
    }

    const message = `Hi ${survey.customerName}! Thank you for dining at ${restaurantName}. We'd love your feedback! Please take a moment to rate your experience: ${survey.surveyLink}`;

    await this.smsService.sendSMS(survey.customerPhone, message);
  }

  // Start the automated scheduler
  start(): void {
    if (this.isRunning) {
      console.log('Survey scheduler: Already running');
      return;
    }

    this.isRunning = true;
    console.log('Survey scheduler: Starting automated survey scheduler...');

    // Check for pending surveys every 5 minutes
    this.checkInterval = setInterval(async () => {
      await this.processPendingSurveys();
    }, 5 * 60 * 1000);

    // Run initial check
    setTimeout(() => this.processPendingSurveys(), 5000);
  }

  // Stop the automated scheduler
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Survey scheduler: Stopped automated survey scheduler');
  }

  // Get survey statistics
  async getSurveyStats(tenantId: number, restaurantId?: number): Promise<any> {
    try {
      const whereClause = restaurantId 
        ? and(eq(surveySchedules.tenantId, tenantId), eq(surveySchedules.restaurantId, restaurantId))
        : eq(surveySchedules.tenantId, tenantId);

      const surveys = await this.storage.db
        .select()
        .from(surveySchedules)
        .where(whereClause);

      const stats = {
        total: surveys.length,
        pending: surveys.filter(s => s.status === 'pending').length,
        sent: surveys.filter(s => s.status === 'sent').length,
        failed: surveys.filter(s => s.status === 'failed').length,
        cancelled: surveys.filter(s => s.status === 'cancelled').length,
        deliveryMethods: {
          email: surveys.filter(s => s.deliveryMethod === 'email').length,
          sms: surveys.filter(s => s.deliveryMethod === 'sms').length,
          both: surveys.filter(s => s.deliveryMethod === 'both').length,
        }
      };

      return stats;
    } catch (error) {
      console.error('Survey scheduler: Error getting stats:', error);
      return null;
    }
  }
}
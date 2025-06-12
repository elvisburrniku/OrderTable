import { storage } from './db-storage.js';
import { BrevoEmailService } from './brevo-service.js';

export class CancellationReminderService {
  private reminderInterval: NodeJS.Timeout | null = null;
  private emailService: BrevoEmailService;

  constructor() {
    this.emailService = new BrevoEmailService();
  }

  start() {
    console.log('Starting cancellation reminder service...');
    
    // Run daily at 9 AM
    this.scheduleDaily();
    
    // Also run immediately on startup for testing
    this.sendCancellationReminders();
  }

  private scheduleDaily() {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(9, 0, 0, 0); // 9 AM
    
    // If it's already past 9 AM today, schedule for tomorrow
    if (now > nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    const timeUntilNextRun = nextRun.getTime() - now.getTime();
    
    setTimeout(() => {
      this.sendCancellationReminders();
      
      // Set up daily interval (24 hours)
      this.reminderInterval = setInterval(() => {
        this.sendCancellationReminders();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilNextRun);
  }

  private async sendCancellationReminders() {
    try {
      console.log('Checking for cancelled subscriptions...');
      
      // Get all tenants with cancelled subscriptions
      const tenants = await storage.getAllTenants();
      const cancelledTenants = tenants.filter(tenant => 
        tenant.subscriptionStatus === 'cancelled' && 
        tenant.subscriptionEndDate &&
        new Date(tenant.subscriptionEndDate) > new Date()
      );

      console.log(`Found ${cancelledTenants.length} cancelled subscriptions with remaining time`);

      for (const tenant of cancelledTenants) {
        try {
          await this.sendReminderEmail(tenant);
        } catch (error) {
          console.error(`Failed to send reminder for tenant ${tenant.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in cancellation reminder service:', error);
    }
  }

  private async sendReminderEmail(tenant: any) {
    if (!tenant.subscriptionEndDate) return;

    const endDate = new Date(tenant.subscriptionEndDate);
    const now = new Date();
    const remainingTime = endDate.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

    // Don't send if subscription already ended
    if (remainingDays <= 0) return;

    // Get tenant user for email
    const users = await storage.getAllUsers();
    const tenantUser = users.find(user => user.tenantId === tenant.id);
    
    if (!tenantUser || !tenantUser.email) {
      console.log(`No email found for tenant ${tenant.id}`);
      return;
    }

    // Get subscription plan details
    const plans = await storage.getSubscriptionPlans();
    const plan = plans.find(p => p.id === tenant.subscriptionPlanId);

    console.log(`Sending cancellation reminder to ${tenantUser.email}: ${remainingDays} days remaining`);

    const subject = `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} remaining on your ${tenant.name} subscription`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Subscription Reminder</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Your subscription is ending soon</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9500; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 16px; color: #333;">
              <strong>${tenant.name}</strong> subscription will end in <strong style="color: #ff9500;">${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
              Expires on: ${endDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          ${plan ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Current Plan: ${plan.name}</h3>
            <ul style="margin: 0; padding-left: 20px; color: #666;">
              <li>Up to ${plan.maxTables} tables</li>
              <li>${plan.maxBookingsPerMonth} bookings per month</li>
              <li>Access to all premium features</li>
            </ul>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.REPLIT_DOMAIN || 'https://your-domain.com'}/billing" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reactivate Subscription
            </a>
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              <strong>Don't lose your data!</strong> Reactivate your subscription to continue managing your restaurant bookings and accessing all features.
            </p>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; background-color: #f1f3f4; color: #666; font-size: 12px;">
          <p style="margin: 0;">This is an automated reminder about your subscription status.</p>
          <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Restaurant Booking System</p>
        </div>
      </div>
    `;

    await this.emailService.sendContactFormNotification({
      subject,
      email: tenantUser.email,
      name: tenantUser.name || 'Restaurant Owner',
      message: `Subscription cancellation reminder: ${remainingDays} days remaining`,
      htmlContent
    });
  }

  stop() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
      console.log('Cancellation reminder service stopped');
    }
  }
}
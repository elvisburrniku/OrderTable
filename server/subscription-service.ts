import { storage } from "./storage";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key', {
  apiVersion: '2025-05-28.basil'
});

export class SubscriptionService {
  
  /**
   * Initialize a free trial subscription for a new user
   */
  static async initializeFreeTrialForTenant(tenantId: number, planId?: number) {
    const freePlan = await storage.getFreePlan();
    const selectedPlanId = planId || freePlan?.id || 1; // Default to first plan if no free plan exists
    
    const trialPeriodDays = 14;
    const currentDate = new Date();
    const trialEndDate = new Date(currentDate.getTime() + (trialPeriodDays * 24 * 60 * 60 * 1000));

    // Update tenant with trial information
    await storage.updateTenant(tenantId, {
      subscriptionPlanId: selectedPlanId,
      subscriptionStatus: 'trial',
      trialStartDate: currentDate,
      trialEndDate: trialEndDate,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
    });

    console.log(`Initialized ${trialPeriodDays}-day free trial for tenant ${tenantId}`);
    return { status: 'trial', trialEndDate, planId: selectedPlanId };
  }

  /**
   * Check if a tenant's subscription is valid and active
   */
  static async checkSubscriptionStatus(tenantId: number) {
    const tenant = await storage.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const now = new Date();
    
    // Check trial status
    if (tenant.subscriptionStatus === 'trial') {
      if (tenant.trialEndDate && now > tenant.trialEndDate) {
        // Trial has expired
        await storage.updateTenant(tenantId, {
          subscriptionStatus: 'expired'
        });
        return { 
          status: 'expired', 
          type: 'trial',
          message: 'Your free trial has expired. Please upgrade to continue using the service.',
          trialEnded: true 
        };
      }
      
      const daysLeft = tenant.trialEndDate ? 
        Math.ceil((tenant.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      return { 
        status: 'active', 
        type: 'trial',
        daysLeft,
        trialEndDate: tenant.trialEndDate,
        message: `Your free trial expires in ${daysLeft} days.`
      };
    }

    // Check paid subscription status
    if (tenant.subscriptionStatus === 'active') {
      if (tenant.subscriptionEndDate && now > tenant.subscriptionEndDate) {
        await storage.updateTenant(tenantId, {
          subscriptionStatus: 'expired'
        });
        return { 
          status: 'expired', 
          type: 'paid',
          message: 'Your subscription has expired. Please renew to continue using the service.' 
        };
      }
      
      return { 
        status: 'active', 
        type: 'paid',
        subscriptionEndDate: tenant.subscriptionEndDate,
        message: 'Your subscription is active.'
      };
    }

    // Handle other statuses
    return { 
      status: tenant.subscriptionStatus || 'unknown',
      type: 'unknown',
      message: 'Please contact support for subscription status.'
    };
  }

  /**
   * Create Stripe checkout session for subscription upgrade
   */
  static async createCheckoutSession(tenantId: number, planId: number, successUrl: string, cancelUrl: string) {
    const tenant = await storage.getTenantById(tenantId);
    const plan = await storage.getSubscriptionPlanById(planId);
    
    if (!tenant || !plan) {
      throw new Error('Tenant or plan not found');
    }

    // Create or get Stripe customer
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { tenantId: tenantId.toString() }
      });
      customerId = customer.id;
      
      await storage.updateTenant(tenantId, {
        stripeCustomerId: customerId
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: `${plan.name} subscription plan`,
          },
          unit_amount: plan.price,
          recurring: {
            interval: plan.interval === 'yearly' ? 'year' : 'month',
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId: tenantId.toString(),
        planId: planId.toString(),
      },
    });

    return { sessionId: session.id, sessionUrl: session.url };
  }

  /**
   * Handle successful Stripe webhook payment
   */
  static async handleStripeWebhook(event: Stripe.Event) {
    console.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle checkout session completed
   */
  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const tenantId = parseInt(session.metadata?.tenantId || '0');
    const planId = parseInt(session.metadata?.planId || '0');
    
    if (!tenantId || !planId) {
      console.error('Missing tenant or plan ID in checkout session metadata');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // Calculate subscription period
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    // Update tenant subscription
    await storage.updateTenant(tenantId, {
      subscriptionPlanId: planId,
      subscriptionStatus: 'active',
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: currentPeriodStart,
      subscriptionEndDate: currentPeriodEnd,
      stripeSubscriptionId: subscription.id,
    });

    console.log(`Activated paid subscription for tenant ${tenantId}, plan ${planId}`);
  }

  /**
   * Handle payment succeeded
   */
  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const customerId = subscription.customer as string;
      
      // Find tenant by Stripe customer ID
      const tenant = await storage.getTenantByStripeCustomerId(customerId);
      if (!tenant) {
        console.error(`Tenant not found for Stripe customer ${customerId}`);
        return;
      }

      // Update subscription period
      const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      await storage.updateTenant(tenant.id, {
        subscriptionStatus: 'active',
        subscriptionStartDate: currentPeriodStart,
        subscriptionEndDate: currentPeriodEnd,
      });

      console.log(`Renewed subscription for tenant ${tenant.id}`);
    }
  }

  /**
   * Handle subscription updated
   */
  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const tenant = await storage.getTenantByStripeCustomerId(customerId);
    
    if (!tenant) {
      console.error(`Tenant not found for Stripe customer ${customerId}`);
      return;
    }

    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    await storage.updateTenant(tenant.id, {
      subscriptionStatus: subscription.status === 'active' ? 'active' : 'cancelled',
      subscriptionStartDate: currentPeriodStart,
      subscriptionEndDate: currentPeriodEnd,
    });

    console.log(`Updated subscription for tenant ${tenant.id}: ${subscription.status}`);
  }

  /**
   * Handle subscription deleted/cancelled
   */
  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;
    const tenant = await storage.getTenantByStripeCustomerId(customerId);
    
    if (!tenant) {
      console.error(`Tenant not found for Stripe customer ${customerId}`);
      return;
    }

    await storage.updateTenant(tenant.id, {
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
    });

    console.log(`Cancelled subscription for tenant ${tenant.id}`);
  }

  /**
   * Simulate a successful payment webhook for testing
   */
  static async simulateSuccessfulPayment(tenantId: number, planId: number) {
    console.log(`Simulating successful payment for tenant ${tenantId}, plan ${planId}`);
    
    const plan = await storage.getSubscriptionPlanById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate subscription period based on plan interval
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    
    if (plan.interval === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    // Update tenant subscription
    await storage.updateTenant(tenantId, {
      subscriptionPlanId: planId,
      subscriptionStatus: 'active',
      trialStartDate: null,
      trialEndDate: null,
      subscriptionStartDate: currentPeriodStart,
      subscriptionEndDate: currentPeriodEnd,
      stripeSubscriptionId: `sim_sub_${Date.now()}`, // Simulated subscription ID
    });

    console.log(`Simulated payment successful - activated subscription for tenant ${tenantId}`);
    return { 
      status: 'active', 
      subscriptionStartDate: currentPeriodStart,
      subscriptionEndDate: currentPeriodEnd,
      planId 
    };
  }
}
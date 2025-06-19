import { DatabaseStorage } from './db-storage';
import Stripe from 'stripe';

interface RestaurantLimits {
  baseLimit: number;
  currentCount: number;
  additionalCount: number;
  canCreateMore: boolean;
  costPerAdditional: number;
  totalAllowed: number;
}

export class MultiRestaurantService {
  private storage: DatabaseStorage;
  private stripe: Stripe;

  constructor() {
    this.storage = new DatabaseStorage();
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required for multi-restaurant service');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });
  }

  async getRestaurantLimits(tenantId: number): Promise<RestaurantLimits> {
    const tenant = await this.storage.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const subscriptionPlan = await this.storage.getSubscriptionPlanById(tenant.subscriptionPlanId);
    if (!subscriptionPlan) {
      throw new Error('Subscription plan not found');
    }

    const restaurants = await this.storage.getRestaurantsByTenant(tenantId);
    const currentCount = restaurants.length;
    
    const baseLimit = subscriptionPlan.maxRestaurants || 1;
    const additionalCount = tenant.additionalRestaurants || 0;
    const totalAllowed = baseLimit + additionalCount;
    
    return {
      baseLimit,
      currentCount,
      additionalCount,
      canCreateMore: currentCount < totalAllowed,
      costPerAdditional: 5000, // $50 in cents
      totalAllowed
    };
  }

  async canCreateRestaurant(tenantId: number): Promise<{ canCreate: boolean; reason?: string; limits: RestaurantLimits }> {
    const limits = await this.getRestaurantLimits(tenantId);
    
    if (limits.canCreateMore) {
      return { canCreate: true, limits };
    }

    const tenant = await this.storage.getTenantById(tenantId);
    const subscriptionPlan = await this.storage.getSubscriptionPlanById(tenant.subscriptionPlanId);
    
    // Only enterprise plans can purchase additional restaurants
    if (subscriptionPlan.name.toLowerCase() !== 'enterprise') {
      return {
        canCreate: false,
        reason: 'Additional restaurants are only available with Enterprise plans',
        limits
      };
    }

    return {
      canCreate: false,
      reason: 'Restaurant limit reached. You can purchase additional restaurants for $50/month each.',
      limits
    };
  }

  async purchaseAdditionalRestaurant(tenantId: number): Promise<{ success: boolean; message: string; paymentIntentId?: string }> {
    const tenant = await this.storage.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const subscriptionPlan = await this.storage.getSubscriptionPlanById(tenant.subscriptionPlanId);
    if (!subscriptionPlan || subscriptionPlan.name.toLowerCase() !== 'enterprise') {
      return {
        success: false,
        message: 'Additional restaurants are only available with Enterprise plans'
      };
    }

    if (!tenant.stripeCustomerId) {
      return {
        success: false,
        message: 'No payment method on file. Please add a payment method first.'
      };
    }

    try {
      // Create a one-time payment for the additional restaurant
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: 5000, // $50 in cents
        currency: 'usd',
        customer: tenant.stripeCustomerId,
        description: `Additional restaurant for ${tenant.name}`,
        metadata: {
          tenantId: tenantId.toString(),
          type: 'additional_restaurant'
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      // Also create a recurring subscription item for monthly billing
      if (tenant.stripeSubscriptionId) {
        await this.stripe.subscriptionItems.create({
          subscription: tenant.stripeSubscriptionId,
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Additional Restaurant',
              description: 'Extra restaurant beyond plan limit'
            },
            unit_amount: 5000, // $50 in cents
            recurring: {
              interval: 'month'
            }
          }
        });
      }

      return {
        success: true,
        message: 'Payment initiated for additional restaurant',
        paymentIntentId: paymentIntent.id
      };
    } catch (error: any) {
      console.error('Error creating additional restaurant payment:', error);
      return {
        success: false,
        message: 'Failed to process payment for additional restaurant'
      };
    }
  }

  async confirmAdditionalRestaurantPurchase(tenantId: number, paymentIntentId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify payment was successful
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return {
          success: false,
          message: 'Payment not completed successfully'
        };
      }

      // Update tenant with additional restaurant
      const tenant = await this.storage.getTenantById(tenantId);
      const newAdditionalCount = (tenant.additionalRestaurants || 0) + 1;
      const newAdditionalCost = (tenant.additionalRestaurantsCost || 0) + 5000;

      await this.storage.updateTenant(tenantId, {
        additionalRestaurants: newAdditionalCount,
        additionalRestaurantsCost: newAdditionalCost
      });

      return {
        success: true,
        message: 'Additional restaurant purchased successfully'
      };
    } catch (error: any) {
      console.error('Error confirming additional restaurant purchase:', error);
      return {
        success: false,
        message: 'Failed to confirm additional restaurant purchase'
      };
    }
  }

  async createRestaurant(tenantId: number, restaurantData: any): Promise<{ success: boolean; restaurant?: any; message: string }> {
    const canCreate = await this.canCreateRestaurant(tenantId);
    
    if (!canCreate.canCreate) {
      return {
        success: false,
        message: canCreate.reason || 'Cannot create restaurant'
      };
    }

    try {
      const restaurant = await this.storage.createRestaurant({
        ...restaurantData,
        tenantId
      });

      return {
        success: true,
        restaurant,
        message: 'Restaurant created successfully'
      };
    } catch (error: any) {
      console.error('Error creating restaurant:', error);
      return {
        success: false,
        message: 'Failed to create restaurant'
      };
    }
  }

  async getRestaurantManagementInfo(tenantId: number): Promise<any> {
    const limits = await this.getRestaurantLimits(tenantId);
    const tenant = await this.storage.getTenantById(tenantId);
    const subscriptionPlan = await this.storage.getSubscriptionPlanById(tenant.subscriptionPlanId);
    const restaurants = await this.storage.getRestaurantsByTenant(tenantId);

    return {
      limits,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subscriptionPlan: subscriptionPlan.name,
        isEnterprise: subscriptionPlan.name.toLowerCase() === 'enterprise'
      },
      restaurants: restaurants.map(r => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        isActive: r.isActive
      })),
      pricing: {
        additionalRestaurantCost: 50, // $50
        currency: 'USD',
        billingInterval: 'monthly'
      }
    };
  }
}

export const multiRestaurantService = new MultiRestaurantService();
import Stripe from 'stripe';
import { db } from './db';
import { 
  voiceAgentRequests, 
  voiceAgents,
  voiceAgentCredits,
  voiceAgentTransactions,
  phoneNumbers,
  users,
  restaurants,
  tenants,
  type VoiceAgentRequest,
  type VoiceAgent,
  type VoiceAgentCredits as VoiceAgentCreditsType,
  type InsertVoiceAgentRequest,
  type InsertVoiceAgent,
  type InsertVoiceAgentCredits,
  type InsertVoiceAgentTransaction
} from '../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export class VoiceAgentRequestService {
  
  // Submit a voice agent request
  async submitRequest(data: {
    tenantId: number;
    restaurantId: number;
    requestedBy: number;
    businessJustification: string;
    expectedCallVolume: number;
    requestedLanguages: string;
  }): Promise<VoiceAgentRequest> {
    try {
      // Check if there's already a request for this restaurant
      const existingRequest = await db
        .select()
        .from(voiceAgentRequests)
        .where(eq(voiceAgentRequests.restaurantId, data.restaurantId))
        .limit(1);

      if (existingRequest.length > 0 && existingRequest[0].status === 'pending') {
        throw new Error('A request is already pending for this restaurant');
      }

      const [request] = await db
        .insert(voiceAgentRequests)
        .values({
          tenantId: data.tenantId,
          restaurantId: data.restaurantId,
          requestedBy: data.requestedBy,
          businessJustification: data.businessJustification,
          expectedCallVolume: data.expectedCallVolume,
          requestedLanguages: data.requestedLanguages,
          status: 'pending'
        })
        .returning();

      return request;
    } catch (error) {
      console.error('Error submitting voice agent request:', error);
      throw error;
    }
  }

  // Get all requests (admin only)
  async getAllRequests(): Promise<Array<VoiceAgentRequest & { restaurant: any; requestedByUser: any; tenant: any }>> {
    try {
      const requests = await db
        .select({
          id: voiceAgentRequests.id,
          tenantId: voiceAgentRequests.tenantId,
          restaurantId: voiceAgentRequests.restaurantId,
          requestedBy: voiceAgentRequests.requestedBy,
          status: voiceAgentRequests.status,
          businessJustification: voiceAgentRequests.businessJustification,
          expectedCallVolume: voiceAgentRequests.expectedCallVolume,
          requestedLanguages: voiceAgentRequests.requestedLanguages,
          adminNotes: voiceAgentRequests.adminNotes,
          approvedBy: voiceAgentRequests.approvedBy,
          approvedAt: voiceAgentRequests.approvedAt,
          revokedAt: voiceAgentRequests.revokedAt,
          revokedReason: voiceAgentRequests.revokedReason,
          createdAt: voiceAgentRequests.createdAt,
          updatedAt: voiceAgentRequests.updatedAt,
          restaurant: restaurants,
          requestedByUser: users,
          tenant: tenants
        })
        .from(voiceAgentRequests)
        .leftJoin(restaurants, eq(voiceAgentRequests.restaurantId, restaurants.id))
        .leftJoin(users, eq(voiceAgentRequests.requestedBy, users.id))
        .leftJoin(tenants, eq(voiceAgentRequests.tenantId, tenants.id))
        .orderBy(desc(voiceAgentRequests.createdAt));

      return requests;
    } catch (error) {
      console.error('Error fetching voice agent requests:', error);
      throw error;
    }
  }

  // Approve a request and create voice agent setup (admin only)
  async approveRequest(data: {
    requestId: number;
    approvedBy: number;
    phoneNumberId?: number;
    adminNotes?: string;
    maxCallsPerMonth?: number;
  }): Promise<VoiceAgent> {
    try {
      // Get the request
      const [request] = await db
        .select()
        .from(voiceAgentRequests)
        .where(eq(voiceAgentRequests.id, data.requestId))
        .limit(1);

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request is not pending approval');
      }

      // Update request status
      await db
        .update(voiceAgentRequests)
        .set({
          status: 'approved',
          approvedBy: data.approvedBy,
          approvedAt: new Date(),
          adminNotes: data.adminNotes
        })
        .where(eq(voiceAgentRequests.id, data.requestId));

      // Create voice agent configuration
      const [agent] = await db
        .insert(voiceAgents)
        .values({
          tenantId: request.tenantId,
          restaurantId: request.restaurantId,
          requestId: data.requestId,
          isActive: false, // Will be activated after credit setup
          isEnabledByTenant: true,
          language: request.requestedLanguages || 'en',
          phoneNumberId: data.phoneNumberId,
          maxCallsPerMonth: data.maxCallsPerMonth || request.expectedCallVolume || 100
        })
        .returning();

      // Initialize credit system for the tenant
      await this.initializeCreditSystem(request.tenantId);

      return agent;
    } catch (error) {
      console.error('Error approving voice agent request:', error);
      throw error;
    }
  }

  // Reject a request (admin only)
  async rejectRequest(requestId: number, adminNotes: string): Promise<void> {
    try {
      await db
        .update(voiceAgentRequests)
        .set({
          status: 'rejected',
          adminNotes
        })
        .where(eq(voiceAgentRequests.id, requestId));
    } catch (error) {
      console.error('Error rejecting voice agent request:', error);
      throw error;
    }
  }

  // Revoke access (admin only)
  async revokeAccess(requestId: number, revokedReason: string): Promise<void> {
    try {
      const [request] = await db
        .select()
        .from(voiceAgentRequests)
        .where(eq(voiceAgentRequests.id, requestId))
        .limit(1);

      if (!request) {
        throw new Error('Request not found');
      }

      // Update request
      await db
        .update(voiceAgentRequests)
        .set({
          status: 'revoked',
          revokedAt: new Date(),
          revokedReason
        })
        .where(eq(voiceAgentRequests.id, requestId));

      // Deactivate voice agent
      await db
        .update(voiceAgents)
        .set({
          isActive: false,
          isEnabledByTenant: false
        })
        .where(eq(voiceAgents.requestId, requestId));

      // Deactivate credits
      await db
        .update(voiceAgentCredits)
        .set({ isActive: false })
        .where(eq(voiceAgentCredits.tenantId, request.tenantId));

    } catch (error) {
      console.error('Error revoking voice agent access:', error);
      throw error;
    }
  }

  // Initialize credit system for a tenant
  async initializeCreditSystem(tenantId: number): Promise<VoiceAgentCreditsType> {
    try {
      // Check if credits already exist
      const existing = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, tenantId))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      // Create new credit account
      const [credits] = await db
        .insert(voiceAgentCredits)
        .values({
          tenantId,
          creditBalance: "0.00",
          minimumBalance: "20.00",
          autoRechargeAmount: "50.00",
          lowBalanceThreshold: "5.00",
          autoRechargeEnabled: true,
          isActive: false // Will be activated after first payment
        })
        .returning();

      return credits;
    } catch (error) {
      console.error('Error initializing credit system:', error);
      throw error;
    }
  }

  // Add credits to account
  async addCredits(data: {
    tenantId: number;
    amount: number;
    stripePaymentIntentId?: string;
    description?: string;
  }): Promise<void> {
    try {
      const [credits] = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, data.tenantId))
        .limit(1);

      if (!credits) {
        throw new Error('Credit account not found');
      }

      const currentBalance = parseFloat(credits.creditBalance);
      const newBalance = currentBalance + data.amount;

      // Update credits
      await db
        .update(voiceAgentCredits)
        .set({
          creditBalance: newBalance.toFixed(2),
          totalCreditsAdded: (parseFloat(credits.totalCreditsAdded) + data.amount).toFixed(2),
          lastChargeDate: new Date(),
          isActive: newBalance >= parseFloat(credits.minimumBalance) // Activate if minimum met
        })
        .where(eq(voiceAgentCredits.tenantId, data.tenantId));

      // Record transaction
      await db
        .insert(voiceAgentTransactions)
        .values({
          tenantId: data.tenantId,
          creditId: credits.id,
          transactionType: 'credit_added',
          amount: data.amount.toFixed(4),
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: data.description || `Credit added: €${data.amount}`,
          stripePaymentIntentId: data.stripePaymentIntentId,
          processedBy: data.stripePaymentIntentId ? 'system' : 'admin'
        });

      // Activate voice agent if minimum balance met
      if (newBalance >= parseFloat(credits.minimumBalance) && !credits.isActive) {
        await db
          .update(voiceAgents)
          .set({ isActive: true })
          .where(eq(voiceAgents.tenantId, data.tenantId));
      }

    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  // Charge for call usage
  async chargeForCall(data: {
    tenantId: number;
    callLogId: number;
    amount: number;
    description: string;
  }): Promise<boolean> {
    try {
      const [credits] = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, data.tenantId))
        .limit(1);

      if (!credits) {
        throw new Error('Credit account not found');
      }

      const currentBalance = parseFloat(credits.creditBalance);
      
      if (currentBalance < data.amount) {
        // Try auto-recharge if enabled
        if (credits.autoRechargeEnabled && credits.stripeCustomerId && credits.stripePaymentMethodId) {
          await this.autoRecharge(data.tenantId);
          
          // Refetch credits after auto-recharge
          const [updatedCredits] = await db
            .select()
            .from(voiceAgentCredits)
            .where(eq(voiceAgentCredits.tenantId, data.tenantId))
            .limit(1);

          if (!updatedCredits || parseFloat(updatedCredits.creditBalance) < data.amount) {
            throw new Error('Insufficient credits and auto-recharge failed');
          }
        } else {
          throw new Error('Insufficient credits');
        }
      }

      const newBalance = currentBalance - data.amount;

      // Update credits
      await db
        .update(voiceAgentCredits)
        .set({
          creditBalance: newBalance.toFixed(2),
          totalCreditsUsed: (parseFloat(credits.totalCreditsUsed) + data.amount).toFixed(2)
        })
        .where(eq(voiceAgentCredits.tenantId, data.tenantId));

      // Record transaction
      await db
        .insert(voiceAgentTransactions)
        .values({
          tenantId: data.tenantId,
          creditId: credits.id,
          callLogId: data.callLogId,
          transactionType: 'call_charge',
          amount: data.amount.toFixed(4),
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: data.description
        });

      // Check if balance is low and send alert
      if (newBalance <= parseFloat(credits.lowBalanceThreshold)) {
        await this.sendLowBalanceAlert(data.tenantId, newBalance);
      }

      return true;
    } catch (error) {
      console.error('Error charging for call:', error);
      return false;
    }
  }

  // Auto-recharge credits using Stripe
  async autoRecharge(tenantId: number): Promise<void> {
    try {
      const [credits] = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, tenantId))
        .limit(1);

      if (!credits || !credits.stripeCustomerId || !credits.stripePaymentMethodId) {
        throw new Error('Auto-recharge not configured');
      }

      const rechargeAmount = parseFloat(credits.autoRechargeAmount);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(rechargeAmount * 100), // Convert to cents
        currency: 'eur',
        customer: credits.stripeCustomerId,
        payment_method: credits.stripePaymentMethodId,
        confirm: true,
        description: `Voice Agent Credits Auto-Recharge: €${rechargeAmount}`
      });

      if (paymentIntent.status === 'succeeded') {
        await this.addCredits({
          tenantId,
          amount: rechargeAmount,
          stripePaymentIntentId: paymentIntent.id,
          description: `Auto-recharge: €${rechargeAmount}`
        });
      } else {
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }

    } catch (error) {
      console.error('Error during auto-recharge:', error);
      throw error;
    }
  }

  // Send low balance alert (placeholder - integrate with email service)
  async sendLowBalanceAlert(tenantId: number, currentBalance: number): Promise<void> {
    try {
      const [credits] = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, tenantId))
        .limit(1);

      if (!credits) return;

      // Update last alert timestamp
      await db
        .update(voiceAgentCredits)
        .set({ lastLowBalanceAlert: new Date() })
        .where(eq(voiceAgentCredits.tenantId, tenantId));

      // TODO: Send email/SMS notification
      console.log(`Low balance alert for tenant ${tenantId}: €${currentBalance}`);
    } catch (error) {
      console.error('Error sending low balance alert:', error);
    }
  }

  // Get credit balance and usage stats
  async getCreditStats(tenantId: number): Promise<any> {
    try {
      const [credits] = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, tenantId))
        .limit(1);

      if (!credits) {
        return null;
      }

      const recentTransactions = await db
        .select()
        .from(voiceAgentTransactions)
        .where(eq(voiceAgentTransactions.tenantId, tenantId))
        .orderBy(desc(voiceAgentTransactions.createdAt))
        .limit(10);

      return {
        ...credits,
        recentTransactions
      };
    } catch (error) {
      console.error('Error fetching credit stats:', error);
      throw error;
    }
  }
}

export const voiceAgentRequestService = new VoiceAgentRequestService();
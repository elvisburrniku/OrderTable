import twilio from 'twilio';
import { db } from './db';
import { 
  voiceAgents, 
  phoneNumbers, 
  voiceCallLogs, 
  voiceAgentCredits,
  type VoiceAgent,
  type PhoneNumber,
  type InsertVoiceAgent,
  type InsertPhoneNumber,
  type InsertVoiceCallLog,
  type VoiceAgentCredits
} from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

interface SynthflowAgent {
  id: string;
  name: string;
  phoneNumber?: string;
  instructions: string;
  greeting: string;
  voice?: string;
  language?: string;
}

interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  monthlyFee: number;
}

export class VoiceAgentService {
  private twilioClient: twilio.Twilio | null = null;
  private synthflowApiUrl = 'https://api.synthflow.ai/v1';
  
  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      try {
        this.twilioClient = twilio(accountSid, authToken);
        console.log('Voice Agent Service: Twilio initialized successfully');
      } catch (error) {
        console.error('Voice Agent Service: Failed to initialize Twilio:', error);
        this.twilioClient = null;
      }
    } else {
      console.log('Voice Agent Service: Twilio credentials not configured');
    }
  }

  // Encrypt API keys before storing
  private encryptApiKey(apiKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-this-in-production'.padEnd(32).slice(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt API keys when using
  private decryptApiKey(encryptedKey: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-this-in-production'.padEnd(32).slice(0, 32));
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Purchase a phone number from Twilio
  async purchasePhoneNumber(tenantId: number, areaCode?: string, country: string = 'US'): Promise<PhoneNumber | null> {
    if (!this.twilioClient) {
      throw new Error('Twilio is not configured');
    }

    try {
      // Search for available phone numbers
      const availableNumbers = await this.twilioClient.availablePhoneNumbers(country)
        .local
        .list({
          areaCode: areaCode,
          voiceEnabled: true,
          smsEnabled: true,
          limit: 1
        });

      if (availableNumbers.length === 0) {
        throw new Error('No phone numbers available in the specified area');
      }

      const numberToPurchase = availableNumbers[0];

      // Purchase the phone number
      const purchasedNumber = await this.twilioClient.incomingPhoneNumbers.create({
        phoneNumber: numberToPurchase.phoneNumber,
        voiceUrl: `${process.env.BASE_URL || 'https://readytable.com'}/api/voice/webhook`,
        voiceMethod: 'POST',
        smsUrl: `${process.env.BASE_URL || 'https://readytable.com'}/api/sms/webhook`,
        smsMethod: 'POST'
      });

      // Store in database
      const [phoneNumberRecord] = await db.insert(phoneNumbers).values({
        tenantId,
        phoneNumber: purchasedNumber.phoneNumber,
        twilioPhoneSid: purchasedNumber.sid,
        friendlyName: purchasedNumber.friendlyName || `Restaurant Line ${tenantId}`,
        capabilities: {
          voice: true,
          sms: true,
          mms: purchasedNumber.capabilities?.mms || false
        },
        monthlyFee: '3.00', // Typical Twilio phone number cost
        status: 'active'
      }).returning();

      return phoneNumberRecord;
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      throw error;
    }
  }

  // Release a phone number back to Twilio
  async releasePhoneNumber(phoneNumberId: number, tenantId: number): Promise<boolean> {
    if (!this.twilioClient) {
      throw new Error('Twilio is not configured');
    }

    try {
      // Get phone number from database
      const [phoneNumberRecord] = await db
        .select()
        .from(phoneNumbers)
        .where(and(
          eq(phoneNumbers.id, phoneNumberId),
          eq(phoneNumbers.tenantId, tenantId)
        ))
        .limit(1);

      if (!phoneNumberRecord) {
        throw new Error('Phone number not found');
      }

      // Release from Twilio
      await this.twilioClient.incomingPhoneNumbers(phoneNumberRecord.twilioPhoneSid).remove();

      // Update database
      await db
        .update(phoneNumbers)
        .set({
          status: 'released',
          releaseDate: new Date()
        })
        .where(eq(phoneNumbers.id, phoneNumberId));

      // Also deactivate any agents using this number
      await db
        .update(voiceAgents)
        .set({
          isActive: false,
          phoneNumberId: null
        })
        .where(eq(voiceAgents.phoneNumberId, phoneNumberId));

      return true;
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw error;
    }
  }

  // Create a Synthflow agent
  async createSynthflowAgent(
    tenantId: number,
    restaurantId: number,
    agentData: {
      name: string;
      greeting: string;
      instructions: string;
      synthflowApiKey: string;
      phoneNumberId?: number;
      voice?: string;
      language?: string;
    }
  ): Promise<VoiceAgent> {
    try {
      // Create agent in Synthflow
      const synthflowResponse = await fetch(`${this.synthflowApiUrl}/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${agentData.synthflowApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: agentData.name,
          greeting: agentData.greeting,
          instructions: agentData.instructions,
          voice: agentData.voice || 'alloy',
          language: agentData.language || 'en-US',
          webhookUrl: `${process.env.BASE_URL || 'https://readytable.com'}/api/voice/synthflow-webhook`
        })
      });

      if (!synthflowResponse.ok) {
        const error = await synthflowResponse.text();
        throw new Error(`Synthflow API error: ${error}`);
      }

      const synthflowAgent: SynthflowAgent = await synthflowResponse.json();

      // Store agent in database
      const encryptedApiKey = this.encryptApiKey(agentData.synthflowApiKey);
      
      const [agent] = await db.insert(voiceAgents).values({
        tenantId,
        restaurantId,
        name: agentData.name,
        synthflowAgentId: synthflowAgent.id,
        synthflowApiKey: encryptedApiKey,
        phoneNumberId: agentData.phoneNumberId,
        greeting: agentData.greeting,
        instructions: agentData.instructions,
        agentConfig: {
          voice: agentData.voice || 'alloy',
          language: agentData.language || 'en-US'
        },
        isActive: true
      }).returning();

      // Initialize credits for the tenant if not exists
      await this.initializeCredits(tenantId);

      // If phone number is provided, configure it with Synthflow
      if (agentData.phoneNumberId) {
        await this.assignPhoneNumberToAgent(agent.id, agentData.phoneNumberId, tenantId);
      }

      return agent;
    } catch (error) {
      console.error('Error creating Synthflow agent:', error);
      throw error;
    }
  }

  // Assign a phone number to an agent
  async assignPhoneNumberToAgent(agentId: number, phoneNumberId: number, tenantId: number): Promise<boolean> {
    try {
      // Get agent and phone number
      const [agent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.id, agentId),
          eq(voiceAgents.tenantId, tenantId)
        ))
        .limit(1);

      const [phoneNumber] = await db
        .select()
        .from(phoneNumbers)
        .where(and(
          eq(phoneNumbers.id, phoneNumberId),
          eq(phoneNumbers.tenantId, tenantId)
        ))
        .limit(1);

      if (!agent || !phoneNumber) {
        throw new Error('Agent or phone number not found');
      }

      if (!agent.synthflowApiKey) {
        throw new Error('Agent API key not configured');
      }

      // Decrypt API key
      const apiKey = this.decryptApiKey(agent.synthflowApiKey);

      // Update Synthflow agent with phone number
      const response = await fetch(`${this.synthflowApiUrl}/agents/${agent.synthflowAgentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.phoneNumber
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update Synthflow agent');
      }

      // Update database
      await db
        .update(voiceAgents)
        .set({ phoneNumberId })
        .where(eq(voiceAgents.id, agentId));

      // Update Twilio webhook to route to Synthflow
      if (this.twilioClient) {
        await this.twilioClient.incomingPhoneNumbers(phoneNumber.twilioPhoneSid)
          .update({
            voiceUrl: `${process.env.BASE_URL || 'https://readytable.com'}/api/voice/webhook/${agentId}`,
            voiceMethod: 'POST'
          });
      }

      return true;
    } catch (error) {
      console.error('Error assigning phone number to agent:', error);
      throw error;
    }
  }

  // Initialize voice credits for a tenant
  async initializeCredits(tenantId: number): Promise<VoiceAgentCredits> {
    // Check if credits already exist
    const [existing] = await db
      .select()
      .from(voiceAgentCredits)
      .where(eq(voiceAgentCredits.tenantId, tenantId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new credits
    const [credits] = await db.insert(voiceAgentCredits).values({
      tenantId,
      totalMinutes: 60, // Start with 60 free minutes
      usedMinutes: 0,
      monthlyMinutes: 60,
      additionalMinutes: 0,
      costPerMinute: '0.10'
    }).returning();

    return credits;
  }

  // Get remaining credits for a tenant
  async getRemainingCredits(tenantId: number): Promise<number> {
    const [credits] = await db
      .select()
      .from(voiceAgentCredits)
      .where(eq(voiceAgentCredits.tenantId, tenantId))
      .limit(1);

    if (!credits) {
      const newCredits = await this.initializeCredits(tenantId);
      return newCredits.totalMinutes - newCredits.usedMinutes;
    }

    return credits.totalMinutes + credits.additionalMinutes - credits.usedMinutes;
  }

  // Log a call and update credits
  async logCall(callData: InsertVoiceCallLog): Promise<void> {
    try {
      // Insert call log
      await db.insert(voiceCallLogs).values(callData);

      // Update credits if duration is provided
      if (callData.duration && callData.tenantId) {
        const minutes = Math.ceil(callData.duration / 60);
        
        await db
          .update(voiceAgentCredits)
          .set({
            usedMinutes: sql`${voiceAgentCredits.usedMinutes} + ${minutes}`,
            updatedAt: new Date()
          })
          .where(eq(voiceAgentCredits.tenantId, callData.tenantId));

        // Update agent's monthly call count
        if (callData.voiceAgentId) {
          await db
            .update(voiceAgents)
            .set({
              callsPerMonth: sql`${voiceAgents.callsPerMonth} + 1`,
              updatedAt: new Date()
            })
            .where(eq(voiceAgents.id, callData.voiceAgentId));
        }
      }
    } catch (error) {
      console.error('Error logging call:', error);
      throw error;
    }
  }

  // Get call logs for a tenant
  async getCallLogs(tenantId: number, restaurantId?: number, limit: number = 50): Promise<any[]> {
    const query = db
      .select()
      .from(voiceCallLogs)
      .where(
        restaurantId 
          ? and(
              eq(voiceCallLogs.tenantId, tenantId),
              eq(voiceCallLogs.restaurantId, restaurantId)
            )
          : eq(voiceCallLogs.tenantId, tenantId)
      )
      .orderBy(sql`${voiceCallLogs.createdAt} DESC`)
      .limit(limit);

    return await query;
  }

  // Purchase additional minutes
  async purchaseAdditionalMinutes(tenantId: number, minutes: number): Promise<VoiceAgentCredits> {
    const [credits] = await db
      .update(voiceAgentCredits)
      .set({
        additionalMinutes: sql`${voiceAgentCredits.additionalMinutes} + ${minutes}`,
        updatedAt: new Date()
      })
      .where(eq(voiceAgentCredits.tenantId, tenantId))
      .returning();

    return credits;
  }

  // Reset monthly credits (to be called by a cron job)
  async resetMonthlyCredits(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await db
      .update(voiceAgentCredits)
      .set({
        usedMinutes: 0,
        totalMinutes: sql`${voiceAgentCredits.monthlyMinutes}`,
        lastResetDate: new Date(),
        updatedAt: new Date()
      })
      .where(sql`${voiceAgentCredits.lastResetDate} <= ${thirtyDaysAgo}`);

    // Reset monthly call counts for agents
    await db
      .update(voiceAgents)
      .set({
        callsPerMonth: 0,
        updatedAt: new Date()
      });

    console.log('Monthly voice credits reset completed');
  }
}

export const voiceAgentService = new VoiceAgentService();
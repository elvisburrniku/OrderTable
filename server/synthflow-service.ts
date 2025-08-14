import { db } from './db';
import { voiceAgents, phoneNumbers, voiceCallLogs } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface SynthflowAgent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'training';
  phone_number?: string;
  created_at: string;
  updated_at: string;
  config: {
    language: string;
    voice_id: string;
    greeting_message: string;
    personality: string;
    business_context: string;
    booking_instructions: string;
  };
}

export interface SynthflowCall {
  id: string;
  agent_id: string;
  caller_phone: string;
  call_status: 'completed' | 'failed' | 'in_progress' | 'no_answer';
  duration: number;
  cost: number;
  transcription: string;
  recording_url?: string;
  start_time: string;
  end_time?: string;
  metadata: {
    intent?: string;
    extracted_info?: any;
    booking_created?: boolean;
    sentiment?: string;
  };
}

export interface CreateAgentRequest {
  name: string;
  language: string;
  voice_id: string;
  greeting_message: string;
  personality: string;
  business_context: string;
  booking_instructions: string;
  webhook_url?: string;
}

export interface AssignPhoneNumberRequest {
  agent_id: string;
  phone_number: string;
}

class SynthflowService {
  private apiKey: string;
  private baseUrl: string = 'https://api.synthflow.ai/v2';

  constructor() {
    this.apiKey = process.env.SYNTHFLOW_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('SYNTHFLOW_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Synthflow API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // Agent Management
  async createAgent(request: CreateAgentRequest): Promise<SynthflowAgent> {
    const payload = {
      name: request.name,
      language: request.language,
      voice_id: request.voice_id,
      greeting_message: request.greeting_message,
      personality: request.personality,
      business_context: request.business_context,
      booking_instructions: request.booking_instructions,
      webhook_url: request.webhook_url,
    };

    return this.makeRequest('/assistants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAgent(agentId: string, updates: Partial<CreateAgentRequest>): Promise<SynthflowAgent> {
    return this.makeRequest(`/assistants/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getAgent(agentId: string): Promise<SynthflowAgent> {
    return this.makeRequest(`/assistants/${agentId}`);
  }

  async listAgents(): Promise<{ agents: SynthflowAgent[] }> {
    return this.makeRequest('/assistants');
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.makeRequest(`/assistants/${agentId}`, {
      method: 'DELETE',
    });
  }

  // Phone Number Management
  async assignPhoneNumber(request: AssignPhoneNumberRequest): Promise<void> {
    return this.makeRequest('/phone-numbers/assign', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async listAvailablePhoneNumbers(): Promise<{ phone_numbers: string[] }> {
    return this.makeRequest('/phone-numbers/available');
  }

  async releasePhoneNumber(phoneNumber: string): Promise<void> {
    return this.makeRequest('/phone-numbers/release', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  // Call Management
  async getCalls(agentId?: string, limit: number = 50, offset: number = 0): Promise<{ calls: SynthflowCall[], total: number }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (agentId) {
      params.append('agent_id', agentId);
    }

    return this.makeRequest(`/calls?${params.toString()}`);
  }

  async getCall(callId: string): Promise<SynthflowCall> {
    return this.makeRequest(`/calls/${callId}`);
  }

  // Webhook handling for incoming calls
  async handleIncomingCall(webhookData: any): Promise<void> {
    try {
      const { call_id, agent_id, caller_phone, call_status, duration, cost, transcription, recording_url, start_time, end_time, metadata } = webhookData;

      // Find the voice agent in our database
      const [agent] = await db
        .select({
          id: voiceAgents.id,
          tenantId: voiceAgents.tenantId,
          restaurantId: voiceAgents.restaurantId,
          synthflowAgentId: voiceAgents.synthflowAgentId,
        })
        .from(voiceAgents)
        .where(eq(voiceAgents.synthflowAgentId, agent_id))
        .limit(1);

      if (!agent) {
        console.error(`No voice agent found for Synthflow agent ID: ${agent_id}`);
        return;
      }

      // Get phone number info
      const [phoneNumber] = await db
        .select({
          id: phoneNumbers.id,
        })
        .from(phoneNumbers)
        .where(eq(phoneNumbers.phoneNumber, caller_phone))
        .limit(1);

      // Store call log in our database
      await db.insert(voiceCallLogs).values({
        tenantId: agent.tenantId,
        restaurantId: agent.restaurantId,
        voiceAgentId: agent.id,
        phoneNumberId: phoneNumber?.id,
        synthflowCallId: call_id,
        callerPhone: caller_phone,
        callDirection: 'inbound',
        callStatus: call_status,
        duration,
        transcription,
        cost: cost.toString(),
        startTime: new Date(start_time),
        endTime: end_time ? new Date(end_time) : null,
        bookingDetails: metadata?.extracted_info || {},
        agentResponse: metadata || {},
        recordingUrl: recording_url,
      });

      // Process booking if agent successfully created one
      if (metadata?.booking_created) {
        await this.processBookingFromCall(agent.tenantId, agent.restaurantId, metadata.extracted_info);
      }

      console.log(`Processed incoming call: ${call_id} for agent ${agent_id}`);
    } catch (error) {
      console.error('Error handling incoming call webhook:', error);
      throw error;
    }
  }

  // Helper method to process booking creation from AI agent
  private async processBookingFromCall(tenantId: number, restaurantId: number, bookingInfo: any): Promise<void> {
    try {
      // Here we could integrate with the existing booking system
      // For now, we'll just log the booking information
      console.log('Booking created from voice agent:', {
        tenantId,
        restaurantId,
        bookingInfo
      });

      // TODO: Integrate with the existing booking creation system
      // This would involve:
      // 1. Validating the extracted booking information
      // 2. Checking availability
      // 3. Creating the booking in the database
      // 4. Sending confirmation to the customer
    } catch (error) {
      console.error('Error processing booking from call:', error);
    }
  }

  // Generate agent configuration for restaurant booking
  generateRestaurantAgentConfig(restaurantName: string, language: string = 'en'): CreateAgentRequest {
    const configs = {
      en: {
        greeting: `Hello! Thank you for calling ${restaurantName}. I'm your AI assistant and I'm here to help you with reservations, answer questions about our menu, hours, and services. How can I assist you today?`,
        personality: 'friendly, professional, helpful, and knowledgeable about restaurant operations',
        context: `You are an AI voice assistant for ${restaurantName}, a restaurant. You help customers with:
- Making, modifying, and cancelling reservations
- Providing information about menu items, prices, and dietary restrictions
- Sharing restaurant hours, location, and contact information
- Answering questions about special events and private dining
- Taking messages for the management team

Always be polite, professional, and helpful. If you cannot complete a request, offer alternatives or suggest the customer speak with a manager.`,
        instructions: `When handling reservations:
1. Collect: customer name, phone number, date, time, party size
2. Check availability (assume available unless told otherwise)
3. Confirm all details before finalizing
4. Provide confirmation number if booking is successful
5. For modifications: get reservation details, make changes, confirm
6. For cancellations: get reservation details, process cancellation, confirm

Extract the following information and format as JSON:
{
  "intent": "make_reservation|modify_reservation|cancel_reservation|general_inquiry",
  "extracted_info": {
    "customer_name": "string",
    "phone_number": "string",
    "party_size": number,
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "special_requests": "string"
  },
  "booking_created": boolean,
  "sentiment": "positive|neutral|negative"
}`
      },
      fr: {
        greeting: `Bonjour ! Merci d'appeler ${restaurantName}. Je suis votre assistant IA et je suis là pour vous aider avec les réservations, répondre aux questions sur notre menu, nos horaires et nos services. Comment puis-je vous aider aujourd'hui ?`,
        personality: 'amical, professionnel, serviable et compétent en restauration',
        context: `Vous êtes un assistant vocal IA pour ${restaurantName}, un restaurant. Vous aidez les clients avec :
- Faire, modifier et annuler des réservations
- Fournir des informations sur les plats, les prix et les restrictions alimentaires
- Partager les horaires du restaurant, l'emplacement et les informations de contact
- Répondre aux questions sur les événements spéciaux et les dîners privés
- Prendre des messages pour l'équipe de direction`,
        instructions: `Pour les réservations:
1. Collectez: nom du client, numéro de téléphone, date, heure, nombre de personnes
2. Vérifiez la disponibilité
3. Confirmez tous les détails avant de finaliser
4. Fournissez un numéro de confirmation si la réservation réussit`
      }
    };

    const config = configs[language as keyof typeof configs] || configs.en;

    return {
      name: `${restaurantName} AI Assistant`,
      language,
      voice_id: language === 'fr' ? 'fr-FR-DeniseNeural' : 'en-US-JennyNeural',
      greeting_message: config.greeting,
      personality: config.personality,
      business_context: config.context,
      booking_instructions: config.instructions,
      webhook_url: `${process.env.REPLIT_DOMAINS_APP || 'http://localhost:5000'}/api/synthflow/webhook`,
    };
  }

  // SIP Call Management (for Twilio integration)
  async makeSipCall(request: MakeCallRequest & { sip_trunk_uri?: string }): Promise<SynthflowCall> {
    const payload = {
      agent_id: request.agent_id,
      phone_number: request.phone_number,
      name: request.name,
      custom_variables: request.custom_variables || {},
      customer_email: request.customer_email,
      customer_timezone: request.customer_timezone,
      sip_trunk_uri: request.sip_trunk_uri,
    };

    return this.makeRequest('/sip-calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Number Management for Twilio Integration
  async importTwilioNumber(request: {
    phone_number: string;
    termination_uri: string;
    username?: string;
    password?: string;
    friendly_name?: string;
  }): Promise<{ success: boolean; number_id?: string }> {
    const payload = {
      phone_number: request.phone_number,
      termination_uri: request.termination_uri,
      username: request.username,
      password: request.password,
      friendly_name: request.friendly_name,
    };

    return this.makeRequest('/numbers/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listNumbers(): Promise<{ numbers: Array<any> }> {
    return this.makeRequest('/numbers');
  }

  async deleteNumber(numberId: string): Promise<void> {
    await this.makeRequest(`/numbers/${numberId}`, {
      method: 'DELETE',
    });
  }
}

export const synthflowService = new SynthflowService();
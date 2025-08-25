import { db } from './db';
import { 
  voiceAgents, 
  restaurants,
  voiceCallLogs, 
  bookings,
  type VoiceAgent,
  type InsertVoiceCallLog,
  type InsertBooking
} from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  voice_id: string;
  prompt: string;
  first_message: string;
  language: string;
  model: string;
}

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: 'started' | 'completed' | 'failed';
  transcript?: Array<{
    role: 'assistant' | 'user';
    content: string;
    timestamp: string;
  }>;
  metadata?: {
    phone_number?: string;
    duration?: number;
    booking_details?: {
      guest_name?: string;
      date?: string;
      time?: string;
      guests?: number;
      special_requests?: string;
      action?: 'new_reservation' | 'cancel_reservation' | 'modify_reservation' | 'inquiry';
    };
  };
}

export class ElevenLabsService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || null;
    if (!this.apiKey) {
      console.warn('ElevenLabs service: API key not configured');
    } else {
      console.log('ElevenLabs service initialized successfully');
    }
  }

  // Create restaurant assistant prompt template
  generateRestaurantPrompt(restaurantName: string, customGreeting?: string, customClosing?: string): string {
    const greeting = customGreeting || `Thank you for calling ${restaurantName}, this is the reservations assistant. How may I help you today?`;
    const closing = customClosing || `Thank you for calling ${restaurantName}. We look forward to serving you!`;

    return `You are a friendly and professional restaurant reservation assistant for ${restaurantName}.

## Personality
- Warm, polite, and professional
- Speak in a natural, human-like style
- Always thank callers for choosing ${restaurantName}

## Greeting
"${greeting}"

## Capabilities
1. **Reservation Management:**
   - Collect caller's name, date, time, number of guests, and special requests
   - Handle new reservations, changes, and cancellations
   - Confirm by repeating details: "Just to confirm, [guest_name], your reservation is for [guests] guests on [date] at [time]."

2. **Information Requests:**
   - Provide basic restaurant information (hours, location, menu highlights)
   - Answer common questions about dining policies

3. **Fallback Handling:**
   If unsure about something, say: "Let me forward your request to the staff, and someone will get back to you shortly."

## Closing
Always end with: "${closing}"

## Important Instructions
- Extract booking information in this JSON format when a reservation is made:
  {
    "action": "new_reservation|cancel_reservation|modify_reservation|inquiry",
    "guest_name": "customer name",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "guests": number,
    "special_requests": "any special requests",
    "phone_number": "caller's phone number"
  }
- Be helpful but stay within your role as a reservation assistant
- If asked about complex menu details or policies you're unsure about, offer to connect them with staff`;
  }

  // Create ElevenLabs conversational agent
  async createAgent(config: {
    restaurantId: number;
    name: string;
    voiceId: string;
    language?: string;
    customGreeting?: string;
    customClosing?: string;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      // Get restaurant details
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, config.restaurantId))
        .limit(1);

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const prompt = this.generateRestaurantPrompt(
        restaurant.name, 
        config.customGreeting, 
        config.customClosing
      );

      const agentPayload = {
        name: config.name,
        voice_id: config.voiceId,
        prompt: prompt,
        first_message: config.customGreeting || `Thank you for calling ${restaurant.name}, this is the reservations assistant. How may I help you today?`,
        language: config.language || 'en',
        model: 'eleven_turbo_v2_5'
      };

      const response = await fetch(`${this.baseUrl}/convai/agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.agent_id;

    } catch (error) {
      console.error('Error creating ElevenLabs agent:', error);
      throw error;
    }
  }

  // Update existing agent configuration
  async updateAgent(agentId: string, config: {
    restaurantId: number;
    name?: string;
    voiceId?: string;
    language?: string;
    customGreeting?: string;
    customClosing?: string;
  }): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      // Get restaurant details
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, config.restaurantId))
        .limit(1);

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const updatePayload: any = {};

      if (config.name) updatePayload.name = config.name;
      if (config.voiceId) updatePayload.voice_id = config.voiceId;
      if (config.language) updatePayload.language = config.language;

      // Always update prompt if greeting/closing changed
      if (config.customGreeting || config.customClosing) {
        updatePayload.prompt = this.generateRestaurantPrompt(
          restaurant.name, 
          config.customGreeting, 
          config.customClosing
        );
        updatePayload.first_message = config.customGreeting || `Thank you for calling ${restaurant.name}, this is the reservations assistant. How may I help you today?`;
      }

      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

    } catch (error) {
      console.error('Error updating ElevenLabs agent:', error);
      throw error;
    }
  }

  // Get agent details
  async getAgent(agentId: string): Promise<ElevenLabsAgent | null> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting ElevenLabs agent:', error);
      throw error;
    }
  }

  // Delete agent
  async deleteAgent(agentId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

    } catch (error) {
      console.error('Error deleting ElevenLabs agent:', error);
      throw error;
    }
  }

  // Get list of available voices
  async getVoices(): Promise<Array<{ voice_id: string; name: string; category: string; }>> {
    if (!this.apiKey || this.apiKey === 'your_elevenlabs_api_key_here') {
      console.warn('ElevenLabs API key not properly configured');
      return [
        { voice_id: 'demo-voice-1', name: 'Demo Voice 1 (Configure API Key)', category: 'demo' },
        { voice_id: 'demo-voice-2', name: 'Demo Voice 2 (Configure API Key)', category: 'demo' }
      ];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`ElevenLabs API error: ${response.status} - ${error}`);
        
        // Return demo voices if API key is invalid
        if (response.status === 401) {
          return [
            { voice_id: 'demo-voice-1', name: 'Demo Voice 1 (Invalid API Key)', category: 'demo' },
            { voice_id: 'demo-voice-2', name: 'Demo Voice 2 (Invalid API Key)', category: 'demo' }
          ];
        }
        
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.voices || [];

    } catch (error) {
      console.error('Error getting ElevenLabs voices:', error);
      
      // Return demo voices as fallback
      return [
        { voice_id: 'demo-voice-1', name: 'Demo Voice 1 (Error)', category: 'demo' },
        { voice_id: 'demo-voice-2', name: 'Demo Voice 2 (Error)', category: 'demo' }
      ];
    }
  }

  // Handle webhook from ElevenLabs (call completion)
  async handleWebhook(webhookData: ElevenLabsConversation): Promise<void> {
    try {
      // Find the voice agent by conversation ID
      const [callLog] = await db
        .select({
          id: voiceCallLogs.id,
          voiceAgentId: voiceCallLogs.voiceAgentId,
          restaurantId: voiceCallLogs.restaurantId,
          tenantId: voiceCallLogs.tenantId
        })
        .from(voiceCallLogs)
        .where(eq(voiceCallLogs.elevenlabsConversationId, webhookData.conversation_id))
        .limit(1);

      if (!callLog) {
        console.warn('Call log not found for conversation:', webhookData.conversation_id);
        return;
      }

      // Update call log with transcript and booking details
      const updateData: Partial<InsertVoiceCallLog> = {
        callStatus: webhookData.status === 'completed' ? 'completed' : 'failed',
        transcription: JSON.stringify(webhookData.transcript),
        agentResponse: webhookData.metadata as any,
        bookingDetails: webhookData.metadata?.booking_details as any,
        endTime: new Date()
      };

      if (webhookData.metadata?.duration) {
        updateData.duration = webhookData.metadata.duration;
      }

      await db
        .update(voiceCallLogs)
        .set(updateData)
        .where(eq(voiceCallLogs.id, callLog.id));

      // Create booking if agent extracted booking details
      if (webhookData.metadata?.booking_details && 
          webhookData.metadata.booking_details.action === 'new_reservation' &&
          webhookData.metadata.booking_details.guest_name &&
          webhookData.metadata.booking_details.date &&
          webhookData.metadata.booking_details.time) {
        
        await this.createBookingFromVoiceCall({
          restaurantId: callLog.restaurantId,
          tenantId: callLog.tenantId,
          callLogId: callLog.id,
          bookingDetails: webhookData.metadata.booking_details
        });
      }

    } catch (error) {
      console.error('Error handling ElevenLabs webhook:', error);
      throw error;
    }
  }

  // Create booking from voice call
  private async createBookingFromVoiceCall(data: {
    restaurantId: number;
    tenantId: number;
    callLogId: number;
    bookingDetails: NonNullable<ElevenLabsConversation['metadata']>['booking_details'];
  }): Promise<void> {
    try {
      const { bookingDetails } = data;
      if (!bookingDetails) return;

      // Parse date and time
      const bookingDate = new Date(`${bookingDetails.date}T${bookingDetails.time}`);
      
      const newBooking: InsertBooking = {
        tenantId: data.tenantId,
        restaurantId: data.restaurantId,
        guestName: bookingDetails.guest_name || 'Voice Booking',
        guestPhone: bookingDetails.phone_number || '',
        guestEmail: '', // Not collected via voice typically
        bookingDate,
        partySize: bookingDetails.guests || 2,
        specialRequests: bookingDetails.special_requests || '',
        status: 'confirmed',
        source: 'voice_agent',
        bookingReference: `VA-${Date.now()}`,
        isWalkIn: false
      };

      const [booking] = await db
        .insert(bookings)
        .values(newBooking)
        .returning();

      // Update call log with booking ID
      await db
        .update(voiceCallLogs)
        .set({ bookingId: booking.id })
        .where(eq(voiceCallLogs.id, data.callLogId));

      console.log(`Voice booking created: ${booking.id} for ${bookingDetails.guest_name}`);

    } catch (error) {
      console.error('Error creating booking from voice call:', error);
    }
  }

  // Log incoming call
  async logIncomingCall(data: {
    tenantId: number;
    restaurantId: number;
    voiceAgentId: number;
    callerPhone: string;
    conversationId: string;
    phoneNumberId?: number;
  }): Promise<number> {
    try {
      const [callLog] = await db
        .insert(voiceCallLogs)
        .values({
          tenantId: data.tenantId,
          restaurantId: data.restaurantId,
          voiceAgentId: data.voiceAgentId,
          phoneNumberId: data.phoneNumberId,
          callerPhone: data.callerPhone,
          callDirection: 'inbound',
          callStatus: 'initiated',
          elevenlabsConversationId: data.conversationId,
          startTime: new Date()
        })
        .returning();

      return callLog.id;

    } catch (error) {
      console.error('Error logging incoming call:', error);
      throw error;
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
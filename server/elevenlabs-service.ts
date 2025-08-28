import { db } from './db';
import { 
  voiceAgents, 
  restaurants,
  voiceCallLogs, 
  bookings,
  voiceAgentKnowledgeBase,
  voiceAgentDynamicVariables,
  voiceAgentServerTools,
  voiceAgentConversationAnalytics,
  type VoiceAgent,
  type InsertVoiceCallLog,
  type InsertBooking,
  type VoiceAgentKnowledgeBase as KnowledgeBaseType,
  type InsertVoiceAgentKnowledgeBase,
  type VoiceAgentDynamicVariable,
  type InsertVoiceAgentDynamicVariable,
  type VoiceAgentServerTool,
  type InsertVoiceAgentServerTool
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
  knowledge_base?: Array<{
    knowledge_base_id: string;
    name: string;
    type: string;
  }>;
  tools?: Array<{
    tool_id: string;
    name: string;
    type: string;
  }>;
  dynamic_variables?: Record<string, any>;
}

interface ElevenLabsKnowledgeBaseItem {
  knowledge_base_id: string;
  name: string;
  type: 'file' | 'url' | 'text';
  content?: string;
  source_url?: string;
  file_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface ElevenLabsServerTool {
  tool_id: string;
  name: string;
  description: string;
  type: 'webhook';
  config: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    authentication_id?: string;
    path_parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    query_parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    body_parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    assignments?: Array<{
      variable_name: string;
      response_path: string;
    }>;
  };
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

  // Enhanced restaurant prompt with dynamic variables support
  generateRestaurantPrompt(
    restaurantName: string, 
    customGreeting?: string, 
    customClosing?: string,
    dynamicVariables?: Record<string, string>
  ): string {
    const greeting = customGreeting || `Thank you for calling ${restaurantName}, this is the reservations assistant. How may I help you today?`;
    const closing = customClosing || `Thank you for calling ${restaurantName}. We look forward to serving you!`;

    // Build dynamic variable placeholders
    const dynamicVarPlaceholders = dynamicVariables ? 
      Object.keys(dynamicVariables).map(key => `{{${key}}}`).join(', ') : '';

    const dynamicVarInstructions = dynamicVariables && Object.keys(dynamicVariables).length > 0 ? 
      `\n\n## Dynamic Information Available\nYou have access to real-time information through these variables: ${dynamicVarPlaceholders}\nUse this information to provide accurate, up-to-date responses to customers.` : '';

    return `You are a friendly and professional restaurant reservation assistant for ${restaurantName}.

## Personality
- Warm, polite, and professional
- Speak in a natural, human-like style
- Always thank callers for choosing ${restaurantName}
- Use available real-time information to provide accurate responses

## Greeting
"${greeting}"

## Enhanced Capabilities
1. **Smart Reservation Management:**
   - Check real-time table availability using available tools
   - Collect caller's name, date, time, number of guests, and special requests
   - Handle new reservations, changes, and cancellations
   - Provide alternative times if requested slot is unavailable
   - Confirm by repeating details: "Just to confirm, {{caller_name}}, your reservation is for {{guests}} guests on {{date}} at {{time}}."

2. **Intelligent Information Requests:**
   - Access restaurant knowledge base for accurate information
   - Provide current hours, location, menu highlights, and policies
   - Share today's specials and current promotions
   - Answer questions about dietary restrictions and allergens

3. **Advanced Customer Service:**
   - Recognize returning customers when possible
   - Provide personalized recommendations
   - Handle special occasion bookings (birthdays, anniversaries)
   - Manage waitlist requests during busy periods

4. **Smart Escalation:**
   If you encounter something outside your capabilities, say: "Let me connect you with our staff who can assist you with that specific request."

## Closing
Always end with: "${closing}"

## Critical Instructions
- Always use available tools to check real-time availability before confirming reservations
- Extract booking information in this JSON format when a reservation is made:
  {
    "action": "new_reservation|cancel_reservation|modify_reservation|inquiry",
    "guest_name": "{{caller_name}}",
    "date": "{{booking_date}}",
    "time": "{{booking_time}}",
    "guests": {{party_size}},
    "special_requests": "{{special_requests}}",
    "phone_number": "{{system__caller_id}}"
  }
- Use knowledge base information for accurate restaurant details
- Leverage dynamic variables for personalized service
- Be helpful but stay within your role as a reservation assistant${dynamicVarInstructions}`;
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

      // Generate dynamic variables for this restaurant
      const dynamicVariables = await this.generateDynamicVariables(config.restaurantId);

      const prompt = this.generateRestaurantPrompt(
        restaurant.name, 
        config.customGreeting, 
        config.customClosing,
        dynamicVariables
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
        // Generate dynamic variables for this restaurant
        const dynamicVariables = await this.generateDynamicVariables(config.restaurantId);
        
        updatePayload.prompt = this.generateRestaurantPrompt(
          restaurant.name, 
          config.customGreeting, 
          config.customClosing,
          dynamicVariables
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

  // === KNOWLEDGE BASE MANAGEMENT ===

  // Create knowledge base item for agent
  async createKnowledgeBaseItem(agentId: string, item: {
    name: string;
    type: 'file' | 'url' | 'text';
    content?: string;
    source_url?: string;
    file_data?: Buffer;
    file_name?: string;
    mime_type?: string;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      let payload: any = {
        name: item.name,
        type: item.type
      };

      if (item.type === 'text' && item.content) {
        payload.text = item.content;
      } else if (item.type === 'url' && item.source_url) {
        payload.source_url = item.source_url;
      } else if (item.type === 'file' && item.file_data) {
        // For file uploads, we need to use FormData
        const formData = new FormData();
        formData.append('name', item.name);
        formData.append('type', item.type);
        formData.append('file', new Blob([item.file_data], { type: item.mime_type }), item.file_name);
        
        const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/knowledge-base`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`ElevenLabs Knowledge Base API error: ${response.status} - ${error}`);
        }

        const result = await response.json();
        return result.knowledge_base_id;
      }

      // For text and URL types
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/knowledge-base`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Knowledge Base API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.knowledge_base_id;

    } catch (error) {
      console.error('Error creating knowledge base item:', error);
      throw error;
    }
  }

  // Get knowledge base items for agent
  async getKnowledgeBaseItems(agentId: string): Promise<ElevenLabsKnowledgeBaseItem[]> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/knowledge-base`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Knowledge Base API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.knowledge_base_items || [];

    } catch (error) {
      console.error('Error getting knowledge base items:', error);
      throw error;
    }
  }

  // Delete knowledge base item
  async deleteKnowledgeBaseItem(agentId: string, knowledgeBaseId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/knowledge-base/${knowledgeBaseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Knowledge Base API error: ${response.status} - ${error}`);
      }

    } catch (error) {
      console.error('Error deleting knowledge base item:', error);
      throw error;
    }
  }

  // === SERVER TOOLS MANAGEMENT ===

  // Create server tool for agent
  async createServerTool(agentId: string, tool: {
    name: string;
    description: string;
    method: string;
    url: string;
    authentication_id?: string;
    headers?: Record<string, string>;
    path_parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    query_parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    body_parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      required?: boolean;
    }>;
    response_assignments?: Array<{
      variable_name: string;
      response_path: string;
    }>;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const toolPayload = {
        name: tool.name,
        description: tool.description,
        type: 'webhook',
        tool_config: {
          method: tool.method,
          url: tool.url,
          authentication_id: tool.authentication_id,
          headers: tool.headers || {},
          path_parameters: tool.path_parameters || [],
          query_parameters: tool.query_parameters || [],
          body_parameters: tool.body_parameters || [],
          assignments: tool.response_assignments || []
        }
      };

      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/tools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(toolPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Tools API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.tool_id;

    } catch (error) {
      console.error('Error creating server tool:', error);
      throw error;
    }
  }

  // Get server tools for agent
  async getServerTools(agentId: string): Promise<ElevenLabsServerTool[]> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/tools`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Tools API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.tools || [];

    } catch (error) {
      console.error('Error getting server tools:', error);
      throw error;
    }
  }

  // Delete server tool
  async deleteServerTool(agentId: string, toolId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/convai/agents/${agentId}/tools/${toolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Tools API error: ${response.status} - ${error}`);
      }

    } catch (error) {
      console.error('Error deleting server tool:', error);
      throw error;
    }
  }

  // === CONVERSATION INITIATION WITH DYNAMIC VARIABLES ===

  // Start conversation with dynamic variables
  async startConversationWithDynamicVariables(agentId: string, dynamicVariables: Record<string, any> = {}): Promise<string> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const conversationPayload = {
        agent_id: agentId,
        dynamic_variables: dynamicVariables
      };

      const response = await fetch(`${this.baseUrl}/convai/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(conversationPayload)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs Conversation API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      return result.conversation_id;

    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }

  // Generate real-time dynamic variables for restaurant
  async generateDynamicVariables(restaurantId: number): Promise<Record<string, any>> {
    try {
      // Get current restaurant data
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);

      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      // Build dynamic variables
      const dynamicVariables: Record<string, any> = {
        restaurant_name: restaurant.name,
        current_date: today,
        current_time: currentTime,
        restaurant_address: restaurant.address || 'Please ask for our location',
        restaurant_phone: restaurant.phone || '',
        booking_availability_status: 'checking...' // This would be updated by tools
      };

      // Add system variables that ElevenLabs provides automatically
      // These are just for reference in our system
      const systemVariables = {
        'system__agent_id': 'auto-populated',
        'system__current_agent_id': 'auto-populated',
        'system__caller_id': 'auto-populated',
        'system__called_number': 'auto-populated',
        'system__call_duration_secs': 'auto-populated',
        'system__time_utc': 'auto-populated',
        'system__conversation_id': 'auto-populated'
      };

      return { ...dynamicVariables, ...systemVariables };

    } catch (error) {
      console.error('Error generating dynamic variables:', error);
      return {
        restaurant_name: 'Restaurant',
        current_date: new Date().toISOString().split('T')[0],
        current_time: new Date().toTimeString().split(' ')[0].substring(0, 5)
      };
    }
  }
}

export const elevenLabsService = new ElevenLabsService();
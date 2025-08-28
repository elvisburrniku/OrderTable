import { Router } from 'express';
import { z } from 'zod';
import { elevenLabsService } from './elevenlabs-service';
import { db } from './db';
import { voiceAgents, restaurants, tenants, voiceAgentCredits } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { requirePermission } from './permissions-middleware';

const router = Router();

// Validation schemas
const createElevenLabsAgentSchema = z.object({
  voiceId: z.string().min(1, 'Voice ID is required'),
  language: z.string().default('en'),
  customGreeting: z.string().optional(),
  customClosingMessage: z.string().optional(),
  knowledgeBaseItems: z.array(z.object({
    name: z.string(),
    type: z.enum(['file', 'url', 'text']),
    content: z.string().optional(),
    source_url: z.string().optional()
  })).optional(),
  serverTools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    method: z.string(),
    url: z.string(),
    authenticationId: z.string().optional(),
    headers: z.record(z.string()).optional(),
    pathParameters: z.array(z.any()).optional(),
    queryParameters: z.array(z.any()).optional(),
    bodyParameters: z.array(z.any()).optional(),
    responseAssignments: z.array(z.any()).optional()
  })).optional(),
  dynamicVariables: z.record(z.any()).optional()
});

const updateElevenLabsAgentSchema = z.object({
  voiceId: z.string().optional(),
  language: z.string().optional(),
  customGreeting: z.string().optional(),
  customClosingMessage: z.string().optional(),
  knowledgeBaseItems: z.array(z.object({
    name: z.string(),
    type: z.enum(['file', 'url', 'text']),
    content: z.string().optional(),
    source_url: z.string().optional()
  })).optional(),
  serverTools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    method: z.string(),
    url: z.string(),
    authenticationId: z.string().optional(),
    headers: z.record(z.string()).optional(),
    pathParameters: z.array(z.any()).optional(),
    queryParameters: z.array(z.any()).optional(),
    bodyParameters: z.array(z.any()).optional(),
    responseAssignments: z.array(z.any()).optional()
  })).optional(),
  dynamicVariables: z.record(z.any()).optional()
});

const webhookSchema = z.object({
  conversation_id: z.string(),
  agent_id: z.string(),
  status: z.enum(['started', 'completed', 'failed']),
  transcript: z.array(z.object({
    role: z.enum(['assistant', 'user']),
    content: z.string(),
    timestamp: z.string()
  })).optional(),
  metadata: z.object({
    phone_number: z.string().optional(),
    duration: z.number().optional(),
    booking_details: z.object({
      guest_name: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      guests: z.number().optional(),
      special_requests: z.string().optional(),
      action: z.enum(['new_reservation', 'cancel_reservation', 'modify_reservation', 'inquiry']).optional()
    }).optional()
  }).optional()
});

// GET /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-voices
// Get available ElevenLabs voices
router.get('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-voices', 
  requirePermission('access_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;

      // Verify tenant and restaurant access
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(and(
          eq(restaurants.id, parseInt(restaurantId)),
          eq(restaurants.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }

      const voices = await elevenLabsService.getVoices();
      
      // Check if we're returning demo voices due to API issues
      const isDemoMode = voices.some(voice => voice.category === 'demo');
      
      res.json({ 
        voices,
        isDemoMode,
        message: isDemoMode ? 'ElevenLabs API key not configured. Please add your API key to environment variables.' : null
      });

    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      res.status(200).json({ 
        voices: [
          { voice_id: 'fallback-voice', name: 'Fallback Voice (Service Unavailable)', category: 'fallback' }
        ],
        isDemoMode: true,
        error: 'ElevenLabs service temporarily unavailable'
      });
    }
  }
);

// POST /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent
// Create or update ElevenLabs agent for restaurant
router.post('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const validationResult = createElevenLabsAgentSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validationResult.error.issues 
        });
      }

      const { voiceId, language, customGreeting, customClosingMessage } = validationResult.data;

      // Verify restaurant and get existing voice agent
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(and(
          eq(restaurants.id, parseInt(restaurantId)),
          eq(restaurants.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }

      // Check if voice agent already exists
      const [existingAgent] = await db
        .select()
        .from(voiceAgents)
        .where(eq(voiceAgents.restaurantId, parseInt(restaurantId)))
        .limit(1);

      if (!existingAgent) {
        return res.status(400).json({ 
          error: 'Voice agent request must be approved first. Please submit a voice agent request.' 
        });
      }

      // Check if credits are available
      const [credits] = await db
        .select()
        .from(voiceAgentCredits)
        .where(eq(voiceAgentCredits.tenantId, parseInt(tenantId)))
        .limit(1);

      if (!credits || !credits.isActive || parseFloat(credits.creditBalance) < parseFloat(credits.minimumBalance)) {
        return res.status(400).json({ 
          error: 'Insufficient voice agent credits. Please add credits to continue.' 
        });
      }

      let agentId: string;

      if (existingAgent.elevenlabsAgentId) {
        // Update existing ElevenLabs agent
        await elevenLabsService.updateAgent(existingAgent.elevenlabsAgentId, {
          restaurantId: parseInt(restaurantId),
          voiceId,
          language,
          customGreeting,
          customClosing: customClosingMessage
        });
        agentId = existingAgent.elevenlabsAgentId;
      } else {
        // Create new ElevenLabs agent
        agentId = await elevenLabsService.createAgent({
          restaurantId: parseInt(restaurantId),
          name: `${restaurant.name} Assistant`,
          voiceId,
          language,
          customGreeting,
          customClosing: customClosingMessage
        });
      }

      // Update database with ElevenLabs configuration
      await db
        .update(voiceAgents)
        .set({
          provider: 'elevenlabs',
          elevenlabsAgentId: agentId,
          elevenlabsVoiceId: voiceId,
          language,
          restaurantGreeting: customGreeting,
          restaurantClosingMessage: customClosingMessage,
          updatedAt: new Date()
        })
        .where(eq(voiceAgents.id, existingAgent.id));

      res.json({ 
        success: true, 
        agentId,
        message: 'ElevenLabs voice agent configured successfully'
      });

    } catch (error) {
      console.error('Error creating ElevenLabs agent:', error);
      res.status(500).json({ error: 'Failed to create voice agent' });
    }
  }
);

// PUT /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent
// Update ElevenLabs agent configuration
router.put('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const validationResult = updateElevenLabsAgentSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: validationResult.error.issues 
        });
      }

      const updateData = validationResult.data;

      // Get existing voice agent
      const [existingAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!existingAgent || !existingAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      // Update ElevenLabs agent
      await elevenLabsService.updateAgent(existingAgent.elevenlabsAgentId, {
        restaurantId: parseInt(restaurantId),
        ...updateData,
        customClosing: updateData.customClosingMessage
      });

      // Update database
      const dbUpdateData: any = {
        updatedAt: new Date()
      };

      if (updateData.voiceId) dbUpdateData.elevenlabsVoiceId = updateData.voiceId;
      if (updateData.language) dbUpdateData.language = updateData.language;
      if (updateData.customGreeting) dbUpdateData.restaurantGreeting = updateData.customGreeting;
      if (updateData.customClosingMessage) dbUpdateData.restaurantClosingMessage = updateData.customClosingMessage;

      await db
        .update(voiceAgents)
        .set(dbUpdateData)
        .where(eq(voiceAgents.id, existingAgent.id));

      res.json({ 
        success: true,
        message: 'ElevenLabs voice agent updated successfully'
      });

    } catch (error) {
      console.error('Error updating ElevenLabs agent:', error);
      res.status(500).json({ error: 'Failed to update voice agent' });
    }
  }
);

// GET /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent
// Get ElevenLabs agent details
router.get('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent',
  requirePermission('access_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;

      const [voiceAgent] = await db
        .select({
          id: voiceAgents.id,
          tenantId: voiceAgents.tenantId,
          restaurantId: voiceAgents.restaurantId,
          isActive: voiceAgents.isActive,
          language: voiceAgents.language,
          phoneNumberId: voiceAgents.phoneNumberId,
          maxCallsPerMonth: voiceAgents.maxCallsPerMonth,
          createdAt: voiceAgents.createdAt,
          updatedAt: voiceAgents.updatedAt
        })
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent) {
        return res.status(404).json({ error: 'Voice agent not found' });
      }

      let agentDetails = null;
      if (voiceAgent.elevenlabsAgentId) {
        try {
          agentDetails = await elevenLabsService.getAgent(voiceAgent.elevenlabsAgentId);
        } catch (error) {
          console.warn('Could not fetch ElevenLabs agent details:', error);
        }
      }

      res.json({
        voiceAgent,
        elevenlabsAgent: agentDetails
      });

    } catch (error) {
      console.error('Error fetching ElevenLabs agent:', error);
      res.status(500).json({ error: 'Failed to fetch voice agent details' });
    }
  }
);

// DELETE /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent
// Delete ElevenLabs agent
router.delete('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-agent',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent) {
        return res.status(404).json({ error: 'Voice agent not found' });
      }

      // Delete from ElevenLabs if agent exists
      if (voiceAgent.elevenlabsAgentId) {
        try {
          await elevenLabsService.deleteAgent(voiceAgent.elevenlabsAgentId);
        } catch (error) {
          console.warn('Could not delete ElevenLabs agent:', error);
        }
      }

      // Update database (switch back to synthflow or disable)
      await db
        .update(voiceAgents)
        .set({
          provider: 'synthflow',
          elevenlabsAgentId: null,
          elevenlabsVoiceId: null,
          elevenlabsWebhookUrl: null,
          updatedAt: new Date()
        })
        .where(eq(voiceAgents.id, voiceAgent.id));

      res.json({ 
        success: true,
        message: 'ElevenLabs voice agent deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting ElevenLabs agent:', error);
      res.status(500).json({ error: 'Failed to delete voice agent' });
    }
  }
);

// POST /api/elevenlabs/webhook
// Handle ElevenLabs webhooks (call completions, etc.)
router.post('/elevenlabs/webhook', async (req, res) => {
  try {
    const validationResult = webhookSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error('Invalid ElevenLabs webhook data:', validationResult.error);
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    const webhookData = validationResult.data;

    await elevenLabsService.handleWebhook(webhookData);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error handling ElevenLabs webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/elevenlabs/call-started
// Log incoming call start (for call tracking)
router.post('/elevenlabs/call-started', async (req, res) => {
  try {
    const { conversation_id, agent_id, phone_number } = req.body;

    if (!conversation_id || !agent_id || !phone_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find voice agent by ElevenLabs agent ID
    const [voiceAgent] = await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.elevenlabsAgentId, agent_id))
      .limit(1);

    if (!voiceAgent) {
      console.warn('Voice agent not found for ElevenLabs agent:', agent_id);
      return res.status(404).json({ error: 'Voice agent not found' });
    }

    // Log the call
    const callLogId = await elevenLabsService.logIncomingCall({
      tenantId: voiceAgent.tenantId,
      restaurantId: voiceAgent.restaurantId,
      voiceAgentId: voiceAgent.id,
      callerPhone: phone_number,
      conversationId: conversation_id,
      phoneNumberId: voiceAgent.phoneNumberId
    });

    res.json({ success: true, callLogId });

  } catch (error) {
    console.error('Error logging ElevenLabs call start:', error);
    res.status(500).json({ error: 'Failed to log call' });
  }
});

// GET /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-knowledge-base
// Get knowledge base items for restaurant's voice agent
router.get('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-knowledge-base',
  requirePermission('access_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      const knowledgeBaseItems = await elevenLabsService.getKnowledgeBaseItems(voiceAgent.elevenlabsAgentId);
      
      res.json({ knowledgeBaseItems });

    } catch (error) {
      console.error('Error fetching knowledge base items:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base items' });
    }
  }
);

// POST /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-knowledge-base
// Add knowledge base item
router.post('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-knowledge-base',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const { name, type, content, source_url } = req.body;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      const knowledgeBaseId = await elevenLabsService.createKnowledgeBaseItem(
        voiceAgent.elevenlabsAgentId,
        { name, type, content, source_url }
      );

      res.json({ 
        success: true, 
        knowledgeBaseId,
        message: 'Knowledge base item created successfully' 
      });

    } catch (error) {
      console.error('Error creating knowledge base item:', error);
      res.status(500).json({ error: 'Failed to create knowledge base item' });
    }
  }
);

// DELETE /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-knowledge-base/:knowledgeBaseId
// Delete knowledge base item
router.delete('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-knowledge-base/:knowledgeBaseId',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId, knowledgeBaseId } = req.params;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      await elevenLabsService.deleteKnowledgeBaseItem(voiceAgent.elevenlabsAgentId, knowledgeBaseId);

      res.json({ 
        success: true,
        message: 'Knowledge base item deleted successfully' 
      });

    } catch (error) {
      console.error('Error deleting knowledge base item:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base item' });
    }
  }
);

// GET /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-server-tools
// Get server tools for restaurant's voice agent
router.get('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-server-tools',
  requirePermission('access_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      const serverTools = await elevenLabsService.getServerTools(voiceAgent.elevenlabsAgentId);
      
      res.json({ serverTools });

    } catch (error) {
      console.error('Error fetching server tools:', error);
      res.status(500).json({ error: 'Failed to fetch server tools' });
    }
  }
);

// POST /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-server-tools
// Add server tool
router.post('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-server-tools',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const toolConfig = req.body;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      const toolId = await elevenLabsService.createServerTool(
        voiceAgent.elevenlabsAgentId,
        toolConfig
      );

      res.json({ 
        success: true, 
        toolId,
        message: 'Server tool created successfully' 
      });

    } catch (error) {
      console.error('Error creating server tool:', error);
      res.status(500).json({ error: 'Failed to create server tool' });
    }
  }
);

// DELETE /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-server-tools/:toolId
// Delete server tool
router.delete('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-server-tools/:toolId',
  requirePermission('manage_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId, toolId } = req.params;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      await elevenLabsService.deleteServerTool(voiceAgent.elevenlabsAgentId, toolId);

      res.json({ 
        success: true,
        message: 'Server tool deleted successfully' 
      });

    } catch (error) {
      console.error('Error deleting server tool:', error);
      res.status(500).json({ error: 'Failed to delete server tool' });
    }
  }
);

// GET /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-dynamic-variables
// Get dynamic variables for restaurant
router.get('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-dynamic-variables',
  requirePermission('access_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;

      const dynamicVariables = await elevenLabsService.generateDynamicVariables(parseInt(restaurantId));
      
      res.json({ dynamicVariables });

    } catch (error) {
      console.error('Error generating dynamic variables:', error);
      res.status(500).json({ error: 'Failed to generate dynamic variables' });
    }
  }
);

// POST /api/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-start-conversation
// Start conversation with dynamic variables
router.post('/tenants/:tenantId/restaurants/:restaurantId/elevenlabs-start-conversation',
  requirePermission('access_voice_agents'),
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const { customDynamicVariables } = req.body;

      const [voiceAgent] = await db
        .select()
        .from(voiceAgents)
        .where(and(
          eq(voiceAgents.restaurantId, parseInt(restaurantId)),
          eq(voiceAgents.tenantId, parseInt(tenantId))
        ))
        .limit(1);

      if (!voiceAgent || !voiceAgent.elevenlabsAgentId) {
        return res.status(404).json({ error: 'ElevenLabs voice agent not found' });
      }

      // Generate default dynamic variables and merge with custom ones
      const defaultVariables = await elevenLabsService.generateDynamicVariables(parseInt(restaurantId));
      const dynamicVariables = { ...defaultVariables, ...customDynamicVariables };

      const conversationId = await elevenLabsService.startConversationWithDynamicVariables(
        voiceAgent.elevenlabsAgentId,
        dynamicVariables
      );

      res.json({ 
        success: true, 
        conversationId,
        dynamicVariables,
        message: 'Conversation started successfully' 
      });

    } catch (error) {
      console.error('Error starting conversation:', error);
      res.status(500).json({ error: 'Failed to start conversation' });
    }
  }
);

// GET /api/tenants/:tenantId/restaurants/:restaurantId/availability-tool
// Real-time availability checking tool for voice agents
router.get('/tenants/:tenantId/restaurants/:restaurantId/availability-tool',
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const { date, time, guests } = req.query;

      if (!date || !time || !guests) {
        return res.status(400).json({ 
          error: 'Missing required parameters: date, time, guests',
          available: false,
          message: 'Please provide all booking details'
        });
      }

      // Convert to proper date format
      const requestedDateTime = new Date(`${date}T${time}:00`);
      const now = new Date();

      // Basic validation
      if (requestedDateTime < now) {
        return res.json({
          available: false,
          message: 'Requested time is in the past',
          alternatives: []
        });
      }

      // Get restaurant info
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(and(
          eq(restaurants.id, parseInt(restaurantId as string)),
          eq(restaurants.tenantId, parseInt(tenantId as string))
        ))
        .limit(1);

      if (!restaurant) {
        return res.status(404).json({ 
          error: 'Restaurant not found',
          available: false
        });
      }

      // Check if the restaurant is open at requested time
      // This is a simplified check - in a real system you'd check opening hours
      const hour = requestedDateTime.getHours();
      const isOpen = hour >= 11 && hour <= 22; // 11 AM to 10 PM

      if (!isOpen) {
        return res.json({
          available: false,
          message: `We are closed at ${time}. Our hours are 11:00 AM - 10:00 PM`,
          alternatives: [
            '12:00 PM',
            '1:00 PM', 
            '6:00 PM',
            '7:00 PM'
          ]
        });
      }

      // Check existing bookings for conflicts
      const existingBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.restaurantId, parseInt(restaurantId as string)),
          eq(bookings.status, 'confirmed')
        ));

      // Simple availability logic (in real system, check table capacity)
      const maxBookingsPerHour = 20; // Example capacity
      const bookingsAtTime = existingBookings.filter(booking => {
        const bookingTime = new Date(booking.bookingDate);
        return Math.abs(bookingTime.getTime() - requestedDateTime.getTime()) < 60 * 60 * 1000; // Within 1 hour
      });

      const totalGuests = bookingsAtTime.reduce((sum, booking) => sum + booking.partySize, 0);
      const requestedGuests = parseInt(guests as string);
      
      const available = (totalGuests + requestedGuests) <= maxBookingsPerHour;

      if (available) {
        return res.json({
          available: true,
          message: `Yes, we have availability for ${guests} guests on ${date} at ${time}`,
          booking_info: {
            date: date,
            time: time,
            guests: requestedGuests,
            estimated_duration: '2 hours'
          }
        });
      } else {
        // Generate alternative times
        const alternatives = [];
        for (let i = 1; i <= 3; i++) {
          const altTime = new Date(requestedDateTime.getTime() + (i * 60 * 60 * 1000));
          if (altTime.getHours() <= 21) {
            alternatives.push(altTime.toTimeString().substring(0, 5));
          }
        }

        return res.json({
          available: false,
          message: `Sorry, we're fully booked at ${time}. Here are some alternative times:`,
          alternatives: alternatives,
          current_capacity: `${totalGuests}/${maxBookingsPerHour} guests booked`
        });
      }

    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({ 
        error: 'Failed to check availability',
        available: false,
        message: 'Please try again or contact us directly'
      });
    }
  }
);

// POST /api/tenants/:tenantId/restaurants/:restaurantId/menu-info-tool
// Menu information tool for voice agents
router.get('/tenants/:tenantId/restaurants/:restaurantId/menu-info-tool',
  async (req, res) => {
    try {
      const { tenantId, restaurantId } = req.params;
      const { category, item, dietary } = req.query;

      // Get restaurant info
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(and(
          eq(restaurants.id, parseInt(restaurantId as string)),
          eq(restaurants.tenantId, parseInt(tenantId as string))
        ))
        .limit(1);

      if (!restaurant) {
        return res.status(404).json({ 
          error: 'Restaurant not found'
        });
      }

      // This would typically connect to your menu system
      // For demo purposes, providing sample menu data
      const sampleMenu = {
        appetizers: [
          { name: 'Bruschetta', price: '$12', description: 'Fresh tomatoes, basil, mozzarella', dietary: ['vegetarian'] },
          { name: 'Calamari', price: '$16', description: 'Crispy squid with marinara sauce', dietary: [] }
        ],
        mains: [
          { name: 'Grilled Salmon', price: '$28', description: 'Atlantic salmon with seasonal vegetables', dietary: ['gluten-free'] },
          { name: 'Pasta Primavera', price: '$22', description: 'Fresh vegetables with penne pasta', dietary: ['vegetarian', 'vegan-option'] },
          { name: 'Ribeye Steak', price: '$36', description: '12oz ribeye with garlic mashed potatoes', dietary: ['gluten-free'] }
        ],
        desserts: [
          { name: 'Tiramisu', price: '$9', description: 'Classic Italian dessert', dietary: ['vegetarian'] },
          { name: 'Chocolate Cake', price: '$10', description: 'Rich chocolate layer cake', dietary: ['vegetarian'] }
        ],
        beverages: [
          { name: 'House Wine', price: '$8/glass', description: 'Red or white wine selection', dietary: [] },
          { name: 'Fresh Juice', price: '$6', description: 'Orange, apple, or cranberry', dietary: ['vegan', 'gluten-free'] }
        ]
      };

      // Filter based on query parameters
      let response: any = {
        restaurant_name: restaurant.name,
        menu_highlights: []
      };

      if (category && sampleMenu[category as keyof typeof sampleMenu]) {
        response.category = category;
        response.items = sampleMenu[category as keyof typeof sampleMenu];
      } else if (item) {
        // Search for specific item across all categories
        const allItems = Object.values(sampleMenu).flat();
        const foundItem = allItems.find(menuItem => 
          menuItem.name.toLowerCase().includes((item as string).toLowerCase())
        );
        if (foundItem) {
          response.item = foundItem;
        } else {
          response.message = `Sorry, we don't have ${item} on our menu. Would you like to hear about our specials?`;
        }
      } else if (dietary) {
        // Filter by dietary restrictions
        const allItems = Object.values(sampleMenu).flat();
        const filteredItems = allItems.filter(menuItem => 
          menuItem.dietary.some(diet => 
            diet.toLowerCase().includes((dietary as string).toLowerCase())
          )
        );
        response.dietary_filter = dietary;
        response.items = filteredItems;
      } else {
        // Return categories and highlights
        response.categories = Object.keys(sampleMenu);
        response.menu_highlights = [
          'Grilled Salmon - Our signature dish',
          'Pasta Primavera - Popular vegetarian option',
          'Ribeye Steak - Premium cut',
          'Fresh daily specials available'
        ];
        response.message = 'What type of dish interests you? We have appetizers, mains, desserts, and beverages.';
      }

      res.json(response);

    } catch (error) {
      console.error('Error getting menu info:', error);
      res.status(500).json({ 
        error: 'Failed to get menu information',
        message: 'Please ask our staff for menu details'
      });
    }
  }
);

export { router as elevenLabsRouter };
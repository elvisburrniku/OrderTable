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
  customClosingMessage: z.string().optional()
});

const updateElevenLabsAgentSchema = z.object({
  voiceId: z.string().optional(),
  language: z.string().optional(),
  customGreeting: z.string().optional(),
  customClosingMessage: z.string().optional()
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

export { router as elevenLabsRouter };
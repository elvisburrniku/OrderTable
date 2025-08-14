import { Router } from 'express';
import { voiceAgentService } from './voice-agent-service';
import { storage } from './storage';
import { z } from 'zod';
import { errorHandler } from './error-handler';
import twilio from 'twilio';

const router = Router();

// Schema validation
const createAgentSchema = z.object({
  restaurantId: z.number(),
  name: z.string().min(1),
  greeting: z.string().min(1),
  instructions: z.string().min(1),
  synthflowApiKey: z.string().min(1),
  phoneNumberId: z.number().optional(),
  voice: z.string().optional(),
  language: z.string().optional()
});

const purchasePhoneSchema = z.object({
  areaCode: z.string().optional(),
  country: z.string().default('US')
});

// Get all voice agents for a tenant
router.get('/api/tenants/:tenantId/voice-agents', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    const agents = await storage.getVoiceAgentsByTenant(tenantId);
    res.json(agents);
  } catch (error) {
    console.error('Error fetching voice agents:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch voice agents', error as Error));
  }
});

// Get voice agents for a specific restaurant
router.get('/api/tenants/:tenantId/restaurants/:restaurantId/voice-agents', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const restaurantId = parseInt(req.params.restaurantId);
    
    if (!tenantId || !restaurantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant or restaurant ID'));
    }

    const agents = await storage.getVoiceAgentsByRestaurant(restaurantId, tenantId);
    res.json(agents);
  } catch (error) {
    console.error('Error fetching restaurant voice agents:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch voice agents', error as Error));
  }
});

// Get voice agent by ID
router.get('/api/tenants/:tenantId/voice-agents/:id', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const agentId = parseInt(req.params.id);
    
    if (!tenantId || !agentId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant or agent ID'));
    }

    const agent = await storage.getVoiceAgentById(agentId, tenantId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Voice agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error fetching voice agent:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch voice agent', error as Error));
  }
});

// Create a new voice agent
router.post('/api/tenants/:tenantId/voice-agents', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    const validatedData = createAgentSchema.parse(req.body);
    
    // Check credits before creating agent
    const remainingCredits = await voiceAgentService.getRemainingCredits(tenantId);
    if (remainingCredits <= 0) {
      return errorHandler.handleError(res, errorHandler.subscriptionLimitError(0, 0, 'voice minutes'));
    }

    const agent = await voiceAgentService.createSynthflowAgent(
      tenantId,
      validatedData.restaurantId,
      validatedData
    );

    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating voice agent:', error);
    if (error instanceof z.ZodError) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid agent data', error.errors[0].message));
    }
    return errorHandler.handleError(res, errorHandler.systemError('Failed to create voice agent', error as Error));
  }
});

// Update voice agent
router.put('/api/tenants/:tenantId/voice-agents/:id', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const agentId = parseInt(req.params.id);
    
    if (!tenantId || !agentId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant or agent ID'));
    }

    const updates = req.body;
    const updatedAgent = await storage.updateVoiceAgent(agentId, updates, tenantId);
    
    if (!updatedAgent) {
      return res.status(404).json({ error: 'Voice agent not found' });
    }

    res.json(updatedAgent);
  } catch (error) {
    console.error('Error updating voice agent:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to update voice agent', error as Error));
  }
});

// Delete voice agent
router.delete('/api/tenants/:tenantId/voice-agents/:id', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const agentId = parseInt(req.params.id);
    
    if (!tenantId || !agentId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant or agent ID'));
    }

    const success = await storage.deleteVoiceAgent(agentId, tenantId);
    
    if (!success) {
      return res.status(404).json({ error: 'Voice agent not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting voice agent:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to delete voice agent', error as Error));
  }
});

// Phone Number Management

// Get all phone numbers for tenant
router.get('/api/tenants/:tenantId/phone-numbers', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    const phoneNumbers = await storage.getPhoneNumbersByTenant(tenantId);
    res.json(phoneNumbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch phone numbers', error as Error));
  }
});

// Purchase a new phone number
router.post('/api/tenants/:tenantId/phone-numbers/purchase', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    const validatedData = purchasePhoneSchema.parse(req.body);
    
    const phoneNumber = await voiceAgentService.purchasePhoneNumber(
      tenantId,
      validatedData.areaCode,
      validatedData.country
    );

    if (!phoneNumber) {
      return errorHandler.handleError(res, errorHandler.systemError('Failed to purchase phone number', new Error('No available numbers')));
    }

    res.status(201).json(phoneNumber);
  } catch (error) {
    console.error('Error purchasing phone number:', error);
    if (error instanceof z.ZodError) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid request data', error.errors[0].message));
    }
    return errorHandler.handleError(res, errorHandler.systemError('Failed to purchase phone number', error as Error));
  }
});

// Release a phone number
router.delete('/api/tenants/:tenantId/phone-numbers/:id', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const phoneNumberId = parseInt(req.params.id);
    
    if (!tenantId || !phoneNumberId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant or phone number ID'));
    }

    const success = await voiceAgentService.releasePhoneNumber(phoneNumberId, tenantId);
    
    if (!success) {
      return res.status(404).json({ error: 'Phone number not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error releasing phone number:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to release phone number', error as Error));
  }
});

// Assign phone number to agent
router.post('/api/tenants/:tenantId/voice-agents/:agentId/assign-number', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const agentId = parseInt(req.params.agentId);
    
    if (!tenantId || !agentId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant or agent ID'));
    }

    const { phoneNumberId } = req.body;

    if (!phoneNumberId) {
      return errorHandler.handleError(res, errorHandler.validationError('phoneNumberId', 'Phone number ID is required'));
    }

    const success = await voiceAgentService.assignPhoneNumberToAgent(agentId, phoneNumberId, tenantId);
    
    if (!success) {
      return errorHandler.handleError(res, errorHandler.systemError('Failed to assign phone number', new Error('Assignment failed')));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning phone number:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to assign phone number', error as Error));
  }
});

// Voice Credits Management

// Get voice credits for tenant
router.get('/api/tenants/:tenantId/voice-credits', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    let credits = await storage.getVoiceAgentCredits(tenantId);
    
    // Initialize credits if they don't exist
    if (!credits) {
      credits = await voiceAgentService.initializeCredits(tenantId);
    }

    const remainingMinutes = await voiceAgentService.getRemainingCredits(tenantId);
    
    res.json({
      ...credits,
      remainingMinutes
    });
  } catch (error) {
    console.error('Error fetching voice credits:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch voice credits', error as Error));
  }
});

// Purchase additional voice minutes
router.post('/api/tenants/:tenantId/voice-credits/purchase', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    const { minutes } = req.body;
    
    if (!minutes || minutes <= 0) {
      return errorHandler.handleError(res, errorHandler.validationError('minutes', 'Invalid number of minutes'));
    }

    const updatedCredits = await voiceAgentService.purchaseAdditionalMinutes(tenantId, minutes);
    const remainingMinutes = await voiceAgentService.getRemainingCredits(tenantId);
    
    res.json({
      ...updatedCredits,
      remainingMinutes
    });
  } catch (error) {
    console.error('Error purchasing voice minutes:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to purchase voice minutes', error as Error));
  }
});

// Call Logs

// Get call logs
router.get('/api/tenants/:tenantId/voice-call-logs', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.authenticationError('Invalid tenant ID'));
    }

    const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const logs = await storage.getVoiceCallLogs(tenantId, restaurantId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch call logs', error as Error));
  }
});

// Webhook endpoints for Twilio and Synthflow

// Twilio voice webhook
router.post('/api/voice/webhook/:agentId?', async (req, res) => {
  try {
    const agentId = req.params.agentId ? parseInt(req.params.agentId) : undefined;
    const { From, To, CallSid, CallStatus } = req.body;

    // Log the incoming call
    if (agentId) {
      const agent = await storage.getVoiceAgentById(agentId, 0); // We need to find tenant from agent
      if (agent) {
        await storage.createVoiceCallLog({
          tenantId: agent.tenantId,
          restaurantId: agent.restaurantId,
          voiceAgentId: agentId,
          twilioCallSid: CallSid,
          callerPhone: From,
          callDirection: 'inbound',
          callStatus: CallStatus,
          startTime: new Date()
        });

        // Forward to Synthflow if agent is configured
        if (agent.synthflowAgentId) {
          // Create TwiML response to forward to Synthflow
          const twiml = new twilio.twiml.VoiceResponse();
          twiml.redirect({
            method: 'POST'
          }, `https://api.synthflow.ai/webhooks/twilio/${agent.synthflowAgentId}`);
          
          res.type('text/xml');
          res.send(twiml.toString());
          return;
        }
      }
    }

    // Default response if no agent found
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Thank you for calling. Unfortunately, our voice assistant is not available at the moment. Please try again later.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling Twilio webhook:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We apologize, but we are experiencing technical difficulties. Please try again later.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Synthflow webhook for call updates
router.post('/api/voice/synthflow-webhook', async (req, res) => {
  try {
    const { 
      sessionId, 
      agentId, 
      callDuration, 
      transcription, 
      extractedData,
      bookingCreated 
    } = req.body;

    // Find the call log by synthflow session ID
    // This would need a method to find by synthflow session ID
    // For now, we'll just log the data
    console.log('Synthflow webhook received:', {
      sessionId,
      agentId,
      callDuration,
      extractedData,
      bookingCreated
    });

    // If booking was created, we should create the booking in our system
    if (bookingCreated && extractedData) {
      // Create booking logic here
      // This would integrate with the existing booking system
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Synthflow webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
import { Router } from 'express';
import { synthflowService } from './synthflow-service';
import { db } from './db';
import { voiceAgents, voiceCallLogs, phoneNumbers } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Webhook endpoint for Synthflow call events
router.post('/webhook', async (req, res) => {
  try {
    console.log('Synthflow webhook received:', JSON.stringify(req.body, null, 2));

    const { event, data } = req.body;

    switch (event) {
      case 'call.completed':
      case 'call.failed':
      case 'call.ended':
        await synthflowService.handleIncomingCall(data);
        break;
      case 'agent.created':
        console.log('Agent created:', data);
        break;
      case 'agent.updated':
        console.log('Agent updated:', data);
        break;
      default:
        console.log('Unknown webhook event:', event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Synthflow webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Test endpoint to verify Synthflow API connection
router.get('/test-connection', async (req, res) => {
  try {
    // Simple test to validate API key format
    if (!process.env.SYNTHFLOW_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'SYNTHFLOW_API_KEY not configured' 
      });
    }

    // Check if API key looks reasonable (basic validation)
    if (process.env.SYNTHFLOW_API_KEY.length < 10) {
      return res.status(500).json({ 
        success: false, 
        error: 'SYNTHFLOW_API_KEY appears to be too short' 
      });
    }

    // For production, we'll test with a basic API call
    // For development, we'll return a success response
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      res.json({ 
        success: true, 
        message: 'Synthflow API key configured correctly (Development mode)',
        agentCount: 0,
        note: 'Production API calls will be made when creating agents'
      });
    } else {
      const agents = await synthflowService.listAgents();
      const agentCount = Array.isArray(agents?.agents) ? agents.agents.length : 0;
      res.json({ 
        success: true, 
        message: 'Synthflow API connection successful',
        agentCount 
      });
    }
  } catch (error) {
    console.error('Synthflow connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Create a new voice agent in Synthflow
router.post('/create-agent/:tenantId/:restaurantId', async (req, res) => {
  try {
    const { tenantId, restaurantId } = req.params;
    const { restaurantName, language = 'en' } = req.body;

    // Generate agent configuration
    const agentConfig = synthflowService.generateRestaurantAgentConfig(restaurantName, language);

    // Create agent in Synthflow
    const synthflowAgent = await synthflowService.createAgent(agentConfig);

    // Update our database with Synthflow agent ID
    await db
      .update(voiceAgents)
      .set({
        synthflowAgentId: synthflowAgent.id,
        agentConfig: agentConfig,
        updatedAt: new Date()
      })
      .where(eq(voiceAgents.restaurantId, parseInt(restaurantId)));

    res.json({
      success: true,
      synthflowAgent,
      message: 'Voice agent created successfully in Synthflow'
    });
  } catch (error) {
    console.error('Error creating Synthflow agent:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create agent' 
    });
  }
});

// Update voice agent configuration
router.put('/update-agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const updates = req.body;

    const updatedAgent = await synthflowService.updateAgent(agentId, updates);

    // Update our database
    await db
      .update(voiceAgents)
      .set({
        agentConfig: updates,
        updatedAt: new Date()
      })
      .where(eq(voiceAgents.synthflowAgentId, agentId));

    res.json({
      success: true,
      agent: updatedAgent,
      message: 'Agent updated successfully'
    });
  } catch (error) {
    console.error('Error updating Synthflow agent:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update agent' 
    });
  }
});

// Get agent details from Synthflow
router.get('/agent/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agent = await synthflowService.getAgent(agentId);

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Error fetching Synthflow agent:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch agent' 
    });
  }
});

// Assign phone number to agent
router.post('/assign-phone/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { phoneNumber } = req.body;

    await synthflowService.assignPhoneNumber({
      agent_id: agentId,
      phone_number: phoneNumber
    });

    res.json({
      success: true,
      message: 'Phone number assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning phone number:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to assign phone number' 
    });
  }
});

// Get available phone numbers
router.get('/available-phones', async (req, res) => {
  try {
    const phoneNumbers = await synthflowService.listAvailablePhoneNumbers();

    res.json({
      success: true,
      phoneNumbers: phoneNumbers.phone_numbers
    });
  } catch (error) {
    console.error('Error fetching available phone numbers:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch phone numbers' 
    });
  }
});

// Get calls for an agent
router.get('/calls/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const calls = await synthflowService.getCalls(agentId, limit, offset);

    res.json({
      success: true,
      calls: calls.calls,
      total: calls.total
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch calls' 
    });
  }
});

// Sync calls from Synthflow to our database
router.post('/sync-calls/:tenantId/:restaurantId', async (req, res) => {
  try {
    const { tenantId, restaurantId } = req.params;
    
    // Get the voice agent for this restaurant
    const [voiceAgent] = await db
      .select()
      .from(voiceAgents)
      .where(eq(voiceAgents.restaurantId, parseInt(restaurantId)))
      .limit(1);

    if (!voiceAgent?.synthflowAgentId) {
      return res.status(404).json({ error: 'No Synthflow agent found for this restaurant' });
    }

    // Fetch calls from Synthflow
    const synthflowCalls = await synthflowService.getCalls(voiceAgent.synthflowAgentId, 100, 0);

    let syncedCount = 0;

    for (const call of synthflowCalls.calls) {
      // Check if we already have this call
      const [existingCall] = await db
        .select()
        .from(voiceCallLogs)
        .where(eq(voiceCallLogs.synthflowSessionId, call.id))
        .limit(1);

      if (!existingCall) {
        await db.insert(voiceCallLogs).values({
          tenantId: parseInt(tenantId),
          restaurantId: parseInt(restaurantId),
          voiceAgentId: voiceAgent.id,
          synthflowSessionId: call.id,
          callerPhone: call.caller_phone,
          callDirection: 'inbound',
          callStatus: call.call_status,
          duration: call.duration,
          transcription: call.transcription,
          cost: call.cost.toString(),
          startTime: new Date(call.start_time),
          endTime: call.end_time ? new Date(call.end_time) : null,
          recordingUrl: call.recording_url,
          bookingDetails: call.metadata?.extracted_info || {},
          agentResponse: call.metadata || {},
        });
        syncedCount++;
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedCount} new calls from Synthflow`,
      totalCalls: synthflowCalls.calls.length,
      newCalls: syncedCount
    });
  } catch (error) {
    console.error('Error syncing calls:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to sync calls' 
    });
  }
});

export default router;
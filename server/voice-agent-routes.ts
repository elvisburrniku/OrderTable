import { Router } from 'express';
import { z } from 'zod';
import { db } from './db';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { 
  voiceAgents, 
  systemVoiceAgent,
  phoneNumbers, 
  voiceCallLogs, 
  voiceAgentCredits,
  restaurants
} from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { errorHandler } from './error-handler';

const router = Router();

// Middleware for tenant validation
const validateTenant = async (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.params.tenantId || req.headers['x-tenant-id'] || req.query.tenantId || (req.body as any)?.tenantId;

  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }

  const parsedTenantId = parseInt(tenantId as string);

  try {
    const tenant = await storage.getTenantById(parsedTenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (tenant.subscriptionStatus === 'suspended') {
      return res.status(403).json({
        message: 'Account suspended',
        details: tenant.suspendReason || 'This tenant account has been suspended. Please contact support for assistance.',
        supportEmail: 'support@replit.com',
        status: 'suspended',
      });
    }

    if (tenant.subscriptionStatus === 'paused') {
      return res.status(403).json({
        message: 'Account paused',
        details: tenant.pauseReason || 'This tenant account is temporarily paused.',
        supportEmail: 'support@replit.com',
        status: 'paused',
        pauseEndDate: tenant.pauseEndDate,
      });
    }

    (req as any).tenantId = parsedTenantId;
    (req as any).tenant = tenant;
    next();
  } catch (error) {
    console.error('Error validating tenant:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Schema validation
const voiceAgentConfigSchema = z.object({
  isActive: z.boolean(),
  language: z.string().min(1),
  customInstructions: z.string().optional(),
});

// Get system voice agent configuration (admin managed)
router.get('/api/system-voice-agent', async (req, res) => {
  try {
    const systemAgents = await db.select().from(systemVoiceAgent).limit(1);
    
    if (systemAgents.length === 0) {
      // Return a default configuration if none exists
      return res.json({
        id: 0,
        name: "ReadyTable Assistant",
        defaultGreeting: "Hello! Thank you for calling. I'm your AI assistant and I'm here to help you make a reservation.",
        defaultInstructions: "You are a helpful restaurant reservation assistant. Help customers make, modify, or cancel reservations. Always be polite and professional.",
        supportedLanguages: ["en", "es", "fr", "de", "it"],
        isActive: false
      });
    }

    const agent = systemAgents[0];
    res.json({
      ...agent,
      supportedLanguages: typeof agent.supportedLanguages === 'string' 
        ? JSON.parse(agent.supportedLanguages)
        : agent.supportedLanguages
    });
  } catch (error) {
    console.error('Error fetching system voice agent:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch system voice agent', error as Error));
  }
});

// Get restaurant voice agent configuration
router.get('/api/tenants/:tenantId/restaurants/:restaurantId/voice-agent-config', validateTenant, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const restaurantId = parseInt(req.params.restaurantId);

    if (!tenantId || !restaurantId) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid tenant or restaurant ID'));
    }

    // Check if restaurant belongs to tenant
    const restaurant = await db.select()
      .from(restaurants)
      .where(and(eq(restaurants.id, restaurantId), eq(restaurants.tenantId, tenantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return errorHandler.handleError(res, errorHandler.authorizationError('Restaurant not found or access denied'));
    }

    // Get existing voice agent configuration for this restaurant
    const configs = await db.select()
      .from(voiceAgents)
      .where(and(eq(voiceAgents.restaurantId, restaurantId), eq(voiceAgents.tenantId, tenantId)))
      .limit(1);

    if (configs.length === 0) {
      // Create default configuration
      const newConfig = await db.insert(voiceAgents).values({
        tenantId,
        restaurantId,
        isActive: false,
        language: 'en',
        customInstructions: null,
        callsPerMonth: 0,
        maxCallsPerMonth: 100
      }).returning();

      return res.json(newConfig[0]);
    }

    res.json(configs[0]);
  } catch (error) {
    console.error('Error fetching voice agent config:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch voice agent configuration', error as Error));
  }
});

// Update restaurant voice agent configuration
router.put('/api/tenants/:tenantId/restaurants/:restaurantId/voice-agent-config', validateTenant, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const restaurantId = parseInt(req.params.restaurantId);

    if (!tenantId || !restaurantId) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid tenant or restaurant ID'));
    }

    // Validate request body
    const validationResult = voiceAgentConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid voice agent configuration', validationResult.error));
    }

    const { isActive, language, customInstructions } = validationResult.data;

    // Check if restaurant belongs to tenant
    const restaurant = await db.select()
      .from(restaurants)
      .where(and(eq(restaurants.id, restaurantId), eq(restaurants.tenantId, tenantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return errorHandler.handleError(res, errorHandler.authorizationError('Restaurant not found or access denied'));
    }

    // Update or create voice agent configuration
    const existingConfigs = await db.select()
      .from(voiceAgents)
      .where(and(eq(voiceAgents.restaurantId, restaurantId), eq(voiceAgents.tenantId, tenantId)))
      .limit(1);

    let updatedConfig;

    if (existingConfigs.length === 0) {
      // Create new configuration
      const newConfigs = await db.insert(voiceAgents).values({
        tenantId,
        restaurantId,
        isActive,
        language,
        customInstructions: customInstructions || null,
        callsPerMonth: 0,
        maxCallsPerMonth: 100
      }).returning();
      
      updatedConfig = newConfigs[0];
    } else {
      // Update existing configuration
      const updated = await db.update(voiceAgents)
        .set({
          isActive,
          language,
          customInstructions: customInstructions || null,
          updatedAt: new Date()
        })
        .where(eq(voiceAgents.id, existingConfigs[0].id))
        .returning();
      
      updatedConfig = updated[0];
    }

    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating voice agent config:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to update voice agent configuration', error as Error));
  }
});

// Get phone numbers for a tenant
router.get('/api/tenants/:tenantId/phone-numbers', validateTenant, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);

    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid tenant ID'));
    }

    const numbers = await db.select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.tenantId, tenantId))
      .orderBy(desc(phoneNumbers.createdAt));

    res.json(numbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch phone numbers', error as Error));
  }
});

// Get voice call logs for a tenant
router.get('/api/tenants/:tenantId/voice-call-logs', validateTenant, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);

    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid tenant ID'));
    }

    const logs = await db.select()
      .from(voiceCallLogs)
      .where(eq(voiceCallLogs.tenantId, tenantId))
      .orderBy(desc(voiceCallLogs.createdAt))
      .limit(50); // Limit to recent 50 calls

    res.json(logs);
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch call logs', error as Error));
  }
});

// Get voice agent credits for a tenant
router.get('/api/tenants/:tenantId/voice-credits', validateTenant, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);

    if (!tenantId) {
      return errorHandler.handleError(res, errorHandler.validationError('Invalid tenant ID'));
    }

    const credits = await db.select()
      .from(voiceAgentCredits)
      .where(eq(voiceAgentCredits.tenantId, tenantId))
      .limit(1);

    if (credits.length === 0) {
      // Create default credits
      const newCredits = await db.insert(voiceAgentCredits).values({
        tenantId,
        totalMinutes: 60,
        usedMinutes: 0,
        monthlyMinutes: 60,
        additionalMinutes: 0,
        costPerMinute: "0.10",
        lastResetDate: new Date()
      }).returning();

      const credit = newCredits[0];
      return res.json({
        ...credit,
        remainingMinutes: credit.totalMinutes + credit.additionalMinutes - credit.usedMinutes
      });
    }

    const credit = credits[0];
    res.json({
      ...credit,
      remainingMinutes: credit.totalMinutes + credit.additionalMinutes - credit.usedMinutes
    });
  } catch (error) {
    console.error('Error fetching voice credits:', error);
    return errorHandler.handleError(res, errorHandler.systemError('Failed to fetch voice credits', error as Error));
  }
});

export default router;
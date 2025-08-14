import { Router } from 'express';
import { synthflowService } from './synthflow-service';
import { twilioSMSService } from './twilio-sms-service';

const router = Router();

// Use the existing Twilio SMS service instance
const twilioService = twilioSMSService;

// Get all Twilio phone numbers
router.get('/twilio/numbers', async (req, res) => {
  try {
    if (!twilioService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Twilio is not properly configured. Please check your TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
      });
    }

    const phoneNumbers = await twilioService.getPhoneNumbers();
    res.json({
      success: true,
      numbers: phoneNumbers
    });
  } catch (error) {
    console.error('Error fetching Twilio phone numbers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch phone numbers'
    });
  }
});

// Get all Twilio SIP trunks
router.get('/twilio/sip-trunks', async (req, res) => {
  try {
    if (!twilioService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Twilio is not properly configured'
      });
    }

    const sipTrunks = await twilioService.getSipTrunks();
    res.json({
      success: true,
      trunks: sipTrunks
    });
  } catch (error) {
    console.error('Error fetching Twilio SIP trunks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch SIP trunks'
    });
  }
});

// Import Twilio number to Synthflow
router.post('/twilio/import-to-synthflow', async (req, res) => {
  try {
    const { phone_number, termination_uri, username, password, friendly_name } = req.body;

    if (!phone_number || !termination_uri) {
      return res.status(400).json({
        success: false,
        error: 'phone_number and termination_uri are required'
      });
    }

    const result = await synthflowService.importTwilioNumber({
      phone_number,
      termination_uri,
      username,
      password,
      friendly_name
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error importing Twilio number to Synthflow:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import number'
    });
  }
});

// List all numbers imported to Synthflow
router.get('/synthflow/numbers', async (req, res) => {
  try {
    const numbers = await synthflowService.listNumbers();
    res.json({
      success: true,
      ...numbers
    });
  } catch (error) {
    console.error('Error fetching Synthflow numbers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Synthflow numbers'
    });
  }
});

// Remove number from Synthflow
router.delete('/synthflow/numbers/:numberId', async (req, res) => {
  try {
    const { numberId } = req.params;
    
    await synthflowService.deleteNumber(numberId);
    res.json({
      success: true,
      message: 'Number successfully removed from Synthflow'
    });
  } catch (error) {
    console.error('Error deleting Synthflow number:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete number'
    });
  }
});

// Make a SIP call through Synthflow using Twilio
router.post('/synthflow/sip-call', async (req, res) => {
  try {
    const { agent_id, phone_number, name, sip_trunk_uri, custom_variables, customer_email, customer_timezone } = req.body;

    if (!agent_id || !phone_number || !name) {
      return res.status(400).json({
        success: false,
        error: 'agent_id, phone_number, and name are required'
      });
    }

    const call = await synthflowService.makeSipCall({
      agent_id,
      phone_number,
      name,
      sip_trunk_uri,
      custom_variables,
      customer_email,
      customer_timezone
    });

    res.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('Error making SIP call:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to make SIP call'
    });
  }
});

export default router;
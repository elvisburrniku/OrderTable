
-- Add missing columns to voice_agents table
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS request_id INTEGER;
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'synthflow';
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS elevenlabs_agent_id VARCHAR(255);
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS elevenlabs_voice_id VARCHAR(255);
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS elevenlabs_webhook_url VARCHAR(500);
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS restaurant_greeting TEXT;
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS restaurant_closing_message TEXT;
ALTER TABLE voice_agents ADD COLUMN IF NOT EXISTS is_enabled_by_tenant BOOLEAN DEFAULT true;

-- Create voice_agent_requests table
CREATE TABLE IF NOT EXISTS voice_agent_requests (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  restaurant_id INTEGER NOT NULL,
  requested_by INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  business_justification TEXT NOT NULL,
  expected_call_volume INTEGER NOT NULL,
  requested_languages VARCHAR(100) DEFAULT 'en',
  admin_notes TEXT,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create voice_agent_credits table
CREATE TABLE IF NOT EXISTS voice_agent_credits (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL UNIQUE,
  credit_balance DECIMAL(10,2) DEFAULT 0.00,
  minimum_balance DECIMAL(10,2) DEFAULT 20.00,
  auto_recharge_amount DECIMAL(10,2) DEFAULT 50.00,
  low_balance_threshold DECIMAL(10,2) DEFAULT 5.00,
  auto_recharge_enabled BOOLEAN DEFAULT true,
  total_credits_added DECIMAL(10,2) DEFAULT 0.00,
  total_credits_used DECIMAL(10,2) DEFAULT 0.00,
  stripe_customer_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),
  last_charge_date TIMESTAMP,
  last_low_balance_alert TIMESTAMP,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create voice_agent_transactions table
CREATE TABLE IF NOT EXISTS voice_agent_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  credit_id INTEGER NOT NULL,
  call_log_id INTEGER,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,4) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  stripe_payment_intent_id VARCHAR(255),
  processed_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (credit_id) REFERENCES voice_agent_credits(id),
  FOREIGN KEY (call_log_id) REFERENCES voice_call_logs(id)
);

-- Add missing columns to voice_call_logs table if they don't exist
ALTER TABLE voice_call_logs ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id VARCHAR(255);
ALTER TABLE voice_call_logs ADD COLUMN IF NOT EXISTS booking_id INTEGER;

-- Add foreign key constraint for request_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'voice_agents_request_id_fkey'
  ) THEN
    ALTER TABLE voice_agents ADD CONSTRAINT voice_agents_request_id_fkey 
    FOREIGN KEY (request_id) REFERENCES voice_agent_requests(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_agent_requests_restaurant_id ON voice_agent_requests(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_voice_agent_requests_status ON voice_agent_requests(status);
CREATE INDEX IF NOT EXISTS idx_voice_agent_credits_tenant_id ON voice_agent_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_agent_transactions_tenant_id ON voice_agent_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_logs_elevenlabs_conversation_id ON voice_call_logs(elevenlabs_conversation_id);


-- Add customerEmail column to survey_responses table
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Update default response method to email
ALTER TABLE survey_responses ALTER COLUMN response_method SET DEFAULT 'email';

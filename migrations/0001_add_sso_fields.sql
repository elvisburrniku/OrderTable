-- Migration: Add SSO fields to users table
ALTER TABLE users 
ALTER COLUMN password DROP NOT NULL;

ALTER TABLE users 
ADD COLUMN sso_provider VARCHAR(50),
ADD COLUMN sso_id TEXT;

-- Create index for faster SSO lookups
CREATE INDEX idx_users_sso ON users(sso_provider, sso_id);
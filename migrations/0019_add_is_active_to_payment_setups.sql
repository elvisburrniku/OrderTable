
-- Add is_active column to payment_setups table
ALTER TABLE payment_setups 
ADD COLUMN is_active boolean DEFAULT true NOT NULL;

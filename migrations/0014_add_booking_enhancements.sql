
-- Add new comprehensive booking fields
ALTER TABLE bookings ADD COLUMN event_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE bookings ADD COLUMN internal_notes TEXT;
ALTER TABLE bookings ADD COLUMN extra_description TEXT;
ALTER TABLE bookings ADD COLUMN tags TEXT[];
ALTER TABLE bookings ADD COLUMN language VARCHAR(10) DEFAULT 'en';

-- Add payment fields
ALTER TABLE bookings ADD COLUMN requires_payment BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN payment_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN payment_deadline_hours INTEGER DEFAULT 24;
ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN payment_paid_at TIMESTAMP;

-- Update drizzle meta
UPDATE drizzle.__drizzle_migrations SET hash = 'booking_enhancements_v1', created_at = NOW()
WHERE hash = (SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1);

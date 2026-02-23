-- Migration to add PayOS fields to deposit_requests table
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50) DEFAULT 'MOMO';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS payos_order_code BIGINT;

-- Optional: Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_deposit_payos_order_code ON deposit_requests (payos_order_code);

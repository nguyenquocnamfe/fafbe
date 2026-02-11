-- Add settlement_requested_at column to contracts table
ALTER TABLE contracts ADD COLUMN settlement_requested_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN contracts.settlement_requested_at IS 'Timestamp when the worker requested settlement (e.g. for expired jobs)';

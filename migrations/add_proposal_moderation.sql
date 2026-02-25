-- Add moderation columns to proposals table
ALTER TABLE proposals ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE proposals ADD COLUMN moderation_result JSONB;

COMMENT ON COLUMN proposals.moderation_status IS 'Moderation status: PENDING, APPROVED, REJECTED';
COMMENT ON COLUMN proposals.moderation_result IS 'Full result from moderation service';

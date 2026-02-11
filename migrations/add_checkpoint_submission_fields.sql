-- Add checkpoint submission and review fields
-- Run this migration to add checkpoint workflow fields

ALTER TABLE checkpoints 
ADD COLUMN IF NOT EXISTS submission_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS submission_notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Update checkpoint status if needed (may already exist)
-- Status flow: PENDING → SUBMITTED → APPROVED or back to PENDING if REJECTED

COMMENT ON COLUMN checkpoints.submission_url IS 'URL to deliverable (Google Drive, GitHub, etc.)';
COMMENT ON COLUMN checkpoints.submission_notes IS 'Worker notes on submission';
COMMENT ON COLUMN checkpoints.submitted_at IS 'When worker submitted this checkpoint';
COMMENT ON COLUMN checkpoints.reviewed_at IS 'When employer reviewed this checkpoint';
COMMENT ON COLUMN checkpoints.review_notes IS 'Employer review notes (approval/rejection reason)';

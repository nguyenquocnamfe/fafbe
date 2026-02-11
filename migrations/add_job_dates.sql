-- Add start_date and end_date to jobs table
-- Run this migration to enable job duration feature

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;

COMMENT ON COLUMN jobs.start_date IS 'When the job is expected to start';
COMMENT ON COLUMN jobs.end_date IS 'When the job is expected to end';

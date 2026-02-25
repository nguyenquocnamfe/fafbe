-- Fix data: reset proposals về PENDING cho các contract bị CANCELLED
-- Chạy script này 1 lần để fix dữ liệu cũ

-- 1. Reset các proposal đang ACCEPTED nhưng contract tương ứng bị CANCELLED
UPDATE proposals p
SET status = 'PENDING', updated_at = NOW()
FROM contracts c
WHERE c.job_id = p.job_id
  AND c.worker_id = p.worker_id
  AND c.status = 'CANCELLED'
  AND p.status = 'ACCEPTED';

-- Verify result
SELECT 
  p.id as proposal_id, 
  p.job_id, 
  p.worker_id, 
  p.status as proposal_status,
  c.id as contract_id,
  c.status as contract_status
FROM proposals p
JOIN contracts c ON c.job_id = p.job_id AND c.worker_id = p.worker_id
WHERE c.status IN ('CANCELLED', 'COMPLETED')
ORDER BY p.job_id;

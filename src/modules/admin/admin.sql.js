module.exports = {
  getPendingJobs: `
    SELECT j.*, c.name as category_name, u.email as client_email
    FROM jobs j
    JOIN job_categories c ON j.category_id = c.id
    JOIN users u ON j.client_id = u.id
    WHERE j.status = 'PENDING'
    ORDER BY j.created_at DESC
  `,
  
  approveJob: `
    UPDATE jobs
    SET status = 'OPEN', admin_comment = NULL, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
  
  rejectJob: `
    UPDATE jobs
    SET status = 'REJECTED', admin_comment = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `
};

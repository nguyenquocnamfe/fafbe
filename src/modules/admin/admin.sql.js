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
  `,

  getStats: `
    SELECT 
      (SELECT COUNT(*)::int FROM users) as total_users,
      (SELECT COUNT(*)::int FROM users WHERE role = 'employer') as total_employers,
      (SELECT COUNT(*)::int FROM users WHERE role = 'worker') as total_workers,
      (SELECT COUNT(*)::int FROM users WHERE role = 'manager') as total_managers,
      (SELECT COUNT(*)::int FROM jobs) as total_jobs,
      (SELECT COUNT(*)::int FROM jobs WHERE status = 'OPEN') as open_jobs,
      (SELECT COUNT(*)::int FROM jobs WHERE status = 'COMPLETED') as completed_jobs,
      (SELECT COUNT(*)::int FROM jobs WHERE status = 'PENDING') as pending_jobs
  `,

  getFinancials: `
    SELECT 
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'RELEASE') as total_turnover,
      (
        SELECT COALESCE(SUM(j.budget * 0.05), 0)
        FROM jobs j 
        JOIN contracts c ON j.id = c.job_id 
        JOIN checkpoints cp ON c.id = cp.contract_id 
        WHERE cp.status = 'APPROVED'
      ) as total_fees
  `,


  listUsersFull: `
    SELECT u.id, u.email, u.role, u.created_at, p.full_name, w.balance_points
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    LEFT JOIN wallets w ON u.id = w.user_id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `,


  countUsers: `SELECT COUNT(*) FROM users`,

  updateUserRole: `
    UPDATE users
    SET role = $2
    WHERE id = $1
    RETURNING id, email, role
  `
};



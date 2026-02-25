module.exports = {
  create: `
    INSERT INTO proposals (
      job_id, worker_id, cover_letter, proposed_price, status, 
      moderation_status, moderation_result, created_at
    )
    VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, NOW())
    RETURNING *
  `,

  checkExisting: `
    SELECT id FROM proposals WHERE job_id = $1 AND worker_id = $2
  `,

  listByJob: `
    SELECT p.*,
           u.email as worker_email,
           up.full_name as worker_name,
           up.avatar_url as worker_avatar
    FROM proposals p
    JOIN users u ON u.id = p.worker_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE p.job_id = $1
    ORDER BY p.created_at DESC
  `,

  listByWorker: `
    SELECT p.*,
           j.title as job_title,
           j.budget as job_budget,
           c.name as category_name
    FROM proposals p
    JOIN jobs j ON j.id = p.job_id
    JOIN job_categories c ON c.id = j.category_id
    WHERE p.worker_id = $1
    ORDER BY p.created_at DESC
  `,

  getById: `
    SELECT * FROM proposals WHERE id = $1
  `,

  updateStatus: `
    UPDATE proposals
    SET status = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `
};

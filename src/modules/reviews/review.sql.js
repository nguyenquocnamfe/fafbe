module.exports = {
  create: `
    INSERT INTO reviews (contract_id, reviewer_id, reviewee_id, rating, comment, moderation_status, moderation_result, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *
  `,
  
  getByUser: `
    SELECT r.*, 
           reviewer.email as reviewer_email,
           reviewee.email as reviewee_email,
           c.job_id
    FROM reviews r
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    JOIN users reviewee ON r.reviewee_id = reviewee.id
    JOIN contracts c ON r.contract_id = c.id
    WHERE r.reviewee_id = $1 AND r.moderation_status = 'APPROVED'
    ORDER BY r.created_at DESC
  `,
  
  getByContract: `
    SELECT r.*, 
           reviewer.email as reviewer_email,
           reviewee.email as reviewee_email
    FROM reviews r
    JOIN users reviewer ON r.reviewer_id = reviewer.id
    JOIN users reviewee ON r.reviewee_id = reviewee.id
    WHERE r.contract_id = $1
    ORDER BY r.created_at DESC
  `,
  
  checkExisting: `
    SELECT id FROM reviews
    WHERE contract_id = $1 AND reviewer_id = $2
  `
};

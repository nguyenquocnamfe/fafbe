module.exports = {
  create: `
    INSERT INTO disputes (contract_id, raised_by, reason, status, created_at, updated_at)
    VALUES ($1, $2, $3, 'OPEN', NOW(), NOW())
    RETURNING *
  `,
  
  getById: `
    SELECT d.*, 
           u.email as raiser_email
    FROM disputes d
    JOIN users u ON u.id = d.raised_by
    WHERE d.id = $1
  `,

  updateStatus: `
    UPDATE disputes
    SET status = $2, resolution = $3, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,

  addMessage: `
    INSERT INTO dispute_messages (dispute_id, sender_id, message, attachments, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  `,
  
  getMessages: `
     SELECT m.*, u.email as sender_email
     FROM dispute_messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.dispute_id = $1
     ORDER BY m.created_at ASC
  `
};

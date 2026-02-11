module.exports = {
  create: `
    INSERT INTO notifications (user_id, type, title, message, data, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `,
  
  getUserNotifications: `
    SELECT * FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,
  
  markAsRead: `
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `,
  
  markAllAsRead: `
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = $1 AND is_read = FALSE
    RETURNING *
  `
};

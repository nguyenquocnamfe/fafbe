module.exports = {
  getByUserId: `
    SELECT * FROM wallets WHERE user_id = $1
  `,

  updateBalance: `
    UPDATE wallets 
    SET balance_points = balance_points + $2, 
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `,

  updateLocked: `
    UPDATE wallets 
    SET locked_points = locked_points + $2, 
        updated_at = NOW()
    WHERE user_id = $1
    RETURNING *
  `,

  lockFunds: `
    UPDATE wallets 
    SET balance_points = balance_points - $2,
        locked_points = locked_points + $2,
        updated_at = NOW()
    WHERE user_id = $1 AND balance_points >= $2
    RETURNING *
  `,

  unlockFunds: `
    UPDATE wallets 
    SET balance_points = balance_points + $2,
        locked_points = locked_points - $2,
        updated_at = NOW()
    WHERE user_id = $1 AND locked_points >= $2
    RETURNING *
  `,

  releaseFunds: `
    UPDATE wallets 
    SET locked_points = locked_points - $2,
        updated_at = NOW()
    WHERE user_id = $1 AND locked_points >= $2
    RETURNING *
  `,

  createTransaction: `
    INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `
};

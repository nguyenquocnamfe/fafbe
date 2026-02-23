module.exports = {
  createDeposit: `
    INSERT INTO deposit_requests (user_id, order_id, request_id, amount, status, pay_url, payment_gateway, payos_order_code, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, NOW(), NOW())
    RETURNING *
  `,

  getByOrderId: `
    SELECT * FROM deposit_requests WHERE order_id = $1
  `,

  getByPayOSOrderCode: `
    SELECT * FROM deposit_requests WHERE payos_order_code = $1
  `,

  getByOrderIdAndUser: `
    SELECT * FROM deposit_requests WHERE order_id = $1 AND user_id = $2
  `,

  updateStatus: `
    UPDATE deposit_requests
    SET status = $2, momo_trans_id = $3, result_code = $4, message = $5, updated_at = NOW()
    WHERE order_id = $1
    RETURNING *
  `,

  updateStatusByPayOSCode: `
    UPDATE deposit_requests
    SET status = $2, result_code = $3, message = $4, updated_at = NOW()
    WHERE payos_order_code = $1
    RETURNING *
  `,

  getBalance: `
    SELECT w.balance_points, w.locked_points
    FROM wallets w WHERE w.user_id = $1
  `,

  addBalance: `
    UPDATE wallets
    SET balance_points = balance_points + $1, updated_at = NOW()
    WHERE user_id = $2
    RETURNING *
  `,

  createTransaction: `
    INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, description, created_at)
    VALUES ($1, $2, $3, 'SUCCESS', $4, $5, $6, NOW())
    RETURNING *
  `,

  getWalletByUserId: `
    SELECT * FROM wallets WHERE user_id = $1
  `,

  getTransactions: `
    SELECT t.*, dr.order_id as momo_order_id
    FROM transactions t
    LEFT JOIN deposit_requests dr ON t.reference_type = 'DEPOSIT' AND t.reference_id = dr.id
    WHERE t.wallet_id = (SELECT id FROM wallets WHERE user_id = $1)
    ORDER BY t.created_at DESC
    LIMIT $2 OFFSET $3
  `,

  getDepositHistory: `
    SELECT * FROM deposit_requests
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,
};

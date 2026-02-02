const pool = require('../../config/database');
const sql = require('./user.sql');

exports.getMyProfile = async (userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1️⃣ đảm bảo profile tồn tại
    await client.query(sql.createProfile, [userId, null]);

    // 2️⃣ đảm bảo wallet tồn tại
    await client.query(sql.createWalletIfNotExist, [userId]);

    // 3️⃣ lấy full data
    const { rows } = await client.query(
      sql.getProfileWithWallet,
      [userId]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.createProfileIfNotExist = async (userId, fullName) => {
  await pool.query(sql.createProfile, [userId, fullName]);
};

exports.updateProfile = async (userId, data) => {
  const {
    full_name,
    bio,
    skills,
    location,
    hourly_rate,
    availability
  } = data;

  const { rows } = await pool.query(sql.updateProfile, [
    userId,
    full_name,
    bio,
    skills ? JSON.stringify(skills) : null,
    location,
    hourly_rate,
    availability
  ]);

  return rows[0];
};



exports.listUsers = async (page, limit) => {
  const offset = (page - 1) * limit;

  const users = await pool.query(sql.listUsers, [limit, offset]);
  const total = await pool.query(sql.countUsers);

  return {
    data: users.rows,
    total: Number(total.rows[0].count),
    page,
    limit
  };
};



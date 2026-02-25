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

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Update Profile Table (stores skills as JSONB for display)
    const { rows } = await client.query(sql.updateProfile, [
      userId,
      full_name,
      bio,
      skills ? JSON.stringify(skills) : null,
      location,
      hourly_rate,
      availability
    ]);

    // 2. Sync User Skills Table (normalized for matching engine)
    if (skills && Array.isArray(skills)) {
      // Clear existing normalized skills specifically for this user
      await client.query('DELETE FROM user_skills WHERE user_id = $1', [userId]);

      // Insert new skills
      for (const skill of skills) {
        // Handle both object {id, name} and raw id (just in case)
        const skillId = skill.id || skill; 
        
        if (skillId) {
          await client.query(
            `INSERT INTO user_skills (user_id, skill_id) 
             VALUES ($1, $2) 
             ON CONFLICT DO NOTHING`,
            [userId, skillId]
          );
        }
      }
    }

    await client.query('COMMIT');
    return rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

exports.getFeaturedWorkers = async (limit = 10) => {
  const { rows } = await pool.query(sql.getFeaturedWorkers, [limit]);
  return rows;
};

exports.updateUserTier = async (client, userId) => {
    // 1. Get current stats
    const { rows } = await client.query('SELECT rating_avg, total_jobs_done FROM user_profiles WHERE user_id = $1', [userId]);
    if (rows.length === 0) return;

    const { rating_avg, total_jobs_done } = rows[0];
    const rating = parseFloat(rating_avg) || 0;
    const jobs = parseInt(total_jobs_done) || 0;

    // 2. Calculate Tier
    let tier = 'NEWBIE';
    if (jobs >= 15 && rating >= 4.7) tier = 'EXPERT';
    else if (jobs >= 5 && rating >= 4.0) tier = 'PRO';

    // 3. Update Tier
    await client.query('UPDATE user_profiles SET tier = $1, updated_at = NOW() WHERE user_id = $2', [tier, userId]);
    return tier;
};

exports.updatePortfolio = async (userId, items) => {
    // items should be an array of objects: { title, thumbnail, url, description }
    const { rows } = await pool.query(`
        UPDATE user_profiles 
        SET portfolio_items = $1, updated_at = NOW() 
        WHERE user_id = $2 
        RETURNING *
    `, [JSON.stringify(items), userId]);
    return rows[0];
};

exports.getPortfolio = async (userId) => {
    const { rows } = await pool.query('SELECT portfolio_items FROM user_profiles WHERE user_id = $1', [userId]);
    return rows[0]?.portfolio_items || [];
};




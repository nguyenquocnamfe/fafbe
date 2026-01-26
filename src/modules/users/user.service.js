const pool = require('../../config/database');
const sql = require('./user.sql');

exports.getMyProfile = async (userId) => {
  const { rows } = await pool.query(sql.getProfileByUserId, [userId]);
  return rows[0];
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



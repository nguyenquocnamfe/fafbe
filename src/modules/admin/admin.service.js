const pool = require("../../config/database");
const sql = require("./admin.sql");

exports.getPendingJobs = async () => {
  const { rows } = await pool.query(sql.getPendingJobs);
  return rows;
};

exports.approveJob = async (jobId) => {
  const { rows } = await pool.query(sql.approveJob, [jobId]);
  return rows[0];
};

exports.rejectJob = async (jobId, reason) => {
  const { rows } = await pool.query(sql.rejectJob, [jobId, reason]);
  return rows[0];
};

exports.getAdminIds = async () => {
    const { rows } = await pool.query("SELECT id FROM users WHERE role = 'ADMIN'");
    return rows.map(r => r.id);
};

exports.getStats = async () => {
  const { rows } = await pool.query(sql.getStats);
  return rows[0];
};

exports.getFinancials = async () => {
  const { rows } = await pool.query(sql.getFinancials);
  return rows[0];
};

exports.listUsers = async ({ page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  const { rows: users } = await pool.query(sql.listUsersFull, [limit, offset]);
  const { rows: countRes } = await pool.query(sql.countUsers);
  
  return {
    users,
    total: parseInt(countRes[0].count),
    page,
    limit
  };
};

exports.updateUserRole = async (userId, role) => {
  const { rows } = await pool.query(sql.updateUserRole, [userId, role]);
  return rows[0];
};


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

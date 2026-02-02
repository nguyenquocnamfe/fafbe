const pool = require('../../config/database');
const sql = require('./jobSkill.sql');

exports.addSkillToJob = async (jobId, skillId) => {
  await pool.query(sql.addSkill, [jobId, skillId]);
};

exports.removeSkillFromJob = async (jobId, skillId) => {
  await pool.query(sql.removeSkill, [jobId, skillId]);
};

exports.getJobSkills = async (jobId) => {
  const { rows } = await pool.query(sql.getByJobId, [jobId]);
  return rows;
};

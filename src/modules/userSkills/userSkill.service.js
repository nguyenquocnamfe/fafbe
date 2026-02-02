const pool = require('../../config/database');
const sql = require('./userSkill.sql');

exports.addSkillToUser = async (userId, skillId) => {
  await pool.query(sql.addSkill, [userId, skillId]);
};

exports.removeSkillFromUser = async (userId, skillId) => {
  await pool.query(sql.removeSkill, [userId, skillId]);
};

exports.getUserSkills = async (userId) => {
  const { rows } = await pool.query(sql.getByUserId, [userId]);
  return rows;
};

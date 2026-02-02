const pool = require('../../config/database');
const sql = require('./skill.sql');

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');

exports.getAllActiveSkills = async () => {
  const { rows } = await pool.query(sql.getAllActive);
  return rows;
};

exports.getSkillById = async (id) => {
  const { rows } = await pool.query(sql.getById, [id]);
  return rows[0];
};

exports.createSkill = async (name) => {
  const slug = slugify(name);
  const { rows } = await pool.query(sql.create, [name, slug]);
  return rows[0];
};

exports.updateSkill = async (id, name) => {
  const slug = slugify(name);
  const { rows } = await pool.query(sql.update, [id, name, slug]);
  return rows[0];
};

exports.deactivateSkill = async (id) => {
  const { rows } = await pool.query(sql.deactivate, [id]);
  return rows[0];
};

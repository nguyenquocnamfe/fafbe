module.exports = {
  addSkill: `
    INSERT INTO job_skills (job_id, skill_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
  `,

  removeSkill: `
    DELETE FROM job_skills
    WHERE job_id = $1 AND skill_id = $2
  `,

  getByJobId: `
    SELECT s.id, s.name, s.slug
    FROM job_skills js
    JOIN skills s ON s.id = js.skill_id
    WHERE js.job_id = $1
      AND s.is_active = true
    ORDER BY s.name ASC
  `,
};

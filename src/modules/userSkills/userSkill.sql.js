module.exports = {
  addSkill: `
    INSERT INTO user_skills (user_id, skill_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    RETURNING *
  `,

  removeSkill: `
    DELETE FROM user_skills
    WHERE user_id = $1 AND skill_id = $2
  `,

  getByUserId: `
    SELECT s.id, s.name, s.slug, us.skill_points
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = $1
      AND s.is_active = true
    ORDER BY s.name ASC
  `,

};

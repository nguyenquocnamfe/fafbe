module.exports = {
  getAllActive: `
    SELECT id, name, slug
    FROM skills
    WHERE is_active = true
    ORDER BY name ASC
  `,

  getById: `
    SELECT *
    FROM skills
    WHERE id = $1
  `,

  create: `
    INSERT INTO skills (name, slug)
    VALUES ($1, $2)
    RETURNING *
  `,

  update: `
    UPDATE skills
    SET name = $2,
        slug = $3,
        updated_at = now()
    WHERE id = $1
    RETURNING *
  `,

  deactivate: `
    UPDATE skills
    SET is_active = false,
        updated_at = now()
    WHERE id = $1
    RETURNING *
  `,
};

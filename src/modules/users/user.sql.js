module.exports = {
  getProfileByUserId: `
    SELECT u.id, u.email, u.role, u.status,
           p.full_name, p.avatar_url, p.bio,
           p.skills, p.education, p.experience,
           p.portfolio, p.social_links,
           p.location, p.hourly_rate, p.availability,
           p.rating_avg, p.total_jobs_done
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `,

  createProfile: `
    INSERT INTO user_profiles (user_id, full_name)
    VALUES ($1, $2)
    RETURNING *
  `,

  updateProfile: `
  INSERT INTO user_profiles (
    user_id, full_name, bio, skills,
    location, hourly_rate, availability,
    created_at, updated_at
  )
  VALUES (
    $1, $2, $3, $4::jsonb,
    $5, $6, $7,
    NOW(), NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    bio = EXCLUDED.bio,
    skills = EXCLUDED.skills,
    location = EXCLUDED.location,
    hourly_rate = EXCLUDED.hourly_rate,
    availability = EXCLUDED.availability,
    updated_at = NOW()
  RETURNING *
`,
  listUsers: `
    SELECT id, email, role, status, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,

  countUsers: `
    SELECT COUNT(*) FROM users
  `,
};

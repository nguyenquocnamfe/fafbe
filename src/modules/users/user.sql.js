module.exports = {
  getProfileByUserId: `
    SELECT u.id, u.email, u.role, u.status,
           p.full_name, p.avatar_url, p.bio,
           p.skills, p.education, p.experience,
           p.portfolio, p.social_links,
           p.location, p.hourly_rate, p.availability,
           p.rating_avg, p.total_jobs_done, p.created_at, p.updated_at
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `,

  createProfile: `
    INSERT INTO user_profiles (user_id, full_name)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO NOTHING
  `,

  createWalletIfNotExist: `
    INSERT INTO wallets (user_id, balance_points, locked_points, updated_at)
    VALUES ($1, 0, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING
  `,

  getProfileWithWallet: `
    SELECT
  u.id,
  u.email,
  u.role,
  u.status,

  p.full_name,
  p.avatar_url,
  p.bio,
  p.skills,
  p.education,
  p.experience,
  p.portfolio,
  p.social_links,
  p.location,
  p.hourly_rate,
  p.availability,
  p.rating_avg,
  p.total_jobs_done,
  p.created_at as profile_created_at,
  p.updated_at,

  w.balance_points,
  w.locked_points
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
LEFT JOIN wallets w ON w.user_id = u.id
WHERE u.id = $1

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

  getFeaturedWorkers: `
    SELECT u.id, u.email, u.role, u.status,
           p.full_name, p.avatar_url, p.bio,
           p.skills, p.location, p.hourly_rate,
           p.rating_avg, p.total_jobs_done, p.created_at
    FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'worker' AND u.status = 'active'
    ORDER BY p.rating_avg DESC NULLS LAST, p.created_at DESC
    LIMIT $1
  `,

  getPublicProfile: `
    SELECT u.id, u.email, u.role, u.status, u.created_at,
           p.full_name, p.avatar_url, p.bio,
           p.skills, p.education, p.experience,
           p.portfolio, p.social_links,
           p.location, p.hourly_rate, p.availability,
           p.rating_avg, p.total_jobs_done
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = $1
  `,
};

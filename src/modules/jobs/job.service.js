// src/modules/jobs/job.service.js

const pool = require("../../config/database");

/**
 * Tạo job + contract (DRAFT, ESCROW) + checkpoints trong 1 transaction
 *
 * @param {Object} params
 * @param {number} params.clientId
 * @param {string} params.title
 * @param {string} [params.description]
 * @param {('SHORT_TERM'|'LONG_TERM')} params.jobType
 * @param {number} params.budget
 * @param {Array<{title: string, description?: string, amount: number}>} params.checkpoints
 * @param {string} params.contractContent
 */

async function createJobWithContractAndCheckpoints({
  clientId,
  categoryId,
  title,
  description,
  jobType,
  budget,
  checkpoints,
  contractContent,
  skills,
  startDate,
  endDate,
  deadline,
}) {
  console.log("👉 skills nhận được:", skills);
  console.log("checkpont", checkpoints);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 0️⃣ Lock wallet
    const walletRes = await client.query(
      `SELECT id, balance_points, locked_points
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [clientId],
    );

    const wallet = walletRes.rows[0];
    const available =
      Number(wallet.balance_points) - Number(wallet.locked_points);

    if (available < budget) {
      throw new Error("NOT_ENOUGH_POINTS");
    }

    // 1️⃣ Trừ điểm
    await client.query(
      `UPDATE wallets
       SET balance_points = balance_points - $1
       WHERE id = $2`,
      [budget, wallet.id],
    );

    // 1.5 Moderate job content
    const moderationService = require('../../services/moderation.service');
    const moderationText = `${title}\n${description || ''}`;
    const moderationResult = await moderationService.moderateContent(moderationText);
    const moderationStatus = moderationService.getModerationStatus(moderationResult.approved);

    // 2️⃣ Tạo job
    const { rows: jobRows } = await client.query(
      `
      INSERT INTO jobs (
        client_id, category_id, title, description,
        job_type, budget, status, moderation_status, moderation_result, created_at,
        deadline
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, NOW(), $9)
      RETURNING *
      `,
      [clientId, categoryId, title, description || null, jobType, budget, moderationStatus, JSON.stringify(moderationResult), deadline || null],
    );

    const job = jobRows[0];

    // 2️⃣.5️⃣ GÁN SKILLS (BẠN ĐANG THIẾU)
    if (Array.isArray(skills)) {
      for (const skillId of skills) {
        if (!skillId) continue; // Skip null/undefined skills
        await client.query(
          `
          INSERT INTO job_skills (job_id, skill_id, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT DO NOTHING
          `,
          [job.id, skillId],
        );
      }
    }

    // 3️⃣ Tạo contract
    const { rows: contractRows } = await client.query(
      `
      INSERT INTO contracts (
        job_id, client_id, contract_type,
        total_amount, contract_content, status, created_at
      )
      VALUES ($1, $2, 'ESCROW', $3, $4, 'DRAFT', NOW())
      RETURNING *
      `,
      [job.id, clientId, budget, contractContent],
    );

    const contract = contractRows[0];

    // 4️⃣ Checkpoints
    const createdCheckpoints = [];
    for (const cp of checkpoints) {
      const { rows } = await client.query(
        `
        INSERT INTO checkpoints (
          contract_id, title, description,
          amount, due_date, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
        RETURNING *
        `,
        [contract.id, cp.title, cp.description || null, cp.amount, cp.due_date || null],
      );
      createdCheckpoints.push(rows[0]);
    }

    await client.query("COMMIT");
    return { job, contract, checkpoints: createdCheckpoints };
  } catch (e) {
    console.error("❌ Job Creation Failed:", e);
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function listJobs({ page = 1, limit = 10, categoryId, clientId }) {
  const offset = (page - 1) * limit;

  const params = [];
  const conditions = [];

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`j.category_id = $${params.length}`);
  }

  if (clientId) {
    params.push(clientId);
    conditions.push(`j.client_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : "";

  const { rows } = await pool.query(
    `
    SELECT j.*,
           c.name AS category_name,
           (SELECT COUNT(*)::int FROM proposals p WHERE p.job_id = j.id) AS proposal_count
    FROM jobs j
    JOIN job_categories c ON c.id = j.category_id
    ${whereClause}
    ORDER BY j.created_at DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );

  return rows;
}

/**
 * GET JOB DETAIL
 */
async function getJobById(jobId) {
  const { rows } = await pool.query(
    `
    SELECT j.*,
           c.name AS category_name,
           json_build_object(
             'id', u.id,
             'email', u.email,
             'full_name', up.full_name,
             'role', u.role,
             'created_at', u.created_at
           ) AS client,
           (SELECT json_build_object(
              'id', ct.id,
              'total_amount', ct.total_amount,
              'status', ct.status,
              'terms', ct.contract_content,
              'created_at', ct.created_at
            ) FROM contracts ct WHERE ct.job_id = j.id LIMIT 1) AS contract,
           (SELECT COALESCE(json_agg(
              json_build_object(
                'id', cp.id,
                'name', cp.title,
                'description', cp.description,
                'amount', cp.amount,
                'status', cp.status,
                'deadline', cp.due_date
              ) ORDER BY cp.created_at ASC
            ), '[]') FROM checkpoints cp 
            JOIN contracts ct ON cp.contract_id = ct.id 
            WHERE ct.job_id = j.id) AS checkpoints,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', s.id,
                 'name', s.name,
                 'slug', s.slug
               )
             ) FILTER (WHERE s.id IS NOT NULL),
             '[]'
           ) AS skills
    FROM jobs j
    JOIN job_categories c ON c.id = j.category_id
    JOIN users u ON u.id = j.client_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN job_skills js ON js.job_id = j.id
    LEFT JOIN skills s ON s.id = js.skill_id
    WHERE j.id = $1
    GROUP BY j.id, c.name, u.id, u.email, u.role, u.created_at, up.full_name
    `,
    [jobId],
  );

  return rows[0];
}


/**
 * UPDATE JOB
 */
async function updateJob(jobId, data) {
  const { title, description, categoryId, skills = [] } = data;

  const { rows } = await pool.query(
    `
    UPDATE jobs
    SET title = $1,
        description = $2,
        category_id = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
    `,
    [title, description, categoryId, jobId],
  );

  // reset skills
  await pool.query(`DELETE FROM job_skills WHERE job_id = $1`, [jobId]);

  for (const skillId of skills) {
    if (!skillId) continue;
    await pool.query(
      `
      INSERT INTO job_skills (job_id, skill_id, created_at)
      VALUES ($1, $2, NOW())
      `,
      [jobId, skillId],
    );
  }

  return rows[0];
}

/**
 * DELETE JOB (soft delete)
 */
async function deleteJob(jobId) {
  const { rowCount } = await pool.query(
    `
    UPDATE jobs
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = $1
    `,
    [jobId],
  );
  return rowCount > 0;
}

module.exports = {
  createJobWithContractAndCheckpoints,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
};

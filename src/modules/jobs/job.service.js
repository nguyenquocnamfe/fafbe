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

    // 1️⃣ Lock budget
    const walletService = require("../wallets/wallet.service");
    await walletService.lockBudget(client, {
       userId: clientId,
       amount: budget,
       referenceId: 0, // We will update this after job is created? Or use a placeholder.
       referenceType: 'JOB_CREATION'
    });


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

async function listJobs({ page = 1, limit = 10, categoryId, clientId, status, workerId }) {
  const offset = (page - 1) * limit;

  const params = [];
  const conditions = [];
  let joinClause = "";

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`j.category_id = $${params.length}`);
  }

  if (clientId) {
    params.push(clientId);
    conditions.push(`j.client_id = $${params.length}`);
  }

  if (workerId) {
    params.push(workerId);
    joinClause = "JOIN contracts ct ON ct.job_id = j.id";
    conditions.push(`ct.worker_id = $${params.length}`);
  }

  // Default to OPEN status if not specified, support ALL to skip filter
  if (status !== 'ALL') {
    const jobStatus = status || 'OPEN';
    params.push(jobStatus);
    conditions.push(`j.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : "";

  const { rows } = await pool.query(
    `
    SELECT j.*,
           c.name AS category_name,
           (SELECT COUNT(*)::int FROM proposals p WHERE p.job_id = j.id) AS proposal_count
    FROM jobs j
    JOIN job_categories c ON c.id = j.category_id
    ${joinClause}
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

/**
 * LIST PENDING JOBS (for Manager/Admin)
 */
async function listPendingJobs({ page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `
    SELECT j.*, c.name AS category_name, u.email as client_email
    FROM jobs j
    JOIN job_categories c ON c.id = j.category_id
    JOIN users u ON u.id = j.client_id
    WHERE j.status = 'PENDING'
    ORDER BY j.created_at ASC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );
  return rows;
}

/**
 * REVIEW JOB (Approve/Reject)
 */
async function reviewJob(jobId, { status, adminComment, adminId }) {
  if (!['OPEN', 'REJECTED'].includes(status)) {
    throw new Error("INVALID_STATUS");
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch job
    const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    const job = jobRes.rows[0];
    if (!job) throw new Error("JOB_NOT_FOUND");
    if (job.status !== 'PENDING') throw new Error("JOB_NOT_PENDING");

    // 2. Update job status
    const { rows } = await client.query(
      `
      UPDATE jobs
      SET status = $1,
          admin_comment = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [status, adminComment || null, jobId]
    );
    const updatedJob = rows[0];

    // 3. If OPEN, notify matching workers (Innovation Feature)
    if (status === 'OPEN') {
      try {
        const matchingService = require('../matching/matching.service');
        const notificationService = require('../notifications/notification.service');
        // io is usually passed via app.get('io') in controller, but we might need a better way if service is decoupled.
        // For now, we'll try to find it or just log. In FAF, we often pass it or use a global.
        // Since reviewJob is called from controller, we can pass io or hope it handles it.
        // I'll assume it's available or failing gracefully.
        
        const workers = await matchingService.getRecommendedWorkers(jobId, 10);
        const io = global.io; // Assuming global.io is set during startup (common pattern)
        
        for (const worker of workers) {
            await notificationService.createNotification({
                userId: worker.id,
                type: 'SKILL_MATCH_ALERT',
                title: 'New Job Matching Your Skills!',
                message: `The job "${updatedJob.title}" matches your top skills. Apply now!`,
                data: { jobId: job.id },
                io
            });
        }
      } catch (e) {
        console.error("Match Notification Failed:", e);
      }
    }

    // 3.5 If REJECTED, refund funds to client
    if (status === 'REJECTED') {

      const budget = Number(job.budget);
      const walletService = require("../wallets/wallet.service");
      await walletService.refundLockedFunds(client, {
         userId: job.client_id,
         amount: budget,
         referenceId: jobId,
         referenceType: 'JOB_REJECTION'
      });
    }


    await client.query('COMMIT');
    return updatedJob;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createJobWithContractAndCheckpoints,
  listJobs,
  getJobById,
  updateJob,
  deleteJob,
  listPendingJobs,
  reviewJob,
};


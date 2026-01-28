// src/modules/jobs/job.service.js

const pool = require('../../config/database');

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
 */
async function createJobWithContractAndCheckpoints({
  clientId,
  title,
  description,
  jobType,
  budget,
  checkpoints,
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Tạo job
    const jobInsertQuery = `
      INSERT INTO jobs (
        client_id,
        title,
        description,
        job_type,
        budget,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, 'OPEN', NOW())
      RETURNING *;
    `;

    const jobResult = await client.query(jobInsertQuery, [
      clientId,
      title,
      description || null,
      jobType,
      budget,
    ]);

    const job = jobResult.rows[0];

    // 2) Tạo contract dạng ESCROW, DRAFT, chưa có worker
    const contractInsertQuery = `
      INSERT INTO contracts (
        job_id,
        client_id,
        worker_id,
        contract_type,
        total_amount,
        status,
        created_at
      )
      VALUES ($1, $2, NULL, 'ESCROW', $3, 'DRAFT', NOW())
      RETURNING *;
    `;

    const contractResult = await client.query(contractInsertQuery, [
      job.id,
      clientId,
      budget,
    ]);

    const contract = contractResult.rows[0];

    // 3) Tạo các checkpoints (số lượng tuỳ user)
    const checkpointsInsertQuery = `
      INSERT INTO checkpoints (
        contract_id,
        title,
        description,
        amount,
        due_date,
        status,
        created_at
      )
      VALUES ($1, $2, $3, $4, NULL, 'PENDING', NOW())
      RETURNING *;
    `;

    const createdCheckpoints = [];

    for (const cp of checkpoints) {
      const cpResult = await client.query(checkpointsInsertQuery, [
        contract.id,
        cp.title,
        cp.description || null,
        cp.amount,
      ]);

      createdCheckpoints.push(cpResult.rows[0]);
    }

    await client.query('COMMIT');

    return {
      job,
      contract,
      checkpoints: createdCheckpoints,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createJobWithContractAndCheckpoints,
};
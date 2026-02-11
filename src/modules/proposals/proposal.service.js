const pool = require("../../config/database");
const sql = require("./proposal.sql");
const { getJobById } = require("../jobs/job.service");

exports.createProposal = async ({ jobId, workerId, coverLetter, proposedPrice }) => {
  const client = await pool.connect();
  try {
    // 1. Check Job
    const job = await getJobById(jobId);
    if (!job) throw new Error("JOB_NOT_FOUND");
    if (job.status !== 'OPEN') throw new Error("JOB_NOT_OPEN");

    // 2. Check Existing Proposal
    const existingRes = await client.query(sql.checkExisting, [jobId, workerId]);
    if (existingRes.rows.length > 0) throw new Error("ALREADY_APPLIED");

    // 2.1 Check Active Contract (Exclusive Work Policy)
    const activeContractRes = await client.query(`SELECT id FROM contracts WHERE worker_id = $1 AND status = 'ACTIVE'`, [workerId]);
    if (activeContractRes.rows.length > 0) throw new Error("WORKER_BUSY_CANNOT_APPLY");

    // 2.5 Moderate cover letter
    const moderationService = require('../../services/moderation.service');
    const moderationResult = await moderationService.moderateContent(coverLetter || '');
    const moderationStatus = moderationService.getModerationStatus(moderationResult.approved);

    // 3. Create with moderation
    const { rows } = await client.query(`
      INSERT INTO proposals (job_id, worker_id, cover_letter, proposed_price, status, moderation_status, moderation_result, created_at)
      VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, NOW())
      RETURNING *
    `, [jobId, workerId, coverLetter, proposedPrice, moderationStatus, JSON.stringify(moderationResult)]);
    
    return rows[0];

  } finally {
    client.release();
  }
};

exports.getProposalsByJob = async (jobId) => {
  const { rows } = await pool.query(sql.listByJob, [jobId]);
  return rows;
};

exports.getMyProposals = async (workerId) => {
  const { rows } = await pool.query(sql.listByWorker, [workerId]);
  return rows;
};

exports.acceptProposal = async (proposalId, clientId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get Proposal
    const { rows: pRows } = await client.query(sql.getById, [proposalId]);
    const proposal = pRows[0];
    if (!proposal) throw new Error("PROPOSAL_NOT_FOUND");

    // 2. Validate Job Ownership
    const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [proposal.job_id]);
    const job = jobRes.rows[0];
    if (!job) throw new Error("JOB_NOT_FOUND");
    if (job.client_id !== clientId) throw new Error("UNAUTHORIZED");

    // 2.1 CHECK WORKER BUSY STATUS (Restriction: 1 Active Job)
    const activeContractRes = await client.query(`
        SELECT id FROM contracts 
        WHERE worker_id = $1 AND status = 'ACTIVE'
    `, [proposal.worker_id]);
    
    if (activeContractRes.rows.length > 0) {
        throw new Error("WORKER_HAS_ACTIVE_JOB");
    }

    // 3. Update Proposal Status
    const updateRes = await client.query(sql.updateStatus, [proposalId, 'ACCEPTED']);
    const updatedProposal = updateRes.rows[0];

    // 4. Update Contract (Assign Worker & Active)
    // Find contract for this job (assuming 1 job - 1 contract mostly)
    // The contracts table has job_id.
    const contractRes = await client.query(`
        UPDATE contracts 
        SET worker_id = $1, status = 'ACTIVE' 
        WHERE job_id = $2 AND status = 'DRAFT'
        RETURNING *
    `, [proposal.worker_id, proposal.job_id]);
    
    // Note: If contract was NOT draft (e.g. already assigned), this might fail or do nothing.
    // We should decide if we allow re-assigning? Assuming NO.
    
    // Also, we might want to reject other proposals? Optional.
    
    const contract = contractRes.rows[0];
    if (!contract) throw new Error("CONTRACT_NOT_FOUND");
    
    // 5. LOCK FUNDS (Move from balance to locked)
    const totalAmount = Number(contract.total_amount);
    
    // Check if client has enough balance
    const walletRes = await client.query('SELECT * FROM wallets WHERE user_id = $1', [clientId]);
    const wallet = walletRes.rows[0];
    
    if (!wallet || wallet.balance_points < totalAmount) {
        throw new Error("INSUFFICIENT_BALANCE");
    }
    
    // Lock the funds
    await client.query(`
        UPDATE wallets 
        SET balance_points = balance_points - $1, 
            locked_points = locked_points + $1,
            updated_at = NOW()
        WHERE user_id = $2
    `, [totalAmount, clientId]);
    
    // Record transaction
    await client.query(`
        INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, created_at)
        VALUES ($1, 'LOCK', $2, 'SUCCESS', 'CONTRACT', $3, NOW())
    `, [wallet.id, totalAmount, contract.id]);

    // 6. Auto-Cleanup: Delete other pending proposals by this worker (Exclusive Work Policy)
    await client.query(`
        DELETE FROM proposals 
        WHERE worker_id = $1 AND status = 'PENDING' AND id != $2
    `, [proposal.worker_id, proposal.id]);
    
    await client.query("COMMIT");
    return { proposal: updatedProposal, contract, job };

  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

exports.rejectProposal = async (proposalId, clientId) => {
    // Similar to accept but just update status
    const client = await pool.connect();
    try {
        const { rows: pRows } = await client.query(sql.getById, [proposalId]);
        const proposal = pRows[0];
        if (!proposal) throw new Error("PROPOSAL_NOT_FOUND");
        
        const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [proposal.job_id]);
        const job = jobRes.rows[0];
        if (job.client_id !== clientId) throw new Error("UNAUTHORIZED");

        const updateRes = await client.query(sql.updateStatus, [proposalId, 'REJECTED']);
        return updateRes.rows[0];
    } finally {
        client.release();
    }
};

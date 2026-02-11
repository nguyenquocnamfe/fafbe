const pool = require("../../config/database");
const sql = require("./checkpoint.sql");

// Helper to get Wallet
const getWallet = async (client, userId) => {
    const { rows } = await client.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
    return rows[0];
};

exports.submitWork = async ({ checkpointId, workerId, submissionData }) => {
    const client = await pool.connect();
    try {
        // 1. Verify Checkpoint & Contract
        const cpRes = await client.query(sql.getById, [checkpointId]);
        const cp = cpRes.rows[0];
        if (!cp) throw new Error("CHECKPOINT_NOT_FOUND");
        
        // Check Contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [cp.contract_id]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error("CONTRACT_NOT_FOUND");
        if (contract.worker_id !== workerId) throw new Error("UNAUTHORIZED");
        if (contract.status !== 'ACTIVE') throw new Error("CONTRACT_NOT_ACTIVE");

        // 2. Insert Submission
        const { rows } = await client.query(sql.submit, [checkpointId, workerId, submissionData]);
        
        // 3. Update Checkpoint Status
        await client.query(sql.updateStatus, [checkpointId, 'SUBMITTED']);

        return rows[0];
    } finally {
        client.release();
    }
};

exports.approveWork = async (checkpointId, clientId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Verify Checkpoint
        const cpRes = await client.query(sql.getById, [checkpointId]);
        const cp = cpRes.rows[0];
        if (!cp) throw new Error("CHECKPOINT_NOT_FOUND");
        if (cp.status === 'APPROVED') throw new Error("ALREADY_APPROVED");

        // 2. Verify Client ownership
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [cp.contract_id]);
        const contract = contractRes.rows[0];
        const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [contract.job_id]);
        const job = jobRes.rows[0];

        if (job.client_id !== clientId) throw new Error("UNAUTHORIZED");

        // 3. RELEASE FUND LOGIC
        // Assumption: Money was locked in Client's wallet 'locked_points' when Contract started (or Job posted).
        // Let's assume money is in Client's locked_points.
        // Move: Client(locked) -> Worker(balance)
        
        const amount = Number(cp.amount);
        const workerId = contract.worker_id;

        // Decrease Client Locked
        await client.query(`
            UPDATE wallets SET locked_points = locked_points - $1, updated_at = NOW()
            WHERE user_id = $2
        `, [amount, clientId]);

        // Increase Worker Balance
        await client.query(`
            UPDATE wallets SET balance_points = balance_points + $1, updated_at = NOW()
            WHERE user_id = $2
        `, [amount, workerId]);

        // Record Transaction (Release)
        const clientWallet = await getWallet(client, clientId);
        await client.query(`
            INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id)
            VALUES ($1, 'RELEASE', $2, 'SUCCESS', 'CHECKPOINT', $3)
        `, [clientWallet.id, amount, checkpointId]);

        // 4. Update Checkpoint Status
        await client.query(sql.updateStatus, [checkpointId, 'APPROVED']);
        
        // 5. Update Submission Status (Assuming last submission is the valid one? Or we update all pending?)
        // Let's iterate submissions for this checkpoint? 
        // For simplicity, let's just mark checkpoint as APPROVED. 
        // But better to update specific submission? 
        // We will just update Checkpoint status for now as main indicator.

        await client.query("COMMIT");
        return { message: "Work approved and funds released" };

    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
};

exports.rejectWork = async (checkpointId, clientId) => {
    const client = await pool.connect();
    try {
        const cpRes = await client.query(sql.getById, [checkpointId]);
        const cp = cpRes.rows[0];
        
        // Validate Ownership (same as approve)
         const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [cp.contract_id]);
        const contract = contractRes.rows[0];
        const jobRes = await client.query('SELECT * FROM jobs WHERE id = $1', [contract.job_id]);
        const job = jobRes.rows[0];

        if (job.client_id !== clientId) throw new Error("UNAUTHORIZED");

        // Update status back to PENDING (or REJECTED?)
        // Usually, if rejected, it goes back to PENDING (so worker can resubmit) 
        // or REJECTED status. Let's use REJECTED.
        const { rows } = await client.query(sql.updateStatus, [checkpointId, 'REJECTED']);
        return rows[0];

    } finally {
        client.release();
    }
};

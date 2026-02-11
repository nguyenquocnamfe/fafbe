const pool = require("../../config/database");
const sql = require("./contract.sql");
const crypto = require('crypto');

exports.updateContent = async ({ contractId, userId, content }) => {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = res.rows[0];
        if (!contract) throw new Error("CONTRACT_NOT_FOUND");
        
        // Only Client can update content? Or both? Usually Client proposes.
        if (contract.client_id != userId) throw new Error("UNAUTHORIZED");
        
        // Cannot update if already signed by anyone?
        if (contract.signature_client || contract.signature_worker) throw new Error("CANNOT_UPDATE_SIGNED_CONTRACT");

        const updateRes = await client.query(sql.updateContent, [contractId, content]);
        return updateRes.rows[0];
    } finally {
        client.release();
    }
};

exports.signContract = async ({ contractId, userId }) => {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = res.rows[0];
        if (!contract) throw new Error("CONTRACT_NOT_FOUND");

        // Verify Participant
        let role = '';
        if (contract.client_id == userId) role = 'client';
        else if (contract.worker_id == userId) role = 'worker';
        else throw new Error("UNAUTHORIZED");

        // Generate Digital Signature
        // Simple Hash: SHA256( contract_content + userId + timestamp + SECRET )
        const secret = process.env.JWT_SECRET || 'secret';
        const dataToSign = `${contract.contract_content || ''}-${userId}-${Date.now()}-${secret}`;
        const signature = crypto.createHash('sha256').update(dataToSign).digest('hex');

        let updateRes;
        if (role === 'client') {
            updateRes = await client.query(sql.signContractClient, [contractId, signature]);
        } else {
            updateRes = await client.query(sql.signContractWorker, [contractId, signature]);
        }
        
        return updateRes.rows[0];

    } finally {
        client.release();
    }
};

exports.getContract = async (id) => {
    const { rows } = await pool.query(sql.getById, [id]);
    return rows[0];
};

exports.getActiveContractByWorker = async (workerId) => {
    const { rows } = await pool.query(sql.getActiveContractByWorker, [workerId]);
    if (rows.length === 0) return null;

    const contract = rows[0];
    
    // Get checkpoints for this contract
    const checkpointsRes = await pool.query(sql.getCheckpointsByContract, [contract.id]);
    contract.checkpoints = checkpointsRes.rows;
    
    return contract;
};

exports.getContractByJobAndWorker = async (jobId, workerId) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql.getContractByJobAndWorker, [jobId, workerId]);
        if (result.rows.length === 0) return null;
        
        const contract = result.rows[0];
        const checkpoints = await client.query(sql.getCheckpointsByContract, [contract.id]);
        contract.checkpoints = checkpoints.rows;
        
        return contract;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};

exports.getContractsByUser = async (userId) => {
    const client = await pool.connect();
    try {
        const result = await client.query(sql.getContractsByUser, [userId]);
        return result.rows;
    } catch (error) {
        throw error;
    } finally {
        client.release();
    }
};

exports.submitCheckpoint = async ({ checkpointId, workerId, submissionUrl, submissionNotes }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get checkpoint and verify ownership
        const cpRes = await client.query('SELECT * FROM checkpoints WHERE id = $1', [checkpointId]);
        const checkpoint = cpRes.rows[0];
        if (!checkpoint) throw new Error('CHECKPOINT_NOT_FOUND');

        // Verify worker owns this checkpoint's contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [checkpoint.contract_id]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.worker_id != workerId) throw new Error('UNAUTHORIZED');

        // Check if already submitted
        if (checkpoint.status === 'SUBMITTED' || checkpoint.status === 'APPROVED') {
            throw new Error('CHECKPOINT_ALREADY_SUBMITTED');
        }

        // Update checkpoint to SUBMITTED
        const updateRes = await client.query(
            sql.submitCheckpoint,
            [checkpointId, submissionUrl, submissionNotes]
        );

        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.approveCheckpoint = async ({ checkpointId, clientId, reviewNotes }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get checkpoint
        const cpRes = await client.query('SELECT * FROM checkpoints WHERE id = $1', [checkpointId]);
        const checkpoint = cpRes.rows[0];
        if (!checkpoint) throw new Error('CHECKPOINT_NOT_FOUND');

        // Verify client owns this contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [checkpoint.contract_id]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.client_id != clientId) throw new Error('UNAUTHORIZED');

        // Check if checkpoint is submitted
        if (checkpoint.status !== 'SUBMITTED') {
            throw new Error('CHECKPOINT_NOT_SUBMITTED');
        }

        // Approve checkpoint and release funds
        const updateRes = await client.query(
            sql.approveCheckpoint,
            [checkpointId, reviewNotes]
        );

        // Release locked funds to worker
        await client.query(
            `UPDATE wallets SET balance_points = balance_points + $1, locked_points = locked_points - $1 WHERE user_id = $2`,
            [checkpoint.amount, contract.worker_id]
        );

        // Check if all checkpoints are approved -> mark contract as COMPLETED
        const allCheckpointsRes = await client.query(
            'SELECT * FROM checkpoints WHERE contract_id = $1',
            [checkpoint.contract_id]
        );
        const allApproved = allCheckpointsRes.rows.every(cp => cp.id == checkpointId || cp.status === 'APPROVED');
        
        if (allApproved) {
            await client.query(
                'UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2',
                ['COMPLETED', checkpoint.contract_id]
            );
        }

        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.rejectCheckpoint = async ({ checkpointId, clientId, reviewNotes, reason }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get checkpoint
        const cpRes = await client.query('SELECT * FROM checkpoints WHERE id = $1', [checkpointId]);
        const checkpoint = cpRes.rows[0];
        if (!checkpoint) throw new Error('CHECKPOINT_NOT_FOUND');

        // Verify client owns this contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [checkpoint.contract_id]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.client_id != clientId) throw new Error('UNAUTHORIZED');

        // Check if checkpoint is submitted
        if (checkpoint.status !== 'SUBMITTED') {
            throw new Error('CHECKPOINT_NOT_SUBMITTED');
        }

        // Reject checkpoint (worker needs to resubmit)
        const updateRes = await client.query(
            sql.rejectCheckpoint,
            [checkpointId, reviewNotes + (reason ? ` | Reason: ${reason}` : '')]
        );

        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.requestSettlement = async ({ contractId, workerId }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.worker_id != workerId) throw new Error('UNAUTHORIZED');
        
        if (contract.status !== 'ACTIVE') throw new Error('CONTRACT_NOT_ACTIVE');
        
        const updateRes = await client.query(sql.requestSettlement, [contractId]);
        
        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.finalizeSettlement = async ({ contractId, clientId }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Get contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.client_id != clientId) throw new Error('UNAUTHORIZED');
        
        // 2. Fetch checkpoints
        const checkpointsRes = await client.query('SELECT * FROM checkpoints WHERE contract_id = $1', [contractId]);
        const checkpoints = checkpointsRes.rows;
        
        // 3. Mark remaining checkpoints as CANCELLED
        await client.query(sql.cancelCheckpointsByContract, [contractId]);
        
        // 4. Calculate amount to refund (all non-approved checkpoints)
        const remainingAmount = checkpoints
            .filter(cp => cp.status !== 'APPROVED')
            .reduce((sum, cp) => sum + Number(cp.amount), 0);

        // 5. Refund remaining amount to Client
        if (remainingAmount > 0) {
            await client.query(
                `UPDATE wallets SET balance_points = balance_points + $1 WHERE user_id = $2`,
                [remainingAmount, clientId]
            );
        }
        
        // 6. Mark contract as COMPLETED
        const updateRes = await client.query(sql.completeContract, [contractId]);
        
        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
// ... existing code ...

exports.terminateContract = async ({ contractId, clientId }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        if (contract.client_id != clientId) throw new Error('UNAUTHORIZED');

        // 2. Fetch checkpoints
        const checkpointsRes = await client.query('SELECT * FROM checkpoints WHERE contract_id = $1', [contractId]);
        const checkpoints = checkpointsRes.rows;
        
        // 3. Mark contract and pending checkpoints as CANCELLED
        await client.query("UPDATE contracts SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [contractId]);
        await client.query("UPDATE checkpoints SET status = 'CANCELLED' WHERE contract_id = $1 AND status = 'PENDING'", [contractId]);

        // 4. Calculate amount to refund (all PENDING or CANCELLED checkpoints)
        // We only refund what was locked and NOT released.
        // Approved/Released checkpoints are already paid.
        // So we refund pending ones.
        const pendingCheckpoints = checkpoints.filter(cp => cp.status === 'PENDING');
        const refundAmount = pendingCheckpoints.reduce((sum, cp) => sum + Number(cp.amount), 0);

        // 5. Refund remaining amount to Client (Unlock: Locked -> Balance)
        if (refundAmount > 0) {
            await client.query(
                `UPDATE wallets SET balance_points = balance_points + $1, locked_points = locked_points - $1, updated_at = NOW() WHERE user_id = $2`,
                [refundAmount, clientId]
            );
            
            // Record Refund Transaction
            await client.query(`
                INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, created_at)
                SELECT id, 'REFUND', $1, 'SUCCESS', 'CONTRACT_TERMINATION', $2, NOW()
                FROM wallets WHERE user_id = $3
            `, [refundAmount, contractId, clientId]);
        }

        // 6. Job Re-opening: Update Job Status to OPEN
        await client.query("UPDATE jobs SET status = 'OPEN', updated_at = NOW() WHERE id = $1", [contract.job_id]);

        // 7. Create New DRAFT Contract for Remaining Work
        if (pendingCheckpoints.length > 0) {
            // Create Contract
             const newContractRes = await client.query(`
                INSERT INTO contracts (
                    job_id, client_id, contract_type,
                    total_amount, contract_content, status, created_at
                )
                VALUES ($1, $2, 'ESCROW', $3, $4, 'DRAFT', NOW())
                RETURNING *
            `, [contract.job_id, clientId, refundAmount, contract.contract_content]);
            const newContract = newContractRes.rows[0];

            // Create Checkpoints
            for (const cp of pendingCheckpoints) {
                await client.query(`
                    INSERT INTO checkpoints (
                        contract_id, title, description,
                        amount, due_date, status, created_at
                    )
                    VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
                `, [newContract.id, cp.title, cp.description, cp.amount, cp.due_date]);
            }
        }

        await client.query('COMMIT');
        return { message: "Contract terminated, funds refunded, and job re-opened with remaining work." };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

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

        const updatedContract = updateRes.rows[0];

        // If both parties have signed, activate the contract
        if (updatedContract.signature_worker && updatedContract.signature_client) {
            await client.query(
                `UPDATE contracts SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
                [contractId]
            );
            updatedContract.status = 'ACTIVE';
        }

        return updatedContract;

    } finally {
        client.release();
    }
};


exports.getContract = async (id) => {
    const { rows } = await pool.query(sql.getById, [id]);
    const contract = rows[0];
    if (!contract) return null;
    
    // Include checkpoints
    const checkpointsRes = await pool.query(sql.getCheckpointsByContract, [contract.id]);
    contract.checkpoints = checkpointsRes.rows;
    
    return contract;
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
            const walletService = require("../wallets/wallet.service");
            await walletService.refundLockedFunds(client, {
                userId: clientId,
                amount: remainingAmount,
                referenceId: contractId,
                referenceType: 'CONTRACT_SETTLEMENT'
            });
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

exports.terminateContract = async ({ contractId, userId }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get contract
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error('CONTRACT_NOT_FOUND');
        const clientId = contract.client_id;
        
        // Allow either client or worker to terminate
        if (contract.client_id != userId && contract.worker_id != userId) {
            throw new Error('UNAUTHORIZED');
        }

        // 2. Fetch checkpoints
        const checkpointsRes = await client.query('SELECT * FROM checkpoints WHERE contract_id = $1', [contractId]);
        const checkpoints = checkpointsRes.rows;
        
        // 3. Mark contract and pending checkpoints as CANCELLED
        await client.query("UPDATE contracts SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", [contractId]);
        await client.query("UPDATE checkpoints SET status = 'CANCELLED' WHERE contract_id = $1 AND status = 'PENDING'", [contractId]);

        // 4. Calculate amount to refund (all PENDING checkpoints)
        const pendingCheckpoints = checkpoints.filter(cp => cp.status === 'PENDING');
        const refundAmount = pendingCheckpoints.reduce((sum, cp) => sum + Number(cp.amount), 0);

        // 5. Refund remaining amount to Client
        if (refundAmount > 0) {
            const walletService = require("../wallets/wallet.service");
            await walletService.refundLockedFunds(client, {
                userId: clientId,
                amount: refundAmount,
                referenceId: contractId,
                referenceType: 'CONTRACT_TERMINATION'
            });
        }

        // 6. Job Re-opening: Update Job Status to OPEN
        await client.query("UPDATE jobs SET status = 'OPEN', updated_at = NOW() WHERE id = $1", [contract.job_id]);

        // 7. Reset worker's ACCEPTED proposal back to PENDING (so worker is free again)
        if (contract.worker_id) {
            await client.query(`
                UPDATE proposals
                SET status = 'PENDING', updated_at = NOW()
                WHERE job_id = $1 AND worker_id = $2 AND status = 'ACCEPTED'
            `, [contract.job_id, contract.worker_id]);
        }

        // 8. Create New DRAFT Contract for Remaining Work
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


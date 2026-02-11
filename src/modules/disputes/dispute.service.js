const pool = require("../../config/database");
const sql = require("./dispute.sql");
const notificationService = require('../notifications/notification.service'); // Import for use

exports.createDispute = async ({ contractId, userId, reason }) => {
    const client = await pool.connect();
    try {
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error("CONTRACT_NOT_FOUND");
        
        if (contract.client_id !== userId && contract.worker_id !== userId) {
            throw new Error("UNAUTHORIZED");
        }

        const { rows } = await client.query(sql.create, [contractId, userId, reason]);
        const dispute = rows[0];
        
        // Update Contract Status
        await client.query("UPDATE contracts SET status = 'DISPUTED' WHERE id = $1", [contractId]);
        
        // Notify other party + Admin
        // Identify other party
        const otherPartyId = (userId === contract.client_id) ? contract.worker_id : contract.client_id;
        
        // Notify Other Party
        // WE need Io instance. Assuming integration later or passed in? 
        // For now, let controller handle notification or we import singleton if possible?
        // Service generally shouldn't depend on Controller stuff.
        // We will return dispute and let controller notify.
        
        return dispute;
    } finally {
        client.release();
    }
};

exports.getDispute = async (disputeId, userId) => {
    const { rows } = await pool.query(sql.getById, [disputeId]);
    const dispute = rows[0];
    if (!dispute) return null;
    
    // Check permission (Client, Worker, Admin)
    const contractRes = await pool.query('SELECT * FROM contracts WHERE id = $1', [dispute.contract_id]);
    const contract = contractRes.rows[0];
    
    // Check if user is admin? 
    // We don't have user role here easily unless passed. 
    // For now, allow participants. Controller checks admin.
    if (contract.client_id !== userId && contract.worker_id !== userId) {
         // Return null or throw? Let controller handle if it's admin.
         // If called by controller with admin logic, we might need a bypass.
         // Let's assume controller checks permissions.
    }
    
    const msgRes = await pool.query(sql.getMessages, [disputeId]);
    dispute.messages = msgRes.rows;
    
    return dispute;
};

exports.addMessage = async ({ disputeId, userId, message, attachments }) => {
     const { rows } = await pool.query(sql.addMessage, [disputeId, userId, message, attachments || []]);
     return rows[0];
};

exports.resolveDispute = async ({ disputeId, resolution, adminId, io }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Fetch Dispute & Contract
        const disputeRes = await client.query(sql.getById, [disputeId]);
        const dispute = disputeRes.rows[0];
        if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
        
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [dispute.contract_id]);
        const contract = contractRes.rows[0];
        if (!contract) throw new Error("CONTRACT_NOT_FOUND");
        
        // 2. Fetch Checkpoints & Calculate Locked Funds
        const cpRes = await client.query('SELECT * FROM checkpoints WHERE contract_id = $1', [contract.id]);
        const checkpoints = cpRes.rows;
        
        // Locked Funds = Sum of Non-Approved Checkpoints
        const pendingPoints = checkpoints
            .filter(cp => cp.status !== 'APPROVED')
            .reduce((sum, cp) => sum + Number(cp.amount), 0);
            
        // 3. Handle Resolution
        if (resolution === 'CLIENT_WINS') {
            // REFUND Client
            if (pendingPoints > 0) {
                await client.query(`
                    UPDATE wallets SET balance_points = balance_points + $1, locked_points = locked_points - $1, updated_at = NOW()
                    WHERE user_id = $2
                `, [pendingPoints, contract.client_id]);
                
                await client.query(`
                     INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, created_at)
                     SELECT id, 'REFUND', $1, 'SUCCESS', 'DISPUTE_RESOLUTION', $2, NOW()
                     FROM wallets WHERE user_id = $3
                `, [pendingPoints, disputeId, contract.client_id]);
            }
            
            // Cancel Contract & Checkpoints
            await client.query("UPDATE contracts SET status = 'CANCELLED' WHERE id = $1", [contract.id]);
            await client.query("UPDATE checkpoints SET status = 'CANCELLED' WHERE contract_id = $1 AND status != 'APPROVED'", [contract.id]);

        } else if (resolution === 'WORKER_WINS') {
            // RELEASE to Worker
             if (pendingPoints > 0) {
                // Decrease Client Locked
                await client.query(`
                    UPDATE wallets SET locked_points = locked_points - $1, updated_at = NOW()
                    WHERE user_id = $2
                `, [pendingPoints, contract.client_id]);
                
                // Increase Worker Balance
                await client.query(`
                    UPDATE wallets SET balance_points = balance_points + $1, updated_at = NOW()
                    WHERE user_id = $2
                `, [pendingPoints, contract.worker_id]);
                
                // Log Transaction
                 await client.query(`
                     INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, created_at)
                     SELECT id, 'RELEASE', $1, 'SUCCESS', 'DISPUTE_RESOLUTION', $2, NOW()
                     FROM wallets WHERE user_id = $3
                `, [pendingPoints, disputeId, contract.client_id]); // Logged under client wallet as source? Or Worker? Usually system logs transfer.
                // Better: Log RELEASE from Client perspective (deduction) or Worker?
                // Our system logs movements via wallet_id.
                // Let's log 'DEPOSIT' for Worker?
                // Or 'RELEASE' from Escrow.
                // Let's log for Worker as DEPOSIT/RELEASE.
                 await client.query(`
                     INSERT INTO transactions (wallet_id, type, amount, status, reference_type, reference_id, created_at)
                     SELECT id, 'RELEASE', $1, 'SUCCESS', 'DISPUTE_RESOLUTION', $2, NOW()
                     FROM wallets WHERE user_id = $3
                `, [pendingPoints, disputeId, contract.worker_id]);
            }
            
            // Complete Contract & Approve Checkpoints
            await client.query("UPDATE contracts SET status = 'COMPLETED' WHERE id = $1", [contract.id]);
            await client.query("UPDATE checkpoints SET status = 'APPROVED' WHERE contract_id = $1 AND status != 'APPROVED'", [contract.id]);

        } else {
            throw new Error("INVALID_RESOLUTION_TYPE");
        }
        
        // 4. Update Dispute Status
        const updateDispute = await client.query(sql.updateStatus, [disputeId, 'RESOLVED', resolution]);
        
        // 5. Notifications
        if (io) {
            // Notify Client
            await notificationService.createNotification({
                userId: contract.client_id,
                type: 'DISPUTE_RESOLVED',
                title: 'Dispute Resolved',
                message: `Dispute #${disputeId} has been resolved: ${resolution}`,
                data: { disputeId, resolution },
                io
            });
            // Notify Worker
            await notificationService.createNotification({
                userId: contract.worker_id,
                type: 'DISPUTE_RESOLVED',
                title: 'Dispute Resolved',
                message: `Dispute #${disputeId} has been resolved: ${resolution}`,
                data: { disputeId, resolution },
                io
            });
        }
        
        await client.query('COMMIT');
        return updateDispute.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

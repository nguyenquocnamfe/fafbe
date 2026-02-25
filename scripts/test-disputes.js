require('dotenv').config();
const pool = require('../src/config/database'); // Use shared pool

// Helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log("🚀 STARTING DISPUTE RESOLUTION TEST...");
    // console.log("DB URL:", process.env.DATABASE_URL); 
    
    // Connect via shared pool
    const client = await pool.connect();
    
    try {
        // 1. Setup Users (Admin, Client, Worker)
        // We assume they exist or create temp ones.
        // Let's use existing ones from integration test if possible, or create new.
        // Creating new unique ones is safer.
        const suffix = Date.now();
        const adminEmail = `admin_disp_${suffix}@test.com`;
        const clientEmail = `client_disp_${suffix}@test.com`;
        const workerEmail = `worker_disp_${suffix}@test.com`;
        
        // Create Admin
        let res = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, 'hash', 'ADMIN', 'ACTIVE', true, NOW()) RETURNING id`, [adminEmail]);
        const adminId = res.rows[0].id;
        
        // Create Client & Wallet
        res = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, 'hash', 'employer', 'ACTIVE', true, NOW()) RETURNING id`, [clientEmail]);
        const clientId = res.rows[0].id;
        await client.query(`INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Client')`, [clientId]);
        await client.query(`INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 10000, 0)`, [clientId]);
        
        // Create Worker & Wallet
        res = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, 'hash', 'freelancer', 'ACTIVE', true, NOW()) RETURNING id`, [workerEmail]);
        const workerId = res.rows[0].id;
        await client.query(`INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Worker')`, [workerId]);
        await client.query(`INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 0, 0)`, [workerId]);
        
        
        console.log("✓ Users setup complete");

        // Create Category
        res = await client.query(`INSERT INTO job_categories (name, slug, is_active, created_at) VALUES ('Dispute Test', 'dispute-test-${Date.now()}', true, NOW()) RETURNING id`);
        const cateId = res.rows[0].id;

        // 2. Create Job & Contract (Active)
        // Post Job
        res = await client.query(`INSERT INTO jobs (client_id, title, description, budget, status, job_type, category_id, deadline) VALUES ($1, 'Dispute Job', 'Test', 2000, 'OPEN', 'SHORT_TERM', $2, NOW() + INTERVAL '7 days') RETURNING id`, [clientId, cateId]);
        const jobId = res.rows[0].id;
        
        // Create Contract (Active) & Lock Funds (2000)
        res = await client.query(`INSERT INTO contracts (job_id, client_id, worker_id, total_amount, status, contract_content) VALUES ($1, $2, $3, 2000, 'ACTIVE', 'Test Content') RETURNING id`, [jobId, clientId, workerId]);
        const contractId = res.rows[0].id;
        
        await client.query(`UPDATE wallets SET balance_points = balance_points - 2000, locked_points = locked_points + 2000 WHERE user_id = $1`, [clientId]);
        
        // Create Checkpoints (1000 each)
        await client.query(`INSERT INTO checkpoints (contract_id, title, amount, status) VALUES ($1, 'CP1', 1000, 'PENDING')`, [contractId]);
        await client.query(`INSERT INTO checkpoints (contract_id, title, amount, status) VALUES ($1, 'CP2', 1000, 'PENDING')`, [contractId]);
        
        console.log("✓ Contract & Checkpoints created (Funds Locked: 2000)");

        // 3. Client Raises Dispute
        const disputeService = require('../src/modules/disputes/dispute.service'); // Load service
        const dispute = await disputeService.createDispute({ contractId, userId: clientId, reason: "Worker not responding" });
        console.log(`✓ Dispute raised: ${dispute.id}`);
        
        // Add Message with Attachment
        await disputeService.addMessage({ 
            disputeId: dispute.id, 
            userId: clientId, 
            message: "Here is proof", 
            attachments: ["http://proof.com/img.png"] 
        });
        
        // Verify Message
        const savedDispute = await disputeService.getDispute(dispute.id, clientId);
        if (!savedDispute.messages[0].attachments || savedDispute.messages[0].attachments[0] !== "http://proof.com/img.png") {
            throw new Error("Attachments not saved correctly");
        }
        console.log("✓ Attachments verified");
        
        // 4. Admin Resolves: WORKER_WINS (Release 2000 to Worker)
        console.log("--- Resolving: WORKER_WINS ---");
        // Mock IO
        const mockIo = { to: () => ({ emit: () => {} }) };
        
        await disputeService.resolveDispute({ disputeId: dispute.id, resolution: 'WORKER_WINS', adminId, io: mockIo });
        console.log("✓ Dispute Resolved");
        
        // 5. Verify Balances
        const clientWallet = await client.query(`SELECT * FROM wallets WHERE user_id = $1`, [clientId]);
        const workerWallet = await client.query(`SELECT * FROM wallets WHERE user_id = $1`, [workerId]);
        
        console.log(`   Client Wallet: Balance=${clientWallet.rows[0].balance_points}, Locked=${clientWallet.rows[0].locked_points}`);
        console.log(`   Worker Wallet: Balance=${workerWallet.rows[0].balance_points}`);
        
        if (Number(clientWallet.rows[0].locked_points) !== 0) throw new Error("Client locked points should be 0");
        if (Number(workerWallet.rows[0].balance_points) !== 1900) throw new Error("Worker should have received 1900 (2000 - 5% fee)");
        
        console.log("✓ WORKER_WINS Verification Passed!");
        
        // 6. Test CLIENT_WINS (Scenario 2)
        console.log("--- Testing CLIENT_WINS ---");
        // Setup new contract
         res = await client.query(`INSERT INTO contracts (job_id, client_id, worker_id, total_amount, status, contract_content) VALUES ($1, $2, $3, 1000, 'ACTIVE', 'Test Content 2') RETURNING id`, [jobId, clientId, workerId]);
        const contractId2 = res.rows[0].id;
        // Lock 1000
        await client.query(`UPDATE wallets SET balance_points = 8000, locked_points = 1000 WHERE user_id = $1`, [clientId]); // Reset balance to 8000 (10000 - 2000 paid) -> Lock 1000
        await client.query(`INSERT INTO checkpoints (contract_id, title, amount, status) VALUES ($1, 'CP_New', 1000, 'PENDING')`, [contractId2]);
        
        // Raise Dispute
        const dispute2 = await disputeService.createDispute({ contractId: contractId2, userId: workerId, reason: "Client not paying" });
        
        // Resolve CLIENT_WINS
        await disputeService.resolveDispute({ disputeId: dispute2.id, resolution: 'CLIENT_WINS', adminId, io: mockIo });
        
        // Verify
        const clientWallet2 = await client.query(`SELECT * FROM wallets WHERE user_id = $1`, [clientId]);
        console.log(`   Client Wallet: Balance=${clientWallet2.rows[0].balance_points}, Locked=${clientWallet2.rows[0].locked_points}`);
        
        if (Number(clientWallet2.rows[0].locked_points) !== 0) throw new Error("Client locked points should be 0");
        if (Number(clientWallet2.rows[0].balance_points) !== 9000) throw new Error("Client should have 9000 (8000 + 1000 refund)");
        
        console.log("✓ CLIENT_WINS Verification Passed!");

    } catch (e) {
        console.error("❌ TEST FAILED:", e);
        process.exit(1);
    } finally {
        console.log("Cleanup...");
        // await client.query('DELETE FROM ...'); // Optional
        client.release();
        pool.end();
    }
}

runTest();

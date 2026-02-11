require('dotenv').config();
const pool = require('../src/config/database');
const bcrypt = require('bcrypt');

async function runTest() {
    console.log("🚀 STARTING EXCLUSIVE WORKER LOGIC TEST...");
    const client = await pool.connect();
    
    try {
        const timestamp = Date.now();
        const hash = await bcrypt.hash('pass', 10);
        
        // 1. Setup Users
        const clientEmail = `client_ex_${timestamp}@test.com`;
        const workerEmail = `worker_ex_${timestamp}@test.com`;
        
        const clientRes = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, $2, 'employer', 'ACTIVE', true, NOW()) RETURNING id`, [clientEmail, hash]);
        const clientId = clientRes.rows[0].id;
        await client.query(`INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Client')`, [clientId]);
        await client.query(`INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 10000, 0)`, [clientId]);
        
        const workerRes = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, $2, 'freelancer', 'ACTIVE', true, NOW()) RETURNING id`, [workerEmail, hash]);
        const workerId = workerRes.rows[0].id;
        await client.query(`INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Worker')`, [workerId]);
        
        console.log("✓ Users setup");
        
        // 2. Create Jobs (A, B, C)
        // Need category
        const cateRes = await client.query(`INSERT INTO job_categories (name, slug, is_active) VALUES ('ExTest', 'extest-${timestamp}', true) RETURNING id`);
        const cateId = cateRes.rows[0].id;
        
        const createJob = async (title) => {
            const res = await client.query(`INSERT INTO jobs (client_id, title, description, budget, status, category_id, job_type, deadline) VALUES ($1, $2, 'Desc', 1000, 'OPEN', $3, 'SHORT_TERM', NOW() + INTERVAL '7 days') RETURNING id`, [clientId, title, cateId]);
            const jId = res.rows[0].id;
            // Create Draft Contract
            await client.query(`INSERT INTO contracts (job_id, client_id, status, total_amount, contract_content) VALUES ($1, $2, 'DRAFT', 1000, 'Test Content')`, [jId, clientId]);
            return jId;
        };
        
        const jobA = await createJob('Job A');
        const jobB = await createJob('Job B');
        const jobC = await createJob('Job C');
        
        console.log(`✓ Jobs created: A=${jobA}, B=${jobB}, C=${jobC}`);
        
        // 3. Worker applies to Job A & Job B
        const proposalService = require('../src/modules/proposals/proposal.service');
        
        const propA = await proposalService.createProposal({ jobId: jobA, workerId, coverLetter: "Apply A", proposedPrice: 1000 });
        const propB = await proposalService.createProposal({ jobId: jobB, workerId, coverLetter: "Apply B", proposedPrice: 1000 });
        
        console.log("✓ Worker applied to A and B");
        
        // 4. Accept Job A
        console.log("--- Accepting Job A ---");
        await proposalService.acceptProposal(propA.id, clientId);
        console.log("✓ Job A Accepted (Contract Created)");
        
        // 5. Verify Cleanup: Prop B should be gone
        const checkB = await client.query('SELECT * FROM proposals WHERE id = $1', [propB.id]);
        if (checkB.rows.length === 0) {
            console.log("✓ Proposal B auto-deleted (Success)");
        } else {
            console.error("❌ Proposal B STILL EXISTS:", checkB.rows[0].status);
            throw new Error("Exclusive Logic Failed: Proposal B should be deleted");
        }
        
        // 6. Verify Exclusive Apply: Try applying to Job C
        console.log("--- Trying to apply to Job C (Should Fail) ---");
        try {
            await proposalService.createProposal({ jobId: jobC, workerId, coverLetter: "Apply C", proposedPrice: 1000 });
            throw new Error("Worker was able to apply despite active contract!");
        } catch (e) {
            if (e.message === 'WORKER_BUSY_CANNOT_APPLY') {
                console.log("✓ Blocked application to Job C (Success: WORKER_BUSY_CANNOT_APPLY)");
            } else {
                throw e;
            }
        }
        
        // 7. Terminate Contract A
        console.log("--- Terminating Contract A ---");
        const contractRes = await client.query('SELECT id FROM contracts WHERE job_id = $1', [jobA]);
        const contractId = contractRes.rows[0].id;
        
        // Manually terminate or use service? Let's use service if possible, or manual update.
        // `contract.service` logic is complex, let's just update DB for speed in this test, 
        // OR better: use service to ensure it handles everything (like unlocking worker).
        // But `terminateContract` might trigger refund logic which requires locked funds etc.
        // We locked funds in acceptProposal.
        // Let's use DB update to Simulate Completion.
        await client.query("UPDATE contracts SET status = 'COMPLETED' WHERE id = $1", [contractId]);
        console.log("✓ Contract A Completed");
        
        // 8. Try applying to Job C (Should Succeed)
        console.log("--- Trying to apply to Job C (Should Succeed) ---");
        const propC = await proposalService.createProposal({ jobId: jobC, workerId, coverLetter: "Apply C retry", proposedPrice: 1000 });
        console.log("✓ Application to Job C successful");

        console.log("\n🎉 EXCLUSIVE LOGIC TEST PASSED!");

    } catch (e) {
        console.error("❌ TEST FAILED:", e);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
}

runTest();

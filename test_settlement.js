require('dotenv').config();
const { Pool } = require('pg');
const pool = require('./src/config/database');
const jobService = require('./src/modules/jobs/job.service');
const contractService = require('./src/modules/contracts/contract.service');

async function runTest() {
    const client = await pool.connect();
    
    // Test Data
    const jobTitle = 'TEST_SETTLEMENT_JOB_' + Date.now();
    const clientEmail = `client_${Date.now()}@test.com`;
    const workerEmail = `worker_${Date.now()}@test.com`;
    
    let clientId, workerId, jobId, contractId;

    try {
        console.log('🚀 Starting Settlement Test...');
        await client.query('BEGIN');

        // 1. Create Users & Wallets
        const clientRes = await client.query(
            "INSERT INTO users (email, password, role, created_at) VALUES ($1, 'pass', 'client', NOW()) RETURNING id",
            [clientEmail]
        );
        clientId = clientRes.rows[0].id;
        await client.query("INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 1000, 0)", [clientId]);
        await client.query("INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Client')", [clientId]);

        const workerRes = await client.query(
            "INSERT INTO users (email, password, role, created_at) VALUES ($1, 'pass', 'worker', NOW()) RETURNING id",
            [workerEmail]
        );
        workerId = workerRes.rows[0].id;
        await client.query("INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 0, 0)", [workerId]);
        await client.query("INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Worker')", [workerId]);

        console.log(`✅ Users created: Client ${clientId}, Worker ${workerId}`);

        // 2. Post Job (Expired)
        const startDate = new Date(Date.now() - 86400000 * 5); // 5 days ago
        const endDate = new Date(Date.now() - 86400000 * 1);   // 1 day ago
        
        // We use the service but need to commit the transaction inside service? 
        // outcomes: jobService creates its own client/transaction.
        // So we should commit our current transaction (users) first so the service can see them?
        // Actually yes, jobService uses pool.connect().
        await client.query('COMMIT'); 

        const created = await jobService.createJobWithContractAndCheckpoints({
            clientId,
            categoryId: 1, // Assuming category 1 exists, otherwise need to create
            title: jobTitle,
            description: 'Test Description',
            jobType: 'SHORT_TERM',
            budget: 100,
            checkpoints: [
                { title: 'Full Work', amount: 100 }
            ],
            contractContent: 'Terms...',
            skills: [],
            startDate,
            endDate
        });

        jobId = created.job.id;
        // created.contract is the draft contract
        contractId = created.contract.id;

        console.log(`✅ Job posted: ${jobId}, Contract: ${contractId}`);

        // 3. Manually Activate Contract (Simulate Hiring)
        // Need new client since previous one was released/committed?
        // We can just use pool.query for simple updates
        await pool.query(
            `UPDATE contracts 
             SET worker_id = $1, status = 'ACTIVE', 
                 signature_client = 'sig_c', signature_worker = 'sig_w', signed_at = NOW() 
             WHERE id = $2`,
            [workerId, contractId]
        );
        
        console.log(`✅ Contract activated manually`);

        // 4. Worker Requests Settlement
        console.log('🔄 Requesting settlement...');
        await contractService.requestSettlement({ contractId, workerId });
        
        // Verify request
        const cRes = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (!cRes.rows[0].settlement_requested_at) throw new Error('Settlement request timestamp not set');
        console.log('✅ Settlement requested successfully');

        // 5. Client Finalizes Settlement
        console.log('🔄 Finalizing settlement...');
        // Check Client Wallet before
        const wResBefore = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [clientId]);
        const balanceBefore = Number(wResBefore.rows[0].balance_points);
        console.log(`   Client Balance Before: ${balanceBefore}`);

        await contractService.finalizeSettlement({ contractId, clientId });
        
        // 6. Verify Final State
        const cFinal = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (cFinal.rows[0].status !== 'COMPLETED') throw new Error(`Contract status is ${cFinal.rows[0].status}, expected COMPLETED`);
        
        const cpFinal = await pool.query('SELECT * FROM checkpoints WHERE contract_id = $1', [contractId]);
        const cancelledCp = cpFinal.rows.filter(cp => cp.status === 'CANCELLED');
        if (cancelledCp.length !== 1) throw new Error('Checkpoint not cancelled');

        const wResAfter = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [clientId]);
        const balanceAfter = Number(wResAfter.rows[0].balance_points);
        console.log(`   Client Balance After: ${balanceAfter}`);
        
        if (balanceAfter !== balanceBefore + 100) throw new Error('Refund calculation incorrect');

        console.log('✅ Settlement Finalized & Verified successfully!');

    } catch (e) {
        console.error('❌ Test Failed:', e);
        await client.query('ROLLBACK'); // In case main flow failed
    } finally {
        client.release();
        await pool.end();
    }
}

runTest();

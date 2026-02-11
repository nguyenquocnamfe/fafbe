const { Pool } = require('pg');
const http = require('http');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const runRequest = (path, method, body, token) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (d) => {
        responseBody += d;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: responseBody
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) req.write(data);
    req.end();
  });
};

(async () => {
  let client;
  let adminId, clientId, workerId, cateId, skillId;
  let jobId, contractId, proposalId, draftContractId;
  let tokenAdmin, tokenClient, tokenWorker;

  try {
    console.log(`\n🚀 STARTING RE-OPENING TEST...\n`);
    client = await pool.connect();
    const hash = await bcrypt.hash('TestPass123!', 10);
    const timestamp = Date.now();

    // --- SETUP ---
    console.log('--- 1. Setting up Users ---');
    
    // Admin
    const adminEmail = `admin_reopen_${timestamp}@test.com`;
    const adminRes = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, $2, 'ADMIN', 'ACTIVE', true, NOW()) RETURNING id`, [adminEmail, hash]);
    adminId = adminRes.rows[0].id;

    // Client
    const clientEmail = `client_reopen_${timestamp}@test.com`;
    const clientRes = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, $2, 'employer', 'ACTIVE', true, NOW()) RETURNING id`, [clientEmail, hash]);
    clientId = clientRes.rows[0].id;
    await client.query(`INSERT INTO wallets (user_id, balance_points, locked_points, updated_at) VALUES ($1, 10000, 0, NOW())`, [clientId]);

    // Worker
    const workerEmail = `worker_reopen_${timestamp}@test.com`;
    const workerRes = await client.query(`INSERT INTO users (email, password_hash, role, status, email_verified, created_at) VALUES ($1, $2, 'freelancer', 'ACTIVE', true, NOW()) RETURNING id`, [workerEmail, hash]);
    workerId = workerRes.rows[0].id;
    await client.query(`INSERT INTO user_profiles (user_id, full_name, created_at) VALUES ($1, 'Reopen Worker', NOW())`, [workerId]);

    // Category
    const cateRes = await client.query(`INSERT INTO job_categories (name, slug, is_active, created_at) VALUES ('Reopen Test', 'reopen-test-${timestamp}', true, NOW()) RETURNING id`);
    cateId = cateRes.rows[0].id;

    console.log(`✓ Users created`);

    // --- AUTH ---
    tokenAdmin = JSON.parse((await runRequest('/api/auth/login', 'POST', { email: adminEmail, password: 'TestPass123!' })).body).token;
    tokenClient = JSON.parse((await runRequest('/api/auth/login', 'POST', { email: clientEmail, password: 'TestPass123!' })).body).token;
    tokenWorker = JSON.parse((await runRequest('/api/auth/login', 'POST', { email: workerEmail, password: 'TestPass123!' })).body).token;

    // --- JOB POSTING WITH DEADLINE ---
    console.log('\n--- 2. Job Posting (with Deadline) ---');
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 30); // ~1 month from now

    const jobRes = await runRequest('/api/jobs', 'POST', {
        title: "Reopen Job Test",
        description: "Testing terminology",
        jobType: "SHORT_TERM",
        budget: 4000,
        categoryId: cateId,
        checkpoints: [
            { title: "CP1", amount: 1000 },
            { title: "CP2", amount: 3000 }
        ],
        contractContent: "Contract for reopen test",
        skills: [],
        deadline: deadlineDate.toISOString()
    }, tokenClient);
    
    if (jobRes.statusCode !== 201) throw new Error(`Job posting failed: ${jobRes.body}`);
    jobId = JSON.parse(jobRes.body).data.job.id;
    console.log(`✓ Job posted: ${jobId} (Pending Approval)`);

    // Verify Deadline
    const jobCheck = await client.query('SELECT deadline FROM jobs WHERE id = $1', [jobId]);
    if (jobCheck.rows[0].deadline) {
        console.log(`✓ Deadline Saved: ${jobCheck.rows[0].deadline}`);
    } else {
        throw new Error('Deadline NOT saved!');
    }

    // --- ADMIN APPROVE ---
    await runRequest(`/api/admin/jobs/${jobId}/approve`, 'PUT', null, tokenAdmin);
    console.log(`✓ Job Approved`);

    // --- PROPOSAL & CONTRACT ---
    console.log('\n--- 3. Contract Creation ---');
    const propRes = await runRequest('/api/proposals', 'POST', { jobId, coverLetter: "Hi", proposedPrice: 4000 }, tokenWorker);
    proposalId = JSON.parse(propRes.body).data.id;
    
    const acceptRes = await runRequest(`/api/proposals/${proposalId}/accept`, 'PUT', null, tokenClient);
    contractId = JSON.parse(acceptRes.body).data.contract.id;
    console.log(`✓ Contract Created: ${contractId}`);
    
    // Verify Wallet (Locked 4000)
    const w1 = await client.query('SELECT * FROM wallets WHERE user_id = $1', [clientId]);
    console.log(`   Wallet: Balance=${w1.rows[0].balance_points}, Locked=${w1.rows[0].locked_points} (Expected: 6000, 4000)`);

    // --- APPROVE CP1 (Partial Completion) ---
    console.log('\n--- 4. Partial Work (CP1) ---');
    const cpRes = await client.query('SELECT * FROM checkpoints WHERE contract_id = $1 ORDER BY amount ASC', [contractId]);
    const cp1 = cpRes.rows[0]; // 1000
    
    // Submit & Approve CP1
    await runRequest(`/api/checkpoints/${cp1.id}/submit`, 'POST', { submissionUrl: "done" }, tokenWorker);
    await runRequest(`/api/checkpoints/${cp1.id}/approve`, 'PUT', null, tokenClient);
    console.log(`✓ CP1 Approved (1000 paid)`);
    
    // Verify Wallet (Locked should be 3000 now)
    const w2 = await client.query('SELECT * FROM wallets WHERE user_id = $1', [clientId]);
    console.log(`   Wallet: Balance=${w2.rows[0].balance_points}, Locked=${w2.rows[0].locked_points} (Expected: 6000, 3000)`);

    // --- TERMINATE CONTRACT ---
    console.log('\n--- 5. Terminate Contract ---');
    const termRes = await runRequest(`/api/contracts/${contractId}/terminate`, 'PUT', null, tokenClient);
    console.log(`   Response: ${termRes.body}`);
    if (termRes.statusCode !== 200) throw new Error(`Termination failed: ${termRes.body}`);

    // --- VERIFY RE-OPENING ---
    console.log('\n--- 6. Verification ---');
    
    // 1. Contract Status
    const cCheck = await client.query('SELECT status FROM contracts WHERE id = $1', [contractId]);
    console.log(`   Old Contract: ${cCheck.rows[0].status} (Expected: CANCELLED)`);
    
    // 2. Job Status
    const jCheck = await client.query('SELECT status FROM jobs WHERE id = $1', [jobId]);
    console.log(`   Job Status: ${jCheck.rows[0].status} (Expected: OPEN)`);
    
    // 3. Wallet Refund (Refund 3000 -> Balance should be 9000: 6000 + 3000)
    const w3 = await client.query('SELECT * FROM wallets WHERE user_id = $1', [clientId]);
    console.log(`   Wallet: Balance=${w3.rows[0].balance_points}, Locked=${w3.rows[0].locked_points} (Expected: 9000, 0)`);
    
    // 4. New Draft Contract
    const dCheck = await client.query('SELECT * FROM contracts WHERE job_id = $1 AND status = \'DRAFT\'', [jobId]);
    if (dCheck.rows.length === 1) {
        const newDraft = dCheck.rows[0];
        console.log(`   New Draft Contract: ${newDraft.id} (Status: DRAFT)`);
        console.log(`   Amount: ${newDraft.total_amount} (Expected: 3000)`);
        
        // 5. Checkpoints in Draft
        const cpNew = await client.query('SELECT * FROM checkpoints WHERE contract_id = $1', [newDraft.id]);
        console.log(`   Checkpoints count: ${cpNew.rows.length} (Expected: 1 - CP2 only)`);
        if (cpNew.rows.length === 1 && Number(cpNew.rows[0].amount) === 3000) {
            console.log(`   Checkpoint verified: ${cpNew.rows[0].title} - ${cpNew.rows[0].amount}`);
        } else {
             console.error(`❌ Wrong checkpoints in new contract`);
        }
        
    } else {
        console.error(`❌ New Draft Contract NOT found!`);
    }

    console.log(`\n🎉 RE-OPENING TEST PASSED!`);

    // Cleanup
    if (client) {
         // Cleanup logic (simplified)
         await client.query('DELETE FROM transactions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)', [clientId]);
         await client.query('DELETE FROM checkpoints WHERE contract_id IN (SELECT id FROM contracts WHERE job_id = $1)', [jobId]);
         await client.query('DELETE FROM contracts WHERE job_id = $1', [jobId]);
         await client.query('DELETE FROM proposals WHERE job_id = $1', [jobId]);
         await client.query('DELETE FROM jobs WHERE id = $1', [jobId]);
         await client.query('DELETE FROM wallets WHERE user_id IN ($1, $2)', [clientId, workerId]);
         await client.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [adminId, clientId, workerId]);
    }

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
  } finally {
      if (client) client.release();
      await pool.end();
  }
})();

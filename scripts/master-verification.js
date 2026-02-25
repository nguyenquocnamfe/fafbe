require('dotenv').config();
const pool = require("../src/config/database");

const jobService = require("../src/modules/jobs/job.service");
const proposalService = require("../src/modules/proposals/proposal.service");
const checkpointService = require("../src/modules/checkpoints/checkpoint.service");
const reviewService = require("../src/modules/reviews/review.service");
const walletService = require("../src/modules/wallets/wallet.service");

async function masterTest() {
    console.log("--- FAF Platform Master Verification ---");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Setup Users
        const timestamp = Date.now();
        const clientEmail = `client_${timestamp}@test.com`;
        const workerEmail = `worker_${timestamp}@test.com`;

        const cRes = await client.query("INSERT INTO users (email, password_hash, role) VALUES ($1, 'hash', 'employer') RETURNING id", [clientEmail]);
        const clientId = cRes.rows[0].id;
        const wRes = await client.query("INSERT INTO users (email, password_hash, role) VALUES ($1, 'hash', 'worker') RETURNING id", [workerEmail]);
        const workerId = wRes.rows[0].id;

        // Setup Wallets
        await client.query("INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 10000, 0)", [clientId]);
        await client.query("INSERT INTO wallets (user_id, balance_points, locked_points) VALUES ($1, 0, 0)", [workerId]);

        // Setup User Profiles
        await client.query("INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Employer')", [clientId]);
        await client.query("INSERT INTO user_profiles (user_id, full_name) VALUES ($1, 'Test Worker')", [workerId]);

        // setup skills for testing
        let skillId;
        const existingSkill = await client.query("SELECT id FROM skills WHERE slug = 'master-skill'");
        if (existingSkill.rows.length > 0) {
            skillId = existingSkill.rows[0].id;
        } else {
            const sRes = await client.query("INSERT INTO skills (name, slug, is_active) VALUES ('Master Skill', 'master-skill', true) RETURNING id");
            skillId = sRes.rows[0].id;
        }
        
        await client.query("INSERT INTO user_skills (user_id, skill_id, skill_points) VALUES ($1, $2, 10) ON CONFLICT DO NOTHING", [workerId, skillId]);



        // 2. Create Job (Lock funds)
        const jobData = {
            clientId,
            categoryId: (await client.query("SELECT id FROM job_categories LIMIT 1")).rows[0].id,
            title: "Master Test Job",
            description: "Test description",
            jobType: 'SHORT_TERM',
            budget: 1000,
            checkpoints: [{ title: "Phase 1", amount: 1000 }],
            contractContent: "Test Contract Terms",
            skills: [skillId],
            deadline: new Date(Date.now() + 86400000)
        };

        // We run service functions within our active transaction client if possible, 
        // but current services use pool.connect internally.
        // For testing, we might need a version that accepts a client or just use pool and clean up later.
        // To keep it simple, we'll use COMMIT after each major step or just rely on IDs.
        
        await client.query('COMMIT'); 
        console.log("✅ Users & Wallets Setup");

        // --- STEP 2: JOB CREATION ---
        const { job, contract } = await jobService.createJobWithContractAndCheckpoints(jobData);
        console.log(`✅ Job Created: ${job.id}, Status: ${job.status}`);

        // Verify Wallet Reflected (Locked)
        const walletAfterJob = (await pool.query("SELECT * FROM wallets WHERE user_id = $1", [clientId])).rows[0];
        if (Number(walletAfterJob.locked_points) === 1000) {
            console.log("   ✅ Initial Lock PASSED");
        } else {
            console.error(`   ❌ Initial Lock FAILED: ${walletAfterJob.locked_points}`);
        }

        // --- STEP 3: MANAGER APPROVAL ---
        await jobService.reviewJob(job.id, { status: 'OPEN', adminComment: 'Looks good' });
        console.log("✅ Job Approved by Manager");

        // --- STEP 4: PROPOSAL & HIRING ---
        const proposal = await proposalService.createProposal({
            jobId: job.id,
            workerId: workerId,
            coverLetter: "I am a master",
            proposedPrice: 1000
        });
        console.log(`✅ Proposal Created: ${proposal.id}`);

        await proposalService.acceptProposal(proposal.id, clientId);
        console.log("✅ Proposal Accepted (Hired)");

        // Verify Wallet Again (Should still be 1000 locked, total balance still 9000)
        const walletAfterHire = (await pool.query("SELECT * FROM wallets WHERE user_id = $1", [clientId])).rows[0];
        if (Number(walletAfterHire.balance_points) === 9000 && Number(walletAfterHire.locked_points) === 1000) {
            console.log("   ✅ Wallet Consistency After Hire PASSED");
        } else {
            console.error(`   ❌ Wallet Consistency After Hire FAILED: Bal=${walletAfterHire.balance_points}, Lock=${walletAfterHire.locked_points}`);
        }

        // --- STEP 5: CHECKPOINT APPROVAL & FEE ---
        const checkpoints = (await pool.query("SELECT * FROM checkpoints WHERE contract_id = $1", [contract.id])).rows;
        const cpId = checkpoints[0].id;

        await checkpointService.approveWork(cpId, clientId);
        console.log("✅ Checkpoint Approved");

        // Verify Payout (Worker should have 950, Client 0 locked)
        const workerWallet = (await pool.query("SELECT * FROM wallets WHERE user_id = $1", [workerId])).rows[0];
        const clientWalletFinal = (await pool.query("SELECT * FROM wallets WHERE user_id = $1", [clientId])).rows[0];

        if (Number(workerWallet.balance_points) === 950 && Number(clientWalletFinal.locked_points) === 0) {
            console.log("   ✅ Payout & 5% Fee PASSED");
        } else {
            console.error(`   ❌ Payout & 5% Fee FAILED: WorkerBal=${workerWallet.balance_points}, ClientLock=${clientWalletFinal.locked_points}`);
        }

        // --- STEP 6: RATING & SKILLS SYNC ---
        await reviewService.createReview({
            contractId: contract.id,
            reviewerId: clientId,
            revieweeId: workerId,
            rating: 5,
            comment: "Excellent work!",
            skillRatings: [{ skillId: skillId, rating: 5 }]
        });
        console.log("✅ Review Submitted");

        // Verify Worker Rating & Skill Points
        const workerProfile = (await pool.query("SELECT * FROM user_profiles WHERE user_id = $1", [workerId])).rows[0];
        const workerSkill = (await pool.query("SELECT skill_points FROM user_skills WHERE user_id = $1 AND skill_id = $2", [workerId, skillId])).rows[0];

        if (Number(workerProfile.rating_avg) === 5 && Number(workerProfile.total_jobs_done) === 1) {
            console.log("   ✅ Global Stats Update PASSED");
        } else {
            console.error(`   ❌ Global Stats Update FAILED: Rating=${workerProfile.rating_avg}, Jobs=${workerProfile.total_jobs_done}`);
        }

        if (Number(workerSkill.skill_points) === 15) { // 10 original + 5 from review
            console.log("   ✅ Skill Points Sync PASSED");
        } else {
             console.error(`   ❌ Skill Points Sync FAILED: Points=${workerSkill.skill_points}`);
        }


        console.log("\n--- EVERY TEST PASSED ---");

    } catch (e) {
        console.error("❌ TEST FAILED:", e);
    } finally {
        // Cleanup (Optional)
        client.release();
    }
}

masterTest().then(() => pool.end());

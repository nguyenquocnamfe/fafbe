require('dotenv').config();
const pool = require("../src/config/database");

async function optimize() {
    console.log("--- FAF Database Optimization ---");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Adding indexes on Foreign Keys...");
        await client.query("CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_contracts_job_id ON contracts(job_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_contracts_worker_id ON contracts(worker_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_proposals_job_id ON proposals(job_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_proposals_worker_id ON proposals(worker_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_checkpoints_contract_id ON checkpoints(contract_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id)");

        console.log("Adding indexes on Status columns...");
        await client.query("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON checkpoints(status)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)");

        await client.query('COMMIT');
        console.log("✅ Database Optimization Complete");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Optimization failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

optimize();

require('dotenv').config();
const pool = require("../src/config/database");

async function setup() {
    console.log("--- FAF Database Schema Setup ---");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Adding 'tier' column to user_profiles...");
        await client.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'NEWBIE'");

        console.log("Adding 'portfolio_items' column to user_profiles...");
        await client.query("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'");

        await client.query('COMMIT');
        console.log("✅ Database Schema Setup Complete");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Setup failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

setup();

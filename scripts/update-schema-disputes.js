require('dotenv').config();
const pool = require('../src/config/database');

async function run() {
    const client = await pool.connect();
    try {
        console.log("🚀 Updating Database Schema for Disputes...");
        
        // Add attachments column if not exists
        await client.query(`
            ALTER TABLE dispute_messages 
            ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
        `);
        
        console.log("✓ Added 'attachments' column to 'dispute_messages'");
        
    } catch (e) {
        console.error("❌ Schema Update Failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

run();

require('dotenv').config();
const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../migrations/add_payos_fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Applying PayOS migration...');
        await pool.query(sql);
        console.log('✅ PayOS migration applied successfully');
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        pool.end();
    }
}

run();

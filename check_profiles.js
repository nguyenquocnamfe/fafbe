require('dotenv').config();
const pool = require('./src/config/database');

async function checkProfiles() {
    try {
        console.log('--- Checking Contracts and Associated Profiles ---');
        const contracts = await pool.query('SELECT id, client_id, worker_id FROM contracts');
        
        for (const contract of contracts.rows) {
            console.log(`Contract ID: ${contract.id}`);
            
            const clientProfile = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [contract.client_id]);
            console.log(`  Client (${contract.client_id}) Profile Exists: ${clientProfile.rows.length > 0}`);
            
            const workerProfile = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [contract.worker_id]);
            console.log(`  Worker (${contract.worker_id}) Profile Exists: ${workerProfile.rows.length > 0}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkProfiles();

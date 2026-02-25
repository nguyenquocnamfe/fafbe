const { Pool } = require('pg');
require('dotenv').config();
const sql = require('../src/modules/contracts/contract.sql');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const jobId = 56;
const workerId = 35;

(async () => {
  try {
    console.log(`Testing query for jobId: ${jobId}, workerId: ${workerId}`);
    const res = await pool.query(sql.getContractByJobAndWorker, [jobId, workerId]);
    console.log('Result found:', res.rows.length);
    if (res.rows.length > 0) {
        console.log('✅ Query successful!');
        console.log('Job Title:', res.rows[0].job_title);
        console.log('Start Date:', res.rows[0].job_start_date);
    } else {
        console.log('❌ No contract found (but query worked)');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error testing query:', err.message);
    process.exit(1);
  }
})();

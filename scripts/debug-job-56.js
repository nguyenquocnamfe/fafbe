const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const jobId = 56;

(async () => {
  try {
    console.log(`Checking contracts for jobId: ${jobId}`);
    const res = await pool.query('SELECT * FROM contracts WHERE job_id = $1', [jobId]);
    console.log('Contracts found:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));

    if (res.rows.length > 0) {
        const contractId = res.rows[0].id;
        console.log(`Checking checkpoints for contractId: ${contractId}`);
        const cpRes = await pool.query('SELECT * FROM checkpoints WHERE contract_id = $1', [contractId]);
        console.log('Checkpoints found:', cpRes.rows.length);
        console.log(JSON.stringify(cpRes.rows, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

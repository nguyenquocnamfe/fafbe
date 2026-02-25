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
    console.log(`Checking job data for jobId: ${jobId}`);
    const res = await pool.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    console.log(JSON.stringify(res.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();

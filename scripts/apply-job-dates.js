const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  try {
    console.log('Applying migration: add_job_dates.sql');
    await pool.query(`
        ALTER TABLE jobs 
        ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;
    `);
    console.log('✅ Migration applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    process.exit(1);
  }
})();

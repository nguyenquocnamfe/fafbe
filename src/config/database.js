const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If connectionString is missing, fallback to these:
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false // Render usually needs SSL
});

module.exports = pool;

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
    const res = await pool.query('SELECT NOW() as time');
    console.log('✅ Kết nối database thành công!');
    console.log('🕒 Thời gian DB:', res.rows[0].time);
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    process.exit(1);
  }
})();

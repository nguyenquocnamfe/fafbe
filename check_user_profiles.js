require('dotenv').config();
const pool = require('./src/config/database');

async function checkUserProfileSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles';
        `);
        console.log('Columns in "user_profiles" table:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type}) | Nullable: ${row.is_nullable}`);
        });
    } catch (err) {
        console.error('Error checking schema:', err.message);
    } finally {
        await pool.end();
    }
}

checkUserProfileSchema();

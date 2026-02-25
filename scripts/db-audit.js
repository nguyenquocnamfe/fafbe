require('dotenv').config();
const pool = require("../src/config/database");


async function audit() {
    console.log("--- FAF Database Audit ---");
    try {
        // 1. Check Indexes
        const indexRes = await pool.query(`
            SELECT tablename, indexname, indexdef 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        `);
        console.log("\n[Indexes Found]");
        console.table(indexRes.rows);

        // 2. Identify missing indexes (Foreign Keys usually)
        // Check for columns ending in _id that don't have indexes
        const missingRes = await pool.query(`
            SELECT 
                t.relname AS table_name, 
                a.attname AS column_name
            FROM pg_class t
            JOIN pg_attribute a ON a.attrelid = t.oid
            JOIN pg_type y ON y.oid = a.atttypid
            LEFT JOIN pg_index i ON i.indrelid = t.oid AND a.attnum = ANY(i.indkey)
            WHERE 
                t.relkind = 'r' 
                AND a.attname LIKE '%_id'
                AND i.indisprimary IS NOT TRUE
                AND i.indrelid IS NULL
                AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
            ORDER BY table_name;
        `);
        
        console.log("\n[Potential Missing Indexes on Foreign Keys]");
        console.table(missingRes.rows);

        // 3. Check for status columns without indexes
        const statusRes = await pool.query(`
             SELECT 
                t.relname AS table_name, 
                a.attname AS column_name
            FROM pg_class t
            JOIN pg_attribute a ON a.attrelid = t.oid
            LEFT JOIN pg_index i ON i.indrelid = t.oid AND a.attnum = ANY(i.indkey)
            WHERE 
                t.relkind = 'r' 
                AND a.attname = 'status'
                AND i.indrelid IS NULL
                AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `);
        console.log("\n[Potential Missing Indexes on Status Columns]");
        console.table(statusRes.rows);

    } catch (e) {
        console.error("Audit failed:", e);
    } finally {
        pool.end();
    }
}

audit();

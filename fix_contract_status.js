/**
 * One-time script: Update contracts that have both signatures 
 * but status was not updated to ACTIVE (data from before the fix)
 */
require('dotenv').config();
const pool = require('./src/config/database');

async function fixContractStatus() {
  try {
    const result = await pool.query(`
      UPDATE contracts 
      SET status = 'ACTIVE', updated_at = NOW()
      WHERE signature_worker IS NOT NULL 
        AND signature_client IS NOT NULL
        AND status NOT IN ('ACTIVE', 'COMPLETED', 'CANCELLED')
      RETURNING id, status
    `);
    
    console.log(`✅ Fixed ${result.rows.length} contracts:`);
    result.rows.forEach(r => console.log(`  - Contract ID: ${r.id} → status: ${r.status}`));
    
    if (result.rows.length === 0) {
      console.log('  (no contracts needed fixing)');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixContractStatus();

const pool = require("../../config/database");
const sql = require("./review.sql");
const moderationService = require("../../services/moderation.service");

exports.createReview = async ({ contractId, reviewerId, rating, comment }) => {
    const client = await pool.connect();
    try {
        // 1. Verify Contract exists and is completed
        const contractRes = await client.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        const contract = contractRes.rows[0];
        
        if (!contract) throw new Error("CONTRACT_NOT_FOUND");
        if (contract.status !== 'COMPLETED') throw new Error("CONTRACT_NOT_COMPLETED");
        
        // 2. Determine reviewee (the other party)
        let revieweeId;
        if (contract.client_id === reviewerId) {
            // Client reviewing Worker
            revieweeId = contract.worker_id;
        } else if (contract.worker_id === reviewerId) {
            // Worker reviewing Client
            const jobRes = await client.query('SELECT client_id FROM jobs WHERE id = $1', [contract.job_id]);
            revieweeId = jobRes.rows[0].client_id;
        } else {
            throw new Error("UNAUTHORIZED");
        }
        
        // 3. Check if already reviewed
        const existingRes = await client.query(sql.checkExisting, [contractId, reviewerId]);
        if (existingRes.rows.length > 0) throw new Error("ALREADY_REVIEWED");
        
        // 4. Moderate comment
        const moderationResult = await moderationService.moderateContent(comment || '');
        const moderationStatus = moderationService.getModerationStatus(moderationResult.approved);
        
        // 5. Create review
        const { rows } = await client.query(sql.create, [
            contractId,
            reviewerId,
            revieweeId,
            rating,
            comment,
            moderationStatus,
            JSON.stringify(moderationResult)
        ]);
        
        return rows[0];
        
    } finally {
        client.release();
    }
};

exports.getReviewsByUser = async (userId) => {
    const { rows } = await pool.query(sql.getByUser, [userId]);
    return rows;
};

exports.getReviewsByContract = async (contractId) => {
    const { rows } = await pool.query(sql.getByContract, [contractId]);
    return rows;
};

exports.getUserRating = async (userId) => {
    const { rows } = await pool.query(`
        SELECT 
            COUNT(*) as total_reviews,
            AVG(rating) as average_rating
        FROM reviews
        WHERE reviewee_id = $1 AND moderation_status = 'APPROVED'
    `, [userId]);
    
    return {
        totalReviews: parseInt(rows[0].total_reviews),
        averageRating: parseFloat(rows[0].average_rating) || 0
    };
};

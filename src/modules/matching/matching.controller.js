const s = require("./matching.service");

/**
 * Get recommended jobs for the authenticated worker
 */
exports.getRecommendedJobs = async (req, res) => {
    try {
        const workerId = req.user.id;
        console.log('🔍 getRecommendedJobs called for worker:', workerId);
        console.log('📋 Query params:', req.query);
        
        const { 
            categoryId, 
            jobType, 
            minBudget, 
            maxBudget, 
            minMatchScore,
            limit 
        } = req.query;

        const options = {
            categoryId: categoryId ? parseInt(categoryId) : undefined,
            jobType,
            minBudget: minBudget ? parseFloat(minBudget) : undefined,
            maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
            minMatchScore: minMatchScore ? parseInt(minMatchScore) : 0,
            limit: limit ? parseInt(limit) : 20
        };

        console.log('⚙️ Options:', options);

        const jobs = await s.getRecommendedJobs(workerId, options);
        
        console.log(`✅ Found ${jobs.length} jobs`);
        
        return res.json({
            message: "Job recommendations based on your skills",
            data: jobs
        });
        
    } catch (error) {
        console.error('❌ Error in getRecommendedJobs controller:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Get recommended workers for a specific job
 */
exports.getRecommendedWorkers = async (req, res) => {
    try {
        const { jobId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        // Verify job ownership
        const pool = require("../../config/database");
        const jobRes = await pool.query('SELECT client_id FROM jobs WHERE id = $1', [jobId]);
        
        if (jobRes.rows.length === 0) {
            return res.status(404).json({ message: "Job not found" });
        }
        
        if (jobRes.rows[0].client_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        const workers = await s.getRecommendedWorkers(jobId, limit);
        
        return res.json({
            message: "Worker recommendations based on job requirements",
            data: workers
        });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

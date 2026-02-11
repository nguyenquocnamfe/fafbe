const pool = require("../../config/database");

/**
 * Calculate skill match score between user skills and job skills
 * @param {Array<number>} userSkills - Array of skill IDs user has
 * @param {Array<number>} jobSkills - Array of skill IDs job requires
 * @returns {number} Match score (0-100)
 */
const calculateMatchScore = (userSkills, jobSkills) => {
    if (!jobSkills || jobSkills.length === 0) return 0;
    if (!userSkills || userSkills.length === 0) return 0;
    
    const matchingSkills = userSkills.filter(skill => jobSkills.includes(skill));
    const matchPercentage = (matchingSkills.length / jobSkills.length) * 100;
    
    return Math.round(matchPercentage);
};

/**
 * Get recommended jobs for a worker based on their skills with filtering
 * @param {number} workerId 
 * @param {object} options - Filter options
 * @returns {Promise<Array>}
 */
exports.getRecommendedJobs = async (workerId, options = {}) => {
    const {
        categoryId,
        jobType,
        minBudget,
        maxBudget,
        minMatchScore = 0,
        limit = 20
    } = options;

    const client = await pool.connect();
    try {
        // 1. Get user's skills
        const userSkillsRes = await client.query(`
            SELECT skill_id FROM user_skills WHERE user_id = $1
        `, [workerId]);
        
        const userSkills = userSkillsRes.rows.map(r => r.skill_id);
        
        console.log(`👤 Worker ${workerId} has ${userSkills.length} skills:`, userSkills);
        
        // Build dynamic WHERE conditions
        let whereConditions = [`j.status IN ('OPEN', 'PENDING')`];
        let queryParams = [workerId];
        let paramIndex = 2;

        if (categoryId) {
            whereConditions.push(`j.category_id = $${paramIndex}`);
            queryParams.push(categoryId);
            paramIndex++;
        }

        if (jobType) {
            whereConditions.push(`j.job_type = $${paramIndex}`);
            queryParams.push(jobType);
            paramIndex++;
        }

        if (minBudget) {
            whereConditions.push(`j.budget >= $${paramIndex}`);
            queryParams.push(minBudget);
            paramIndex++;
        }

        if (maxBudget) {
            whereConditions.push(`j.budget <= $${paramIndex}`);
            queryParams.push(maxBudget);
            paramIndex++;
        }

        // Add condition to exclude jobs user already applied to
        whereConditions.push(`NOT EXISTS (
            SELECT 1 FROM proposals p 
            WHERE p.job_id = j.id AND p.worker_id = $1
        )`);

        const whereClause = whereConditions.join(' AND ');
        
        console.log('🔍 WHERE clause:', whereClause);
        console.log('📊 Query params:', queryParams);
        
        // 2. Get all jobs with their skills
        const sqlQuery = `
            SELECT 
                   j.id,
                   j.client_id,
                   j.category_id,
                   j.title,
                   j.description,
                   j.job_type,
                   j.budget,
                   j.status,
                   j.created_at,
                   j.updated_at,
                   u.email as client_email,
                   c.name as category_name,
                   COALESCE(
                       json_agg(
                           jsonb_build_object(
                               'id', s.id,
                               'name', s.name,
                               'slug', s.slug
                           ) ORDER BY s.id
                       ) FILTER (WHERE s.id IS NOT NULL),
                       '[]'
                   ) AS skills,
                   ARRAY_AGG(s.id ORDER BY s.id) FILTER (WHERE s.id IS NOT NULL) as required_skills
            FROM jobs j
            LEFT JOIN users u ON j.client_id = u.id
            LEFT JOIN job_categories c ON j.category_id = c.id
            LEFT JOIN job_skills js ON j.id = js.job_id
            LEFT JOIN skills s ON s.id = js.skill_id
            WHERE ${whereClause}
            GROUP BY j.id, j.client_id, j.category_id, j.title, j.description, j.job_type, j.budget, j.status, j.created_at, j.updated_at, u.email, c.name
            ORDER BY j.created_at DESC
        `;
        
        console.log('📝 Executing SQL query...');
        const jobsRes = await client.query(sqlQuery, queryParams);
        
        console.log(`📦 Retrieved ${jobsRes.rows.length} jobs from database`);
        
        // 3. Calculate match score for each job
        const jobsWithScore = jobsRes.rows.map(job => {
            const jobSkills = job.required_skills || [];
            const matchScore = calculateMatchScore(userSkills, jobSkills);
            
            return {
                ...job,
                match_score: matchScore,
                matching_skills_count: userSkills.filter(s => jobSkills.includes(s)).length,
                total_required_skills: jobSkills.length
            };
        });
        
        // 4. Filter by minimum match score and sort
        const filteredJobs = jobsWithScore
            .filter(job => job.match_score >= minMatchScore)
            .sort((a, b) => {
                // Primary sort: match score (descending)
                if (b.match_score !== a.match_score) {
                    return b.match_score - a.match_score;
                }
                // Secondary sort: created_at (newest first)
                return new Date(b.created_at) - new Date(a.created_at);
            })
            .slice(0, limit);
        
        console.log(`✅ Returning ${filteredJobs.length} jobs after filtering and scoring`);
        
        return filteredJobs;
        
    } catch (error) {
        console.error('❌ Error in getRecommendedJobs service:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Get recommended workers for a job based on required skills
 * @param {number} jobId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
exports.getRecommendedWorkers = async (jobId, limit = 10) => {
    const client = await pool.connect();
    try {
        // 1. Get job's required skills
        const jobSkillsRes = await client.query(`
            SELECT skill_id FROM job_skills WHERE job_id = $1
        `, [jobId]);
        
        const jobSkills = jobSkillsRes.rows.map(r => r.skill_id);
        
        if (jobSkills.length === 0) {
            return []; // No required skills, can't recommend
        }
        
        // 2. Get all freelancers with their skills and reviews
        const workersRes = await client.query(`
            SELECT DISTINCT u.id, u.email,
                   up.full_name, up.bio, up.hourly_rate,
                   ARRAY_AGG(DISTINCT us.skill_id) FILTER (WHERE us.skill_id IS NOT NULL) as user_skills,
                   COUNT(DISTINCT r.id) as total_reviews,
                   COALESCE(AVG(r.rating), 0) as average_rating
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN user_skills us ON u.id = us.user_id
            LEFT JOIN reviews r ON u.id = r.reviewee_id AND r.moderation_status = 'APPROVED'
            WHERE u.role = 'worker' 
              AND u.email_verified = true
              AND NOT EXISTS (
                  SELECT 1 FROM contracts c 
                  WHERE c.worker_id = u.id AND c.status = 'ACTIVE'
              )
            GROUP BY u.id, u.email, up.full_name, up.bio, up.hourly_rate
        `);
        
        // 3. Calculate match score for each worker
        const workersWithScore = workersRes.rows.map(worker => {
            const userSkills = worker.user_skills || [];
            const matchScore = calculateMatchScore(userSkills, jobSkills);
            
            // Bonus points for high ratings
            const ratingBonus = worker.total_reviews > 0 ? (worker.average_rating / 5) * 10 : 0;
            const finalScore = Math.min(100, matchScore + ratingBonus);
            
            return {
                id: worker.id,
                email: worker.email,
                full_name: worker.full_name,
                bio: worker.bio,
                hourly_rate: worker.hourly_rate,
                match_score: Math.round(finalScore),
                skill_match_score: matchScore,
                matching_skills_count: userSkills.filter(s => jobSkills.includes(s)).length,
                total_required_skills: jobSkills.length,
                total_reviews: parseInt(worker.total_reviews),
                average_rating: parseFloat(worker.average_rating).toFixed(2)
            };
        });
        
        // 4. Sort by match score (highest first) and limit
        const sortedWorkers = workersWithScore
            .filter(worker => worker.skill_match_score > 0) // Only workers with matching skills
            .sort((a, b) => b.match_score - a.match_score)
            .slice(0, limit);
        
        return sortedWorkers;
        
    } finally {
        client.release();
    }
};

const s = require("./review.service");

exports.create = async (req, res) => {
    try {
        const { contractId, rating, comment } = req.body;
        const reviewerId = req.user.id;
        
        if (!contractId || !rating) {
            return res.status(400).json({ message: "contractId and rating are required" });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        
        const result = await s.createReview({ contractId, reviewerId, rating, comment });
        
        if (result.moderation_status === 'REJECTED') {
            return res.status(400).json({ 
                message: "Review contains inappropriate content and has been rejected",
                data: result
            });
        }
        
        return res.status(201).json({ 
            message: "Review created successfully", 
            data: result 
        });
        
    } catch (error) {
        console.error(error);
        if (error.message === 'CONTRACT_NOT_FOUND') return res.status(404).json({ message: "Contract not found" });
        if (error.message === 'CONTRACT_NOT_COMPLETED') return res.status(400).json({ message: "Contract must be completed before reviewing" });
        if (error.message === 'UNAUTHORIZED') return res.status(403).json({ message: "You are not part of this contract" });
        if (error.message === 'ALREADY_REVIEWED') return res.status(400).json({ message: "You have already reviewed this contract" });
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const reviews = await s.getReviewsByUser(userId);
        const rating = await s.getUserRating(userId);
        
        return res.json({ 
            data: reviews,
            summary: rating
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.getByContract = async (req, res) => {
    try {
        const { contractId } = req.params;
        const reviews = await s.getReviewsByContract(contractId);
        return res.json({ data: reviews });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

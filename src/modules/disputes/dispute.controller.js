const s = require("./dispute.service");

exports.create = async (req, res) => {
    try {
        const { contractId, reason } = req.body;
        const result = await s.createDispute({ contractId, userId: req.user.id, reason });
        
        // Notify Admin? (Optional)
        
        return res.status(201).json({ message: "Dispute raised", data: result });
    } catch (e) {
        console.error(e);
        if (e.message === "UNAUTHORIZED") return res.status(403).json({ message: "Unauthorized"});
        if (e.message === "CONTRACT_NOT_FOUND") return res.status(404).json({ message: "Contract not found"});
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.get = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await s.getDispute(id, req.user.id);
        if (!result) return res.status(404).json({ message: "Dispute not found" });
        return res.json({ data: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.addMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, attachments } = req.body;
        const result = await s.addMessage({ disputeId: id, userId: req.user.id, message, attachments });
        return res.json({ message: "Message sent", data: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.resolve = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: "Unauthorized. Admin only." });
        }

        const { id } = req.params;
        const { resolution } = req.body; // CLIENT_WINS or WORKER_WINS
        
        if (!['CLIENT_WINS', 'WORKER_WINS'].includes(resolution)) {
            return res.status(400).json({ message: "Invalid resolution. Must be CLIENT_WINS or WORKER_WINS" });
        }
        
        const io = req.app.get('io');
        const result = await s.resolveDispute({ 
            disputeId: id, 
            resolution, 
            adminId: req.user.id,
            io
        });
        
        return res.json({ message: "Dispute resolved", data: result });
    } catch (e) {
        console.error(e);
        if (e.message === "DISPUTE_NOT_FOUND") return res.status(404).json({ message: "Dispute not found" });
        return res.status(500).json({ message: "Internal server error" });
    }
};

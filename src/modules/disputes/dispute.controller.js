const s = require("./dispute.service");
const chatService = require("../chat/chat.service");

exports.create = async (req, res) => {
    try {
        const { contractId, reason } = req.body;
        const result = await s.createDispute({ contractId, userId: req.user.id, reason });
        
        // Notify other party + Admin
        try {
            const notificationService = require('../notifications/notification.service');
            const { getContractById } = require('../contracts/contract.service');
            const contract = await getContractById(contractId);
            const otherPartyId = (req.user.id === contract.client_id) ? contract.worker_id : contract.client_id;
            const io = req.app.get('io');

            await notificationService.createNotification({
                userId: otherPartyId,
                type: 'DISPUTE_RAISED',
                title: 'Tranh chấp hợp đồng',
                message: `Đối tác đã mở tranh chấp cho hợp đồng #${contractId}. Vui lòng kiểm tra và gửi phản hồi.`,
                data: { disputeId: result.id, contractId },
                io
            });

            // Send System Message to Chat
            try {
                const conv = await chatService.getOrCreateConversation(contract.client_id, contract.worker_id);
                await chatService.sendSystemMessage(conv.id, `⚖️ [Hệ thống] Một tranh chấp đã được mở cho hợp đồng #${contractId}. Vui lòng kiểm tra chat Dispute.`, io);
            } catch (chatErr) {
                console.error("Failed to send system message for dispute:", chatErr);
            }
        } catch (notifyErr) {
            console.error("Failed to notify about dispute creation:", notifyErr);
        }

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
        const isManagerOrAdmin = ['ADMIN', 'manager'].includes(req.user.role);
        
        // If manager/admin, we might need a bypass in service or use a different service method
        // For now, let's see if the service allows it.
        const result = await s.getDispute(id, req.user.id);
        
        if (!result && isManagerOrAdmin) {
            // If not found as participant, try fetching as admin (no user check)
            const adminResult = await s.getDisputeAdmin(id);
            if (adminResult) return res.json({ data: adminResult });
        }

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
        if (req.user.role !== 'ADMIN' && req.user.role !== 'manager') {
            return res.status(403).json({ message: "Unauthorized. Manager/Admin only." });
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

        // Send System Message to Chat
        try {
            const { getContractById } = require('../contracts/contract.service');
            const contract = await getContractById(result.contract_id);
            const conv = await chatService.getOrCreateConversation(contract.client_id, contract.worker_id);
            const winner = resolution === 'CLIENT_WINS' ? 'Chủ dự án' : 'Worker';
            await chatService.sendSystemMessage(conv.id, `⚖️ [Hệ thống] Tranh chấp cho hợp đồng #${result.contract_id} đã được phân xử: **${winner} thắng**.`, io);
        } catch (chatErr) {
            console.error("Failed to send resolution message:", chatErr);
        }

        return res.json({ message: "Dispute resolved", data: result });
    } catch (e) {
        console.error(e);
        if (e.message === "DISPUTE_NOT_FOUND") return res.status(404).json({ message: "Dispute not found" });
        return res.status(500).json({ message: "Internal server error" });
    }
};

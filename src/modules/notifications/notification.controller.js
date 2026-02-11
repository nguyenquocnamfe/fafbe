const s = require("./notification.service");

exports.list = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const result = await s.getUserNotifications(req.user.id, parseInt(limit), parseInt(offset));
        return res.json({ data: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.markRead = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await s.markAsRead(id, req.user.id);
        if (!result) return res.status(404).json({ message: "Notification not found" });
        return res.json({ message: "Marked as read", data: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        const result = await s.markAllAsRead(req.user.id);
        return res.json({ message: "All marked as read", data: result });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
};

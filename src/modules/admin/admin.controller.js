const s = require("./admin.service");
const notificationService = require('../notifications/notification.service');
const { getJobById } = require('../jobs/job.service');

exports.getPendingJobs = async (req, res) => {
  try {
    const jobs = await s.getPendingJobs();
    return res.json({ data: jobs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.approveJob = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await s.approveJob(id); // output: job object
    if (!result) return res.status(404).json({ message: "Job not found" });
    
    // Notify Client
    const io = req.app.get('io');
    await notificationService.createNotification({
        userId: result.client_id,
        type: 'JOB_APPROVED',
        title: 'Job Approved',
        message: `Your job "${result.title}" has been approved and is now Open.`,
        data: { jobId: result.id },
        io
    });
    
    return res.json({ message: "Job approved", data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.rejectJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) return res.status(400).json({ message: "Rejection reason is required" });
    
    const result = await s.rejectJob(id, reason);
    if (!result) return res.status(404).json({ message: "Job not found" });
    
    // Notify Client
    const io = req.app.get('io');
    await notificationService.createNotification({
        userId: result.client_id,
        type: 'JOB_REJECTED',
        title: 'Job Rejected',
        message: `Your job "${result.title}" was rejected. Reason: ${reason}`,
        data: { jobId: result.id },
        io
    });
    
    return res.json({ message: "Job rejected", data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await s.getStats();
    return res.json({ data: stats });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getFinancialOverview = async (req, res) => {
  try {
    const financials = await s.getFinancials();
    return res.json({ data: financials });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.listAllUsers = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await s.listUsers({ 
      page: Number(page) || 1, 
      limit: Number(limit) || 10 
    });
    return res.json({ data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateUserRoleHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['employer', 'worker', 'manager', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await s.updateUserRole(id, role);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "User role updated successfully", data: user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


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

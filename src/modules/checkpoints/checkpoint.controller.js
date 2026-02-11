const s = require("./checkpoint.service");

exports.submit = async (req, res) => {
  try {
    const { id } = req.params; // Checkpoint ID
    const { submissionData } = req.body;
    const workerId = req.user.id;

    if (!submissionData) return res.status(400).json({ message: "submissionData required" });

    const result = await s.submitWork({ checkpointId: id, workerId, submissionData });
    return res.json({ message: "Work submitted", data: result });

  } catch (error) {
    console.error(error);
    if (error.message === 'UNAUTHORIZED') return res.status(403).json({ message: "Unauthorized" });
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await s.approveWork(id, req.user.id);
    return res.json(result);
  } catch (error) {
    console.error(error);
    if (error.message === 'UNAUTHORIZED') return res.status(403).json({ message: "Unauthorized" });
    if (error.message === 'ALREADY_APPROVED') return res.status(400).json({ message: "Already approved" });
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await s.rejectWork(id, req.user.id);
    return res.json({ message: "Work rejected", data: result });
  } catch (error) {
    console.error(error);
    if (error.message === 'UNAUTHORIZED') return res.status(403).json({ message: "Unauthorized" });
    return res.status(500).json({ message: "Internal server error" });
  }
};

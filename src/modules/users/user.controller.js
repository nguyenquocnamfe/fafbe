const s = require('./user.service');

exports.me = async (req, res) => {
  const profile = await s.getMyProfile(req.user.id);
  res.json(profile);
};

exports.updateMe = async (req, res) => {
  const profile = await s.updateProfile(req.user.id, req.body);
  res.json(profile);
};

exports.listUsers = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);

  const result = await s.listUsers(page, limit);
  res.json(result);
};

exports.getFeaturedWorkers = async (req, res) => {
  const limit = Number(req.query.limit || 10);
  const workers = await s.getFeaturedWorkers(limit);
  res.json(workers);
};

exports.getPublicProfile = async (req, res) => {
  const profile = await s.getPublicProfile(req.params.id);
  if (!profile) return res.status(404).json({ message: "User not found" });
  res.json({ data: profile });
};

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

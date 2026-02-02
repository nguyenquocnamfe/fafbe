
const service = require('./userSkill.service');

exports.getMySkills = async (req, res) => {
  const skills = await service.getUserSkills(req.user.id);
  res.json({ data: skills });
};

exports.addSkill = async (req, res) => {
  const { skillId } = req.body;

  if (!skillId) {
    return res.status(400).json({ message: 'skillId is required' });
  }

  await service.addSkillToUser(req.user.id, skillId);
  res.status(201).json({ message: 'Skill added' });
};

exports.removeSkill = async (req, res) => {
  const { skillId } = req.params;

  await service.removeSkillFromUser(req.user.id, skillId);
  res.json({ message: 'Skill removed' });
};

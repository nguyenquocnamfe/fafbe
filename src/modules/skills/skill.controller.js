const skillService = require('./skill.service');

exports.getAll = async (req, res) => {
  const skills = await skillService.getAllActiveSkills();
  res.json({ data: skills });
};

exports.create = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  const skill = await skillService.createSkill(name);
  res.status(201).json({ data: skill });
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const skill = await skillService.updateSkill(id, name);
  res.json({ data: skill });
};

exports.deactivate = async (req, res) => {
  const { id } = req.params;
  await skillService.deactivateSkill(id);
  res.json({ message: 'Skill deactivated' });
};

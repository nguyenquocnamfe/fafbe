const service = require('./jobSkill.service');

exports.getJobSkills = async (req, res) => {
  const { jobId } = req.params;
  const skills = await service.getJobSkills(jobId);
  res.json({ data: skills });
};

exports.addSkill = async (req, res) => {
  const { jobId } = req.params;
  const { skillId } = req.body;

  if (!skillId) {
    return res.status(400).json({ message: 'skillId is required' });
  }

  await service.addSkillToJob(jobId, skillId);
  res.status(201).json({ message: 'Skill added to job' });
};

exports.removeSkill = async (req, res) => {
  const { jobId, skillId } = req.params;
  await service.removeSkillFromJob(jobId, skillId);
  res.json({ message: 'Skill removed from job' });
};

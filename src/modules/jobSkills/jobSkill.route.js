const express = require('express');
const router = express.Router();
const controller = require('./jobSkill.controller');
const auth = require('../../middlewares/auth.middleware');

// Public
router.get('/:jobId', controller.getJobSkills);

// Chỉ client (owner) mới sửa
router.post('/:jobId', auth, controller.addSkill);
router.delete('/:jobId/:skillId', auth, controller.removeSkill);

module.exports = router;

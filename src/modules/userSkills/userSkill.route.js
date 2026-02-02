const express = require('express');
const router = express.Router();
const controller = require('./userSkill.controller');
const auth = require('../../middlewares/auth.middleware');

router.use(auth);

router.get('/', controller.getMySkills);
router.post('/', controller.addSkill);
router.delete('/:skillId', controller.removeSkill);

module.exports = router;

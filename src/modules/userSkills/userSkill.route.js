const express = require('express');
const router = express.Router();
const controller = require('./userSkill.controller');
const auth = require('../../middlewares/auth.middleware');

router.use(auth);


/**
 * @swagger
 * tags:
 *   name: UserSkills
 *   description: Manage user skills
 */

/**
 * @swagger
 * /api/user-skills:
 *   get:
 *     summary: Get my skills
 *     tags: [UserSkills]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of my skills
 *   post:
 *     summary: Add a skill to my profile
 *     tags: [UserSkills]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - skillId
 *             properties:
 *               skillId:
 *                 type: integer
 *               level:
 *                 type: string
 *               yearsOfExperience:
 *                 type: number
 *     responses:
 *       201:
 *         description: Skill added
 */
router.get('/', controller.getMySkills);
router.post('/', controller.addSkill);

/**
 * @swagger
 * /api/user-skills/{skillId}:
 *   delete:
 *     summary: Remove a skill from my profile
 *     tags: [UserSkills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Skill removed where
 */
router.delete('/:skillId', controller.removeSkill);

module.exports = router;

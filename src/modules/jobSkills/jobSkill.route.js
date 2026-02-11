const express = require('express');
const router = express.Router();
const controller = require('./jobSkill.controller');
const auth = require('../../middlewares/auth.middleware');

// Public

/**
 * @swagger
 * tags:
 *   name: JobSkills
 *   description: Manage skills required for a job
 */

/**
 * @swagger
 * /api/job-skills/{jobId}:
 *   get:
 *     summary: Get skills for a job
 *     tags: [JobSkills]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of skills
 *   post:
 *     summary: Add a skill to a job
 *     tags: [JobSkills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
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
 *               isRequired:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Skill added
 */
router.get('/:jobId', controller.getJobSkills);
router.post('/:jobId', auth, controller.addSkill);

/**
 * @swagger
 * /api/job-skills/{jobId}/{skillId}:
 *   delete:
 *     summary: Remove a skill from a job
 *     tags: [JobSkills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: skillId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Skill removed
 */
router.delete('/:jobId/:skillId', auth, controller.removeSkill);

module.exports = router;

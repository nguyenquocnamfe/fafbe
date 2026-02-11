const express = require('express');
const router = express.Router();
const controller = require('./checkpoint.controller');
const auth = require('../../middlewares/auth.middleware');


/**
 * @swagger
 * tags:
 *   name: Checkpoints
 *   description: Milestone/Checkpoint management
 */

/**
 * @swagger
 * /api/checkpoints/{id}/submit:
 *   post:
 *     summary: Submit work for a checkpoint
 *     tags: [Checkpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer

 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               submission_url:
 *                 type: string
 *               submission_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work submitted
 */
router.post('/:id/submit', auth, controller.submit);

/**
 * @swagger
 * /api/checkpoints/{id}/approve:
 *   put:
 *     summary: Approve work (Release funds)
 *     tags: [Checkpoints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               review_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work approved and funds released
 */
router.put('/:id/approve', auth, controller.approve);

/**
 * @swagger
 * /api/checkpoints/{id}/reject:
 *   put:
 *     summary: Reject work
 *     tags: [Checkpoints]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               review_notes:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work rejected
 */
router.put('/:id/reject', auth, controller.reject);

module.exports = router;

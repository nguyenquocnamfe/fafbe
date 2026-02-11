const express = require('express');
const router = express.Router();
const controller = require('./dispute.controller');
const auth = require('../../middlewares/auth.middleware');


/**
 * @swagger
 * tags:
 *   name: Disputes
 *   description: Dispute resolution
 */

/**
 * @swagger
 * /api/disputes:
 *   post:
 *     summary: Create a dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object

 *             required:
 *               - contractId
 *               - reason
 *             properties:
 *               contractId:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dispute created
 */
router.post('/', auth, controller.create);

/**
 * @swagger
 * /api/disputes/{id}:
 *   get:
 *     summary: Get dispute details
 *     tags: [Disputes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dispute details
 */
router.get('/:id', auth, controller.get);

/**
 * @swagger
 * /api/disputes/{id}/messages:
 *   post:
 *     summary: Add message/evidence to dispute
 *     tags: [Disputes]
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
 *               message:
 *                 type: string
 *               attachments:
 *                 type: array
 *     responses:
 *       201:
 *         description: Message added
 */
router.post('/:id/messages', auth, controller.addMessage);

/**
 * @swagger
 * /api/disputes/{id}/resolve:
 *   post:
 *     summary: Resolve dispute (Admin)
 *     tags: [Disputes]
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

 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [WORKER_WINS, CLIENT_WINS]
 *     responses:
 *       200:
 *         description: Dispute resolved
 */
router.post('/:id/resolve', auth, controller.resolve); // Admin check inside controller

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('./proposal.controller');
const auth = require('../../middlewares/auth.middleware');


/**
 * @swagger
 * tags:
 *   name: Proposals
 *   description: Job proposals
 */

/**
 * @swagger
 * /api/proposals:
 *   post:
 *     summary: Submit a proposal
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true

 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobId
 *               - coverLetter
 *               - proposedPrice
 *             properties:
 *               jobId:
 *                 type: integer
 *               coverLetter:
 *                 type: string
 *               proposedPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Proposal submitted
 *   get:
 *     summary: List proposals
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: integer
 *         description: Filter by Job ID (Client only)
 *     responses:
 *       200:
 *         description: List of proposals
 */
// Apply to a job (Worker)
router.post('/', auth, controller.create);

// List proposals (Client: by jobId, Worker: own history)
router.get('/', auth, controller.list);

/**
 * @swagger
 * /api/proposals/{id}/accept:
 *   put:
 *     summary: Accept a proposal (Client)
 *     tags: [Proposals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Proposal accepted & Contract created
 */
// Client Accept/Reject
router.put('/:id/accept', auth, controller.accept);
router.put('/:id/reject', auth, controller.reject);

module.exports = router;

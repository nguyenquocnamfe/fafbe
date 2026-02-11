const express = require('express');
const router = express.Router();
const controller = require('./contract.controller');
const auth = require('../../middlewares/auth.middleware');


/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Contract management
 */

/**
 * @swagger
 * /api/contracts/active/me:
 *   get:
 *     summary: Get worker's active contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active contract details
 */
router.get('/active/me', auth, controller.getMyActiveContract);

/**
 * @swagger
 * /api/contracts/my:
 *   get:
 *     summary: Get all my contracts
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contracts
 */
router.get('/my', auth, controller.getMyContracts);

/**
 * @swagger
 * /api/contracts/job/{jobId}:
 *   get:
 *     summary: Get contract by Job ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract details
 */
router.get('/job/:jobId', auth, controller.getContractByJob);

/**
 * @swagger
 * /api/contracts/{id}:
 *   get:
 *     summary: Get contract details
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contract details
 */
router.get('/:id', auth, controller.get);

/**
 * @swagger
 * /api/contracts/{id}/sign:
 *   post:
 *     summary: Sign a contract
 *     tags: [Contracts]
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
 *         description: Contract signed
 */
router.post('/:id/sign', auth, controller.sign);

/**
 * @swagger
 * /api/contracts/{id}/terminate:
 *   put:
 *     summary: Terminate a contract
 *     tags: [Contracts]
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
 *         description: Contract terminated
 */
router.put('/:id/terminate', auth, controller.terminateContract);

// Legacy/Duplicate Checkpoint routes (Consider favoring /api/checkpoints)
router.put('/checkpoints/:id/submit', auth, controller.submitCheckpoint);
router.put('/checkpoints/:id/approve', auth, controller.approveCheckpoint);
router.put('/checkpoints/:id/reject', auth, controller.rejectCheckpoint);

// Settlement
router.post('/:id/settle-request', auth, controller.requestSettlement);
router.post('/:id/finalize-settlement', auth, controller.finalizeSettlement);

module.exports = router;

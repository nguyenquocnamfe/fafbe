const express = require('express');
const router = express.Router();
const controller = require('./review.controller');
const auth = require('../../middlewares/auth.middleware');


/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Reputation management
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review (Post-contract)
 *     tags: [Reviews]
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
 *               - rating
 *             properties:
 *               contractId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created
 */
router.post('/', auth, controller.create);

/**
 * @swagger
 * /api/reviews/user/{userId}:
 *   get:
 *     summary: Get reviews for a user
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/user/:userId', controller.getByUser); // Public

/**
 * @swagger
 * /api/reviews/contract/{contractId}:
 *   get:
 *     summary: Get reviews for a specific contract
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of reviews
 */
router.get('/contract/:contractId', auth, controller.getByContract);

module.exports = router;

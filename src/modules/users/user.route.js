const r = require('express').Router();
const c = require('./user.controller');
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');


/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               bio:
 *                 type: string
 *               hourlyRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profile updated
 */
r.get('/me', auth, c.me);
r.put('/me', auth, c.updateMe);

/**
 * @swagger
 * /api/users/featured:
 *   get:
 *     summary: Get featured workers
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of featured workers
 */
r.get('/featured', auth, c.getFeaturedWorkers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get public profile of a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User public profile
 */
r.get('/:id', auth, c.getPublicProfile);


/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of users
 */
// admin only
r.get('/', auth, role(['ADMIN']), c.listUsers);

module.exports = r;

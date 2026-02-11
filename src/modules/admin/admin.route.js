const express = require('express');
const router = express.Router();
const controller = require('./admin.controller');
const auth = require('../../middlewares/auth.middleware');

// Middleware to check if user is admin is NOT yet implemented in auth.middleware, 
// so we'll do a simple check here or update auth middleware.
// For now let's assume we check req.user.role in controller or here.

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: "Admin access required" });
    }
};


/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative actions
 */

/**
 * @swagger
 * /api/admin/jobs/pending:
 *   get:
 *     summary: List pending jobs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending jobs
 */
router.get('/jobs/pending', auth, isAdmin, controller.getPendingJobs);

/**
 * @swagger
 * /api/admin/jobs/{id}/approve:
 *   put:
 *     summary: Approve a job
 *     tags: [Admin]
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
 *         description: Job approved
 */
router.put('/jobs/:id/approve', auth, isAdmin, controller.approveJob);

/**
 * @swagger
 * /api/admin/jobs/{id}/reject:
 *   put:
 *     summary: Reject a job
 *     tags: [Admin]
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
 *         description: Job rejected
 */
router.put('/jobs/:id/reject', auth, isAdmin, controller.rejectJob);

module.exports = router;

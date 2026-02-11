// src/modules/jobs/job.route.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth.middleware'); // chỉnh đúng path file
const { createJob, getListJobs, getJob, updateJobHandler, deleteJobHandler } = require('./job.controller');


/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job management
 */

/**
 * @swagger
 * /api/jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object

 *             required:
 *               - title
 *               - description
 *               - budget
 *               - jobType
 *               - categoryId
 *               - checkpoints
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               jobType:
 *                 type: string
 *                 enum: [SHORT_TERM, LONG_TERM]
 *               budget:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               skills:
 *                 type: array
 *                 items:
 *                   type: integer
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               deadline:
 *                 type: string
 *                 format: date
 *               contractContent:
 *                 type: string
 *               checkpoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - title
 *                     - amount
 *                   properties:
 *                     title:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     due_date:
 *                       type: string
 *                       format: date
 *     responses:
 *       201:
 *         description: Job created
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: List all jobs
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.post('/', authMiddleware, createJob);
router.get('/', authMiddleware, getListJobs);

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:id', authMiddleware, getJob);

router.put('/:id', authMiddleware, updateJobHandler);
router.delete('/:id', authMiddleware, deleteJobHandler);

module.exports = router;
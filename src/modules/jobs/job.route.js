// src/modules/jobs/job.route.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth.middleware'); // chỉnh đúng path file
const { createJob, getListJobs, getJob, updateJobHandler, deleteJobHandler } = require('./job.controller');

router.post('/', authMiddleware, createJob);
router.get('/', authMiddleware, getListJobs);
router.get('/:id', authMiddleware, getJob);
router.put('/:id', authMiddleware, updateJobHandler);
router.delete('/:id', authMiddleware, deleteJobHandler);

module.exports = router;
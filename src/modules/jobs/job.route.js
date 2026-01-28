// src/modules/jobs/job.route.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth.middleware'); // chỉnh đúng path file
const { createJob } = require('./job.controller');

router.post('/', authMiddleware, createJob);

module.exports = router;
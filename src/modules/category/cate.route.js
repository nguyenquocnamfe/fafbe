// src/modules/category/cate.route.js
const express = require('express');
const router = express.Router();
const cateController = require('./cate.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public – FE load dropdown
router.get('/', cateController.listCategories);

// Admin only (sau này gắn middleware)
router.post('/',authMiddleware, cateController.createCategory);

module.exports = router;

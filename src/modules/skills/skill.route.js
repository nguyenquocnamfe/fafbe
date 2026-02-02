const express = require('express');
const router = express.Router();
const controller = require('./skill.controller');
const auth = require('../../middlewares/auth.middleware');

// PUBLIC – FE dùng
router.get('/', controller.getAll);

// ADMIN
router.post('/', auth, controller.create);
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, controller.deactivate);

module.exports = router;

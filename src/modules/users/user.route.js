const r = require('express').Router();
const c = require('./user.controller');
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');

r.get('/me', auth, c.me);
r.put('/me', auth, c.updateMe);

// admin only
r.get('/', auth, role(['ADMIN']), c.listUsers);

module.exports = r;

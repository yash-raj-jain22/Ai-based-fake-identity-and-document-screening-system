const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

// All admin routes require authentication
router.use(authenticate);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/system', adminController.getSystemTelemetry);

module.exports = router;

const express = require('express');
const router = express.Router();
const systemController = require('./system.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/settings', systemController.getSettings);
router.put('/settings', systemController.updateSettings);

module.exports = router;

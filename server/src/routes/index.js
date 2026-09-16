const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const systemRoutes = require('../modules/system/system.routes');
const screeningRoutes = require('../modules/screening/screening.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/system', systemRoutes);
router.use('/screenings', screeningRoutes);

module.exports = router;

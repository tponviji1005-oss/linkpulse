const express = require('express');

const authRoutes = require('./auth');
const linkRoutes = require('./link');
const dashboardRoutes = require('./dashboard');
const analyticsRoutes = require('./analytics');
const bulkRoutes = require('./bulk');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/links', linkRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/bulk', bulkRoutes);

module.exports = router;

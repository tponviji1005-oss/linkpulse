const express = require('express');
const { getAdvancedAnalytics } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:id', auth, getAdvancedAnalytics);

module.exports = router;

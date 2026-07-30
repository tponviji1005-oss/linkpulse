const express = require('express');
const { getAdvancedAnalytics, getOverview, getTimeline, getDevices, getBrowsers, getOS, getReferrers } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/:linkId/overview', auth, getOverview);
router.get('/:linkId/timeline', auth, getTimeline);
router.get('/:linkId/devices', auth, getDevices);
router.get('/:linkId/browsers', auth, getBrowsers);
router.get('/:linkId/os', auth, getOS);
router.get('/:linkId/referrers', auth, getReferrers);
router.get('/:id', auth, getAdvancedAnalytics);

module.exports = router;

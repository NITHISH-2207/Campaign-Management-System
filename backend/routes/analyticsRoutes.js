const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

router.get('/dashboard', authMiddleware, analyticsController.getDashboardData);
router.get('/realtime', authMiddleware, analyticsController.getRealtimeActivity);
router.get('/survey-impact/:campaignId', authMiddleware, analyticsController.getSurveyImpact);

module.exports = router;

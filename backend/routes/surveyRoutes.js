// backend/routes/surveyRoutes.js
const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// IMPORTANT: Put all specific routes BEFORE parameterized routes

// Specific routes first
router.get('/user/available', authMiddleware, surveyController.getUserSurveys);
router.get('/campaign/:campaignId', authMiddleware, surveyController.getCampaignSurveys);
router.get('/impact/:campaignId', authMiddleware, roleCheck(['campaign_manager', 'admin']), surveyController.getImpactReport);

// Add recent-responses route if it exists in your controller
// router.get('/recent-responses', authMiddleware, surveyController.getRecentResponses);

// General routes
router.get('/', authMiddleware, surveyController.getSurveys);
router.post('/create', authMiddleware, roleCheck(['campaign_manager', 'admin']), surveyController.createSurvey);

// IMPORTANT: Put ID-based routes LAST to avoid conflicts
router.get('/:surveyId/results', authMiddleware, roleCheck(['campaign_manager', 'admin']), surveyController.getSurveyResults);
router.post('/:surveyId/response', authMiddleware, surveyController.submitSurvey);
router.get('/:surveyId', authMiddleware, surveyController.getSurveyById); // This MUST be last

module.exports = router;

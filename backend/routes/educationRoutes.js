const express = require('express');
const router = express.Router();
const educationController = require('../controllers/educationController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes (for authenticated users)
router.get('/modules', authMiddleware, educationController.getModules);
router.get('/modules/:moduleId', authMiddleware, educationController.getModuleById);
router.get('/user-progress', authMiddleware, educationController.getUserProgress);

// Campaign manager only routes
router.post('/modules', authMiddleware, roleCheck(['campaign_manager', 'admin']), educationController.createModule);
router.put('/modules/:moduleId', authMiddleware, roleCheck(['campaign_manager', 'admin']), educationController.updateModule);
router.delete('/modules/:moduleId', authMiddleware, roleCheck(['campaign_manager', 'admin']), educationController.deleteModule);
router.get('/modules/:moduleId/stats', authMiddleware, roleCheck(['campaign_manager', 'admin']), educationController.getModuleStats);

// Quiz routes
router.post('/modules/:moduleId/quiz', authMiddleware, roleCheck(['campaign_manager', 'admin']), educationController.createQuiz);
router.get('/modules/:moduleId/quiz', authMiddleware, educationController.getQuiz);
router.post('/quiz/:quizId/submit', authMiddleware, educationController.submitQuiz);

// User progress routes
router.post('/modules/:moduleId/start', authMiddleware, educationController.startModule);
router.post('/modules/:moduleId/complete', authMiddleware, educationController.completeModule);
router.post('/modules/:moduleId/progress', authMiddleware, educationController.updateProgress);

module.exports = router;

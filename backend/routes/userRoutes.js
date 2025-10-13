// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Get user dashboard data
router.get('/dashboard', authMiddleware, userController.getDashboardData);

module.exports = router;


// backend/routes/locationRoutes.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Reverse geocode route
router.post('/reverse-geocode', locationController.reverseGeocode);

module.exports = router;

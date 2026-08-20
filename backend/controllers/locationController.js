// backend/controllers/locationController.js
const locationService = require('../services/locationService');

/**
 * Handles reverse geocoding request from frontend.
 * POST /api/location/reverse-geocode
 * Body: { latitude, longitude }
 */
exports.reverseGeocode = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required.'
            });
        }

        const location = await locationService.reverseGeocode(latitude, longitude);

        return res.json({
            success: true,
            location: location
        });
    } catch (error) {
        console.error('📍 Reverse Geocoding Error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to detect location.'
        });
    }
};

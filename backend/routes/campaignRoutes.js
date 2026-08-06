// backend/routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const { campaignController, upload } = require('../controllers/campaignController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Important: Place specific routes BEFORE parameterized routes

// Get campaign statistics
router.get('/stats', authMiddleware, campaignController.getCampaignStats);

// Get full manager dashboard statistics & data
router.get('/manager/dashboard', authMiddleware, campaignController.getManagerDashboard);

// Get user's joined campaigns
router.get('/my-joined', authMiddleware, campaignController.getUserJoinedCampaigns);

// Get user's campaigns (for dropdown in create post)
router.get('/my-campaigns', authMiddleware, campaignController.getMyCampaigns);

// Get all active campaigns
router.get('/active', authMiddleware, campaignController.getAllActiveCampaigns);

// Get all campaigns (with filters)
router.get('/', authMiddleware, campaignController.getAllCampaigns);

// Create new campaign
router.post('/create', 
    authMiddleware,
    upload.single('campaignImage'),
    campaignController.createCampaign
);

// Join a campaign
router.post('/:campaignId/join', authMiddleware, campaignController.joinCampaign);

// Leave a campaign
router.post('/:campaignId/leave', authMiddleware, campaignController.leaveCampaign);

// Approve/Reject campaign (admin only)
router.put('/:campaignId/approve', 
    authMiddleware, 
    roleCheck(['admin']), 
    campaignController.approveCampaign
);
// Add this temporary route for debugging
router.get('/debug-status', authMiddleware, async (req, res) => {
    try {
        const campaigns = await Campaign.find().select('title status createdAt');
        const stats = {
            total: campaigns.length,
            active: campaigns.filter(c => c.status === 'active').length,
            pending: campaigns.filter(c => c.status === 'pending').length,
            campaigns: campaigns
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add this route for testing notifications
router.post('/test-notification/:campaignId', 
    authMiddleware, 
    roleCheck(['admin', 'campaign_manager']), 
    async (req, res) => {
        try {
            const result = await require('../services/notificationScheduler')
                .triggerTestNotification(req.params.campaignId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);
// Test email notification route
router.post('/test-notification', authMiddleware, async (req, res) => {
    try {
        const emailService = require('../services/emailService');
        
        // Get the current user
        const user = await User.findById(req.user.id);
        
        // Create a test campaign
        const testCampaign = {
            title: 'Test Campaign Notification',
            description: 'This is a test email to verify the notification system',
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            location: 'Online',
            category: 'Technology',
            type: 'Online',
            managerId: user._id
        };
        
        // Send test email
        const result = await emailService.sendCampaignReminderEmail(user, testCampaign);
        
        res.json({
            success: result.success,
            message: result.success ? 'Test email sent successfully!' : 'Failed to send email',
            details: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Check notification scheduler status
router.get('/notification-status', authMiddleware, async (req, res) => {
    const notificationScheduler = require('../services/notificationScheduler');
    
    // Check tomorrow's campaigns
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const campaigns = await notificationScheduler.checkCampaignsForDate(tomorrow);
    
    res.json({
        emailServiceConfigured: !!emailService.transporter,
        schedulerRunning: notificationScheduler.scheduledJobs.size > 0,
        campaignsStartingTomorrow: campaigns.length,
        campaigns: campaigns.map(c => ({
            title: c.title,
            startDate: c.startDate,
            managerId: c.managerId
        }))
    });
});



module.exports = router;

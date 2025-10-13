// backend/controllers/campaignController.js
const Campaign = require('../models/Campaign');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for campaign images
const uploadPath = path.join(__dirname, '..', 'uploads', 'campaigns');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'campaign-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

const campaignController = {
    // Create new campaign
    // Update the createCampaign method in campaignController
createCampaign: async (req, res) => {
    try {
        console.log('Creating campaign with data:', req.body);
        console.log('User creating campaign:', req.user);
        
        // Ensure participants is initialized
        const campaignData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            type: req.body.type,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
            location: req.body.location,
            targetAudience: req.body.targetAudience,
            goals: req.body.goals,
            actionPlan: req.body.actionPlan,
            expectedImpact: req.body.expectedImpact,
            managerId: req.user.id || req.user._id,
            contactInfo: {
                email: req.body.contactEmail,
                phone: req.body.contactPhone,
                website: req.body.website,
                socialMedia: req.body.socialMedia
            },
            media: {
                imageUrl: req.file ? `/uploads/campaigns/${req.file.filename}` : null,
                videoUrl: req.body.videoUrl
            },
            hashtags: req.body.hashtags ? req.body.hashtags.split(' ').filter(tag => tag.startsWith('#')) : [],
            resources: req.body.resources ? req.body.resources.split(',').map(r => r.trim()) : [],
            status: 'active', // Explicitly set to active
            approvedAt: new Date(),
            metrics: {
                totalPosts: 0,
                totalEngagement: 0,
                totalParticipants: 0
            },
            participants: [] // Initialize empty participants array
        };

        console.log('Campaign data before save:', campaignData);

        const newCampaign = new Campaign(campaignData);
        await newCampaign.save();
        
        // Verify the saved status
        console.log('Saved campaign status:', newCampaign.status);

        await newCampaign.populate('managerId', 'name email');

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully and is now active!',
            campaign: newCampaign
        });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create campaign',
            error: error.message
        });
    }
},


    // Get all campaigns
    getAllCampaigns: async (req, res) => {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            let query = {};
            
            if (status) {
                query.status = status;
            }

            const campaigns = await Campaign.find(query)
                .populate('managerId', 'name email')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Campaign.countDocuments(query);

            res.json({
                success: true,
                campaigns,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaigns',
                error: error.message
            });
        }
    },

    // Get campaigns for current user
    getMyCampaigns: async (req, res) => {
        try {
            const campaigns = await Campaign.find({
                $or: [
                    { managerId: req.user.id },
                    { status: 'active' }
                ]
            }).select('_id title status createdAt');
            
            res.json(campaigns);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch campaigns' });
        }
    },

    // Approve campaign (admin only)
    approveCampaign: async (req, res) => {
        try {
            const { campaignId } = req.params;
            const { approved, feedback } = req.body;

            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            campaign.status = approved ? 'active' : 'rejected';
            campaign.approvalFeedback = feedback;
            campaign.approvedAt = approved ? new Date() : null;
            
            await campaign.save();

            res.json({
                success: true,
                message: `Campaign ${approved ? 'approved' : 'rejected'} successfully`,
                campaign
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign status',
                error: error.message
            });
        }
    },

    // Get all active campaigns with pagination and filters
    getAllActiveCampaigns: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 9, 
                category, 
                type, 
                sort = 'recent',
                search 
            } = req.query;
            
            let query = { status: 'active' };
            
            // Apply filters
            if (category) query.category = category;
            if (type) query.type = type;
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            // Determine sort order
            let sortQuery = {};
            switch(sort) {
                case 'popular':
                    sortQuery = { 'metrics.totalParticipants': -1 };
                    break;
                case 'ending':
                    sortQuery = { endDate: 1 };
                    break;
                case 'recent':
                default:
                    sortQuery = { createdAt: -1 };
            }

            const campaigns = await Campaign.find(query)
                .populate('managerId', 'name email')
                .sort(sortQuery)
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Campaign.countDocuments(query);

            res.json({
                success: true,
                campaigns,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaigns',
                error: error.message
            });
        }
    },

    // Join a campaign
    // Update the joinCampaign method in campaignController.js
joinCampaign: async (req, res) => {
    try {
        const { campaignId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if user is a campaign manager
        if (userRole === 'campaign_manager') {
            return res.status(403).json({
                success: false,
                message: 'Campaign managers cannot join campaigns'
            });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        // Check if the user is the campaign manager/owner
        if (campaign.managerId.toString() === userId) {
            return res.status(403).json({
                success: false,
                message: 'You cannot join your own campaign'
            });
        }

        if (campaign.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'This campaign is not active'
            });
        }

        // Initialize participants array if it doesn't exist
        if (!campaign.participants) {
            campaign.participants = [];
        }

        // Check if already joined
        if (campaign.participants.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: 'You have already joined this campaign'
            });
        }

        // Add user to campaign
        campaign.participants.push(userId);
        campaign.metrics.totalParticipants = campaign.participants.length;
        await campaign.save();

        res.json({
            success: true,
            message: 'Successfully joined the campaign'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to join campaign',
            error: error.message
        });
    }
},

    // Leave a campaign
    leaveCampaign: async (req, res) => {
        try {
            const { campaignId } = req.params;
            const userId = req.user.id;

            const campaign = await Campaign.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            // Remove user from campaign
            if (!campaign.participants) {
                campaign.participants = [];
            }

            campaign.participants = campaign.participants.filter(
                participant => participant.toString() !== userId
            );
            campaign.metrics.totalParticipants = campaign.participants.length;
            await campaign.save();

            res.json({
                success: true,
                message: 'Successfully left the campaign'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to leave campaign',
                error: error.message
            });
        }
    },

    // Get user's joined campaigns
    getUserJoinedCampaigns: async (req, res) => {
        try {
            const userId = req.user.id;

            const campaigns = await Campaign.find({
                participants: userId,
                status: 'active'
            }).select('_id title status');

            res.json({
                success: true,
                campaigns: campaigns || []
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch joined campaigns',
                error: error.message
            });
        }
    },

    // Get campaign statistics
    getCampaignStats: async (req, res) => {
        try {
            const totalActive = await Campaign.countDocuments({ status: 'active' });
            const allCampaigns = await Campaign.find({ status: 'active' });
            
            const totalParticipants = allCampaigns.reduce((sum, campaign) => {
                return sum + (campaign.metrics?.totalParticipants || 0);
            }, 0);
            
            const totalImpact = allCampaigns.reduce((sum, campaign) => {
                return sum + (campaign.metrics?.totalEngagement || 0);
            }, 0) * 10; // Estimated people impacted

            res.json({
                success: true,
                totalActive,
                totalParticipants,
                totalImpact
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign statistics',
                error: error.message
            });
        }
    }
};

module.exports = { campaignController, upload };

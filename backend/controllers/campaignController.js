// backend/controllers/campaignController.js
const Campaign = require('../models/Campaign');
const Post = require('../models/Post');
const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');
const Education = require('../models/Education');
const UserProgress = require('../models/UserProgress');
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
    },

    // Get full campaign manager dashboard data (only real MongoDB data for logged in manager)
    getManagerDashboard: async (req, res) => {
        try {
            const managerId = req.user.id || req.user._id;

            // 1. Fetch campaigns created by this particular manager
            const managerCampaigns = await Campaign.find({ managerId })
                .sort({ createdAt: -1 })
                .lean();

            const managerCampaignIds = managerCampaigns.map(c => c._id);

            // 2. Fetch stats per campaign and compute aggregate metrics
            let totalPostsCount = 0;
            let totalEngagementCount = 0;
            const uniqueParticipantsSet = new Set();

            // Collect manager campaigns with per-campaign stats
            const campaignsWithStats = await Promise.all(managerCampaigns.map(async (campaign) => {
                const campaignId = campaign._id;

                // Count posts belonging to this campaign
                const postCount = await Post.countDocuments({ campaignId });
                totalPostsCount += postCount;

                // Aggregate post engagement for this campaign
                const campaignPosts = await Post.find({ campaignId }).lean();
                let campaignEngagement = 0;
                campaignPosts.forEach(p => {
                    const likes = p.engagement?.likes || 0;
                    const comments = p.engagement?.comments || 0;
                    const shares = p.engagement?.shares || 0;
                    const views = p.engagement?.views || 0;
                    campaignEngagement += (likes + comments + shares + views);
                });
                totalEngagementCount += campaignEngagement;

                // Collect participants
                if (Array.isArray(campaign.participants)) {
                    campaign.participants.forEach(pId => uniqueParticipantsSet.add(pId.toString()));
                }

                // Count surveys belonging to this campaign
                const surveyCount = await Survey.countDocuments({ campaign: campaignId });

                // Count modules created by manager matching campaign category (or all created by manager if category matches)
                const moduleCount = await Education.countDocuments({
                    createdBy: managerId,
                    category: campaign.category
                });

                return {
                    _id: campaign._id,
                    title: campaign.title,
                    category: campaign.category,
                    description: campaign.description,
                    status: campaign.status,
                    stats: {
                        posts: postCount,
                        engagement: campaignEngagement,
                        surveys: surveyCount,
                        modules: moduleCount
                    }
                };
            }));

            // 3. Aggregate manager performance stats
            // Also include posts directly authored by manager if any personal/general posts
            const managerDirectPosts = await Post.find({ authorId: managerId, campaignId: { $exists: false } }).lean();
            managerDirectPosts.forEach(p => {
                const likes = p.engagement?.likes || 0;
                const comments = p.engagement?.comments || 0;
                const shares = p.engagement?.shares || 0;
                const views = p.engagement?.views || 0;
                totalEngagementCount += (likes + comments + shares + views);
            });

            // Total Surveys created by manager or in manager's campaigns
            const managerSurveys = await Survey.find({
                $or: [
                    { createdBy: managerId },
                    { campaign: { $in: managerCampaignIds } }
                ]
            }).select('_id title').lean();

            const managerSurveyIds = managerSurveys.map(s => s._id);

            // Total Survey Responses for manager's surveys
            const surveyResponsesCount = await SurveyResponse.countDocuments({
                $or: [
                    { survey: { $in: managerSurveyIds } },
                    { campaign: { $in: managerCampaignIds } }
                ]
            });

            // Total Education Modules created by manager
            const managerModules = await Education.find({ createdBy: managerId }).select('_id title').lean();
            const managerModuleIds = managerModules.map(m => m._id);

            // Total Module Completions for manager's modules
            const moduleCompletionsCount = await UserProgress.countDocuments({
                moduleId: { $in: managerModuleIds },
                status: 'completed'
            });

            // 4. Fetch Recent Activity
            // Recent Posts (top 5 for manager's campaigns or authored by manager)
            const recentPostsRaw = await Post.find({
                $or: [
                    { campaignId: { $in: managerCampaignIds } },
                    { authorId: managerId }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

            const recentPosts = recentPostsRaw.map(post => ({
                _id: post._id,
                title: post.title,
                engagement: {
                    likes: post.engagement?.likes || 0,
                    comments: post.engagement?.comments || 0
                },
                createdAt: post.createdAt
            }));

            // Recent Survey Responses summary per manager survey
            const recentSurveys = await Promise.all(managerSurveys.map(async (survey) => {
                const responseCount = await SurveyResponse.countDocuments({ survey: survey._id });
                const lastResponseDoc = await SurveyResponse.findOne({ survey: survey._id })
                    .sort({ completedAt: -1 })
                    .select('completedAt')
                    .lean();

                return {
                    surveyTitle: survey.title,
                    responseCount: responseCount,
                    lastResponse: lastResponseDoc ? lastResponseDoc.completedAt : null
                };
            }));

            // Recent Module Completions summary per manager module
            const moduleCompletions = await Promise.all(managerModules.map(async (module) => {
                const completionCount = await UserProgress.countDocuments({
                    moduleId: module._id,
                    status: 'completed'
                });

                // Calculate average quiz score if any
                const completionsWithQuiz = await UserProgress.find({
                    moduleId: module._id,
                    quizScore: { $exists: true, $ne: null }
                }).select('quizScore').lean();

                let averageScore = 0;
                if (completionsWithQuiz.length > 0) {
                    const totalScore = completionsWithQuiz.reduce((sum, c) => sum + (c.quizScore || 0), 0);
                    averageScore = Math.round(totalScore / completionsWithQuiz.length);
                }

                return {
                    moduleTitle: module.title,
                    completionCount: completionCount,
                    averageScore: averageScore
                };
            }));

            res.json({
                success: true,
                stats: {
                    totalEngagement: totalEngagementCount,
                    activeUsers: uniqueParticipantsSet.size,
                    surveyResponses: surveyResponsesCount,
                    moduleCompletions: moduleCompletionsCount
                },
                campaigns: campaignsWithStats,
                recentActivity: {
                    recentPosts,
                    recentSurveys: recentSurveys.filter(s => s.responseCount > 0 || s.lastResponse !== null),
                    moduleCompletions
                }
            });
        } catch (error) {
            console.error('Error loading manager dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load manager dashboard data',
                error: error.message
            });
        }
    }
};

module.exports = { campaignController, upload };

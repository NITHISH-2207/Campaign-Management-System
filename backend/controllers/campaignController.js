// backend/controllers/campaignController.js
const Campaign = require('../models/Campaign');
const Post = require('../models/Post');
const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');
const Education = require('../models/Education');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User');

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
        
        const managerId = req.user.id || req.user._id;
        let campaign = null;

        // If campaignId is provided (submitting an existing draft)
        if (req.body.campaignId) {
            campaign = await Campaign.findById(req.body.campaignId);
            if (campaign) {
                if (req.user.role !== 'admin' && campaign.managerId.toString() !== managerId.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You can only submit your own campaign.'
                    });
                }
            }
        }

        const campaignData = {
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            type: req.body.type,
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            location: req.body.location,
            targetAudience: req.body.targetAudience,
            goals: req.body.goals,
            actionPlan: req.body.actionPlan,
            expectedImpact: req.body.expectedImpact,
            managerId: managerId,
            contactInfo: {
                email: req.body.contactEmail,
                phone: req.body.contactPhone,
                website: req.body.website,
                socialMedia: req.body.socialMedia
            },
            media: {
                imageUrl: req.file ? `/uploads/campaigns/${req.file.filename}` : (campaign?.media?.imageUrl || null),
                videoUrl: req.body.videoUrl
            },
            hashtags: req.body.hashtags ? req.body.hashtags.split(' ').filter(tag => tag.startsWith('#')) : [],
            resources: req.body.resources ? req.body.resources.split(',').map(r => r.trim()) : [],
            status: 'pending', // Save/update status as pending for admin approval
            approvedAt: null,
            updatedAt: Date.now()
        };

        if (campaign) {
            // Update existing draft document to pending status
            Object.assign(campaign, campaignData);
            await campaign.save();
        } else {
            // Create new campaign document
            campaign = new Campaign({
                ...campaignData,
                metrics: {
                    totalPosts: 0,
                    totalEngagement: 0,
                    totalParticipants: 0
                },
                participants: []
            });
            await campaign.save();
        }

        console.log('Saved campaign status:', campaign.status);
        await campaign.populate('managerId', 'name email');

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully! Your campaign is pending admin approval.',
            campaign: campaign
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

    // Save campaign as draft (create new draft or update existing draft)
    saveDraft: async (req, res) => {
        try {
            console.log('Saving campaign draft with data:', req.body);
            const managerId = req.user.id || req.user._id;
            const campaignId = req.body.campaignId;

            let campaign = null;
            if (campaignId) {
                campaign = await Campaign.findById(campaignId);
                if (!campaign) {
                    return res.status(404).json({
                        success: false,
                        message: 'Draft campaign not found'
                    });
                }

                if (req.user.role !== 'admin' && campaign.managerId.toString() !== managerId.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You can only edit your own draft.'
                    });
                }
            } else {
                campaign = new Campaign({
                    managerId: managerId,
                    status: 'draft',
                    metrics: {
                        totalPosts: 0,
                        totalEngagement: 0,
                        totalParticipants: 0
                    },
                    participants: []
                });
            }

            // Always enforce status = draft when saving as draft
            campaign.status = 'draft';

            // Assign fields if provided
            if (req.body.title !== undefined) campaign.title = req.body.title.trim();
            if (req.body.description !== undefined) campaign.description = req.body.description;
            if (req.body.category) campaign.category = req.body.category;
            if (req.body.type) campaign.type = req.body.type;
            if (req.body.startDate) campaign.startDate = new Date(req.body.startDate);
            if (req.body.endDate) campaign.endDate = new Date(req.body.endDate);
            if (req.body.location !== undefined) campaign.location = req.body.location;
            if (req.body.targetAudience) campaign.targetAudience = req.body.targetAudience;
            if (req.body.goals !== undefined) campaign.goals = req.body.goals;
            if (req.body.actionPlan !== undefined) campaign.actionPlan = req.body.actionPlan;
            if (req.body.expectedImpact !== undefined) campaign.expectedImpact = req.body.expectedImpact;

            if (req.body.contactEmail !== undefined || req.body.contactPhone !== undefined) {
                campaign.contactInfo = {
                    ...campaign.contactInfo,
                    email: req.body.contactEmail || campaign.contactInfo?.email || undefined,
                    phone: req.body.contactPhone || campaign.contactInfo?.phone,
                    website: req.body.website || campaign.contactInfo?.website,
                    socialMedia: req.body.socialMedia || campaign.contactInfo?.socialMedia
                };
            }

            if (req.file) {
                campaign.media = {
                    ...campaign.media,
                    imageUrl: `/uploads/campaigns/${req.file.filename}`
                };
            }
            if (req.body.videoUrl !== undefined) {
                campaign.media = {
                    ...campaign.media,
                    videoUrl: req.body.videoUrl
                };
            }

            if (req.body.hashtags !== undefined) {
                campaign.hashtags = req.body.hashtags
                    ? req.body.hashtags.split(' ').filter(tag => tag.startsWith('#'))
                    : [];
            }

            if (req.body.resources !== undefined) {
                campaign.resources = req.body.resources
                    ? req.body.resources.split(',').map(r => r.trim())
                    : [];
            }

            campaign.updatedAt = Date.now();

            await campaign.save();
            await campaign.populate('managerId', 'name email');

            res.status(200).json({
                success: true,
                message: 'Campaign saved as draft.',
                campaignId: campaign._id,
                campaign
            });
        } catch (error) {
            console.error('Error saving draft campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save campaign draft',
                error: error.message
            });
        }
    },

    // Get single campaign by ID
    getCampaignById: async (req, res) => {
        try {
            const campaign = await Campaign.findById(req.params.campaignId)
                .populate('managerId', 'name email');

            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            res.json({
                success: true,
                campaign
            });
        } catch (error) {
            console.error('Error fetching campaign details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign details',
                error: error.message
            });
        }
    },

    // Update existing campaign
    updateCampaign: async (req, res) => {
        try {
            const { campaignId } = req.params;
            const campaign = await Campaign.findById(campaignId);

            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            // Verify manager authorization (only campaign owner manager or admin can update)
            const userId = (req.user.id || req.user._id).toString();
            const managerId = campaign.managerId.toString();

            if (req.user.role !== 'admin' && managerId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only edit campaigns you created.'
                });
            }

            // Update editable fields
            if (req.body.title) campaign.title = req.body.title.trim();
            if (req.body.description) campaign.description = req.body.description;
            if (req.body.category) campaign.category = req.body.category;
            if (req.body.type) campaign.type = req.body.type;
            if (req.body.startDate) campaign.startDate = new Date(req.body.startDate);
            if (req.body.endDate) campaign.endDate = new Date(req.body.endDate);
            if (req.body.location) campaign.location = req.body.location;
            if (req.body.targetAudience) campaign.targetAudience = req.body.targetAudience;
            if (req.body.goals) campaign.goals = req.body.goals;
            if (req.body.actionPlan) campaign.actionPlan = req.body.actionPlan;
            if (req.body.expectedImpact) campaign.expectedImpact = req.body.expectedImpact;

            if (req.body.contactEmail || req.body.contactPhone) {
                campaign.contactInfo = {
                    ...campaign.contactInfo,
                    email: req.body.contactEmail || campaign.contactInfo?.email,
                    phone: req.body.contactPhone || campaign.contactInfo?.phone
                };
            }

            if (req.file) {
                campaign.media = {
                    ...campaign.media,
                    imageUrl: `/uploads/campaigns/${req.file.filename}`
                };
            }
            if (req.body.videoUrl !== undefined) {
                campaign.media = {
                    ...campaign.media,
                    videoUrl: req.body.videoUrl
                };
            }

            if (req.body.hashtags !== undefined) {
                campaign.hashtags = req.body.hashtags
                    ? req.body.hashtags.split(' ').filter(tag => tag.startsWith('#'))
                    : [];
            }

            campaign.updatedAt = Date.now();

            await campaign.save();
            await campaign.populate('managerId', 'name email');

            res.json({
                success: true,
                message: 'Campaign updated successfully!',
                campaign
            });
        } catch (error) {
            console.error('Error updating campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update campaign',
                error: error.message
            });
        }
    },

    // Delete existing campaign (permanently removes campaign document from MongoDB)
    deleteCampaign: async (req, res) => {
        try {
            const { campaignId } = req.params;
            const campaign = await Campaign.findById(campaignId);

            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }

            // Verify manager authorization (only campaign owner manager or admin can delete)
            const userId = (req.user.id || req.user._id).toString();
            const managerId = campaign.managerId.toString();

            if (req.user.role !== 'admin' && managerId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete campaigns you created.'
                });
            }

            // Permanently delete the campaign document from MongoDB
            await Campaign.findByIdAndDelete(campaignId);

            res.json({
                success: true,
                message: 'Campaign deleted successfully.'
            });
        } catch (error) {
            console.error('Error deleting campaign:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete campaign',
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

            campaign.status = approved ? 'approved' : 'rejected';
            campaign.approvalFeedback = feedback || '';
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
            
            let query = { status: { $in: ['approved', 'active'] } };
            
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

        if (!['approved', 'active'].includes(campaign.status)) {
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
                status: { $in: ['approved', 'active'] }
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
            const totalActive = await Campaign.countDocuments({ status: { $in: ['approved', 'active'] } });
            const allCampaigns = await Campaign.find({ status: { $in: ['approved', 'active'] } });
            
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
                    ...campaign,
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
    },

    // Admin Dashboard Overview metrics
    getAdminOverview: async (req, res) => {
        try {
            const totalCampaigns = await Campaign.countDocuments({});
            const pendingCampaigns = await Campaign.countDocuments({ status: 'pending' });
            const approvedCampaigns = await Campaign.countDocuments({ status: { $in: ['approved', 'active'] } });
            const rejectedCampaigns = await Campaign.countDocuments({ status: 'rejected' });
            const totalParticipants = await User.countDocuments({ role: { $in: ['participant', 'user'] } });
            const totalManagers = await User.countDocuments({ role: 'campaign_manager' });

            res.json({
                success: true,
                stats: {
                    totalCampaigns,
                    pendingCampaigns,
                    approvedCampaigns,
                    rejectedCampaigns,
                    totalParticipants,
                    totalManagers
                }
            });
        } catch (error) {
            console.error('Error fetching admin overview:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admin overview',
                error: error.message
            });
        }
    },

    // Get campaigns for Admin (by status)
    getAdminCampaigns: async (req, res) => {
        try {
            const { status = 'all', page = 1, limit = 50 } = req.query;
            let query = {};

            if (status && status !== 'all') {
                if (status === 'approved') {
                    query.status = { $in: ['approved', 'active'] };
                } else {
                    query.status = status;
                }
            }

            const campaigns = await Campaign.find(query)
                .populate('managerId', 'name email organization phone')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Campaign.countDocuments(query);

            res.json({
                success: true,
                campaigns,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page)
            });
        } catch (error) {
            console.error('Error fetching admin campaigns:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch admin campaigns',
                error: error.message
            });
        }
    }
};

module.exports = { campaignController, upload };

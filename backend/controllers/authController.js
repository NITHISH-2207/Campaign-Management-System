const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Post = require('../models/Post');
const SurveyResponse = require('../models/SurveyResponse');
const UserProgress = require('../models/UserProgress');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};

exports.register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            phone,
            location,
            organization,
            bio,
            interests,
            emailUpdates
        } = req.body;

        // Prevent public creation of Admin accounts
        if (role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin accounts cannot be created publicly.'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists. Please use a different email or sign in.'
            });
        }

        // Create new user with all fields
        const user = new User({
            name,
            email,
            password,
            role: role || 'participant',
            phone: phone || '',
            location: location || '',
            organization: organization || '',
            bio: bio || '',
            interests: interests || [],
            emailUpdates: emailUpdates || false
        });

        await user.save();

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                location: user.location,
                organization: user.organization,
                bio: user.bio,
                interests: user.interests,
                emailUpdates: user.emailUpdates
            }
        });
    } catch (error) {
        console.error('Registration error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred during registration. Please try again.'
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password'
            });
        }

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        // Remove password from user object
        const userObject = user.toObject();
        delete userObject.password;

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                location: user.location,
                organization: user.organization,
                bio: user.bio,
                interests: user.interests,
                emailUpdates: user.emailUpdates,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login. Please try again.'
        });
    }
};

// Get current user profile with real database stats
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userId = user._id;

        // Count posts created by user
        const postsCount = await Post.countDocuments({ authorId: userId });

        // Count campaigns joined or managed by user
        const campaignsJoinedCount = await Campaign.countDocuments({
            $or: [
                { participants: userId },
                { managerId: userId }
            ]
        });

        // Get user's campaigns to evaluate Eco Warrior badge
        const userCampaigns = await Campaign.find({
            $or: [
                { participants: userId },
                { managerId: userId }
            ]
        });

        const hasEcoCampaign = userCampaigns.some(c =>
            c.category && ['climate', 'environment', 'social', 'poverty'].includes(c.category.toLowerCase())
        );

        // Get recent campaigns joined or managed by user
        const recentCampaigns = await Campaign.find({
            $or: [
                { participants: userId },
                { managerId: userId }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category location startDate endDate status createdAt');

        // Calculate impact points and views
        const userPosts = await Post.find({ authorId: userId });
        const postEngagement = userPosts.reduce((sum, p) => {
            return sum + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0);
        }, 0);
        const postViews = userPosts.reduce((sum, p) => {
            return sum + (p.engagement?.views || 0);
        }, 0);

        const surveyResponsesCount = await SurveyResponse.countDocuments({ userId });
        const userProgressCount = await UserProgress.countDocuments({ userId, completed: true });

        const impactScore = postsCount * 10 + postEngagement * 5 + campaignsJoinedCount * 20 + surveyResponsesCount * 15;

        // Build list of all badges dynamically
        const allBadges = [
            {
                id: 'changemaker',
                name: 'Changemaker',
                description: 'Awarded for reaching 100+ impact points.',
                icon: 'fas fa-star',
                color: 'warning',
                earned: impactScore >= 100,
                earnedDate: impactScore >= 100 ? user.createdAt : null
            },
            {
                id: 'impact_creator',
                name: 'Impact Creator',
                description: 'Awarded for reaching 500+ impact points.',
                icon: 'fas fa-fire',
                color: 'danger',
                earned: impactScore >= 500,
                earnedDate: impactScore >= 500 ? new Date() : null
            },
            {
                id: 'champion',
                name: 'Champion',
                description: 'Awarded for reaching 1000+ impact points.',
                icon: 'fas fa-trophy',
                color: 'primary',
                earned: impactScore >= 1000,
                earnedDate: impactScore >= 1000 ? new Date() : null
            },
            {
                id: 'storyteller',
                name: 'Storyteller',
                description: 'Published 5 or more community posts.',
                icon: 'fas fa-pen',
                color: 'info',
                earned: postsCount >= 5,
                earnedDate: postsCount >= 5 ? new Date() : null
            },
            {
                id: 'activist',
                name: 'Activist',
                description: 'Joined or managed 3 or more social campaigns.',
                icon: 'fas fa-fist-raised',
                color: 'success',
                earned: campaignsJoinedCount >= 3,
                earnedDate: campaignsJoinedCount >= 3 ? new Date() : null
            },
            {
                id: 'eco_warrior',
                name: 'Eco Warrior',
                description: 'Contributed to environmental or social campaigns.',
                icon: 'fas fa-seedling',
                color: 'success',
                earned: hasEcoCampaign,
                earnedDate: hasEcoCampaign ? new Date() : null
            },
            {
                id: 'voice_of_change',
                name: 'Voice of Change',
                description: 'Created posts that reached over 100 views or 50 engagement actions.',
                icon: 'fas fa-bullhorn',
                color: 'warning',
                earned: postViews >= 100 || postEngagement >= 50,
                earnedDate: (postViews >= 100 || postEngagement >= 50) ? new Date() : null
            },
            {
                id: 'knowledge_seeker',
                name: 'Knowledge Seeker',
                description: 'Completed awareness modules, surveys, or quizzes.',
                icon: 'fas fa-brain',
                color: 'primary',
                earned: userProgressCount > 0 || surveyResponsesCount > 0,
                earnedDate: (userProgressCount > 0 || surveyResponsesCount > 0) ? new Date() : null
            }
        ];

        const badgeCount = allBadges.filter(b => b.earned).length;

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                location: user.location,
                organization: user.organization,
                bio: user.bio,
                interests: user.interests,
                emailUpdates: user.emailUpdates,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
                stats: {
                    campaigns: campaignsJoinedCount,
                    posts: postsCount,
                    impactScore: impactScore,
                    badges: badgeCount
                },
                badges: allBadges,
                recentCampaigns: recentCampaigns.map(c => ({
                    _id: c._id,
                    title: c.title,
                    category: c.category,
                    location: c.location,
                    date: c.startDate || c.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        // STRICT PROTECTION: Email MUST NOT be updated through normal profile update endpoint
        if (req.body && req.body.email !== undefined) {
            delete req.body.email;
        }

        const allowedUpdates = ['name', 'phone', 'location', 'organization', 'bio', 'interests', 'emailUpdates', 'profileImage'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body && req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (req.file) {
            updates.profileImage = '/uploads/profiles/' + req.file.filename;
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                location: user.location,
                organization: user.organization,
                bio: user.bio,
                interests: user.interests,
                emailUpdates: user.emailUpdates,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating profile'
        });
    }
};

// Permanently Delete Authenticated User Account
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to confirm account deletion.'
            });
        }

        // 1. Fetch authenticated user with password hash
        const user = await User.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }

        // 2. Verify current password securely against stored hash
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password. Account deletion cancelled.'
            });
        }

        // 3. Clean up user's associated data across MongoDB collections

        // Delete user's posts
        await Post.deleteMany({ authorId: userId });

        // Remove user references from post engagement arrays (likedBy, viewedBy, sharedBy)
        await Post.updateMany(
            { $or: [{ likedBy: userId }, { viewedBy: userId }, { sharedBy: userId }] },
            {
                $pull: {
                    likedBy: userId,
                    viewedBy: userId,
                    sharedBy: userId
                }
            }
        );

        // Delete user's comments
        try {
            const Comment = require('../models/Comment');
            if (Comment) {
                await Comment.deleteMany({ authorId: userId });
            }
        } catch (e) {
            console.warn('Comment cleanup notice:', e.message);
        }

        // Delete survey responses
        await SurveyResponse.deleteMany({ $or: [{ user: userId }, { userId: userId }] });

        // Delete learning module progress
        await UserProgress.deleteMany({ userId: userId });

        // Remove user from campaign participants
        const joinedCampaigns = await Campaign.find({ participants: userId });
        for (const campaign of joinedCampaigns) {
            if (Array.isArray(campaign.participants)) {
                campaign.participants = campaign.participants.filter(p => p.toString() !== userId.toString());
                if (campaign.metrics) {
                    campaign.metrics.totalParticipants = campaign.participants.length;
                }
                await campaign.save();
            }
        }

        // If user is a campaign manager, deactivate manager's campaigns
        await Campaign.updateMany({ managerId: userId }, { status: 'inactive' });

        // 4. Permanently delete the User document
        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: 'Your account and associated data have been permanently deleted.'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting your account. Please try again.'
        });
    }
};

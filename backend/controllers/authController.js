const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Post = require('../models/Post');
const SurveyResponse = require('../models/SurveyResponse');
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

        // Calculate impact points
        const userPosts = await Post.find({ authorId: userId });
        const postEngagement = userPosts.reduce((sum, p) => {
            return sum + (p.engagement?.likes || 0) + (p.engagement?.comments || 0) + (p.engagement?.shares || 0);
        }, 0);

        const surveyResponsesCount = await SurveyResponse.countDocuments({ userId });
        const impactScore = postsCount * 10 + postEngagement * 5 + campaignsJoinedCount * 20 + surveyResponsesCount * 15;

        // Calculate badge count
        let badgeCount = 0;
        if (impactScore >= 100) badgeCount++;
        if (impactScore >= 500) badgeCount++;
        if (impactScore >= 1000) badgeCount++;
        if (postsCount >= 5) badgeCount++;
        if (campaignsJoinedCount >= 3) badgeCount++;

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
        const allowedUpdates = ['name', 'phone', 'location', 'organization', 'bio', 'interests', 'emailUpdates', 'profileImage'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

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
            message: 'Error updating profile'
        });
    }
};

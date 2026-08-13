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

const { encryptText, decryptText } = require('../services/encryptionService');

// Helper to validate and normalize Indian Phone Numbers
function validateAndNormalizeIndianPhone(phone) {
    if (!phone) return '';
    // Strip space, hyphens, parentheses
    const cleaned = phone.toString().replace(/[\s\-\(\)]/g, '');
    let digits = '';
    if (cleaned.startsWith('+91')) {
        digits = cleaned.slice(3);
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
        digits = cleaned.slice(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
        digits = cleaned.slice(1);
    } else {
        digits = cleaned;
    }
    // Indian mobile numbers must be 10 digits starting with 6, 7, 8, or 9
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(digits)) {
        return null; // Invalid
    }
    return `+91${digits}`;
}

// Helper to decrypt sensitive user fields before sending to client
function sanitizeUserResponse(user) {
    if (!user) return null;
    const u = user.toObject ? user.toObject() : { ...user };
    delete u.password;
    
    u.phone = decryptText(u.phone);
    u.dob = decryptText(u.dob);
    u.gender = decryptText(u.gender);
    u.category = decryptText(u.category);
    
    return u;
}

exports.register = async (req, res) => {
    try {
        let {
            name,
            email,
            password,
            role,
            phone,
            dob,
            gender,
            category,
            termsAccepted,
            privacyPolicyAccepted,
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

        // 1. Email Normalization & Validation
        if (!email || typeof email !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'A valid email address is required.'
            });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address format.'
            });
        }

        // 2. Terms & Privacy Acceptance Verification
        if (termsAccepted !== true || privacyPolicyAccepted !== true) {
            return res.status(400).json({
                success: false,
                message: 'You must agree to the Terms & Conditions and Privacy Policy to register.'
            });
        }

        // 3. Indian Phone Number Validation & Normalization
        let normalizedPhone = '';
        if (phone) {
            const validPhone = validateAndNormalizeIndianPhone(phone);
            if (!validPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.'
                });
            }
            normalizedPhone = validPhone;
        }

        // 4. DOB Validation
        let validDob = '';
        if (dob) {
            const dobDate = new Date(dob);
            const today = new Date();
            if (isNaN(dobDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Date of Birth provided.'
                });
            }
            if (dobDate > today) {
                return res.status(400).json({
                    success: false,
                    message: 'Date of Birth cannot be in the future.'
                });
            }
            // Age check (at least 13 years old)
            let age = today.getFullYear() - dobDate.getFullYear();
            const monthDiff = today.getMonth() - dobDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
                age--;
            }
            if (age < 13) {
                return res.status(400).json({
                    success: false,
                    message: 'You must be at least 13 years old to register.'
                });
            }
            validDob = dobDate.toISOString().split('T')[0];
        }

        // 5. Gender & Category Validation
        const validGenders = ['Male', 'Female', 'Others', 'Prefer not to say', ''];
        const selectedGender = validGenders.includes(gender) ? gender : '';

        const validCategories = [
            'School Student', 'College Student', 'Working Professional / Employee',
            'Self-Employed', 'Entrepreneur / Business Owner', 'Government Employee',
            'Teacher / Faculty', 'Researcher', 'Unemployed', 'Retired', 'Homemaker',
            'Other', 'Prefer not to say', ''
        ];
        const selectedCategory = validCategories.includes(category) ? category : '';

        // Check if user already exists with normalized email
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const now = new Date();

        // Create new user with plaintext fields (encryption occurs in pre-save hook)
        const user = new User({
            name: name ? name.trim() : '',
            email: normalizedEmail,
            password,
            role: role || 'participant',
            phone: normalizedPhone,
            dob: validDob,
            gender: selectedGender,
            category: selectedCategory,
            termsAccepted: true,
            termsAcceptedAt: now,
            privacyPolicyAccepted: true,
            privacyPolicyAcceptedAt: now,
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
                phone: normalizedPhone,
                dob: validDob,
                gender: selectedGender,
                category: selectedCategory,
                location: user.location,
                organization: user.organization,
                bio: user.bio,
                interests: user.interests,
                emailUpdates: user.emailUpdates
            }
        });
    } catch (error) {
        console.error('Registration error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

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
        let { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user and include password for comparison
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

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

        // Sanitize user object (decrypt sensitive fields)
        const sanitizedUser = sanitizeUserResponse(user);

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: sanitizedUser.phone,
                dob: sanitizedUser.dob,
                gender: sanitizedUser.gender,
                category: sanitizedUser.category,
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
        const sanitizedUser = sanitizeUserResponse(user);

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: sanitizedUser.phone,
                dob: sanitizedUser.dob,
                gender: sanitizedUser.gender,
                category: sanitizedUser.category,
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

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // STRICT PROTECTION: Email MUST NOT be updated through normal profile update endpoint
        if (req.body && req.body.email !== undefined) {
            delete req.body.email;
        }

        if (req.body) {
            if (req.body.name !== undefined) user.name = req.body.name.trim();
            if (req.body.location !== undefined) user.location = req.body.location;
            if (req.body.organization !== undefined) user.organization = req.body.organization;
            if (req.body.bio !== undefined) user.bio = req.body.bio;
            if (req.body.interests !== undefined) user.interests = req.body.interests;
            if (req.body.emailUpdates !== undefined) user.emailUpdates = req.body.emailUpdates;
            if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;

            // Phone update validation (remain plaintext for schema validation; encryption occurs in pre-save)
            if (req.body.phone !== undefined && req.body.phone !== '') {
                const validPhone = validateAndNormalizeIndianPhone(req.body.phone);
                if (!validPhone) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.'
                    });
                }
                user.phone = validPhone;
            } else if (req.body.phone === '') {
                user.phone = '';
            }

            // DOB update validation
            if (req.body.dob !== undefined && req.body.dob !== '') {
                const dobDate = new Date(req.body.dob);
                const today = new Date();
                if (isNaN(dobDate.getTime()) || dobDate > today) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid Date of Birth.'
                    });
                }
                user.dob = dobDate.toISOString().split('T')[0];
            } else if (req.body.dob === '') {
                user.dob = '';
            }

            // Gender update validation
            if (req.body.gender !== undefined) {
                const validGenders = ['Male', 'Female', 'Others', 'Prefer not to say', ''];
                if (validGenders.includes(req.body.gender)) {
                    user.gender = req.body.gender;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid gender value.'
                    });
                }
            }

            // Category update validation
            if (req.body.category !== undefined) {
                const validCategories = [
                    'School Student', 'College Student', 'Working Professional / Employee',
                    'Self-Employed', 'Entrepreneur / Business Owner', 'Government Employee',
                    'Teacher / Faculty', 'Researcher', 'Unemployed', 'Retired', 'Homemaker',
                    'Other', 'Prefer not to say', ''
                ];
                if (validCategories.includes(req.body.category)) {
                    user.category = req.body.category;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid user category / occupation.'
                    });
                }
            }
        }

        if (req.file) {
            user.profileImage = '/uploads/profiles/' + req.file.filename;
        }

        await user.save();

        const sanitizedUser = sanitizeUserResponse(user);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: sanitizedUser.phone,
                dob: sanitizedUser.dob,
                gender: sanitizedUser.gender,
                category: sanitizedUser.category,
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

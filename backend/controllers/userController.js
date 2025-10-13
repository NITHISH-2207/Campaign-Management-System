const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Post = require('../models/Post');
const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');
const Education = require('../models/Education');
const UserProgress = require('../models/UserProgress');

const userController = {
    // Get user dashboard data
    getDashboardData: async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Get user's posts count
            const postsCount = await Post.countDocuments({ authorId: userId });
            
            // Get total engagement (likes + comments) on user's posts
            const userPosts = await Post.find({ authorId: userId });
            const totalImpact = userPosts.reduce((sum, post) => {
                return sum + (post.engagement?.likes || 0) + (post.engagement?.comments || 0);
            }, 0);
            
            // Get campaigns joined count
            const campaignsJoined = await Campaign.countDocuments({ 
                participants: userId 
            });
            
            // Get learning progress
            const userProgress = await UserProgress.find({ userId });
            const totalModules = await Education.countDocuments({ status: 'published' });
            const completedModules = userProgress.filter(p => p.completed).length;
            const learningProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
            
            // Get active campaigns user is part of
            const activeCampaigns = await Campaign.find({
                participants: userId,
                status: 'active',
                endDate: { $gte: new Date() }
            })
            .select('title category location endDate type')
            .limit(5)
            .sort('-createdAt');
            
            // Calculate user level and points
            const basePoints = postsCount * 10 + totalImpact * 5 + campaignsJoined * 20;
            const surveyPoints = await userController.calculateSurveyPoints(userId); // Fix: use userController reference
            const totalPoints = basePoints + surveyPoints;
            const level = Math.floor(totalPoints / 100) + 1;
            
            // Get recent activity
            const recentActivity = await userController.getRecentActivity(userId); // Fix: use userController reference
            
            // Get recent badges
            const badges = userController.calculateBadges(totalPoints, postsCount, campaignsJoined); // Fix: use userController reference
            
            res.json({
                success: true,
                stats: {
                    postsCount,
                    totalImpact,
                    campaignsJoined,
                    learningProgress,
                    points: totalPoints,
                    level
                },
                activeCampaigns,
                recentActivity,
                badges
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data',
                error: error.message
            });
        }
    },
    
    // Calculate points from survey participation
    calculateSurveyPoints: async function(userId) {
        try {
            const responses = await SurveyResponse.countDocuments({ userId });
            return responses * 15; // 15 points per survey
        } catch (error) {
            console.error('Error calculating survey points:', error);
            return 0;
        }
    },
    
    // Get recent activity for user
    getRecentActivity: async function(userId) {
        const activities = [];
        
        try {
            // Get recent posts
            const recentPosts = await Post.find({ authorId: userId })
                .sort('-createdAt')
                .limit(3)
                .select('title createdAt');
                
            recentPosts.forEach(post => {
                activities.push({
                    type: 'post',
                    title: `Created post: "${post.title}"`,
                    date: post.createdAt,
                    points: 10,
                    icon: 'fas fa-pen'
                });
            });
            
            // Get recent campaign joins
            const recentCampaigns = await Campaign.find({ participants: userId })
                .sort('-updatedAt')
                .limit(3)
                .select('title updatedAt');
                
            recentCampaigns.forEach(campaign => {
                activities.push({
                    type: 'campaign',
                    title: `Joined campaign: "${campaign.title}"`,
                    date: campaign.updatedAt,
                    points: 20,
                    icon: 'fas fa-users'
                });
            });
            
            // Sort by date
            activities.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return activities.slice(0, 5); // Return top 5 most recent
        } catch (error) {
            console.error('Error getting recent activity:', error);
            return [];
        }
    },
    
    // Calculate badges based on achievements
    calculateBadges: function(points, posts, campaigns) {
        const badges = [];
        
        // Points-based badges
        if (points >= 100) badges.push({ name: 'Changemaker', icon: 'fas fa-star', color: 'warning' });
        if (points >= 500) badges.push({ name: 'Impact Creator', icon: 'fas fa-fire', color: 'danger' });
        if (points >= 1000) badges.push({ name: 'Champion', icon: 'fas fa-trophy', color: 'primary' });
        
        // Activity-based badges
        if (posts >= 5) badges.push({ name: 'Storyteller', icon: 'fas fa-pen', color: 'info' });
        if (campaigns >= 3) badges.push({ name: 'Activist', icon: 'fas fa-fist-raised', color: 'success' });
        
        return badges.slice(-3); // Return last 3 earned badges
    }
};

module.exports = userController;

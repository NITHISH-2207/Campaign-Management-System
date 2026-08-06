// backend/controllers/analyticsController.js

const Analytics = require('../models/Analytics');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const SurveyResponse = require('../models/SurveyResponse');

exports.getDashboardData = async (req, res) => {
    try {
        const { campaignId, dateRange = 7 } = req.query;
        const userId = req.user.id;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);

        // Get campaigns managed by user
        const campaignQuery = { managerId: userId };
        if (campaignId && campaignId !== 'all') {
            campaignQuery._id = campaignId;
        }
        const userCampaigns = await Campaign.find(campaignQuery);
        const campaignIds = userCampaigns.map(c => c._id);

        // Get posts for user's campaigns
        const posts = await Post.find({
            campaignId: { $in: campaignIds },
            createdAt: { $gte: startDate }
        });

        // Calculate engagement metrics
        const engagement = posts.reduce((acc, post) => {
            acc.views += post.engagement.views || 0;
            acc.likes += post.engagement.likes || 0;
            acc.shares += post.engagement.shares || 0;
            acc.comments += post.engagement.comments || 0;
            acc.total += (post.engagement.views + post.engagement.likes + 
                         post.engagement.shares + post.engagement.comments) || 0;
            return acc;
        }, { views: 0, likes: 0, shares: 0, comments: 0, total: 0 });

        // Get unique active users from the participants array of manager's campaigns
        const uniqueUsers = new Set();
        for (const campaign of userCampaigns) {
            if (Array.isArray(campaign.participants)) {
                campaign.participants.forEach(pId => {
                    if (pId) uniqueUsers.add(pId.toString());
                });
            }
        }

        // Get comments for sentiment analysis
        const postIds = posts.map(p => p._id);
        const comments = await Comment.find({
            postId: { $in: postIds },
            createdAt: { $gte: startDate }
        });

        // Calculate sentiment
        const sentimentData = comments.reduce((acc, comment) => {
            if (comment.sentiment && comment.sentiment.label) {
                acc[comment.sentiment.label] = (acc[comment.sentiment.label] || 0) + 1;
                acc.total++;
            }
            return acc;
        }, { positive: 0, negative: 0, neutral: 0, total: 0 });

        // Calculate overall sentiment percentage
        let overallSentiment = 'neutral';
        let sentimentScore = 50;
        
        if (sentimentData.total > 0) {
            sentimentScore = Math.round((sentimentData.positive / sentimentData.total) * 100);
            if (sentimentScore > 60) overallSentiment = 'positive';
            else if (sentimentScore < 40) overallSentiment = 'negative';
        }

        // Get timeline data for the past dateRange days
        const timeline = [];
        for (let i = dateRange - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const dayPosts = posts.filter(p => 
                p.createdAt >= date && p.createdAt < nextDate
            );
            
            const dayEngagement = dayPosts.reduce((sum, post) => 
                sum + (post.engagement.views + post.engagement.likes + 
                      post.engagement.shares + post.engagement.comments || 0), 0
            );
            
            timeline.push({
                date: date.toISOString(),
                engagement: dayEngagement
            });
        }

        // Get top performing posts
        const topPosts = posts
            .sort((a, b) => {
                const engagementA = a.engagement.views + a.engagement.likes + 
                                   a.engagement.shares + a.engagement.comments;
                const engagementB = b.engagement.views + b.engagement.likes + 
                                   b.engagement.shares + b.engagement.comments;
                return engagementB - engagementA;
            })
            .slice(0, 5)
            .map(post => ({
                _id: post._id,
                title: post.title,
                engagement: post.engagement.views + post.engagement.likes + 
                           post.engagement.shares + post.engagement.comments,
                sentiment: post.sentiment.overall,
                sentimentScore: post.sentiment.scores.positive / 100,
                shares: post.engagement.shares
            }));

        res.json({
            success: true,
            data: {
                totals: {
                    engagement: engagement.total,
                    views: engagement.views,
                    uniqueUsers: uniqueUsers.size
                },
                sentiment: {
                    positive: sentimentData.positive,
                    neutral: sentimentData.neutral,
                    negative: sentimentData.negative,
                    overall: sentimentScore,
                    label: overallSentiment
                },
                timeline,
                topPosts
            }
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

exports.getRealtimeActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get campaigns managed by user
        const userCampaigns = await Campaign.find({ managerId: userId });
        const campaignIds = userCampaigns.map(c => c._id);
        
        // Get posts from user's campaigns
        const posts = await Post.find({ 
            campaignId: { $in: campaignIds }
        }).select('_id title');
        
        const postIds = posts.map(p => p._id);
        
        // Get recent comments on these posts
        const recentComments = await Comment.find({
            postId: { $in: postIds }
        })
        .populate('authorId', 'name')
        .populate('postId', 'title')
        .sort({ createdAt: -1 })
        .limit(20);

        const activities = recentComments.map(comment => ({
            type: 'comment',
            user: comment.authorId?.name || 'Anonymous',
            postTitle: comment.postId?.title || 'Unknown Post',
            content: comment.content.substring(0, 100) + '...',
            sentiment: comment.sentiment || { label: 'neutral', score: 50 },
            time: comment.createdAt
        }));

        res.json({
            success: true,
            activities
        });
    } catch (error) {
        console.error('Realtime activity error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

exports.getSurveyImpact = async (req, res) => {
    try {
        const { campaignId } = req.params;
        
        // Get before and after survey responses
        const beforeResponses = await SurveyResponse.find({
            campaign: campaignId,
            surveyType: 'before'
        }).populate('survey');
        
        const afterResponses = await SurveyResponse.find({
            campaign: campaignId,
            surveyType: 'after'
        }).populate('survey');

        // Calculate impact by category
        const categories = ['awareness', 'behavior', 'attitude', 'knowledge'];
        const categoryChanges = {};
        
        for (const category of categories) {
            const beforeScores = calculateCategoryAverage(beforeResponses, category);
            const afterScores = calculateCategoryAverage(afterResponses, category);
            
            const percentageChange = beforeScores > 0 
                ? ((afterScores - beforeScores) / beforeScores) * 100
                : 0;
            
            categoryChanges[category] = {
                preAverage: beforeScores,
                postAverage: afterScores,
                percentageChange: Math.round(percentageChange * 10) / 10,
                improvement: percentageChange > 0
            };
        }

        const overallChange = Object.values(categoryChanges)
            .reduce((sum, cat) => sum + cat.percentageChange, 0) / categories.length;

        // Generate significant findings
        const significantFindings = [];
        Object.entries(categoryChanges).forEach(([category, data]) => {
            if (Math.abs(data.percentageChange) > 20) {
                significantFindings.push({
                    category,
                    change: data.percentageChange,
                    message: data.percentageChange > 0 
                        ? `Significant improvement in ${category}` 
                        : `Area needs attention: ${category}`
                });
            }
        });

        res.json({
            success: true,
            overallChange: Math.round(overallChange * 10) / 10,
            categoryChanges,
            participationRate: {
                before: beforeResponses.length,
                after: afterResponses.length,
                retention: beforeResponses.length > 0 
                    ? Math.round((afterResponses.length / beforeResponses.length) * 100) 
                    : 0
            },
            significantFindings
        });
    } catch (error) {
        console.error('Survey impact error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Helper function to calculate category average
function calculateCategoryAverage(responses, category) {
    let total = 0;
    let count = 0;
    
    responses.forEach(response => {
        response.responses.forEach(answer => {
            if (answer.category === category && typeof answer.answer === 'number') {
                total += answer.answer;
                count++;
            }
        });
    });
    
    return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

// Auto-update analytics data
exports.updateAnalytics = async (postId, type) => {
    try {
        const post = await Post.findById(postId);
        if (!post) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await Analytics.findOneAndUpdate(
            { 
                campaignId: post.campaignId,
                date: today
            },
            {
                $inc: {
                    [`metrics.${type}`]: 1
                }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Analytics update error:', error);
    }
};

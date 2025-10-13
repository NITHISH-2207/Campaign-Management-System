// backend/models/Post.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    campaignId: {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
        required: false // Made optional for personal posts
    },
    authorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    postType: {
        type: String,
        enum: ['campaign', 'personal'],
        default: 'campaign'
    },
    authorRole: {
        type: String,
        enum: ['user', 'participant', 'campaign_manager', 'admin'],
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    imageUrl: {
        type: String,
        default: null
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    engagement: {
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        comments: { type: Number, default: 0 }
    },
    likedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    viewedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    sharedBy: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    enableComments: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    sentiment: {
        overall: {
            type: String,
            enum: ['positive', 'negative', 'neutral', 'mixed'],
            default: 'neutral'
        },
        scores: {
            positive: { type: Number, default: 0 },
            negative: { type: Number, default: 0 },
            neutral: { type: Number, default: 0 }
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    analytics: {
        peakEngagementTime: Date,
        averageReadTime: { type: Number, default: 0 },
        bounceRate: { type: Number, default: 0 },
        shareRate: { type: Number, default: 0 },
        commentRate: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
postSchema.index({ campaignId: 1, createdAt: -1 });
postSchema.index({ authorId: 1 });
postSchema.index({ tags: 1 });
postSchema.index({ 'sentiment.overall': 1 });
postSchema.index({ postType: 1 });
postSchema.index({ 'engagement.views': -1 });
postSchema.index({ 'engagement.likes': -1 });
postSchema.index({ createdAt: -1 });

// Virtual for total engagement
postSchema.virtual('totalEngagement').get(function() {
    return this.engagement.views + 
           this.engagement.likes + 
           this.engagement.shares + 
           this.engagement.comments;
});

// Virtual for engagement rate
postSchema.virtual('engagementRate').get(function() {
    if (this.engagement.views === 0) return 0;
    const interactions = this.engagement.likes + this.engagement.shares + this.engagement.comments;
    return ((interactions / this.engagement.views) * 100).toFixed(2);
});

// Update sentiment when comments change
postSchema.methods.updateSentiment = async function() {
    const Comment = mongoose.model('Comment');
    const comments = await Comment.find({ postId: this._id });
    
    let sentimentScores = {
        positive: 0,
        negative: 0,
        neutral: 0
    };
    
    comments.forEach(comment => {
        if (comment.sentiment && comment.sentiment.label) {
            sentimentScores[comment.sentiment.label]++;
        }
    });
    
    const total = comments.length || 1;
    this.sentiment.scores = {
        positive: (sentimentScores.positive / total) * 100,
        negative: (sentimentScores.negative / total) * 100,
        neutral: (sentimentScores.neutral / total) * 100
    };
    
    // Determine overall sentiment
    const maxScore = Math.max(...Object.values(this.sentiment.scores));
    if (maxScore === this.sentiment.scores.positive && maxScore > 50) {
        this.sentiment.overall = 'positive';
    } else if (maxScore === this.sentiment.scores.negative && maxScore > 50) {
        this.sentiment.overall = 'negative';
    } else if (Math.abs(this.sentiment.scores.positive - this.sentiment.scores.negative) < 10) {
        this.sentiment.overall = 'mixed';
    } else {
        this.sentiment.overall = 'neutral';
    }
    
    this.sentiment.lastUpdated = new Date();
    
    await this.save();
};

// Method to update analytics metrics
postSchema.methods.updateAnalytics = async function() {
    // Calculate share rate
    if (this.engagement.views > 0) {
        this.analytics.shareRate = (this.engagement.shares / this.engagement.views) * 100;
        this.analytics.commentRate = (this.engagement.comments / this.engagement.views) * 100;
    }
    
    // Update peak engagement time if current engagement is highest
    const currentEngagement = this.totalEngagement;
    if (!this.analytics.peakEngagementTime || currentEngagement > 0) {
        this.analytics.peakEngagementTime = new Date();
    }
    
    await this.save();
};

// Method to get unique viewers count
postSchema.methods.getUniqueViewersCount = function() {
    return this.viewedBy ? this.viewedBy.length : 0;
};

// Method to check if user has liked the post
postSchema.methods.isLikedByUser = function(userId) {
    return this.likedBy.some(id => id.toString() === userId.toString());
};

// Method to check if user has shared the post
postSchema.methods.isSharedByUser = function(userId) {
    return this.sharedBy && this.sharedBy.some(id => id.toString() === userId.toString());
};

// Method to check if user has viewed the post
postSchema.methods.isViewedByUser = function(userId) {
    return this.viewedBy && this.viewedBy.some(id => id.toString() === userId.toString());
};

// Static method to get trending posts
postSchema.statics.getTrending = async function(limit = 10, timeframe = 7) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - timeframe);
    
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: dateThreshold },
                status: 'published'
            }
        },
        {
            $addFields: {
                engagementScore: {
                    $add: [
                        { $multiply: ['$engagement.views', 1] },
                        { $multiply: ['$engagement.likes', 5] },
                        { $multiply: ['$engagement.comments', 3] },
                        { $multiply: ['$engagement.shares', 10] }
                    ]
                }
            }
        },
        {
            $sort: { engagementScore: -1 }
        },
        {
            $limit: limit
        }
    ]);
};

// Static method to get posts by sentiment
postSchema.statics.getBySentiment = async function(sentiment, limit = 10) {
    return this.find({ 
        'sentiment.overall': sentiment,
        status: 'published' 
    })
    .populate('authorId', 'name avatar')
    .populate('campaignId', 'title')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get campaign statistics
postSchema.statics.getCampaignStats = async function(campaignId) {
    const stats = await this.aggregate([
        {
            $match: { campaignId: new mongoose.Types.ObjectId(campaignId) }
        },
        {
            $group: {
                _id: null,
                totalPosts: { $sum: 1 },
                totalViews: { $sum: '$engagement.views' },
                totalLikes: { $sum: '$engagement.likes' },
                totalShares: { $sum: '$engagement.shares' },
                totalComments: { $sum: '$engagement.comments' },
                avgEngagement: { $avg: {
                    $add: [
                        '$engagement.views',
                        '$engagement.likes',
                        '$engagement.shares',
                        '$engagement.comments'
                    ]
                }},
                sentimentCounts: {
                    $push: '$sentiment.overall'
                }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalPosts: 0,
            totalViews: 0,
            totalLikes: 0,
            totalShares: 0,
            totalComments: 0,
            avgEngagement: 0,
            sentimentBreakdown: {
                positive: 0,
                negative: 0,
                neutral: 0,
                mixed: 0
            }
        };
    }

    // Count sentiments
    const sentimentBreakdown = {
        positive: 0,
        negative: 0,
        neutral: 0,
        mixed: 0
    };

    stats[0].sentimentCounts.forEach(sentiment => {
        if (sentimentBreakdown.hasOwnProperty(sentiment)) {
            sentimentBreakdown[sentiment]++;
        }
    });

    delete stats[0].sentimentCounts;
    stats[0].sentimentBreakdown = sentimentBreakdown;

    return stats[0];
};

// Middleware to update updatedAt on save
postSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Ensure virtuals are included in JSON
postSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.__v;
        return ret;
    }
});

postSchema.set('toObject', {
    virtuals: true
});

module.exports = mongoose.model('Post', postSchema);

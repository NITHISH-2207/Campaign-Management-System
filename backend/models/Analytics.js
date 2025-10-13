const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    metrics: {
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        shares: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        uniqueUsers: { type: Number, default: 0 }
    },
    sentiment: {
        positive: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        averageScore: { type: Number, default: 0 }
    },
    demographics: {
        ageGroups: {
            '18-24': { type: Number, default: 0 },
            '25-34': { type: Number, default: 0 },
            '35-44': { type: Number, default: 0 },
            '45-54': { type: Number, default: 0 },
            '55+': { type: Number, default: 0 }
        },
        locations: [{
            country: String,
            count: Number
        }]
    },
    hourlyEngagement: [{
        hour: Number,
        engagement: Number
    }]
});

analyticsSchema.index({ campaignId: 1, date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);

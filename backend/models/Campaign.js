// backend/models/Campaign.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const isNotDraft = function() {
    return this.status !== 'draft';
};

const campaignSchema = new Schema({
    title: {
        type: String,
        required: isNotDraft,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: isNotDraft,
        maxlength: 2000
    },
    category: {
        type: String,
        required: isNotDraft,
        enum: ['Environment', 'Health', 'Education', 'Poverty', 'Human Rights', 
               'Animal Welfare', 'Community', 'Technology', 'Disaster Relief', 'Youth']
    },
    type: {
        type: String,
        required: isNotDraft,
        enum: ['Online', 'Physical', 'Hybrid']
    },
    managerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: isNotDraft
    },
    endDate: {
        type: Date,
        required: isNotDraft
    },
    location: {
        type: String,
        required: isNotDraft
    },
    targetAudience: {
        type: String,
        required: isNotDraft
    },
    goals: {
        type: String,
        required: isNotDraft,
        maxlength: 500
    },
    actionPlan: {
        type: String,
        required: isNotDraft,
        maxlength: 1000
    },
    expectedImpact: {
        type: String,
        required: isNotDraft,
        maxlength: 500
    },
    contactInfo: {
        email: { type: String, required: isNotDraft },
        phone: String,
        website: String,
        socialMedia: String
    },
    media: {
        imageUrl: String,
        videoUrl: String
    },
    hashtags: [String],
    resources: [String],
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'active', 'inactive', 'completed', 'rejected'],
        default: 'pending'
    },
    approvalFeedback: String,
    approvedAt: Date,
    metrics: {
        totalPosts: { type: Number, default: 0 },
        totalEngagement: { type: Number, default: 0 },
        totalParticipants: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    
participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
}]

});

// Validation to ensure end date is after start date
campaignSchema.pre('save', function(next) {
    if (this.startDate && this.endDate && this.endDate <= this.startDate) {
        next(new Error('End date must be after start date'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Campaign', campaignSchema);

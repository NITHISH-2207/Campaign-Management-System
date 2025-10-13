// backend/models/Campaign.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const campaignSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    category: {
        type: String,
        required: true,
        enum: ['Environment', 'Health', 'Education', 'Poverty', 'Human Rights', 
               'Animal Welfare', 'Community', 'Technology', 'Disaster Relief', 'Youth']
    },
    type: {
        type: String,
        required: true,
        enum: ['Online', 'Physical', 'Hybrid']
    },
    managerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    targetAudience: {
        type: String,
        required: true
    },
    goals: {
        type: String,
        required: true,
        maxlength: 500
    },
    actionPlan: {
        type: String,
        required: true,
        maxlength: 1000
    },
    expectedImpact: {
        type: String,
        required: true,
        maxlength: 500
    },
    contactInfo: {
        email: { type: String, required: true },
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
    enum: ['pending', 'active', 'inactive', 'completed', 'rejected'],
    default: 'active'  // Changed to 'active'
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
    if (this.endDate <= this.startDate) {
        next(new Error('End date must be after start date'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Campaign', campaignSchema);

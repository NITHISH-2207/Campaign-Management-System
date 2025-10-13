const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['climate', 'social', 'health', 'education', 'other'],
        required: true
    },
    content: {
        type: {
            type: String,
            enum: ['video', 'article', 'interactive', 'mixed'],
            default: 'article'
        },
        body: String,
        videoUrl: String,
        resources: [{
            title: String,
            url: String,
            type: String
        }]
    },
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    duration: {
        type: Number, // in minutes
        default: 30
    },
    tags: [String],
    completions: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

educationSchema.index({ category: 1, createdAt: -1 });
educationSchema.index({ tags: 1 });

module.exports = mongoose.model('Education', educationSchema);

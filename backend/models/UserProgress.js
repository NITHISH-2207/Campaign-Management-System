const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Education',
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
    },
    progressPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    currentSection: {
        type: String,
        default: ''
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    timeSpent: {
        type: Number, // in minutes
        default: 0
    },
    quizScore: Number,
    quizPassed: Boolean,
    quizAttemptedAt: Date
});

// Compound index for efficient queries
userProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);
    
const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    educationModuleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Education',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    questions: [{
        text: { type: String, required: true },
        type: {
            type: String,
            enum: ['multiple-choice', 'true-false'],
            default: 'multiple-choice'
        },
        options: [{
            text: String,
            isCorrect: Boolean
        }],
        points: { type: Number, default: 10 }
    }],
    passingScore: {
        type: Number,
        default: 70 // percentage
    },
    attempts: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        score: Number,
        passed: Boolean,
        completedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Quiz', quizSchema);

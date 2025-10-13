const mongoose = require('mongoose');

const surveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    type: { 
        type: String, 
        enum: ['before', 'after'], 
        required: true 
    },
    questions: [{
        questionId: { type: String, required: true },
        text: { type: String, required: true },
        type: {
            type: String,
            enum: ['multiple-choice', 'rating', 'text', 'yes-no', 'scale'],
            required: true
        },
        options: [String],
        scaleMin: { type: Number, default: 1 },
        scaleMax: { type: Number, default: 5 },
        required: { type: Boolean, default: true },
        category: { 
            type: String, 
            enum: ['awareness', 'behavior', 'attitude', 'knowledge'],
            required: true
        }
    }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

// Remove the responses array from here - use separate model
surveySchema.index({ campaign: 1, type: 1 });

module.exports = mongoose.model('Survey', surveySchema);

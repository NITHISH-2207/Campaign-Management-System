const mongoose = require('mongoose');

const surveyResponseSchema = new mongoose.Schema({
  survey: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  responses: [{
    questionId: { type: String, required: true },
    answer: mongoose.Schema.Types.Mixed,
    category: String
  }],
  completedAt: { type: Date, default: Date.now },
  surveyType: { type: String, enum: ['before', 'after'] }
});

// Prevent duplicate responses
surveyResponseSchema.index({ survey: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);

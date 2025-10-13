// backend/controllers/surveyController.js
const Survey = require('../models/Survey');
const SurveyResponse = require('../models/SurveyResponse');
const ImpactCalculator = require('../services/impactCalculator');

// Get all surveys with optional filters
// In backend/controllers/surveyController.js, update getSurveys:

exports.getSurveys = async (req, res) => {
    try {
        const { campaignId, type } = req.query;
        
        let query = {};
        if (campaignId) query.campaign = campaignId;
        if (type) query.type = type;
        
        const surveys = await Survey.find(query)
            .populate('createdBy', '_id name')  // Include creator info
            .populate('campaign', 'title')
            .sort({ createdAt: -1 });

        // Count responses for each survey
        const surveysWithStatus = await Promise.all(surveys.map(async (survey) => {
            const hasCompleted = await SurveyResponse.findOne({
                survey: survey._id,
                user: req.user.id
            });
            
            const responsesCount = await SurveyResponse.countDocuments({
                survey: survey._id
            });
            
            return {
                ...survey.toObject(),
                completed: !!hasCompleted,
                responsesCount,
                createdBy: survey.createdBy  // Include creator info
            };
        }));

        res.json({
            success: true,
            surveys: surveysWithStatus
        });
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
// Get available surveys for user
exports.getUserSurveys = async (req, res) => {
    try {
        const surveys = await Survey.find({ isActive: true })
            .populate('campaign', 'title')
            .sort({ createdAt: -1 });

        const surveysWithStatus = await Promise.all(surveys.map(async (survey) => {
            const hasCompleted = await SurveyResponse.findOne({
                survey: survey._id,
                user: req.user.id
            });
            
            return {
                ...survey.toObject(),
                completed: !!hasCompleted
            };
        }));

        res.json({
            success: true,
            surveys: surveysWithStatus
        });
    } catch (error) {
        console.error('Error fetching user surveys:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get campaign surveys
exports.getCampaignSurveys = async (req, res) => {
    try {
        const { campaignId } = req.params;
        
        const surveys = await Survey.find({ campaign: campaignId })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            surveys
        });
    } catch (error) {
        console.error('Error fetching campaign surveys:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Create survey
exports.createSurvey = async (req, res) => {
    try {
        const { title, description, campaignId, type, questions } = req.body;
        
        const survey = new Survey({
            title,
            description,
            campaign: campaignId,
            type,
            questions,
            createdBy: req.user.id
        });

        await survey.save();
        await survey.populate('campaign', 'title');
        
        res.status(201).json({
            success: true,
            survey
        });
    } catch (error) {
        console.error('Error creating survey:', error);
        res.status(500).json({ error: error.message });
    }
};

// Submit survey response
exports.submitSurvey = async (req, res) => {
    try {
        const { surveyId } = req.params;
        const { responses } = req.body;
        
        const survey = await Survey.findById(surveyId);
        
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'Survey not found'
            });
        }
        
        // Check if user already submitted
        const existingResponse = await SurveyResponse.findOne({
            survey: surveyId,
            user: req.user.id
        });
        
        if (existingResponse) {
            return res.status(400).json({
                success: false,
                error: 'You have already submitted this survey'
            });
        }

        // Create new response
        const surveyResponse = new SurveyResponse({
            survey: surveyId,
            campaign: survey.campaign,
            user: req.user.id,
            responses,
            surveyType: survey.type
        });

        await surveyResponse.save();

        res.json({
            success: true,
            message: 'Survey submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting survey:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single survey by ID
exports.getSurveyById = async (req, res) => {
    try {
        const { surveyId } = req.params;
        
        const survey = await Survey.findById(surveyId)
            .populate('createdBy', 'name')
            .populate('campaign', 'title');
        
        if (!survey) {
            return res.status(404).json({
                success: false,
                error: 'Survey not found'
            });
        }

        // Check if user has completed
        const hasCompleted = await SurveyResponse.findOne({
            survey: surveyId,
            user: req.user.id
        });

        res.json({
            ...survey.toObject(),
            completed: !!hasCompleted
        });
    } catch (error) {
        console.error('Error fetching survey:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get survey results
exports.getSurveyResults = async (req, res) => {
    try {
        const { surveyId } = req.params;
        
        const responses = await SurveyResponse.find({ survey: surveyId })
            .populate('user', 'name email')
            .sort({ completedAt: -1 });

        const survey = await Survey.findById(surveyId);
        const results = {};
        
        survey.questions.forEach(question => {
            results[question.questionId] = {
                question: question.text,
                type: question.type,
                responses: []
            };
        });

        responses.forEach(response => {
            response.responses.forEach(answer => {
                if (results[answer.questionId]) {
                    results[answer.questionId].responses.push({
                        answer: answer.answer,
                        user: response.user,
                        date: response.completedAt
                    });
                }
            });
        });

        res.json({
            success: true,
            survey,
            responses: responses.length,
            results
        });
    } catch (error) {
        console.error('Error fetching survey results:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// Get impact report
exports.getImpactReport = async (req, res) => {
    try {
        const { campaignId } = req.params;
        
        const impactData = await ImpactCalculator.calculateImpact(campaignId);
        
        res.json({
            success: true,
            ...impactData
        });
    } catch (error) {
        console.error('Error generating impact report:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

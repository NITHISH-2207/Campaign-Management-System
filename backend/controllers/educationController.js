const Education = require('../models/Education');
const Quiz = require('../models/Quiz');
const UserProgress = require('../models/UserProgress'); // We'll need to create this

exports.createModule = async (req, res) => {
    try {
        const { title, description, category, content, difficulty, duration, tags } = req.body;
        
        const module = new Education({
            title,
            description,
            category,
            content,
            difficulty,
            duration,
            tags,
            createdBy: req.user.id
        });

        await module.save();
        
        res.status(201).json({
            success: true,
            module
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getModules = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 12 } = req.query;
        const userId = req.user.id;
        
        let query = {};
        
        // Campaign managers can see all modules, users can't see their own created modules
        if (req.user.role === 'participant' || req.user.role === 'user') {
            query.createdBy = { $ne: userId };
        }
        
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [search] } }
            ];
        }

        const modules = await Education.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Get user progress for each module
        const userProgress = await UserProgress.find({ 
            userId, 
            moduleId: { $in: modules.map(m => m._id) } 
        });

        const modulesWithProgress = modules.map(module => {
            const progress = userProgress.find(p => p.moduleId.toString() === module._id.toString());
            return {
                ...module.toObject(),
                userProgress: progress || null,
                isCreator: module.createdBy._id.toString() === userId
            };
        });

        const total = await Education.countDocuments(query);

        res.json({
            success: true,
            modules: modulesWithProgress,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getModuleById = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;
        
        const module = await Education.findById(moduleId).populate('createdBy', 'name');
        
        if (!module) {
            return res.status(404).json({ success: false, error: 'Module not found' });
        }

        // Check if user is the creator
        const isCreator = module.createdBy._id.toString() === userId;
        
        // Campaign managers can view but not participate in their own modules
        if (isCreator && req.user.role === 'campaign_manager') {
            return res.json({
                success: true,
                module: module.toObject(),
                isCreator: true,
                canParticipate: false
            });
        }

        // Get user progress
        const userProgress = await UserProgress.findOne({ userId, moduleId });

        res.json({
            success: true,
            module: module.toObject(),
            userProgress,
            isCreator,
            canParticipate: !isCreator
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.startModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;

        // Check if user created this module
        const module = await Education.findById(moduleId);
        if (module.createdBy.toString() === userId) {
            return res.status(403).json({ 
                success: false, 
                error: 'You cannot participate in modules you created' 
            });
        }

        // Create or update progress
        let progress = await UserProgress.findOne({ userId, moduleId });
        
        if (!progress) {
            progress = new UserProgress({
                userId,
                moduleId,
                status: 'in_progress',
                startedAt: new Date()
            });
        } else {
            progress.status = 'in_progress';
            progress.lastAccessedAt = new Date();
        }

        await progress.save();

        res.json({
            success: true,
            progress
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateProgress = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { progressPercentage, currentSection } = req.body;
        const userId = req.user.id;

        const progress = await UserProgress.findOneAndUpdate(
            { userId, moduleId },
            { 
                progressPercentage,
                currentSection,
                lastAccessedAt: new Date()
            },
            { new: true }
        );

        res.json({
            success: true,
            progress
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.completeModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;

        const progress = await UserProgress.findOneAndUpdate(
            { userId, moduleId },
            { 
                status: 'completed',
                completedAt: new Date(),
                progressPercentage: 100
            },
            { new: true }
        );

        // Increment module completion count
        await Education.findByIdAndUpdate(moduleId, {
            $inc: { completions: 1 }
        });

        res.json({
            success: true,
            message: 'Module completed successfully',
            progress
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getUserProgress = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const progress = await UserProgress.find({ userId })
            .populate('moduleId', 'title category');

        const stats = {
            modulesStarted: progress.length,
            modulesCompleted: progress.filter(p => p.status === 'completed').length,
            quizzesPassed: progress.filter(p => p.quizPassed).length,
            totalLearningTime: progress.reduce((sum, p) => sum + (p.timeSpent || 0), 0)
        };

        res.json({
            success: true,
            progress,
            stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getModuleStats = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;

        // Check if user owns this module
        const module = await Education.findById(moduleId);
        if (module.createdBy.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only view stats for your own modules' 
            });
        }

        const progress = await UserProgress.find({ moduleId })
            .populate('userId', 'name email');

        const quiz = await Quiz.findOne({ educationModuleId: moduleId });
        
        const stats = {
            totalViews: progress.length,
            completions: progress.filter(p => p.status === 'completed').length,
            averageProgress: progress.reduce((sum, p) => sum + p.progressPercentage, 0) / progress.length || 0,
            quizAttempts: quiz ? quiz.attempts.length : 0,
            averageQuizScore: quiz && quiz.attempts.length > 0 
                ? quiz.attempts.reduce((sum, a) => sum + a.score, 0) / quiz.attempts.length 
                : 0,
            recentActivity: progress.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt).slice(0, 10)
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;

        const module = await Education.findById(moduleId);
        if (module.createdBy.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only edit your own modules' 
            });
        }

        const updatedModule = await Education.findByIdAndUpdate(
            moduleId,
            req.body,
            { new: true }
        );

        res.json({
            success: true,
            module: updatedModule
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;

        const module = await Education.findById(moduleId);
        if (module.createdBy.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only delete your own modules' 
            });
        }

        await Education.findByIdAndDelete(moduleId);
        await Quiz.deleteMany({ educationModuleId: moduleId });
        await UserProgress.deleteMany({ moduleId });

        res.json({
            success: true,
            message: 'Module deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createQuiz = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { title, questions, passingScore } = req.body;
        
        // Check if user owns this module
        const module = await Education.findById(moduleId);
        if (module.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only create quizzes for your own modules' 
            });
        }

        // Check if quiz already exists
        const existingQuiz = await Quiz.findOne({ educationModuleId: moduleId });
        if (existingQuiz) {
            return res.status(400).json({ 
                success: false, 
                error: 'A quiz already exists for this module' 
            });
        }
        
        const quiz = new Quiz({
            educationModuleId: moduleId,
            title,
            questions,
            passingScore
        });

        await quiz.save();
        
        res.status(201).json({
            success: true,
            quiz
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getQuiz = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.id;

        const quiz = await Quiz.findOne({ educationModuleId: moduleId });
        
        if (!quiz) {
            return res.status(404).json({ 
                success: false, 
                error: 'No quiz found for this module' 
            });
        }

        // Check user attempts
        const userAttempts = quiz.attempts.filter(a => a.userId.toString() === userId);
        
        // Don't send correct answers to client
        const clientQuiz = {
            _id: quiz._id,
            title: quiz.title,
            questions: quiz.questions.map(q => ({
                _id: q._id,
                text: q.text,
                type: q.type,
                options: q.options.map(o => ({ text: o.text })), // Remove isCorrect
                points: q.points
            })),
            passingScore: quiz.passingScore,
            userAttempts: userAttempts
        };

        res.json({
            success: true,
            quiz: clientQuiz
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { answers } = req.body;
        const userId = req.user.id;
        
        const quiz = await Quiz.findById(quizId);
        let score = 0;
        let totalPoints = 0;
        let results = [];

        quiz.questions.forEach((question, index) => {
            totalPoints += question.points;
            const userAnswer = answers[index];
            let isCorrect = false;
            
            if (question.type === 'multiple-choice') {
                const correctOption = question.options.find(opt => opt.isCorrect);
                isCorrect = userAnswer === correctOption.text;
            } else if (question.type === 'true-false') {
                const correctOption = question.options.find(opt => opt.isCorrect);
                isCorrect = userAnswer.toLowerCase() === correctOption.text.toLowerCase();
            }
            
            if (isCorrect) {
                score += question.points;
            }
            
            results.push({ questionId: question._id, correct: isCorrect });
        });

        const percentage = Math.round((score / totalPoints) * 100);
        const passed = percentage >= quiz.passingScore;

        quiz.attempts.push({
            userId,
            score: percentage,
            passed
        });

        await quiz.save();

        // Update user progress
        await UserProgress.findOneAndUpdate(
            { userId, moduleId: quiz.educationModuleId },
            { 
                quizScore: percentage,
                quizPassed: passed,
                quizAttemptedAt: new Date()
            }
        );

        res.json({
            success: true,
            score: percentage,
            passed,
            passingScore: quiz.passingScore,
            results,
            message: passed ? 'Congratulations! You passed the quiz!' : 'Keep learning and try again!'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

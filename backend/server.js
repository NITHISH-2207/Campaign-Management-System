// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Import configuration
const config = require('./config/config');

// Import notification scheduler after config is loaded
const notificationScheduler = require('./services/notificationScheduler');

// Create upload directories if they don't exist
const createUploadDirs = () => {
    const dirs = [
        path.join(__dirname, 'uploads'),
        path.join(__dirname, 'uploads', 'posts'),
        path.join(__dirname, 'uploads', 'campaigns'),
        path.join(__dirname, 'uploads', 'profiles')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
};

createUploadDirs();

// Middleware
app.use(cors(config.corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        notifications: config.notifications?.enabled ? 'enabled' : 'disabled'
    });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!',
        version: '1.0.0'
    });
});

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${mongoose.connection.name}`);
        
        // Ensure predefined Admin user exists
        await seedAdminUser();

        // Start notification scheduler after successful DB connection
        if (config.notifications && config.notifications.enabled) {
            notificationScheduler.startScheduler();
            console.log('📧 Email notification system enabled');
        } else {
            console.log('📧 Email notification system disabled');
        }
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        console.log('⏳ Retrying in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

// API Routes
const setupRoutes = () => {
    try {
        app.use('/api/users', require('./routes/userRoutes'));
        console.log('✅ User routes loaded');
        
        app.use('/api/auth', require('./routes/authRoutes'));
        console.log('✅ Auth routes loaded');
        
        app.use('/api/posts', require('./routes/postRoutes'));
        console.log('✅ Post routes loaded');
        
        app.use('/api/comments', require('./routes/commentRoutes'));
        console.log('✅ Comment routes loaded');
        
        app.use('/api/analytics', require('./routes/analyticsRoutes'));
        console.log('✅ Analytics routes loaded');
        
        app.use('/api/education', require('./routes/educationRoutes'));
        console.log('✅ Education routes loaded');
        
        app.use('/api/surveys', require('./routes/surveyRoutes'));
        console.log('✅ Survey routes loaded');
        
        app.use('/api/campaigns', require('./routes/campaignRoutes'));
        console.log('✅ Campaign routes loaded');
        
        app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
        console.log('✅ WhatsApp routes loaded');
        
    } catch (error) {
        console.error('❌ Error loading routes:', error);
    }
};

setupRoutes();

// 404 handler
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔥 Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 API Test: http://localhost:${PORT}/api/test`);
    console.log(`📧 Notifications: ${config.notifications?.enabled ? 'Enabled' : 'Disabled'}\n`);
});

// Connect to database after server starts
connectDB();

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    // Stop accepting new connections
    server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Stop notification scheduler
        if (notificationScheduler) {
            notificationScheduler.stopScheduler();
            console.log('✅ Notification scheduler stopped');
        }
        
        // Close database connection
        mongoose.connection.close(false, () => {
            console.log('✅ MongoDB connection closed');
            process.exit(0);
        });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

// Seed predefined admin user if none exists
async function seedAdminUser() {
    try {
        const User = require('./models/User');
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const adminUser = new User({
                name: 'System Admin',
                email: 'admin@changewave.com',
                password: 'Admin@12345',
                role: 'admin',
                organization: 'ChangeWave Platform'
            });
            await adminUser.save();
            console.log('🔑 Predefined Admin account created: admin@changewave.com / Admin@12345');
        } else {
            console.log('🔑 Predefined Admin account verified');
        }
    } catch (err) {
        console.error('❌ Error seeding predefined admin user:', err.message);
    }
}

module.exports = app;

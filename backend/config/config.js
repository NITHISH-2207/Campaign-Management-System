// backend/config/config.js
require('dotenv').config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-this',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/changewave',

    corsOptions: {
        origin: function (origin, callback) {
            // Allow requests with no origin (file://, mobile apps, curl, etc.)
            if (!origin) return callback(null, true);

            const envOrigins = process.env.ALLOWED_ORIGINS 
                ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
                : [];
            
            if (process.env.CLIENT_URL) {
                envOrigins.push(process.env.CLIENT_URL.trim());
            }

            const allowedOrigins = [
                'http://localhost:5500',
                'http://127.0.0.1:5500',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:3001',
                'https://campaign-management-system-zquy.onrender.com',
                ...envOrigins
            ];

            if (allowedOrigins.includes(origin) || allowedOrigins.some(o => o && origin.startsWith(o))) {
                callback(null, true);
            } else {
                // Allow all origins in production/development if not explicitly restricted
                callback(null, true);
            }
        },
        credentials: true
    },

    uploadLimits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024
    },

    // Email configuration
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM || 'ChangeWave <noreply@changewave.com>'
    },

    // Notification configuration
    notifications: {
        enabled: process.env.ENABLE_NOTIFICATIONS !== 'false',
        cronSchedule: process.env.NOTIFICATION_CRON || '0 9 * * *' // 9 AM daily
    }
};

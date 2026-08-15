// backend/config/config.js
require('dotenv').config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-this',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/changewave',

    corsOptions: {
        origin: function (origin, callback) {
            // Allow requests with no origin (file://, mobile apps, curl, etc.)
            // and common local dev origins
            const allowedOrigins = [
                'http://localhost:5500',
                'http://127.0.0.1:5500',
                'https://campaign-management-system-zquy.onrender.com',
                'http://localhost:3001',
                'http://127.0.0.1:3000'
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, true); // Allow all origins in development
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
    },

    // WhatsApp configuration
    whatsapp: {
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0'
    }
};

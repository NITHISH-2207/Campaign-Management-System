// backend/config/config.js
require('dotenv').config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-this',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/changewave',

    corsOptions: {
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, Postman, server-to-server, etc.)
            if (!origin) {
                return callback(null, true);
            }

            const allowedOrigins = [
                'https://changewave.vercel.app',
                'https://campaign-management-system-zquy.onrender.com',
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:5173',
                'http://localhost:5500',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:5500'
            ];

            // Allow custom allowed origins via environment variable
            if (process.env.ALLOWED_ORIGINS) {
                const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
                allowedOrigins.push(...envOrigins);
            }
            if (process.env.FRONTEND_URL) {
                allowedOrigins.push(process.env.FRONTEND_URL.trim());
            }

            // Match exact domain or any Vercel deployment preview domain
            const isAllowed = allowedOrigins.includes(origin) ||
                              origin.endsWith('.vercel.app');

            if (isAllowed) {
                callback(null, true);
            } else {
                console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
                callback(new Error(`CORS Error: Origin ${origin} not allowed by CORS policy.`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
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
    },

    // Google Geocoding API key
    googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY
};

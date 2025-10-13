// backend/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB connected successfully');
        
        // Create indexes
        await createIndexes();
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const createIndexes = async () => {
    console.log('Creating database indexes...');
    // Indexes will be created automatically from schemas
};

module.exports = connectDB;

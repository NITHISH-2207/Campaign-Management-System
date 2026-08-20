const mongoose = require('mongoose');

const pendingRegistrationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    encryptedPassword: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['participant', 'campaign_manager'],
        default: 'participant'
    },
    otpHash: {
        type: String,
        required: true
    },
    otpExpiresAt: {
        type: Date,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        default: null
    },
    resendAttempts: {
        type: Number,
        default: 0
    },
    lastResendAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 1800 // Automatically clean up after 30 minutes
    }
});

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);

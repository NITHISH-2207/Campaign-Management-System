const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['admin', 'campaign_manager', 'participant','user'],
        default: 'participant'
    },
    phone: {
        type: String,
        default: ''
    },
    dob: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Others', 'Prefer not to say', ''],
        default: ''
    },
    category: {
        type: String,
        enum: [
            'School Student',
            'College Student',
            'Working Professional / Employee',
            'Self-Employed',
            'Entrepreneur / Business Owner',
            'Government Employee',
            'Teacher / Faculty',
            'Researcher',
            'Unemployed',
            'Retired',
            'Homemaker',
            'Other',
            'Prefer not to say',
            ''
        ],
        default: ''
    },
    termsAccepted: {
        type: Boolean,
        default: false
    },
    termsAcceptedAt: {
        type: Date
    },
    privacyPolicyAccepted: {
        type: Boolean,
        default: false
    },
    privacyPolicyAcceptedAt: {
        type: Date
    },
    location: {
        type: String,
        default: ''
    },
    organization: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    interests: [{
        type: String,
        enum: ['climate', 'health', 'education', 'social', 'poverty', 'animal', 'community', 'technology', 'arts']
    }],
    emailUpdates: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const { encryptText, decryptText } = require('../services/encryptionService');

// Hash password and encrypt sensitive fields before saving
userSchema.pre('save', async function(next) {
    // 1. Password hashing
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    
    // 2. Sensitive fields encryption
    try {
        if (this.phone && !this.phone.startsWith('enc:')) {
            this.phone = encryptText(this.phone);
        }
        if (this.dob && !this.dob.startsWith('enc:')) {
            this.dob = encryptText(this.dob);
        }
        if (this.gender && !this.gender.startsWith('enc:')) {
            this.gender = encryptText(this.gender);
        }
        if (this.category && !this.category.startsWith('enc:')) {
            this.category = encryptText(this.category);
        }
        next();
    } catch (err) {
        next(err);
    }
});

// Decrypt sensitive fields when document is loaded/initialized from database
userSchema.post('init', function(doc) {
    try {
        if (doc.phone) doc.phone = decryptText(doc.phone);
        if (doc.dob) doc.dob = decryptText(doc.dob);
        if (doc.gender) doc.gender = decryptText(doc.gender);
        if (doc.category) doc.category = decryptText(doc.category);
    } catch (error) {
        console.error('Error decrypting initialized user fields:', error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

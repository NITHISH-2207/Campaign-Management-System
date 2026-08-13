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

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

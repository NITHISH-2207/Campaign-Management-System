// backend/models/NotificationLog.js
const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    type: {
        type: String,
        enum: ['reminder', 'started', 'ending', 'ended'],
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    recipients: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        email: String,
        status: {
            type: String,
            enum: ['sent', 'failed'],
            default: 'sent'
        }
    }]
});

// Index for efficient queries
notificationLogSchema.index({ campaignId: 1, type: 1, sentAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);

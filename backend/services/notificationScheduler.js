// backend/services/notificationScheduler.js
const cron = require('node-cron');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const emailService = require('./emailService');

// Try to load NotificationLog if it exists
let NotificationLog;
try {
    NotificationLog = require('../models/NotificationLog');
} catch (error) {
    console.log('📝 NotificationLog model not found - running without notification logging');
}

class NotificationScheduler {
    constructor() {
        this.scheduledJobs = new Map();
    }

    startScheduler() {
        // Run every day at 9:00 AM
        const dailyCheck = cron.schedule('0 9 * * *', async () => {
            console.log('🔔 Running daily campaign notification check...');
            await this.checkCampaignsStartingTomorrow();
        });

        // Also run immediately on startup for testing
        if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Development mode: Running initial notification check...');
            this.checkCampaignsStartingTomorrow();
        }

        this.scheduledJobs.set('dailyCheck', dailyCheck);
        console.log('✅ Notification scheduler started');
    }

    async checkCampaignsStartingTomorrow() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

            // Find campaigns starting tomorrow
            const campaigns = await Campaign.find({
                status: 'active',
                startDate: {
                    $gte: tomorrow,
                    $lt: dayAfterTomorrow
                }
            }).populate('managerId');

            console.log(`📅 Found ${campaigns.length} campaigns starting tomorrow`);

            const emailPromises = [];

            for (const campaign of campaigns) {
                // Check if notification was already sent (optional)
                const alreadySent = await this.wasNotificationSent(campaign._id, 'reminder');
                if (alreadySent) {
                    console.log(`⚠️ Notification already sent for campaign: ${campaign.title}`);
                    continue;
                }

                // Notify campaign manager
                if (campaign.managerId && campaign.managerId.emailUpdates !== false) {
                    emailPromises.push({
                        user: campaign.managerId,
                        campaign: campaign
                    });
                }

                // Notify all participants
                if (campaign.participants && campaign.participants.length > 0) {
                    const participants = await User.find({
                        _id: { $in: campaign.participants },
                        emailUpdates: { $ne: false }
                    });

                    for (const participant of participants) {
                        emailPromises.push({
                            user: participant,
                            campaign: campaign
                        });
                    }
                }

                // Log notification (optional)
                await this.logNotification(campaign._id, 'reminder');
            }

            // Send all emails
            if (emailPromises.length > 0) {
                console.log(`📧 Sending ${emailPromises.length} notification emails...`);
                const results = await emailService.sendBulkEmails(emailPromises);
                
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                
                console.log(`✅ Sent: ${successful}, ❌ Failed: ${failed}`);
            } else {
                console.log('📭 No notifications to send');
            }

        } catch (error) {
            console.error('❌ Error in notification scheduler:', error);
        }
    }

    async wasNotificationSent(campaignId, type) {
        // Optional: Check if notification was already sent
        if (!NotificationLog) return false;
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const log = await NotificationLog.findOne({
                campaignId,
                type,
                sentAt: { $gte: today }
            });
            
            return !!log;
        } catch (error) {
            return false;
        }
    }

    async logNotification(campaignId, type) {
        // Optional: Log sent notifications
        if (!NotificationLog) return;
        
        try {
            await NotificationLog.create({
                campaignId,
                type,
                sentAt: new Date()
            });
        } catch (error) {
            console.error('Failed to log notification:', error);
        }
    }

    stopScheduler() {
        this.scheduledJobs.forEach((job, name) => {
            job.stop();
            console.log(`⏹️ Stopped scheduled job: ${name}`);
        });
        this.scheduledJobs.clear();
    }

    // Manual trigger for testing
    async triggerTestNotification(campaignId) {
        try {
            const campaign = await Campaign.findById(campaignId).populate('managerId');
            if (!campaign) {
                throw new Error('Campaign not found');
            }

            const testResult = await emailService.sendCampaignReminderEmail(
                campaign.managerId,
                campaign
            );

            return testResult;
        } catch (error) {
            console.error('Test notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // Additional helper method for testing specific dates
    async checkCampaignsForDate(targetDate) {
        try {
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            const campaigns = await Campaign.find({
                status: 'active',
                startDate: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            }).populate('managerId');

            console.log(`📅 Found ${campaigns.length} campaigns for ${targetDate.toDateString()}`);
            return campaigns;
        } catch (error) {
            console.error('Error checking campaigns for date:', error);
            return [];
        }
    }
}

module.exports = new NotificationScheduler();

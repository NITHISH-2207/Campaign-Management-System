// backend/services/emailService.js
const path = require('path');
const nodemailer = require('nodemailer');

// Make sure to load .env from the correct location
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class EmailService {
    constructor() {
        console.log('🔧 Initializing Email Service...');
        console.log('Email User:', process.env.EMAIL_USER || 'NOT SET');
        
        // Check if email credentials are configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ Email credentials not configured!');
            console.log('Please set EMAIL_USER and EMAIL_PASS in your .env file');
            this.transporter = null;
            return;
        }

        try {
            // Create transporter with proper TLS configuration
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS.replace(/\s/g, '') // Remove any spaces
                },
                tls: {
                    // Allow self-signed certificates
                    rejectUnauthorized: false
                }
            });

            // Verify transporter configuration
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('❌ Email service verification error:', error.message);
                    if (error.message.includes('Username and Password not accepted')) {
                        console.log('\n⚠️  Common fixes:');
                        console.log('1. Make sure you are using an App Password, not your regular password');
                        console.log('2. Enable 2-factor authentication on your Google account');
                        console.log('3. Generate a new App Password at: https://myaccount.google.com/apppasswords');
                    } else if (error.message.includes('certificate')) {
                        console.log('\n⚠️  Certificate issue detected - TLS settings applied');
                    }
                } else {
                    console.log('✅ Email service ready and verified!');
                    console.log(`📧 Configured to send from: ${process.env.EMAIL_USER}`);
                }
            });
        } catch (error) {
            console.error('❌ Failed to create email transporter:', error);
            this.transporter = null;
        }
    }

    async testEmailConfiguration() {
        if (!this.transporter) {
            return { success: false, error: 'Email service not configured' };
        }

        try {
            await this.transporter.verify();
            return { success: true, message: 'Email configuration is valid' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendCampaignReminderEmail(user, campaign) {
        if (!this.transporter) {
            console.error('❌ Email service not configured - cannot send email');
            return { success: false, error: 'Email service not configured' };
        }

        const emailOptions = {
            from: `ChangeWave <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `🔔 Reminder: "${campaign.title}" starts tomorrow!`,
            html: this.getCampaignReminderTemplate(user, campaign)
        };

        try {
            console.log(`📧 Attempting to send email to: ${user.email}`);
            const info = await this.transporter.sendMail(emailOptions);
            console.log(`✅ Email sent successfully to ${user.email}`);
            console.log(`📬 Message ID: ${info.messageId}`);
            console.log(`📨 Response: ${info.response}`);
            return { success: true, messageId: info.messageId, response: info.response };
        } catch (error) {
            console.error(`❌ Failed to send email to ${user.email}:`, error.message);
            
            // Provide specific error guidance
            if (error.message.includes('self-signed certificate')) {
                console.log('⚠️  Certificate issue - check TLS settings');
            } else if (error.message.includes('EAUTH')) {
                console.log('⚠️  Authentication failed - check email/password');
            } else if (error.message.includes('ECONNECTION')) {
                console.log('⚠️  Connection failed - check internet/firewall');
            }
            
            return { success: false, error: error.message };
        }
    }

    getCampaignReminderTemplate(user, campaign) {
        const startDate = new Date(campaign.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
                    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    .campaign-info { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .campaign-info p { margin: 10px 0; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #3498db; color: white !important; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                    .button:hover { background-color: #2980b9; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    ul { padding-left: 20px; }
                    li { margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Campaign Starting Tomorrow! 🚀</h1>
                    </div>
                    <div class="content">
                        <h2>Hello ${user.name || 'Changemaker'}!</h2>
                        
                        <p>This is a friendly reminder that the campaign <strong>"${campaign.title}"</strong> 
                        is starting tomorrow!</p>
                        
                        <div class="campaign-info">
                            <h3>Campaign Details:</h3>
                            <p><strong>📅 Start Date:</strong> ${startDate}</p>
                            <p><strong>📍 Location:</strong> ${campaign.location || 'To be announced'}</p>
                            <p><strong>🎯 Category:</strong> ${campaign.category || 'General'}</p>
                            <p><strong>📋 Type:</strong> ${campaign.type || 'Campaign'}</p>
                            <p><strong>📝 Description:</strong><br>${campaign.description || 'No description provided'}</p>
                        </div>
                        
                        <p><strong>What to do next:</strong></p>
                        <ul>
                            <li>Review the campaign action plan</li>
                            <li>Prepare any materials you might need</li>
                            <li>Share the campaign with your network</li>
                            <li>Get ready to make a positive impact!</li>
                        </ul>
                        
                        <center>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5500'}/frontend/html/campaigns-list.html" 
                               class="button" style="color: white !important;">View Campaign Details</a>
                        </center>
                        
                        <p style="margin-top: 30px;">Thank you for being part of the change!</p>
                        <p>Best regards,<br><strong>The ChangeWave Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>You received this email because you joined the campaign "${campaign.title}" on ChangeWave.</p>
                        <p>© 2024 ChangeWave. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async sendBulkEmails(emailList) {
        if (!this.transporter) {
            console.error('❌ Cannot send bulk emails - email service not configured');
            return [];
        }

        const results = [];
        console.log(`📧 Processing ${emailList.length} emails...`);
        
        for (let i = 0; i < emailList.length; i++) {
            const emailData = emailList[i];
            console.log(`\n[${i + 1}/${emailList.length}] Processing email for: ${emailData.user.email}`);
            
            const result = await this.sendCampaignReminderEmail(emailData.user, emailData.campaign);
            results.push({
                email: emailData.user.email,
                campaign: emailData.campaign.title,
                ...result
            });
            
            // Add a small delay between emails to avoid rate limiting
            if (i < emailList.length - 1) {
                console.log('⏳ Waiting 1 second before next email...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`\n📊 Email Summary: ✅ Success: ${successful}, ❌ Failed: ${failed}`);
        
        return results;
    }
}

module.exports = new EmailService();

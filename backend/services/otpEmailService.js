// backend/services/otpEmailService.js
const path = require('path');
const nodemailer = require('nodemailer');

// Ensure environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class OTPEmailService {
    constructor() {
        this.transporter = null;
    }

    /**
     * Initializes and returns the Nodemailer transporter for OTP emails.
     * Uses environment variables without exposing sensitive credentials.
     */
    getTransporter() {
        if (this.transporter) {
            return this.transporter;
        }

        const host = process.env.OTP_EMAIL_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.OTP_EMAIL_PORT || process.env.EMAIL_PORT || '587', 10);
        const user = process.env.OTP_EMAIL_USER || process.env.EMAIL_USER;
        const pass = process.env.OTP_EMAIL_APP_PASSWORD || process.env.EMAIL_APP_PASSWORD;

        if (!user || !pass) {
            throw new Error('OTP Email Service Error: OTP_EMAIL_USER or OTP_EMAIL_APP_PASSWORD missing in environment variables.');
        }

        // Clean password of any spaces
        const cleanPass = pass.replace(/\s/g, '');

        this.transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: false, // TLS / STARTTLS for port 587
            auth: {
                user: user,
                pass: cleanPass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        return this.transporter;
    }

    /**
     * Verifies the Nodemailer transporter authentication and connection configuration.
     * Returns a safe status message without logging secrets.
     */
    async verifyConnection() {
        try {
            const transporter = this.getTransporter();
            await transporter.verify();
            return {
                success: true,
                message: 'OTP email transporter configured successfully.'
            };
        } catch (error) {
            return {
                success: false,
                error: `Transporter verification failed: ${error.message}`
            };
        }
    }

    /**
     * Sends an OTP verification email to a recipient.
     * @param {string} to - Recipient email address
     * @param {string} otp - Verification code
     */
    async sendOTPEmail(to, otp) {
        if (!to) {
            throw new Error('Recipient email is required.');
        }
        if (!otp) {
            throw new Error('OTP value is required.');
        }

        const transporter = this.getTransporter();
        const fromEmail = process.env.OTP_EMAIL_FROM || process.env.OTP_EMAIL_USER || process.env.EMAIL_USER || 'changewave15@gmail.com';

        const mailOptions = {
            from: `ChangeWave Verification <${fromEmail}>`,
            to: to,
            subject: 'ChangeWave - Email Verification Code',
            text: `Your ChangeWave verification code is: ${otp}. It will expire in 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                    <h2 style="color: #2c3e50; text-align: center; margin-top: 0;">ChangeWave Verification</h2>
                    <p style="font-size: 16px; color: #333333;">Hello,</p>
                    <p style="font-size: 16px; color: #333333;">Your verification code for ChangeWave is:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3498db; background-color: #f0f8ff; padding: 10px 25px; border-radius: 6px; display: inline-block;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #666666;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999999; text-align: center; margin-bottom: 0;">© 2026 ChangeWave. All rights reserved.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId,
            message: `OTP email sent successfully to ${to}`
        };
    }
}

module.exports = new OTPEmailService();

// backend/services/otpEmailService.js
const path = require('path');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Ensure environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

class OTPEmailService {
    constructor() {
        this.transporter = null;
    }

    /**
     * Initializes and returns the Nodemailer transporter for local fallback.
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
            throw new Error('OTP Email Service Error: Missing email credentials in environment variables.');
        }

        const cleanPass = pass.replace(/\s/g, '');

        this.transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: false,
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
     * Sends an OTP verification email to a recipient using Resend API (or Nodemailer fallback).
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

        const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;

        const emailHtml = `
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
        `;
        const emailText = `Your ChangeWave verification code is: ${otp}. It will expire in 10 minutes.`;

        // Preferred: Use Resend API (HTTPS port 443 - works everywhere including Render)
        if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.OTP_EMAIL_FROM || 'ChangeWave Verification <onboarding@resend.dev>';

            const response = await resend.emails.send({
                from: fromEmail,
                to: [to],
                subject: 'ChangeWave - Email Verification Code',
                text: emailText,
                html: emailHtml
            });

            if (response.error) {
                console.error('Resend API error detail:', response.error);
                throw new Error(`Resend Email Error: ${response.error.message || JSON.stringify(response.error)}`);
            }

            return {
                success: true,
                messageId: response.data ? response.data.id : null,
                message: `OTP email sent successfully to ${to} via Resend`
            };
        }

        // Fallback: Local Nodemailer SMTP
        const transporter = this.getTransporter();
        const fromEmail = process.env.OTP_EMAIL_FROM || process.env.OTP_EMAIL_USER || process.env.EMAIL_USER || 'changewave15@gmail.com';

        const mailOptions = {
            from: `ChangeWave Verification <${fromEmail}>`,
            to: to,
            subject: 'ChangeWave - Email Verification Code',
            text: emailText,
            html: emailHtml
        };

        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            messageId: info.messageId,
            message: `OTP email sent successfully to ${to} via SMTP`
        };
    }
}

module.exports = new OTPEmailService();

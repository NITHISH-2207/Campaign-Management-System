// backend/controllers/whatsappController.js

const config = require('../config/config');
const whatsappService = require('../services/whatsappService');

const WELCOME_MESSAGE = `👋 Welcome to ChangeWave!\n\nWhat would you like to explore?`;

/**
 * GET /api/whatsapp/webhook
 * Handles Meta Webhook Verification
 */
const verifyWebhook = (req, res) => {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const verifyToken =
            config.whatsapp?.verifyToken ||
            process.env.WHATSAPP_VERIFY_TOKEN;

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('✅ WhatsApp Webhook verified successfully');
                return res.status(200).send(challenge);
            } else {
                console.warn(
                    '⚠️ WhatsApp Webhook verification failed. Token mismatch.'
                );
                return res.sendStatus(403);
            }
        }

        return res.status(400).json({
            error: 'Invalid verification request'
        });
    } catch (error) {
        console.error('🔥 Error in verifyWebhook:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
};

/**
 * POST /api/whatsapp/webhook
 * Handles incoming WhatsApp webhook events from Meta
 */
const handleWebhook = async (req, res) => {
    try {
        const body = req.body;

        console.log('📥 WhatsApp webhook POST received');
        console.log(
            '📦 Full WhatsApp webhook payload:',
            JSON.stringify(body, null, 2)
        );

        // Verify object type
        if (body.object === 'whatsapp_business_account') {

            // Acknowledge Meta immediately
            res.status(200).send('EVENT_RECEIVED');

            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;

            console.log(
                '🔎 WhatsApp webhook value:',
                JSON.stringify(value, null, 2)
            );

            // Check for incoming messages
            if (
                value &&
                value.messages &&
                value.messages.length > 0
            ) {
                const message = value.messages[0];

                const fromNumber = message.from;
                const messageType = message.type;

                console.log(
                    `📩 Incoming WhatsApp message from ${fromNumber} (Type: ${messageType})`
                );

                if (messageType === 'text') {
                    const textBody =
                        (message.text?.body || '').trim();

                    console.log(
                        `💬 Text content: "${textBody}"`
                    );

                    // Send automatic welcome reply
                    try {
                        await whatsappService.sendTextMessage(
                            fromNumber,
                            WELCOME_MESSAGE
                        );

                        console.log(
                            `📤 Sent welcome response to ${fromNumber}`
                        );
                    } catch (sendErr) {
                        console.error(
                            `❌ Failed to send WhatsApp reply to ${fromNumber}:`,
                            sendErr.message
                        );
                    }
                }
            } else {
                console.log(
                    'ℹ️ WhatsApp webhook received, but no messages array was found.'
                );
            }

            return;
        }

        // Not a WhatsApp Business Account event
        return res.sendStatus(404);

    } catch (error) {
        console.error(
            '🔥 Error in handleWebhook:',
            error
        );

        // Prevent Meta retry loop
        if (!res.headersSent) {
            return res.status(200).send('EVENT_RECEIVED');
        }
    }
};

/**
 * POST /api/whatsapp/send
 * Send a WhatsApp message using Meta Cloud API
 */
const sendMessage = async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: 'to and message are required'
            });
        }

        console.log(`📤 Sending WhatsApp message to ${to}`);

        const result = await whatsappService.sendTextMessage(
            to,
            message
        );

        return res.status(200).json({
            success: true,
            message: 'WhatsApp message sent successfully',
            data: result
        });

    } catch (error) {
        console.error('❌ Failed to send WhatsApp message:', error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    verifyWebhook,
    handleWebhook,
    sendMessage
};
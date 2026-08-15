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

        const verifyToken = config.whatsapp?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN;

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('✅ WhatsApp Webhook verified successfully');
                return res.status(200).send(challenge);
            } else {
                console.warn('⚠️ WhatsApp Webhook verification failed. Token mismatch.');
                return res.sendStatus(403);
            }
        }

        return res.status(400).json({ error: 'Invalid verification request' });
    } catch (error) {
        console.error('🔥 Error in verifyWebhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * POST /api/whatsapp/webhook
 * Handles incoming WhatsApp webhook events from Meta
 */
const handleWebhook = async (req, res) => {
    try {
        const body = req.body;

        // Verify object type is whatsapp_business_account
        if (body.object === 'whatsapp_business_account') {
            // Acknowledge receipt to Meta immediately (must return 200 within 3 seconds)
            res.status(200).send('EVENT_RECEIVED');

            // Iterate over entries and changes
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;

            // Check if payload contains messages
            if (value && value.messages && value.messages.length > 0) {
                const message = value.messages[0];
                const fromNumber = message.from; // Sender's phone number
                const messageType = message.type;

                console.log(`📩 Incoming WhatsApp message from ${fromNumber} (Type: ${messageType})`);

                if (messageType === 'text') {
                    const textBody = (message.text?.body || '').trim();
                    console.log(`💬 Text content: "${textBody}"`);

                    // Send welcome reply
                    try {
                        await whatsappService.sendTextMessage(fromNumber, WELCOME_MESSAGE);
                        console.log(`📤 Sent welcome response to ${fromNumber}`);
                    } catch (sendErr) {
                        console.error(`❌ Failed to send WhatsApp reply to ${fromNumber}:`, sendErr.message);
                    }
                }
            }
            return;
        } else {
            // Not a whatsapp business account event
            return res.sendStatus(404);
        }
    } catch (error) {
        console.error('🔥 Error in handleWebhook:', error);
        // Always attempt to return 200 to prevent Meta retry loop if response hasn't been sent
        if (!res.headersSent) {
            return res.status(200).send('EVENT_RECEIVED');
        }
    }
};

module.exports = {
    verifyWebhook,
    handleWebhook
};
